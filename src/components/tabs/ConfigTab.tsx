import { useEffect, useState, useRef, useCallback } from 'react'
import { useMotorStore, type MotorConfig } from '../../store/motorStore'
import {
  RefreshCw, Save, RotateCcw, AlertTriangle, CheckCircle, Loader2, ShieldAlert, Lock,
  Lightbulb, Search, X, ChevronDown, FolderOpen, Trash2, Download, Upload, BookMarked,
} from 'lucide-react'
import clsx from 'clsx'

/* ── Writable param mapping: MotorConfig key → SET command token ─────────── */
const WRITABLE: Array<{ key: keyof MotorConfig; param: string; label: string; group: string; unit?: string; decimals?: number; step?: number }> = [
  { key: 'canDeviceNum',       param: 'can_device_num',       label: 'CAN Device #',              group: 'Motor Setup',           decimals: 0 },
  { key: 'swerveOffset',       param: 'swerve_offset',        label: 'Swerve Zero Offset',         group: 'Motor Setup',           decimals: 0 },
  { key: 'peakCurThresholdA',  param: 'peak_cur_threshold',   label: 'Current Limit',              group: 'Protection & Motion',   unit: 'A',   step: 0.1, decimals: 2 },
  { key: 'peakCurDurationMs',  param: 'peak_cur_duration',    label: 'Current Limit Duration',     group: 'Protection & Motion',   unit: 'ms',  decimals: 0 },
  { key: 'brakeMode',          param: 'brake_mode',           label: 'Brake Mode',                 group: 'Protection & Motion',   decimals: 0 },
  { key: 'posLimitMin',        param: 'pos_limit_min',        label: 'Soft Limit Min',             group: 'Protection & Motion',   decimals: 0 },
  { key: 'posLimitMax',        param: 'pos_limit_max',        label: 'Soft Limit Max',             group: 'Protection & Motion',   decimals: 0 },
  { key: 'caliCurrent',        param: 'cali_current',         label: 'Cali Current',               group: 'Calibration',           decimals: 0,  step: 10 },
  { key: 'caliAngleElec',      param: 'cali_angle_elec',      label: 'Cali Angle Electrical',      group: 'Calibration',           step: 0.001, decimals: 4 },
  { key: 'caliAngleSpeed',     param: 'cali_angle_speed',     label: 'Cali Angle Speed',           group: 'Calibration',           step: 0.1,   decimals: 3 },
  { key: 'tcSpeed',            param: 'tc_speed',             label: 'T-Curve Max Speed',          group: 'T-Curve',               decimals: 0,  step: 65536 },
  { key: 'tcAccel',            param: 'tc_accel',             label: 'T-Curve Acceleration',       group: 'T-Curve',               decimals: 0,  step: 65536 },
  { key: 'tcMaxErr',           param: 'tc_max_err',           label: 'T-Curve Max Error',          group: 'T-Curve',               decimals: 0,  step: 256 },
  { key: 'pidPosKp',           param: 'pid_pos_kp',           label: 'Position PID Kp',            group: 'Position PID',          decimals: 0,  step: 1 },
  { key: 'pidPosKi',           param: 'pid_pos_ki',           label: 'Position PID Ki',            group: 'Position PID',          decimals: 0,  step: 1 },
  { key: 'pidPosOutMin',       param: 'pid_pos_out_min',      label: 'Position PID Out Min',       group: 'Position PID',          decimals: 0,  step: 10 },
  { key: 'pidPosOutMax',       param: 'pid_pos_out_max',      label: 'Position PID Out Max',       group: 'Position PID',          decimals: 0,  step: 10 },
  { key: 'pidSpdKp',           param: 'pid_speed_kp',         label: 'Velocity PID Kp',            group: 'Velocity PID',          decimals: 4,  step: 0.001 },
  { key: 'pidSpdKi',           param: 'pid_speed_ki',         label: 'Velocity PID Ki',            group: 'Velocity PID',          decimals: 3,  step: 0.1 },
  { key: 'pidSpdOutMin',       param: 'pid_speed_out_min',    label: 'Velocity PID Out Min',       group: 'Velocity PID',          decimals: 0,  step: 100 },
  { key: 'pidSpdOutMax',       param: 'pid_speed_out_max',    label: 'Velocity PID Out Max',       group: 'Velocity PID',          decimals: 0,  step: 100 },
  { key: 'pidIsqKp',           param: 'pid_isq_kp',           label: 'Current PID Kp',             group: 'Current PID',           decimals: 4,  step: 0.001 },
  { key: 'pidIsqKi',           param: 'pid_isq_ki',           label: 'Current PID Ki',             group: 'Current PID',           decimals: 3,  step: 0.1 },
  { key: 'pidIsqOutMin',       param: 'pid_isq_out_min',      label: 'Current PID Out Min',        group: 'Current PID',           decimals: 0,  step: 10 },
  { key: 'pidIsqOutMax',       param: 'pid_isq_out_max',      label: 'Current PID Out Max',        group: 'Current PID',           decimals: 0,  step: 10 },
]

