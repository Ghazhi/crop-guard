import { useState, useEffect } from 'react';
import { LogOut, User, Mail, Phone, MapPin, Save, Lock, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RegionCode } from '@/types';

const REGIONS: { code: RegionCode; label: string }[] = [
  { code: 'AA', label: 'Ahafo' }, { code: 'AH', label: 'Ashanti' },
  { code: 'BA', label: 'Bono East' }, { code: 'CE', label: 'Central' },
  { code: 'EP', label: 'Eastern' }, { code: 'NE', label: 'North East' },
  { code: 'NR', label: 'Northern' }, { code: 'OT', label: 'Oti' },
  { code: 'SA', label: 'Savannah' }, { code: 'UE', label: 'Upper East' },
  { code: 'UW', label: 'Upper West' }, { code: 'VR', label: 'Volta' },
  { code: 'WN', label: 'Western North' }, { code: 'WR', label: 'Western' },
];

interface Toast { message: string; type: 'success' | 'error' }

export default function AgentProfilePage() {
  const navigate = useNavigate();
  const { profile, authUser, fetchProfile, signOut } = useAuthStore();

  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [regionCode, setRegionCode] = useState<RegionCode | ''>('');
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<Toast | null>(null);

  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwToast, setPwToast]       = useState<Toast | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setRegionCode(profile?.region_code ?? '');
  }, [profile]);

  function show(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }
  function showPw(msg: string, type: 'success' | 'error' = 'success') {
    setPwToast({ message: msg, type });
    setTimeout(() => setPwToast(null), 3000);
  }

  async function saveProfile() {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      region_code: regionCode || null,
    }).eq('id', profile.id);
    setSaving(false);
    if (error) { show('Failed to save profile', 'error'); return; }
    await fetchProfile(profile.id);
    show('Profile updated');
  }

  async function changePassword() {
    if (newPw.length < 6) { showPw('Password must be at least 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showPw('Passwords do not match', 'error'); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setChangingPw(false);
    if (error) { showPw(error.message, 'error'); return; }
    setNewPw(''); setConfirmPw('');
    showPw('Password changed');
  }

  return (
    <div className="p-4 pb-10 space-y-5 max-w-lg mx-auto">
      <div className="flex items-center gap-2 pt-2">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-cropguard-forest">My Profile</h2>
      </div>

      {/* Avatar + name */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-cropguard-dark flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-cropguard-forest text-base">{profile?.full_name || '—'}</p>
            <p className="text-sm text-gray-500">{authUser?.email}</p>
            <Badge className="mt-1 capitalize border-0 bg-cropguard-mint text-cropguard-forest text-xs">Field Agent</Badge>
          </div>
        </div>

        <div className="space-y-3">
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

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={saveProfile} disabled={saving} className="bg-cropguard-forest hover:bg-cropguard-dark">
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

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-cropguard-forest" />
          <h3 className="font-bold text-gray-900 text-sm">Change Password</h3>
        </div>
        <div className="space-y-3">
          <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" />
          <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm password" />
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={changePassword} disabled={changingPw || !newPw}>
              {changingPw ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Update Password
            </Button>
            {pwToast && (
              <span className={cn('text-sm font-medium flex items-center gap-1.5',
                pwToast.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                {pwToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {pwToast.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <Button variant="outline" className="w-full text-red-600 border-red-100 hover:bg-red-50" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
