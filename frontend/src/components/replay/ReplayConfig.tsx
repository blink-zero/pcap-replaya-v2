import { useEffect, useState } from 'react'
import { Save, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { getInterfaces, getProfiles, createProfile, type NetworkInterface, type ConfigProfile } from '../../services/api'

export interface ReplaySettings {
  interface: string
  speedMultiplier: number
  pps: number | null
  usePps: boolean
  continuous: boolean
}

interface Props {
  settings: ReplaySettings
  onChange: (settings: ReplaySettings) => void
}

export function ReplayConfig({ settings, onChange }: Props) {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
  const [profiles, setProfiles] = useState<ConfigProfile[]>([])
  const [profileName, setProfileName] = useState('')
  const [showSave, setShowSave] = useState(false)

  useEffect(() => {
    getInterfaces().then(setInterfaces).catch(() => {})
    getProfiles().then(setProfiles).catch(() => {})
  }, [])

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return
    try {
      await createProfile({
        name: profileName,
        description: '',
        interface: settings.interface,
        speed: settings.usePps ? (settings.pps ?? 1000) : settings.speedMultiplier,
        speed_unit: settings.usePps ? 'pps' : 'multiplier',
        continuous: settings.continuous,
      })
      toast.success('Profile saved')
      setProfileName('')
      setShowSave(false)
      getProfiles().then(setProfiles).catch(() => {})
    } catch {
      toast.error('Failed to save profile')
    }
  }

  const loadProfile = (p: ConfigProfile) => {
    onChange({
      interface: p.interface,
      speedMultiplier: p.speed_unit === 'multiplier' ? p.speed : 1,
      pps: p.speed_unit === 'pps' ? p.speed : null,
      usePps: p.speed_unit === 'pps',
      continuous: p.continuous,
    })
    toast.success(`Loaded profile: ${p.name}`)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Replay Configuration</h2>
        <div className="flex items-center gap-2">
          {profiles.length > 0 && (
            <div className="relative group">
              <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
                <FolderOpen size={16} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => loadProfile(p)}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setShowSave(!showSave)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Save size={16} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Interface */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Network Interface</label>
          <select
            value={settings.interface}
            onChange={(e) => onChange({ ...settings, interface: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Select interface...</option>
            {interfaces.map(i => (
              <option key={i.name} value={i.name} disabled={!i.is_up}>
                {i.name} {i.addresses?.[0]?.address ? `(${i.addresses[0].address})` : ''} {!i.is_up ? '(down)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Speed control */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-400">Speed Control</label>
            <button
              onClick={() => onChange({ ...settings, usePps: !settings.usePps })}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              {settings.usePps ? 'Switch to Multiplier' : 'Switch to PPS'}
            </button>
          </div>
          {settings.usePps ? (
            <div>
              <input
                type="number"
                min={1}
                value={settings.pps ?? ''}
                onChange={(e) => onChange({ ...settings, pps: parseInt(e.target.value) || null })}
                placeholder="Packets per second"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Set exact packets per second rate</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={settings.speedMultiplier}
                  onChange={(e) => onChange({ ...settings, speedMultiplier: parseFloat(e.target.value) })}
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-sm text-zinc-200 w-14 text-right font-mono">{settings.speedMultiplier}x</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[0.5, 1, 2, 5, 10, 50].map(v => (
                  <button
                    key={v}
                    onClick={() => onChange({ ...settings, speedMultiplier: v })}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      settings.speedMultiplier === v
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {v}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continuous mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">Continuous Mode</p>
            <p className="text-xs text-zinc-500">Loop replay indefinitely</p>
          </div>
          <button
            onClick={() => onChange({ ...settings, continuous: !settings.continuous })}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.continuous ? 'bg-cyan-500' : 'bg-zinc-700'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              settings.continuous ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Save profile */}
        {showSave && (
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Profile name..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={handleSaveProfile}
              className="px-3 py-1.5 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
