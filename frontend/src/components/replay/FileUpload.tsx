import { useState, useEffect, useCallback } from 'react'
import { Upload, File, Trash2, Check, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile, listFiles, deleteFile, filterFile, type UploadedFile } from '../../services/api'
import { cn, formatBytes, formatDate } from '../../lib/utils'

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

  const loadFiles = useCallback(() => {
    listFiles().then(setFiles).catch(() => {})
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

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
  }

  const closeFilter = () => {
    if (filtering) return
    setFilterTarget(null)
    setFilterExpr('')
    setFilterName('')
  }

  const submitFilter = async () => {
    if (!filterTarget) return
    const expr = filterExpr.trim()
    if (!expr) {
      toast.error('Enter a BPF filter')
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
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Filter failed')
    } finally {
      setFiltering(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Upload PCAP</h2>
      </div>

      {/* Drop zone */}
      <div className="p-5">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            dragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950/50'
          )}
        >
          <Upload size={28} className={cn(dragOver ? 'text-cyan-400' : 'text-zinc-500')} />
          <div className="text-center">
            <p className="text-sm text-zinc-300">Drop PCAP file here or click to browse</p>
            <p className="text-xs text-zinc-500 mt-1">.pcap, .pcapng, .cap</p>
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
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
        <div className="border-t border-zinc-800">
          <div className="px-5 py-3">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Uploaded Files</p>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
            {files.map(f => (
              <button
                key={f.id}
                onClick={() => onSelectFile(f)}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                  selectedFile?.id === f.id ? 'bg-cyan-500/10' : 'hover:bg-zinc-800/50'
                )}
              >
                {selectedFile?.id === f.id ? (
                  <Check size={14} className="text-cyan-400 shrink-0" />
                ) : (
                  <File size={14} className="text-zinc-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', selectedFile?.id === f.id ? 'text-cyan-300' : 'text-zinc-300')}>
                    {f.original_filename}
                  </p>
                  <p className="text-xs text-zinc-500">{formatBytes(f.file_size)} · {formatDate(f.uploaded_at)}</p>
                </div>
                <button
                  onClick={(e) => openFilter(f, e)}
                  className="text-zinc-600 hover:text-cyan-400 transition-colors shrink-0"
                  title="Filter with BPF expression"
                >
                  <Filter size={14} />
                </button>
                <button
                  onClick={(e) => handleDelete(f.id, e)}
                  className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  title="Delete file"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
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
                <label className="block text-xs text-zinc-400 mb-1.5">BPF filter</label>
                <input
                  type="text"
                  autoFocus
                  value={filterExpr}
                  onChange={(e) => setFilterExpr(e.target.value)}
                  placeholder='e.g. "tcp port 443" or "host 10.0.0.1 and not arp"'
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Standard tcpdump/BPF capture-filter syntax.</p>
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
                disabled={filtering || !filterExpr.trim()}
                className="px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {filtering ? 'Filtering…' : 'Create filtered copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
