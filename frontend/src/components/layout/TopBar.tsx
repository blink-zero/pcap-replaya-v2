import { useCallback } from 'react'
import { Search, Command, HelpCircle } from 'lucide-react'
import { useReplayStatusContext } from '../../contexts/ReplayStatusContext'
import { StatusDot } from '../ui/StatusDot'

interface Props {
  onOpenPalette: () => void
  onOpenHelp: () => void
}

export function TopBar({ onOpenPalette, onOpenHelp }: Props) {
  const { replayStatus } = useReplayStatusContext()
  const running = replayStatus.status === 'running' || replayStatus.status === 'starting'

  const handlePalette = useCallback(() => onOpenPalette(), [onOpenPalette])

  return (
    <div className="sticky top-0 z-20 h-12 flex items-center gap-3 px-4 lg:px-6 bg-base/85 backdrop-blur-md border-b border-line-subtle">
      {/* Leave space for the mobile hamburger (sidebar renders it fixed at top-3 left-3) */}
      <div className="w-9 lg:w-0 shrink-0" />

      {/* Live replay breadcrumb-ish strip — only when a replay is running.
          Lets users know the system is busy even when they've navigated
          away from the replay page. */}
      {running && (
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <StatusDot variant="accent" pulsing size={7} />
          <span className="text-ink-muted">
            Replaying <span className="text-ink font-medium">{replayStatus.filename ?? '—'}</span>
          </span>
          <span className="text-ink-ghost font-mono">
            {Math.round(replayStatus.progress_percent)}%
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Search / command palette launcher — primary affordance */}
      <button
        onClick={handlePalette}
        className="flex items-center gap-2 h-8 pl-2 pr-1 rounded-md border border-line bg-panel-sunken/70 hover:bg-panel-raised/60 text-ink-faint hover:text-ink transition-colors min-w-[12rem]"
        aria-label="Open command palette"
      >
        <Search size={13} className="shrink-0" />
        <span className="text-xs flex-1 text-left">Search or run a command…</span>
        <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded border border-line text-[10px] font-mono text-ink-ghost">
          <Command size={9} /> K
        </span>
      </button>

      {/* Help */}
      <button
        onClick={onOpenHelp}
        className="h-8 w-8 flex items-center justify-center rounded-md border border-line text-ink-faint hover:text-ink hover:bg-panel-raised transition-colors"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
      >
        <HelpCircle size={14} />
      </button>
    </div>
  )
}
