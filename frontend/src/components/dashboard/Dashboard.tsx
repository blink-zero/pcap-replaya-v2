import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Cpu, HardDrive, MemoryStick, Package, Clock, Zap,
  CheckCircle2, XCircle, StopCircle, ArrowRight,
} from 'lucide-react'
import {
  getSystemStatus, getHistoryStats, getVersion,
  type SystemStatus, type HistoryStats, type VersionResponse,
} from '../../services/api'
import { cn, formatBytes, formatDate, formatNumber } from '../../lib/utils'

/* ---------- gauges ---------- */

function GaugeCard({ icon: Icon, label, percent, sub, accent }: {
  icon: typeof Cpu
  label: string
  percent: number | null
  sub?: string
  accent: string
}) {
  const pct = percent ?? 0
  const safePct = Math.max(0, Math.min(100, pct))
  // Tone the bar color red once utilisation is in alarm territory.
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : accent
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-sm font-semibold text-zinc-200 tabular-nums">
          {percent === null ? '—' : `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone)}
          style={{ width: `${safePct}%` }}
        />
      </div>
      {sub && <p className="text-xs text-zinc-500 mt-2">{sub}</p>}
    </div>
  )
}

/* ---------- big metric tile ---------- */

function MetricTile({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Activity
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 overflow-hidden">
      <div className={cn('absolute top-0 left-0 w-full h-0.5', accent)} />
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-zinc-500" />
        <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-zinc-100 font-mono tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

/* ---------- recent packets bar chart ---------- */

function RecentChart({ recent }: { recent: HistoryStats['recent'] }) {
  // Render newest-on-the-right, which matches normal time-axis reading.
  const series = recent.slice().reverse()
  if (series.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-zinc-500">
        No replay history yet
      </div>
    )
  }
  const max = Math.max(1, ...series.map(r => r.packets_sent))
  return (
    <div className="h-28 flex items-end gap-1 px-1">
      {series.map(r => {
        const h = Math.max(2, Math.round((r.packets_sent / max) * 100))
        const color =
          r.status === 'failed' ? 'bg-red-500/70' :
          r.status === 'stopped' ? 'bg-amber-500/70' :
          'bg-cyan-500/80'
        return (
          <div key={r.id} className="flex-1 group relative" title={`${r.filename}: ${formatNumber(r.packets_sent)} packets`}>
            <div className={cn('rounded-t transition-colors group-hover:opacity-100 opacity-80', color)} style={{ height: `${h}%` }} />
          </div>
        )
      })}
    </div>
  )
}

/* ---------- outcome breakdown bar ---------- */

function OutcomeBar({ stats }: { stats: HistoryStats }) {
  const total = stats.total || 1
  const completedPct = (stats.completed / total) * 100
  const failedPct = (stats.failed / total) * 100
  const stoppedPct = (stats.stopped / total) * 100
  return (
    <div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
        <div className="bg-green-500/70" style={{ width: `${completedPct}%` }} />
        <div className="bg-red-500/70" style={{ width: `${failedPct}%` }} />
        <div className="bg-amber-500/70" style={{ width: `${stoppedPct}%` }} />
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-green-400" /> {stats.completed} completed
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle size={12} className="text-red-400" /> {stats.failed} failed
        </span>
        <span className="flex items-center gap-1.5">
          <StopCircle size={12} className="text-amber-400" /> {stats.stopped} stopped
        </span>
      </div>
    </div>
  )
}

/* ---------- page ---------- */

export function Dashboard() {
  const [system, setSystem] = useState<SystemStatus | null>(null)
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [version, setVersion] = useState<VersionResponse | null>(null)

  useEffect(() => {
    const load = () => {
      getSystemStatus().then(setSystem).catch(() => {})
      getHistoryStats().then(setStats).catch(() => {})
    }
    load()
    getVersion().then(setVersion).catch(() => {})
    // Keep the system gauges ticking. Cheap endpoint, 5-second cadence.
    const handle = setInterval(load, 5000)
    return () => clearInterval(handle)
  }, [])

  const successRate = stats && stats.total > 0 ? (stats.completed / stats.total) * 100 : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Command Center</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {version ? `${version.name} · v${version.version}` : 'Live system & replay overview'}
          </p>
        </div>
        <Link
          to="/replay"
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm transition-colors"
        >
          <Zap size={14} /> Start a replay
        </Link>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricTile
          icon={Activity}
          label="Total replays"
          value={stats ? formatNumber(stats.total) : '—'}
          sub={stats && stats.avg_duration > 0 ? `avg ${stats.avg_duration.toFixed(1)}s each` : undefined}
          accent="bg-cyan-500/60"
        />
        <MetricTile
          icon={Package}
          label="Packets lifetime"
          value={stats ? formatNumber(stats.total_packets) : '—'}
          accent="bg-violet-500/60"
        />
        <MetricTile
          icon={HardDrive}
          label="Bytes lifetime"
          value={stats ? formatBytes(stats.total_bytes) : '—'}
          accent="bg-emerald-500/60"
        />
        <MetricTile
          icon={CheckCircle2}
          label="Success rate"
          value={successRate !== null ? `${successRate.toFixed(0)}%` : '—'}
          sub={stats && stats.total > 0 ? `${stats.completed} of ${stats.total}` : undefined}
          accent="bg-amber-500/60"
        />
      </div>

      {/* System gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <GaugeCard icon={Cpu} label="CPU" percent={system?.cpu_percent ?? null} accent="bg-cyan-500" />
        <GaugeCard
          icon={MemoryStick}
          label="Memory"
          percent={system?.memory_percent ?? null}
          sub={system ? `${formatBytes(system.memory_used)} / ${formatBytes(system.memory_total)}` : undefined}
          accent="bg-cyan-500"
        />
        <GaugeCard
          icon={HardDrive}
          label="Disk"
          percent={system?.disk_percent ?? null}
          sub={system ? `${formatBytes(system.disk_used)} / ${formatBytes(system.disk_total)}` : undefined}
          accent="bg-cyan-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Recent replay volume</h2>
            <span className="text-xs text-zinc-500">packets per run · last 20</span>
          </div>
          {stats ? <RecentChart recent={stats.recent} /> : <div className="h-28" />}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Outcome mix</h2>
          {stats && stats.total > 0 ? <OutcomeBar stats={stats} /> : (
            <div className="h-16 flex items-center text-xs text-zinc-500">
              No outcomes to chart yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-200">Recent activity</h2>
          </div>
          <Link to="/history" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {!stats || stats.recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            No replay activity yet. Start one from the Replay page.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {stats.recent.slice(0, 6).map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{r.filename}</p>
                  <p className="text-xs text-zinc-500">
                    {formatNumber(r.packets_sent)} packets · {formatBytes(r.bytes_sent)}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
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
    </div>
  )
}
