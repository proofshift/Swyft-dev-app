import { create } from 'zustand'
import { SerialConnection, ConnectionState } from '../api/SerialConnection'
import { setQueueConnection, enqueueCommand } from '../api/CommandQueue'
import { flashFirmware as webDFUFlash, isDFUSupported, type DFUProgress } from '../api/WebDFU'

export type DeviceType = 'thunder' | 'devsensor' | null

export interface DevSensorStatus {
  vsen: number        // volts
  ntc: number         // °C
  as5600: number      // raw 12-bit (0–4095)
  mt6701: number      // raw 14-bit (0–16383)
  ax: number          // mg
  ay: number
  az: number
  gx: number          // mdps
  gy: number
  gz: number
  imuTemp: number     // °C
  magnet: boolean
  errFlags: number
}

export interface MotorConfig {
  // Motor setup
  poles: number
  biasEncoder: number
  biasPos: number
  swerveOffset: number
  nominalVoltage: number
  voltageMin: number
  voltageMax: number
  tempWarn: number
  tempErr: number
  // PIDs
  pidPosKp: number; pidPosKi: number; pidPosOutMin: number; pidPosOutMax: number
  pidSpdKp: number; pidSpdKi: number; pidSpdOutMin: number; pidSpdOutMax: number
  pidIsqKp: number; pidIsqKi: number; pidIsqOutMin: number; pidIsqOutMax: number
  pidIsdKp: number; pidIsdKi: number; pidIsdOutMin: number; pidIsdOutMax: number
  // Calibration
  caliCurrent: number; caliAngleElec: number; caliAngleSpeed: number
  // T-curve
  tcSpeed: number; tcAccel: number; tcMaxErr: number
  // Protection & extras
  peakCurThresholdA: number   // amps
  peakCurDurationMs: number
  canDeviceNum: number
  brakeMode: boolean
  posLimitMin: number
  posLimitMax: number
}

export interface MotorStatus {
  state: number
  stateString: string
  voltage: number
  temperature: number
  swerveRaw: number
  swerveAngle: number
  encoder: number
  position: number
  speed: number
  current: number
  errorFlag: number
  canMaster: boolean
  robotEnabled: boolean
  heartbeatValid: boolean
  ledColor: string
}

export interface CanStatus {
  deviceType: number
  manufacturer: number
  deviceNumber: number
  heartbeatValid: boolean
  heartbeatTimeout: boolean
  robotEnabled: boolean
  canMaster: boolean
  matchNumber?: number
  replayNumber?: number
  matchTime?: number
  autonomous?: boolean
  testMode?: boolean
  redAlliance?: boolean
  watchdog?: boolean
}

const STATE_NAMES = ['Stop', 'Calibrate', 'Current', 'Speed', 'Position', 'T-Curve']

/** Detect whether a #S: line is from the DEVSENSOR (named key=value) vs Thunder (positional). */
function isDevSensorLine(line: string): boolean {
  return line.startsWith('#S:') && line.includes('vsen=')
}

/** Parse SWYFT DEV sensor status: #S:vsen=2.50,ntc=25.3,as5600=1024,mt6701=2048,ax=100,... */
function parseDevSensorStatus(line: string): DevSensorStatus | null {
  if (!line.startsWith('#S:')) return null
  const kv: Record<string, string> = {}
  line.substring(3).split(',').forEach(part => {
    const eq = part.indexOf('=')
    if (eq > 0) kv[part.substring(0, eq).trim()] = part.substring(eq + 1).trim()
  })
  if (!('vsen' in kv)) return null
  return {
    vsen:    parseFloat(kv.vsen ?? '0'),
    ntc:     parseFloat(kv.ntc ?? '0'),
    as5600:  parseInt(kv.as5600 ?? '0'),
    mt6701:  parseInt(kv.mt6701 ?? '0'),
    ax:      parseFloat(kv.ax ?? '0'),
    ay:      parseFloat(kv.ay ?? '0'),
    az:      parseFloat(kv.az ?? '0'),
    gx:      parseFloat(kv.gx ?? '0'),
    gy:      parseFloat(kv.gy ?? '0'),
    gz:      parseFloat(kv.gz ?? '0'),
    imuTemp: parseFloat(kv.imu_t ?? '0'),
    magnet:  kv.magnet === '1',
    errFlags: parseInt((kv.err ?? '0x00').replace('0x', ''), 16),
  }
}

