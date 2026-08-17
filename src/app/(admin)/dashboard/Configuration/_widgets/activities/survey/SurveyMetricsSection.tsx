'use client'

import { BarChart3, FileSpreadsheet, Calendar, Pause } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type SurveyTemplate, type SurveySchedule,
  SEED_SURVEY_TEMPLATES, SEED_SURVEY_SCHEDULES,
} from '../../../_logics/surveyConfig'

export function SurveyMetricsSection() {
  const [templates] = usePersistedState<SurveyTemplate[]>('surveyConfig.templates', SEED_SURVEY_TEMPLATES)
  const [schedules] = usePersistedState<SurveySchedule[]>('surveyConfig.schedules', SEED_SURVEY_SCHEDULES)

  const configuredCount = schedules.filter(s => s.isConfigured).length
  const pausedCount = schedules.filter(s => s.isPaused).length

  const stats = [
    { icon: FileSpreadsheet, label: 'Survey Templates',    value: templates.length },
    { icon: Calendar,        label: 'Scheduled Cohorts',   value: schedules.length },
    { icon: BarChart3,       label: 'Configured',          value: configuredCount },
    { icon: Pause,           label: 'Paused',              value: pausedCount },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Survey Metrics</h3>
        <p className="text-xs text-gray-400">Summary of survey template and schedule activity</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
              <Icon className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-8 flex flex-col items-center gap-2">
        <BarChart3 className="w-8 h-8 text-gray-200" />
        <p className="text-sm font-medium text-gray-400 text-center">No response-level metrics data yet.</p>
        <p className="text-xs text-gray-400 text-center max-w-sm">Once farmers begin submitting surveys, response rates and completion trends will appear here.</p>
      </div>
    </div>
  )
}
