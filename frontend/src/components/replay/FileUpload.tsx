import { useState, useEffect, useCallback } from 'react'
import { Upload, File, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile, listFiles, deleteFile, type UploadedFile } from '../../services/api'
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
                  onClick={(e) => handleDelete(f.id, e)}
                  className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
