'use client'

import { CheckSquare, Sprout, Layers, ClipboardCheck, Calendar, Users } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ScrollTabsTemplate } from '@/customComponents/ScrollTabsTemplate'
import { CropsSection } from './CropsSection'
import { BaselineTemplatesSection } from './BaselineTemplatesSection'
import { CheckinTemplatesSection } from './CheckinTemplatesSection'
import { CohortSchedulesSection } from './CohortSchedulesSection'
import { FarmerOverridesSection } from './FarmerOverridesSection'

type SectionKey = 'crops' | 'baselines' | 'checkins' | 'schedules' | 'overrides'

const SECTIONS: { key: SectionKey; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'crops',     icon: Sprout,         label: 'Crops',                     desc: 'Add and manage crop types'                                 },
  { key: 'baselines', icon: Layers,         label: 'Baseline Templates',        desc: 'Create reusable baseline assessments with 4 pillars + ECI' },
  { key: 'checkins',  icon: ClipboardCheck, label: 'Weekly Check-in Templates', desc: 'Create multi-week check-in templates by crop & season'    },
  { key: 'schedules', icon: Calendar,       label: 'Cohort Schedules',          desc: 'Set start mode, link templates, pause schedules'           },
  { key: 'overrides', icon: Users,          label: 'Farmer Overrides',          desc: 'Pause check-ins for specific farmers within a cohort'      },
]

export function CheckinConfigShell() {
  const [section, setSection] = usePersistedState<SectionKey>('checkinConfigV2.section', 'baselines')

  return (
    <div className="flex flex-col gap-4">
      {/* secondary header — Configuration page already renders the outer "Configuration" h1 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <CheckSquare className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900">Check-in Configuration</h2>
          <p className="text-xs text-gray-500">Configure baseline templates, weekly check-in templates, cohort schedules, and farmer overrides</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* left section nav — same visual pattern as the standalone CheckinConfig page's section rail */}
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
          {section === 'crops' && <CropsSection />}
          {section === 'baselines' && <BaselineTemplatesSection />}
          {section === 'checkins' && <CheckinTemplatesSection />}
          {section === 'schedules' && <CohortSchedulesSection />}
          {section === 'overrides' && <FarmerOverridesSection />}
        </div>
      </div>
    </div>
  )
}