/* ── Config profile type ─────────────────────────────────────────────────── */
interface ConfigProfile {
  id: string
  name: string
  createdAt: number
  config: Partial<Record<keyof MotorConfig, number>>
}

const PROFILES_KEY = 'swyft-thunder-profiles'

function loadProfiles(): ConfigProfile[] {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]') } catch { return [] }
}
function saveProfiles(p: ConfigProfile[]) { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)) }

/* ── Small sub-components ────────────────────────────────────────────────── */
function ReadOnly({ label, value, unit, hint }: { label: string; value: number | undefined; unit?: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <div className="min-w-0 flex items-center gap-1.5">
        <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          {hint && <div className="text-xs text-slate-600">{hint}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 font-mono text-sm text-slate-500">
        {value !== undefined ? value : '—'}{unit ? <span className="text-xs text-slate-600 ml-1">{unit}</span> : null}
      </div>
    </div>
  )
}

function Field({ label, param, value, unit, step = 1, decimals = 0, hint, onSet }: {
  label: string; param: string; value: number | undefined; unit?: string
  step?: number; decimals?: number; hint?: string
  onSet: (param: string, value: number) => void
}) {
  const [local, setLocal] = useState(value?.toFixed(decimals) ?? '')
  useEffect(() => { setLocal(value?.toFixed(decimals) ?? '') }, [value, decimals])
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-slate-300">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input type="number" step={step} value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => { const n = parseFloat(local); if (!isNaN(n)) onSet(param, n) }}
          className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white text-right font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
        {unit && <span className="text-xs text-slate-500 w-8">{unit}</span>}
      </div>
    </div>
  )
}

