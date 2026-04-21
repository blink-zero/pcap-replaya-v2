import { ArrowRight, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { FileAnalysis } from '../../services/api'
import { cn, formatBytes, formatDuration, formatNumber } from '../../lib/utils'
import { Panel } from '../ui'

interface Props {
  a: FileAnalysis
  b: FileAnalysis
}

function DeltaTile({ label, aVal, bVal, format }: {
  label: string
  aVal: number
  bVal: number
  format: (n: number) => string
}) {
  const delta = bVal - aVal
  const denom = Math.abs(aVal) || 1
  const pct = (delta / denom) * 100
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus

  return (
    <div className="bg-panel-sunken border border-line-subtle rounded-md p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-ghost">{label}</p>
      <div className="flex items-center gap-1.5 mt-1.5 font-mono text-sm">
        <span className="text-ink">{format(aVal)}</span>
        <ArrowRight size={11} className="text-ink-ghost" />
        <span className="text-ink">{format(bVal)}</span>
      </div>
      <div className={cn(
        'flex items-center gap-1 text-xs mt-1 font-mono',
        dir === 'zero' ? 'text-ink-ghost' : 'text-cyan-400',
      )}>
        <Icon size={10} />
        <span>
          {dir === 'zero' ? 'no change' : `${delta > 0 ? '+' : ''}${format(Math.abs(delta))} (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}
        </span>
      </div>
    </div>
  )
}

function SetDiff({ label, aSet, bSet }: { label: string; aSet: Set<string>; bSet: Set<string> }) {
  const shared = [...aSet].filter(x => bSet.has(x))
  const onlyA = [...aSet].filter(x => !bSet.has(x))
  const onlyB = [...bSet].filter(x => !aSet.has(x))

  const Chip = ({ text, tone }: { text: string; tone: 'both' | 'a' | 'b' }) => (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono',
      tone === 'both' && 'bg-panel-raised text-ink-muted ring-1 ring-inset ring-line',
      tone === 'a' && 'bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/25',
      tone === 'b' && 'bg-violet-500/10 text-violet-300 ring-1 ring-inset ring-violet-500/25',
    )}>{text}</span>
  )

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-ghost mb-2">{label}</p>
      {shared.length + onlyA.length + onlyB.length === 0 ? (
        <p className="text-xs text-ink-faint">No data</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shared.slice(0, 12).map(x => <Chip key={`s${x}`} text={x} tone="both" />)}
          {onlyA.slice(0, 8).map(x => <Chip key={`a${x}`} text={`A · ${x}`} tone="a" />)}
          {onlyB.slice(0, 8).map(x => <Chip key={`b${x}`} text={`B · ${x}`} tone="b" />)}
        </div>
      )}
      <div className="flex gap-3 mt-2 text-[11px] text-ink-faint font-mono">
        <span>Both: {shared.length}</span>
        <span className="text-blue-400/80">A only: {onlyA.length}</span>
        <span className="text-violet-400/80">B only: {onlyB.length}</span>
      </div>
    </div>
  )
}

export function DiffSummary({ a, b }: Props) {
  const aProtos = new Set(a.protocols.map(p => p.name))
  const bProtos = new Set(b.protocols.map(p => p.name))
  const talkerKey = (t: { src: string; dst: string }) => `${t.src}→${t.dst}`
  const aTalkers = new Set(a.top_talkers.map(talkerKey))
  const bTalkers = new Set(b.top_talkers.map(talkerKey))

  return (
    <Panel
      title="Diff summary"
      description={
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 align-middle mr-1" />
          A: <span className="text-ink">{a.filename}</span>
          <span className="mx-2 text-ink-ghost">·</span>
          <span className="inline-block w-2 h-2 rounded-full bg-violet-400 align-middle mr-1" />
          B: <span className="text-ink">{b.filename}</span>
        </span>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DeltaTile label="Packets"   aVal={a.packet_count}  bVal={b.packet_count}  format={formatNumber} />
          <DeltaTile label="Duration"  aVal={a.duration}      bVal={b.duration}      format={formatDuration} />
          <DeltaTile label="File size" aVal={a.file_size}     bVal={b.file_size}     format={formatBytes} />
          <DeltaTile label="Data rate" aVal={a.data_rate}     bVal={b.data_rate}     format={(n) => `${formatBytes(n)}/s`} />
        </div>
        <SetDiff label="Protocols"        aSet={aProtos}  bSet={bProtos} />
        <SetDiff label="Top talker flows" aSet={aTalkers} bSet={bTalkers} />
      </div>
    </Panel>
  )
}
