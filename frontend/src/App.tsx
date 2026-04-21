import { useCallback, useMemo, useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Play, Clock, Settings as SettingsIcon,
  Keyboard, Square, Palette,
} from 'lucide-react'
import { toast } from 'sonner'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { ReplayPage } from './components/replay/ReplayPage'
import { ReplayHistory } from './components/history/ReplayHistory'
import { Settings } from './components/settings/Settings'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { CommandPalette, type Command } from './components/CommandPalette'
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut'
import { useTheme, ACCENTS } from './hooks/useTheme'
import { stopReplay } from './services/api'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setAccent } = useTheme()
  const [showHelp, setShowHelp] = useState(false)
  const [showPalette, setShowPalette] = useState(false)

  const toggleHelp = useCallback(() => setShowHelp(v => !v), [])
  const closeHelp = useCallback(() => setShowHelp(false), [])
  const togglePalette = useCallback(() => setShowPalette(v => !v), [])
  const closePalette = useCallback(() => setShowPalette(false), [])

  useKeyboardShortcut(e => e.key === '?', toggleHelp)
  useKeyboardShortcut('Escape', closeHelp, { enabled: showHelp })
  // ⌘K / Ctrl+K opens the command palette. Swallows the default browser
  // "focus address bar" / "find" shortcut only while the palette isn't
  // active in an input itself.
  useKeyboardShortcut(
    e => e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey),
    togglePalette,
    { ignoreInInputs: false },
  )

  const commands = useMemo<Command[]>(() => {
    const nav = (path: string) => () => navigate(path)
    const list: Command[] = [
      { id: 'nav.dashboard', label: 'Go to Dashboard', group: 'Navigation', keywords: ['home'], icon: <LayoutDashboard size={14} />, onRun: nav('/') },
      { id: 'nav.replay',    label: 'Go to Replay',    group: 'Navigation', keywords: ['upload'], icon: <Play size={14} />,            onRun: nav('/replay') },
      { id: 'nav.history',   label: 'Go to History',   group: 'Navigation', keywords: ['log'],    icon: <Clock size={14} />,           onRun: nav('/history') },
      { id: 'nav.settings',  label: 'Go to Settings',  group: 'Navigation', keywords: ['prefs', 'preferences'], icon: <SettingsIcon size={14} />, onRun: nav('/settings') },
      ...ACCENTS.map<Command>(a => ({
        id: `theme.${a.id}`,
        label: `Use ${a.label} accent`,
        group: 'Theme',
        keywords: ['color', 'accent', a.id],
        hint: a.swatch,
        icon: <Palette size={14} style={{ color: a.swatch }} />,
        onRun: () => setAccent(a.id),
      })),
      {
        id: 'replay.stop',
        label: 'Stop current replay',
        group: 'Actions',
        keywords: ['abort', 'cancel', 'halt'],
        icon: <Square size={14} />,
        onRun: async () => {
          try {
            await stopReplay()
            toast.success('Replay stopped')
          } catch (err: any) {
            toast.error(err?.response?.data?.detail ?? 'No replay running')
          }
        },
      },
      { id: 'help.shortcuts', label: 'Show keyboard shortcuts', group: 'Help', keywords: ['keys', 'bindings'], icon: <Keyboard size={14} />, onRun: () => setShowHelp(true) },
    ]
    return list
  }, [navigate, setAccent])

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
          <Route path="/replay" element={<AnimatedPage><ReplayPage /></AnimatedPage>} />
          <Route path="/history" element={<AnimatedPage><ReplayHistory /></AnimatedPage>} />
          <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
        </Routes>
      </AnimatePresence>
      <ShortcutsHelp open={showHelp} onClose={closeHelp} />
      <CommandPalette open={showPalette} onClose={closePalette} commands={commands} />
    </Layout>
  )
}
