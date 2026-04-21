import { motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import type { ReplayStatus } from '../../services/api'
import { useReplaySamples, formatEta } from '../../hooks/useReplaySamples'
import { formatBytes, formatDuration, formatNumber, cn } from '../../lib/utils'

interface Props {
  status: ReplayStatus
  connected: boolean
}

export function ProgressMonitor({ status, connected }: Props) {
  const isActive = status.status === 'running'
  const { pps, mbps, etaSeconds, sparkPath } = useReplaySamples(status)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Live Progress</h2>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
          <span className={cn('text-xs', connected ? 'text-green-400' : 'text-red-400')}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
            <span>Progress</span>
            <span>{Math.round(status.progress_percent)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isActive ? 'bg-cyan-500' : status.status === 'completed' ? 'bg-green-500' : 'bg-zinc-600'
              )}
              initial={false}
              animate={{ width: `${status.progress_percent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Packets Sent</p>
            <p className="text-lg font-semibold text-zinc-100">{formatNumber(status.packets_sent)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Bytes Sent</p>
            <p className="text-lg font-semibold text-zinc-100">{formatBytes(status.bytes_sent)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Elapsed Time</p>
            <p className="text-lg font-semibold text-zinc-100">{formatDuration(status.elapsed_time)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">ETA</p>
            <p className="text-lg font-semibold text-zinc-100">{formatEta(etaSeconds)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">PPS (live)</p>
            <p className="text-lg font-semibold text-zinc-100">{formatNumber(Math.round(pps))}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Throughput</p>
            <p className="text-lg font-semibold text-zinc-100">{mbps >= 1 ? `${mbps.toFixed(1)} Mbps` : `${(mbps * 1000).toFixed(0)} kbps`}</p>
          </div>
        </div>

        {/* Sparkline — PPS over time */}
        {sparkPath && (
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">PPS trend</p>
            <svg
              width="100%"
              height="40"
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
              className="bg-zinc-800/30 rounded-lg"
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

        {/* Loop count for continuous */}
        {status.loop_count > 0 && (
          <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
            <span className="text-xs text-zinc-500">Loops Completed</span>
            <span className="text-sm font-semibold text-cyan-400">{status.loop_count}</span>
          </div>
        )}

        {/* Idle state */}
        {status.status === 'idle' && (
          <p className="text-sm text-zinc-500 text-center py-2">No active replay</p>
        )}
      </div>
    </div>
  )
}
