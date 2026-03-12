import { useEffect, useState } from 'react'
import { Activity, FileUp, Cpu, HardDrive, MemoryStick, Clock } from 'lucide-react'
import { getSystemStatus, getHistory, getVersion, type SystemStatus, type HistoryItem, type VersionResponse } from '../../services/api'
import { cn, formatBytes, formatDate, formatNumber } from '../../lib/utils'

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Activity; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

export function Dashboard() {
  const [system, setSystem] = useState<SystemStatus | null>(null)
  const [recentReplays, setRecentReplays] = useState<HistoryItem[]>([])
  const [totalReplays, setTotalReplays] = useState(0)
  const [version, setVersion] = useState<VersionResponse | null>(null)

  useEffect(() => {
    getSystemStatus().then(setSystem).catch(() => {})
    getHistory({ limit: 5, sort: 'started_at', order: 'desc' })
      .then(r => { setRecentReplays(r.items); setTotalReplays(r.total) })
      .catch(() => {})
    getVersion().then(setVersion).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Activity}
          label="Total Replays"
          value={formatNumber(totalReplays)}
          color="bg-cyan-500/10 text-cyan-400"
        />
        <StatCard
          icon={Cpu}
          label="CPU Usage"
          value={system ? `${system.cpu_percent.toFixed(1)}%` : '—'}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={MemoryStick}
          label="Memory"
          value={system ? `${system.memory_percent.toFixed(1)}%` : '—'}
          sub={system ? `${formatBytes(system.memory_used)} / ${formatBytes(system.memory_total)}` : undefined}
          color="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          icon={HardDrive}
          label="Disk"
          value={system ? `${system.disk_percent.toFixed(1)}%` : '—'}
          sub={system ? `${formatBytes(system.disk_used)} / ${formatBytes(system.disk_total)}` : undefined}
          color="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Recent Replay Activity</h2>
          <Clock size={16} className="text-zinc-500" />
        </div>
        {recentReplays.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            No replay activity yet. Go to Upload & Replay to get started.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {recentReplays.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileUp size={16} className="text-zinc-500" />
                  <div>
                    <p className="text-sm text-zinc-200">{r.filename}</p>
                    <p className="text-xs text-zinc-500">{r.interface} · {formatNumber(r.packets_sent)} packets · {formatBytes(r.bytes_sent)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'inline-block px-2 py-0.5 rounded text-xs font-medium',
                    r.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    r.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  )}>
                    {r.status}
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">{formatDate(r.started_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Info */}
      {version && (
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200 mb-2">System Info</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-zinc-500">Version</span>
            <span className="text-zinc-300">{version.version}</span>
            <span className="text-zinc-500">Application</span>
            <span className="text-zinc-300">{version.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
