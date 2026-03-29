import { useEffect, useState } from 'react'
import { useMotorStore, type MotorConfig } from '../../store/motorStore'
import { RefreshCw, Save, RotateCcw, AlertTriangle, CheckCircle, Loader2, ShieldAlert, Lock } from 'lucide-react'
import clsx from 'clsx'

// ── display-only field (not editable) ────────────────────────────────────────
function ReadOnly({ label, value, unit, hint }: {
  label: string; value: number | undefined; unit?: string; hint?: string
}) {
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

// ── editable number field ─────────────────────────────────────────────────────
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

export function ConfigTab() {
  const { config, configLoading, loadConfig, send } = useMotorStore()
  const [saveState, setSaveState]     = useState<'idle'|'saving'|'ok'>('idle')
  const [factoryConfirm, setFactoryConfirm] = useState(false)
  const [clearState, setClearState]   = useState<'idle'|'ok'>('idle')

  useEffect(() => { loadConfig() }, [])

  const set = (param: string, value: number) => send(`SET ${param} ${value}`)

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

  return (
    <div className="space-y-3 max-w-2xl">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={loadConfig}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
        <button onClick={handleSave}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all', {
            'bg-sky-500 hover:bg-sky-400 text-white':     saveState === 'idle',
            'bg-sky-700 text-sky-300 cursor-wait':        saveState === 'saving',
            'bg-green-600/80 text-white':                 saveState === 'ok',
          })}>
          {saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : saveState === 'ok'  ? <CheckCircle className="w-3.5 h-3.5" />
            : <Save className="w-3.5 h-3.5" />}
          {saveState === 'ok' ? 'Saved!' : 'Save to Flash'}
        </button>
        <button onClick={handleClearFaults}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            clearState === 'ok' ? 'bg-green-600/80 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')}>
          <ShieldAlert className="w-3.5 h-3.5" />
          {clearState === 'ok' ? 'Cleared!' : 'Clear Faults'}
        </button>
        <button onClick={handleFactory}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ml-auto',
            factoryConfirm ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-400')}>
          <RotateCcw className="w-3.5 h-3.5" />
          {factoryConfirm ? 'Click again to confirm!' : 'Factory Defaults'}
        </button>
        {factoryConfirm && (
          <button onClick={() => setFactoryConfirm(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Motor Setup */}
        <Section title="Motor Setup">
          <ReadOnly label="Encoder Bias"       value={c.biasEncoder}  hint="Updated by calibration (CALI)" />
          <ReadOnly label="Temp Warning"        value={c.tempWarn}     unit="°C" hint="Factory thermal limit" />
          <ReadOnly label="Temp Error"          value={c.tempErr}      unit="°C" hint="Factory thermal limit" />
          <Field    label="CAN Device #"        param="can_device_num" value={c.canDeviceNum} onSet={set} hint="FRC CAN device number (0–62)" />
          <Field    label="Swerve Zero Offset"  param="swerve_offset"  value={c.swerveOffset} onSet={set} />
        </Section>

        {/* Protection & Motion */}
        <Section title="Protection & Motion">
          <Field  label="Current Limit"          param="peak_cur_threshold" value={c.peakCurThresholdA} unit="A"  step={0.1} decimals={2} onSet={set} hint="Peak before fault" />
          <Field  label="Current Limit Duration" param="peak_cur_duration"  value={c.peakCurDurationMs} unit="ms" onSet={set} />
          <Toggle label="Brake Mode"             param="brake_mode"          value={c.brakeMode}          onSet={set} hint="On = brake on stop  Off = coast" />
          <Field  label="Soft Limit Min"         param="pos_limit_min"       value={c.posLimitMin}        onSet={set} hint="Encoder ticks; min < max to enable" />
          <Field  label="Soft Limit Max"         param="pos_limit_max"       value={c.posLimitMax}        onSet={set} hint="Both 0 = disabled" />
        </Section>

        {/* Calibration (advanced) */}
        <Section title="Calibration (Advanced)">
          <Field label="Cali Current"    param="cali_current"      value={c.caliCurrent}     step={10}    decimals={0} onSet={set} hint="Current used during calibration" />
          <Field label="Cali Angle Elec" param="cali_angle_elec"   value={c.caliAngleElec}   step={0.001} decimals={4} onSet={set} hint="Electrical angle offset (rad)" />
          <Field label="Cali Angle Spd"  param="cali_angle_speed"  value={c.caliAngleSpeed}  step={0.1}   decimals={3} onSet={set} hint="Target cal speed (rad/s)" />
        </Section>

        {/* Note about PIDs */}
        <div className="md:col-span-2 flex items-start gap-2 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-400">
          <span className="mt-0.5">ℹ</span>
          <span>PID gains are on the <strong>Control</strong> tab — click "Show PID Settings" after selecting a mode. Changes take effect immediately.</span>
        </div>

        {/* Warning */}
        <div className="md:col-span-2 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Changes take effect immediately but are <strong>not saved</strong> until you click <strong>Save to Flash</strong>. Rebooting without saving will discard changes.</span>
        </div>
      </div>
    </div>
  )
}
