import { useMotorStore } from '../../store/motorStore'
import { ExternalLink, Github, Zap, WifiOff, Monitor } from 'lucide-react'

export function AboutTab() {
  const { firmwareVersion, firmwareBuildDate, send } = useMotorStore()

  return (
    <div className="space-y-4 max-w-lg">
      {/* Branding */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">SWYFT Link</h1>
        <p className="text-slate-400 text-sm mt-2">Device interface for SWYFT Robotics motors and sensors</p>
        <div className="flex justify-center gap-3 mt-4">
          <a href="https://github.com/SWYFT-Robotics/swyft-link-web" target="_blank" rel="noopener"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
            <Github className="w-4 h-4" />
            View Source
          </a>
          <a href="https://swyftrobotics.com" target="_blank" rel="noopener"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
            <ExternalLink className="w-4 h-4" />
            swyftrobotics.com
          </a>
        </div>
      </div>

      {/* Firmware info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3">Connected Device</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Firmware Version</span>
            <span className="font-mono text-white">{firmwareVersion ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Build Date</span>
            <span className="font-mono text-white">{firmwareBuildDate ?? '-'}</span>
          </div>
        </div>
        <button onClick={() => send('VERSION')}
          className="mt-3 text-xs text-sky-400 hover:text-sky-300 transition-colors">
          Refresh version info
        </button>
      </div>

      {/* Browser info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3">About WebSerial</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          SWYFT Link uses the browser's WebSerial API to communicate directly with your device over USB.
          No installation, no drivers, no app store — just plug in and go.
        </p>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Works in <strong className="text-white">Chrome 89+</strong>, <strong className="text-white">Edge 89+</strong>,
          and <strong className="text-white">Opera 75+</strong>.
          Firefox and Safari do not yet support WebSerial.
        </p>
      </div>

      {/* Offline / local installation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <WifiOff className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-white">Offline / Local Installation</h3>
        </div>
        <div className="space-y-3 text-sm text-slate-400">
          <div>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium mb-1">
              <Monitor className="w-3.5 h-3.5" /> Install as Desktop App (PWA)
            </div>
            <p className="text-xs leading-relaxed">
              In Chrome or Edge, click the <strong className="text-slate-200">⊕ Install</strong> icon in the address bar
              (or <em>⋮ menu → Install SWYFT Link</em>). The app is saved locally and works without an internet connection.
              WebSerial always communicates directly with your USB hardware — no cloud involved.
            </p>
          </div>
          <div className="border-t border-slate-800 pt-3">
            <div className="text-slate-300 font-medium mb-1">Run locally from source</div>
            <div className="bg-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-300 space-y-1">
              <div><span className="text-slate-500"># clone and install</span></div>
              <div>git clone https://github.com/SWYFT-Robotics/swyft-link-web</div>
              <div>cd swyft-link-web &amp;&amp; npm install</div>
              <div className="mt-1"><span className="text-slate-500"># dev server (live reload)</span></div>
              <div>npm run dev</div>
              <div className="mt-1"><span className="text-slate-500"># or build + serve static files</span></div>
              <div>npm run build &amp;&amp; npx serve dist</div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Node.js 18+ required. Both methods work fully offline for USB connections.
            </p>
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3">Diagnostics</h3>
        <div className="flex flex-wrap gap-2">
          {['DEBUG', 'ENCODER', 'CANDEN', 'IWDG', 'DFUCHECK'].map(cmd => (
            <button key={cmd} onClick={() => send(cmd)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
