import { useState } from 'react'
import { FileUpload } from './FileUpload'
import { PcapAnalysis } from './PcapAnalysis'
import { ReplayConfig, type ReplaySettings } from './ReplayConfig'
import { ReplayControls } from './ReplayControls'
import { ProgressMonitor } from './ProgressMonitor'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { UploadedFile } from '../../services/api'

export function ReplayPage() {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [settings, setSettings] = useState<ReplaySettings>({
    interface: '',
    speedMultiplier: 1,
    pps: null,
    usePps: false,
    continuous: false,
  })
  const { replayStatus, connected } = useWebSocket()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Upload & Replay</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          <FileUpload selectedFile={selectedFile} onSelectFile={setSelectedFile} />
          <PcapAnalysis file={selectedFile} />
        </div>
        {/* Right */}
        <div className="space-y-6">
          <ReplayConfig settings={settings} onChange={setSettings} />
          <ReplayControls file={selectedFile} settings={settings} status={replayStatus} />
          <ProgressMonitor status={replayStatus} connected={connected} />
        </div>
      </div>
    </div>
  )
}
