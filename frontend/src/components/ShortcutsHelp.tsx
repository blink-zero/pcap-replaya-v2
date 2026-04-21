import { X, Keyboard } from 'lucide-react'

interface Shortcut {
  keys: string[]
  desc: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['?'], desc: 'Show this shortcuts reference' },
  { keys: ['F'], desc: 'Toggle fullscreen replay view (when a replay is active)' },
  { keys: ['Esc'], desc: 'Close any open dialog or exit fullscreen' },
]

interface Props {
  open: boolean
  onClose: () => void
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-200 shadow-[inset_0_-1px_0_0_rgb(24_24_27)]">
      {children}
    </kbd>
  )
}

export function ShortcutsHelp({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Keyboard shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="divide-y divide-zinc-800/50">
          {SHORTCUTS.map(s => (
            <li key={s.keys.join('+')} className="px-5 py-3 flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-300">{s.desc}</span>
              <div className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-zinc-500">+</span>}
                    <Key>{k}</Key>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">Shortcuts are ignored while typing in text inputs.</p>
        </div>
      </div>
    </div>
  )
}
