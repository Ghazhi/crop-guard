'use client'

import { BarChart3, Lightbulb, Calendar, Pause } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type AdvisoryTemplate, type AdvisorySchedule,
  SEED_ADVISORY_TEMPLATES, SEED_ADVISORY_SCHEDULES,
} from '../../_logics/advisoryConfig'

export function AdvisoryMetricsSection() {
  const [templates] = usePersistedState<AdvisoryTemplate[]>('advisoryConfig.templates', SEED_ADVISORY_TEMPLATES)
  const [schedules] = usePersistedState<AdvisorySchedule[]>('advisoryConfig.schedules', SEED_ADVISORY_SCHEDULES)

  const configuredCount = schedules.filter(s => s.isConfigured).length
  const pausedCount = schedules.filter(s => s.isPaused).length

  const stats = [
    { icon: Lightbulb,  label: 'Advisory Templates', value: templates.length },
    { icon: Calendar,   label: 'Scheduled Cohorts',  value: schedules.length },
    { icon: BarChart3,  label: 'Configured',         value: configuredCount },
    { icon: Pause,      label: 'Paused',             value: pausedCount },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Advisory Metrics</h3>
        <p className="text-xs text-gray-400">Summary of advisory template and schedule activity</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
              <Icon className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-2">
        <BarChart3 className="w-8 h-8 text-gray-200" />
        <p className="text-sm font-medium text-gray-400 text-center">No delivery-level metrics data yet.</p>
        <p className="text-xs text-gray-400 text-center max-w-sm">Once advisories begin sending to farmers, delivery rates and engagement trends will appear here.</p>
      </div>
    </div>
  )
}
