'use client'

import { useState } from 'react'
import { User, Bell, Shield, Globe, Save, Eye, EyeOff, Settings2, Check } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { cn } from '@/lib/utils'

type Tab = 'profile' | 'notifications' | 'program' | 'security'

const INPUT_CLASS =
  'border border-gray-200 rounded-lg px-3 h-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors bg-white'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{children}</label>
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) bg-white"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Main() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile
  const [name, setName] = useState('Sarah Okonkwo')
  const [email, setEmail] = useState('sarah.okonkwo@cropguard.io')
  const [phone, setPhone] = useState('+234 801 234 5678')
  const [org, setOrg] = useState('CropGuard West Africa')
  const [region, setRegion] = useState('Northern Region')

  // Notifications — 6 individual booleans
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [cohortCompletion, setCohortCompletion] = useState(true)
  const [friScoreDrop, setFriScoreDrop] = useState(true)
  const [newEnrollments, setNewEnrollments] = useState(false)
  const [interventionReminders, setInterventionReminders] = useState(true)
  const [agentAbsence, setAgentAbsence] = useState(false)

  // Program
  const [friThreshold, setFriThreshold] = useState('65')
  const [reminderDay, setReminderDay] = useState('Monday')
  const [warningDays, setWarningDays] = useState('14')

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)

  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1200)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'program', label: 'Program', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-3.5 h-3.5" /> },
  ]

  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Settings2 className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Account and programme preferences</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === t.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold select-none shrink-0"
              style={{ background: 'var(--brand-forest)' }}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Program Manager</p>
            </div>
          </div>

          {/* Form grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Full Name</FieldLabel>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Phone</FieldLabel>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Organisation</FieldLabel>
              <input
                type="text"
                value={org}
                onChange={e => setOrg(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Region</FieldLabel>
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Role</FieldLabel>
              <input
                type="text"
                value="Program Manager"
                readOnly
                className={cn(INPUT_CLASS, 'bg-gray-50 text-gray-400 cursor-not-allowed')}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <ButtonTemplate
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              isLoading={saving}
              onClick={handleSave}
            >
              Save Profile
            </ButtonTemplate>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Notification Preferences</h3>

          {(
            [
              {
                label: 'Weekly summary email',
                description: 'Receive a weekly digest of programme activity and key metrics',
                value: weeklySummary,
                set: setWeeklySummary,
              },
              {
                label: 'Cohort completion alerts',
                description: 'Get notified when a cohort is approaching or reaches its end date',
                value: cohortCompletion,
                set: setCohortCompletion,
              },
              {
                label: 'FRI score drops below threshold',
                description: `Alert when a farmer's FRI score falls below your configured threshold (${friThreshold})`,
                value: friScoreDrop,
                set: setFriScoreDrop,
              },
              {
                label: 'New farmer enrollments',
                description: 'Notify when new farmers are added to any of your cohorts',
                value: newEnrollments,
                set: setNewEnrollments,
              },
              {
                label: 'Intervention reminders',
                description: 'Reminders for scheduled or overdue interventions',
                value: interventionReminders,
                set: setInterventionReminders,
              },
              {
                label: 'Agent absence alerts',
                description: 'Alert when a field agent misses scheduled check-ins',
                value: agentAbsence,
                set: setAgentAbsence,
              },
            ] as const
          ).map(({ label, description, value, set }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => (set as React.Dispatch<React.SetStateAction<boolean>>)(v => !v)}
                className={
                  'w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ' +
                  (value ? 'bg-(--brand-green)' : 'bg-gray-200')
                }
              >
                <div
                  className={
                    'w-4 h-4 bg-white rounded-full shadow transition-transform ' +
                    (value ? 'translate-x-5' : 'translate-x-0')
                  }
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PROGRAM TAB */}
      {activeTab === 'program' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-0">Programme Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Current Season</FieldLabel>
              <input
                type="text"
                value="2025A"
                readOnly
                className={cn(INPUT_CLASS, 'bg-gray-50 text-gray-400 cursor-not-allowed')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>FRI Alert Threshold</FieldLabel>
              <input
                type="number"
                min={0}
                max={100}
                value={friThreshold}
                onChange={e => setFriThreshold(e.target.value)}
                className={INPUT_CLASS}
              />
              <p className="text-xs text-gray-400">Farmers below this score trigger alerts</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Check-in Reminder Day</FieldLabel>
              <FilterSelect
                label=""
                value={reminderDay}
                onChange={setReminderDay}
                options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => ({
                  value: d,
                  label: d,
                }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Completion Warning</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={warningDays}
                  onChange={e => setWarningDays(e.target.value)}
                  className={cn(INPUT_CLASS, 'w-24 shrink-0')}
                />
                <span className="text-xs text-gray-400">days before cohort end date</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <ButtonTemplate
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              isLoading={saving}
              onClick={handleSave}
            >
              Save Programme Settings
            </ButtonTemplate>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-0">Change Password</h3>

          <div className="flex flex-col gap-4 max-w-sm">
            {/* Current password */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Current Password</FieldLabel>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className={cn(INPUT_CLASS, 'pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>New Password</FieldLabel>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Enter new password"
                  className={cn(INPUT_CLASS, 'pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Confirm New Password</FieldLabel>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {/* Two-factor */}
          <div className="border-t border-gray-100 pt-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-700">Two-Factor Authentication</h3>
            <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Enable two-factor authentication</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Add an extra layer of security using an authenticator app
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactor(v => !v)}
                className={
                  'w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ' +
                  (twoFactor ? 'bg-(--brand-green)' : 'bg-gray-200')
                }
              >
                <div
                  className={
                    'w-4 h-4 bg-white rounded-full shadow transition-transform ' +
                    (twoFactor ? 'translate-x-5' : 'translate-x-0')
                  }
                />
              </button>
            </div>
          </div>

          {/* Session info */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Session</h3>
            <p className="text-xs text-gray-400">
              Last login: Today at 9:42 AM &middot; Chrome on macOS
            </p>
          </div>

          <div className="flex justify-end">
            <ButtonTemplate
              variant="danger"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              isLoading={saving}
              onClick={handleSave}
            >
              Update Password
            </ButtonTemplate>
          </div>
        </div>
      )}
    </div>
  )
}
