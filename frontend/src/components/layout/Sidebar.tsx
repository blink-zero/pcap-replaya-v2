import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Play, History, Settings, Menu, X, Radio } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/replay', icon: Play, label: 'Upload & Replay' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Radio size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">PCAP Replaya</h1>
            <p className="text-xs text-zinc-500">v2.0</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">tcpreplay frontend</p>
        </div>
      </aside>
    </>
  )
}
