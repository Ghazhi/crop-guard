'use client'

import { useEffect, useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { type ThemeColors, DEFAULT_THEME, THEME_COLOR_FIELDS } from '../../_logics/branding'

export function ThemeColorsSection() {
  const [theme, setTheme] = usePersistedState<ThemeColors>('branding.theme', DEFAULT_THEME)
  const [draft, setDraft] = useState<ThemeColors>(theme)

  // resync the draft whenever the persisted value changes underneath us —
  // on hydration from sessionStorage, after a reset, or from another instance saving
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDraft(theme) }, [theme])

  const dirty = JSON.stringify(draft) !== JSON.stringify(theme)

  function updateField(key: keyof ThemeColors, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setTheme(draft)
    toast.success('Theme colors updated')
  }

  function handleReset() {
    setTheme(DEFAULT_THEME)
    toast.success('Theme colors reset to default')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Theme Colors</h2>
        </div>
        <div className="flex items-center gap-2">
          <ButtonTemplate variant="outline" size="sm" label="Reset to Default" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset} />
          <ButtonTemplate variant="primary" size="sm" label="Save Changes" isDisabled={!dirty} onClick={handleSave} />
        </div>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        These colors apply across the entire platform — dashboard, sidebar, buttons, and the public landing page.
      </p>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 divide-y divide-gray-100">
        {THEME_COLOR_FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="flex items-center gap-4 px-4 py-3">
            <label className="relative shrink-0 w-10 h-10 rounded-lg border border-gray-200 overflow-hidden cursor-pointer" style={{ backgroundColor: draft[key] }}>
              <input
                type="color"
                value={draft[key]}
                onChange={e => updateField(key, e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-[11px] text-gray-400">{hint}</p>
            </div>
            <input
              value={draft[key]}
              onChange={e => updateField(key, e.target.value)}
              className="w-24 h-8 px-2 text-xs font-mono border border-gray-200 rounded-lg outline-none focus:border-(--brand-green) uppercase"
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-4" style={{ backgroundColor: draft.mint }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: draft.slate }}>Live Preview</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: draft.forest }}>Primary Button</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: draft.green }}>Accent</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: draft.amber }}>Warning</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: draft.red }}>Danger</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: draft.pale, color: draft.forest }}>Badge</span>
        </div>
      </div>
    </div>
  )
}
