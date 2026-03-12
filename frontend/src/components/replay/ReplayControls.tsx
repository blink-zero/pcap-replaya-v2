import { Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { startReplay, stopReplay, type UploadedFile } from '../../services/api'
import type { ReplaySettings } from './ReplayConfig'
import type { ReplayStatus } from '../../services/api'
import { cn } from '../../lib/utils'

interface Props {
  file: UploadedFile | null
  settings: ReplaySettings
  status: ReplayStatus
}

const statusColors: Record<string, string> = {
  idle: 'bg-zinc-700 text-zinc-300',
  starting: 'bg-cyan-500/20 text-cyan-400',
  running: 'bg-cyan-500/20 text-cyan-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  stopped: 'bg-amber-500/20 text-amber-400',
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-200">Replay Controls</h2>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[status.status] || statusColors.idle)}>
          {status.status}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleStart}
          disabled={isRunning || !file}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
            isRunning || !file
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20'
          )}
        >
          <Play size={18} />
          Start Replay
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
            !isRunning
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'
          )}
        >
          <Square size={18} />
          Stop
        </button>
      </div>

      {status.error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {status.error}
        </div>
      )}
    </div>
  )
}
