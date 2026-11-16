import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Check, ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Play, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, Panel } from '../ui'
import { formatBytes, formatDuration, formatNumber } from '../../lib/utils'
import { getHubStatus, importHubCapture, searchHub, type HubCapture, type HubResults, type HubStatus, type UploadedFile } from '../../services/api'

const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs text-ink hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed'
const input = 'w-full min-w-0 rounded-md border border-line bg-panel-sunken px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cyan-500'
type Filters = { q: string; protocol: string; tag: string }
function errorMessage(error: unknown) {
  const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
  return typeof detail === 'string' ? detail : 'Unable to reach PCAPHub. Please try again.'
}
function captureDate(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Date unavailable'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Keep drafts aligned with Back/Forward and chip selections.
function SearchControls({ filters, onApply }: { filters: Filters; onApply: (filters: Filters, replace?: boolean) => void }) {
  const [draft, setDraft] = useState(filters)
  const committedKey = JSON.stringify(filters)
  const [previousKey, setPreviousKey] = useState(committedKey)
  // Synchronize navigation without remounting inputs or losing keyboard focus.
  if (committedKey !== previousKey) {
    setPreviousKey(committedKey)
    setDraft(filters)
  }
  useEffect(() => {
    const next = { q: draft.q.trim(), protocol: draft.protocol.trim(), tag: draft.tag.trim() }
    if (next.q === filters.q && next.protocol === filters.protocol && next.tag === filters.tag) return
    const timer = window.setTimeout(() => onApply(next, true), 400)
    return () => window.clearTimeout(timer)
  }, [draft, filters, onApply])
  return <form onSubmit={event => { event.preventDefault(); onApply({ q: draft.q.trim(), protocol: draft.protocol.trim(), tag: draft.tag.trim() }, true) }} className="space-y-3">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_minmax(130px,1fr)_auto] lg:items-end">
      <label className="block sm:col-span-2 lg:col-span-1"><span className="mb-1.5 block text-xs text-ink-muted">Search captures</span><div className="relative"><Search size={16} aria-hidden="true" className="absolute left-3 top-3 text-ink-faint" /><input className={`${input} pl-9 pr-9`} type="search" placeholder="Try DNS tunneling or TLS handshake" maxLength={300} value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} /></div></label>
      <label><span className="mb-1.5 block text-xs text-ink-muted">Protocol</span><input className={input} placeholder="Any · e.g. DNS" maxLength={100} value={draft.protocol} onChange={e => setDraft({ ...draft, protocol: e.target.value })} /></label>
      <label><span className="mb-1.5 block text-xs text-ink-muted">Tag</span><input className={input} placeholder="Any · e.g. malware" maxLength={100} value={draft.tag} onChange={e => setDraft({ ...draft, tag: e.target.value })} /></label>
      <button className={`${button} min-h-10 sm:col-span-2 lg:col-span-1`} type="submit"><Search size={14} />Search</button>
    </div>
    <p className="text-xs text-ink-faint">Search updates as you type. Protocol and tag are exact filters, combined with your search. Click a result badge to filter.</p>
  </form>
}

