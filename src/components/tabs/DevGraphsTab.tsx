import { useEffect, useRef, useState } from 'react'
import { useMotorStore, type DevSensorStatus } from '../../store/motorStore'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'
import { TrendingUp } from 'lucide-react'

type HistoryPoint = DevSensorStatus & { t: number; tLabel: string }

const MAX_POINTS = 120   // ~12 s at 10 Hz display rate
const SAMPLE_MS  = 100   // collect one point every 100 ms

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <TrendingUp className="w-4 h-4 text-sky-400 flex-shrink-0" />
      <span className="text-sm font-semibold text-white">{title}</span>
    </div>
  )
}

function Chart({
  data, lines, yDomain, unit,
}: {
  data: HistoryPoint[]
  lines: { key: string; color: string; label: string }[]
  yDomain?: [number | 'auto', number | 'auto']
  unit: string
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="tLabel" tick={{ fontSize: 9, fill: '#475569' }} interval="preserveStartEnd" />
        <YAxis
          domain={yDomain ?? ['auto', 'auto']}
          tick={{ fontSize: 9, fill: '#475569' }}
          tickFormatter={v => `${v}${unit}`}
          width={46}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#64748b' }}
          formatter={(v: number) => [`${v.toFixed(2)}${unit}`]}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            dot={false}
            isAnimationActive={false}
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function DevGraphsTab() {
  const { devSensorStatus: d } = useMotorStore()
  const historyRef  = useRef<HistoryPoint[]>([])
  const lastSampleRef = useRef(0)
  const startTimeRef  = useRef(Date.now())
  const [history, setHistory] = useState<HistoryPoint[]>([])

  useEffect(() => {
    if (!d) return
    const now = Date.now()
    if (now - lastSampleRef.current < SAMPLE_MS) return
    lastSampleRef.current = now

    const elapsed = (now - startTimeRef.current) / 1000
    const tLabel = elapsed < 60
      ? `${elapsed.toFixed(1)}s`
      : `${Math.floor(elapsed / 60)}m${(elapsed % 60).toFixed(0)}s`

    const point: HistoryPoint = { ...d, t: now, tLabel }
    historyRef.current = [...historyRef.current.slice(-(MAX_POINTS - 1)), point]
    setHistory([...historyRef.current])
  }, [d])

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Collecting data…
      </div>
    )
  }

  // Derive degree values for encoders
  const histWithAngles = history.map(p => ({
    ...p,
    as5600_deg:      parseFloat(((p.as5600 / 4096) * 360).toFixed(1)),
    mt6701_abs_deg:  parseFloat(((p.mt6701 / 16384) * 360).toFixed(1)),
    // Total accumulated degrees: full turns × 360 + absolute angle within current turn
    mt6701_rel_deg:  parseFloat((p.mt6701Turns * 360 + (p.mt6701 / 16384) * 360 * Math.sign(p.mt6701CountRaw || 1)).toFixed(1)),
    mt6701_turns_f:  p.mt6701Turns,
    gx_dps: parseFloat((p.gx / 1000).toFixed(1)),
    gy_dps: parseFloat((p.gy / 1000).toFixed(1)),
    gz_dps: parseFloat((p.gz / 1000).toFixed(1)),
  }))

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Voltage */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="Supply Voltage" />
        <Chart
          data={histWithAngles}
          lines={[{ key: 'vsen', color: '#facc15', label: 'VSEN' }]}
          yDomain={[0, 30]}
          unit="V"
        />
      </div>

      {/* Temperature */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="Temperature" />
        <Chart
          data={histWithAngles}
          lines={[
            { key: 'ntc',     color: '#fb923c', label: 'Board NTC' },
            { key: 'imuTemp', color: '#f97316', label: 'IMU' },
          ]}
          yDomain={[0, 80]}
          unit="°C"
        />
      </div>

      {/* Encoder angles — absolute 0–360° */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="Encoder — Absolute Angle (0–360°)" />
        <Chart
          data={histWithAngles}
          lines={[
            { key: 'as5600_deg',     color: '#a78bfa', label: 'AS5600' },
            { key: 'mt6701_abs_deg', color: '#818cf8', label: 'MT6701 abs' },
          ]}
          yDomain={[0, 360]}
          unit="°"
        />
      </div>

      {/* MT6701 relative / multi-turn */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="MT6701 — Relative Position (multi-turn)" />
        <Chart
          data={histWithAngles}
          lines={[
            { key: 'mt6701_rel_deg', color: '#6366f1', label: 'Rel deg' },
          ]}
          unit="°"
        />
      </div>

      {/* MT6701 turns counter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="MT6701 — Completed Turns" />
        <Chart
          data={histWithAngles}
          lines={[
            { key: 'mt6701_turns_f', color: '#38bdf8', label: 'Turns' },
          ]}
          unit=" rev"
        />
      </div>

      {/* Accelerometer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="Accelerometer" />
        <Chart
          data={histWithAngles}
          lines={[
            { key: 'ax', color: '#38bdf8', label: 'X' },
            { key: 'ay', color: '#818cf8', label: 'Y' },
            { key: 'az', color: '#34d399', label: 'Z' },
          ]}
          yDomain={[-2000, 2000]}
          unit="mg"
        />
      </div>

      {/* Gyroscope */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <SectionTitle title="Gyroscope" />
        <Chart
          data={histWithAngles}
          lines={[
            { key: 'gx_dps', color: '#f472b6', label: 'X' },
            { key: 'gy_dps', color: '#fb923c', label: 'Y' },
            { key: 'gz_dps', color: '#facc15', label: 'Z' },
          ]}
          unit="dps"
        />
      </div>

    </div>
  )
}
