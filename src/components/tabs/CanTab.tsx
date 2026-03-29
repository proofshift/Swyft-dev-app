import { useState } from 'react'
import { useMotorStore } from '../../store/motorStore'
import clsx from 'clsx'

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={clsx('text-sm text-white', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

export function CanTab() {
  const { canStatus, send } = useMotorStore()
  const [devNum, setDevNum] = useState(String(canStatus.deviceNumber))

  const setDeviceNumber = async () => {
    const n = parseInt(devNum)
    if (!isNaN(n) && n >= 0 && n <= 62) {
      await send(`CANDEV ${n}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="card">
        <h3 className="font-semibold text-white mb-3">CAN Bus Status</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Heartbeat', value: canStatus.heartbeatValid, green: canStatus.heartbeatValid, red: false },
            { label: 'Robot Enabled', value: canStatus.robotEnabled, green: canStatus.robotEnabled, red: false },
            { label: 'CAN Master', value: canStatus.canMaster, green: false, red: canStatus.canMaster },
            { label: 'Timeout', value: canStatus.heartbeatTimeout, green: false, red: canStatus.heartbeatTimeout },
          ].map(({ label, value, green, red }) => (
            <div key={label} className={clsx('flex items-center justify-between p-3 rounded-lg border', {
              'bg-green-500/10 border-green-500/30': green,
              'bg-red-500/10 border-red-500/30': red,
              'bg-slate-800/50 border-slate-700/50': !green && !red,
            })}>
              <span className="text-sm text-slate-400">{label}</span>
              <span className={clsx('text-sm font-semibold', {
                'text-green-400': green,
                'text-red-400': red,
                'text-slate-500': !green && !red,
              })}>
                {value ? 'YES' : 'NO'}
              </span>
            </div>
          ))}
        </div>
        <InfoRow label="Device Type" value="2 (Motor Controller)" />
        <InfoRow label="Manufacturer" value="18 (SWYFT Robotics)" />
        <InfoRow label="Device Number" value={String(canStatus.deviceNumber)} />
      </div>

      {/* Device number config */}
      <div className="card">
        <h3 className="font-semibold text-white mb-3">Device Number</h3>
        <p className="text-sm text-slate-400 mb-3">Set the CAN device number (0–62). Multiple motors on the same bus need unique numbers.</p>
        <div className="flex gap-2">
          <input type="number" min={0} max={62} value={devNum}
            onChange={e => setDevNum(e.target.value)}
            className="input w-32" />
          <button onClick={setDeviceNumber} className="btn-primary btn">Set</button>
          <button onClick={() => send('SAVE')} className="btn-secondary btn">Save</button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Press Save to write to flash memory.</p>
      </div>

      {/* Robot state */}
      {canStatus.heartbeatValid && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Robot State</h3>
          <div className="grid grid-cols-2 gap-x-8">
            <InfoRow label="Autonomous" value={canStatus.autonomous ? 'Yes' : 'No'} />
            <InfoRow label="Test Mode" value={canStatus.testMode ? 'Yes' : 'No'} />
            <InfoRow label="Alliance" value={canStatus.redAlliance ? 'Red' : 'Blue'} />
            <InfoRow label="Match Time" value={`${canStatus.matchTime ?? 0}s`} />
          </div>
        </div>
      )}
    </div>
  )
}
