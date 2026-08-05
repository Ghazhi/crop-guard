'use client'

import { usePersistedState } from '@/lib/usePersistedState'
import { Settings2, User, ClipboardCheck, GraduationCap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MyProfileTab } from './MyProfileTab'
import { CheckinConfigShell } from './checkin/CheckinConfigShell'
import { TrainingConfigShell } from './training/TrainingConfigShell'
import { UserManagementTab } from './UserManagementTab'

type ConfigTab = 'profile' | 'checkin' | 'training' | 'users'

const CONFIG_TABS: { id: ConfigTab; Icon: React.ElementType; label: string }[] = [
  { id: 'profile',  Icon: User,           label: 'My Profile' },
  { id: 'checkin',  Icon: ClipboardCheck, label: 'Check-in Config' },
  { id: 'training', Icon: GraduationCap,  label: 'Training Materials' },
  { id: 'users',    Icon: Users,          label: 'User Management' },
]

export function Main() {
  const [tab, setTab] = usePersistedState<ConfigTab>('config-tab', 'profile')

  return (
    <div className="p-6 space-y-6">
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
      {tab === 'checkin' && <CheckinConfigShell />}
      {tab === 'training' && <TrainingConfigShell />}
      {tab === 'users' && <UserManagementTab />}
    </div>
  )
}
