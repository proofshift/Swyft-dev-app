/**
 * WebUSB-based DFU flashing for STM32 devices.
 * Implements the USB DFU 1.1 protocol (DFU_DNLOAD, DFU_GETSTATE, DFU_CLRSTATUS).
 * STM32 DFU: VID=0x0483, PID=0xDF11
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Navigator { usb: USB }
  interface USB {
    requestDevice(options: { filters: { vendorId?: number; productId?: number }[] }): Promise<USBDevice>
    getDevices(): Promise<USBDevice[]>
  }
  interface USBDevice {
    vendorId: number; productId: number
    open(): Promise<void>
    close(): Promise<void>
    selectConfiguration(n: number): Promise<void>
    claimInterface(n: number): Promise<void>
    releaseInterface(n: number): Promise<void>
    selectAlternateInterface(n: number, alt: number): Promise<void>
    controlTransferOut(setup: USBControlTransferParameters, data?: ArrayBuffer | ArrayBufferView): Promise<USBOutTransferResult>
    controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>
    configuration: { configurationValue: number; interfaces: { interfaceNumber: number; alternates: { interfaceClass: number; interfaceSubclass: number }[] }[] } | null
    configurations: { configurationValue: number; interfaces: { interfaceNumber: number; alternates: { interfaceClass: number; interfaceSubclass: number }[] }[] }[]
  }
  interface USBControlTransferParameters {
    requestType: 'standard' | 'class' | 'vendor'
    recipient: 'device' | 'interface' | 'endpoint' | 'other'
    request: number; value: number; index: number
  }
  interface USBOutTransferResult { bytesWritten: number; status: string }
  interface USBInTransferResult  { data: DataView | null; status: string }
}

const STM32_DFU_VENDOR = 0x0483
const STM32_DFU_PRODUCT = 0xdf11
const STM32_FLASH_START = 0x08000000

// DFU requests
const DFU_DETACH    = 0x00
const DFU_DNLOAD    = 0x01
const DFU_UPLOAD    = 0x02
const DFU_GETSTATUS = 0x03
const DFU_CLRSTATUS = 0x04
const DFU_GETSTATE  = 0x05
const DFU_ABORT     = 0x06

// DFU states (DFU 1.1 spec)
const STATE_DFU_IDLE             = 2
const STATE_DFU_DNLOAD_IDLE      = 5
const STATE_DFU_MANIFEST_SYNC    = 6
const STATE_DFU_MANIFEST         = 7
const STATE_DFU_MANIFEST_WAIT_RESET = 8
const STATE_DFU_ERROR            = 10

export type DFUProgress = {
  phase: 'connecting' | 'erasing' | 'flashing' | 'done' | 'error'
  progress: number   // 0-100
  message: string
}

export type DFUProgressCallback = (p: DFUProgress) => void

export function isDFUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

/**
 * Reject obvious garbage (e.g. .hex or .elf picked as "all files").
 * STM32 vector 0: initial SP in SRAM; vector 1: Reset_Handler in Flash (Thumb LSB=1).
 */
export function validateStm32ApplicationBin(data: ArrayBuffer): void {
  const u8 = new Uint8Array(data)
  if (u8.byteLength < 0x200) {
    throw new Error('File too small — use devsensor_fw.bin (raw binary from the build output).')
  }
  if (u8[0] === 0x3a && (u8[1] === 0x20 || u8[1] === 0x30)) {
    throw new Error('This looks like Intel HEX text, not a .bin. Flash the .bin file only.')
  }
  const dv = new DataView(u8.buffer, u8.byteOffset, 8)
  const sp = dv.getUint32(0, true)
  const reset = dv.getUint32(4, true)
  const spOk = sp >= 0x20000000 && sp <= 0x2002_0000
  const resetOk =
    (reset & 1) === 1 &&
    ((reset & 0xff00_0000) === 0x0800_0000 || (reset & 0xff00_0000) === 0x0000_0000)
  if (!spOk || !resetOk) {
    throw new Error(
      'Invalid STM32 vector table (first 8 bytes). Use the raw .bin from arm-none-eabi-objcopy — not .hex, .elf, or a renamed file.'
    )
  }
}

/** Pad to 8-byte boundary with 0xFF (flash erase value) for clean programming. */
function padBinTo8(u8: Uint8Array): Uint8Array {
  const rem = u8.byteLength % 8
  if (rem === 0) return u8
  const out = new Uint8Array(u8.byteLength + (8 - rem))
  out.set(u8, 0)
  out.fill(0xff, u8.byteLength)
  return out
}

