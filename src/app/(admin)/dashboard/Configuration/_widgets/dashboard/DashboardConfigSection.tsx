'use client'

import { RotateCcw } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import {
  DASHBOARD_WIDGETS, DEFAULT_DASHBOARD_WIDGET_VISIBILITY, DASHBOARD_WIDGET_VISIBILITY_KEY,
  type DashboardWidgetVisibility,
} from '../../_logics/dashboardConfig'

export function DashboardConfigSection() {
  const [visibility, setVisibility] = usePersistedState<DashboardWidgetVisibility>(
    DASHBOARD_WIDGET_VISIBILITY_KEY, DEFAULT_DASHBOARD_WIDGET_VISIBILITY,
  )

  function toggle(id: keyof DashboardWidgetVisibility) {
    setVisibility(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleReset() {
    setVisibility(DEFAULT_DASHBOARD_WIDGET_VISIBILITY)
  }

  const groups = Array.from(new Set(DASHBOARD_WIDGETS.map(w => w.group)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ButtonTemplate variant="outline" size="sm" label="Reset to Default" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset} />
      </div>

      {groups.map(group => (
        <div key={group} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-gray-400">{group}</p>
          <div className="divide-y divide-gray-100">
            {DASHBOARD_WIDGETS.filter(w => w.group === group).map(w => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-gray-800">{w.label}</p>
                <button
                  role="switch"
                  aria-checked={visibility[w.id]}
                  onClick={() => toggle(w.id)}
                  className="relative w-10 h-5.5 rounded-full transition-colors shrink-0"
                  style={{ backgroundColor: visibility[w.id] ? 'var(--brand-forest)' : '#D1D5DB' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform shadow"
                    style={{ transform: visibility[w.id] ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
