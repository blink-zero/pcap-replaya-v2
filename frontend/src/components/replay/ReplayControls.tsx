import { Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { startReplay, stopReplay, type UploadedFile } from '../../services/api'
import type { ReplaySettings } from './ReplayConfig'
import type { ReplayStatus } from '../../services/api'
import { cn } from '../../lib/utils'
import { Panel, Badge } from '../ui'

interface Props {
  file: UploadedFile | null
  settings: ReplaySettings
  status: ReplayStatus
}

type StatusVariant = 'neutral' | 'accent' | 'success' | 'danger' | 'warn'
const statusVariant: Record<string, StatusVariant> = {
  idle: 'neutral',
  starting: 'accent',
  running: 'accent',
  completed: 'success',
  failed: 'danger',
  stopped: 'warn',
}

export function ReplayControls({ file, settings, status }: Props) {
  const isRunning = status.status === 'running' || status.status === 'starting'

  const handleStart = async () => {
    if (!file) {
      toast.error('Please select a PCAP file first')
      return
    }
    if (!settings.interface) {
      toast.error('Please select a network interface')
      return
    }
    try {
      await startReplay({
        file_id: file.id,
        interface: settings.interface,
        speed: settings.usePps ? (settings.pps ?? 1000) : settings.speedMultiplier,
        speed_unit: settings.usePps ? 'pps' : 'multiplier',
        continuous: settings.continuous,
      })
      toast.success('Replay started')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to start replay')
    }
  }

  const handleStop = async () => {
    try {
      await stopReplay()
      toast.success('Replay stopped')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to stop replay')
    }
  }

  return (
    <Panel
      title="Replay controls"
      actions={<Badge variant={statusVariant[status.status] ?? 'neutral'}>{status.status}</Badge>}
    >
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={isRunning || !file}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold transition-colors',
            isRunning || !file
              ? 'bg-panel-raised text-ink-ghost cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_0_1px_rgba(6,182,212,0.5)]'
          )}
        >
          <Play size={16} />
          Start Replay
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold transition-colors',
            !isRunning
              ? 'bg-panel-raised text-ink-ghost cursor-not-allowed'
              : 'bg-danger hover:bg-danger/90 text-white'
          )}
        >
          <Square size={16} />
          Stop
        </button>
      </div>

      {status.error && (
        <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger font-mono">
          {status.error}
        </div>
      )}
    </Panel>
  )
}