async function claimDFUInterface(device: USBDevice): Promise<number> {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 0xFE && alt.interfaceSubclass === 0x01) {
          await device.selectConfiguration(config.configurationValue)
          await device.claimInterface(iface.interfaceNumber)
          return iface.interfaceNumber
        }
      }
    }
  }
  throw new Error('No DFU interface found')
}

async function dfuGetStatus(device: USBDevice, iface: number) {
  const res = await device.controlTransferIn({
    requestType: 'class', recipient: 'interface',
    request: DFU_GETSTATUS, value: 0, index: iface
  }, 6)
  if (!res.data) throw new Error('No status data')
  return {
    status: res.data.getUint8(0),
    pollTimeout: (res.data.getUint8(1) | (res.data.getUint8(2) << 8) | (res.data.getUint8(3) << 16)),
    state: res.data.getUint8(4),
    string: res.data.getUint8(5),
  }
}

async function dfuClearStatus(device: USBDevice, iface: number) {
  await device.controlTransferOut({
    requestType: 'class', recipient: 'interface',
    request: DFU_CLRSTATUS, value: 0, index: iface
  })
}

async function dfuDownload(device: USBDevice, iface: number, blockNum: number, data: Uint8Array) {
  /* Pass the TypedArray, not data.buffer — a Uint8Array view can share a larger ArrayBuffer;
   * using .buffer alone would corrupt transfers and brick the image in flash. */
  await device.controlTransferOut({
    requestType: 'class', recipient: 'interface',
    request: DFU_DNLOAD, value: blockNum, index: iface
  }, data)
}

/** Read back programmed flash (DFU_UPLOAD) — block numbering matches DfuSe download. */
async function dfuUploadBlock(
  device: USBDevice,
  iface: number,
  blockNum: number,
  length: number
): Promise<Uint8Array> {
  const res = await device.controlTransferIn(
    {
      requestType: 'class',
      recipient: 'interface',
      request: DFU_UPLOAD,
      value: blockNum,
      index: iface
    },
    length
  )
  if (!res.data) throw new Error('DFU upload returned no data')
  const dv = res.data
  return new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
}

async function waitForIdle(device: USBDevice, iface: number, maxMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const s = await dfuGetStatus(device, iface)
    if (s.state === STATE_DFU_ERROR) {
      await dfuClearStatus(device, iface)
      throw new Error(`DFU error state: status=${s.status}`)
    }
    if (s.state === STATE_DFU_IDLE || s.state === STATE_DFU_DNLOAD_IDLE) return s
    if (s.pollTimeout > 0) await new Promise(r => setTimeout(r, s.pollTimeout))
    else await new Promise(r => setTimeout(r, 10))
  }
  throw new Error('DFU timeout waiting for idle state')
}

