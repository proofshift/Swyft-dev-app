import { useState, useRef, useEffect } from 'react'
import { useMotorStore } from './store/motorStore'
import { useAppContext, ACCENT_OPTIONS, THEME_OPTIONS, type AccentColor, type Theme } from './context/AppContext'
import { ControlTab }   from './components/tabs/ControlTab'
import { CanTab }       from './components/tabs/CanTab'
import { FirmwareTab }  from './components/tabs/FirmwareTab'
import { LogTab }       from './components/tabs/LogTab'
import { InputTab }     from './components/tabs/InputTab'
import { ConfigTab }    from './components/tabs/ConfigTab'
import { DevSensorTab } from './components/tabs/DevSensorTab'
import { DevGraphsTab } from './components/tabs/DevGraphsTab'
import { DocsTab }      from './components/tabs/DocsTab'
import { SerialConnection } from './api/SerialConnection'
import {
  Zap, Wifi, WifiOff, Loader2, Radio, Terminal, Cpu, AlertCircle,
  Sliders, Upload, CheckCircle, Usb, Settings, Gauge, TrendingUp,
  BookOpen, LayoutDashboard, ChevronLeft, ChevronRight, ChevronDown,
  ChevronUp, Activity, Thermometer, Menu, X, Palette, Signal,
  AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import swyftLogo from './assets/swyft-logo.png'

/* ─── Tab definitions ────────────────────────────────────────────────────── */
const THUNDER_TABS = [
  { id: 'control',  label: 'Control',  icon: Zap,             group: 'device' },
  { id: 'config',   label: 'Config',   icon: Settings,        group: 'device' },
  { id: 'can',      label: 'CAN Bus',  icon: Radio,           group: 'device' },
  { id: 'input',    label: 'Inputs',   icon: Sliders,         group: 'device' },
  { id: 'firmware', label: 'Firmware', icon: Cpu,             group: 'system' },
  { id: 'log',      label: 'Console',  icon: Terminal,        group: 'system' },
  { id: 'docs',     label: 'Docs',     icon: BookOpen,        group: 'system' },
] as const

const DEVSENSOR_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'device' },
  { id: 'sensors',   label: 'Sensors',   icon: Gauge,           group: 'device' },
  { id: 'graphs',    label: 'Graphs',    icon: TrendingUp,      group: 'device' },
  { id: 'firmware',  label: 'Firmware',  icon: Cpu,             group: 'system' },
  { id: 'log',       label: 'Console',   icon: Terminal,        group: 'system' },
  { id: 'docs',      label: 'Docs',      icon: BookOpen,        group: 'system' },
] as const

type ThunderTabId   = typeof THUNDER_TABS[number]['id']
type DevSensorTabId = typeof DEVSENSOR_TABS[number]['id']
type TabId = ThunderTabId | DevSensorTabId

const isSupported = SerialConnection.isSupported()
interface FwEntry { id: string; name: string; file: string; version: string; date: string }

/* ─── NavItem (top-level, stable reference) ──────────────────────────────── */
function NavItem({ label, icon: Icon, active, onClick, collapsed }: {
  label: string; icon: React.ElementType; active: boolean
  onClick: () => void; collapsed: boolean
}) {
  const { accentCss } = useAppContext()
  const hex = accentCss.hex
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative border',
        active ? 'border-white/10' : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5'
      )}
      style={active ? { backgroundColor: hex + '22', color: hex + 'dd', borderColor: hex + '44' } : undefined}
    >
      <Icon className={clsx(
        'flex-shrink-0 transition-colors',
        collapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4',
        !active && 'text-slate-500 group-hover:text-slate-300'
      )}
        style={active ? { color: hex } : undefined}
      />
      {!collapsed && <span className="truncate">{label}</span>}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
          style={{ backgroundColor: hex }} />
      )}
    </button>
  )
}

/* ─── Sidebar (top-level, stable reference) ──────────────────────────────── */
type SidebarTab = { id: string; label: string; icon: React.ElementType; group: string }

