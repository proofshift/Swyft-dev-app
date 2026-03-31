import { useState, useRef, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Send, Trash2, Copy, Check, Terminal, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const THUNDER_QUICK_CMDS  = ['VERSION', 'DEBUG', 'CANSTATUS', 'ENCODER', 'CANDEN', 'STOP', 'HELP']
const DEVSENSOR_QUICK_CMDS = ['VERSION', 'STATUS', 'ABZDBG', 'HELP']

export function LogTab() {
  const { log, send, clearLog, deviceType } = useMotorStore()
  const QUICK_CMDS = deviceType === 'devsensor' ? DEVSENSOR_QUICK_CMDS : THUNDER_QUICK_CMDS
  const [input, setInput]     = useState('')
  const [copied, setCopied]   = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log, autoScroll])

  const handleSend = async (cmd?: string) => {
    const c = cmd ?? input.trim()
    if (!c) return
    await send(c)
    if (!cmd) setInput('')
  }

  const copyLog = async () => {
    await navigator.clipboard.writeText(log.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const lineStyle = (line: string) => {
    if (line.startsWith('> '))              return 'text-sky-400 font-semibold'
    if (line.includes('ERR:') || line.includes('Error') || line.includes('✗')) return 'text-red-400'
    if (line.includes('OK:')  || line.includes('✓') || line.includes('done')) return 'text-emerald-400'
    if (line.includes('WARN') || line.includes('⚠'))  return 'text-amber-400'
    if (line.startsWith('< #S:'))          return 'text-slate-700'
    if (line.startsWith('< #'))            return 'text-slate-500'
    if (line.startsWith('< '))             return 'text-slate-300'
    return 'text-slate-400'
  }

  const linePrefix = (line: string) => {
    if (line.startsWith('> ')) return <span className="text-sky-600 mr-1.5">▶</span>
    if (line.startsWith('< ')) return <span className="text-slate-700 mr-1.5">◀</span>
    return null
  }

  return (
    <div className="flex flex-col gap-3 max-w-4xl" style={{ height: 'calc(100vh - 160px)', minHeight: 400 }}>
      {/* Quick commands */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-xs text-slate-600 font-medium uppercase tracking-wider mr-1">Quick:</span>
        {QUICK_CMDS.map(cmd => (
          <button key={cmd} onClick={() => handleSend(cmd)}
            className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all">
            {cmd}
          </button>
        ))}

        <div className="ml-auto flex gap-1.5 items-center">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(a => !a)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all',
              autoScroll
                ? 'bg-sky-500/10 border-sky-500/25 text-sky-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            )}>
            <ChevronDown className="w-3 h-3" />
            Auto-scroll
          </button>

          <button onClick={copyLog}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all">
            {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
              : <><Copy className="w-3 h-3" /> Copy</>}
          </button>

          <button onClick={clearLog}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Log output */}
      <div ref={scrollRef}
        className="flex-1 bg-[#060d1a] border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs leading-5 min-h-0">
        {/* Header bar */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/60">
          <Terminal className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-600 text-[10px] font-medium uppercase tracking-wider">Serial Console</span>
          <span className="ml-auto text-slate-700 text-[10px]">{log.length} lines</span>
        </div>

        {log.length === 0 && (
          <div className="flex items-center gap-2 text-slate-700">
            <span className="text-slate-800">$</span>
            <span className="animate-pulse">_</span>
            <span className="text-slate-700 ml-2">No output yet — send a command below</span>
          </div>
        )}
        {log.map((line, i) => (
          <div key={i} className={clsx('leading-5 hover:bg-white/[0.02] px-1 -mx-1 rounded transition-colors', lineStyle(line))}>
            {linePrefix(line)}
            {line.startsWith('> ') || line.startsWith('< ') ? line.slice(2) : line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); handleSend() }}
        className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
        <span className="text-slate-600 font-mono text-sm self-center pl-2 flex-shrink-0">$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type command and press Enter…"
          className="flex-1 bg-transparent font-mono text-sm text-slate-200 placeholder-slate-700 outline-none"
        />
        <button type="submit" disabled={!input.trim()}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            input.trim()
              ? 'bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}>
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </form>
    </div>
  )
}
