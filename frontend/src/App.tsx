import { useCallback, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { ReplayPage } from './components/replay/ReplayPage'
import { ReplayHistory } from './components/history/ReplayHistory'
import { Settings } from './components/settings/Settings'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut'

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
  const [showHelp, setShowHelp] = useState(false)

  const toggleHelp = useCallback(() => setShowHelp(v => !v), [])
  const closeHelp = useCallback(() => setShowHelp(false), [])

  useKeyboardShortcut(e => e.key === '?', toggleHelp)
  useKeyboardShortcut(e => e.key === 'Escape', closeHelp, { enabled: showHelp })

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
    </Layout>
  )
}
