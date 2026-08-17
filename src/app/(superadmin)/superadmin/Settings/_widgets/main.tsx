'use client'

import { Settings2, Check } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'
import { useState } from 'react'

interface PlatformSettings {
  platformName:  string
  supportEmail:  string
  maintenanceMode: boolean
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'CropGuard+',
  supportEmail: 'support@cropguard.org',
  maintenanceMode: false,
}

export function Main() {
  const [settings, setSettings] = usePersistedState<PlatformSettings>('sa-platform-settings', DEFAULT_SETTINGS)
  const [draft, setDraft] = useState<PlatformSettings>(settings)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSettings(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>System Settings</h1>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Platform-level configuration (illustrative — not wired to a real backend)</p>
        </div>
      </div>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm p-6 flex flex-col gap-4">
        <InputTemplate
          label="Platform Name"
          value={draft.platformName}
          onChange={e => setDraft({ ...draft, platformName: e.target.value })}
        />
        <InputTemplate
          label="Support Email" type="email"
          value={draft.supportEmail}
          onChange={e => setDraft({ ...draft, supportEmail: e.target.value })}
        />
        <CheckboxTemplate
          label="Maintenance Mode"
          hint="When enabled, all tenants see a maintenance page instead of the app"
          checked={draft.maintenanceMode}
          onChange={e => setDraft({ ...draft, maintenanceMode: e.target.checked })}
        />
        <div className="flex items-center gap-3 pt-2">
          <ButtonTemplate variant="primary" size="sm" label="Save Changes" onClick={handleSave} />
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
              <Check className="w-4 h-4" /> Changes saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
