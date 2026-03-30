import { useRef, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Thermometer, Zap, RotateCcw, Activity, Magnet, AlertCircle, RefreshCw } from 'lucide-react'

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
  /* 359.98° rounds to "360.0" with toFixed(1); keep label in [0, 359.9] for encoders */
  const labelDeg = Math.min(359.9, angleDeg)
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
          {labelDeg.toFixed(1)}°
        </text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">
          raw {rawValue}
        </text>
      </svg>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

/* ── MT6701 relative / multi-turn display ─────────────────────────────── */
function RelativeEncoderDisplay({ countRaw, turns, angle }: {
  countRaw: number; turns: number; angle: number
}) {
  const totalDeg   = countRaw === 0 ? 0 : turns * 360 + angle * Math.sign(countRaw || 1)
  const fractAngle = ((angle % 360) + 360) % 360

  /* Fractional fill within current revolution (0–1) */
  const fracPct = (fractAngle / 360) * 100

  /* Direction indicator */
  const isNeg = countRaw < 0
  const dir = countRaw > 0 ? 'CW ▶' : countRaw < 0 ? '◀ CCW' : '—'

  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      {/* Turns counter */}
      <div className="bg-slate-800/60 rounded-lg p-2.5 flex flex-col items-center gap-1">
        <span className="text-slate-500 uppercase tracking-wide text-[10px]">Turns</span>
        <span className={`text-2xl font-bold font-mono leading-none ${isNeg ? 'text-rose-400' : 'text-indigo-300'}`}>
          {turns}
        </span>
        <span className={`text-[10px] font-semibold ${isNeg ? 'text-rose-500' : 'text-indigo-500'}`}>{dir}</span>
      </div>

      {/* Fractional arc within current turn */}
      <div className="bg-slate-800/60 rounded-lg p-2.5 flex flex-col items-center gap-1">
        <span className="text-slate-500 uppercase tracking-wide text-[10px]">Angle in turn</span>
        <svg viewBox="0 0 80 80" className="w-14 h-14">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="30"
            fill="none"
            stroke={isNeg ? '#f43f5e' : '#818cf8'}
            strokeWidth="6"
            strokeDasharray={`${(fracPct / 100) * (2 * Math.PI * 30)} ${2 * Math.PI * 30}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ filter: `drop-shadow(0 0 3px ${isNeg ? '#f43f5e66' : '#818cf866'})` }}
          />
          {/* Needle */}
          <line
            x1="40" y1="40"
            x2={40 + 22 * Math.cos((fractAngle - 90) * Math.PI / 180)}
            y2={40 + 22 * Math.sin((fractAngle - 90) * Math.PI / 180)}
            stroke={isNeg ? '#f43f5e' : '#818cf8'} strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="40" cy="40" r="2.5" fill={isNeg ? '#f43f5e' : '#818cf8'} />
          <text x="40" y="43" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="monospace">
            {fractAngle.toFixed(1)}°
          </text>
        </svg>
      </div>

      {/* Total count + total degrees */}
      <div className="bg-slate-800/60 rounded-lg p-2.5 flex flex-col justify-between gap-1">
        <span className="text-slate-500 uppercase tracking-wide text-[10px]">Total</span>
        <div>
          <div className={`text-base font-bold font-mono leading-tight ${isNeg ? 'text-rose-400' : 'text-indigo-300'}`}>
            {countRaw} cts
          </div>
          <div className="text-slate-400 font-mono text-[11px] mt-0.5">
            {totalDeg.toFixed(1)}°
          </div>
        </div>
        <div className="text-slate-500 text-[9px] leading-tight">raw ABZ count<br/>since power-on</div>
      </div>
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
function OrientationCube({ ax, ay, az, gz }: { ax: number; ay: number; az: number; gz: number }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const yawRef      = useRef(0)
  const lastTimeRef = useRef(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Integrate gyroscope Z (mdps → dps → degrees) for yaw
    const now = Date.now()
    const dt  = Math.min((now - lastTimeRef.current) / 1000, 0.1)  // cap at 100ms
    lastTimeRef.current = now
    yawRef.current += (gz / 1000) * dt
    const yaw = (yawRef.current * Math.PI) / 180

    // Pitch & roll from accelerometer (absolute tilt reference)
    const mag   = Math.sqrt(ax * ax + ay * ay + az * az) || 1
    const nx = ax / mag, ny = ay / mag, nz = az / mag
    const pitch = Math.atan2(-nx, Math.sqrt(ny * ny + nz * nz))
    const roll  = Math.atan2(ny, nz)

    // Board corners in local frame (flat, z=0)
    const W = canvas.width, H = canvas.height
    const bw = 52, bh = 36
    const corners: [number, number, number][] = [
      [-bw/2, -bh/2, 0], [bw/2, -bh/2, 0],
      [bw/2,  bh/2,  0], [-bw/2, bh/2, 0],
    ]

    // Apply Rz(yaw) → Ry(pitch) → Rx(roll)
    const rotate = ([x, y, z]: [number,number,number]): [number,number,number] => {
      // Rz yaw
      const x1 = x * Math.cos(yaw) - y * Math.sin(yaw)
      const y1 = x * Math.sin(yaw) + y * Math.cos(yaw)
      const z1 = z
      // Ry pitch
      const x2 =  x1 * Math.cos(pitch) + z1 * Math.sin(pitch)
      const y2 =  y1
      const z2 = -x1 * Math.sin(pitch) + z1 * Math.cos(pitch)
      // Rx roll
      const x3 = x2
      const y3 = y2 * Math.cos(roll) - z2 * Math.sin(roll)
      const z3 = y2 * Math.sin(roll) + z2 * Math.cos(roll)
      return [x3, y3, z3]
    }

    // Simple perspective projection
    const project = ([x, y, z]: [number,number,number]): [number,number] => {
      const fov = 300
      const scale = fov / (fov + z + 80)
      return [x * scale, y * scale]
    }

    const pts = corners.map(rotate).map(project)

    // Determine front face (normal facing viewer — positive Z after rotation)
    const rotatedNormal = rotate([0, 0, 1])
    const facingViewer  = rotatedNormal[2] > 0

    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.translate(W / 2, H / 2)

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px+3, py+3) : ctx.lineTo(px+3, py+3))
    ctx.closePath()
    ctx.fill()

    // Board face
    ctx.fillStyle   = facingViewer ? '#0f4c3a' : '#0a2e22'
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Direction dot (top edge midpoint)
    const topMid: [number,number] = [(pts[0][0]+pts[1][0])/2, (pts[0][1]+pts[1][1])/2]
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(topMid[0], topMid[1], 3.5, 0, Math.PI*2)
    ctx.fill()

    ctx.restore()

    // Angle readout
    const yawDeg   = ((yawRef.current % 360) + 360) % 360
    ctx.fillStyle  = '#475569'
    ctx.font       = '9px monospace'
    ctx.textAlign  = 'left'
    ctx.fillText(`P:${(pitch*57.3).toFixed(0)}° R:${(roll*57.3).toFixed(0)}° Y:${yawDeg.toFixed(0)}°`, 4, H-4)
  }, [ax, ay, az, gz])

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

        {/* AS5600 + MT6701 absolute */}
        <div className="flex justify-around mb-4">
          <AngleGauge rawValue={d.as5600} maxRaw={4096}  label="AS5600 — Absolute" color="#a78bfa" />
          <AngleGauge rawValue={d.mt6701} maxRaw={16384} label="MT6701 — Absolute" color="#818cf8" />
        </div>

        {/* MT6701 relative / multi-turn row */}
        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">MT6701 — Relative (multi-turn)</span>
          </div>
          <RelativeEncoderDisplay countRaw={d.mt6701CountRaw} turns={d.mt6701Turns} angle={d.mt6701 / 16384 * 360} />
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
          <OrientationCube ax={d.ax} ay={d.ay} az={d.az} gz={d.gz} />

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
