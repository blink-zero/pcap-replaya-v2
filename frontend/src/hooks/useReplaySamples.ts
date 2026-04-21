import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReplayStatus } from '../services/api'

interface Sample {
  t: number
  packets: number
  bytes: number
}

// Short enough to feel responsive, long enough to smooth the 4Hz throttled
// WebSocket updates from the backend.
const WINDOW_MS = 5000
const MAX_SAMPLES = 240

export interface ReplaySamples {
  samples: Sample[]
  pps: number
  mbps: number
  etaSeconds: number | null
  sparkPath: string
}

export function useReplaySamples(status: ReplayStatus): ReplaySamples {
  const [samples, setSamples] = useState<Sample[]>([])
  const lastReplayIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // A new replay ID means a new buffer — don't bridge two unrelated runs.
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

  return { samples, pps, mbps, etaSeconds, sparkPath }
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds)) return '—'
  if (seconds < 1) return '<1s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}
