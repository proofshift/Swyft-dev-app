import { useMotorStore } from '../../store/motorStore'
import swyftLogo from '../../assets/swyft-logo.png'
import { ExternalLink, Github, WifiOff, Monitor, RefreshCw, Cpu, Activity, Zap } from 'lucide-react'

export function AboutTab() {
  const { firmwareVersion, firmwareBuildDate, send, deviceType } = useMotorStore()
  const isDevSensor = deviceType === 'devsensor'

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Branding hero */}
      <div className="bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-900 border border-sky-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <img src={swyftLogo} alt="SWYFT" className="w-16 h-16 flex-shrink-0 rounded-xl object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SWYFT Link</h1>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Professional device interface for SWYFT Robotics hardware.<br />
              Built for FRC teams who demand the best.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://github.com/SWYFT-Robotics/swyft-link-web" target="_blank" rel="noopener"
                className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <Github className="w-4 h-4" /> GitHub
              </a>
              <a href="https://swyftrobotics.com" target="_blank" rel="noopener"
                className="flex items-center gap-2 px-3.5 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-lg text-sm text-sky-300 transition-colors">
                <ExternalLink className="w-4 h-4" /> swyftrobotics.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Device info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDevSensor ? 'bg-purple-500/15' : 'bg-sky-500/15'}`}>
            {isDevSensor ? <Activity className="w-4 h-4 text-purple-400" /> : <Zap className="w-4 h-4 text-sky-400" />}
          </div>
          <h3 className="font-semibold text-white">Connected Device</h3>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${isDevSensor ? 'bg-purple-500/15 text-purple-400' : 'bg-sky-500/15 text-sky-400'}`}>
            {isDevSensor ? 'DEV Sensor' : 'Thunder'}
          </span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Firmware Version</span>
            <span className="font-mono text-white">{firmwareVersion ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Build Date</span>
            <span className="font-mono text-slate-300 text-xs">{firmwareBuildDate ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Device Type</span>
            <span className="font-mono text-slate-300">{isDevSensor ? 'SWYFT DEV Sensor' : 'SWYFT Thunder'}</span>
          </div>
        </div>
        <button onClick={() => send('VERSION')}
          className="mt-4 flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh version info
        </button>
      </div>

      {/* Tech stack */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="font-semibold text-white">WebSerial Technology</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed mb-3">
          SWYFT Link uses the browser's <strong className="text-slate-200">WebSerial API</strong> to communicate
          directly with your device over USB — no installation, no drivers, no app store required.
          WebUSB powers the in-browser firmware flasher.
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { browser: 'Chrome', version: '89+', ok: true },
            { browser: 'Edge', version: '89+', ok: true },
            { browser: 'Firefox', version: 'Any', ok: false },
          ].map(b => (
            <div key={b.browser} className={`p-2.5 rounded-lg border text-center ${b.ok ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-slate-800/60 border-slate-700'}`}>
              <div className={`font-semibold ${b.ok ? 'text-emerald-400' : 'text-slate-500'}`}>{b.browser}</div>
              <div className={`text-[10px] mt-0.5 ${b.ok ? 'text-emerald-600' : 'text-slate-600'}`}>{b.version}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Offline / PWA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
            <WifiOff className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="font-semibold text-white">Offline / Local Installation</h3>
        </div>
        <div className="space-y-4 text-sm text-slate-400">
          <div>
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
              <Monitor className="w-3.5 h-3.5" /> Install as Desktop App (PWA)
            </div>
            <p className="text-xs leading-relaxed">
              In Chrome or Edge, click the <strong className="text-slate-200">⊕ Install</strong> icon in the address bar
              to install SWYFT Link as a local app. Works offline and uses WebSerial directly with your USB hardware.
            </p>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <div className="text-slate-300 font-medium mb-2 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" /> Run from Source
            </div>
            <div className="bg-[#060d1a] border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1">
              <div><span className="text-slate-600"># clone and run</span></div>
              <div><span className="text-sky-500">git clone</span> https://github.com/SWYFT-Robotics/swyft-link-web</div>
              <div><span className="text-sky-500">cd</span> swyft-link-web <span className="text-sky-500">&amp;&amp; npm install</span></div>
              <div className="mt-1"><span className="text-sky-500">npm run dev</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-3">Quick Diagnostics</h3>
        <div className="flex flex-wrap gap-2">
          {(isDevSensor
            ? ['VERSION', 'STATUS', 'ABZDBG', 'HELP']
            : ['DEBUG', 'ENCODER', 'CANDEN', 'IWDG', 'DFUCHECK', 'VERSION']
          ).map(cmd => (
            <button key={cmd} onClick={() => send(cmd)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all">
              {cmd}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">Results appear in the Console tab.</p>
      </div>
    </div>
  )
}
