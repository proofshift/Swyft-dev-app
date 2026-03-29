import { useMotorStore } from '../../store/motorStore'
import { useEffect, useRef } from 'react'

function AngleDial({ angle, label }: { angle: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const cx = c.width / 2, cy = c.height / 2, r = cx - 12

    ctx.clearRect(0, 0, c.width, c.height)

    // Background circle
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 8
    ctx.stroke()

    // Angle arc
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (angle / 360) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.stroke()

    // Needle
    const rad = startAngle + (angle / 360) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(rad) * (r - 4), cy + Math.sin(rad) * (r - 4))
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 2
    ctx.stroke()

    // Center dot
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#0ea5e9'
    ctx.fill()
  }, [angle])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={120} height={120} />
      <div className="text-center">
        <div className="text-lg font-mono font-bold text-sky-400">{angle.toFixed(1)}°</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}

export function InputTab() {
  const { status, send } = useMotorStore()

  const setZero = () => send('ZERO')

  if (!status) return <div className="text-slate-500 text-sm text-center py-12">No device connected</div>

  return (
    <div className="space-y-4">
      {/* Analog sensor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Analog Input (PB0)</h3>
          <button onClick={setZero} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
            Set Zero
          </button>
        </div>

        <div className="flex items-center gap-8">
          <AngleDial angle={status.swerveAngle} label="Angle" />

          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Raw ADC</span><span className="font-mono text-slate-300">{status.swerveRaw}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${(status.swerveRaw / 4095) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Angle</span><span className="font-mono text-slate-300">{status.swerveAngle.toFixed(2)}°</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(status.swerveAngle / 360) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Encoder */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">TLE5012B Encoder (SPI1)</h3>
          <div className="flex gap-2">
            <button onClick={() => send('ZEROENC')} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">Zero Encoder</button>
            <button onClick={() => send('ZEROPOS')} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">Zero Position</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Raw Encoder', value: status.encoder },
            { label: 'Position', value: status.position },
            { label: 'Speed', value: `${status.speed.toFixed(0)} RPM` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="font-mono font-bold text-sky-400">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Position bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Encoder (0–65535)</span>
            <span className="font-mono">{((status.encoder / 65535) * 360).toFixed(1)}°</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${(status.encoder / 65535) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
