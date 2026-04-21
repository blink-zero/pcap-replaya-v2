import { createContext, useContext, type ReactNode } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { ReplayStatus } from '../services/api'

interface ReplayStatusValue {
  replayStatus: ReplayStatus
  connected: boolean
}

const ReplayStatusContext = createContext<ReplayStatusValue | null>(null)

/**
 * App-level provider of replay status. Opens a single WebSocket connection
 * that every page (and the sidebar / top bar) can subscribe to, so the
 * status footer and the progress monitor show the same truth without
 * duplicating WebSocket connections.
 */
export function ReplayStatusProvider({ children }: { children: ReactNode }) {
  const value = useWebSocket()
  return <ReplayStatusContext.Provider value={value}>{children}</ReplayStatusContext.Provider>
}

export function useReplayStatusContext(): ReplayStatusValue {
  const ctx = useContext(ReplayStatusContext)
  if (!ctx) {
    throw new Error('useReplayStatusContext must be used within ReplayStatusProvider')
  }
  return ctx
}
