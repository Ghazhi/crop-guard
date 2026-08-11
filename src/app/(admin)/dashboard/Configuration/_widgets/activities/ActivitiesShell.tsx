'use client'

import { Zap, ClipboardCheck, GraduationCap, FileSpreadsheet } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { cn } from '@/lib/utils'
import { CheckinConfigShell } from '../checkin/CheckinConfigShell'
import { TrainingConfigShell } from '../training/TrainingConfigShell'
import { SurveyConfigShell } from './survey/SurveyConfigShell'

type ActivityTab = 'checkin' | 'training' | 'survey'

const ACTIVITY_TABS: { id: ActivityTab; Icon: React.ElementType; label: string }[] = [
  { id: 'checkin',  Icon: ClipboardCheck,   label: 'Check-in' },
  { id: 'training', Icon: GraduationCap,    label: 'Training' },
  { id: 'survey',   Icon: FileSpreadsheet,  label: 'Survey'   },
]

export function ActivitiesShell() {
  const [tab, setTab] = usePersistedState<ActivityTab>('activitiesConfig.tab', 'checkin')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <Zap className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900">Activities</h2>
          <p className="text-xs text-gray-500">Configure check-in, training, and survey activities</p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {ACTIVITY_TABS.map(({ id, Icon, label }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                active ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
              style={active ? { color: 'var(--brand-forest)' } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'checkin' && <CheckinConfigShell />}
      {tab === 'training' && <TrainingConfigShell />}
      {tab === 'survey' && <SurveyConfigShell />}
    </div>
  )
}
