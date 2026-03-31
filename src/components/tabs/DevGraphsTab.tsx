import { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react'
import { useMotorStore, type DevSensorStatus } from '../../store/motorStore'
import {
  TrendingUp, Trash2, Pause, Play, Download, Lock, Unlock,
  Upload, StickyNote, ChevronDown, ChevronUp, SkipBack, SkipForward,
  FastForward,
} from 'lucide-react'
import clsx from 'clsx'

type HistoryPoint = DevSensorStatus & { t: number; tLabel: string }
type LineSpec = { key: string; color: string; label: string }

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
const CSV_HEADERS = [
  'time_s','vsen_V','ntc_degC','as5600_raw','as5600_deg',
  'mt6701_raw','mt6701_deg','mt6701_count','mt6701_turns',
  'ax_mg','ay_mg','az_mg','gx_mdps','gy_mdps','gz_mdps',
  'imu_temp_degC','magnet','err_flags',
]

function historyToCSV(pts: HistoryPoint[], note: string): string {
  const rows = pts.map((p, i) => [
    ((p.t - pts[0].t) / 1000).toFixed(3),
    p.vsen.toFixed(3),
    p.ntc.toFixed(2),
    p.as5600,
    ((p.as5600 / 4096) * 360).toFixed(2),
    p.mt6701,
    ((p.mt6701 / 16384) * 360).toFixed(2),
    p.mt6701CountRaw,
    p.mt6701Turns,
    p.ax.toFixed(0),
    p.ay.toFixed(0),
    p.az.toFixed(0),
    p.gx.toFixed(0),
    p.gy.toFixed(0),
    p.gz.toFixed(0),
    p.imuTemp.toFixed(2),
    p.magnet ? '1' : '0',
    `0x${p.errFlags.toString(16).padStart(2, '0')}`,
    i === 0 && note ? `"${note.replace(/"/g, '""')}"` : '',
  ].join(','))
  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

function downloadCSV(content: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const blob = new Blob([content], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `swyft-log-${ts}.csv` })
  document.body.appendChild(a); a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 200)
}

/* ── Parse imported CSV back to HistoryPoint array ───────────────────────── */
function parseCSV(text: string): HistoryPoint[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',')
  const idx = (k: string) => header.indexOf(k)
  const now = Date.now()
  return lines.slice(1).map(line => {
    const c = line.split(',')
    const t_s   = parseFloat(c[idx('time_s')] ?? '0')
    const vsen  = parseFloat(c[idx('vsen_V')]      ?? '0')
    const ntc   = parseFloat(c[idx('ntc_degC')]    ?? '0')
    const as5600= parseInt(c[idx('as5600_raw')]    ?? '0')
    const mt6701= parseInt(c[idx('mt6701_raw')]    ?? '0')
    const cnt   = parseInt(c[idx('mt6701_count')]  ?? '0')
    const turns = parseInt(c[idx('mt6701_turns')]  ?? '0')
    const ax    = parseFloat(c[idx('ax_mg')]       ?? '0')
    const ay    = parseFloat(c[idx('ay_mg')]       ?? '0')
    const az    = parseFloat(c[idx('az_mg')]       ?? '0')
    const gx    = parseFloat(c[idx('gx_mdps')]     ?? '0')
    const gy    = parseFloat(c[idx('gy_mdps')]     ?? '0')
    const gz    = parseFloat(c[idx('gz_mdps')]     ?? '0')
    const imuT  = parseFloat(c[idx('imu_temp_degC')] ?? '0')
    const mag   = c[idx('magnet')] === '1'
    const err   = parseInt((c[idx('err_flags')] ?? '0x00').replace('0x',''), 16)
    const elapsed = t_s
    const tLabel  = elapsed < 60 ? `${elapsed.toFixed(1)}s` : `${Math.floor(elapsed/60)}m${(elapsed%60).toFixed(0)}s`
    return {
      t: now + t_s * 1000, tLabel,
      vsen, ntc, as5600, mt6701,
      mt6701CountRaw: cnt, mt6701Turns: turns,
      ax, ay, az, gx, gy, gz,
      imuTemp: imuT, magnet: mag, errFlags: err,
    }
  }).filter(p => !isNaN(p.vsen))
}

