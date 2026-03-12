import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronUp, ChevronDown, Trash2, Download, Play, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { getHistory, deleteHistoryItem, downloadFile, exportHistory, type HistoryItem } from '../../services/api'
import { cn, formatBytes, formatDate, formatDuration, formatNumber } from '../../lib/utils'

type SortKey = 'started_at' | 'filename' | 'status' | 'duration' | 'packets_sent'

export function ReplayHistory() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(15)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('started_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    getHistory({ limit: perPage, offset: (page - 1) * perPage, search: search || undefined, status: statusFilter || undefined, sort: sortBy, order: sortDir })
      .then(r => { setItems(r.items); setTotal(r.total) })
      .catch(() => toast.error('Failed to load history'))
  }, [page, perPage, search, statusFilter, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / perPage)

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ChevronDown size={12} className="text-zinc-600" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-cyan-400" /> : <ChevronDown size={12} className="text-cyan-400" />
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryItem(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    try {
      await Promise.all([...selected].map(deleteHistoryItem))
      toast.success(`Deleted ${selected.size} items`)
      setSelected(new Set())
      load()
    } catch { toast.error('Failed to delete some items') }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-400',
      failed: 'bg-red-500/10 text-red-400',
      stopped: 'bg-amber-500/10 text-amber-400',
    }
    return <span className={cn('px-2 py-0.5 rounded text-xs font-medium capitalize', colors[s] || 'bg-zinc-700 text-zinc-300')}>{s}</span>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Replay History</h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search files..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="stopped">Stopped</option>
        </select>
        <button
          onClick={() => exportHistory()}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <FileDown size={16} />
          Export CSV
        </button>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} />
            Delete ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                    className="rounded border-zinc-600 bg-zinc-800 accent-cyan-500"
                  />
                </th>
                {([
                  ['started_at', 'Date'],
                  ['filename', 'File'],
                  ['status', 'Status'],
                  ['duration', 'Duration'],
                  ['packets_sent', 'Packets'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    No replay history found
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className={cn('hover:bg-zinc-800/30 transition-colors', selected.has(item.id) && 'bg-cyan-500/5')}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-zinc-600 bg-zinc-800 accent-cyan-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{formatDate(item.started_at)}</td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-200 truncate max-w-[200px]">{item.filename}</p>
                    <p className="text-xs text-zinc-500">{item.interface} · {formatBytes(item.bytes_sent)}</p>
                  </td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatDuration(item.duration)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatNumber(item.packets_sent)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => window.location.href = '/replay'}
                        title="Re-replay"
                        className="p-1.5 text-zinc-500 hover:text-cyan-400 transition-colors"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={() => downloadFile(item.file_id)}
                        title="Download PCAP"
                        className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                if (p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded text-xs font-medium transition-colors',
                      p === page ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:bg-zinc-800'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
