import { useRef, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Thermometer, Zap, RotateCcw, Activity, Magnet, AlertCircle } from 'lucide-react'

/* ── Circular gauge SVG ───────────────────────────────────────────────── */
function CircleGauge({ value, max, label, unit, color = '#38bdf8' }: {
  value: number; max: number; label: string; unit: string; color?: string
}) {
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  const dash = pct * circ
  const angle = pct * 360 - 90   // degrees for needle start at top
  const deg2rad = (d: number) => (d * Math.PI) / 180
  const nx = 50 + 28 * Math.cos(deg2rad(angle))
  const ny = 50 + 28 * Math.sin(deg2rad(angle))

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        {/* Fill */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
        {/* Needle dot */}
        <circle cx={nx} cy={ny} r="4" fill={color} />
        {/* Value */}
        <text x="50" y="47" textAnchor="middle" fontSize="14" fontWeight="700" fill="white" fontFamily="monospace">
          {value.toFixed(value < 100 ? 1 : 0)}
        </text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
          {unit}
        </text>
      </svg>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

/* ── Angle arc gauge (0–360°) ─────────────────────────────────────────── */
function AngleGauge({ rawValue, maxRaw, label, color = '#a78bfa' }: {
  rawValue: number; maxRaw: number; label: string; color?: string
}) {
  const angleDeg = (rawValue / maxRaw) * 360
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = angleDeg / 360
  const dash = pct * circ
  const deg2rad = (d: number) => (d * Math.PI) / 180
  const nx = 50 + 28 * Math.cos(deg2rad(angleDeg - 90))
  const ny = 50 + 28 * Math.sin(deg2rad(angleDeg - 90))

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
        <line x1="50" y1="50" x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3" fill={color} />
        <text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily="monospace">
          {angleDeg.toFixed(1)}°
        </text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
          raw {rawValue}
        </text>
      </svg>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

/* ── Horizontal bar ───────────────────────────────────────────────────── */
function Bar({ value, min, max, color, label, unit, valueWidth = 'w-16' }: {
  value: number; min: number; max: number; color: string; label: string; unit: string; valueWidth?: string
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-4 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 relative overflow-hidden">
        {/* Zero marker for bipolar bars */}
        {min < 0 && (
          <div className="absolute top-0 bottom-0 w-px bg-slate-600"
            style={{ left: `${(0 - min) / (max - min) * 100}%` }} />
        )}
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-100"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className={`font-mono text-slate-300 text-right flex-shrink-0 ${valueWidth}`}>{value.toFixed(0)} {unit}</span>
    </div>
  )
}

/* ── IMU 3D orientation canvas ────────────────────────────────────────── */
function OrientationCube({ ax, ay, az }: { ax: number; ay: number; az: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Normalise gravity vector
    const mag = Math.sqrt(ax * ax + ay * ay + az * az) || 1
    const nx = ax / mag, ny = ay / mag, nz = az / mag

    // Simple tilt-from-gravity: pitch and roll
    const pitch = Math.atan2(-nx, Math.sqrt(ny * ny + nz * nz))
    const roll  = Math.atan2(ny, nz)

    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Draw a simple rotated rectangle representing the board
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(roll)

    const scaleY = Math.cos(pitch)
    const w = 60, h = 40

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(-w / 2 + 4, -h * scaleY / 2 + 4, w, h * Math.max(0.1, Math.abs(scaleY)))

    // PCB body
    ctx.fillStyle = '#0f4c3a'
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 1.5
    ctx.fillRect(-w / 2, -h * scaleY / 2, w, h * scaleY)
    ctx.strokeRect(-w / 2, -h * scaleY / 2, w, h * scaleY)

    // "UP" arrow
    ctx.fillStyle = '#22c55e'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('▲', 0, -h * scaleY / 2 - 4)

    ctx.restore()

    // Axis labels
    ctx.fillStyle = '#64748b'
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`P:${(pitch * 57.3).toFixed(1)}°  R:${(roll * 57.3).toFixed(1)}°`, 4, H - 4)
  }, [ax, ay, az])

  return (
    <canvas
      ref={canvasRef}
      width={140} height={120}
      className="rounded-lg bg-slate-900"
    />
  )
}

/* ── Main tab ─────────────────────────────────────────────────────────── */
export function DevSensorTab() {
  const { devSensorStatus: d, firmwareVersion, firmwareBuildDate } = useMotorStore()

  if (!d) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Waiting for sensor data…
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Row 1: Power + Temperature */}
      <div className="grid grid-cols-2 gap-3">
        {/* Voltage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-white">Power</span>
          </div>
          <div className="flex items-center justify-center">
            <CircleGauge value={d.vsen} max={26} label="Supply Voltage" unit="V" color="#facc15" />
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-white">Temperature</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <CircleGauge value={d.ntc} max={80} label="Board NTC" unit="°C" color="#fb923c" />
            <CircleGauge value={d.imuTemp} max={80} label="IMU Internal" unit="°C" color="#f97316" />
          </div>
        </div>
      </div>

      {/* Row 2: Encoders */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">Magnetic Encoders</span>
        </div>
        <div className="flex justify-around">
          <AngleGauge rawValue={d.as5600} maxRaw={4096}  label="AS5600 (I²C)" color="#a78bfa" />
          <AngleGauge rawValue={d.mt6701} maxRaw={16384} label="MT6701 (SPI)" color="#818cf8" />
        </div>
      </div>

      {/* Row 3: IMU */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">IMU — LSM6DSO</span>
        </div>
        <div className="flex gap-4 items-start">
          {/* Orientation canvas */}
          <OrientationCube ax={d.ax} ay={d.ay} az={d.az} />

          {/* Bars */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Accelerometer</div>
            <Bar value={d.ax} min={-2000} max={2000} color="#38bdf8" label="X" unit="mg" />
            <Bar value={d.ay} min={-2000} max={2000} color="#818cf8" label="Y" unit="mg" />
            <Bar value={d.az} min={-2000} max={2000} color="#34d399" label="Z" unit="mg" />

            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-3 mb-1">Gyroscope</div>
            <Bar value={d.gx} min={-500000} max={500000} color="#f472b6" label="X" unit="mdps" valueWidth="w-28" />
            <Bar value={d.gy} min={-500000} max={500000} color="#fb923c" label="Y" unit="mdps" valueWidth="w-28" />
            <Bar value={d.gz} min={-500000} max={500000} color="#facc15" label="Z" unit="mdps" valueWidth="w-28" />
          </div>
        </div>
      </div>

      {/* Row 4: Magnet switch + error flags */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Magnet className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-semibold text-white">Magnetic Limit Switch</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mt-2 ${
            d.magnet ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${d.magnet ? 'bg-pink-400 shadow-[0_0_6px_#f472b6]' : 'bg-slate-600'}`} />
            {d.magnet ? 'DETECTED' : 'Clear'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Status</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Error flags</span>
              <span className={`font-mono ${d.errFlags ? 'text-red-400' : 'text-green-400'}`}>
                {d.errFlags ? `0x${d.errFlags.toString(16).toUpperCase().padStart(2,'0')}` : 'OK'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Firmware</span>
              <span className="font-mono text-white text-xs">{firmwareVersion ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Build</span>
              <span className="font-mono text-slate-400 text-xs">{firmwareBuildDate ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
