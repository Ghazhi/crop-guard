'use client'

import { useState } from 'react'
import { User, Bell, Shield, Globe, Save, Eye, EyeOff } from 'lucide-react'

type Tab = 'profile' | 'notifications' | 'program' | 'security'

interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
}

const defaultNotifications: NotificationSetting[] = [
  {
    id: 'weekly_summary',
    label: 'Weekly summary email',
    description: 'Receive a weekly digest of program activity and key metrics',
    enabled: true,
  },
  {
    id: 'cohort_completion',
    label: 'Cohort completion alerts',
    description: 'Get notified when a cohort is approaching or reaches its end date',
    enabled: true,
  },
  {
    id: 'fri_score_drop',
    label: 'FRI score drops below threshold',
    description: 'Alert when a farmer\'s FRI score falls below your configured threshold',
    enabled: true,
  },
  {
    id: 'new_enrollments',
    label: 'New farmer enrollments',
    description: 'Notify when new farmers are added to any of your cohorts',
    enabled: false,
  },
  {
    id: 'intervention_reminders',
    label: 'Intervention reminders',
    description: 'Reminders for scheduled or overdue interventions',
    enabled: true,
  },
  {
    id: 'agent_absence',
    label: 'Agent absence alerts',
    description: 'Alert when a field agent misses scheduled check-ins',
    enabled: false,
  },
]

export function Main() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [notifications, setNotifications] = useState<NotificationSetting[]>(defaultNotifications)

  // Profile state
  const [fullName, setFullName] = useState('Sarah Okonkwo')
  const [email, setEmail] = useState('sarah.okonkwo@cropguard.io')
  const [phone, setPhone] = useState('+234 801 234 5678')
  const [organisation, setOrganisation] = useState('CropGuard West Africa')
  const [region, setRegion] = useState('Northern Region')

  // Program state
  const [season, setSeason] = useState('2025A')
  const [friThreshold, setFriThreshold] = useState(65)
  const [reminderDay, setReminderDay] = useState('Monday')
  const [completionWarning, setCompletionWarning] = useState(14)

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'program', label: 'Program', icon: <Globe size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  ]

  const toggleNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, notifications, and program preferences.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold select-none">
                SO
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Profile photo</p>
                <button className="mt-0.5 text-sm text-primary hover:underline">
                  Change Photo
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Organisation</label>
                <input
                  type="text"
                  value={organisation}
                  onChange={e => setOrganisation(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Role</label>
                <input
                  type="text"
                  value="Program Manager"
                  readOnly
                  className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={15} />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground mb-2">
              Choose which notifications you receive. You can change these at any time.
            </p>
            <div className="flex flex-col divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{n.label}</span>
                    <span className="text-xs text-muted-foreground">{n.description}</span>
                  </div>
                  {/* Toggle switch */}
                  <button
                    role="switch"
                    aria-checked={n.enabled}
                    onClick={() => toggleNotification(n.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      n.enabled ? 'bg-primary' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        n.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={15} />
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* PROGRAM TAB */}
        {activeTab === 'program' && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">
              Configure program-level defaults and alert thresholds.
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Season selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Current Season</label>
                <select
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {['2024B', '2025A', '2025B', '2026A'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">The active season for reporting and cohort management.</p>
              </div>

              {/* FRI threshold */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">FRI Alert Threshold</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={friThreshold}
                  onChange={e => setFriThreshold(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">Trigger alerts when FRI score drops below this value.</p>
              </div>

              {/* Check-in reminder day */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Check-in Reminder Day</label>
                <select
                  value={reminderDay}
                  onChange={e => setReminderDay(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Day of the week to send agent check-in reminders.</p>
              </div>

              {/* Cohort completion warning */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Cohort Completion Warning (days)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={completionWarning}
                  onChange={e => setCompletionWarning(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">Alert this many days before a cohort's end date.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={15} />
                Save Program Settings
              </button>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-6">
            {/* Change password */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Change Password</h2>
              <div className="flex flex-col gap-3 max-w-sm">
                {/* Current password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button className="flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mt-1">
                  <Save size={15} />
                  Update Password
                </button>
              </div>
            </div>

            <hr className="border-border" />

            {/* Two-factor auth */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add an extra layer of security to your account using an authenticator app.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={twoFactorEnabled}
                onClick={() => setTwoFactorEnabled(v => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  twoFactorEnabled ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    twoFactorEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <hr className="border-border" />

            {/* Session info */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Session Information</h2>
              <div className="rounded-md border border-border bg-muted/40 p-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last login</span>
                  <span className="text-foreground font-medium">07 Jul 2026, 09:14 AM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Device</span>
                  <span className="text-foreground font-medium">Chrome on macOS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IP Address</span>
                  <span className="text-foreground font-medium">197.210.44.12</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
