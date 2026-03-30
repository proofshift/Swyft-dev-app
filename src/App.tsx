import { useState, useRef, useEffect } from 'react'
import { useMotorStore } from './store/motorStore'
import { ControlTab } from './components/tabs/ControlTab'
import { CanTab } from './components/tabs/CanTab'
import { FirmwareTab } from './components/tabs/FirmwareTab'
import { LogTab } from './components/tabs/LogTab'
import { InputTab } from './components/tabs/InputTab'
import { AboutTab } from './components/tabs/AboutTab'
import { ConfigTab } from './components/tabs/ConfigTab'
import { DevSensorTab } from './components/tabs/DevSensorTab'
import { DevGraphsTab } from './components/tabs/DevGraphsTab'
import { SerialConnection } from './api/SerialConnection'
import { Zap, Wifi, WifiOff, Loader2, Radio, Terminal, Cpu, AlertCircle, Sliders, Info, Upload, CheckCircle, ChevronDown, ChevronUp, Usb, Settings, Gauge, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

const THUNDER_TABS = [
  { id: 'control',  label: 'Control',  icon: Zap      },
  { id: 'config',   label: 'Config',   icon: Settings },
  { id: 'can',      label: 'CAN',      icon: Radio    },
  { id: 'input',    label: 'Input',    icon: Sliders  },
  { id: 'firmware', label: 'Firmware', icon: Cpu      },
  { id: 'log',      label: 'Log',      icon: Terminal },
  { id: 'about',    label: 'About',    icon: Info     },
] as const

const DEVSENSOR_TABS = [
  { id: 'sensors',  label: 'Sensors',  icon: Gauge       },
  { id: 'graphs',   label: 'Graphs',   icon: TrendingUp  },
  { id: 'firmware', label: 'Firmware', icon: Cpu         },
  { id: 'log',      label: 'Log',      icon: Terminal    },
  { id: 'about',    label: 'About',    icon: Info        },
] as const

type ThunderTabId    = typeof THUNDER_TABS[number]['id']
type DevSensorTabId  = typeof DEVSENSOR_TABS[number]['id']
type TabId = ThunderTabId | DevSensorTabId

const isSupported = SerialConnection.isSupported()

interface FwEntry { id: string; name: string; file: string; version: string; date: string }

export default function App() {
 const [activeTab, setActiveTab] = useState<TabId>('control')
 const [recoverOpen, setRecoverOpen] = useState(false)
 const [recoverFile, setRecoverFile] = useState<File | null>(null)
 const [firmwareList, setFirmwareList] = useState<FwEntry[]>([])
 const recoverInputRef = useRef<HTMLInputElement>(null)

 useEffect(() => {
 fetch('./firmware/manifest.json').then(r => r.json()).then(d => setFirmwareList(d.devices ?? [])).catch(() => {})
 }, [])

 const {
 connectionState, status, devSensorStatus, deviceType, connectError, connect, autoConnect, disconnect,
 dfuProgress, dfuError, dfuSupported, autoConnecting, justDisconnected,
 flashFirmwareFromSerial, flashFirmwareDirect, clearDFU
 } = useMotorStore()

 // On mount: silently try to reconnect to a previously-permitted port
 useEffect(() => { autoConnect() }, [])

  const isDevSensor = deviceType === 'devsensor'
  const TABS = isDevSensor ? DEVSENSOR_TABS : THUNDER_TABS

  // Reset to the correct default tab when device type is first identified
  useEffect(() => {
    if (deviceType === 'devsensor') setActiveTab('sensors')
    else if (deviceType === 'thunder') setActiveTab('control')
  }, [deviceType])

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'
  const isDFUActive = dfuProgress !== null
  const isDFUDone = dfuProgress?.phase === 'done'

  const handleConnect = async () => {
    try { await connect() } catch { /* handled in store */ }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <div className="font-bold text-white text-sm tracking-wide">SWYFT Link</div>
            </div>
          </div>

          {/* Header status indicators */}
          {isConnected && isDevSensor && devSensorStatus && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
              <span className="text-xs text-slate-400">
                {devSensorStatus.vsen.toFixed(2)}V · {devSensorStatus.ntc.toFixed(1)}°C
                {devSensorStatus.magnet && ' · 🧲'}
              </span>
            </div>
          )}
          {isConnected && !isDevSensor && status && (() => {
            const running = status.state !== 0
            const ledStyle = (size: string) => ({
              backgroundColor: status.ledColor,
              boxShadow: `0 0 9px 3px ${status.ledColor}bb`,
              width: size, height: size,
            })
            return (
              <div className="flex items-center gap-1.5">
                <div className={clsx('rounded-full border border-white/15 flex-shrink-0', running && 'animate-pulse')}
                  style={ledStyle('12px')} title="Device LED 1" />
                <div className={clsx('rounded-full border border-white/15 flex-shrink-0', running && 'animate-pulse')}
                  style={ledStyle('14px')} title="Device LED 2" />
                <span className="text-xs text-slate-400 ml-1">
                  {status.voltage > 0.1 ? `${status.voltage.toFixed(1)}V · ` : ''}{status.temperature.toFixed(0)}°C
                  {running && ` · ${status.stateString}`}
                </span>
              </div>
            )
          })()}
          {isConnecting && (
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* CAN master badge */}
            {isConnected && status?.canMaster && (
              <span className="text-xs px-2 py-1 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/25">
                CAN Master
              </span>
            )}

            {/* Not supported warning */}
            {!isSupported && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Use Chrome or Edge
              </div>
            )}

            {/* Connect button */}
            {isSupported && (
              <button
                onClick={isConnected ? disconnect : handleConnect}
                disabled={isConnecting}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                  isConnected
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-sky-500 border-sky-400 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20',
                  isConnecting && 'opacity-60 cursor-not-allowed'
                )}
              >
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isConnected ? <WifiOff className="w-4 h-4" />
                  : <Wifi className="w-4 h-4" />}
                {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Device'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DFU flashing overlay — shown instead of connect screen while flashing */}
      {!isConnected && isDFUActive && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-sky-500/15 border border-sky-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  {isDFUDone
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />}
                </div>
                <div>
                  <div className="font-semibold text-white capitalize">{dfuProgress.phase}…</div>
                  <div className="text-xs text-slate-400 mt-0.5">{dfuProgress.message}</div>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mb-1">
                <div
                  className={clsx('h-2 rounded-full transition-all duration-300', isDFUDone ? 'bg-green-500' : 'bg-sky-500')}
                  style={{ width: `${dfuProgress.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 text-right mb-4">{dfuProgress.progress}%</div>
              {isDFUDone && (
                <button
                  onClick={() => { clearDFU(); handleConnect() }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-medium text-sm transition-all"
                >
                  <Wifi className="w-4 h-4" /> Reconnect Device
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DFU error overlay */}
      {!isConnected && !isDFUActive && dfuError && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-4 text-sm">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> Flash failed
              </div>
              <div className="font-mono text-xs text-red-300 break-all">{dfuError}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={clearDFU} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all">
                Back
              </button>
              <button onClick={handleConnect} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-medium transition-all">
                <Wifi className="w-4 h-4" /> Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-connect detected screen — shown for the full delay even after port opens */}
      {!isDFUActive && !dfuError && autoConnecting && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            {/* Pulsing device icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center animate-pulse">
                <Usb className="w-9 h-9 text-sky-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Device detected</p>
              <h2 className="text-white text-xl font-bold mt-1">Connecting automatically…</h2>
            </div>
            {/* Animated dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400"
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Device disconnected screen */}
      {!isConnected && !isDFUActive && !dfuError && !autoConnecting && justDisconnected && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <WifiOff className="w-9 h-9 text-red-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Connection lost</p>
              <h2 className="text-white text-xl font-bold mt-1">Device disconnected</h2>
              <p className="text-slate-500 text-sm mt-2">Waiting to reconnect…</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-400"
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Normal disconnected state */}
      {!isConnected && !isDFUActive && !dfuError && !autoConnecting && !justDisconnected && (
        <div className="flex-1 flex items-start justify-center p-8">
          <div className="w-full max-w-sm space-y-5">
            {/* Main connect card */}
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-sky-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">SWYFT Link</h1>
              <p className="text-slate-400 mb-3 text-sm leading-relaxed">
                Connect a SWYFT device via USB-C.
              </p>
              <div className="flex justify-center gap-2 mb-6 text-xs">
                <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/25 text-sky-400 rounded-lg">⚡ SWYFT Thunder</span>
                <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-lg">🔬 SWYFT DEV</span>
              </div>

              {isSupported ? (
                <>
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-semibold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-60"
                    title="Or plug in a previously-connected device — it will connect automatically"
                  >
                    {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                    {isConnecting ? 'Connecting...' : 'Connect Device'}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    {isConnecting
                      ? 'Auto-detecting device…'
                      : 'Plug in a previously connected device to auto-connect, or click above to choose a port.'}
                  </p>
                </>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4" />
                  WebSerial requires Chrome 89+ or Edge 89+
                </div>
              )}

              {connectError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm text-left">
                  <div className="font-semibold mb-1">Connection failed</div>
                  <div className="font-mono text-xs">{connectError}</div>
                  <div className="mt-2 text-xs text-slate-500">Check the device is plugged in and not open in another app.</div>
                </div>
              )}

              <p className="text-xs text-slate-600 mt-4">
                Plug in your device, then select its COM port when prompted.
              </p>
            </div>

            {/* Recover / DFU section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setRecoverOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Usb className="w-4 h-4" />
                  <span className="font-medium">Recover Device / Flash Firmware</span>
                </div>
                {recoverOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {recoverOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500 pt-3 leading-relaxed">
                    Use this if your device is stuck or unresponsive. Put it into DFU mode manually, then flash new firmware.
                  </p>

                  {/* How to enter DFU manually */}
                  <div className="bg-slate-800/60 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-300 mb-2">How to enter DFU mode</div>
                    <ol className="space-y-1.5 text-xs text-slate-400">
                      {[
                        'Unplug the device from USB',
                        'Hold the DFU button (small button on the back)',
                        'Plug in USB-C while holding the button',
                        'Release after 2 seconds',
                        'Device appears as "STM32 BOOTLOADER"',
                      ].map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-sky-600 flex-shrink-0 font-medium">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Firmware list from manifest */}
                  {firmwareList.length > 0 && (
                    <div className="space-y-1.5">
                      {firmwareList.map(fw => (
                        <button key={fw.id} onClick={async () => {
                          const resp = await fetch(`./firmware/${fw.file}`)
                          const blob = await resp.blob()
                          setRecoverFile(new File([blob], fw.file, { type: 'application/octet-stream' }))
                        }}
                          className={clsx('w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left',
                            recoverFile?.name === fw.file ? 'bg-sky-500/15 border-sky-500/40 text-sky-300' : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300')}>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{fw.name}</div>
                            <div className="text-xs text-slate-500">{fw.version} · {fw.date}</div>
                          </div>
                          {recoverFile?.name === fw.file && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Custom file picker */}
                  <label className="flex items-center gap-3 p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group">
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-sky-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-300 truncate">
                        {recoverFile && !firmwareList.some(fw => fw.file === recoverFile.name) ? recoverFile.name : 'Or choose custom .bin file…'}
                      </div>
                      {recoverFile && !firmwareList.some(fw => fw.file === recoverFile.name) && <div className="text-xs text-slate-500">{(recoverFile.size / 1024).toFixed(0)} KB</div>}
                    </div>
                    <input
                      ref={recoverInputRef}
                      type="file" accept=".bin"
                      onChange={e => setRecoverFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>

                  {!dfuSupported && (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      WebUSB requires Chrome or Edge
                    </div>
                  )}

                  <button
                    onClick={() => recoverFile && flashFirmwareDirect(recoverFile)}
                    disabled={!recoverFile || !dfuSupported}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all',
                      recoverFile && dfuSupported
                        ? 'bg-sky-500 hover:bg-sky-400 text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    <Usb className="w-4 h-4" />
                    Flash Firmware (Device already in DFU mode)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected state */}
      {isConnected && !autoConnecting && (
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-3">
          {/* Thunder-only warnings */}
          {!isDevSensor && status && status.voltage > 0.1 && status.voltage < 7 && (
            <div className={clsx('flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium border', {
              'bg-red-500/10 border-red-500/20 text-red-400': status.voltage < 5.5,
              'bg-amber-500/10 border-amber-500/20 text-amber-400': status.voltage >= 5.5,
            })}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Voltage {status.voltage.toFixed(1)}V — device requires ≥7V to operate motors. Connect 12V power.
            </div>
          )}

          {!isDevSensor && status?.canMaster && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Radio className="w-4 h-4 flex-shrink-0" />
              <span><strong>CAN / SystemCore is master.</strong> USB motor control disabled. Power cycle to re-enable USB control.</span>
            </div>
          )}

          {/* Device type badge */}
          {isDevSensor && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/25 rounded-xl text-xs text-purple-300">
              <span className="font-semibold">SWYFT DEV</span>
              <span className="text-purple-400/60">·</span>
              <span className="text-purple-400">Sensor module connected</span>
              {devSensorStatus && (
                <>
                  <span className="text-purple-400/60 ml-auto">{devSensorStatus.vsen.toFixed(2)} V</span>
                  <span className="text-purple-400/60">·</span>
                  <span className="text-purple-400/60">{devSensorStatus.ntc.toFixed(1)} °C</span>
                </>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 bg-slate-900/60 backdrop-blur p-1 rounded-xl border border-slate-800">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabId)}
                className={clsx(
                  'flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg text-sm font-medium transition-all',
                  activeTab === id
                    ? (isDevSensor ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-sky-500/15 text-sky-400 border border-sky-500/30')
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 pb-4">
            {/* SWYFT DEV tabs */}
            {isDevSensor && activeTab === 'sensors'  && <DevSensorTab />}
            {isDevSensor && activeTab === 'graphs'   && <DevGraphsTab />}
            {isDevSensor && activeTab === 'firmware' && <FirmwareTab />}
            {isDevSensor && activeTab === 'log'      && <LogTab />}
            {isDevSensor && activeTab === 'about'    && <AboutTab />}
            {/* SWYFT Thunder tabs */}
            {!isDevSensor && activeTab === 'control'  && <ControlTab />}
            {!isDevSensor && activeTab === 'config'   && <ConfigTab />}
            {!isDevSensor && activeTab === 'can'      && <CanTab />}
            {!isDevSensor && activeTab === 'input'    && <InputTab />}
            {!isDevSensor && activeTab === 'firmware' && <FirmwareTab />}
            {!isDevSensor && activeTab === 'log'      && <LogTab />}
            {!isDevSensor && activeTab === 'about'    && <AboutTab />}
          </div>
        </div>
      )}
    </div>
  )
}