function Toggle({ label, param, value, hint, onSet }: {
  label: string; param: string; value: boolean | undefined; hint?: string
  onSet: (param: string, value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-slate-300">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <button onClick={() => onSet(param, value ? 0 : 1)}
        className={clsx('relative w-10 h-5 rounded-full transition-colors flex-shrink-0', value ? 'bg-sky-500' : 'bg-slate-700')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', value ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{title}</h3>
      {children}
    </div>
  )
}

/* ── Profile Manager component ───────────────────────────────────────────── */
function ProfileManager({ config, send, onReload }: {
  config: MotorConfig; send: (cmd: string) => Promise<void>; onReload: () => void
}) {
  const [profiles, setProfiles] = useState<ConfigProfile[]>(loadProfiles)
  const [selected, setSelected]  = useState<string>('')
  const [dropOpen, setDropOpen]  = useState(false)
  const [saveName, setSaveName]  = useState('')
  const [saveOpen, setSaveOpen]  = useState(false)
  const [applyState, setApplyState] = useState<'idle'|'applying'|'done'>('idle')
  const importRef = useRef<HTMLInputElement>(null)

  const persist = (p: ConfigProfile[]) => { setProfiles(p); saveProfiles(p) }

  const handleSaveProfile = () => {
    const name = saveName.trim()
    if (!name) return
    const prof: ConfigProfile = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      config: Object.fromEntries(
        WRITABLE.map(w => [w.key, typeof config[w.key] === 'boolean' ? (config[w.key] ? 1 : 0) : (config[w.key] as number)])
      ) as ConfigProfile['config'],
    }
    persist([prof, ...profiles])
    setSelected(prof.id)
    setSaveName('')
    setSaveOpen(false)
  }

  const handleApplyProfile = useCallback(async () => {
    const prof = profiles.find(p => p.id === selected)
    if (!prof) return
    setApplyState('applying')
    for (const w of WRITABLE) {
      const v = prof.config[w.key]
      if (v !== undefined) await send(`SET ${w.param} ${v}`)
    }
    setApplyState('done')
    setTimeout(() => setApplyState('idle'), 2000)
    onReload()
  }, [profiles, selected, send, onReload])

  const handleDelete = () => {
    const next = profiles.filter(p => p.id !== selected)
    persist(next)
    setSelected('')
  }

  const handleExportProfile = () => {
    const prof = profiles.find(p => p.id === selected)
    if (!prof) return
    const ts  = new Date().toISOString().slice(0, 10)
    const blob = new Blob([JSON.stringify(prof, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `swyft-profile-${prof.name.replace(/\s+/g,'-')}-${ts}.json` })
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 200)
  }

  const handleExportCurrent = () => {
    const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const data = { device: 'SWYFT Thunder', exportedAt: new Date().toISOString(), config }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `swyft-backup-${ts}.json` })
    document.body.appendChild(a); a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 200)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      // could be a profile JSON or a backup JSON
      const incoming: Partial<MotorConfig> = data.config ?? data
      setApplyState('applying')
      for (const w of WRITABLE) {
        const raw = (incoming as Record<string, unknown>)[w.key]
        if (raw !== undefined && typeof raw === 'number') await send(`SET ${w.param} ${raw}`)
      }
      setApplyState('done')
      setTimeout(() => setApplyState('idle'), 2000)
      onReload()
    } catch {
      alert('Invalid profile/backup file.')
    }
  }

  const selectedProf = profiles.find(p => p.id === selected)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookMarked className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-white">Configuration Profiles</span>
        <span className="text-[10px] text-slate-500 ml-1">— save & restore named presets</span>
      </div>

      {/* Profile selector row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <button onClick={() => setDropOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-left transition-colors hover:border-slate-600">
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
                    <span className="text-[10px] text-slate-600 flex-shrink-0 ml-2">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Apply profile */}
        <button onClick={handleApplyProfile} disabled={!selectedProf || applyState !== 'idle'}
          className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border', {
            'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25': selectedProf && applyState === 'idle',
            'bg-sky-800/30 border-sky-700/30 text-sky-600 cursor-wait': applyState === 'applying',
            'bg-emerald-500/15 border-emerald-500/30 text-emerald-400': applyState === 'done',
            'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed': !selectedProf && applyState === 'idle',
          })}>
          {applyState === 'applying' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
           : applyState === 'done'   ? <CheckCircle className="w-3.5 h-3.5" />
           : <FolderOpen className="w-3.5 h-3.5" />}
          {applyState === 'applying' ? 'Applying…' : applyState === 'done' ? 'Applied!' : 'Load'}
        </button>

        {/* Delete */}
        {selectedProf && (
          <button onClick={handleDelete}
            className="p-2 rounded-lg border bg-slate-800 border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Export selected profile */}
        {selectedProf && (
          <button onClick={handleExportProfile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
      </div>

      {/* Save new profile + backup/restore row */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800">
        {saveOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              placeholder="Profile name…"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); if (e.key === 'Escape') setSaveOpen(false) }}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
            <button onClick={handleSaveProfile} disabled={!saveName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-40">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setSaveOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setSaveOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
            <Save className="w-3.5 h-3.5" /> Save Current as Profile…
          </button>
        )}

        <button onClick={handleExportCurrent}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-400 transition-all ml-auto">
          <Download className="w-3.5 h-3.5" /> Backup Config
        </button>
        <button onClick={() => importRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border bg-slate-800 border-slate-700 text-slate-400 hover:text-purple-400 transition-all">
          <Upload className="w-3.5 h-3.5" /> Restore
        </button>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
    </div>
  )
}

/* ── Advanced search row item ────────────────────────────────────────────── */
function SearchResultRow({ item, config, onSet }: {
  item: typeof WRITABLE[number]
  config: MotorConfig
  onSet: (param: string, value: number) => void
}) {
  const raw   = config[item.key]
  const value = typeof raw === 'boolean' ? (raw ? 1 : 0) : (raw as number)
  const [local, setLocal] = useState(value?.toFixed(item.decimals ?? 0))
  useEffect(() => { setLocal(value?.toFixed(item.decimals ?? 0)) }, [value, item.decimals])
  return (
    <div className="flex items-center gap-3 py-2 px-3 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-300">{item.label}</div>
        <div className="text-[10px] text-slate-600 font-mono">{item.param}</div>
      </div>
      <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded font-medium">{item.group}</span>
      <input type="number" step={item.step ?? 1} value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { const n = parseFloat(local); if (!isNaN(n)) onSet(item.param, n) }}
        className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white text-right font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
      {item.unit && <span className="text-xs text-slate-500 w-7 flex-shrink-0">{item.unit}</span>}
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function ConfigTab() {
  const { config, configLoading, loadConfig, send } = useMotorStore()
  const [saveState, setSaveState]       = useState<'idle'|'saving'|'ok'>('idle')
  const [factoryConfirm, setFactoryConfirm] = useState(false)
  const [clearState, setClearState]     = useState<'idle'|'ok'>('idle')
  const [identifyState, setIdentifyState] = useState<'idle'|'blinking'>('idle')
  const [identifyFlash, setIdentifyFlash] = useState(0)
  const [search, setSearch]             = useState('')

  useEffect(() => { loadConfig() }, [])

  const set = useCallback((param: string, value: number) => send(`SET ${param} ${value}`), [send])

  const handleSave = async () => {
    setSaveState('saving')
    await send('SAVE')
    setTimeout(() => setSaveState('ok'), 400)
    setTimeout(() => setSaveState('idle'), 2500)
  }

  const handleFactory = async () => {
    if (!factoryConfirm) { setFactoryConfirm(true); return }
    setFactoryConfirm(false)
    await send('FACTORYDEFAULT')
    setTimeout(() => loadConfig(), 600)
  }

  const handleClearFaults = async () => {
    await send('CLEARFAULTS')
    setClearState('ok')
    setTimeout(() => setClearState('idle'), 2000)
  }

  const handleIdentify = async () => {
    setIdentifyState('blinking')
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    for (let i = 1; i <= 5; i++) {
      setIdentifyFlash(i)
      await send('LED 255 255 255')
      await delay(200)
      await send('LED 0 0 0')
      await delay(200)
    }
    setIdentifyFlash(0)
    setIdentifyState('idle')
  }

  const c = config as MotorConfig | null

  if (configLoading || !c) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        {configLoading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Loading config…</>
          : <button onClick={loadConfig} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">
              <RefreshCw className="w-4 h-4" /> Load Config
            </button>}
      </div>
    )
  }

  /* Search results */
  const searchLower   = search.trim().toLowerCase()
  const searchResults = searchLower
    ? WRITABLE.filter(w =>
        w.label.toLowerCase().includes(searchLower) ||
        w.param.toLowerCase().includes(searchLower) ||
        w.group.toLowerCase().includes(searchLower)
      )
    : []

  return (
    <div className="space-y-3 max-w-2xl">

      {/* Profiles panel */}
      <ProfileManager config={c} send={send} onReload={loadConfig} />

      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          placeholder="Search parameters (e.g. kp, brake, current)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="bg-slate-900 border border-sky-500/20 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-semibold text-sky-400">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
          </div>
          {searchResults.map(item => (
            <SearchResultRow key={item.param} item={item} config={c} onSet={set} />
          ))}
        </div>
      )}
      {searchLower && searchResults.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-5 text-center text-sm text-slate-500">
          No parameters matched "{search}"
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Identify */}
        <button onClick={handleIdentify} disabled={identifyState === 'blinking'}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            identifyState === 'blinking'
              ? 'bg-white/10 border-white/30 text-white cursor-wait'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-yellow-300 hover:border-yellow-500/30'
          )}>
          <Lightbulb className={clsx('w-3.5 h-3.5', identifyFlash > 0 ? 'text-white drop-shadow-[0_0_6px_white]' : '')} />
          {identifyState === 'blinking' ? `Flash ${identifyFlash}/5…` : 'Identify'}
        </button>

        <button onClick={loadConfig}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
        <button onClick={handleSave}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all', {
            'bg-sky-500 hover:bg-sky-400 border-sky-500 text-white': saveState === 'idle',
            'bg-sky-700 border-sky-700 text-sky-300 cursor-wait':    saveState === 'saving',
            'bg-green-600/80 border-green-600 text-white':           saveState === 'ok',
          })}>
          {saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : saveState === 'ok'  ? <CheckCircle className="w-3.5 h-3.5" />
            : <Save className="w-3.5 h-3.5" />}
          {saveState === 'ok' ? 'Saved!' : 'Save to Flash'}
        </button>
        <button onClick={handleClearFaults}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors',
            clearState === 'ok'
              ? 'bg-green-600/80 border-green-600 text-white'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300')}>
          <ShieldAlert className="w-3.5 h-3.5" />
          {clearState === 'ok' ? 'Cleared!' : 'Clear Faults'}
        </button>
        <button onClick={handleFactory}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ml-auto',
            factoryConfirm
              ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white animate-pulse'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400')}>
          <RotateCcw className="w-3.5 h-3.5" />
          {factoryConfirm ? 'Click again to confirm!' : 'Factory Defaults'}
        </button>
        {factoryConfirm && (
          <button onClick={() => setFactoryConfirm(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
        )}
      </div>

      {/* Standard param sections (shown when not searching) */}
      {!searchLower && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="Motor Setup">
          <ReadOnly label="Encoder Bias"       value={c.biasEncoder}  hint="Updated by calibration (CALI)" />
          <ReadOnly label="Temp Warning"        value={c.tempWarn}     unit="°C" hint="Factory thermal limit" />
          <ReadOnly label="Temp Error"          value={c.tempErr}      unit="°C" hint="Factory thermal limit" />
          <Field    label="CAN Device #"        param="can_device_num" value={c.canDeviceNum} onSet={set} hint="FRC CAN device number (0–62)" />
          <Field    label="Swerve Zero Offset"  param="swerve_offset"  value={c.swerveOffset} onSet={set} />
        </Section>

        <Section title="Protection & Motion">
          <Field  label="Current Limit"          param="peak_cur_threshold" value={c.peakCurThresholdA} unit="A"  step={0.1} decimals={2} onSet={set} hint="Peak before fault" />
          <Field  label="Current Limit Duration" param="peak_cur_duration"  value={c.peakCurDurationMs} unit="ms" onSet={set} />
          <Toggle label="Brake Mode"             param="brake_mode"          value={c.brakeMode}          onSet={set} hint="On = brake on stop  Off = coast" />
          <Field  label="Soft Limit Min"         param="pos_limit_min"       value={c.posLimitMin}        onSet={set} hint="Encoder ticks; min < max to enable" />
          <Field  label="Soft Limit Max"         param="pos_limit_max"       value={c.posLimitMax}        onSet={set} hint="Both 0 = disabled" />
        </Section>

        <Section title="Calibration (Advanced)">
          <Field label="Cali Current"    param="cali_current"      value={c.caliCurrent}     step={10}    decimals={0} onSet={set} hint="Current used during calibration" />
          <Field label="Cali Angle Elec" param="cali_angle_elec"   value={c.caliAngleElec}   step={0.001} decimals={4} onSet={set} hint="Electrical angle offset (rad)" />
          <Field label="Cali Angle Spd"  param="cali_angle_speed"  value={c.caliAngleSpeed}  step={0.1}   decimals={3} onSet={set} hint="Target cal speed (rad/s)" />
        </Section>

        <div className="md:col-span-2 flex items-start gap-2 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-400">
          <span className="mt-0.5">ℹ</span>
          <span>PID gains are on the <strong>Control</strong> tab — click "Show PID Settings" after selecting a mode. Changes take effect immediately.</span>
        </div>

        <div className="md:col-span-2 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Changes take effect immediately but are <strong>not saved</strong> until you click <strong>Save to Flash</strong>. Rebooting without saving will discard changes.</span>
        </div>
      </div>
      )}
    </div>
  )
}
