import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  // Percentage width of the left pane, 10 – 90. Persisted via storageKey.
  defaultLeftPercent?: number
  minLeftPercent?: number
  maxLeftPercent?: number
  // If provided, the current width is persisted to localStorage under this key.
  storageKey?: string
  // Below this container width (px) we fall back to a stacked single-column
  // layout and ignore the draggable divider — prevents a cramped two-column
  // view on phones and small tablet splits.
  stackBelowWidth?: number
}

export function SplitPane({
  left,
  right,
  defaultLeftPercent = 50,
  minLeftPercent = 25,
  maxLeftPercent = 75,
  storageKey,
  stackBelowWidth = 1024,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftPercent, setLeftPercent] = useState<number>(() => {
    if (!storageKey) return defaultLeftPercent
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
    const parsed = raw ? parseFloat(raw) : NaN
    return isFinite(parsed) ? Math.min(maxLeftPercent, Math.max(minLeftPercent, parsed)) : defaultLeftPercent
  })
  const [dragging, setDragging] = useState(false)
  const [stacked, setStacked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < stackBelowWidth
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setStacked(window.innerWidth < stackBelowWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [stackBelowWidth])

  useEffect(() => {
    if (storageKey) window.localStorage.setItem(storageKey, String(leftPercent))
  }, [leftPercent, storageKey])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftPercent(Math.min(maxLeftPercent, Math.max(minLeftPercent, pct)))
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    // Cursor + user-select side-effects; clean up on release.
    const prevCursor = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevSelect
    }
  }, [dragging, minLeftPercent, maxLeftPercent])

  // Double-click the divider to reset to default.
  const onDoubleClick = useCallback(() => setLeftPercent(defaultLeftPercent), [defaultLeftPercent])

  if (stacked) {
    return (
      <div className="space-y-6">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex w-full gap-0 relative">
      <div style={{ width: `${leftPercent}%` }} className="min-w-0 pr-3">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftPercent)}
        aria-valuemin={minLeftPercent}
        aria-valuemax={maxLeftPercent}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        className="group relative w-1 -mx-[1px] flex items-center justify-center cursor-col-resize select-none"
        title="Drag to resize · double-click to reset"
      >
        <div className={`absolute inset-y-0 w-px ${dragging ? 'bg-cyan-500' : 'bg-zinc-800 group-hover:bg-zinc-700'} transition-colors`} />
        <div className={`relative z-10 h-10 w-5 rounded flex items-center justify-center ${dragging ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-900 border border-zinc-800 text-zinc-600 group-hover:text-zinc-400'} transition-colors`}>
          <GripVertical size={14} />
        </div>
      </div>
      <div style={{ width: `${100 - leftPercent}%` }} className="min-w-0 pl-3">
        {right}
      </div>
    </div>
  )
}