function parseStatus(line: string): MotorStatus | null {
  if (!line.startsWith('#S:')) return null
  const parts = line.substring(3).split(',')
  if (parts.length < 10) return null
  const state = parseInt(parts[0]) || 0
  const ledHex = parts.length > 11 ? parts[11].replace('0x', '') : '0000FF'
  return {
    state,
    stateString: STATE_NAMES[state] ?? 'Unknown',
    voltage: (parseInt(parts[1]) || 0) / 100,
    temperature: (parseInt(parts[2]) || 0) / 10,
    swerveRaw: parseInt(parts[3]) || 0,
    swerveAngle: (parseInt(parts[4]) || 0) / 100,
    encoder: parseInt(parts[5]) || 0,
    position: parseInt(parts[6]) || 0,
    speed: (parseInt(parts[7]) || 0) / 100,
    current: parseInt(parts[8]) || 0,
    errorFlag: parseInt(parts[9].replace('0x', ''), 16) || 0,
    canMaster: parts.length > 10 && parts[10] === '1',
    robotEnabled: parts.length > 12 && parts[12] === '1',
    heartbeatValid: parts.length > 13 && parts[13] === '1',
    ledColor: `#${ledHex.padStart(6, '0')}`,
  }
}

function parseCanStatus(line: string): Partial<CanStatus> | null {
  if (!line.startsWith('#CAN:')) return null
  const result: Partial<CanStatus> = {}
  line.substring(5).split(',').forEach(part => {
    const [k, v] = part.split('=')
    switch (k) {
      case 'dev': result.deviceType = parseInt(v); break
      case 'mfr': result.manufacturer = parseInt(v); break
      case 'num': result.deviceNumber = parseInt(v); break
      case 'hb_valid': result.heartbeatValid = v === '1'; break
      case 'hb_timeout': result.heartbeatTimeout = v === '1'; break
      case 'enabled': result.robotEnabled = v === '1'; break
      case 'can_master': result.canMaster = v === '1'; break
      case 'match': result.matchNumber = parseInt(v); break
      case 'time': result.matchTime = parseInt(v); break
      case 'auto': result.autonomous = v === '1'; break
      case 'test': result.testMode = v === '1'; break
      case 'red': result.redAlliance = v === '1'; break
      case 'wdog': result.watchdog = v === '1'; break
    }
  })
  return result
}

export { type DFUProgress }

interface MotorStore {
 conn: SerialConnection | null
 connectionState: ConnectionState
 connectError: string | null
 deviceType: DeviceType
 status: MotorStatus | null
 statusHistory: MotorStatus[]
 devSensorStatus: DevSensorStatus | null
 canStatus: CanStatus
 config: MotorConfig | null
 configLoading: boolean
 log: string[]
 firmwareVersion: string | null
 firmwareBuildDate: string | null
 _cmdQueue: string[]
 _cmdBusy: boolean

 // DFU flashing state — persists through serial disconnect
 dfuProgress: DFUProgress | null
 dfuError: string | null
 dfuSupported: boolean

 connect: () => Promise<void>
 disconnect: () => Promise<void>
 send: (cmd: string) => Promise<void>
 clearLog: () => void
 loadConfig: () => Promise<void>

 /** Send DFU command via serial, then flash the file via WebUSB */
 flashFirmwareFromSerial: (file: File) => Promise<void>
 /** Device is already in DFU bootloader — flash directly via WebUSB */
 flashFirmwareDirect: (file: File) => Promise<void>
 clearDFU: () => void
}

/* Accumulate partial config lines until #CEND */
let _configPartial: Partial<MotorConfig> = {}

