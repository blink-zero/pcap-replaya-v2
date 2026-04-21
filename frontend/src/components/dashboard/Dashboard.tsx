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
import { Panel, PageHeader, Badge } from '../ui'

/* ───── primitives local to this page ───── */

function GaugeCard({ icon: Icon, label, percent, sub }: {
  icon: typeof Cpu
  label: string
  percent: number | null
  sub?: string
}) {
  const pct = percent ?? 0
  const safePct = Math.max(0, Math.min(100, pct))
  const tone = pct >= 90 ? 'bg-danger' : pct >= 75 ? 'bg-warn' : 'bg-cyan-500'
  return (
    <Panel padding="sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-ink-faint" />
          <span className="text-[11px] text-ink-faint uppercase tracking-[0.08em]">{label}</span>
        </div>
        <span className="text-sm font-semibold text-ink tabular-nums">
          {percent === null ? '—' : `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-1.5 bg-panel-sunken rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone)}
          style={{ width: `${safePct}%` }}
        />
      </div>
      {sub && <p className="text-[11px] text-ink-faint mt-2 font-mono">{sub}</p>}
    </Panel>
  )
}

function MetricTile({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Activity
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="relative bg-panel border border-line rounded-lg p-4 overflow-hidden">
      <div className={cn('absolute top-0 left-0 w-full h-0.5', accent)} />
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className="text-ink-faint" />
        <span className="text-[11px] text-ink-faint uppercase tracking-[0.08em]">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-ink font-mono tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-ink-faint mt-1">{sub}</p>}
    </div>
  )
}

function RecentChart({ recent }: { recent: HistoryStats['recent'] }) {
  const series = recent.slice().reverse()
  if (series.length === 0) {
    return <div className="h-24 flex items-center justify-center text-xs text-ink-faint">No replay history yet</div>
  }
  const max = Math.max(1, ...series.map(r => r.packets_sent))
  return (
    <div className="h-24 flex items-end gap-1">
      {series.map(r => {
        const h = Math.max(2, Math.round((r.packets_sent / max) * 100))
        const color =
          r.status === 'failed' ? 'bg-danger/70' :
          r.status === 'stopped' ? 'bg-warn/70' :
          'bg-cyan-500/75'
        return (
          <div key={r.id} className="flex-1 group relative" title={`${r.filename}: ${formatNumber(r.packets_sent)} packets`}>
            <div
              className={cn('rounded-t transition-[opacity,background] group-hover:opacity-100 opacity-85', color)}
              style={{ height: `${h}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function OutcomeBar({ stats }: { stats: HistoryStats }) {
  const total = stats.total || 1
  const completedPct = (stats.completed / total) * 100
  const failedPct = (stats.failed / total) * 100
  const stoppedPct = (stats.stopped / total) * 100
  return (
    <div>
      <div className="h-2 bg-panel-sunken rounded-full overflow-hidden flex">
        <div className="bg-success/70" style={{ width: `${completedPct}%` }} />
        <div className="bg-danger/70" style={{ width: `${failedPct}%` }} />
        <div className="bg-warn/70"   style={{ width: `${stoppedPct}%` }} />
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-ink-faint font-mono">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-success" /> {stats.completed} completed</span>
        <span className="flex items-center gap-1.5"><XCircle size={12} className="text-danger" /> {stats.failed} failed</span>
        <span className="flex items-center gap-1.5"><StopCircle size={12} className="text-warn" /> {stats.stopped} stopped</span>
      </div>
    </div>
  )
}

/* ───── page ───── */

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
    const handle = setInterval(load, 5000)
    return () => clearInterval(handle)
  }, [])

  const successRate = stats && stats.total > 0 ? (stats.completed / stats.total) * 100 : null

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Command Center"
        description={version ? `${version.name} · v${version.version}` : 'Live system and replay overview'}
        actions={
          <Link
            to="/replay"
            className="flex items-center gap-2 px-3 h-9 bg-cyan-500 hover:bg-cyan-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Zap size={14} /> Start a replay
          </Link>
        }
      />

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
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

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <GaugeCard icon={Cpu} label="CPU" percent={system?.cpu_percent ?? null} />
        <GaugeCard
          icon={MemoryStick}
          label="Memory"
          percent={system?.memory_percent ?? null}
          sub={system ? `${formatBytes(system.memory_used)} / ${formatBytes(system.memory_total)}` : undefined}
        />
        <GaugeCard
          icon={HardDrive}
          label="Disk"
          percent={system?.disk_percent ?? null}
          sub={system ? `${formatBytes(system.disk_used)} / ${formatBytes(system.disk_total)}` : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <Panel
          className="lg:col-span-2"
          title="Recent replay volume"
          description="packets per run · last 20"
        >
          {stats ? <RecentChart recent={stats.recent} /> : <div className="h-24" />}
        </Panel>
        <Panel title="Outcome mix">
          {stats && stats.total > 0 ? <OutcomeBar stats={stats} /> : (
            <div className="h-16 flex items-center text-xs text-ink-faint">No outcomes to chart yet</div>
          )}
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel
        title={<span className="flex items-center gap-2"><Clock size={14} className="text-ink-faint" /> Recent activity</span>}
        actions={
          <Link to="/history" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        }
        padding="none"
      >
        {!stats || stats.recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-faint text-sm">
            No replay activity yet. Start one from the Replay page.
          </div>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {stats.recent.slice(0, 6).map(r => (
              <li key={r.id} className="px-5 py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{r.filename}</p>
                  <p className="text-xs text-ink-faint font-mono">
                    {formatNumber(r.packets_sent)} packets · {formatBytes(r.bytes_sent)}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                  <Badge
                    size="xs"
                    variant={
                      r.status === 'completed' ? 'success' :
                      r.status === 'failed'    ? 'danger' :
                                                 'warn'
                    }
                  >
                    {r.status}
                  </Badge>
                  <p className="text-[11px] text-ink-faint">{formatDate(r.started_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
