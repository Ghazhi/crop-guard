'use client'

import { useEffect, useState } from 'react'
import { Lock, Check, Eye, EyeOff } from 'lucide-react'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import type { AuthUser, UserRole } from '@/app/login/_logics/interface'
import { REGIONS } from '@/dataCenter/communityProfile'

const ROLE_LABEL: Record<UserRole, string> = {
  staff:       'Staff',
  partner:     'Partner',
  finance:     'Finance',
  pm:          'Program Manager',
  super_admin: 'Super Admin',
}

const REGION_OPTIONS = REGIONS.map(r => ({ value: r.code, label: r.name }))

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

interface ProfileFormState {
  fullName: string
  email:    string
  phone:    string
  region:   string
  gender:   string
}

export function MyProfileTab() {
  const defaultAuthUser: AuthUser = { name: 'Abena Owusu', initials: 'AO', org: 'CropGuard' }
  const [role, setRole] = useState<UserRole>('staff')

  const [form, setForm] = useState<ProfileFormState>({
    fullName: defaultAuthUser.name,
    email:    `${defaultAuthUser.name.toLowerCase().replace(/\s+/g, '.')}@cropguard.org`,
    phone:    '0241234567',
    region:   REGION_OPTIONS[0]?.value ?? '',
    gender:   'prefer_not_to_say',
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(session => {
        if (session?.user) {
          setForm(f => ({
            ...f,
            fullName: session.user.name,
            email:    `${session.user.name.toLowerCase().replace(/\s+/g, '.')}@cropguard.org`,
          }))
        }
        if (session?.role) setRole(session.role)
      })
      .catch(() => {})
  }, [])

  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  const pwValid = oldPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword

  function handlePasswordUpdate() {
    if (!pwValid) return
    setPwSaved(true)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    window.setTimeout(() => setPwSaved(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Profile card */}
      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-white text-2xl font-bold"
            style={{ backgroundColor: 'var(--brand-forest)' }}
          >
            {form.fullName.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 truncate">{form.fullName}</p>
            <p className="text-sm text-gray-500 truncate">{form.email}</p>
            <div className="mt-1.5">
              <BadgeTemplate label={ROLE_LABEL[role]} variant="info" size="sm" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputTemplate
            label="Full Name"
            value={form.fullName}
            onChange={e => setForm({ ...form, fullName: e.target.value })}
          />
          <InputTemplate
            label="Email"
            value={form.email}
            isDisabled
            className="bg-gray-50"
          />
          <InputTemplate
            label="Phone"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
          <SelectTemplate
            label="Region"
            options={REGION_OPTIONS}
            value={form.region}
            onChange={e => setForm({ ...form, region: e.target.value })}
          />
          <SelectTemplate
            label="Gender"
            options={GENDER_OPTIONS}
            value={form.gender}
            onChange={e => setForm({ ...form, gender: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3">
          <ButtonTemplate variant="primary" size="sm" label="Save Changes" onClick={handleSave} />
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
              <Check className="w-4 h-4" /> Changes saved
            </span>
          )}
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputTemplate
            label="Old Password"
            type={showOld ? 'text' : 'password'}
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            rightIcon={
              <button type="button" onClick={() => setShowOld(v => !v)} className="text-gray-400 hover:text-gray-600">
                {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
            className="sm:col-span-2"
          />
          <InputTemplate
            label="New Password"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            rightIcon={
              <button type="button" onClick={() => setShowNew(v => !v)} className="text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
            hint="At least 6 characters"
          />
          <InputTemplate
            label="Confirm Password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            rightIcon={
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
            error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          />
        </div>

        <div className="flex items-center gap-3">
          <ButtonTemplate variant="outline" size="sm" label="Update Password" isDisabled={!pwValid} onClick={handlePasswordUpdate} />
          {pwSaved && (
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
              <Check className="w-4 h-4" /> Password updated
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