function AppSidebar({
  collapsed, onToggleCollapse,
  tabs, activeTab, onSelectTab,
  isConnected, isDevSensor,
  mobile, onCloseMobile,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  tabs: readonly SidebarTab[]
  activeTab: TabId
  onSelectTab: (id: TabId) => void
  isConnected: boolean
  isDevSensor: boolean
  mobile?: boolean
  onCloseMobile?: () => void
}) {
  const { accentCss, themeCss } = useAppContext()
  const hex = accentCss.hex
  const isExpanded = mobile || !collapsed

  const handleSelect = (id: string) => {
    onSelectTab(id as TabId)
    onCloseMobile?.()
  }

  const deviceTabs  = tabs.filter(t => t.group === 'device')
  const systemTabs  = tabs.filter(t => t.group === 'system')
  const docsOnly    = [{ id: 'docs', label: 'Docs', icon: BookOpen, group: 'system' }]
  const systemList  = isConnected ? systemTabs : docsOnly

  return (
    <aside className={clsx(
      'flex flex-col border-r border-slate-800/80 transition-all duration-200 flex-shrink-0 bg-[#080d18]',
      mobile ? 'w-64 h-full' : (collapsed ? 'w-[60px]' : 'w-[210px]')
    )}>
      {/* Logo / header */}
      <div className={clsx(
        'flex items-center border-b border-slate-800/80 flex-shrink-0',
        isExpanded ? 'gap-3 px-4 py-4' : 'justify-center px-2 py-4'
      )}>
        <img src={swyftLogo} alt="SWYFT" className="w-8 h-8 flex-shrink-0 rounded-md object-cover" />
        {isExpanded && (
          <div className="leading-none min-w-0 flex-1">
            <div className="text-white font-bold text-[15px] tracking-tight">SWYFT</div>
            <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: hex }}>Link</div>
          </div>
        )}
        {!mobile && (
          <button
            onClick={onToggleCollapse}
            className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-white/5"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft  className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {isConnected && (
          <>
            {isExpanded && (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  {isDevSensor ? 'DEV Sensor' : 'Thunder'}
                </span>
              </div>
            )}
            {!isExpanded && <div className="border-t border-slate-800/40 my-1" />}
            {deviceTabs.map(t => (
              <NavItem key={t.id} label={t.label} icon={t.icon}
                active={activeTab === t.id}
                onClick={() => handleSelect(t.id)}
                collapsed={!isExpanded}
              />
            ))}
          </>
        )}

        {isExpanded && (
          <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">System</span>
          </div>
        )}
        {!isExpanded && isConnected && <div className="border-t border-slate-800/40 my-1" />}

        {systemList.map(t => (
          <NavItem key={t.id} label={t.label} icon={t.icon}
            active={activeTab === t.id}
            onClick={() => handleSelect(t.id)}
            collapsed={!isExpanded}
          />
        ))}
      </nav>

      {/* Connection status chip */}
      <div className="border-t border-slate-800/80 p-2 flex-shrink-0">
        {isConnected ? (
          <div className="rounded-lg p-2 flex items-center gap-2" style={{ backgroundColor: hex + '18' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: hex }} />
            {isExpanded && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate" style={{ color: hex + 'cc' }}>
                  {isDevSensor ? 'DEV Sensor' : 'Thunder'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">Connected</div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg p-2 bg-slate-800/40 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
            {isExpanded && <span className="text-xs text-slate-500">No device</span>}
          </div>
        )}
      </div>
    </aside>
  )
}

