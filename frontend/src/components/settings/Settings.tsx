import { useEffect, useState } from 'react'
import { Trash2, Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  getInterfaces, getProfiles, deleteProfile, getVersion, getSystemStatus,
  type NetworkInterface, type ConfigProfile, type VersionResponse, type SystemStatus
} from '../../services/api'
import { formatBytes } from '../../lib/utils'
import { ThemePicker } from './ThemePicker'
import { Panel, PageHeader } from '../ui'

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
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Preferences, saved replay profiles, and system info."
      />

      <div className="space-y-5 max-w-3xl">
        <ThemePicker />

        <Panel title="Default network interface" description="Pre-selected when starting new replays.">
          <select
            value={defaultInterface}
            onChange={(e) => handleDefaultInterface(e.target.value)}
            className="w-full bg-panel-sunken border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">None</option>
            {interfaces.map(i => (
              <option key={i.name} value={i.name}>
                {i.name} {i.addresses?.[0]?.address ? `(${i.addresses[0].address})` : ''} {!i.is_up ? '(down)' : ''}
              </option>
            ))}
          </select>
        </Panel>

        <Panel
          title="Replay profiles"
          description={profiles.length > 0 ? `${profiles.length} saved` : 'None saved'}
          padding="none"
        >
          {profiles.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-faint">
              No profiles saved. Create one from the Replay page.
            </div>
          ) : (
            <ul className="divide-y divide-line-subtle">
              {profiles.map(p => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{p.name}</p>
                    <p className="text-xs text-ink-faint font-mono">
                      {p.interface}
                      {p.speed_unit === 'multiplier' ? ` · ${p.speed}x speed` : ` · ${p.speed} PPS`}
                      {p.continuous ? ' · continuous' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteProfile(p.id)}
                    className="p-1.5 text-ink-ghost hover:text-danger transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="System">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
            {system && (
              <>
                <dt className="text-ink-faint">CPU</dt>
                <dd className="text-ink font-mono">{system.cpu_percent.toFixed(1)}%</dd>
                <dt className="text-ink-faint">Memory</dt>
                <dd className="text-ink font-mono">
                  {formatBytes(system.memory_used)} / {formatBytes(system.memory_total)}
                  <span className="text-ink-faint"> ({system.memory_percent.toFixed(1)}%)</span>
                </dd>
                <dt className="text-ink-faint">Disk</dt>
                <dd className="text-ink font-mono">
                  {formatBytes(system.disk_used)} / {formatBytes(system.disk_total)}
                  <span className="text-ink-faint"> ({system.disk_percent.toFixed(1)}%)</span>
                </dd>
              </>
            )}
            {interfaces.length > 0 && (
              <>
                <dt className="text-ink-faint">Interfaces</dt>
                <dd className="text-ink">{interfaces.filter(i => i.is_up).length} up / {interfaces.length} total</dd>
              </>
            )}
          </dl>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Info size={14} className="text-cyan-400" /> About
            </span>
          }
        >
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-ink-faint">Application</dt>
            <dd className="text-ink">{version?.name ?? 'PCAP Replaya'}</dd>
            <dt className="text-ink-faint">Version</dt>
            <dd className="text-ink font-mono">{version?.version ?? '—'}</dd>
            <dt className="text-ink-faint">Replay engine</dt>
            <dd className="text-ink font-mono">tcpreplay</dd>
            <dt className="text-ink-faint">Frontend</dt>
            <dd className="text-ink">React 19 · Tailwind CSS v4</dd>
            <dt className="text-ink-faint">Backend</dt>
            <dd className="text-ink">FastAPI · SQLite</dd>
          </dl>
        </Panel>
      </div>
    </div>
  )
}
