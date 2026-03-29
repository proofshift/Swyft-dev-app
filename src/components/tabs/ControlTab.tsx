import { useState, useCallback, useEffect } from 'react'
import { useMotorStore, type MotorConfig } from '../../store/motorStore'
import { Power, PowerOff, Gauge, Zap, Navigation, Activity } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import clsx from 'clsx'

const MODES = [
  { id: 2, label: 'Current',  icon: Zap      },
  { id: 3, label: 'Velocity', icon: Gauge     },
  { id: 4, label: 'Position', icon: Navigation},
  { id: 5, label: 'T-Curve',  icon: Activity  },
] as const

// ── tiny status tile ─────────────────────────────────────────────────────────
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-center min-w-0">
      <div className="text-sky-400 font-mono font-semibold text-sm truncate">{value}</div>
      <div className="text-slate-500 text-xs mt-0.5">{label}</div>
    </div>
  )
}

// ── slider control ────────────────────────────────────────────────────────────
function Slider({ label, unit, value, min, max, onChange }: {
  label: string; unit: string; value: number; min: number; max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="font-mono text-2xl font-bold text-sky-400">
          {value.toFixed(0)} <span className="text-sm text-slate-400">{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-sky-500" />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span><span>0</span><span>{max}</span>
      </div>
    </div>
  )
}

// ── single PID number input ───────────────────────────────────────────────────
function PidRow({ label, param, value, step, decimals, onSet }: {
  label: string; param: string; value: number | undefined
  step: number; decimals: number; onSet: (p: string, v: number) => void
}) {
  const [local, setLocal] = useState(value?.toFixed(decimals) ?? '0')
  useEffect(() => { setLocal(value?.toFixed(decimals) ?? '0') }, [value, decimals])
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 flex-shrink-0">{label}</span>
      <input type="number" step={step} value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { const n = parseFloat(local); if (!isNaN(n)) onSet(param, n) }}
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-right font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
    </div>
  )
}

