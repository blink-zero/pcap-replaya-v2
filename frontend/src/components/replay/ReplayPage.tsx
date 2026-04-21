import { useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import { FileUpload } from './FileUpload'
import { PcapAnalysis } from './PcapAnalysis'
import { ReplayConfig, type ReplaySettings } from './ReplayConfig'
import { ReplayControls } from './ReplayControls'
import { ProgressMonitor } from './ProgressMonitor'
import { FullscreenReplay } from './FullscreenReplay'
import { SplitPane } from '../SplitPane'
import { useReplayStatusContext } from '../../contexts/ReplayStatusContext'
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { stopReplay, type UploadedFile } from '../../services/api'
import { PageHeader } from '../ui'

export function ReplayPage() {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [settings, setSettings] = useState<ReplaySettings>({
    interface: '',
    speedMultiplier: 1,
    pps: null,
    usePps: false,
    continuous: false,
  })
  const { replayStatus, connected } = useReplayStatusContext()
  const [fullscreen, setFullscreen] = useState(false)

  const replayActive = replayStatus.status === 'running' || replayStatus.status === 'starting'

  const toggleFullscreen = useCallback(() => {
    // Fullscreen only makes sense during an active replay; otherwise there's
    // nothing to watch. Invite the user to start one instead of opening an
    // empty fullscreen.
    setFullscreen(cur => {
      if (!cur && !replayActive) {
        toast('Start a replay first to enter fullscreen')
        return false
      }
      return !cur
    })
  }, [replayActive])

  const exitFullscreen = useCallback(() => setFullscreen(false), [])

  const handleStopFromFullscreen = useCallback(async () => {
    try {
      await stopReplay()
      toast.success('Replay stopped')
    } catch {
      toast.error('Failed to stop replay')
    }
  }, [])

  useKeyboardShortcut(
    e => e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey,
    toggleFullscreen,
  )
  useKeyboardShortcut(
    e => e.key === 'Escape',
    exitFullscreen,
    { enabled: fullscreen },
  )

  const left = (
    <div className="space-y-4">
      <FileUpload selectedFile={selectedFile} onSelectFile={setSelectedFile} />
      <PcapAnalysis file={selectedFile} />
    </div>
  )
  const right = (
    <div className="space-y-4">
      <ReplayConfig settings={settings} onChange={setSettings} />
      <ReplayControls file={selectedFile} settings={settings} status={replayStatus} />
      <ProgressMonitor status={replayStatus} connected={connected} />
    </div>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Upload & Replay"
        description="Upload a PCAP, tune the replay settings, and blast it onto an interface."
        actions={
          <button
            onClick={toggleFullscreen}
            disabled={!replayActive}
            className="flex items-center gap-2 px-3 h-9 text-sm bg-panel hover:bg-panel-raised border border-line text-ink-muted hover:text-ink rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={replayActive ? 'Enter fullscreen (F)' : 'Start a replay to enable fullscreen'}
          >
            <Maximize2 size={14} />
            Fullscreen
            <kbd className="ml-1 px-1 py-0.5 bg-panel-sunken border border-line rounded text-[10px] font-mono text-ink-ghost">F</kbd>
          </button>
        }
      />

      <SplitPane
        left={left}
        right={right}
        storageKey="replay.splitLeftPct"
        defaultLeftPercent={50}
        minLeftPercent={30}
        maxLeftPercent={70}
      />

      <AnimatePresence>
        {fullscreen && (
          <FullscreenReplay
            status={replayStatus}
            connected={connected}
            onExit={exitFullscreen}
            onStop={handleStopFromFullscreen}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