/* ─── DevSensor dashboard (top-level) ───────────────────────────────────── */
function DevSensorDashboard() {
  const { devSensorStatus: d } = useMotorStore()
  if (!d) return (
    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
      Waiting for data…
    </div>
  )
  const cards = [
    { label: 'Supply',       value: d.vsen.toFixed(2),   unit: 'V',   color: '#fbbf24', ok: d.vsen > 3 },
    { label: 'Board Temp',   value: d.ntc.toFixed(1),    unit: '°C',  color: '#fb923c', ok: d.ntc < 70 },
    { label: 'IMU Temp',     value: d.imuTemp.toFixed(1),unit: '°C',  color: '#f97316', ok: d.imuTemp < 70 },
    { label: 'AS5600',       value: ((d.as5600 / 4096) * 360).toFixed(1),   unit: '°', color: '#a78bfa', ok: true },
    { label: 'MT6701 Abs',   value: ((d.mt6701 / 16384) * 360).toFixed(1),  unit: '°', color: '#818cf8', ok: true },
    { label: 'MT6701 Turns', value: String(d.mt6701Turns), unit: ' rev', color: '#6366f1', ok: true },
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{c.label}</span>
              <span className={clsx('w-2 h-2 rounded-full', c.ok ? 'bg-emerald-400' : 'bg-red-400')} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-white">{c.value}</span>
              <span className="text-sm text-slate-400">{c.unit}</span>
            </div>
            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: c.color, opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* IMU quick view */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">IMU — LSM6DSO</span>
          <span className={clsx('ml-auto text-xs px-2 py-0.5 rounded-full font-medium',
            d.errFlags & 0x07 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
          )}>
            {d.errFlags & 0x07 ? `ERR 0x${d.errFlags.toString(16)}` : 'OK'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { label: 'Accel X', val: d.ax.toFixed(0),        unit: 'mg',  color: '#38bdf8' },
            { label: 'Accel Y', val: d.ay.toFixed(0),        unit: 'mg',  color: '#818cf8' },
            { label: 'Accel Z', val: d.az.toFixed(0),        unit: 'mg',  color: '#34d399' },
            { label: 'Gyro X',  val: (d.gx/1000).toFixed(1), unit: 'dps', color: '#f472b6' },
            { label: 'Gyro Y',  val: (d.gy/1000).toFixed(1), unit: 'dps', color: '#fb923c' },
            { label: 'Gyro Z',  val: (d.gz/1000).toFixed(1), unit: 'dps', color: '#fbbf24' },
          ].map(r => (
            <div key={r.label} className="text-center">
              <div className="text-slate-500 mb-1">{r.label}</div>
              <div className="font-mono font-semibold" style={{ color: r.color }}>{r.val}</div>
              <div className="text-slate-600">{r.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Magnet + raw count */}
      <div className="grid grid-cols-2 gap-3">
        <div className={clsx(
          'border rounded-xl p-4 flex items-center gap-3 transition-all',
          d.magnet ? 'bg-pink-500/10 border-pink-500/30' : 'bg-slate-900 border-slate-800'
        )}>
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-lg',
            d.magnet ? 'bg-pink-500/20' : 'bg-slate-800'
          )}>🧲</div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Mag Switch</div>
            <div className={clsx('text-sm font-bold mt-0.5', d.magnet ? 'text-pink-300' : 'text-slate-400')}>
              {d.magnet ? 'DETECTED' : 'Clear'}
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Raw Count</div>
            <div className="font-mono text-sm font-bold text-indigo-300 mt-0.5">{d.mt6701CountRaw} cts</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Settings panel ─────────────────────────────────────────────────────── */
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { accent, setAccent, theme, setTheme, thresholds, setThresholds } = useAppContext()
  return (
    <div className="absolute right-0 top-12 z-50 w-72 bg-[#080d18] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 p-4 space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-sky-400" /> Appearance & Alerts
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>

      {/* Accent color */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Accent Color</div>
        <div className="flex gap-2">
          {ACCENT_OPTIONS.map(a => (
            <button key={a.id} onClick={() => setAccent(a.id as AccentColor)}
              title={a.label}
              className={clsx('w-8 h-8 rounded-lg border-2 transition-all', accent === a.id ? 'border-white scale-110' : 'border-transparent hover:border-slate-500')}
              style={{ backgroundColor: a.hex + '33', boxShadow: accent === a.id ? `0 0 8px ${a.hex}66` : 'none' }}>
              <span className="block w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: a.hex }} />
            </button>
          ))}
        </div>
      </div>

      {/* Background theme */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Background</div>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id as Theme)}
              className={clsx('flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                theme === t.id ? 'border-slate-400 text-white' : 'border-slate-700 text-slate-500 hover:border-slate-600')}
              style={{ backgroundColor: t.bg }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Threshold alerts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Alert Thresholds</div>
          <button onClick={() => setThresholds({ enabled: !thresholds.enabled })}
            className={clsx('text-xs px-2 py-0.5 rounded-md font-medium border transition-all',
              thresholds.enabled
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            )}>
            {thresholds.enabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className={clsx('space-y-2 transition-opacity', !thresholds.enabled && 'opacity-40 pointer-events-none')}>
          {[
            { label: 'Max Board Temp',  key: 'maxBoardTemp', val: thresholds.maxBoardTemp, unit: '°C', min: 30, max: 120, step: 1 },
            { label: 'Max IMU Temp',    key: 'maxImuTemp',   val: thresholds.maxImuTemp,   unit: '°C', min: 30, max: 120, step: 1 },
            { label: 'Min Voltage',     key: 'minVoltage',   val: thresholds.minVoltage,   unit: 'V',  min: 1,  max: 5,   step: 0.1 },
          ].map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-28 flex-shrink-0">{f.label}</span>
              <input type="range" min={f.min} max={f.max} step={f.step} value={f.val}
                onChange={e => setThresholds({ [f.key]: parseFloat(e.target.value) })}
                className="flex-1 accent-sky-400 h-1.5 rounded-full" />
              <span className="text-xs font-mono text-slate-300 w-12 text-right">{f.val.toFixed(f.step < 1 ? 1 : 0)}{f.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab]           = useState<TabId>('control')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [recoverOpen, setRecoverOpen]       = useState(false)
  const [recoverFile, setRecoverFile]       = useState<File | null>(null)
  const [firmwareList, setFirmwareList]     = useState<FwEntry[]>([])
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [packetsPerSec, setPacketsPerSec]   = useState(0)
  const recoverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('./firmware/manifest.json').then(r => r.json()).then(d => setFirmwareList(d.devices ?? [])).catch(() => {})
  }, [])

  const {
    connectionState, status, devSensorStatus, deviceType, connectError,
    connect, autoConnect, disconnect, dfuProgress, dfuError, dfuSupported,
    autoConnecting, justDisconnected, flashFirmwareFromSerial, flashFirmwareDirect, clearDFU,
    packetCount, lastPacketTime,
  } = useMotorStore()

  const { accentCss, themeCss, thresholds } = useAppContext()

  /* packets/sec rolling 1-second count */
  const prevPktRef = useRef(0)
  useEffect(() => {
    const id = setInterval(() => {
      setPacketsPerSec(packetCount - prevPktRef.current)
      prevPktRef.current = packetCount
    }, 1000)
    return () => clearInterval(id)
  }, [packetCount])

  useEffect(() => { autoConnect() }, [])

  const isDevSensor  = deviceType === 'devsensor'
  const TABS         = isDevSensor ? DEVSENSOR_TABS : THUNDER_TABS
  const accent: 'sky' | 'purple' = isDevSensor ? 'purple' : 'sky'
  const isConnected  = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'
  const isDFUActive  = dfuProgress !== null
  const isDFUDone    = dfuProgress?.phase === 'done'

  useEffect(() => {
    if (deviceType === 'devsensor') setActiveTab('dashboard')
    else if (deviceType === 'thunder') setActiveTab('control')
  }, [deviceType])

  const handleConnect = async () => {
    try { await connect() } catch { /* handled in store */ }
  }

  /* ─── Shared sidebar props ────────────────────────────────────────────── */
  const sharedSidebarProps = {
    tabs: TABS as readonly SidebarTab[],
    activeTab,
    onSelectTab: setActiveTab,
    isConnected,
    isDevSensor,
    accent,
  }

  /* threshold alerts for header banner */
  const threshAlerts: string[] = []
  if (thresholds.enabled && isConnected && isDevSensor && devSensorStatus) {
    if (devSensorStatus.ntc    >= thresholds.maxBoardTemp) threshAlerts.push(`Board ${devSensorStatus.ntc.toFixed(1)}°C`)
    if (devSensorStatus.imuTemp >= thresholds.maxImuTemp)  threshAlerts.push(`IMU ${devSensorStatus.imuTemp.toFixed(1)}°C`)
    if (devSensorStatus.vsen   <= thresholds.minVoltage)   threshAlerts.push(`${devSensorStatus.vsen.toFixed(2)}V low`)
  }
  const hasAlerts = threshAlerts.length > 0

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex overflow-hidden text-slate-100" style={{ backgroundColor: themeCss.bg }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar
          {...sharedSidebarProps}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 h-full z-10">
            <AppSidebar
              {...sharedSidebarProps}
              collapsed={false}
              onToggleCollapse={() => {}}
              mobile
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
          <button onClick={() => setMobileMenuOpen(false)}
            className="absolute top-3 right-3 z-20 w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Alert banner */}
        {hasAlerts && (
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-red-400">Alert: {threshAlerts.join(' · ')}</span>
          </div>
        )}

        {/* Top header */}
        <header className="relative flex-shrink-0 h-12 border-b border-slate-800/80 flex items-center px-4 gap-3" style={{ backgroundColor: themeCss.sidebar }}>
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <span className="text-slate-400 font-medium hidden sm:inline">SWYFT Link</span>
            {isConnected && (
              <>
                <span className="hidden sm:inline">/</span>
                <span className="font-semibold hidden sm:inline" style={{ color: accentCss.hex }}>
                  {isDevSensor ? 'DEV Sensor' : 'Thunder'}
                </span>
                <span>/</span>
                <span className="text-slate-300 capitalize truncate">
                  {TABS.find(t => t.id === activeTab)?.label ?? activeTab}
                </span>
              </>
            )}
          </div>

          {/* Live stat chips */}
          {isConnected && isDevSensor && devSensorStatus && (
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-mono text-amber-300">{devSensorStatus.vsen.toFixed(2)}V</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Thermometer className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-mono text-orange-300">{devSensorStatus.ntc.toFixed(1)}°C</span>
              </div>
              {devSensorStatus.magnet && (
                <div className="flex items-center gap-1 px-2 py-1 bg-pink-500/10 border border-pink-500/20 rounded-lg text-xs text-pink-300">
                  🧲 Magnet
                </div>
              )}
            </div>
          )}
          {isConnected && !isDevSensor && status && (
            <div className="hidden sm:flex items-center gap-2 ml-2">
              {status.voltage > 0.1 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-mono text-amber-300">{status.voltage.toFixed(1)}V</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Thermometer className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-mono text-orange-300">{status.temperature.toFixed(0)}°C</span>
              </div>
            </div>
          )}
          {isConnecting && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg ml-2 border"
              style={{ backgroundColor: accentCss.hex + '18', borderColor: accentCss.hex + '33', color: accentCss.hex }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Connecting…</span>
            </div>
          )}

          {/* Packets/sec health indicator */}
          {isConnected && isDevSensor && (
            <div className={clsx('hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono',
              packetsPerSec > 0
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            )}>
              <Signal className="w-3 h-3" />
              {packetsPerSec > 0 ? `${packetsPerSec} Hz` : lastPacketTime > 0 ? 'stalled' : '—'}
            </div>
          )}

          {/* Connect / Disconnect */}
          <div className="ml-auto flex items-center gap-2">
            {!isSupported && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Chrome / Edge required
              </div>
            )}
            {/* Settings / Appearance */}
            <button onClick={() => setSettingsOpen(o => !o)}
              title="Appearance & Alerts"
              className={clsx('flex items-center justify-center w-8 h-8 rounded-lg border transition-all',
                settingsOpen
                  ? 'bg-sky-500/20 border-sky-500/30 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              )}>
              <Palette className="w-4 h-4" />
            </button>
            {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

            {isSupported && (
              <button onClick={isConnected ? disconnect : handleConnect} disabled={isConnecting}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  isConnected
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'text-white shadow-lg',
                  isConnecting && 'opacity-60 cursor-not-allowed'
                )}
                style={!isConnected ? {
                  backgroundColor: accentCss.hex,
                  borderColor: accentCss.hex + '80',
                  boxShadow: `0 4px 14px ${accentCss.hex}33`,
                } : undefined}>
                {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isConnected ? <WifiOff className="w-3.5 h-3.5" />
                  : <Wifi className="w-3.5 h-3.5" />}
                {isConnecting ? 'Connecting…' : isConnected ? 'Disconnect' : 'Connect'}
              </button>
            )}
          </div>
        </header>

        {/* ── DFU flashing overlay ─────────────────────────────────────── */}
        {!isConnected && isDFUActive && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-sm">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-4 mb-5">
                  <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0',
                    isDFUDone ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-sky-500/15 border-sky-500/30'
                  )}>
                    {isDFUDone
                      ? <CheckCircle className="w-6 h-6 text-emerald-400" />
                      : <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />}
                  </div>
                  <div>
                    <div className="font-bold text-white capitalize">{dfuProgress.phase}…</div>
                    <div className="text-xs text-slate-400 mt-0.5">{dfuProgress.message}</div>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                  <div className={clsx('h-2 rounded-full transition-all duration-300', isDFUDone ? 'bg-emerald-500' : 'bg-sky-500')}
                    style={{ width: `${dfuProgress.progress}%` }} />
                </div>
                <div className="text-xs text-slate-500 text-right mb-4">{dfuProgress.progress}%</div>
                {isDFUDone && (
                  <button onClick={() => { clearDFU(); handleConnect() }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-sky-500/25">
                    <Wifi className="w-4 h-4" /> Reconnect Device
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DFU error ────────────────────────────────────────────────── */}
        {!isConnected && !isDFUActive && dfuError && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-sm">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <AlertCircle className="w-4 h-4" /> Flash failed
                </div>
                <div className="font-mono text-xs text-red-300 break-all leading-relaxed">{dfuError}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={clearDFU} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all">Back</button>
                <button onClick={handleConnect} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-all">
                  <Wifi className="w-4 h-4" /> Reconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Auto-connecting ──────────────────────────────────────────── */}
        {!isDFUActive && !dfuError && autoConnecting && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-5">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Usb className="w-9 h-9 text-sky-400" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                </div>
              </div>
              <div>
                <p className="text-slate-500 text-sm">Device detected</p>
                <h2 className="text-white text-xl font-bold mt-1">Connecting automatically…</h2>
              </div>
              <div className="flex gap-1.5 justify-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400"
                    style={{ animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Just disconnected ────────────────────────────────────────── */}
        {!isConnected && !isDFUActive && !dfuError && !autoConnecting && justDisconnected && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-5">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <WifiOff className="w-9 h-9 text-red-400" />
              </div>
              <div>
                <p className="text-slate-500 text-sm">Connection lost</p>
                <h2 className="text-white text-xl font-bold mt-1">Device disconnected</h2>
                <p className="text-slate-600 text-sm mt-2">Waiting to reconnect…</p>
              </div>
              <button onClick={handleConnect} className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-sky-500/25">
                <Wifi className="w-4 h-4" /> Reconnect
              </button>
            </div>
          </div>
        )}

        {/* ── Connect screen (normal idle) ─────────────────────────────── */}
        {!isConnected && !isDFUActive && !dfuError && !autoConnecting && !justDisconnected && (
          activeTab === 'docs' ? (
            <main className="flex-1 overflow-y-auto p-6"><DocsTab /></main>
          ) : (
            <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
              <div className="w-full max-w-md space-y-5">
                {/* Hero */}
                <div className="text-center pt-8 pb-6">
                  <div className="relative inline-block mb-6">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-2xl shadow-sky-500/10 border border-slate-700/60">
                      <img src={swyftLogo} alt="SWYFT" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                      <Usb className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">SWYFT Link</h1>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Professional device interface for SWYFT Robotics hardware
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-xs font-medium">
                      <Zap className="w-3 h-3" /> Thunder Motor Controller
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-xs font-medium">
                      <Activity className="w-3 h-3" /> DEV Sensor Board
                    </span>
                  </div>
                </div>

                {/* Connect card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-sky-400" /> Connect via USB-C
                  </h2>
                  {!isSupported ? (
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      WebSerial requires Chrome 89+ or Edge 89+
                    </div>
                  ) : (
                    <>
                      <button onClick={handleConnect} disabled={isConnecting}
                        className="w-full flex items-center justify-center gap-2.5 py-3 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                        {isConnecting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
                          : <><Wifi className="w-4 h-4" /> Connect Device</>}
                      </button>
                      <p className="text-xs text-slate-600 text-center mt-3">
                        Previously connected devices reconnect automatically on plug-in
                      </p>
                    </>
                  )}
                  {connectError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm">
                      <div className="font-semibold mb-0.5">Connection failed</div>
                      <div className="font-mono text-xs opacity-80">{connectError}</div>
                    </div>
                  )}
                </div>

                {/* Recover / DFU */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <button onClick={() => setRecoverOpen(o => !o)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Usb className="w-4 h-4 text-slate-500" />
                      <span className="font-medium">Recover / Flash Firmware (DFU)</span>
                    </div>
                    {recoverOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {recoverOpen && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-800">
                      <div className="bg-slate-800/50 rounded-xl p-4 mt-4">
                        <div className="text-xs font-semibold text-slate-300 mb-3">How to enter DFU mode</div>
                        <ol className="space-y-2 text-xs text-slate-400">
                          {['Unplug from USB and power','Hold the DFU button (back of board)','Plug in USB-C while holding','Release after 2 seconds — device shows as STM32 BOOTLOADER'].map((s, i) => (
                            <li key={i} className="flex gap-2.5">
                              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      {firmwareList.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Available Firmware</div>
                          {firmwareList.map(fw => (
                            <button key={fw.id} onClick={async () => {
                              const resp = await fetch(`./firmware/${fw.file}`)
                              const blob = await resp.blob()
                              setRecoverFile(new File([blob], fw.file, { type: 'application/octet-stream' }))
                            }}
                              className={clsx('w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                recoverFile?.name === fw.file
                                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 text-slate-300'
                              )}>
                              <Cpu className="w-4 h-4 flex-shrink-0 text-slate-500" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{fw.name}</div>
                                <div className="text-[11px] text-slate-500">{fw.version} · {fw.date}</div>
                              </div>
                              {recoverFile?.name === fw.file && <CheckCircle className="w-4 h-4 flex-shrink-0 text-sky-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="flex items-center gap-3 p-3 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-sky-500/50 transition-colors group">
                        <Upload className="w-4 h-4 text-slate-500 group-hover:text-sky-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-slate-400 truncate">
                            {recoverFile && !firmwareList.some(fw => fw.file === recoverFile.name) ? recoverFile.name : 'Choose custom .bin file…'}
                          </div>
                        </div>
                        <input ref={recoverInputRef} type="file" accept=".bin"
                          onChange={e => setRecoverFile(e.target.files?.[0] ?? null)} className="hidden" />
                      </label>
                      {!dfuSupported && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" /> WebUSB requires Chrome or Edge
                        </div>
                      )}
                      <button onClick={() => recoverFile && flashFirmwareDirect(recoverFile)}
                        disabled={!recoverFile || !dfuSupported}
                        className={clsx('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all',
                          recoverFile && dfuSupported ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        )}>
                        <Usb className="w-4 h-4" /> Flash Firmware (Device in DFU Mode)
                      </button>
                    </div>
                  )}
                </div>

                {/* Docs link */}
                <button onClick={() => setActiveTab('docs' as TabId)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                  <BookOpen className="w-4 h-4" /> View Documentation
                </button>
              </div>
            </div>
          )
        )}

        {/* ── Connected ────────────────────────────────────────────────── */}
        {isConnected && !autoConnecting && (
          <main className="flex-1 overflow-y-auto">
            {/* Alert banners */}
            <div className="px-6 pt-4 space-y-2">
              {!isDevSensor && status && status.voltage > 0.1 && status.voltage < 7 && (
                <div className={clsx('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border',
                  status.voltage < 5.5 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                )}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Voltage {status.voltage.toFixed(1)}V — requires ≥7V for motor operation. Connect 12–24V power.
                </div>
              )}
              {!isDevSensor && status?.canMaster && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Radio className="w-4 h-4 flex-shrink-0" />
                  <span><strong>CAN / SystemCore is master.</strong> USB motor control disabled. Power cycle to re-enable.</span>
                </div>
              )}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {isDevSensor && activeTab === 'dashboard' && <DevSensorDashboard />}
              {isDevSensor && activeTab === 'sensors'   && <DevSensorTab />}
              {isDevSensor && activeTab === 'graphs'    && <DevGraphsTab />}
              {isDevSensor && activeTab === 'firmware'  && <FirmwareTab />}
              {isDevSensor && activeTab === 'log'       && <LogTab />}
              {activeTab === 'docs' && <DocsTab />}
              {!isDevSensor && activeTab === 'control'  && <ControlTab />}
              {!isDevSensor && activeTab === 'config'   && <ConfigTab />}
              {!isDevSensor && activeTab === 'can'      && <CanTab />}
              {!isDevSensor && activeTab === 'input'    && <InputTab />}
              {!isDevSensor && activeTab === 'firmware' && <FirmwareTab />}
              {!isDevSensor && activeTab === 'log'      && <LogTab />}
            </div>
          </main>
        )}

      </div>
    </div>
  )
}
