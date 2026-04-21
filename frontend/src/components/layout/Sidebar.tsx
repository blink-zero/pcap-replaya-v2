import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Play, History, Settings, Menu, X,
  ArrowLeftRight, Radio, Command,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Logo } from '../Logo'
import { StatusDot } from '../ui/StatusDot'
import { useReplayStatusContext } from '../../contexts/ReplayStatusContext'

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
}

const workflow: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/replay', icon: Play, label: 'Upload & Replay' },
  { to: '/compare', icon: ArrowLeftRight, label: 'Compare' },
  { to: '/history', icon: History, label: 'History' },
]
const system: NavItem[] = [
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function NavGroup({ label, items, onNavigate }: { label: string; items: NavItem[]; onNavigate: () => void }) {
  return (
    <div className="py-2">
      <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-ghost">{label}</p>
      <div className="space-y-0.5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors border border-transparent',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                  : 'text-ink-muted hover:text-ink hover:bg-panel-raised/60',
              )
            }
          >
            <Icon size={15} className="shrink-0 opacity-80 group-[.active]:opacity-100" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

function StatusFooter() {
  const { replayStatus, connected } = useReplayStatusContext()
  const running = replayStatus.status === 'running' || replayStatus.status === 'starting'

  return (
    <div className="px-4 py-3 border-t border-line-subtle space-y-3">
      {/* Replay status row */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.08em] text-ink-ghost mb-1.5">Replay</p>
        {running ? (
          <div className="flex items-start gap-2">
            <StatusDot variant="accent" pulsing size={9} className="mt-1.5" label="Replay running" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink truncate">{replayStatus.filename ?? 'Replaying…'}</p>
              <p className="text-[11px] text-ink-faint font-mono">
                {Math.round(replayStatus.progress_percent)}%
                {replayStatus.interface && <> · <span className="text-ink-ghost">{replayStatus.interface}</span></>}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <StatusDot variant="neutral" size={9} label="Idle" />
            <span className="text-xs text-ink-faint">
              {replayStatus.status === 'idle' ? 'Idle' :
               replayStatus.status === 'completed' ? 'Last run completed' :
               replayStatus.status === 'failed' ? 'Last run failed' :
               replayStatus.status === 'stopped' ? 'Last run stopped' : 'Idle'}
            </span>
          </div>
        )}
      </div>

      {/* Connection + keyboard hint */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5">
          <StatusDot variant={connected ? 'success' : 'danger'} size={6} />
          <span className="text-ink-faint">{connected ? 'Connected' : 'Disconnected'}</span>
        </span>
        <span className="flex items-center gap-1 text-ink-ghost">
          <Command size={10} />
          <kbd className="font-mono text-[10px]">K</kbd>
        </span>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-md bg-panel border border-line text-ink-muted hover:text-ink hover:bg-panel-raised"
        aria-label="Toggle navigation"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={close} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-60 bg-base border-r border-line-subtle flex flex-col transition-transform duration-150',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-line-subtle">
          <Logo size={32} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold text-ink leading-tight tracking-tight">PCAP Replaya</h1>
            <p className="text-[10px] text-ink-faint tracking-wide uppercase flex items-center gap-1">
              <Radio size={9} /> Capture · replay
            </p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <NavGroup label="Workflow" items={workflow} onNavigate={close} />
          <NavGroup label="System"   items={system}   onNavigate={close} />
        </nav>

        {/* Live status footer */}
        <StatusFooter />
      </aside>
    </>
  )
}