export async function flashFirmware(
  binData: ArrayBuffer,
  onProgress: DFUProgressCallback
): Promise<void> {
  if (!isDFUSupported()) throw new Error('WebUSB not supported in this browser')

  onProgress({ phase: 'connecting', progress: 0, message: 'Looking for DFU device...' })

  // Request the STM32 DFU device
  let device: USBDevice
  try {
    device = await (navigator as Navigator & { usb: USB }).usb.requestDevice({
      filters: [{ vendorId: STM32_DFU_VENDOR, productId: STM32_DFU_PRODUCT }]
    })
  } catch (e) {
    throw new Error(`No DFU device found. Make sure the device is in DFU mode. (${e})`)
  }

  await device.open()
  const iface = await claimDFUInterface(device)

  onProgress({ phase: 'connecting', progress: 5, message: 'Connected to DFU device' })

  // Clear any existing error state
  const initStatus = await dfuGetStatus(device, iface)
  if (initStatus.state === STATE_DFU_ERROR) {
    await dfuClearStatus(device, iface)
  }

  validateStm32ApplicationBin(binData)
  const data = padBinTo8(new Uint8Array(binData))
  const xferSize = 1024  // STM32 DFU transfer size
  const totalBlocks = Math.ceil(data.length / xferSize)

  const addrCmd = new Uint8Array(5)
  addrCmd[0] = 0x21  // Set Address Pointer
  addrCmd[1] = (STM32_FLASH_START) & 0xFF
  addrCmd[2] = (STM32_FLASH_START >> 8) & 0xFF
  addrCmd[3] = (STM32_FLASH_START >> 16) & 0xFF
  addrCmd[4] = (STM32_FLASH_START >> 24) & 0xFF

  async function setAddressPointer(): Promise<void> {
    await dfuDownload(device, iface, 0, addrCmd)
    await waitForIdle(device, iface)
  }

  // Set address via DfuSe (STM32 specific: address in block 0 via special command)
  onProgress({ phase: 'erasing', progress: 10, message: 'Setting flash address...' })
  await setAddressPointer()

  // Erase command
  onProgress({ phase: 'erasing', progress: 15, message: 'Erasing flash...' })
  const eraseCmd = new Uint8Array(1)
  eraseCmd[0] = 0x41  // Mass erase
  await dfuDownload(device, iface, 0, eraseCmd)
  await waitForIdle(device, iface, 30000)  // Erase can take up to 30s

  /* ST DfuSe: after mass erase the internal address pointer may be invalid — set it again
   * before downloading firmware (see AN3156 / dfu-util DfuSe behavior). Skipping this
   * can leave garbage or incomplete programming → MCU does not boot → no USB in Device Manager. */
  onProgress({ phase: 'erasing', progress: 18, message: 'Re-setting flash address after erase…' })
  await setAddressPointer()

  onProgress({ phase: 'flashing', progress: 30, message: 'Flashing firmware...' })

  // Download blocks (start at block 2 for DfuSe)
  for (let block = 0; block < totalBlocks; block++) {
    const offset = block * xferSize
    const chunk = data.slice(offset, Math.min(offset + xferSize, data.length))
    await dfuDownload(device, iface, block + 2, chunk)
    await waitForIdle(device, iface)

    const pct = 30 + Math.round((block / totalBlocks) * 65)
    onProgress({
      phase: 'flashing',
      progress: pct,
      message: `Flashing... ${offset + chunk.length} / ${data.length} bytes`
    })
  }

  /* Read back first block — if this fails or mismatches, do not manifest (avoids no-boot / no USB). */
  onProgress({ phase: 'flashing', progress: 93, message: 'Verifying written flash…' })
  await setAddressPointer()
  const checkLen = Math.min(xferSize, data.length)
  try {
    const readBack = await dfuUploadBlock(device, iface, 2, checkLen)
    for (let i = 0; i < checkLen; i++) {
      if (readBack[i] !== data[i]) {
        throw new Error(
          `Verify failed at byte ${i} (written flash does not match file). Do not unplug — try flash again or use STM32CubeProgrammer.`
        )
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Verify failed')) throw e
    /* Some hosts/bootloaders reject upload — continue only if download completed without error */
    onProgress({
      phase: 'flashing',
      progress: 94,
      message: 'Could not read back flash (skipped). If the device does not boot, use ST-Link.',
    })
  }

  // Zero-length DNLOAD at block 0 signals end of transfer → starts manifest phase
  onProgress({ phase: 'flashing', progress: 96, message: 'Sending manifest command...' })
  await dfuDownload(device, iface, 0, new Uint8Array(0))

  // CRITICAL: calling GETSTATUS after zero-length DNLOAD is what triggers the STM32
  // bootloader to execute the manifest (program flash, verify CRC).
  // The device transitions: dfuDNLOAD-IDLE → dfuMANIFEST-SYNC → dfuMANIFEST
  //                       → dfuMANIFEST-WAIT-RESET
  // At dfuMANIFEST-WAIT-RESET the bootloader has finished and waits for USB reset.
  onProgress({ phase: 'flashing', progress: 97, message: 'Programming flash...' })

  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    let s
    try {
      s = await dfuGetStatus(device, iface)
    } catch {
      // Device may have already reset and dropped the USB connection — that's fine
      break
    }

    if (s.state === STATE_DFU_MANIFEST_WAIT_RESET) {
      // Device finished programming; closing USB triggers the reset
      break
    }
    if (s.state === STATE_DFU_IDLE) {
      // Some bootloaders return to idle after manifest (bitManifestationTolerant=1)
      break
    }
    if (s.state === STATE_DFU_ERROR) {
      await dfuClearStatus(device, iface)
      throw new Error('DFU error during manifest')
    }

    // Still in MANIFEST_SYNC (6) or MANIFEST (7) — wait the requested poll delay
    const wait = s.pollTimeout > 0 ? s.pollTimeout : 200
    await new Promise(r => setTimeout(r, wait))
  }

  /* Leave DFU: release + close only. USBDevice.reset() often breaks Windows re-enumeration. */
  onProgress({ phase: 'flashing', progress: 99, message: 'Leaving bootloader (USB will re-enumerate)…' })
  try {
    await device.releaseInterface(iface)
  } catch {
    /* ignore */
  }
  try {
    await device.close()
  } catch {
    /* ignore */
  }

  await new Promise(r => setTimeout(r, 3500))

  onProgress({ phase: 'done', progress: 100, message: 'Firmware programmed. Reconnecting serial (no button)…' })
}
