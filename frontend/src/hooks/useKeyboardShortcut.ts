import { useEffect, useRef } from 'react'

interface ShortcutOptions {
  // When true (default), the shortcut won't fire while focus is in a text
  // input, textarea, select, or contenteditable element — so typing an 'f'
  // in a form field never toggles fullscreen.
  ignoreInInputs?: boolean
  // When false, the shortcut is registered but its handler is skipped.
  // Useful for conditionally-active shortcuts without unmount/remount.
  enabled?: boolean
}

// Accepts either a literal key (matched via e.key) or a predicate for modifier
// combinations. Handler is kept in a ref so callers can pass an inline arrow
// without the listener being torn down and re-added on every parent render.
export function useKeyboardShortcut(
  match: string | ((e: KeyboardEvent) => boolean),
  handler: () => void,
  opts: ShortcutOptions = {},
) {
  const { ignoreInInputs = true, enabled = true } = opts
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return
    const matches = typeof match === 'function' ? match : (e: KeyboardEvent) => e.key === match
    const onKey = (e: KeyboardEvent) => {
      if (ignoreInInputs) {
        const target = e.target as HTMLElement | null
        if (target) {
          const tag = target.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
          if (target.isContentEditable) return
        }
      }
      if (matches(e)) {
        e.preventDefault()
        handlerRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [match, ignoreInInputs, enabled])
}
