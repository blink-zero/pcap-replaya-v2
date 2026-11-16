import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Check, Download, ExternalLink, Loader2, Play, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, Panel } from '../ui'
import { formatBytes, formatDuration, formatNumber } from '../../lib/utils'
import { getHubStatus, importHubCapture, searchHub, type HubCapture, type HubResults, type HubStatus, type UploadedFile } from '../../services/api'

const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs text-ink hover:bg-panel-raised disabled:opacity-40 disabled:cursor-not-allowed'
const input = 'rounded-md border border-line bg-panel-sunken px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cyan-500'
function errorMessage(error: unknown) {
  const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
  return typeof detail === 'string' ? detail : 'Unable to reach PCAPHub. Please try again.'
}

export function PCAPHubPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<HubStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState({ q: '', page: 1, sort: 'newest' })
  const [results, setResults] = useState<HubResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const importing = useRef(false)
  const [imported, setImported] = useState<Record<string, UploadedFile>>({})

  useEffect(() => {
    let active = true
    getHubStatus().then(value => { if (active) setStatus(value) })
      .catch(e => { if (active) setStatusError(errorMessage(e)) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    searchHub(query, controller.signal).then(value => {
      if (!controller.signal.aborted) { setResults(value); setError('') }
    }).catch(e => {
      if (!controller.signal.aborted) setError(errorMessage(e))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query])

  function updateQuery(next: typeof query) {
    setLoading(true)
    setError('')
    setQuery(next)
  }

  async function importCapture(capture: HubCapture, openReplay = false) {
    if (importing.current) return
    importing.current = true
    setPending(capture.id)
    try {
      const file = imported[capture.id] ?? await importHubCapture(capture.id)
      setImported(previous => ({ ...previous, [capture.id]: file }))
      toast.success(`Imported ${file.original_filename}. Replay has not started.`)
      if (openReplay) navigate('/replay', { state: { importedFile: file } })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      importing.current = false
      setPending(null)
    }
  }

  return <div>
    <PageHeader eyebrow="Capture library" title="PCAPHub" description="Discover public captures and import them into your local library. Nothing is uploaded to PCAPHub, and importing never starts replay."
      actions={<a className={button} href="https://pcaphub.com" target="_blank" rel="noopener noreferrer">Visit PCAPHub <ExternalLink size={13} /></a>} />
    <div className="space-y-5">
      <Panel title="Connection & import policy">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={status?.import_configured ? 'text-emerald-400' : 'text-ink-muted'}>
            {status ? (status.import_configured ? 'Server key configured · imports enabled' : 'Browse-only · server key not configured') : (statusError || 'Checking server configuration…')}
          </span>
          {status && <span className="text-xs text-ink-faint">Limit {formatBytes(status.max_download_bytes)} · Timeout {status.timeout_seconds}s</span>}
        </div>
        {!status?.import_configured && <p className="mt-2 text-xs text-ink-faint">An administrator can enable imports with <code>PCAP_PCAPHUB_API_KEY</code> in the backend environment. No key is stored in this browser. Refresh after configuration changes.</p>}
        {pending && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-cyan-300"><Loader2 size={14} className="animate-spin" />Downloading and validating capture… Keep this page open. No replay will start.</p>}
        {Object.keys(imported).length > 0 && <p role="status" className="mt-3 text-xs text-emerald-400">Imported into the local library. <Link className="underline" to="/replay">Open Upload & Replay</Link> to inspect or manually select a capture.</p>}
      </Panel>
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); updateQuery({ ...query, q: draft.trim(), page: 1 }) }}>
        <label className="flex-1 min-w-48"><span className="sr-only">Search public captures</span><input className={`${input} w-full`} placeholder="Search captures, protocols, or tags…" maxLength={300} value={draft} onChange={e => setDraft(e.target.value)} /></label>
        <label><span className="sr-only">Sort captures</span><select className={input} value={query.sort} onChange={e => updateQuery({ ...query, page: 1, sort: e.target.value })}><option value="newest">Newest</option></select></label>
        <button className={button} type="submit"><Search size={14} />Search</button>
      </form>
      {loading ? <Panel><p role="status" className="flex items-center gap-2 text-sm text-ink-faint"><Loader2 size={16} className="animate-spin" />Searching PCAPHub…</p></Panel> : error ?
        <Panel><p role="alert" className="text-sm text-red-400">{error}</p><button className={`${button} mt-3`} onClick={() => updateQuery({ ...query })}>Retry search</button></Panel> : results && <>
          <p className="text-xs text-ink-faint" aria-live="polite">{formatNumber(results.meta.total)} captures{query.q && ` matching “${query.q}”`}</p>
          {results.data.length === 0 ? <Panel title="No captures found"><p className="text-sm text-ink-faint">Try another search term or browse without a search query.</p></Panel> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {results.data.map(capture => {
              const oversized = !!status && capture.file_size > status.max_download_bytes
              return <Panel key={capture.id} title={capture.title} description={`By ${capture.username || 'PCAPHub contributor'}`} bodyClassName="space-y-3" footer={<div className="flex items-center justify-between gap-3">
                <span>{oversized ? 'Exceeds import limit' : imported[capture.id] ? 'Saved to local library' : 'Import only · no replay'}</span>
                <div className="flex flex-wrap gap-2">
                <button className={button} disabled={!status?.import_configured || !!pending || oversized || !!imported[capture.id]} onClick={() => importCapture(capture)} aria-label={`Import ${capture.title}`}>
                  {pending === capture.id ? <Loader2 size={14} className="animate-spin" /> : imported[capture.id] ? <Check size={14} /> : <Download size={14} />}
                  {pending === capture.id ? 'Importing…' : imported[capture.id] ? 'Imported' : 'Import capture'}
                </button>
                <button className={button} disabled={!!pending || (!imported[capture.id] && (!status?.import_configured || oversized))} onClick={() => importCapture(capture, true)} aria-label={`Import and replay ${capture.title}`} title="Open replay setup; traffic will not start automatically">
                  <Play size={14} />{imported[capture.id] ? 'Open Replay' : 'Import & Replay'}
                </button>
                </div>
              </div>}>
                <p className="text-sm text-ink-muted line-clamp-3 break-words">{capture.description || 'No description provided.'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-ink-faint"><span>{formatBytes(capture.file_size)}</span><span>{capture.packet_count == null ? 'Unknown packet count' : `${formatNumber(capture.packet_count)} packets`}</span>{capture.duration_ms != null && <span>{formatDuration(capture.duration_ms / 1000)}</span>}</div>
                <div className="flex flex-wrap gap-1.5">{[...new Set([...capture.top_protocols, ...capture.tags])].slice(0, 10).map(tag => <span key={tag} className="rounded border border-line bg-panel-sunken px-2 py-0.5 text-[11px] text-ink-muted break-all">{tag}</span>)}</div>
              </Panel>
            })}
          </div>}
          <nav aria-label="Capture search pages" className="flex justify-between items-center text-xs text-ink-faint">
            <button className={button} disabled={query.page <= 1} onClick={() => updateQuery({ ...query, page: query.page - 1 })}>Previous</button>
            <span>Page {results.meta.page} of {Math.max(1, results.meta.total_pages)}</span>
            <button className={button} disabled={query.page >= results.meta.total_pages} onClick={() => updateQuery({ ...query, page: query.page + 1 })}>Next</button>
          </nav>
        </>}
    </div>
  </div>
}
