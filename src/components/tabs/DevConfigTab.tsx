import { useState, useRef, useCallback } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { useAppContext, type AccentColor, type Theme, ACCENT_OPTIONS, THEME_OPTIONS } from '../../context/AppContext'
import {
  Settings2, Save, CheckCircle, Loader2, BookMarked, Lightbulb, Download, Upload,
  Trash2, ChevronDown, X, Search, Radio, Gauge, Thermometer, Zap, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'

/* ── Card wrapper ─────────────────────────────────────────────────────────── */
function Card({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
          <Icon className={clsx('w-4 h-4', color)} />
        </div>
        <span className="font-semibold text-white text-sm">{title}</span>
      </div>
      {children}
    </div>
  )
}

/* ── All DEV Sensor configurable parameters ──────────────────────────────── */
const DEV_PARAMS = [
  { id: 'can_device_num', label: 'CAN Device Number',        group: 'CAN Bus',    desc: 'FRC CAN device ID (0–62)' },
  { id: 'max_board_temp', label: 'Max Board Temp Alert',     group: 'Alerts',     desc: 'Alert threshold (°C)' },
  { id: 'max_imu_temp',   label: 'Max IMU Temp Alert',       group: 'Alerts',     desc: 'Alert threshold (°C)' },
  { id: 'min_voltage',    label: 'Min Supply Voltage Alert', group: 'Alerts',     desc: 'Alert threshold (V)' },
  { id: 'encoder_zero',   label: 'Encoder Zero Offset',      group: 'Encoders',   desc: 'MT6701 client-side zero' },
  { id: 'theme',          label: 'App Theme',                group: 'Appearance', desc: 'dark / midnight / steel' },
  { id: 'accent',         label: 'Accent Color',             group: 'Appearance', desc: 'sky / green / orange / violet' },
]

/* ── Config profile type ─────────────────────────────────────────────────── */
interface DevProfile {
  id: string
  name: string
  createdAt: number
  canDeviceNum: number
  maxBoardTemp: number
  maxImuTemp: number
  minVoltage: number
  encoderZero: number
  theme: Theme
  accent: AccentColor
}

const PROFILES_KEY = 'swyft-devsensor-profiles'

function loadProfiles(): DevProfile[] {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]') } catch { return [] }
}
function saveProfiles(p: DevProfile[]) { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)) }

