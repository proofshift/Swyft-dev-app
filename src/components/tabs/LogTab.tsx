import { useState, useRef, useEffect } from 'react'
import { useMotorStore } from '../../store/motorStore'
import { Send, Trash2, Copy } from 'lucide-react'
import clsx from 'clsx'

const QUICK_CMDS = ['VERSION', 'DEBUG', 'CANSTATUS', 'ENCODER', 'CANDEN', 'STOP', 'HELP']

export function LogTab() {
  const { log, send, clearLog } = useMotorStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [log])

  const handleSend = async (cmd?: string) => {
    const c = cmd ?? input.trim()
    if (!c) return
    await send(c)
    if (!cmd) setInput('')
  }

  const copyLog = () => {
    navigator.clipboard.writeText(log.join('\n'))
  }

  const lineColor = (line: string) => {
    if (line.startsWith('> ')) return 'text-sky-400'
    if (line.includes('ERR:') || line.includes('Error') || line.includes('✗')) return 'text-red-400'
    if (line.includes('OK:') || line.includes('✓') || line.includes('done')) return 'text-green-400'
    if (line.includes('WARN') || line.includes('⚠')) return 'text-amber-400'
    if (line.startsWith('< #S:')) return 'text-slate-600'
    if (line.startsWith('< #')) return 'text-slate-400'
    if (line.startsWith('< ')) return 'text-slate-300'
    return 'text-slate-400'
  }

  return (
    <div className="flex flex-col gap-3 h-[60vh]">
      {/* Quick commands */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_CMDS.map(cmd => (
          <button key={cmd} onClick={() => handleSend(cmd)}
            className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition-colors">
            {cmd}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={copyLog} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={clearLog} className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-y-auto font-mono text-xs">
        {log.length === 0 && (
          <span className="text-slate-600">No log entries yet...</span>
        )}
        {log.map((line, i) => (
          <div key={i} className={clsx('leading-5', lineColor(line))}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type command and press Enter..."
          className="input flex-1 font-mono text-sm"
        />
        <button type="submit" disabled={!input.trim()} className="btn-primary btn">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
