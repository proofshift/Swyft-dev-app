import { useRef, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Thermometer, Zap, RotateCcw, Activity, AlertCircle, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

/* ── Circular gauge SVG ───────────────────────────────────────────────── */
function CircleGauge({ value, max, label, unit, color = '#38bdf8', size = 'md' }: {
  value: number; max: number; label: string; unit: string; color?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const dims = { sm: { r: 28, s: 'w-20 h-20', fs: '11', fsu: '8' }, md: { r: 34, s: 'w-24 h-24', fs: '13', fsu: '9' }, lg: { r: 40, s: 'w-28 h-28', fs: '15', fsu: '10' } }
  const d = dims[size]
  const circ = 2 * Math.PI * d.r
  const pct = Math.max(0, Math.min(1, value / max))
  const dash = pct * circ
  const angle = pct * 360 - 90
  const deg2rad = (deg: number) => (deg * Math.PI) / 180
  const cx = 50, cy = 50
  const nx = cx + (d.r - 4) * Math.cos(deg2rad(angle))
  const ny = cy + (d.r - 4) * Math.sin(deg2rad(angle))
  const sw = size === 'lg' ? 9 : 7

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 100 100" className={d.s}>
        {/* Background track with subtle gradient */}
        <circle cx={cx} cy={cy} r={d.r} fill="none" stroke="#1a2540" strokeWidth={sw} />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={d.r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 5px ${color}55)` }} />
        {/* Needle dot */}
        <circle cx={nx} cy={ny} r="3.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        {/* Center glow */}
        <circle cx={cx} cy={cy} r={d.r - sw/2 - 2} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.08" />
        {/* Value */}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={d.fs} fontWeight="700" fill="white" fontFamily="monospace">
          {value.toFixed(value < 100 ? 1 : 0)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={d.fsu} fill="#64748b" fontFamily="sans-serif">
          {unit}
        </text>
      </svg>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  )
}

/* ── Angle arc gauge (0–360°) ─────────────────────────────────────────── */
function AngleGauge({ rawValue, maxRaw, label, color = '#a78bfa', size = 'lg' }: {
  rawValue: number; maxRaw: number; label: string; color?: string; size?: 'md' | 'lg'
}) {
  const r = size === 'lg' ? 40 : 34
  const sw = size === 'lg' ? 7 : 6
  const svgClass = size === 'lg' ? 'w-32 h-32' : 'w-24 h-24'
  const angleDeg = (rawValue / maxRaw) * 360
  const labelDeg = Math.min(359.9, angleDeg)
  const circ = 2 * Math.PI * r
  const dash = (angleDeg / 360) * circ
  const deg2rad = (d: number) => (d * Math.PI) / 180
  const nx = 50 + (r - 4) * Math.cos(deg2rad(angleDeg - 90))
  const ny = 50 + (r - 4) * Math.sin(deg2rad(angleDeg - 90))
  const cx = 50, cy = 50

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className={svgClass}>
        {/* Tick marks every 30° */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = deg2rad(i * 30 - 90)
          const ir = r + 3, or = r + (i % 3 === 0 ? 9 : 6)
          return <line key={i}
            x1={cx + ir * Math.cos(a)} y1={cy + ir * Math.sin(a)}
            x2={cx + or * Math.cos(a)} y2={cy + or * Math.sin(a)}
            stroke="#1e2d45" strokeWidth={i % 3 === 0 ? 1.5 : 1} />
        })}
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2540" strokeWidth={sw} />
        {/* Arc fill */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }} />
        {/* Needle */}
        <line x1={cx} y1={cy}
          x2={cx + (r - 9) * Math.cos(deg2rad(angleDeg - 90))}
          y2={cy + (r - 9) * Math.sin(deg2rad(angleDeg - 90))}
          stroke={color} strokeWidth="2" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
        {/* Needle tip dot */}
        <circle cx={nx} cy={ny} r="3" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        {/* Hub */}
        <circle cx={cx} cy={cy} r="4" fill="#0c1220" stroke={color} strokeWidth="1.5" />
        {/* Degree value */}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize="13" fontWeight="700" fill="white" fontFamily="monospace">
          {labelDeg.toFixed(1)}°
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="monospace">
          {rawValue}
        </text>
      </svg>
      <span className="text-sm font-semibold text-slate-300">{label}</span>
    </div>
  )
}

/* ── MT6701 relative / multi-turn display ─────────────────────────────── */
function RelativeEncoderDisplay({ countRaw, turns, angle }: {
  countRaw: number; turns: number; angle: number
}) {
  const totalDeg   = countRaw === 0 ? 0 : turns * 360 + angle * Math.sign(countRaw || 1)
  const fractAngle = ((angle % 360) + 360) % 360
  const fracPct    = (fractAngle / 360) * 100
  const isNeg      = countRaw < 0
  const dir        = countRaw > 0 ? 'CW ▶' : countRaw < 0 ? '◀ CCW' : '—'
  const arcColor   = isNeg ? '#f43f5e' : '#818cf8'
  const r = 32

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Turns counter */}
      <div className={clsx(
        'rounded-xl p-4 flex flex-col items-center gap-2 border transition-all',
        isNeg ? 'bg-rose-500/8 border-rose-500/20' : 'bg-indigo-500/8 border-indigo-500/20'
      )}>
        <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Turns</span>
        <span className={clsx('text-4xl font-bold font-mono leading-none', isNeg ? 'text-rose-400' : 'text-indigo-300')}>
          {turns}
        </span>
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
          isNeg ? 'bg-rose-500/20 text-rose-400' : countRaw > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-500'
        )}>{dir}</span>
      </div>

      {/* Fractional arc within current turn */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-1">
        <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Angle In Turn</span>
        <svg viewBox="0 0 80 80" className="w-20 h-20">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1a2540" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={arcColor} strokeWidth="6"
            strokeDasharray={`${(fracPct / 100) * (2 * Math.PI * r)} ${2 * Math.PI * r}`}
            strokeLinecap="round" transform="rotate(-90 40 40)"
            style={{ filter: `drop-shadow(0 0 4px ${arcColor}66)` }} />
          <line x1="40" y1="40"
            x2={40 + 24 * Math.cos((fractAngle - 90) * Math.PI / 180)}
            y2={40 + 24 * Math.sin((fractAngle - 90) * Math.PI / 180)}
            stroke={arcColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="40" r="3" fill={arcColor} />
          <text x="40" y="43" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="monospace">
            {fractAngle.toFixed(1)}°
          </text>
        </svg>
      </div>

      {/* Total count + total degrees */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">Total Travel</span>
        <div className={clsx('text-xl font-bold font-mono', isNeg ? 'text-rose-400' : 'text-indigo-300')}>
          {totalDeg.toFixed(1)}°
        </div>
        <div className="text-sm text-slate-400 font-mono">{countRaw > 0 ? '+' : ''}{countRaw} <span className="text-slate-600">cts</span></div>
        <div className="mt-auto text-[10px] text-slate-600 leading-tight">ABZ count<br/>since power-on</div>
      </div>
    </div>
  )
}

/* ── Horizontal bar ───────────────────────────────────────────────────── */
function Bar({ value, min, max, color, label, unit, fmt = (v: number) => v.toFixed(0) }: {
  value: number; min: number; max: number; color: string; label: string; unit: string
  fmt?: (v: number) => string
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const zeroPct = min < 0 ? ((-min) / (max - min)) * 100 : 0
  const isPos = value >= 0
  const barLeft = isPos ? zeroPct : Math.max(0, pct)
  const barWidth = isPos ? pct - zeroPct : zeroPct - pct

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-500 w-4 text-right text-xs flex-shrink-0 font-medium">{label}</span>
      <div className="flex-1 bg-slate-800/80 rounded-full h-2.5 relative overflow-hidden">
        {min < 0 && (
          <div className="absolute top-0 bottom-0 w-px bg-slate-600 z-10" style={{ left: `${zeroPct}%` }} />
        )}
        <div className="absolute top-0 h-full rounded-full transition-all duration-100"
          style={{ left: `${barLeft}%`, width: `${Math.max(1, barWidth)}%`, backgroundColor: color,
            boxShadow: `0 0 8px ${color}44` }} />
      </div>
      <span className="font-mono text-slate-200 text-xs text-right flex-shrink-0 w-20">
        {fmt(value)} <span className="text-slate-600">{unit}</span>
      </span>
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

    const now = Date.now()
    const dt  = Math.min((now - lastTimeRef.current) / 1000, 0.1)
    lastTimeRef.current = now
    yawRef.current += (gz / 1000) * dt
    const yaw = (yawRef.current * Math.PI) / 180

    const mag   = Math.sqrt(ax * ax + ay * ay + az * az) || 1
    const nx = ax / mag, ny = ay / mag, nz = az / mag
    const pitch = Math.atan2(-nx, Math.sqrt(ny * ny + nz * nz))
    const roll  = Math.atan2(ny, nz)

    const W = canvas.width, H = canvas.height
    const bw = 56, bh = 40
    const corners: [number, number, number][] = [
      [-bw/2, -bh/2, 0], [bw/2, -bh/2, 0],
      [bw/2,  bh/2,  0], [-bw/2, bh/2, 0],
    ]

    const rotate = ([x, y, z]: [number,number,number]): [number,number,number] => {
      const x1 = x * Math.cos(yaw) - y * Math.sin(yaw)
      const y1 = x * Math.sin(yaw) + y * Math.cos(yaw)
      const z1 = z
      const x2 =  x1 * Math.cos(pitch) + z1 * Math.sin(pitch)
      const y2 =  y1
      const z2 = -x1 * Math.sin(pitch) + z1 * Math.cos(pitch)
      const x3 = x2
      const y3 = y2 * Math.cos(roll) - z2 * Math.sin(roll)
      const z3 = y2 * Math.sin(roll) + z2 * Math.cos(roll)
      return [x3, y3, z3]
    }

    const project = ([x, y, z]: [number,number,number]): [number,number] => {
      const fov = 320
      const scale = fov / (fov + z + 90)
      return [x * scale, y * scale]
    }

    const pts = corners.map(rotate).map(project)
    const rotatedNormal = rotate([0, 0, 1])
    const facingViewer  = rotatedNormal[2] > 0

    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.translate(W / 2, H / 2)

    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px+4, py+4) : ctx.lineTo(px+4, py+4))
    ctx.closePath()
    ctx.fill()

    const g = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2)
    if (facingViewer) {
      g.addColorStop(0, '#0f4c3a')
      g.addColorStop(1, '#0a3d2e')
    } else {
      g.addColorStop(0, '#0a2e22')
      g.addColorStop(1, '#071e16')
    }
    ctx.fillStyle = g
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2
    ctx.beginPath()
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // SWYFT label on board
    ctx.fillStyle = '#22c55e44'
    ctx.font = 'bold 7px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SWYFT', 0, 0)

    // Direction indicator dot
    const topMid: [number,number] = [(pts[0][0]+pts[1][0])/2, (pts[0][1]+pts[1][1])/2]
    ctx.fillStyle = '#22c55e'
    ctx.shadowColor = '#22c55e'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(topMid[0], topMid[1], 4, 0, Math.PI*2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.restore()

    const yawDeg = ((yawRef.current % 360) + 360) % 360
    ctx.fillStyle = '#334155'
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`P:${(pitch*57.3).toFixed(0)}° R:${(roll*57.3).toFixed(0)}° Y:${yawDeg.toFixed(0)}°`, 4, H-3)
  }, [ax, ay, az, gz])

  return (
    <canvas ref={canvasRef} width={160} height={130}
      className="rounded-xl bg-[#060d1a] border border-slate-800/60" />
  )
}

/* ── Section card wrapper ─────────────────────────────────────────────── */
function Card({ title, icon: Icon, color, children, className }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={clsx('bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors', className)}>
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

/* ── Main tab ─────────────────────────────────────────────────────────── */
export function DevSensorTab() {
  const { devSensorStatus: d, firmwareVersion, firmwareBuildDate } = useMotorStore()

  if (!d) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
          <Activity className="w-5 h-5 text-slate-600 animate-pulse" />
        </div>
        <span className="text-sm">Waiting for sensor data…</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-5xl">

      {/* Power */}
      <Card title="Supply Voltage" icon={Zap} color="text-amber-400">
        <div className="flex items-center justify-around">
          <CircleGauge value={d.vsen} max={5} label="Supply" unit="V" color="#fbbf24" size="lg" />
          <div className="space-y-3 flex-1 max-w-xs ml-6">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">Quick Status</div>
            <div className={clsx('flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium',
              d.vsen > 3 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'
            )}>
              <div className={clsx('w-2 h-2 rounded-full', d.vsen > 3 ? 'bg-emerald-400' : 'bg-red-400 animate-pulse')} />
              {d.vsen > 3 ? 'Voltage nominal' : 'Low voltage'}
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Raw ADC</span>
              <span className="font-mono text-slate-300">{d.vsen.toFixed(3)} V</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Board Temp</span>
              <span className="font-mono text-slate-300">{d.ntc.toFixed(1)} °C</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>IMU Temp</span>
              <span className="font-mono text-slate-300">{d.imuTemp.toFixed(1)} °C</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Temperature */}
      <Card title="Temperature" icon={Thermometer} color="text-orange-400">
        <div className="flex items-center justify-around">
          <CircleGauge value={d.ntc} max={80} label="Board NTC" unit="°C" color="#fb923c" size="lg" />
          <CircleGauge value={d.imuTemp} max={80} label="IMU Internal" unit="°C" color="#f97316" size="lg" />
          <div className="flex flex-col gap-2 ml-4">
            <div className={clsx('px-2 py-1 rounded-lg text-xs font-medium border',
              d.ntc < 50 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
              : d.ntc < 70 ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
              : 'bg-red-500/10 border-red-500/25 text-red-400'
            )}>
              {d.ntc < 50 ? 'Cool' : d.ntc < 70 ? 'Warm' : 'Hot'}
            </div>
          </div>
        </div>
      </Card>

      {/* Encoders — full width */}
      <Card title="Magnetic Encoders" icon={RotateCcw} color="text-purple-400" className="xl:col-span-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Absolute gauges */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Absolute Position (0–360°)</div>
            <div className="flex justify-around">
              <AngleGauge rawValue={d.as5600} maxRaw={4096}  label="AS5600" color="#a78bfa" />
              <AngleGauge rawValue={d.mt6701} maxRaw={16384} label="MT6701" color="#818cf8" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 rounded-lg p-2.5">
                <div className="text-slate-500 mb-1">AS5600 raw</div>
                <div className="font-mono text-violet-300 font-semibold">{d.as5600} / 4095</div>
                <div className="text-slate-600 text-[10px]">12-bit · 0.088°/step</div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2.5">
                <div className="text-slate-500 mb-1">MT6701 raw</div>
                <div className="font-mono text-indigo-300 font-semibold">{d.mt6701} / 16383</div>
                <div className="text-slate-600 text-[10px]">14-bit · 0.022°/step</div>
              </div>
            </div>
          </div>

          {/* Relative multi-turn */}
          <div>
            <div className="flex items-center gap-1.5 mb-4">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">MT6701 Relative (Multi-Turn)</div>
            </div>
            <RelativeEncoderDisplay
              countRaw={d.mt6701CountRaw}
              turns={d.mt6701Turns}
              angle={d.mt6701 / 16384 * 360}
            />
          </div>
        </div>
      </Card>

      {/* IMU — full width */}
      <Card title="IMU — LSM6DSO" icon={Activity} color="text-sky-400" className="xl:col-span-2">
        <div className="flex gap-6 items-start">
          {/* 3D orientation */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <OrientationCube ax={d.ax} ay={d.ay} az={d.az} gz={d.gz} />
            <span className="text-xs text-slate-600 font-medium">3D Orientation</span>
          </div>

          {/* Bars */}
          <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Accelerometer</div>
              <div className="space-y-2.5">
                <Bar value={d.ax} min={-2000} max={2000} color="#38bdf8" label="X" unit="mg" />
                <Bar value={d.ay} min={-2000} max={2000} color="#818cf8" label="Y" unit="mg" />
                <Bar value={d.az} min={-2000} max={2000} color="#34d399" label="Z" unit="mg" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Gyroscope</div>
              <div className="space-y-2.5">
                <Bar value={d.gx/1000} min={-500} max={500} color="#f472b6" label="X" unit="dps" fmt={v => v.toFixed(1)} />
                <Bar value={d.gy/1000} min={-500} max={500} color="#fb923c" label="Y" unit="dps" fmt={v => v.toFixed(1)} />
                <Bar value={d.gz/1000} min={-500} max={500} color="#facc15" label="Z" unit="dps" fmt={v => v.toFixed(1)} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Magnetic switch + Status */}
      <Card title="Magnetic Limit Switch" icon={() => <span className="text-base">🧲</span>} color="text-pink-400">
        <div className={clsx(
          'flex items-center gap-4 p-4 rounded-xl border transition-all',
          d.magnet
            ? 'bg-pink-500/15 border-pink-500/30'
            : 'bg-slate-800/40 border-slate-700'
        )}>
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
            d.magnet ? 'bg-pink-500/20' : 'bg-slate-800'
          )}>
            🧲
          </div>
          <div>
            <div className={clsx('font-bold text-lg', d.magnet ? 'text-pink-300' : 'text-slate-400')}>
              {d.magnet ? 'DETECTED' : 'Clear'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {d.magnet ? 'Magnet in proximity' : 'No magnet detected'}
            </div>
          </div>
          <div className={clsx('ml-auto w-3 h-3 rounded-full flex-shrink-0',
            d.magnet ? 'bg-pink-400 shadow-[0_0_8px_#f472b6] animate-pulse' : 'bg-slate-700'
          )} />
        </div>
      </Card>

      {/* Status / Diagnostics */}
      <Card title="System Status" icon={AlertCircle} color={d.errFlags ? 'text-red-400' : 'text-emerald-400'}>
        <div className="space-y-3">
          <div className={clsx(
            'flex items-center gap-3 p-3 rounded-xl border',
            d.errFlags ? 'bg-red-500/10 border-red-500/25' : 'bg-emerald-500/10 border-emerald-500/25'
          )}>
            <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0',
              d.errFlags ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
            )} />
            <div className="flex-1 min-w-0">
              <div className={clsx('text-sm font-semibold', d.errFlags ? 'text-red-400' : 'text-emerald-400')}>
                {d.errFlags ? `Error — 0x${d.errFlags.toString(16).toUpperCase().padStart(2,'0')}` : 'All systems nominal'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'AS5600', ok: !(d.errFlags & 0x01), flag: '0x01' },
              { label: 'MT6701', ok: !(d.errFlags & 0x02), flag: '0x02' },
              { label: 'LSM6DSO', ok: !(d.errFlags & 0x04), flag: '0x04' },
            ].map(s => (
              <div key={s.label} className={clsx('p-2 rounded-lg text-center border',
                s.ok ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' : 'bg-red-500/8 border-red-500/20 text-red-400'
              )}>
                <div className="font-semibold">{s.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{s.ok ? 'OK' : `ERR ${s.flag}`}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Firmware</span>
              <span className="font-mono text-slate-300">{firmwareVersion ?? '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Build date</span>
              <span className="font-mono text-slate-400 text-[11px]">{firmwareBuildDate ?? '—'}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
