import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  listFiles, getFileAnalysis, type UploadedFile, type FileAnalysis,
} from '../../services/api'
import { PcapAnalysis } from '../replay/PcapAnalysis'
import { DiffSummary } from './DiffSummary'
import { formatBytes } from '../../lib/utils'
import { Panel, PageHeader } from '../ui'

function FileSelector({ label, tone, value, files, onChange }: {
  label: string
  tone: 'a' | 'b'
  value: UploadedFile | null
  files: UploadedFile[]
  onChange: (f: UploadedFile | null) => void
}) {
  const dotClass = tone === 'a' ? 'bg-blue-400' : 'bg-violet-400'
  return (
    <Panel padding="sm">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-[11px] uppercase tracking-[0.08em] text-ink-ghost">{label}</span>
      </div>
      <select
        value={value?.id ?? ''}
        onChange={(e) => {
          const id = e.target.value
          onChange(id ? (files.find(f => f.id === id) ?? null) : null)
        }}
        className="w-full bg-panel-sunken border border-line rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-cyan-500"
      >
        <option value="">Select a file…</option>
        {files.map(f => (
          <option key={f.id} value={f.id}>
            {f.original_filename}  ·  {formatBytes(f.file_size)}
          </option>
        ))}
      </select>
      {value && (
        <button
          onClick={() => onChange(null)}
          className="mt-2 flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
        >
          <X size={12} /> clear
        </button>
      )}
    </Panel>
  )
}

export function ComparePage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [fileA, setFileA] = useState<UploadedFile | null>(null)
  const [fileB, setFileB] = useState<UploadedFile | null>(null)
  const [analysisA, setAnalysisA] = useState<FileAnalysis | null>(null)
  const [analysisB, setAnalysisB] = useState<FileAnalysis | null>(null)

  useEffect(() => {
    listFiles().then(setFiles).catch(() => toast.error('Failed to load files'))
  }, [])

  useEffect(() => {
    if (!fileA) { setAnalysisA(null); return }
    getFileAnalysis(fileA.id).then(setAnalysisA).catch(() => setAnalysisA(null))
  }, [fileA])

  useEffect(() => {
    if (!fileB) { setAnalysisB(null); return }
    getFileAnalysis(fileB.id).then(setAnalysisB).catch(() => setAnalysisB(null))
  }, [fileB])

  const swap = () => {
    const a = fileA
    setFileA(fileB)
    setFileB(a)
  }

  const canDiff = useMemo(
    () => analysisA !== null && analysisB !== null && fileA?.id !== fileB?.id,
    [analysisA, analysisB, fileA, fileB],
  )

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Compare PCAPs"
        description="Pick two captures to see their stats side-by-side — useful for spotting what changed before / after a filter or capture window."
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch mb-5">
        <FileSelector label="A" tone="a" value={fileA} files={files} onChange={setFileA} />
        <button
          onClick={swap}
          disabled={!fileA && !fileB}
          className="self-center px-3 h-9 bg-panel hover:bg-panel-raised border border-line text-ink-muted hover:text-ink rounded-md text-xs transition-colors disabled:opacity-40 flex items-center gap-2 mx-auto md:mx-0"
          title="Swap A and B"
        >
          <ArrowLeftRight size={14} /> Swap
        </button>
        <FileSelector label="B" tone="b" value={fileB} files={files} onChange={setFileB} />
      </div>

      {!fileA && !fileB && (
        <div className="bg-panel/50 border border-line-subtle border-dashed rounded-lg p-10 text-center">
          <p className="text-sm text-ink-muted">Pick two files to begin comparing.</p>
          <p className="text-xs text-ink-faint mt-2">
            Tip: create filtered derivatives from the Replay page to compare before/after views of the same capture.
          </p>
        </div>
      )}

      {fileA?.id && fileB?.id && fileA.id === fileB.id && (
        <div className="bg-warn/5 border border-warn/20 rounded-lg p-3 mb-5 text-sm text-warn">
          A and B are the same file. Pick different captures to see a meaningful diff.
        </div>
      )}

      {canDiff && analysisA && analysisB && (
        <div className="mb-5">
          <DiffSummary a={analysisA} b={analysisB} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Analysis A
          </div>
          <PcapAnalysis file={fileA} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            <span className="w-2 h-2 rounded-full bg-violet-400" /> Analysis B
          </div>
          <PcapAnalysis file={fileB} />
        </div>
      </div>
    </div>
  )
}
