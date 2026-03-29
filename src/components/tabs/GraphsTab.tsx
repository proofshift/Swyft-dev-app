import { useMotorStore } from '../../store/motorStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CHART_COLOR = { speed: '#0ea5e9', current: '#10b981', voltage: '#f59e0b', temp: '#ef4444' }

function Chart({ title, dataKey, color, unit, data }: {
  title: string; dataKey: string; color: string; unit: string
  data: Array<Record<string, number>>
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="t" hide />
          <YAxis width={40} tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
            labelFormatter={() => ''}
            formatter={(v: number) => [`${v.toFixed(1)} ${unit}`, title]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraphsTab() {
  const { statusHistory } = useMotorStore()

  const COLORS = {
    speed: '#0ea5e9', current: '#10b981', voltage: '#f59e0b',
    temp: '#ef4444', position: '#a855f7', swerve: '#f97316'
  }

  const data = statusHistory.map((s, i) => ({
    t: i,
    speed: +s.speed.toFixed(1),
    current: +(s.current / 1000).toFixed(2),
    voltage: +s.voltage.toFixed(2),
    temp: +s.temperature.toFixed(1),
    position: s.position,
    swerve: +s.swerveAngle.toFixed(1),
  }))

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Waiting for data... status updates will appear here automatically.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Chart title="Speed" dataKey="speed" color={COLORS.speed} unit="RPM" data={data} />
      <Chart title="Current" dataKey="current" color={COLORS.current} unit="A" data={data} />
      <Chart title="Bus Voltage" dataKey="voltage" color={COLORS.voltage} unit="V" data={data} />
      <Chart title="Temperature" dataKey="temp" color={COLORS.temp} unit="°C" data={data} />
      <Chart title="Motor Position" dataKey="position" color={COLORS.position} unit="cts" data={data} />
      <Chart title="Analog Input (Swerve)" dataKey="swerve" color={COLORS.swerve} unit="°" data={data} />
    </div>
  )
}
