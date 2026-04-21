import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  listFiles, getFileAnalysis, type UploadedFile, type FileAnalysis,
} from '../../services/api'
import { PcapAnalysis } from '../replay/PcapAnalysis'
import { DiffSummary } from './DiffSummary'
import { formatBytes } from '../../lib/utils'

function FileSelector({ label, tone, value, files, onChange }: {
  label: string
  tone: 'a' | 'b'
  value: UploadedFile | null
  files: UploadedFile[]
  onChange: (f: UploadedFile | null) => void
}) {
  const dotClass = tone === 'a' ? 'bg-blue-400' : 'bg-violet-400'
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <select
        value={value?.id ?? ''}
        onChange={(e) => {
          const id = e.target.value
          onChange(id ? (files.find(f => f.id === id) ?? null) : null)
        }}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
          className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <X size={12} /> clear
        </button>
      )}
    </div>
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
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Compare PCAPs</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Pick two captures to see their stats side-by-side — useful for spotting what changed before / after a filter or capture window.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-6">
        <FileSelector label="A" tone="a" value={fileA} files={files} onChange={setFileA} />
        <button
          onClick={swap}
          disabled={!fileA && !fileB}
          className="h-10 px-3 self-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs transition-colors disabled:opacity-40 flex items-center gap-2 mx-auto md:mx-0"
          title="Swap A and B"
        >
          <ArrowLeftRight size={14} /> Swap
        </button>
        <FileSelector label="B" tone="b" value={fileB} files={files} onChange={setFileB} />
      </div>

      {!fileA && !fileB && (
        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-10 text-center">
          <p className="text-sm text-zinc-400">Pick two files to begin comparing.</p>
          <p className="text-xs text-zinc-500 mt-2">
            Tip: create filtered derivatives from the Replay page to compare before/after views of the same capture.
          </p>
        </div>
      )}

      {fileA?.id && fileB?.id && fileA.id === fileB.id && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6 text-sm text-amber-300">
          A and B are the same file. Pick different captures to see a meaningful diff.
        </div>
      )}

      {canDiff && analysisA && analysisB && (
        <div className="mb-6">
          <DiffSummary a={analysisA} b={analysisB} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Analysis A
          </div>
          <PcapAnalysis file={fileA} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-violet-400" /> Analysis B
          </div>
          <PcapAnalysis file={fileB} />
        </div>
      </div>
    </div>
  )
}
