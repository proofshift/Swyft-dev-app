import { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react'
import { useMotorStore, type DevSensorStatus } from '../../store/motorStore'
import { TrendingUp, Trash2, Pause, Play } from 'lucide-react'
import clsx from 'clsx'

type HistoryPoint = DevSensorStatus & { t: number; tLabel: string }
type LineSpec = { key: string; color: string; label: string }

/* ── Canvas chart — zero SVG, zero Recharts ──────────────────────────────── */
const CanvasChart = memo(function CanvasChart({ data, lines, yDomain, unit, height = 150 }: {
  data: Record<string, unknown>[]
  lines: LineSpec[]
  yDomain?: [number | 'auto', number | 'auto']
  unit: string
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const hoverRef     = useRef<HTMLDivElement>(null)
  const tooltipRef   = useRef<HTMLDivElement>(null)
  const dataRef      = useRef(data)
  dataRef.current    = data

  const PAD = { top: 6, right: 10, bottom: 20, left: 48 }

  /* ── Draw the chart (only called when data / size changes) ─────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || data.length < 2) return

    const dpr = window.devicePixelRatio || 1
    const W   = container.clientWidth
    const H   = height

    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top  - PAD.bottom

    /* y-range ──────────────────────────────────────────────────────────── */
    let yMin: number, yMax: number
    const d0 = yDomain?.[0], d1 = yDomain?.[1]
    if (typeof d0 === 'number' && typeof d1 === 'number') {
      yMin = d0; yMax = d1
    } else {
      yMin = Infinity; yMax = -Infinity
      for (const l of lines) {
        for (const p of data) {
          const v = p[l.key]
          if (typeof v === 'number') { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v) }
        }
      }
      if (yMin === Infinity) { yMin = 0; yMax = 1 }
      const pad = (yMax - yMin) * 0.08 || 0.5
      yMin -= pad; yMax += pad
    }
    const yRange = yMax - yMin || 1

    const toX = (i: number) => PAD.left + (i / (data.length - 1)) * plotW
    const toY = (v: number) => PAD.top  + (1 - (v - yMin) / yRange) * plotH

    /* grid ─────────────────────────────────────────────────────────────── */
    ctx.strokeStyle = '#0f1729'
    ctx.lineWidth = 1
    ctx.font = `${9 * dpr / dpr}px system-ui`
    ctx.fillStyle = '#374151'

    const yTicks = 4
    for (let i = 0; i <= yTicks; i++) {
      const frac = i / yTicks
      const y    = PAD.top + frac * plotH
      const val  = yMax - frac * yRange
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      ctx.textAlign = 'right'
      ctx.fillText(
        Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(1),
        PAD.left - 4, y + 3
      )
    }

    /* x-axis labels ────────────────────────────────────────────────────── */
    ctx.textAlign = 'center'
    const xStep = Math.max(1, Math.floor(data.length / 5))
    for (let i = 0; i < data.length; i += xStep) {
      ctx.fillText(String(data[i].tLabel ?? ''), toX(i), H - 4)
    }

    /* zero reference ───────────────────────────────────────────────────── */
    if (yMin < 0 && yMax > 0) {
      const zy = toY(0)
      ctx.strokeStyle = '#1f2937'
      ctx.setLineDash([4, 3])
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD.left, zy); ctx.lineTo(W - PAD.right, zy); ctx.stroke()
      ctx.setLineDash([])
    }

    /* data lines ───────────────────────────────────────────────────────── */
    for (const l of lines) {
      ctx.strokeStyle = l.color
      ctx.lineWidth   = 1.5
      ctx.shadowColor = l.color + '55'
      ctx.shadowBlur  = 5
      ctx.beginPath()
      let started = false
      for (let i = 0; i < data.length; i++) {
        const v = data[i][l.key]
        if (typeof v !== 'number') continue
        const x = toX(i), y = toY(v)
        started ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        started = true
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [data, lines, yDomain, unit, height])

  /* redraw on data or size change */
  useEffect(() => { draw() }, [draw])

  /* resize observer */
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  /* ── Mouse move — just move overlay divs, ZERO canvas redraw ──────────── */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    const hover     = hoverRef.current
    const tooltip   = tooltipRef.current
    if (!container || !hover || !tooltip) return

    const rect   = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const W      = rect.width
    const plotW  = W - PAD.left - PAD.right

    if (mouseX < PAD.left || mouseX > W - PAD.right) {
      hover.style.display   = 'none'
      tooltip.style.display = 'none'
      return
    }

    const d    = dataRef.current
    const frac = Math.max(0, Math.min(1, (mouseX - PAD.left) / plotW))
    const idx  = Math.round(frac * (d.length - 1))
    const pt   = d[idx]
    if (!pt) return

    hover.style.display = 'block'
    hover.style.left    = `${mouseX}px`

    // build tooltip content
    const vals = lines.map(l => {
      const v = pt[l.key]
      return `<span style="color:${l.color}">${l.label}: <b>${typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : '—'}${unit}</b></span>`
    }).join('<br/>')
    tooltip.innerHTML = `<div style="color:#6b7280;font-size:10px;margin-bottom:3px">${pt.tLabel}</div>${vals}`

    const tipW  = tooltip.offsetWidth
    const tipX  = mouseX + 10 + tipW > W ? mouseX - tipW - 10 : mouseX + 10
    tooltip.style.left    = `${tipX}px`
    tooltip.style.display = 'block'
  }, [lines, unit])

  const handleMouseLeave = useCallback(() => {
    if (hoverRef.current)   hoverRef.current.style.display   = 'none'
    if (tooltipRef.current) tooltipRef.current.style.display = 'none'
  }, [])

  return (
    <div ref={containerRef} className="relative w-full select-none"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Crosshair line */}
      <div ref={hoverRef} className="absolute top-0 pointer-events-none hidden"
        style={{ width: 1, top: PAD.top, bottom: PAD.bottom, backgroundColor: '#374151', transform: 'translateX(-0.5px)' }} />
      {/* Tooltip */}
      <div ref={tooltipRef}
        className="absolute pointer-events-none hidden z-10"
        style={{
          top: PAD.top + 4,
          background: '#060d1a',
          border: '1px solid #1f2937',
          borderRadius: 8,
          padding: '5px 9px',
          fontSize: 11,
          lineHeight: '1.6',
          whiteSpace: 'nowrap',
        }} />
      {/* Legend */}
      <div className="absolute bottom-0 right-2 flex gap-3" style={{ bottom: PAD.bottom - 4 }}>
        {lines.map(l => (
          <span key={l.key} className="flex items-center gap-1 text-[10px]" style={{ color: '#6b7280' }}>
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
})

/* ── Chart card wrapper ──────────────────────────────────────────────────── */
function ChartCard({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: accent ?? '#38bdf8' }} />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      {children}
    </div>
  )
}