/* ── Canvas chart ─────────────────────────────────────────────────────────── */
const CanvasChart = memo(function CanvasChart({ data, refData, lines, yDomain, unit, height = 150 }: {
  data: Record<string, unknown>[]
  refData?: Record<string, unknown>[] | null
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

    /* y-range */
    let yMin: number, yMax: number
    const d0 = yDomain?.[0], d1 = yDomain?.[1]
    if (typeof d0 === 'number' && typeof d1 === 'number') {
      yMin = d0; yMax = d1
    } else {
      yMin = Infinity; yMax = -Infinity
      const allData = refData ? [...data, ...refData] : data
      for (const l of lines) {
        for (const p of allData) {
          const v = p[l.key]
          if (typeof v === 'number') { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v) }
        }
      }
      if (yMin === Infinity) { yMin = 0; yMax = 1 }
      const pad = (yMax - yMin) * 0.08 || 0.5
      yMin -= pad; yMax += pad
    }
    const yRange = yMax - yMin || 1

    const toX = (i: number, len: number) => PAD.left + (i / (len - 1)) * plotW
    const toY = (v: number) => PAD.top + (1 - (v - yMin) / yRange) * plotH

    /* grid */
    ctx.strokeStyle = '#0f1729'
    ctx.lineWidth = 1
    ctx.font = `9px system-ui`
    ctx.fillStyle = '#374151'
    const yTicks = 4
    for (let i = 0; i <= yTicks; i++) {
      const frac = i / yTicks
      const y    = PAD.top + frac * plotH
      const val  = yMax - frac * yRange
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
      ctx.textAlign = 'right'
      ctx.fillText(Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(1), PAD.left - 4, y + 3)
    }

    /* x-axis labels */
    ctx.textAlign = 'center'
    const xStep = Math.max(1, Math.floor(data.length / 5))
    for (let i = 0; i < data.length; i += xStep) {
      ctx.fillText(String(data[i].tLabel ?? ''), toX(i, data.length), H - 4)
    }

    /* zero reference */
    if (yMin < 0 && yMax > 0) {
      const zy = toY(0)
      ctx.strokeStyle = '#1f2937'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD.left, zy); ctx.lineTo(W - PAD.right, zy); ctx.stroke()
      ctx.setLineDash([])
    }

    /* frozen reference lines (dashed, muted) */
    if (refData && refData.length >= 2) {
      for (const l of lines) {
        ctx.strokeStyle = l.color + '44'
        ctx.lineWidth   = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        let started = false
        for (let i = 0; i < refData.length; i++) {
          const v = refData[i][l.key]
          if (typeof v !== 'number') continue
          const x = toX(i, refData.length), y = toY(v)
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
          started = true
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    /* live data lines */
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
        const x = toX(i, data.length), y = toY(v)
        started ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        started = true
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [data, refData, lines, yDomain, unit, height])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

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
      hover.style.display = 'none'; tooltip.style.display = 'none'; return
    }

    const d    = dataRef.current
    const frac = Math.max(0, Math.min(1, (mouseX - PAD.left) / plotW))
    const idx  = Math.round(frac * (d.length - 1))
    const pt   = d[idx]
    if (!pt) return

    hover.style.display = 'block'
    hover.style.left    = `${mouseX}px`

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
    <div ref={containerRef} className="relative w-full select-none" style={{ height }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div ref={hoverRef} className="absolute top-0 pointer-events-none hidden"
        style={{ width: 1, top: PAD.top, bottom: PAD.bottom, backgroundColor: '#374151', transform: 'translateX(-0.5px)' }} />
      <div ref={tooltipRef} className="absolute pointer-events-none hidden z-10"
        style={{ top: PAD.top + 4, background: '#060d1a', border: '1px solid #1f2937',
          borderRadius: 8, padding: '5px 9px', fontSize: 11, lineHeight: '1.6', whiteSpace: 'nowrap' }} />
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

/* ── Chart card ──────────────────────────────────────────────────────────── */
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
  const [history,    setHistory]    = useState<HistoryPoint[]>([])
  const [paused,     setPaused]     = useState(false)
  const [maxPts,     setMaxPts]     = useState(120)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  /* notes */
  const [note,        setNote]        = useState('')
  const [noteOpen,    setNoteOpen]    = useState(false)

  /* freeze / overlay */
  const [frozenHistory, setFrozenHistory] = useState<HistoryPoint[] | null>(null)
  const isFrozen = frozenHistory !== null

  /* replay mode */
  const [replayData,    setReplayData]    = useState<HistoryPoint[] | null>(null)
  const [replayIdx,     setReplayIdx]     = useState(0)
  const [replayPaused,  setReplayPaused]  = useState(false)
  const [replaySpeed,   setReplaySpeed]   = useState(1)
  const replayIdxRef    = useRef(0)
  const replayPausedRef = useRef(false)
  const isReplaying     = replayData !== null
  replayIdxRef.current    = replayIdx
  replayPausedRef.current = replayPaused

  const fileInputRef = useRef<HTMLInputElement>(null)

  const SAMPLE_HZ = 4

  /* ── Live sampling ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || isReplaying || !latestRef.current) return
      const d       = latestRef.current
      const now     = Date.now()
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
  }, [maxPts, isReplaying])

  /* ── Replay playback ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isReplaying || !replayData) return
    const id = setInterval(() => {
      if (replayPausedRef.current) return
      const next = replayIdxRef.current + replaySpeed
      if (next >= replayData.length) {
        setReplayIdx(replayData.length - 1)
        setReplayPaused(true)
        return
      }
      setReplayIdx(next)
    }, 250)
    return () => clearInterval(id)
  }, [isReplaying, replayData, replaySpeed])

  const clearHistory = () => {
    historyRef.current = []
    setHistory([])
    startTimeRef.current = Date.now()
  }

  /* ── Import CSV ──────────────────────────────────────────────────────────*/
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseCSV(ev.target?.result as string)
      if (parsed.length > 0) {
        setReplayData(parsed)
        setReplayIdx(0)
        setReplayPaused(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const exitReplay = () => {
    setReplayData(null)
    setReplayIdx(0)
    setReplayPaused(false)
  }

  /* ── Derived / display history ───────────────────────────────────────────*/
  const displayRaw = isReplaying && replayData
    ? replayData.slice(0, Math.max(2, replayIdx + 1))
    : history

  const h = useMemo(() => displayRaw.map(p => ({
    ...p,
    as5600_deg:     +((p.as5600 / 4096) * 360).toFixed(1),
    mt6701_abs_deg: +((p.mt6701 / 16384) * 360).toFixed(1),
    mt6701_rel_deg: +(p.mt6701Turns * 360 + (p.mt6701 / 16384) * 360 * Math.sign(p.mt6701CountRaw || 1)).toFixed(1),
    mt6701_turns_f: p.mt6701Turns,
    gx_dps: +(p.gx / 1000).toFixed(1),
    gy_dps: +(p.gy / 1000).toFixed(1),
    gz_dps: +(p.gz / 1000).toFixed(1),
  })), [displayRaw])

  const refH = useMemo(() => frozenHistory?.map(p => ({
    ...p,
    as5600_deg:     +((p.as5600 / 4096) * 360).toFixed(1),
    mt6701_abs_deg: +((p.mt6701 / 16384) * 360).toFixed(1),
    mt6701_rel_deg: +(p.mt6701Turns * 360 + (p.mt6701 / 16384) * 360 * Math.sign(p.mt6701CountRaw || 1)).toFixed(1),
    mt6701_turns_f: p.mt6701Turns,
    gx_dps: +(p.gx / 1000).toFixed(1),
    gy_dps: +(p.gy / 1000).toFixed(1),
    gz_dps: +(p.gz / 1000).toFixed(1),
  })) ?? null, [frozenHistory])

  if (h.length === 0 && !isReplaying) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-slate-600 animate-pulse" />
        </div>
        <span className="text-sm">Collecting data…</span>
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-300 hover:border-sky-500/30 transition-all">
          <Upload className="w-3.5 h-3.5" /> Import CSV for replay
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
      </div>
    )
  }

  const latest = h[h.length - 1] ?? h[0]

  return (
    <div className="space-y-4 max-w-5xl">

      {/* ── Replay banner ────────────────────────────────────────────────── */}
      {isReplaying && replayData && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-500/10 border border-violet-500/30 rounded-xl text-xs font-medium text-violet-300">
          <FastForward className="w-4 h-4 flex-shrink-0" />
          <span>Replay mode</span>
          <span className="text-violet-500">·</span>
          <span>{replayIdx + 1} / {replayData.length} pts</span>
          <div className="flex-1 bg-violet-900/30 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full transition-all"
              style={{ width: `${((replayIdx + 1) / replayData.length) * 100}%` }} />
          </div>
          <button onClick={() => setReplayIdx(0)} className="p-1 hover:text-white transition-colors"><SkipBack className="w-3.5 h-3.5" /></button>
          <button onClick={() => setReplayPaused(p => !p)} className="p-1 hover:text-white transition-colors">
            {replayPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setReplayIdx(replayData.length - 1)} className="p-1 hover:text-white transition-colors"><SkipForward className="w-3.5 h-3.5" /></button>
          <div className="flex items-center gap-1">
            {([1,2,5,10] as number[]).map(s => (
              <button key={s} onClick={() => setReplaySpeed(s)}
                className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold transition-all',
                  replaySpeed === s ? 'bg-violet-500/30 text-violet-200' : 'text-violet-500 hover:text-violet-300')}>
                {s}×
              </button>
            ))}
          </div>
          <button onClick={exitReplay}
            className="px-2 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 transition-all text-[11px]">
            Exit
          </button>
        </div>
      )}

      {/* ── Freeze banner ────────────────────────────────────────────────── */}
      {isFrozen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-400">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Reference trace frozen — dashed lines show the locked snapshot</span>
          <button onClick={() => setFrozenHistory(null)}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 transition-all">
            <Unlock className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className={clsx('w-2 h-2 rounded-full',
            isReplaying ? 'bg-violet-400' : paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
          )} />
          <span className="text-xs text-slate-400 font-medium">
            {isReplaying ? 'Replay' : paused ? 'Paused' : `Live · ${SAMPLE_HZ} Hz · ${h.length} pts`}
          </span>
        </div>

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

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Pause/Resume — only in live mode */}
          {!isReplaying && (
            <button onClick={() => setPaused(p => !p)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                paused
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
              )}>
              {paused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
            </button>
          )}

          {/* Freeze overlay */}
          {!isReplaying && (
            <button
              onClick={() => isFrozen ? setFrozenHistory(null) : setFrozenHistory([...history])}
              title={isFrozen ? 'Clear frozen reference' : 'Freeze current trace as reference'}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                isFrozen
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-300 hover:border-sky-500/30'
              )}>
              {isFrozen ? <><Unlock className="w-3.5 h-3.5" /> Unfreeze</> : <><Lock className="w-3.5 h-3.5" /> Freeze</>}
            </button>
          )}

          {/* Notes */}
          <button onClick={() => setNoteOpen(o => !o)}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
              note
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            )}>
            <StickyNote className="w-3.5 h-3.5" />
            Note
            {note && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
            {noteOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* CSV Download */}
          <button onClick={() => downloadCSV(historyToCSV(isReplaying && replayData ? replayData : history, note))}
            disabled={h.length < 2}
            title="Export to CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          {/* Import CSV / Replay */}
          {!isReplaying && (
            <>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-all">
                <Upload className="w-3.5 h-3.5" /> Replay CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </>
          )}

          {/* Clear */}
          {!isReplaying && (
            <button onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Session notes ────────────────────────────────────────────────── */}
      {noteOpen && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1.5">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Session Note (saved with CSV)</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Describe test conditions, run name, configuration…"
            rows={2}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-sky-500/60 transition-colors"
          />
        </div>
      )}

      {/* ── Live badges ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <LiveBadge label="VSEN"   value={`${latest.vsen.toFixed(2)}V`}                  color="#fbbf24" />
        <LiveBadge label="NTC"    value={`${latest.ntc.toFixed(1)}°C`}                  color="#fb923c" />
        <LiveBadge label="AS5600" value={`${((latest.as5600/4096)*360).toFixed(1)}°`}   color="#a78bfa" />
        <LiveBadge label="MT6701" value={`${((latest.mt6701/16384)*360).toFixed(1)}°`}  color="#818cf8" />
        <LiveBadge label="Turns"  value={`${latest.mt6701Turns} rev`}                   color="#6366f1" />
        <LiveBadge label="Gyro Z" value={`${(latest.gz/1000).toFixed(1)} dps`}          color="#facc15" />
        {isFrozen && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400">
            <Lock className="w-3 h-3" /> ref locked
          </div>
        )}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Supply Voltage" accent="#fbbf24">
          <CanvasChart data={h} refData={refH} lines={[{ key: 'vsen', color: '#fbbf24', label: 'VSEN' }]} yDomain={[0, 5]} unit="V" />
        </ChartCard>

        <ChartCard title="Temperature" accent="#fb923c">
          <CanvasChart data={h} refData={refH}
            lines={[{ key: 'ntc', color: '#fb923c', label: 'Board NTC' }, { key: 'imuTemp', color: '#f97316', label: 'IMU' }]}
            yDomain={[0, 80]} unit="°C" />
        </ChartCard>

        <ChartCard title="Encoder — Absolute Angle (0–360°)" accent="#a78bfa">
          <CanvasChart data={h} refData={refH}
            lines={[{ key: 'as5600_deg', color: '#a78bfa', label: 'AS5600' }, { key: 'mt6701_abs_deg', color: '#818cf8', label: 'MT6701' }]}
            yDomain={[0, 360]} unit="°" />
        </ChartCard>

        <ChartCard title="MT6701 — Relative Position (multi-turn)" accent="#6366f1">
          <CanvasChart data={h} refData={refH} lines={[{ key: 'mt6701_rel_deg', color: '#6366f1', label: 'Rel deg' }]} unit="°" />
        </ChartCard>

        <ChartCard title="MT6701 — Completed Turns" accent="#38bdf8">
          <CanvasChart data={h} refData={refH} lines={[{ key: 'mt6701_turns_f', color: '#38bdf8', label: 'Turns' }]} unit=" rev" />
        </ChartCard>

        <ChartCard title="Accelerometer" accent="#34d399">
          <CanvasChart data={h} refData={refH}
            lines={[{ key: 'ax', color: '#38bdf8', label: 'X' }, { key: 'ay', color: '#818cf8', label: 'Y' }, { key: 'az', color: '#34d399', label: 'Z' }]}
            yDomain={[-2000, 2000]} unit="mg" />
        </ChartCard>

        <ChartCard title="Gyroscope" accent="#f472b6">
          <CanvasChart data={h} refData={refH}
            lines={[{ key: 'gx_dps', color: '#f472b6', label: 'X' }, { key: 'gy_dps', color: '#fb923c', label: 'Y' }, { key: 'gz_dps', color: '#facc15', label: 'Z' }]}
            unit=" dps" height={165} />
        </ChartCard>

        <ChartCard title="MT6701 Raw ABZ Count" accent="#c084fc">
          <CanvasChart data={h} refData={refH} lines={[{ key: 'mt6701CountRaw', color: '#c084fc', label: 'Count' }]} unit=" cts" />
        </ChartCard>
      </div>
    </div>
  )
}
