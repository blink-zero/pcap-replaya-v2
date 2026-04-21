import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronUp, ChevronDown, Trash2, Download, Play, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { getHistory, deleteHistoryItem, downloadFile, exportHistory, type HistoryItem } from '../../services/api'
import { cn, formatBytes, formatDate, formatDuration, formatNumber } from '../../lib/utils'
import { Panel, PageHeader, Badge } from '../ui'

type SortKey = 'started_at' | 'filename' | 'status' | 'duration' | 'packets_sent'

type StatusVariant = 'success' | 'danger' | 'warn' | 'neutral'

const STATUS_VARIANT: Record<string, StatusVariant> = {
  completed: 'success',
  failed:    'danger',
  stopped:   'warn',
}

export function ReplayHistory() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('started_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    getHistory({
      limit: perPage,
      offset: (page - 1) * perPage,
      search: search || undefined,
      status: statusFilter || undefined,
      sort: sortBy,
      order: sortDir,
    })
      .then(r => { setItems(r.items); setTotal(r.total) })
      .catch(() => toast.error('Failed to load history'))
  }, [page, perPage, search, statusFilter, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / perPage) || 1

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
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
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
  }

  const ThCell = ({ col, label, align = 'left' }: { col: SortKey; label: string; align?: 'left' | 'right' }) => {
    const active = sortBy === col
    return (
      <th
        onClick={() => toggleSort(col)}
        className={cn(
          'px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] cursor-pointer select-none transition-colors',
          active ? 'text-cyan-300' : 'text-ink-faint hover:text-ink',
          align === 'right' ? 'text-right' : 'text-left',
        )}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
          {label}
          {active
            ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
            : <ChevronDown size={11} className="text-ink-ghost" />}
        </span>
      </th>
    )
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd   = Math.min(page * perPage, total)

  return (
    <div>
      <PageHeader
        eyebrow="Log"
        title="Replay History"
        description="Every replay run, sortable and filterable. Use the command palette (⌘K) to jump between views."
      />

      {/* Toolbar */}
      <Panel padding="sm" className="mb-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-[14rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search filename…"
              className="w-full bg-panel-sunken border border-line rounded-md pl-8 pr-3 py-1.5 text-sm text-ink placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-panel-sunken border border-line rounded-md px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="stopped">Stopped</option>
          </select>
          <button
            onClick={() => exportHistory()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-panel hover:bg-panel-raised border border-line rounded-md text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <FileDown size={14} />
            Export CSV
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 border border-danger/20 rounded-md text-sm text-danger hover:bg-danger/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete {selected.size}
            </button>
          )}
        </div>
      </Panel>

      {/* Table */}
      <Panel padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel-sunken/60 border-b border-line">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                    className="accent-cyan-500"
                    aria-label="Select all"
                  />
                </th>
                <ThCell col="started_at"   label="Date" />
                <ThCell col="filename"     label="File" />
                <ThCell col="status"       label="Status" />
                <ThCell col="duration"     label="Duration" align="right" />
                <ThCell col="packets_sent" label="Packets" align="right" />
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-ink-faint text-sm">
                    No replay history matches the current filters.
                  </td>
                </tr>
              ) : items.map(item => {
                const variant = STATUS_VARIANT[item.status] ?? 'neutral'
                const isSel = selected.has(item.id)
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-line-subtle last:border-b-0 transition-colors',
                      isSel ? 'bg-cyan-500/5' : 'hover:bg-panel-raised/40',
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(item.id)}
                        className="accent-cyan-500"
                        aria-label="Select row"
                      />
                    </td>
                    <td className="px-3 py-2 text-ink-muted whitespace-nowrap text-[12px] font-mono">{formatDate(item.started_at)}</td>
                    <td className="px-3 py-2">
                      <p className="text-ink truncate max-w-[240px]">{item.filename}</p>
                      <p className="text-[11px] text-ink-faint font-mono">
                        {item.interface} · {formatBytes(item.bytes_sent)}
                      </p>
                    </td>
                    <td className="px-3 py-2"><Badge variant={variant} size="xs">{item.status}</Badge></td>
                    <td className="px-3 py-2 text-right text-ink font-mono tabular-nums">{formatDuration(item.duration)}</td>
                    <td className="px-3 py-2 text-right text-ink font-mono tabular-nums">{formatNumber(item.packets_sent)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => window.location.href = '/replay'}
                          title="Re-run from Replay page"
                          className="p-1.5 text-ink-ghost hover:text-cyan-400 rounded hover:bg-panel-raised transition-colors"
                        >
                          <Play size={13} />
                        </button>
                        <button
                          onClick={() => downloadFile(item.file_id)}
                          title="Download PCAP"
                          className="p-1.5 text-ink-ghost hover:text-info rounded hover:bg-panel-raised transition-colors"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete history entry"
                          className="p-1.5 text-ink-ghost hover:text-danger rounded hover:bg-panel-raised transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-line-subtle">
          <p className="text-xs text-ink-faint font-mono">
            {total === 0 ? 'No entries' : <>Showing <span className="text-ink">{rangeStart}–{rangeEnd}</span> of <span className="text-ink">{total}</span></>}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 flex items-center justify-center rounded text-ink-muted hover:text-ink hover:bg-panel-raised disabled:text-ink-ghost disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
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
                      'h-7 min-w-[1.75rem] px-1.5 rounded text-xs font-mono transition-colors',
                      p === page ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/25' : 'text-ink-muted hover:text-ink hover:bg-panel-raised',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded text-ink-muted hover:text-ink hover:bg-panel-raised disabled:text-ink-ghost disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}
