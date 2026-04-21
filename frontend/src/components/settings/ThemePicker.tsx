import { Check, Palette } from 'lucide-react'
import { useTheme, ACCENTS } from '../../hooks/useTheme'

export function ThemePicker() {
  const { accent, setAccent } = useTheme()

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Palette size={16} className="text-cyan-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Accent color</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Re-skins buttons, progress bars, charts, and focus rings across the whole app.
      </p>
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
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 transition-colors"
              style={selected ? { borderColor: a.swatch } : undefined}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full shadow-inner"
                style={{ backgroundColor: a.swatch }}
              >
                {selected && <Check size={12} className="text-white" strokeWidth={3} />}
              </span>
              <span className="text-xs text-zinc-300">{a.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
