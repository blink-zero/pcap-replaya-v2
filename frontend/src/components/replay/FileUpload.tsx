import { useState, useEffect, useCallback } from 'react'
import { Upload, File, Trash2, Check, Filter, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile, listFiles, deleteFile, filterFile, validateFilter, type UploadedFile } from '../../services/api'
import { cn, formatBytes, formatDate } from '../../lib/utils'
import { Panel } from '../ui'

type FilterValidation =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'valid' }
  | { state: 'invalid'; error: string }

// Curated BPF presets — covers the 90% of filters people actually type.
const BPF_PRESETS: { label: string; expr: string }[] = [
  { label: 'TCP', expr: 'tcp' },
  { label: 'UDP', expr: 'udp' },
  { label: 'ICMP', expr: 'icmp' },
  { label: 'HTTPS', expr: 'tcp port 443' },
  { label: 'HTTP', expr: 'tcp port 80' },
  { label: 'DNS', expr: 'udp port 53' },
  { label: 'No ARP/STP', expr: 'not arp and not stp' },
  { label: 'Host…', expr: 'host 10.0.0.1' },
  { label: 'Subnet…', expr: 'net 192.168.0.0/16' },
]

interface FileUploadProps {
  selectedFile: UploadedFile | null
  onSelectFile: (file: UploadedFile) => void
}