// ── context-sensitive PID panel ───────────────────────────────────────────────
function PidPanel({ mode, config, send }: {
  mode: number; config: MotorConfig | null; send: (cmd: string) => Promise<void>
}) {
  const set = useCallback((param: string, v: number) => send(`SET ${param} ${v}`), [send])
  const c = config

  if (!c) return (
    <div className="text-xs text-slate-500 italic py-2">Load config from the Config tab first.</div>
  )

  if (mode === 2) return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current PID</div>
      <PidRow label="Kp"       param="pid_isq_kp"      value={c.pidIsqKp}      step={0.001} decimals={4} onSet={set} />
      <PidRow label="Ki"       param="pid_isq_ki"      value={c.pidIsqKi}      step={0.1}   decimals={3} onSet={set} />
      <PidRow label="Out Min"  param="pid_isq_out_min" value={c.pidIsqOutMin}  step={10}    decimals={0} onSet={set} />
      <PidRow label="Out Max"  param="pid_isq_out_max" value={c.pidIsqOutMax}  step={10}    decimals={0} onSet={set} />
    </div>
  )

  if (mode === 3) return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Velocity PID</div>
      <PidRow label="Kp"       param="pid_speed_kp"      value={c.pidSpdKp}      step={0.001} decimals={4} onSet={set} />
      <PidRow label="Ki"       param="pid_speed_ki"      value={c.pidSpdKi}      step={0.1}   decimals={3} onSet={set} />
      <PidRow label="Out Min"  param="pid_speed_out_min" value={c.pidSpdOutMin}  step={100}   decimals={0} onSet={set} />
      <PidRow label="Out Max"  param="pid_speed_out_max" value={c.pidSpdOutMax}  step={100}   decimals={0} onSet={set} />
    </div>
  )

  if (mode === 4) return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Position PID</div>
      <PidRow label="Kp"       param="pid_pos_kp"      value={c.pidPosKp}      step={1}   decimals={0} onSet={set} />
      <PidRow label="Ki"       param="pid_pos_ki"      value={c.pidPosKi}      step={1}   decimals={0} onSet={set} />
      <PidRow label="Out Min"  param="pid_pos_out_min" value={c.pidPosOutMin}  step={10}  decimals={0} onSet={set} />
      <PidRow label="Out Max"  param="pid_pos_out_max" value={c.pidPosOutMax}  step={10}  decimals={0} onSet={set} />
    </div>
  )

  if (mode === 5) return (
    <div className="space-y-4">
      {/* T-Curve profile — define the trapezoidal motion shape */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">T-Curve Profile</div>
        <PidRow label="Max Speed"  param="tc_speed"    value={c.tcSpeed}    step={65536} decimals={0} onSet={set} />
        <PidRow label="Accel"      param="tc_accel"    value={c.tcAccel}    step={65536} decimals={0} onSet={set} />
        <PidRow label="Max Error"  param="tc_max_err"  value={c.tcMaxErr}   step={256}   decimals={0} onSet={set} />
      </div>
      {/* Position PID — T-Curve generates position targets; Position PID tracks them */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Position PID</div>
          <span className="text-xs text-slate-600 italic">used to track the generated trajectory</span>
        </div>
        <PidRow label="Kp"       param="pid_pos_kp"      value={c.pidPosKp}      step={1}  decimals={0} onSet={set} />
        <PidRow label="Ki"       param="pid_pos_ki"      value={c.pidPosKi}      step={1}  decimals={0} onSet={set} />
        <PidRow label="Out Min"  param="pid_pos_out_min" value={c.pidPosOutMin}  step={10} decimals={0} onSet={set} />
        <PidRow label="Out Max"  param="pid_pos_out_max" value={c.pidPosOutMax}  step={10} decimals={0} onSet={set} />
      </div>
    </div>
  )

  return null
}

// ── compact chart ─────────────────────────────────────────────────────────────
function MiniChart({ title, dataKey, color, unit, data }: {
  title: string; dataKey: string; color: string; unit: string
  data: Array<Record<string, number>>
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold text-slate-400">{title}</h3>
        <span className="text-xs text-slate-600">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="t" hide />
          <YAxis width={36} tick={{ fontSize: 9, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }}
            labelFormatter={() => ''}
            formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, title]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export function ControlTab() {
  const { status, statusHistory, send, config, loadConfig } = useMotorStore()
  const [motorOn, setMotorOn] = useState(false)
  const [selectedMode, setSelectedMode] = useState(2)
  const [currentMa, setCurrentMa] = useState(0)
  const [speedRpm, setSpeedRpm]     = useState(0)
  const [position, setPosition]     = useState(0)
  const [showPid, setShowPid]       = useState(false)

  useEffect(() => { if (!config) loadConfig() }, [])

  const canMaster = status?.canMaster ?? false

  const setMotorState = useCallback(async (state: number) => {
    if (state === 0) await send('STOP')
    else if (state === 1) await send('CALI')
    else await send(`SET state ${state}`)
  }, [send])

  const handleModeSelect = useCallback(async (modeId: number) => {
    setSelectedMode(modeId)
    if (motorOn) await setMotorState(modeId)
  }, [motorOn, setMotorState])

  const toggleMotor = useCallback(async () => {
    if (motorOn) { await setMotorState(0); setMotorOn(false) }
    else { await setMotorState(selectedMode); setMotorOn(true) }
  }, [motorOn, selectedMode, setMotorState])

  const handleCurrentChange  = useCallback(async (v: number) => { setCurrentMa(v); if (motorOn) await send(`SET cal_current ${Math.round(v / 161.2)}`) }, [motorOn, send])
  const handleSpeedChange    = useCallback(async (v: number) => { setSpeedRpm(v);  if (motorOn) await send(`SET cal_speed ${(v / 60 * 65536).toFixed(0)}`) }, [motorOn, send])
  const handlePositionChange = useCallback(async (v: number) => { setPosition(v);  if (motorOn) await send(`SET cal_pos ${v}`) }, [motorOn, send])

  // Chart data
  const COLORS = { position: '#a855f7', speed: '#0ea5e9', current: '#10b981', voltage: '#f59e0b', temp: '#ef4444', swerve: '#f97316' }
  const chartData = statusHistory.map((s, i) => ({
    t: i,
    position: s.position,
    speed:    +s.speed.toFixed(1),
    current:  +(s.current / 1000).toFixed(2),
    voltage:  +s.voltage.toFixed(2),
    temp:     +s.temperature.toFixed(1),
    swerve:   +s.swerveAngle.toFixed(1),
  }))

  if (!status) return null

  return (
    <div className="space-y-4">
      {/* CAN master warning */}
      {canMaster && (
        <div className="card border-orange-500/40 bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="font-semibold text-orange-400 text-sm">CAN/SystemCore is Master</div>
              <div className="text-xs text-orange-300/70 mt-0.5">USB motor control is disabled. Power cycle to use USB.</div>
            </div>
          </div>
        </div>
      )}

      {/* Status tiles */}
      <div className="grid grid-cols-4 gap-2">
        <Tile label="State"    value={status.stateString} />
        <Tile label="Voltage"  value={`${status.voltage.toFixed(1)}V`} />
        <Tile label="Temp"     value={`${status.temperature.toFixed(1)}°C`} />
        <Tile label="Current"  value={`${status.current.toFixed(0)}mA`} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Tile label="Position"     value={`${status.position}`} />
        <Tile label="Speed"        value={`${status.speed.toFixed(0)} RPM`} />
        <Tile label="Analog Input" value={`${status.swerveAngle.toFixed(1)}°`} />
        <Tile label="Errors"       value={status.errorFlag ? `0x${status.errorFlag.toString(16).toUpperCase()}` : 'None'} />
      </div>

      {/* Motor control + PID */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 flex-wrap flex-1">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => handleModeSelect(id)} disabled={canMaster}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border', {
                  'bg-sky-500/20 border-sky-500/50 text-sky-300':   selectedMode === id && !motorOn,
                  'bg-green-500/20 border-green-500/50 text-green-300': selectedMode === id && motorOn,
                  'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200': selectedMode !== id,
                  'opacity-50 cursor-not-allowed': canMaster,
                })}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          <button onClick={toggleMotor} disabled={canMaster}
            className={clsx('flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all border-2', {
              'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30': motorOn,
              'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20': !motorOn,
              'opacity-40 cursor-not-allowed': canMaster,
            })}>
            {motorOn ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {motorOn ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Target slider */}
        <div className="pt-2 border-t border-slate-800">
          {selectedMode === 2 && <Slider label="Target Current"  unit="mA"  value={currentMa} min={-5000}  max={5000}  onChange={handleCurrentChange} />}
          {selectedMode === 3 && <Slider label="Target Velocity" unit="RPM" value={speedRpm}   min={-10000} max={10000} onChange={handleSpeedChange} />}
          {(selectedMode === 4 || selectedMode === 5) && <Slider label="Target Position" unit="" value={position} min={-5000} max={5000} onChange={handlePositionChange} />}
        </div>

        {/* Context-sensitive PID */}
        <div className="border-t border-slate-800 pt-3">
          <button onClick={() => setShowPid(p => !p)}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-2 transition-colors">
            <span className={clsx('transition-transform', showPid ? 'rotate-90' : '')}>▶</span>
            {showPid ? 'Hide' : 'Show'} PID Settings
          </button>
          {showPid && (
            <PidPanel mode={selectedMode} config={config} send={send} />
          )}
        </div>
      </div>

      {/* Graphs — order: position, speed, current, bus voltage, temp, analog input */}
      {chartData.length >= 2 ? (
        <div className="grid grid-cols-2 gap-3">
          <MiniChart title="Position"           dataKey="position" color={COLORS.position} unit="cts"  data={chartData} />
          <MiniChart title="Speed"              dataKey="speed"    color={COLORS.speed}    unit="RPM"  data={chartData} />
          <MiniChart title="Current"            dataKey="current"  color={COLORS.current}  unit="A"    data={chartData} />
          <MiniChart title="Bus Voltage"        dataKey="voltage"  color={COLORS.voltage}  unit="V"    data={chartData} />
          <MiniChart title="Temperature"        dataKey="temp"     color={COLORS.temp}     unit="°C"   data={chartData} />
          <MiniChart title="Analog Input"       dataKey="swerve"   color={COLORS.swerve}   unit="°"    data={chartData} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {['Position','Speed','Current','Bus Voltage','Temperature','Analog Input'].map(t => (
            <div key={t} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-center h-28 text-xs text-slate-600">
              {t} — waiting for data…
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