/* ── Live badge ──────────────────────────────────────────────────────────── */
function LiveBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-mono text-xs font-semibold ml-1" style={{ color }}>{value}</span>
    </div>
  )
}

/* ── Main tab ────────────────────────────────────────────────────────────── */
export function DevGraphsTab() {
  const devSensorStatus = useMotorStore(s => s.devSensorStatus)

  const latestRef   = useRef<DevSensorStatus | null>(null)
  latestRef.current = devSensorStatus ?? null

  const historyRef   = useRef<HistoryPoint[]>([])
  const startTimeRef = useRef(Date.now())
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [paused, setPaused]   = useState(false)
  const [maxPts, setMaxPts]   = useState(120)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  const SAMPLE_HZ = 4

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || !latestRef.current) return
      const d   = latestRef.current
      const now = Date.now()
      const elapsed = (now - startTimeRef.current) / 1000
      const tLabel  = elapsed < 60
        ? `${elapsed.toFixed(1)}s`
        : `${Math.floor(elapsed / 60)}m${(elapsed % 60).toFixed(0)}s`

      const point: HistoryPoint = { ...d, t: now, tLabel }
      const next = historyRef.current.length >= maxPts
        ? [...historyRef.current.slice(1), point]
        : [...historyRef.current, point]
      historyRef.current = next
      setHistory(next)
    }, 1000 / SAMPLE_HZ)
    return () => clearInterval(id)
  }, [maxPts])

  const clearHistory = () => {
    historyRef.current = []
    setHistory([])
    startTimeRef.current = Date.now()
  }

  const h = useMemo(() => history.map(p => ({
    ...p,
    as5600_deg:     +((p.as5600 / 4096) * 360).toFixed(1),
    mt6701_abs_deg: +((p.mt6701 / 16384) * 360).toFixed(1),
    mt6701_rel_deg: +(p.mt6701Turns * 360 + (p.mt6701 / 16384) * 360 * Math.sign(p.mt6701CountRaw || 1)).toFixed(1),
    mt6701_turns_f: p.mt6701Turns,
    gx_dps: +(p.gx / 1000).toFixed(1),
    gy_dps: +(p.gy / 1000).toFixed(1),
    gz_dps: +(p.gz / 1000).toFixed(1),
  })), [history])

  if (h.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-slate-600 animate-pulse" />
        </div>
        <span className="text-sm">Collecting data…</span>
      </div>
    )
  }

  const latest = h[h.length - 1]

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className={clsx('w-2 h-2 rounded-full', paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse')} />
          <span className="text-xs text-slate-400 font-medium">
            {paused ? 'Paused' : `Live · ${SAMPLE_HZ} Hz · ${h.length} pts`}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1">
            {([['10s', 40], ['30s', 120], ['60s', 240]] as [string, number][]).map(([label, pts]) => (
              <button key={label} onClick={() => setMaxPts(pts)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                  maxPts === pts
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                )}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setPaused(p => !p)}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
              paused
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
            )}>
            {paused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
          </button>

          <button onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Live badges */}
      <div className="flex flex-wrap gap-2">
        <LiveBadge label="VSEN"   value={`${latest.vsen.toFixed(2)}V`}                 color="#fbbf24" />
        <LiveBadge label="NTC"    value={`${latest.ntc.toFixed(1)}°C`}                 color="#fb923c" />
        <LiveBadge label="AS5600" value={`${((latest.as5600/4096)*360).toFixed(1)}°`}  color="#a78bfa" />
        <LiveBadge label="MT6701" value={`${((latest.mt6701/16384)*360).toFixed(1)}°`} color="#818cf8" />
        <LiveBadge label="Turns"  value={`${latest.mt6701Turns} rev`}                  color="#6366f1" />
        <LiveBadge label="Gyro Z" value={`${(latest.gz/1000).toFixed(1)} dps`}         color="#facc15" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Supply Voltage" accent="#fbbf24">
          <CanvasChart data={h} lines={[{ key: 'vsen', color: '#fbbf24', label: 'VSEN' }]} yDomain={[0, 5]} unit="V" />
        </ChartCard>

        <ChartCard title="Temperature" accent="#fb923c">
          <CanvasChart data={h}
            lines={[{ key: 'ntc', color: '#fb923c', label: 'Board NTC' }, { key: 'imuTemp', color: '#f97316', label: 'IMU' }]}
            yDomain={[0, 80]} unit="°C" />
        </ChartCard>

        <ChartCard title="Encoder — Absolute Angle (0–360°)" accent="#a78bfa">
          <CanvasChart data={h}
            lines={[{ key: 'as5600_deg', color: '#a78bfa', label: 'AS5600' }, { key: 'mt6701_abs_deg', color: '#818cf8', label: 'MT6701' }]}
            yDomain={[0, 360]} unit="°" />
        </ChartCard>

        <ChartCard title="MT6701 — Relative Position (multi-turn)" accent="#6366f1">
          <CanvasChart data={h} lines={[{ key: 'mt6701_rel_deg', color: '#6366f1', label: 'Rel deg' }]} unit="°" />
        </ChartCard>

        <ChartCard title="MT6701 — Completed Turns" accent="#38bdf8">
          <CanvasChart data={h} lines={[{ key: 'mt6701_turns_f', color: '#38bdf8', label: 'Turns' }]} unit=" rev" />
        </ChartCard>

        <ChartCard title="Accelerometer" accent="#34d399">
          <CanvasChart data={h}
            lines={[{ key: 'ax', color: '#38bdf8', label: 'X' }, { key: 'ay', color: '#818cf8', label: 'Y' }, { key: 'az', color: '#34d399', label: 'Z' }]}
            yDomain={[-2000, 2000]} unit="mg" />
        </ChartCard>

        <ChartCard title="Gyroscope" accent="#f472b6">
          <CanvasChart data={h}
            lines={[{ key: 'gx_dps', color: '#f472b6', label: 'X' }, { key: 'gy_dps', color: '#fb923c', label: 'Y' }, { key: 'gz_dps', color: '#facc15', label: 'Z' }]}
            unit=" dps" height={165} />
        </ChartCard>

        <ChartCard title="MT6701 Raw ABZ Count" accent="#c084fc">
          <CanvasChart data={h} lines={[{ key: 'mt6701CountRaw', color: '#c084fc', label: 'Count' }]} unit=" cts" />
        </ChartCard>
      </div>
    </div>
  )
}
