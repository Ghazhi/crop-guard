'use client'

import { usePersistedState } from '@/lib/usePersistedState'
import { Settings2, User, Users, Palette, GitBranch, Building2, Zap, Lightbulb, LayoutTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MyProfileTab } from './MyProfileTab'
import { UserManagementTab } from './UserManagementTab'
import { OrganizationsSection } from './organizations/OrganizationsSection'
import { ActivitiesShell } from './activities/ActivitiesShell'
import { BrandingConfigShell } from './branding/BrandingConfigShell'
import { WorkflowStagesSection } from './workflow/WorkflowStagesSection'
import { AdvisoryConfigShell } from './advisory/AdvisoryConfigShell'
import { FormsConfigSection } from './forms/FormsConfigSection'

type ConfigTab = 'profile' | 'users' | 'organizations' | 'activities' | 'forms' | 'branding' | 'workflow' | 'advisory'

const CONFIG_TABS: { id: ConfigTab; Icon: React.ElementType; label: string }[] = [
  { id: 'profile',       Icon: User,       label: 'My Profile' },
  { id: 'users',         Icon: Users,      label: 'User Management' },
  { id: 'organizations', Icon: Building2,  label: 'Organizations' },
  { id: 'activities',    Icon: Zap,        label: 'Activities' },
  { id: 'forms',         Icon: LayoutTemplate, label: 'Forms' },
  { id: 'branding',      Icon: Palette,    label: 'Branding' },
  { id: 'workflow',      Icon: GitBranch,  label: 'Workflow Stages' },
  { id: 'advisory',      Icon: Lightbulb,  label: 'Advisory' },
]

export function Main() {
  const [tab, setTab] = usePersistedState<ConfigTab>('config-tab', 'profile')

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <Settings2 className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Configuration</h1>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Manage your profile, check-in settings, and platform users</p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto w-fit max-w-full">
        {CONFIG_TABS.map(({ id, Icon, label }) => {
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

      {tab === 'profile' && <MyProfileTab />}
      {tab === 'users' && <UserManagementTab />}
      {tab === 'organizations' && <OrganizationsSection />}
      {tab === 'activities' && <ActivitiesShell />}
      {tab === 'forms' && <FormsConfigSection />}
      {tab === 'branding' && <BrandingConfigShell />}
      {tab === 'workflow' && <WorkflowStagesSection />}
      {tab === 'advisory' && <AdvisoryConfigShell />}
    </div>
  )
}