export function PCAPHubPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').slice(0, 300).trim()
  const protocol = (params.get('protocol') || '').slice(0, 100).trim()
  const tag = (params.get('tag') || '').slice(0, 100).trim()
  const rawPage = Number(params.get('page') || 1)
  const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(10000, rawPage)) : 1
  const requestKey = JSON.stringify([q, protocol, tag, page])
  const [status, setStatus] = useState<HubStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [statusAttempt, setStatusAttempt] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [response, setResponse] = useState<{ key: string; attempt: number; results?: HubResults; error?: string } | null>(null)
  const loading = response?.key !== requestKey || response?.attempt !== attempt
  const results = !loading ? response?.results : undefined
  const error = !loading ? response?.error : undefined
  const [pending, setPending] = useState<string | null>(null)
  const importing = useRef(false)
  const [imported, setImported] = useState<Record<string, UploadedFile>>({})
  const [importError, setImportError] = useState<{ id: string; message: string } | null>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let active = true
    getHubStatus().then(value => { if (active) { setStatus(value); setStatusError('') } })
      .catch(e => { if (active) setStatusError(errorMessage(e)) })
    return () => { active = false }
  }, [statusAttempt])

  useEffect(() => {
    const controller = new AbortController()
    searchHub({ q, protocol, tag, page, sort: 'newest' }, controller.signal).then(value => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, attempt, results: value })
    }).catch(e => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, attempt, error: errorMessage(e) })
    })
    return () => controller.abort()
  }, [q, protocol, tag, page, requestKey, attempt])

  const applyFilters = useCallback((next: Filters, replace = false) => {
    const nextParams = new URLSearchParams()
    if (next.q) nextParams.set('q', next.q)
    if (next.protocol) nextParams.set('protocol', next.protocol)
    if (next.tag) nextParams.set('tag', next.tag)
    setParams(nextParams, { replace })
  }, [setParams])

  function changePage(next: number) {
    const nextParams = new URLSearchParams(params)
    if (next === 1) nextParams.delete('page')
    else nextParams.set('page', String(next))
    setParams(nextParams)
    resultHeading.current?.focus({ preventScroll: true })
    resultHeading.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  async function importCapture(capture: HubCapture, openReplay = false) {
    if (importing.current) return
    importing.current = true
    setPending(capture.id)
    setImportError(null)
    try {
      const file = imported[capture.id] ?? await importHubCapture(capture.id)
      setImported(previous => ({ ...previous, [capture.id]: file }))
      if (!imported[capture.id]) toast.success(`Imported ${file.original_filename}. Replay has not started.`)
      if (openReplay) navigate('/replay', { state: { importedFile: file } })
    } catch (e) {
      const message = errorMessage(e)
      setImportError({ id: capture.id, message })
      toast.error(message)
    } finally {
      importing.current = false
      setPending(null)
    }
  }

  const hasFilters = !!(q || protocol || tag)
  return <div>
    <PageHeader eyebrow="Capture library" title="PCAPHub" description="Find a capture, preview its metadata, and save it to your local library. Import & Replay opens setup with the file selected — it never starts traffic."
      actions={<a className={button} href="https://pcaphub.com" target="_blank" rel="noopener noreferrer">Visit PCAPHub <ExternalLink size={13} /></a>} />
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-panel px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={status?.import_configured ? 'text-emerald-400' : 'text-ink-muted'}>{status ? (status.import_configured ? '● Imports enabled' : 'Browse-only · imports not configured') : (statusError || 'Checking import configuration…')}</span>
          {status && <span className="text-ink-faint">Import limit {formatBytes(status.max_download_bytes)} · Nothing is uploaded to PCAPHub</span>}
          {statusError && <button className={button} onClick={() => setStatusAttempt(value => value + 1)}>Retry connection check</button>}
        </div>
        {status && !status.import_configured && <details className="mt-2 text-ink-faint"><summary className="cursor-pointer">How to enable imports</summary><p className="mt-2">Set <code>PCAP_PCAPHUB_API_KEY</code> in the backend environment, then refresh this page. No key is stored in this browser.</p></details>}
        {pending && <p role="status" className="mt-2 flex items-center gap-2 text-cyan-300"><Loader2 size={14} className="animate-spin" />Downloading and validating capture… Keep this page open. No replay will start.</p>}
      </div>
      <Panel>
        <SearchControls filters={{ q, protocol, tag }} onApply={applyFilters} />
        {hasFilters && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {([['q', q, 'Search'], ['protocol', protocol, 'Protocol'], ['tag', tag, 'Tag']] as const).filter(([, value]) => value).map(([key, value, label]) => <button key={key} className={`${button} max-w-full break-all text-left`} onClick={() => applyFilters({ q, protocol, tag, [key]: '' })} aria-label={`Remove ${label.toLowerCase()} filter`}><span>{label}: {value}</span><X size={12} className="shrink-0" /></button>)}
          <button className={`${button} border-transparent text-ink-muted`} onClick={() => applyFilters({ q: '', protocol: '', tag: '' })}>Clear all</button>
        </div>}
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 ref={resultHeading} tabIndex={-1} className="scroll-mt-4 text-sm font-medium text-ink outline-none" aria-live="polite">{loading ? 'Searching captures…' : error ? 'Search unavailable' : `${formatNumber(results?.meta.total || 0)} captures`}</h2>
        <span className="text-xs text-ink-faint">Newest first · 24 per page</span>
      </div>
      <section aria-label="Capture results" aria-busy={loading}>
        {loading ? <div className="space-y-3"><p role="status" className="flex items-center gap-2 text-xs text-ink-faint"><Loader2 size={14} className="animate-spin" />Fetching public captures…</p>{[0, 1, 2].map(i => <div key={i} aria-hidden="true" className="h-36 animate-pulse rounded-lg border border-line bg-panel p-4"><div className="mb-4 h-4 w-2/3 rounded bg-panel-raised" /><div className="mb-2 h-3 w-full rounded bg-panel-raised" /><div className="h-3 w-1/3 rounded bg-panel-raised" /></div>)}</div> : error ? <Panel><p role="alert" className="text-sm text-red-400">{error}</p><p className="mt-2 text-xs text-ink-faint">Your search is preserved. Retry without losing your filters.</p><button className={`${button} mt-3`} onClick={() => setAttempt(value => value + 1)}>Retry search</button></Panel> : results && (results.data.length === 0 ? <Panel title={page > 1 ? 'No captures on this page' : 'No captures found'}><p className="text-sm text-ink-faint">{page > 1 ? 'The catalogue may have changed. Return to the first page.' : 'Try a broader search or remove a protocol or tag filter. Filters must match exactly.'}</p><button className={`${button} mt-3`} onClick={() => page > 1 ? changePage(1) : applyFilters({ q: '', protocol: '', tag: '' })}>{page > 1 ? 'First page' : 'Browse all captures'}</button></Panel> : <div className="space-y-3">
          {results.data.map(capture => {
            const saved = !!imported[capture.id]
            const oversized = !!status && capture.file_size > status.max_download_bytes
            const reason = saved ? 'Saved to local library' : oversized ? 'Exceeds import limit' : statusError ? 'Import configuration unavailable' : !status ? 'Checking import configuration' : !status.import_configured ? 'Server key required to import' : 'Import saves locally · no traffic'
            return <article key={capture.id} className="min-w-0 rounded-lg border border-line bg-panel p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold leading-relaxed text-ink">{capture.title}</h3>
                  <p className="mt-1 break-words text-xs text-ink-faint">By {capture.username || 'PCAPHub contributor'} · {captureDate(capture.created_at)}</p>
                  <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-ink-muted">{capture.description || 'No description provided.'}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-ink-muted"><span className={oversized ? 'text-amber-400' : ''}>{formatBytes(capture.file_size)}</span><span>{capture.packet_count == null ? 'Packet count unknown' : `${formatNumber(capture.packet_count)} packets`}</span>{capture.duration_ms != null && <span>{formatDuration(capture.duration_ms / 1000)}</span>}</div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 lg:w-64 lg:items-end">
                  <div className="flex flex-wrap gap-2">
                    <button className={button} disabled={!status?.import_configured || !!pending || oversized || saved} onClick={() => importCapture(capture)} aria-label={`Import ${capture.title}`} title={reason}>{pending === capture.id ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Download size={14} />}{pending === capture.id ? 'Importing…' : saved ? 'Imported' : 'Import'}</button>
                    <button className={`${button} border-cyan-500/40 text-cyan-300`} disabled={!!pending || (!saved && (!status?.import_configured || oversized))} onClick={() => importCapture(capture, true)} aria-label={`${saved ? 'Open replay for' : 'Import and replay'} ${capture.title}`} title="Open replay setup with this file selected; traffic will not start automatically"><Play size={14} />{saved ? 'Open Replay' : 'Import & Replay'}</button>
                  </div>
                  <span className={`text-xs ${oversized ? 'text-amber-400' : saved ? 'text-emerald-400' : 'text-ink-faint'}`}>{reason}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {capture.top_protocols.slice(0, 5).map(value => <button key={`protocol-${value}`} className="max-w-full break-all rounded border border-cyan-500/30 bg-cyan-500/5 px-2 py-1 text-[11px] text-cyan-300 hover:bg-cyan-500/15 focus-visible:ring-2 focus-visible:ring-cyan-500" onClick={() => applyFilters({ q, protocol: value.slice(0, 100), tag })} title={`Filter by protocol ${value}`}>{value}</button>)}
                {capture.tags.slice(0, 5).map(value => <button key={`tag-${value}`} className="max-w-full break-all rounded border border-line bg-panel-sunken px-2 py-1 text-[11px] text-ink-muted hover:bg-panel-raised focus-visible:ring-2 focus-visible:ring-cyan-500" onClick={() => applyFilters({ q, protocol, tag: value.slice(0, 100) })} title={`Filter by tag ${value}`}>#{value}</button>)}
              </div>
              <details className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                <summary className="w-fit cursor-pointer rounded text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-cyan-500">Preview details<span className="sr-only"> for {capture.title}</span></summary>
                <div className="mt-3 space-y-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{capture.description || 'No description provided.'}</p>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><dt className="text-ink-faint">Protocols reported</dt><dd className="mt-1 break-words">{capture.top_protocols.join(', ') || 'Not provided'}</dd></div><div><dt className="text-ink-faint">Tags</dt><dd className="mt-1 break-words">{capture.tags.join(', ') || 'None'}</dd></div><div><dt className="text-ink-faint">Capture ID</dt><dd className="mt-1 break-all font-mono">{capture.id}</dd></div><div><dt className="text-ink-faint">SHA-256</dt><dd className="mt-1 break-all font-mono">{capture.sha256 || 'Not provided'}</dd></div></dl>
                  <p className="text-ink-faint">Metadata preview only. Import to inspect packets locally. Review captures before replaying on a network.</p>
                </div>
              </details>
              {importError?.id === capture.id && <p role="alert" className="mt-3 text-xs text-red-400">{importError.message} No replay was started. You can retry the import.</p>}
            </article>
          })}
        </div>)}
      </section>
      {results && results.meta.total_pages > 0 && <nav aria-label="Capture search pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-faint">
        <button className={button} disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={14} />Previous</button>
        <div className="text-center"><p>Page {results.meta.page} of {formatNumber(results.meta.total_pages)}</p>{results.data.length > 0 && <p className="mt-1">{formatNumber((results.meta.page - 1) * results.meta.limit + 1)}–{formatNumber((results.meta.page - 1) * results.meta.limit + results.data.length)} of {formatNumber(results.meta.total)}</p>}</div>
        <button className={button} disabled={page >= results.meta.total_pages || page >= 10000} onClick={() => changePage(page + 1)}>Next<ChevronRight size={14} /></button>
      </nav>}
    </div>
  </div>
}
