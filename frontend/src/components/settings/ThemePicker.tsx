import { Check, Palette } from 'lucide-react'
import { useTheme, ACCENTS } from '../../hooks/useTheme'
import { Panel } from '../ui'

export function ThemePicker() {
  const { accent, setAccent } = useTheme()

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Palette size={14} className="text-cyan-400" /> Accent color
        </span>
      }
      description="Re-skins buttons, progress bars, charts, and focus rings across the whole app."
    >
      <div className="flex flex-wrap gap-2">
        {ACCENTS.map(a => {
          const selected = a.id === accent
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccent(a.id)}
              aria-label={`Use ${a.label} accent`}
              aria-pressed={selected}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-line bg-panel-raised/40 hover:bg-panel-raised transition-colors"
              style={selected ? { borderColor: a.swatch } : undefined}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full shadow-inner"
                style={{ backgroundColor: a.swatch }}
              >
                {selected && <Check size={12} className="text-white" strokeWidth={3} />}
              </span>
              <span className="text-xs text-ink">{a.label}</span>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
