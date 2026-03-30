// WebSerial type declarations
declare global {
  interface Navigator {
    readonly serial: Serial
  }
  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
  }
  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }
  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }
  interface SerialPortInfo {
    usbVendorId?: number
    usbProductId?: number
  }
  interface SerialPort {
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    /** Chromium — USB-backed ports expose VID/PID for sorting after re-enumeration */
    getInfo?(): SerialPortInfo
    readonly readable: ReadableStream<Uint8Array> | null
    readonly writable: WritableStream<Uint8Array> | null
  }
  interface SerialOptions {
    baudRate: number
    dataBits?: number
    stopBits?: number
    parity?: string
    bufferSize?: number
    flowControl?: string
  }
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SerialOptions2 {
  baudRate: number
  onData: (data: string) => void
  onStateChange: (state: ConnectionState) => void
}

export class SerialConnection {
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private state: ConnectionState = 'disconnected'
  private opts: SerialOptions2
  private _buffer = ''
  private _closed = false

  constructor(opts: SerialOptions2) {
    this.opts = opts
  }

  get isConnected() { return this.state === 'connected' }

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator
  }

  private setState(s: ConnectionState) {
    this.state = s
    try { this.opts.onStateChange(s) } catch { /* ignore */ }
  }

  /** ST USB vendor — used to pick CDC after DFU when multiple COM ports exist */
  static readonly STM32_USB_VENDOR_ID = 0x0483
  /** Common STM32 Virtual COM Port PID (DFU is 0xdf11 — not a serial port) */
  static readonly STM32_CDC_PRODUCT_ID = 0x5740

  /** Returns ports the user has already granted access to (no dialog). */
  static async getPermittedPorts(): Promise<SerialPort[]> {
    if (!SerialConnection.isSupported()) return []
    try { return await navigator.serial.getPorts() } catch { return [] }
  }

  /** Prefer STM32 CDC (0x0483/0x5740), then any ST, then others — fixes reconnect after DFU when port order changes. */
  static sortPortsForStm32Reconnect(ports: SerialPort[]): SerialPort[] {
    const rank = (p: SerialPort): number => {
      const info = typeof p.getInfo === 'function' ? p.getInfo() : {}
      const vid = info.usbVendorId
      const pid = info.usbProductId
      if (vid === SerialConnection.STM32_USB_VENDOR_ID && pid === SerialConnection.STM32_CDC_PRODUCT_ID) return 0
      if (vid === SerialConnection.STM32_USB_VENDOR_ID && pid !== undefined && pid !== 0xdf11) return 1
      if (vid === SerialConnection.STM32_USB_VENDOR_ID) return 2
      return 3
    }
    return [...ports].sort((a, b) => rank(a) - rank(b))
  }

  /** Connect to a specific already-permitted port (no browser dialog). */
  async connectToPort(port: SerialPort): Promise<void> {
    if (!SerialConnection.isSupported()) throw new Error('WebSerial not supported')
    this.setState('connecting')
    this._closed = false
    this.port = port
    await this._openPort()
  }

  async connect(): Promise<void> {
    if (!SerialConnection.isSupported()) {
      throw new Error('WebSerial not supported in this browser')
    }
    this.setState('connecting')
    this._closed = false

    // Let user pick port - may throw if they cancel (DOMException: AbortError)
    this.port = await navigator.serial.requestPort()

    await this._openPort()
  }

  private async _openPort(): Promise<void> {
    if (!this.port) throw new Error('No port selected')

    // Open at motor baud rate
    await this.port.open({ baudRate: this.opts.baudRate, bufferSize: 4096 })

    if (!this.port.readable || !this.port.writable) {
      await this.port.close()
      throw new Error('Port opened but streams unavailable')
    }

    // Set up writer
    this.writer = this.port.writable.getWriter()

    // Set up reader
    this.reader = this.port.readable.getReader()

    this.setState('connected')

    // Start read loop in background - don't await
    this._readLoop().catch(() => {
      if (!this._closed) this.setState('disconnected')
    })
  }

  private async _readLoop() {
    const decoder = new TextDecoder()
    while (this.reader && !this._closed) {
      let result: ReadableStreamReadResult<Uint8Array>
      try {
        result = await this.reader.read()
      } catch {
        break
      }
      if (result.done) break
      if (result.value) {
        this._buffer += decoder.decode(result.value, { stream: true })
        const lines = this._buffer.split('\n')
        this._buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.replace(/\r/g, '').trim()
          if (trimmed) {
            try { this.opts.onData(trimmed) } catch { /* ignore */ }
          }
        }
      }
    }
    this.setState('disconnected')
  }

  async send(data: string): Promise<void> {
    if (!this.writer) return
    try {
      const encoder = new TextEncoder()
      await this.writer.write(encoder.encode(data + '\n'))
    } catch {
      // Ignore write errors
    }
  }

  async disconnect(): Promise<void> {
    this._closed = true
    try { this.reader?.cancel() } catch { /* ignore */ }
    try { await this.reader?.cancel() } catch { /* ignore */ }
    this.reader = null
    try { this.writer?.releaseLock() } catch { /* ignore */ }
    this.writer = null
    try { await this.port?.close() } catch { /* ignore */ }
    this.port = null
    this.setState('disconnected')
  }
}
