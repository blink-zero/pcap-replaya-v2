import { motion } from 'framer-motion'
import { Minimize2, Square } from 'lucide-react'
import type { ReplayStatus } from '../../services/api'
import { useReplaySamples, formatEta } from '../../hooks/useReplaySamples'
import { formatBytes, formatDuration, formatNumber, cn } from '../../lib/utils'

interface Props {
  status: ReplayStatus
  connected: boolean
  onExit: () => void
  onStop: () => void
}

export function FullscreenReplay({ status, connected, onExit, onStop }: Props) {
  const { pps, mbps, etaSeconds, sparkPath } = useReplaySamples(status)
  const isActive = status.status === 'running' || status.status === 'starting'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen replay monitor"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-900">
        <div className="flex items-center gap-4 min-w-0">
          <span className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            isActive ? 'bg-cyan-400 animate-pulse' : status.status === 'completed' ? 'bg-green-400' : 'bg-zinc-600',
          )} />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Replaying</p>
            <p className="text-base font-medium text-zinc-200 truncate">
              {status.filename ?? '—'}
              <span className="text-zinc-600"> · </span>
              <span className="text-zinc-400">{status.interface ?? '—'}</span>
              <span className="text-zinc-600"> · </span>
              <span className="text-zinc-400">
                {status.speed_unit === 'pps' ? `${status.speed} pps` : `${status.speed}x`}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs', connected ? 'text-green-400' : 'text-red-400')}>
            {connected ? '● connected' : '● disconnected'}
          </span>
          {isActive && (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              <Square size={14} fill="currentColor" /> Stop
            </button>
          )}
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-sm transition-colors"
            title="Exit fullscreen (F or Esc)"
          >
            <Minimize2 size={14} /> Exit
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-center px-8 py-8 gap-8 max-w-6xl w-full mx-auto">
        {/* Big progress bar */}
        <div>
          <div className="flex justify-between text-sm text-zinc-400 mb-3">
            <span>Progress</span>
            <span className="font-mono text-zinc-200">{Math.round(status.progress_percent)}%</span>
          </div>
          <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isActive ? 'bg-gradient-to-r from-cyan-500 to-cyan-300' : status.status === 'completed' ? 'bg-green-500' : 'bg-zinc-700',
              )}
              initial={false}
              animate={{ width: `${status.progress_percent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>
              {formatNumber(status.packets_sent)} / {formatNumber(status.total_packets)} packets
            </span>
            <span>
              ETA <span className="text-zinc-300">{formatEta(etaSeconds)}</span>
            </span>
          </div>
        </div>

        {/* Huge tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BigTile label="PPS" value={formatNumber(Math.round(pps))} />
          <BigTile label="Throughput" value={mbps >= 1 ? `${mbps.toFixed(1)} Mbps` : `${(mbps * 1000).toFixed(0)} kbps`} />
          <BigTile label="Bytes sent" value={formatBytes(status.bytes_sent)} />
          <BigTile label="Elapsed" value={formatDuration(status.elapsed_time)} />
        </div>

        {/* Big sparkline */}
        {sparkPath && (
          <div>
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">PPS trend</p>
            <svg
              width="100%"
              height="140"
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
              className="bg-zinc-900/50 rounded-lg border border-zinc-900"
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

        {status.loop_count > 1 && (
          <div className="text-center">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Loops completed</span>
            <p className="text-3xl font-semibold text-cyan-400 mt-1">{status.loop_count}</p>
          </div>
        )}
      </div>

      {/* Hint footer */}
      <div className="px-8 py-3 border-t border-zinc-900 flex items-center justify-center text-xs text-zinc-600">
        Press <kbd className="mx-1.5 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-[10px]">F</kbd>
        or <kbd className="mx-1.5 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-[10px]">Esc</kbd>
        to exit
      </div>
    </motion.div>
  )
}

function BigTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-900 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-semibold text-zinc-100 mt-1 font-mono tabular-nums">{value}</p>
    </div>
  )
}
