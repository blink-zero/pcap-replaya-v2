import { useEffect, useState } from 'react'
import { Trash2, Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  getInterfaces, getProfiles, deleteProfile, getVersion, getSystemStatus,
  type NetworkInterface, type ConfigProfile, type VersionResponse, type SystemStatus
} from '../../services/api'
import { formatBytes } from '../../lib/utils'

export function Settings() {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
  const [defaultInterface, setDefaultInterface] = useState(() => localStorage.getItem('defaultInterface') || '')
  const [profiles, setProfiles] = useState<ConfigProfile[]>([])
  const [version, setVersion] = useState<VersionResponse | null>(null)
  const [system, setSystem] = useState<SystemStatus | null>(null)

  useEffect(() => {
    getInterfaces().then(setInterfaces).catch(() => {})
    getProfiles().then(setProfiles).catch(() => {})
    getVersion().then(setVersion).catch(() => {})
    getSystemStatus().then(setSystem).catch(() => {})
  }, [])

  const handleDefaultInterface = (v: string) => {
    setDefaultInterface(v)
    localStorage.setItem('defaultInterface', v)
    toast.success('Default interface saved')
  }

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteProfile(id)
      toast.success('Profile deleted')
      getProfiles().then(setProfiles).catch(() => {})
    } catch {
      toast.error('Failed to delete profile')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Default Interface */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Default Network Interface</h2>
          <select
            value={defaultInterface}
            onChange={(e) => handleDefaultInterface(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">None</option>
            {interfaces.map(i => (
              <option key={i.name} value={i.name}>
                {i.name} {i.addresses?.[0]?.address ? `(${i.addresses[0].address})` : ''} {!i.is_up ? '(down)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 mt-2">Pre-selected when starting new replays</p>
        </div>

        {/* Config Profiles */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-200">Config Profiles</h2>
          </div>
          {profiles.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">
              No profiles saved. Create one from the Replay page.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {profiles.map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-200">{p.name}</p>
                    <p className="text-xs text-zinc-500">
                      {p.interface}
                      {p.speed_unit === 'multiplier' ? ` · ${p.speed}x speed` : ` · ${p.speed} PPS`}
                      {p.continuous ? ' · Continuous' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteProfile(p.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">System Information</h2>
          <div className="space-y-2 text-sm">
            {system && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CPU Usage</span>
                  <span className="text-zinc-300">{system.cpu_percent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Memory</span>
                  <span className="text-zinc-300">{formatBytes(system.memory_used)} / {formatBytes(system.memory_total)} ({system.memory_percent.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Disk</span>
                  <span className="text-zinc-300">{formatBytes(system.disk_used)} / {formatBytes(system.disk_total)} ({system.disk_percent.toFixed(1)}%)</span>
                </div>
              </>
            )}
            {interfaces.length > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Interfaces</span>
                <span className="text-zinc-300">{interfaces.filter(i => i.is_up).length} active / {interfaces.length} total</span>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-200">About</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Application</span>
              <span className="text-zinc-300">{version?.name || 'PCAP Replaya'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Version</span>
              <span className="text-zinc-300">{version?.version || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Engine</span>
              <span className="text-zinc-300">tcpreplay</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Frontend</span>
              <span className="text-zinc-300">React 18 + Tailwind CSS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Backend</span>
              <span className="text-zinc-300">FastAPI + SQLite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
