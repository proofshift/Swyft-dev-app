import { useState } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Radio, Save, CheckCircle, AlertCircle, RefreshCw, Send, Info } from 'lucide-react'
import clsx from 'clsx'

/* ── Section card ─────────────────────────────────────────────────────────── */
function Card({ title, icon: Icon, color, children, className }: {
  title: string; icon: React.ElementType; color: string
  children: React.ReactNode; className?: string
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

/* ── Status pill ──────────────────────────────────────────────────────────── */
function StatusPill({ label, active, okWhenActive = true }: { label: string; active: boolean; okWhenActive?: boolean }) {
  const good = okWhenActive ? active : !active
  return (
    <div className={clsx(
      'flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium',
      good  ? 'bg-emerald-500/10 border-emerald-500/25' :
      active ? 'bg-red-500/10 border-red-500/25' :
               'bg-slate-800/50 border-slate-700/50'
    )}>
      <span className={clsx('text-slate-400')}>{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={clsx('w-1.5 h-1.5 rounded-full',
          good ? 'bg-emerald-400' : active ? 'bg-red-400 animate-pulse' : 'bg-slate-600'
        )} />
        <span className={clsx(
          'font-semibold',
          good ? 'text-emerald-400' : active ? 'text-red-400' : 'text-slate-500'
        )}>{active ? 'YES' : 'NO'}</span>
      </div>
    </div>
  )
}

/* ── Row ──────────────────────────────────────────────────────────────────── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-mono text-slate-200 font-semibold">{value}</span>
    </div>
  )
}

/* ── Main tab ─────────────────────────────────────────────────────────────── */
export function DevCanTab() {
  const { canStatus, send } = useMotorStore()

  const [devNum,   setDevNum]   = useState(String(canStatus.deviceNumber ?? 0))
  const [saved,    setSaved]    = useState(false)
  const [customCmd, setCustomCmd] = useState('')

  const isValidId = !isNaN(parseInt(devNum)) && parseInt(devNum) >= 0 && parseInt(devNum) <= 62

  const handleSet = async () => {
    if (!isValidId) return
    await send(`CANDEV ${devNum}`)
  }

  const handleSave = async () => {
    await send('SAVE')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSetAndSave = async () => {
    if (!isValidId) return
    await send(`CANDEV ${devNum}`)
    await new Promise(r => setTimeout(r, 150))
    await send('SAVE')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleCustom = async () => {
    if (!customCmd.trim()) return
    await send(customCmd.trim())
    setCustomCmd('')
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-5xl">

      {/* CAN Bus Status */}
      <Card title="CAN Bus Status" icon={Radio} color="text-sky-400">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatusPill label="Heartbeat"     active={canStatus.heartbeatValid}   okWhenActive={true}  />
          <StatusPill label="Robot Enabled" active={canStatus.robotEnabled}     okWhenActive={true}  />
          <StatusPill label="CAN Master"    active={canStatus.canMaster}        okWhenActive={false} />
          <StatusPill label="HB Timeout"    active={canStatus.heartbeatTimeout} okWhenActive={false} />
        </div>
        <div className="space-y-0">
          <Row label="Device Type"   value={`${canStatus.deviceType} (DEV Sensor)`} />
          <Row label="Manufacturer"  value={`${canStatus.manufacturer} (SWYFT Robotics)`} />
          <Row label="Device Number" value={String(canStatus.deviceNumber ?? '—')} />
        </div>
        <button onClick={() => send('CANSTATUS')}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-300 hover:border-sky-500/30 transition-all">
          <RefreshCw className="w-3 h-3" /> Refresh status
        </button>
      </Card>

      {/* Device ID configuration */}
      <Card title="Device ID" icon={Info} color="text-purple-400">
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Each device on the CAN bus needs a unique number (0–62). Set this before connecting multiple SWYFT boards to the same robot.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Device Number</div>
            <input
              type="number" min={0} max={62}
              value={devNum}
              onChange={e => setDevNum(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetAndSave()}
              className={clsx(
                'w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-white focus:outline-none transition-colors',
                isValidId ? 'border-slate-700 focus:border-purple-500/60' : 'border-red-500/50 focus:border-red-500'
              )}
              placeholder="0"
            />
            {!isValidId && devNum !== '' && (
              <p className="text-xs text-red-400 mt-1">Must be 0 – 62</p>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <div className={clsx(
              'w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black font-mono transition-all',
              isValidId
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-600'
            )}>
              {isValidId ? devNum : '?'}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSet} disabled={!isValidId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Send className="w-3.5 h-3.5" /> Apply
          </button>
          <button onClick={handleSave}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
              saved
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
            )}>
            {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
        <button onClick={handleSetAndSave} disabled={!isValidId}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-purple-500 hover:bg-purple-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20">
          <CheckCircle className="w-3.5 h-3.5" /> Apply &amp; Save to Flash
        </button>
        <p className="text-[11px] text-slate-600 mt-2 text-center">Apply sends the command · Save writes to flash (survives reboot)</p>
      </Card>

      {/* Robot state — only when heartbeat is valid */}
      {canStatus.heartbeatValid && (
        <Card title="Robot State" icon={CheckCircle} color="text-emerald-400">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Autonomous',  value: canStatus.autonomous  ? 'Active'  : 'Inactive', ok: canStatus.autonomous },
              { label: 'Test Mode',   value: canStatus.testMode    ? 'Active'  : 'Inactive', ok: false },
              { label: 'Alliance',    value: canStatus.redAlliance ? 'Red 🟥'  : 'Blue 🟦',  ok: true },
              { label: 'Watchdog',    value: canStatus.watchdog    ? 'Active'  : 'Inactive', ok: canStatus.watchdog },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">{s.label}</div>
                <div className="text-sm font-semibold text-slate-200">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <div className="text-slate-500 mb-0.5">Match</div>
              <div className="font-mono font-bold text-slate-200">{canStatus.matchNumber ?? '—'}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <div className="text-slate-500 mb-0.5">Time</div>
              <div className="font-mono font-bold text-slate-200">{canStatus.matchTime ?? '—'}s</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <div className="text-slate-500 mb-0.5">Replay</div>
              <div className="font-mono font-bold text-slate-200">{canStatus.replayNumber ?? '—'}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick commands */}
      <Card title="CAN Commands" icon={Send} color="text-sky-400"
        className={clsx(!canStatus.heartbeatValid && 'xl:col-span-2')}>
        <div className="space-y-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Quick Commands</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Get CAN Status', cmd: 'CANSTATUS' },
              { label: 'Save Config',    cmd: 'SAVE' },
              { label: 'Get Version',    cmd: 'VERSION' },
            ].map(c => (
              <button key={c.cmd} onClick={() => send(c.cmd)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-300 hover:border-sky-500/30 transition-all font-mono">
                {c.label}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Custom Command</div>
            <div className="flex gap-2">
              <input
                value={customCmd}
                onChange={e => setCustomCmd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustom()}
                placeholder="e.g. CANDEV 5"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/60 transition-colors"
              />
              <button onClick={handleCustom} disabled={!customCmd.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 flex gap-2.5 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            CAN bus requires a WCP Spot canandivore or roboRIO CAN interface. The DEV Sensor device number must be unique (0–62) across all CAN devices on the bus.
          </p>
        </div>
      </Card>

    </div>
  )
}