/* ── Main component ──────────────────────────────────────────────────────── */
export function DevConfigTab() {
  const { canStatus, send, encoderZeroOffset } = useMotorStore(s => ({
    canStatus: s.canStatus,
    send: s.send,
    encoderZeroOffset: s.encoderZeroOffset,
  }))
  const { accent, setAccent, theme, setTheme, thresholds, setThresholds, accentCss } = useAppContext()

  /* ── Identify ───────────────────────────────────────────────────── */
  const [identifyState, setIdentifyState] = useState<'idle'|'blinking'>('idle')
  const [identifyFlash, setIdentifyFlash] = useState(0) // 1-5 counter for UI feedback
  const handleIdentify = async () => {
    setIdentifyState('blinking')
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    for (let i = 1; i <= 5; i++) {
      setIdentifyFlash(i)
      await send('LED 255 255 255')   // white full brightness
      await delay(200)
      await send('LED 0 0 0')         // off
      await delay(200)
    }
    setIdentifyFlash(0)
    setIdentifyState('idle')
  }

  /* ── CAN ID apply ───────────────────────────────────────────────── */
  const [canId, setCanId]           = useState(String(canStatus.deviceNumber))
  const [canApplyState, setCanApply] = useState<'idle'|'ok'>('idle')
  const applyCanId = async () => {
    const n = parseInt(canId)
    if (isNaN(n) || n < 0 || n > 62) return
    await send(`SET can_device_num ${n}`)
    await send('SAVE')
    setCanApply('ok')
    setTimeout(() => setCanApply('idle'), 2000)
  }

  /* ── Profiles ───────────────────────────────────────────────────── */
  const [profiles, setProfiles]   = useState<DevProfile[]>(loadProfiles)
  const [selected, setSelected]   = useState('')
  const [dropOpen, setDropOpen]   = useState(false)
  const [saveName, setSaveName]   = useState('')
  const [saveOpen, setSaveOpen]   = useState(false)
  const [applyState, setApplyState] = useState<'idle'|'applying'|'done'>('idle')
  const importRef = useRef<HTMLInputElement>(null)

  const persist = (p: DevProfile[]) => { setProfiles(p); saveProfiles(p) }

  const currentSnapshot = useCallback((): Omit<DevProfile, 'id'|'name'|'createdAt'> => ({
    canDeviceNum: canStatus.deviceNumber,
    maxBoardTemp: thresholds.maxBoardTemp,
    maxImuTemp:   thresholds.maxImuTemp,
    minVoltage:   thresholds.minVoltage,
    encoderZero:  encoderZeroOffset,
    theme, accent,
  }), [canStatus.deviceNumber, thresholds, encoderZeroOffset, theme, accent])

  const handleSaveProfile = () => {
    const name = saveName.trim()
    if (!name) return
    const prof: DevProfile = { id: Date.now().toString(), name, createdAt: Date.now(), ...currentSnapshot() }
    persist([prof, ...profiles])
    setSelected(prof.id)
    setSaveName(''); setSaveOpen(false)
  }

  const handleApplyProfile = useCallback(async () => {
    const prof = profiles.find(p => p.id === selected)
    if (!prof) return
    setApplyState('applying')
    // Apply CAN ID
    await send(`SET can_device_num ${prof.canDeviceNum}`)
    await send('SAVE')
    // Apply client-side settings
    setThresholds({ maxBoardTemp: prof.maxBoardTemp, maxImuTemp: prof.maxImuTemp, minVoltage: prof.minVoltage })
    setTheme(prof.theme)
    setAccent(prof.accent)
    setApplyState('done')
    setTimeout(() => setApplyState('idle'), 2000)
  }, [profiles, selected, send, setThresholds, setTheme, setAccent])

  const handleDelete = () => {
    persist(profiles.filter(p => p.id !== selected))
    setSelected('')
  }

  const handleExportProfile = () => {
    const prof = profiles.find(p => p.id === selected)
    if (!prof) return
    const blob = new Blob([JSON.stringify(prof, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `swyft-dev-profile-${prof.name.replace(/\s+/g,'-')}.json` })
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 200)
  }

  const handleBackup = () => {
    const data = { device: 'SWYFT DEV Sensor', exportedAt: new Date().toISOString(), ...currentSnapshot() }
    const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `swyft-dev-backup-${ts}.json` })
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 200)
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const data = JSON.parse(await file.text()) as Partial<DevProfile>
      setApplyState('applying')
      if (data.canDeviceNum !== undefined) { await send(`SET can_device_num ${data.canDeviceNum}`); await send('SAVE') }
      if (data.maxBoardTemp !== undefined || data.maxImuTemp !== undefined || data.minVoltage !== undefined) {
        setThresholds({
          maxBoardTemp: data.maxBoardTemp ?? thresholds.maxBoardTemp,
          maxImuTemp:   data.maxImuTemp   ?? thresholds.maxImuTemp,
          minVoltage:   data.minVoltage   ?? thresholds.minVoltage,
        })
      }
      if (data.theme)  setTheme(data.theme)
      if (data.accent) setAccent(data.accent)
      setApplyState('done')
      setTimeout(() => setApplyState('idle'), 2000)
    } catch { alert('Invalid backup/profile file.') }
  }

  /* ── Search ─────────────────────────────────────────────────────── */
  const [search, setSearch] = useState('')
  const searchLower   = search.trim().toLowerCase()
  const searchResults = searchLower
    ? DEV_PARAMS.filter(p =>
        p.label.toLowerCase().includes(searchLower) ||
        p.id.includes(searchLower) ||
        p.group.toLowerCase().includes(searchLower)
      )
    : []

  const selectedProf = profiles.find(p => p.id === selected)

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Top action bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Identify */}
        <button onClick={handleIdentify} disabled={identifyState === 'blinking'}
          className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
            identifyState === 'blinking'
              ? 'bg-white/10 border-white/30 text-white cursor-wait'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-yellow-300 hover:border-yellow-500/40'
          )}>
          <Lightbulb className={clsx('w-4 h-4 transition-all', identifyFlash > 0 ? 'text-white drop-shadow-[0_0_6px_white]' : '')} />
          {identifyState === 'blinking'
            ? `Flash ${identifyFlash} / 5…`
            : 'Identify Device'}
        </button>

        <button onClick={handleBackup}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 transition-all">
          <Download className="w-4 h-4" /> Backup Config
        </button>
        <button onClick={() => importRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-purple-400 hover:border-purple-500/30 transition-all">
          <Upload className="w-4 h-4" /> Restore
        </button>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
      </div>

      {/* ── Profile Manager ──────────────────────────────────────────── */}
      <Card title="Configuration Profiles" icon={BookMarked} color="text-indigo-400">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Save your current settings as a named preset and load them onto any DEV Sensor.</p>

          {/* Profile selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <button onClick={() => setDropOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-left hover:border-slate-600 transition-colors">
                <span className={clsx('truncate', selectedProf ? 'text-white' : 'text-slate-500')}>
                  {selectedProf ? selectedProf.name : 'Select a profile…'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              </button>
              {dropOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropOpen(false)} />
                  <div className="absolute top-full mt-1 left-0 right-0 z-40 bg-[#080d18] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                    {profiles.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-slate-500 text-center">No saved profiles yet</div>
                    ) : profiles.map(p => (
                      <button key={p.id} onClick={() => { setSelected(p.id); setDropOpen(false) }}
                        className={clsx('w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
                          p.id === selected ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-slate-800'
                        )}>
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-600 flex-shrink-0 ml-2">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Apply */}
            <button onClick={handleApplyProfile} disabled={!selectedProf || applyState !== 'idle'}
              className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all', {
                'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25': selectedProf && applyState === 'idle',
                'bg-sky-800/30 border-sky-700/30 text-sky-600 cursor-wait': applyState === 'applying',
                'bg-emerald-500/15 border-emerald-500/30 text-emerald-400': applyState === 'done',
                'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed': !selectedProf && applyState === 'idle',
              })}>
              {applyState === 'applying' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
               : applyState === 'done' ? <CheckCircle className="w-3.5 h-3.5" />
               : <RefreshCw className="w-3.5 h-3.5" />}
              {applyState === 'applying' ? 'Applying…' : applyState === 'done' ? 'Applied!' : 'Load'}
            </button>

            {selectedProf && (
              <>
                <button onClick={handleDelete}
                  className="p-2 rounded-lg border bg-slate-800 border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleExportProfile}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 transition-all">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </>
            )}
          </div>

          {/* Save new */}
          <div className="pt-2 border-t border-slate-800">
            {saveOpen ? (
              <div className="flex items-center gap-2">
                <input autoFocus placeholder="Profile name…" value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); if (e.key === 'Escape') setSaveOpen(false) }}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
                <button onClick={handleSaveProfile} disabled={!saveName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-40">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={() => setSaveOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setSaveOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border bg-slate-800/60 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
                <Save className="w-3.5 h-3.5" /> Save Current Settings as Profile…
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Parameter Search ─────────────────────────────────────────── */}
      <Card title="Parameter Search" icon={Search} color="text-sky-400">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              placeholder="Search parameters (e.g. CAN, temp, voltage, encoder)…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 font-medium">{p.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-medium">{p.group}</span>
                  <span className="font-mono text-[10px] text-slate-600">{p.id}</span>
                </div>
              ))}
            </div>
          ) : searchLower ? (
            <div className="text-center text-sm text-slate-500 py-3">No parameters matched "{search}"</div>
          ) : (
            <div className="text-xs text-slate-600 text-center py-1">Start typing to search all configurable parameters</div>
          )}
        </div>
      </Card>

      {/* ── CAN & Device Settings ────────────────────────────────────── */}
      <Card title="CAN & Device Settings" icon={Radio} color="text-sky-400">
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">CAN Device Number</label>
              <input type="number" min={0} max={62} value={canId}
                onChange={e => setCanId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
              <div className="text-[11px] text-slate-600 mt-1">Range 0–62. Saved immediately to flash.</div>
            </div>
            <button onClick={applyCanId}
              className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0',
                canApplyState === 'ok'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25'
              )}>
              {canApplyState === 'ok' ? <><CheckCircle className="w-4 h-4" /> Applied!</> : <><Save className="w-4 h-4" /> Apply & Save</>}
            </button>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <span className="text-slate-500">Current CAN ID on device:</span>
            <span className="font-mono text-slate-300 font-semibold">{canStatus.deviceNumber}</span>
            <span className="mx-2 text-slate-700">·</span>
            <span className="text-slate-500">Heartbeat:</span>
            <span className={clsx('font-semibold', canStatus.heartbeatValid ? 'text-emerald-400' : 'text-slate-500')}>
              {canStatus.heartbeatValid ? 'Valid' : 'None'}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Alert Thresholds ─────────────────────────────────────────── */}
      <Card title="Alert Thresholds" icon={Thermometer} color="text-orange-400">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Enable Threshold Alerts</span>
            <button onClick={() => setThresholds({ enabled: !thresholds.enabled })}
              className={clsx('relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                thresholds.enabled ? 'bg-sky-500' : 'bg-slate-700')}>
              <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                thresholds.enabled ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
          {thresholds.enabled && (
            <div className="space-y-4 pt-1">
              {[
                { label: 'Max Board Temp',    unit: '°C', key: 'maxBoardTemp', min: 30, max: 100, color: '#fb923c' },
                { label: 'Max IMU Temp',      unit: '°C', key: 'maxImuTemp',   min: 30, max: 100, color: '#f97316' },
                { label: 'Min Supply Voltage',unit: 'V',  key: 'minVoltage',   min: 1,  max: 4,   color: '#fbbf24', step: 0.1 },
              ].map(t => (
                <div key={t.key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      {t.key === 'minVoltage' ? <Zap className="w-3.5 h-3.5 text-yellow-400" /> : <Thermometer className="w-3.5 h-3.5 text-orange-400" />}
                      {t.label}
                    </span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded-lg text-sm" style={{ backgroundColor: t.color + '22', color: t.color }}>
                      {(thresholds[t.key as keyof typeof thresholds] as number)?.toFixed(t.step ? 1 : 0)} {t.unit}
                    </span>
                  </div>
                  <input type="range"
                    min={t.min} max={t.max} step={t.step ?? 1}
                    value={thresholds[t.key as keyof typeof thresholds] as number}
                    onChange={e => setThresholds({ [t.key]: parseFloat(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700"
                    style={{ accentColor: t.color }} />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>{t.min} {t.unit}</span><span>{t.max} {t.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Appearance ───────────────────────────────────────────────── */}
      <Card title="Appearance" icon={Settings2} color="text-violet-400">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Accent Color</div>
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map(o => (
                <button key={o.id} onClick={() => setAccent(o.id)}
                  className={clsx('flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all text-center',
                    accent === o.id ? 'border-transparent scale-105' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  )}
                  style={accent === o.id ? { backgroundColor: o.hex + '22', borderColor: o.hex + '66', color: o.hex } : {}}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Theme</div>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(o => (
                <button key={o.id} onClick={() => setTheme(o.id)}
                  className={clsx('flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all text-center',
                    theme === o.id
                      ? 'border-sky-500/50 bg-sky-500/10 text-sky-300 scale-105'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  )}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Encoder Settings ─────────────────────────────────────────── */}
      <Card title="Encoder Settings" icon={Gauge} color="text-purple-400">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div>
              <div className="text-sm text-slate-300 font-medium">MT6701 Zero Offset</div>
              <div className="text-xs text-slate-500 mt-0.5">Applied client-side to relative position readings</div>
            </div>
            <span className="font-mono text-indigo-300 font-bold text-sm">{encoderZeroOffset} cts</span>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span>To zero the encoder, use the <strong className="text-slate-500">"Zero" button</strong> on the Sensors tab.</span>
          </div>
        </div>
      </Card>

      {/* Apply state banner */}
      {applyState === 'done' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Profile applied successfully.
        </div>
      )}
    </div>
  )
}
