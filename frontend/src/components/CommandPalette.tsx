import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

export interface Command {
  id: string
  label: string
  hint?: string
  group?: string
  keywords?: string[]
  icon?: React.ReactNode
  onRun: () => void | Promise<void>
}

interface Props {
  open: boolean
  onClose: () => void
  commands: Command[]
}

// Tiny subsequence-match scorer. Rewards contiguous matches and matches that
// start at a word boundary. Zero for no match — the caller filters on that.
function score(command: Command, rawQuery: string): number {
  if (!rawQuery) return 1
  const q = rawQuery.toLowerCase()
  const haystack = [command.label, ...(command.keywords ?? [])].join(' ').toLowerCase()
  if (haystack.includes(q)) return q.length + (haystack.startsWith(q) ? 50 : 0)
  // Subsequence fallback: every char of q must appear in order.
  let qi = 0
  let gapPenalty = 0
  for (let i = 0; i < haystack.length && qi < q.length; i++) {
    if (haystack[i] === q[qi]) qi++
    else if (qi > 0) gapPenalty++
  }
  if (qi < q.length) return 0
  return q.length - gapPenalty * 0.1
}

export function CommandPalette({ open, onClose, commands }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset search state every time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      // Focus slightly after mount so the autofocus animation settles.
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [open])

  const filtered = useMemo(() => {
    return commands
      .map(c => ({ c, s: score(c, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.c)
  }, [commands, query])

  // Keep `selected` within bounds when the filtered list changes.
  useEffect(() => {
    if (selected >= filtered.length) setSelected(Math.max(0, filtered.length - 1))
  }, [filtered.length, selected])

  // Scroll the highlighted item into view on arrow-key nav.
  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const el = container.querySelector<HTMLElement>(`[data-command-index="${selected}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useKeyboardShortcut('Escape', onClose, { enabled: open, ignoreInInputs: false })

  if (!open) return null

  const runAt = async (i: number) => {
    const cmd = filtered[i]
    if (!cmd) return
    onClose()
    await cmd.onRun()
  }

  // Group in render order (commands already sorted by score so groups may
  // interleave — that's fine; the group label only renders when different
  // from the previous row).
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-24 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected(s => Math.min(filtered.length - 1, s + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected(s => Math.max(0, s - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                runAt(selected)
              }
            }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">No matches</div>
        ) : (
          <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
            {filtered.map((cmd, i) => {
              const prevGroup = i === 0 ? null : filtered[i - 1].group
              const showGroup = cmd.group && cmd.group !== prevGroup
              return (
                <div key={cmd.id}>
                  {showGroup && (
                    <p className="px-4 pt-3 pb-1 text-[10px] text-zinc-500 uppercase tracking-wider">{cmd.group}</p>
                  )}
                  <button
                    data-command-index={i}
                    onClick={() => runAt(i)}
                    onMouseEnter={() => setSelected(i)}
                    className={
                      'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ' +
                      (i === selected ? 'bg-cyan-500/10 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800/60')
                    }
                  >
                    {cmd.icon && <span className="shrink-0 text-zinc-500">{cmd.icon}</span>}
                    <span className="flex-1 text-sm truncate">{cmd.label}</span>
                    {cmd.hint && <span className="text-xs text-zinc-500 truncate">{cmd.hint}</span>}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> navigate</span>
            <span className="flex items-center gap-1"><CornerDownLeft size={10} /> run</span>
            <span>esc close</span>
          </div>
          <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}