export function FileUpload({ selectedFile, onSelectFile }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [filterTarget, setFilterTarget] = useState<UploadedFile | null>(null)
  const [filterExpr, setFilterExpr] = useState('')
  const [filterName, setFilterName] = useState('')
  const [filtering, setFiltering] = useState(false)
  const [validation, setValidation] = useState<FilterValidation>({ state: 'idle' })

  const loadFiles = useCallback(() => {
    listFiles().then(setFiles).catch(() => {})
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  // Debounced server-side BPF validation. tcpdump -d is the source of truth
  // for "will this compile?" — cheaper than submitting and failing.
  useEffect(() => {
    if (!filterTarget) return
    const expr = filterExpr.trim()
    if (!expr) {
      setValidation({ state: 'idle' })
      return
    }
    setValidation({ state: 'checking' })
    const fileId = filterTarget.id
    const handle = setTimeout(async () => {
      try {
        const res = await validateFilter({ file_id: fileId, bpf_filter: expr })
        // Guard against a stale response after the user kept typing.
        setValidation(cur => {
          if (cur.state !== 'checking') return cur
          if (res.ok) return { state: 'valid' }
          return { state: 'invalid', error: res.error || 'Invalid filter' }
        })
      } catch {
        setValidation(cur => (cur.state === 'checking' ? { state: 'invalid', error: 'Validation request failed' } : cur))
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [filterExpr, filterTarget])

  const handleUpload = async (file: File) => {
    if (!file.name.match(/\.(pcap|pcapng|cap)$/i)) {
      toast.error('Invalid file type. Please upload a PCAP file.')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const uploaded = await uploadFile(file, setProgress)
      toast.success(`Uploaded ${uploaded.original_filename}`)
      onSelectFile(uploaded)
      loadFiles()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteFile(id)
      toast.success('File deleted')
      if (selectedFile?.id === id) onSelectFile(null as any)
      loadFiles()
    } catch {
      toast.error('Failed to delete file')
    }
  }

  const openFilter = (file: UploadedFile, e: React.MouseEvent) => {
    e.stopPropagation()
    setFilterTarget(file)
    setFilterExpr('')
    setFilterName('')
    setValidation({ state: 'idle' })
  }

  const closeFilter = () => {
    if (filtering) return
    setFilterTarget(null)
    setFilterExpr('')
    setFilterName('')
    setValidation({ state: 'idle' })
  }

  const submitFilter = async () => {
    if (!filterTarget) return
    const expr = filterExpr.trim()
    if (!expr) {
      toast.error('Enter a BPF filter')
      return
    }
    if (validation.state !== 'valid') {
      toast.error(validation.state === 'invalid' ? validation.error : 'Wait for filter validation to finish')
      return
    }
    setFiltering(true)
    try {
      const derived = await filterFile(filterTarget.id, {
        bpf_filter: expr,
        name: filterName.trim() || undefined,
      })
      toast.success(`Filtered: ${derived.original_filename}`)
      onSelectFile(derived)
      loadFiles()
      setFilterTarget(null)
      setFilterExpr('')
      setFilterName('')
      setValidation({ state: 'idle' })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Filter failed')
    } finally {
      setFiltering(false)
    }
  }

  return (
    <Panel title="Upload PCAP" padding="none">
      {/* Drop zone */}
      <div className="p-5">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-7 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            dragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-line-strong hover:border-ink-ghost bg-panel-sunken/50'
          )}
        >
          <Upload size={26} className={cn(dragOver ? 'text-cyan-400' : 'text-ink-ghost')} />
          <div className="text-center">
            <p className="text-sm text-ink">Drop PCAP file here or click to browse</p>
            <p className="text-xs text-ink-faint mt-1 font-mono">.pcap, .pcapng, .cap</p>
          </div>
          <input
            type="file"
            accept=".pcap,.pcapng,.cap"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
              e.target.value = ''
            }}
          />
        </label>

        {/* Upload progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-ink-faint mb-1">
              <span>Uploading…</span>
              <span className="font-mono text-ink">{progress}%</span>
            </div>
            <div className="h-1 bg-panel-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="border-t border-line-subtle">
          <div className="px-5 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">Uploaded files · {files.length}</p>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-line-subtle">
            {files.map(f => {
              const parent = f.source_file_id ? files.find(x => x.id === f.source_file_id) : null
              return (
              <button
                key={f.id}
                onClick={() => onSelectFile(f)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-5 py-2 text-left transition-colors',
                  selectedFile?.id === f.id ? 'bg-cyan-500/10' : 'hover:bg-panel-raised/50'
                )}
              >
                {selectedFile?.id === f.id ? (
                  <Check size={14} className="text-cyan-400 shrink-0" />
                ) : (
                  <File size={14} className="text-ink-ghost shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', selectedFile?.id === f.id ? 'text-cyan-300' : 'text-ink')}>
                    {f.original_filename}
                  </p>
                  <p className="text-[11px] text-ink-faint font-mono">{formatBytes(f.file_size)} · {formatDate(f.uploaded_at)}</p>
                  {(parent || f.filter_expression) && (
                    <p className="text-[11px] text-cyan-400/80 truncate mt-0.5">
                      <span className="text-ink-ghost">↳</span>{' '}
                      {parent ? <>from <span className="text-ink-muted">{parent.original_filename}</span></> : 'filtered'}
                      {f.filter_expression && (
                        <>
                          <span className="text-ink-ghost"> · </span>
                          <span className="font-mono text-ink-faint">{f.filter_expression}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => openFilter(f, e)}
                  className="p-1 rounded text-ink-ghost hover:text-cyan-400 hover:bg-panel-raised transition-colors shrink-0"
                  title="Filter with BPF expression"
                >
                  <Filter size={13} />
                </button>
                <button
                  onClick={(e) => handleDelete(f.id, e)}
                  className="p-1 rounded text-ink-ghost hover:text-danger hover:bg-panel-raised transition-colors shrink-0"
                  title="Delete file"
                >
                  <Trash2 size={13} />
                </button>
              </button>
              )
            })}
          </div>
        </div>
      )}

      {filterTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeFilter}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">Filter PCAP</h3>
              <button
                onClick={closeFilter}
                disabled={filtering}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Source</p>
                <p className="text-sm text-zinc-300 truncate">{filterTarget.original_filename}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-zinc-400">BPF filter</label>
                  {validation.state === 'checking' && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Loader2 size={12} className="animate-spin" /> validating…
                    </span>
                  )}
                  {validation.state === 'valid' && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle2 size={12} /> valid
                    </span>
                  )}
                  {validation.state === 'invalid' && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle size={12} /> invalid
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  autoFocus
                  value={filterExpr}
                  onChange={(e) => setFilterExpr(e.target.value)}
                  placeholder='e.g. "tcp port 443" or "host 10.0.0.1 and not arp"'
                  className={cn(
                    'w-full bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1',
                    validation.state === 'invalid'
                      ? 'border-red-500/60 focus:ring-red-500'
                      : validation.state === 'valid'
                        ? 'border-green-500/50 focus:ring-green-500'
                        : 'border-zinc-700 focus:ring-cyan-500'
                  )}
                />
                {validation.state === 'invalid' ? (
                  <p className="text-xs text-red-400 mt-1 font-mono break-words">{validation.error}</p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-1">Standard tcpdump/BPF capture-filter syntax.</p>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Examples (click to use)</p>
                <div className="flex flex-wrap gap-1.5">
                  {BPF_PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFilterExpr(p.expr)}
                      className="px-2 py-0.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-md transition-colors font-mono"
                      title={p.expr}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">New file name <span className="text-zinc-600">(optional)</span></label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder={`${filterTarget.original_filename.replace(/\.(pcap|pcapng|cap)$/i, '')}-filtered`}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={closeFilter}
                disabled={filtering}
                className="px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitFilter}
                disabled={filtering || validation.state !== 'valid'}
                className="px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {filtering ? 'Filtering…' : 'Create filtered copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
