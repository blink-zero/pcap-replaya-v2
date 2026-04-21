import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import type { ReplayStatus } from '../../services/api'
import { formatBytes, formatDuration, formatNumber, cn } from '../../lib/utils'

interface Props {
  status: ReplayStatus
  connected: boolean
}

interface Sample {
  t: number
  packets: number
  bytes: number
}

// Samples older than this are dropped; the most recent ones define the
// live rate window. Short enough to feel responsive, long enough to
// smooth out the 4Hz throttled WebSocket updates from the backend.
const WINDOW_MS = 5000
const MAX_SAMPLES = 240

function formatEta(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds)) return '—'
  if (seconds < 1) return '<1s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export function ProgressMonitor({ status, connected }: Props) {
  const isActive = status.status === 'running'
  const [samples, setSamples] = useState<Sample[]>([])
  const lastReplayIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // New replay started — drop previous samples so the chart doesn't
    // span two unrelated runs.
    if (status.replay_id !== lastReplayIdRef.current) {
      lastReplayIdRef.current = status.replay_id
      setSamples([])
    }
    if (status.status === 'running' || status.status === 'starting') {
      setSamples(prev => {
        const next = [...prev, { t: Date.now(), packets: status.packets_sent, bytes: status.bytes_sent }]
        return next.length > MAX_SAMPLES ? next.slice(-MAX_SAMPLES) : next
      })
    }
  }, [status.replay_id, status.packets_sent, status.bytes_sent, status.status])

  const { pps, mbps, etaSeconds } = useMemo(() => {
    if (samples.length < 2) return { pps: 0, mbps: 0, etaSeconds: null as number | null }
    const newest = samples[samples.length - 1]
    const windowStart = newest.t - WINDOW_MS
    const oldest = samples.find(s => s.t >= windowStart) ?? samples[0]
    const dt = (newest.t - oldest.t) / 1000
    if (dt <= 0) return { pps: 0, mbps: 0, etaSeconds: null as number | null }
    const pps = (newest.packets - oldest.packets) / dt
    const mbps = ((newest.bytes - oldest.bytes) * 8) / dt / 1_000_000
    const remaining = Math.max(0, status.total_packets - status.packets_sent)
    const etaSeconds = pps > 0 && remaining > 0 ? remaining / pps : null
    return { pps, mbps, etaSeconds }
  }, [samples, status.total_packets, status.packets_sent])

  const sparkPath = useMemo(() => {
    if (samples.length < 3) return ''
    const perSample: number[] = []
    for (let i = 1; i < samples.length; i++) {
      const dt = (samples[i].t - samples[i - 1].t) / 1000
      const dp = samples[i].packets - samples[i - 1].packets
      perSample.push(dt > 0 ? dp / dt : 0)
    }
    const maxPps = Math.max(...perSample, 1)
    const t0 = samples[0].t
    const tmax = samples[samples.length - 1].t
    const tspan = Math.max(1, tmax - t0)
    return perSample
      .map((p, i) => {
        const x = ((samples[i + 1].t - t0) / tspan) * 200
        const y = 38 - (p / maxPps) * 34
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }, [samples])

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
