import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReplayStatus } from '../services/api'

const DEFAULT_STATUS: ReplayStatus = {
  speed: 1,
  speed_unit: 'multiplier',
  continuous: false,
  status: 'idle',
  packets_sent: 0,
  bytes_sent: 0,
  progress_percent: 0,
  elapsed_time: 0,
  loop_count: 0,
}

export function useWebSocket() {
  const [replayStatus, setReplayStatus] = useState<ReplayStatus>(DEFAULT_STATUS)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/replay`)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ReplayStatus
        setReplayStatus(data)
      } catch (_) { /* ignore */ }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const reset = useCallback(() => setReplayStatus(DEFAULT_STATUS), [])

  return { replayStatus, connected, reset }
}
