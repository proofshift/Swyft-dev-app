// WebSerial type declarations
declare global {
  interface Navigator {
    readonly serial: Serial
  }
  interface Serial {
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
  interface SerialPort {
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
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

  async connect(): Promise<void> {
    if (!SerialConnection.isSupported()) {
      throw new Error('WebSerial not supported in this browser')
    }
    this.setState('connecting')
    this._closed = false

    // Let user pick port - may throw if they cancel (DOMException: AbortError)
    this.port = await navigator.serial.requestPort()

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
