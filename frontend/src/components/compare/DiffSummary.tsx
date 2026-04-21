import { ArrowRight, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { FileAnalysis } from '../../services/api'
import { cn, formatBytes, formatDuration, formatNumber } from '../../lib/utils'

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
  // Percent change with a small-number guard so tiny bases don't blow up.
  const denom = Math.abs(aVal) || 1
  const pct = (delta / denom) * 100
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'

  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus
  const color =
    dir === 'zero' ? 'text-zinc-500' :
    // Note: we don't moralise up/down since "more packets" isn't inherently
    // good or bad. A neutral accent is fine.
    'text-cyan-400'

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm font-medium text-zinc-300 font-mono">{format(aVal)}</span>
        <ArrowRight size={12} className="text-zinc-600" />
        <span className="text-sm font-medium text-zinc-300 font-mono">{format(bVal)}</span>
      </div>
      <div className={cn('flex items-center gap-1 text-xs mt-1', color)}>
        <Icon size={10} />
        <span className="font-mono">
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
      tone === 'both' && 'bg-zinc-700/60 text-zinc-300',
      tone === 'a' && 'bg-blue-500/15 text-blue-300',
      tone === 'b' && 'bg-violet-500/15 text-violet-300',
    )}>{text}</span>
  )

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2">{label}</p>
      {shared.length + onlyA.length + onlyB.length === 0 ? (
        <p className="text-xs text-zinc-600">No data</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shared.slice(0, 12).map(x => <Chip key={`s${x}`} text={x} tone="both" />)}
          {onlyA.slice(0, 8).map(x => <Chip key={`a${x}`} text={`A · ${x}`} tone="a" />)}
          {onlyB.slice(0, 8).map(x => <Chip key={`b${x}`} text={`B · ${x}`} tone="b" />)}
        </div>
      )}
      <div className="flex gap-3 mt-2 text-[10px] text-zinc-500">
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Diff summary</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 align-middle mr-1" />
          A: <span className="text-zinc-300">{a.filename}</span>
          <span className="mx-2 text-zinc-700">·</span>
          <span className="inline-block w-2 h-2 rounded-full bg-violet-400 align-middle mr-1" />
          B: <span className="text-zinc-300">{b.filename}</span>
        </p>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DeltaTile label="Packets"   aVal={a.packet_count}  bVal={b.packet_count}  format={formatNumber} />
          <DeltaTile label="Duration"  aVal={a.duration}      bVal={b.duration}      format={formatDuration} />
          <DeltaTile label="File size" aVal={a.file_size}     bVal={b.file_size}     format={formatBytes} />
          <DeltaTile label="Data rate" aVal={a.data_rate}     bVal={b.data_rate}     format={(n) => `${formatBytes(n)}/s`} />
        </div>
        <SetDiff label="Protocols"      aSet={aProtos}  bSet={bProtos} />
        <SetDiff label="Top talker flows" aSet={aTalkers} bSet={bTalkers} />
      </div>
    </div>
  )
}
