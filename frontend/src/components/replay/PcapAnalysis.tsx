import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Info } from 'lucide-react'
import { getFileAnalysis, type FileAnalysis, type UploadedFile } from '../../services/api'
import { formatBytes, formatDuration, formatNumber } from '../../lib/utils'

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">PCAP Analysis</h2>
        <p className="text-sm text-zinc-500 text-center py-6">Select a file to view analysis</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">PCAP Analysis</h2>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!analysis) return null

  const protocolData = analysis.protocols.map(p => ({ name: p.name, value: p.count }))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">PCAP Analysis</h2>
      </div>
      <div className="p-5 space-y-5">
        {analysis.analysis_limited && (
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              Protocol breakdown, top talkers and size distribution below are a sample of
              the first <span className="font-mono text-amber-200">{formatNumber(analysis.analyzed_packets)}</span>{' '}
              of <span className="font-mono text-amber-200">{formatNumber(analysis.packet_count)}</span> packets.
              The total packet count and replay progress still use the full file.
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-zinc-500 text-xs">Packets</p>
            <p className="text-zinc-100 font-medium">
              {formatNumber(analysis.packet_count)}
              {analysis.analysis_limited && (
                <span className="text-zinc-500 text-xs font-normal ml-1">
                  ({formatNumber(analysis.analyzed_packets)} analysed)
                </span>
              )}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-zinc-500 text-xs">Duration</p>
            <p className="text-zinc-100 font-medium">{formatDuration(analysis.duration)}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-zinc-500 text-xs">Format</p>
            <p className="text-zinc-100 font-medium">{analysis.file_format}</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-zinc-500 text-xs">Data Rate</p>
            <p className="text-zinc-100 font-medium">{formatBytes(analysis.data_rate)}/s</p>
          </div>
        </div>

        {/* Protocol chart */}
        {protocolData.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Protocol Breakdown</p>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={protocolData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={52}
                      strokeWidth={0}
                    >
                      {protocolData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#f4f4f5' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {protocolData.slice(0, 6).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-300 flex-1">{p.name}</span>
                    <span className="text-zinc-500">{formatNumber(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Talkers */}
        {analysis.top_talkers.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Top Talkers</p>
            <div className="space-y-1">
              {analysis.top_talkers.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-zinc-800/50 rounded px-3 py-2">
                  <span className="text-zinc-300 font-mono text-[11px]">{t.src} &rarr; {t.dst}</span>
                  <span className="text-zinc-500 shrink-0 ml-2">{formatNumber(t.count)} pkts ({t.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