function parseConfigLine(line: string): Partial<MotorConfig> | null {
  const tag = line.substring(0, 4)
  const nums = line.substring(4).split(',').map(Number)
  if (tag === '#C1:') {
    const [poles, biasEncoder, biasPos, swerveOffset, voltX100, voltMin, voltMax, tempWarn, tempErr] = nums
    return { poles, biasEncoder, biasPos, swerveOffset, nominalVoltage: voltX100 / 100, voltageMin: voltMin, voltageMax: voltMax, tempWarn, tempErr }
  }
  if (tag === '#C2:') {
    const [kp, ki, outMin, outMax] = nums
    return { pidPosKp: kp, pidPosKi: ki, pidPosOutMin: outMin, pidPosOutMax: outMax }
  }
  if (tag === '#C3:') {
    const [kp, ki, outMin, outMax] = nums
    return { pidSpdKp: kp / 10000, pidSpdKi: ki / 1000, pidSpdOutMin: outMin, pidSpdOutMax: outMax }
  }
  if (tag === '#C4:') {
    const [kp, ki, outMin, outMax] = nums
    return { pidIsqKp: kp / 10000, pidIsqKi: ki / 1000, pidIsqOutMin: outMin, pidIsqOutMax: outMax }
  }
  if (tag === '#C5:') {
    const [kp, ki, outMin, outMax] = nums
    return { pidIsdKp: kp / 10000, pidIsdKi: ki / 1000, pidIsdOutMin: outMin, pidIsdOutMax: outMax }
  }
  if (tag === '#C6:') {
    const [caliCurrent, angleElecX1000, angleSpeedX1000] = nums
    return { caliCurrent, caliAngleElec: angleElecX1000 / 1000, caliAngleSpeed: angleSpeedX1000 / 1000 }
  }
  if (tag === '#C7:') {
    const [tcSpeed, tcAccel, tcMaxErr] = nums
    return { tcSpeed, tcAccel, tcMaxErr }
  }
  if (tag === '#C8:') {
    const [peakMa, peakDur, canDev, brakeInt, posMin, posMax] = nums
    return { peakCurThresholdA: peakMa / 1000, peakCurDurationMs: peakDur, canDeviceNum: canDev, brakeMode: brakeInt !== 0, posLimitMin: posMin, posLimitMax: posMax }
  }
  return null
}

