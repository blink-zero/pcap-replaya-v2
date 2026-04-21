import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Info } from 'lucide-react'
import { getFileAnalysis, type FileAnalysis, type UploadedFile } from '../../services/api'
import { formatBytes, formatDuration, formatNumber } from '../../lib/utils'
import { Panel } from '../ui'

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

interface Props {
  file: UploadedFile | null
}

export function PcapAnalysis({ file }: Props) {
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!file) { setAnalysis(null); return }
    setLoading(true)
    getFileAnalysis(file.id)
      .then(setAnalysis)
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false))
  }, [file])

  if (!file) {
    return (
      <Panel title="PCAP analysis">
        <p className="text-sm text-ink-faint text-center py-6">Select a file to view analysis</p>
      </Panel>
    )
  }

  if (loading) {
    return (
      <Panel title="PCAP analysis">
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Panel>
    )
  }

  if (!analysis) return null

  const protocolData = analysis.protocols.map(p => ({ name: p.name, value: p.count }))

  return (
    <Panel title="PCAP analysis" padding="none">
      <div className="p-5 space-y-5">
        {analysis.analysis_limited && (
          <div className="flex items-start gap-2 bg-warn/5 border border-warn/20 rounded-md px-3 py-2 text-xs text-warn">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              Protocol breakdown, top talkers and size distribution below are a sample of
              the first <span className="font-mono">{formatNumber(analysis.analyzed_packets)}</span>{' '}
              of <span className="font-mono">{formatNumber(analysis.packet_count)}</span> packets.
              The total packet count and replay progress still use the full file.
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-panel-sunken border border-line-subtle rounded-md p-2.5">
            <p className="text-ink-faint text-[11px] uppercase tracking-[0.08em]">Packets</p>
            <p className="text-ink font-semibold font-mono tabular-nums">
              {formatNumber(analysis.packet_count)}
              {analysis.analysis_limited && (
                <span className="text-ink-faint text-[11px] font-normal ml-1">
                  ({formatNumber(analysis.analyzed_packets)} analysed)
                </span>
              )}
            </p>
          </div>
          <div className="bg-panel-sunken border border-line-subtle rounded-md p-2.5">
            <p className="text-ink-faint text-[11px] uppercase tracking-[0.08em]">Duration</p>
            <p className="text-ink font-semibold font-mono tabular-nums">{formatDuration(analysis.duration)}</p>
          </div>
          <div className="bg-panel-sunken border border-line-subtle rounded-md p-2.5">
            <p className="text-ink-faint text-[11px] uppercase tracking-[0.08em]">Format</p>
            <p className="text-ink font-semibold font-mono">{analysis.file_format}</p>
          </div>
          <div className="bg-panel-sunken border border-line-subtle rounded-md p-2.5">
            <p className="text-ink-faint text-[11px] uppercase tracking-[0.08em]">Data rate</p>
            <p className="text-ink font-semibold font-mono tabular-nums">{formatBytes(analysis.data_rate)}/s</p>
          </div>
        </div>

        {/* Protocol chart */}
        {protocolData.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint mb-3">Protocol breakdown</p>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={protocolData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={26}
                      outerRadius={48}
                      strokeWidth={0}
                    >
                      {protocolData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1a1a20', border: '1px solid #26262c', borderRadius: 6, fontSize: 12 }}
                      itemStyle={{ color: '#ededf0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {protocolData.slice(0, 6).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-ink flex-1">{p.name}</span>
                    <span className="text-ink-faint font-mono tabular-nums">{formatNumber(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Talkers */}
        {analysis.top_talkers.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint mb-2">Top talkers</p>
            <div className="space-y-1">
              {analysis.top_talkers.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-panel-sunken border border-line-subtle rounded px-3 py-1.5">
                  <span className="text-ink font-mono text-[11px]">{t.src} &rarr; {t.dst}</span>
                  <span className="text-ink-faint shrink-0 ml-2 font-mono">{formatNumber(t.count)} pkts ({t.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
