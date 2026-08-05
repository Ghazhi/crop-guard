'use client'

import { GraduationCap, Calendar, Video } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ScrollTabsTemplate } from '@/customComponents/ScrollTabsTemplate'
import { WeeklyContentSection } from './WeeklyContentSection'
import { TrainingScheduleSection } from './TrainingScheduleSection'
import { TrainingSessionsSection } from './TrainingSessionsSection'

type SectionKey = 'content' | 'schedule' | 'sessions'

const SECTIONS: { key: SectionKey; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'content',  icon: GraduationCap, label: 'Weekly Content',    desc: 'Crop-specific training templates per week' },
  { key: 'schedule', icon: Calendar,      label: 'Training Schedule', desc: 'Cohort schedules & per-farmer overrides'   },
  { key: 'sessions', icon: Video,         label: 'Training Sessions', desc: 'In-person & online event scheduling'      },
]

export function TrainingConfigShell() {
  const [section, setSection] = usePersistedState<SectionKey>('trainingConfigV2.section', 'content')

  return (
    <div className="flex flex-col gap-4">
      {/* secondary header — Configuration page already renders the outer "Configuration" h1 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <GraduationCap className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900">Training Materials</h2>
          <p className="text-xs text-gray-500">Configure weekly training content, schedules, and sessions</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* left section nav — same visual pattern as the Check-in Config shell's section rail */}
        <div className="w-full md:w-56 md:shrink-0 min-w-0">
          <div className="hidden md:flex md:flex-col gap-1">
            {SECTIONS.map(({ key, icon: Icon, label, desc }) => {
              const active = section === key
              return (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  style={active ? { background: 'var(--brand-forest)' } : {}}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <ScrollTabsTemplate className="md:hidden gap-1 pb-1" fadeColor="gray-50">
            {SECTIONS.map(({ key, icon: Icon, label, desc }) => {
              const active = section === key
              return (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors shrink-0 whitespace-nowrap ${
                    active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  style={active ? { background: 'var(--brand-forest)' } : {}}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{desc}</p>
                  </div>
                </button>
              )
            })}
          </ScrollTabsTemplate>
        </div>

        {/* main content */}
        <div className="w-full flex-1 min-w-0">
          {section === 'content' && <WeeklyContentSection />}
          {section === 'schedule' && <TrainingScheduleSection />}
          {section === 'sessions' && <TrainingSessionsSection />}
        </div>
      </div>
    </div>
  )
}