export const useMotorStore = create<MotorStore>((set, get) => ({
 conn: null,
 connectionState: 'disconnected',
 connectError: null,
 deviceType: null,
 status: null,
 statusHistory: [],
 devSensorStatus: null,
 canStatus: {
 deviceType: 2, manufacturer: 18, deviceNumber: 0,
 heartbeatValid: false, heartbeatTimeout: false,
 robotEnabled: false, canMaster: false
 },
 config: null,
 configLoading: false,
 log: [],
 firmwareVersion: null,
 firmwareBuildDate: null,
 _cmdQueue: [],
 _cmdBusy: false,
 dfuProgress: null,
 dfuError: null,
 dfuSupported: isDFUSupported(),

 connect: async () => {
 set({ connectionState: 'connecting', connectError: null })
 const conn = new SerialConnection({
 baudRate: 115200,
 onStateChange: (connectionState) => set({ connectionState }),
 onData: (line) => {
 // Detect and handle SWYFT DEV sensor data
 if (isDevSensorLine(line)) {
 const ds = parseDevSensorStatus(line)
 if (ds) {
 set(s => ({ devSensorStatus: ds, deviceType: s.deviceType ?? 'devsensor' }))
 return
 }
 }

 const status = parseStatus(line)
 if (status) {
 set(s => ({
 status,
 deviceType: s.deviceType ?? 'thunder',
 statusHistory: [...s.statusHistory.slice(-299), { ...status, ts: Date.now() } as MotorStatus & { ts: number }]
 }))
 return
 }

        const can = parseCanStatus(line)
        if (can) {
          set(s => ({ canStatus: { ...s.canStatus, ...can } }))
          return
        }

        // Config lines accumulate until #CEND
        if (line.startsWith('#C') && line.length > 4 && line[3] === ':') {
          const partial = parseConfigLine(line)
          if (partial) { _configPartial = { ..._configPartial, ...partial }; return }
        }
        if (line.startsWith('#CEND') || line === '#CEND') {
          set({ config: _configPartial as MotorConfig, configLoading: false })
          _configPartial = {}
          return
        }

        set(s => {
          const log = [...s.log.slice(-499), `< ${line}`]
          let fv = s.firmwareVersion
          let fb = s.firmwareBuildDate
          const clean = line.startsWith('< ') ? line.substring(2) : line
          if (clean.startsWith('Version:')) fv = clean.substring(8).trim()
          else if (line.startsWith('Version:')) fv = line.substring(8).trim()
          if (clean.startsWith('Build:')) fb = clean.substring(6).trim()
          else if (line.startsWith('Build:')) fb = line.substring(6).trim()
          return { log, firmwareVersion: fv, firmwareBuildDate: fb }
        })
      }
    })
    try {
      set({ conn })
      await conn.connect()
      setQueueConnection(conn)
      // Allow device to stabilize after connect, then request version and status
      await new Promise(r => setTimeout(r, 250))
      await enqueueCommand('VERSION')
      await enqueueCommand('CANSTATUS')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isCancel = msg.includes('No port selected') || msg.includes('AbortError') || msg.includes('cancelled')
      setQueueConnection(null)
      set({
        conn: null,
        connectionState: 'disconnected',
        connectError: isCancel ? null : msg
      })
    }
  },

 disconnect: async () => {
 setQueueConnection(null)
 await get().conn?.disconnect()
 set({ conn: null, status: null, statusHistory: [], devSensorStatus: null, deviceType: null, firmwareVersion: null, firmwareBuildDate: null, config: null })
 },

  loadConfig: async () => {
    _configPartial = {}
    set({ configLoading: true })
    await get().send('CONFIG')
    // Auto-clear loading state after 6s in case #CEND is never received
    setTimeout(() => {
      if (get().configLoading) set({ configLoading: false })
    }, 6000)
  },

  send: async (cmd) => {
    if (!get().conn) return
    set(s => ({ log: [...s.log.slice(-499), `> ${cmd}`] }))
    await enqueueCommand(cmd)
  },

  clearLog: () => set({ log: [] }),

  flashFirmwareFromSerial: async (file: File) => {
    set({ dfuProgress: { phase: 'connecting', progress: 0, message: 'Sending DFU command to device...' }, dfuError: null })
    try {
      // Send DFU command while still connected
      const conn = get().conn
      if (conn) {
        await get().send('DFU')
        // Disconnect serial — device is about to reset into DFU mode
        await get().disconnect()
      }
      // Wait for the STM32 to reset and re-enumerate as DFU device
      set({ dfuProgress: { phase: 'connecting', progress: 5, message: 'Waiting for device to enter DFU mode (~1.5s)...' } })
      await new Promise(r => setTimeout(r, 1500))
      // Open WebUSB device picker — user selects STM32 BOOTLOADER
      set({ dfuProgress: { phase: 'connecting', progress: 10, message: 'Select "STM32 BOOTLOADER" in the browser dialog...' } })
      const binData = await file.arrayBuffer()
      await webDFUFlash(binData, (p) => set({ dfuProgress: p }))
    } catch (e) {
      set({ dfuError: e instanceof Error ? e.message : String(e), dfuProgress: null })
    }
  },

  flashFirmwareDirect: async (file: File) => {
    set({ dfuProgress: { phase: 'connecting', progress: 0, message: 'Connecting to DFU device...' }, dfuError: null })
    try {
      set({ dfuProgress: { phase: 'connecting', progress: 5, message: 'Select "STM32 BOOTLOADER" in the browser dialog...' } })
      const binData = await file.arrayBuffer()
      await webDFUFlash(binData, (p) => set({ dfuProgress: p }))
    } catch (e) {
      set({ dfuError: e instanceof Error ? e.message : String(e), dfuProgress: null })
    }
  },

  clearDFU: () => set({ dfuProgress: null, dfuError: null }),
}))
