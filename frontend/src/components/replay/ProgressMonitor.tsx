import { motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import type { ReplayStatus } from '../../services/api'
import { useReplaySamples, formatEta } from '../../hooks/useReplaySamples'
import { formatBytes, formatDuration, formatNumber, cn } from '../../lib/utils'
import { Panel } from '../ui'

interface Props {
  status: ReplayStatus
  connected: boolean
}

export function ProgressMonitor({ status, connected }: Props) {
  const isActive = status.status === 'running'
  const { pps, mbps, etaSeconds, sparkPath } = useReplaySamples(status)

  const connIndicator = (
    <div className="flex items-center gap-1.5">
      {connected ? <Wifi size={13} className="text-success" /> : <WifiOff size={13} className="text-danger" />}
      <span className={cn('text-xs', connected ? 'text-success' : 'text-danger')}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )

  return (
    <Panel title="Live progress" actions={connIndicator}>
      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[11px] uppercase tracking-[0.08em] text-ink-faint mb-1.5">
            <span>Progress</span>
            <span className="font-mono text-ink">{Math.round(status.progress_percent)}%</span>
          </div>
          <div className="h-1.5 bg-panel-sunken rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isActive ? 'bg-cyan-500' : status.status === 'completed' ? 'bg-success' : 'bg-line-strong'
              )}
              initial={false}
              animate={{ width: `${status.progress_percent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Packets sent" value={formatNumber(status.packets_sent)} />
          <Tile label="Bytes sent"   value={formatBytes(status.bytes_sent)} />
          <Tile label="Elapsed"      value={formatDuration(status.elapsed_time)} />
          <Tile label="ETA"          value={formatEta(etaSeconds)} />
          <Tile label="PPS (live)"   value={formatNumber(Math.round(pps))} />
          <Tile label="Throughput"   value={mbps >= 1 ? `${mbps.toFixed(1)} Mbps` : `${(mbps * 1000).toFixed(0)} kbps`} />
        </div>

        {/* Sparkline — PPS over time */}
        {sparkPath && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint mb-1.5">PPS trend</p>
            <svg
              width="100%"
              height="40"
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
              className="bg-panel-sunken rounded-md"
            >
              <path
                d={sparkPath}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="text-cyan-400"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}

        {status.loop_count > 0 && (
          <div className="flex items-center justify-between bg-panel-sunken rounded-md px-3 py-2">
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">Loops completed</span>
            <span className="text-sm font-semibold text-cyan-400 font-mono">{status.loop_count}</span>
          </div>
        )}

        {status.status === 'idle' && (
          <p className="text-sm text-ink-faint text-center py-2">No active replay</p>
        )}
      </div>
    </Panel>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel-sunken rounded-md px-3 py-2 border border-line-subtle">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <p className="text-base font-semibold text-ink font-mono tabular-nums">{value}</p>
    </div>
  )
}
