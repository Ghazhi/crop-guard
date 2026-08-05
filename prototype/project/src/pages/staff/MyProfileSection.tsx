import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Gender, RegionCode } from '@/types';

const REGIONS: { code: RegionCode; label: string }[] = [
  { code: 'AA', label: 'Ahafo' }, { code: 'AH', label: 'Ashanti' },
  { code: 'BA', label: 'Bono East' }, { code: 'BE', label: 'Berekum' },
  { code: 'CE', label: 'Central' }, { code: 'EP', label: 'Eastern' },
  { code: 'NE', label: 'North East' }, { code: 'NR', label: 'Northern' },
  { code: 'OT', label: 'Oti' }, { code: 'SA', label: 'Savannah' },
  { code: 'UE', label: 'Upper East' }, { code: 'UW', label: 'Upper West' },
  { code: 'VR', label: 'Volta' }, { code: 'WN', label: 'Western North' },
  { code: 'WR', label: 'Western' }, { code: 'SW', label: 'South West' },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

interface Toast { message: string; type: 'success' | 'error' }

export default function MyProfileSection() {
  const { profile, authUser, fetchProfile } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [regionCode, setRegionCode] = useState<RegionCode | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordToast, setPasswordToast] = useState<Toast | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setRegionCode(profile?.region_code ?? '');
    setGender(profile?.gender ?? '');
  }, [profile]);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }
  function showPwToast(msg: string, type: 'success' | 'error' = 'success') {
    setPasswordToast({ message: msg, type });
    setTimeout(() => setPasswordToast(null), 3000);
  }

  async function handleSaveProfile() {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        region_code: regionCode || null,
        gender: gender || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { showToast('Failed to save profile', 'error'); return; }
    await fetchProfile(profile.id);
    showToast('Profile updated successfully');
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) { showPwToast('Password must be at least 6 characters', 'error'); return; }
    if (newPassword !== confirmPassword) { showPwToast('Passwords do not match', 'error'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { showPwToast(error.message, 'error'); return; }
    setNewPassword('');
    setConfirmPassword('');
    showPwToast('Password changed successfully');
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile header card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-cropguard-forest text-white flex items-center justify-center text-2xl font-bold shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{profile?.full_name || 'User'}</h3>
            <p className="text-sm text-gray-500">{authUser?.email}</p>
            <Badge className="mt-1 capitalize border-0 bg-cropguard-mint text-cropguard-forest">{profile?.role}</Badge>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input value={authUser?.email ?? ''} disabled className="bg-gray-50 text-gray-500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone
              </Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Region
              </Label>
              <select
                value={regionCode} onChange={e => setRegionCode(e.target.value as RegionCode | '')}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30"
              >
                <option value="">— Select —</option>
                {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Gender</Label>
              <select
                value={gender} onChange={e => setGender(e.target.value as Gender | '')}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30"
              >
                <option value="">— Select —</option>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-cropguard-forest hover:bg-cropguard-dark">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
            {toast && (
              <span className={cn('text-sm font-medium flex items-center gap-1.5',
                toast.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {toast.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Password change card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-cropguard-forest" />
          <h3 className="text-base font-bold text-gray-900">Change Password</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Update Password
            </Button>
            {passwordToast && (
              <span className={cn('text-sm font-medium flex items-center gap-1.5',
                passwordToast.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                {passwordToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passwordToast.message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
