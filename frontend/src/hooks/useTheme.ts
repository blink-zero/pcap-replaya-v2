import { useCallback, useEffect, useState } from 'react'

export type Accent = 'cyan' | 'violet' | 'emerald' | 'rose' | 'amber' | 'indigo'

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'cyan',    label: 'Cyan',    swatch: '#06b6d4' },
  { id: 'violet',  label: 'Violet',  swatch: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { id: 'rose',    label: 'Rose',    swatch: '#f43f5e' },
  { id: 'amber',   label: 'Amber',   swatch: '#f59e0b' },
  { id: 'indigo',  label: 'Indigo',  swatch: '#6366f1' },
]

const STORAGE_KEY = 'theme.accent'
const DEFAULT_ACCENT: Accent = 'cyan'

function readStored(): Accent {
  if (typeof window === 'undefined') return DEFAULT_ACCENT
  const raw = window.localStorage.getItem(STORAGE_KEY) as Accent | null
  return ACCENTS.some(a => a.id === raw) ? (raw as Accent) : DEFAULT_ACCENT
}

function applyAccent(accent: Accent) {
  if (typeof document === 'undefined') return
  if (accent === DEFAULT_ACCENT) {
    document.documentElement.removeAttribute('data-accent')
  } else {
    document.documentElement.setAttribute('data-accent', accent)
  }
}

// Apply the stored accent synchronously on module load so the initial paint
// already uses the user's choice (no flash of default cyan). Safe in SSR
// thanks to the document guard.
applyAccent(readStored())

export function useTheme() {
  const [accent, setAccentState] = useState<Accent>(readStored)

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    applyAccent(next)
  }, [])

  useEffect(() => {
    // Cross-tab sync: if the user changes accent in another tab, reflect it.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && ACCENTS.some(a => a.id === e.newValue)) {
        setAccentState(e.newValue as Accent)
        applyAccent(e.newValue as Accent)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { accent, setAccent }
}
