import { useEffect, useState } from 'react';
import { LogOut, Phone, MapPin, Sprout, Calendar, ShieldCheck, Loader2,
         User, Mail, Save, Lock, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FarmerRecord {
  full_name: string | null;
  phone: string | null;
  community: string | null;
  district: string | null;
  primary_crop: string | null;
  is_verified: boolean;
  created_at: string | null;
  years_farm_experience: number | null;
}

interface Toast { message: string; type: 'success' | 'error' }

export default function FarmerProfilePage() {
  const navigate = useNavigate();
  const { profile, authUser, fetchProfile, signOut } = useAuthStore();
  const [farmer, setFarmer] = useState<FarmerRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // editable auth-profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<Toast | null>(null);

  // password
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwToast, setPwToast]   = useState<Toast | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from('farmers')
      .select('full_name, phone, community, district, primary_crop, is_verified, created_at, years_farm_experience')
      .eq('user_id', profile.id).maybeSingle()
      .then(({ data }) => {
        setFarmer(data as FarmerRecord | null);
        setLoading(false);
      });
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
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
    }).eq('id', profile.id);
    setSaving(false);
    if (error) { show('Failed to save', 'error'); return; }
    await fetchProfile(profile.id);
    show('Profile updated');
  }

  async function changePassword() {
    if (newPw.length < 6) { showPw('Minimum 6 characters', 'error'); return; }
    if (newPw !== confirmPw) { showPw('Passwords do not match', 'error'); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setChangingPw(false);
    if (error) { showPw(error.message, 'error'); return; }
    setNewPw(''); setConfirmPw('');
    showPw('Password changed');
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cropguard-mid animate-spin" />
      </div>
    );
  }

  const joinedDate = farmer?.created_at
    ? new Date(farmer.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="p-4 space-y-4 pb-10">
      <div className="flex items-center gap-2 pt-2">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-cropguard-forest">My Profile</h2>
      </div>

      {/* Identity card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-cropguard-dark flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'F'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-cropguard-forest">{profile?.full_name || '—'}</p>
              <p className="text-sm text-cropguard-slate">{authUser?.email}</p>
              {farmer?.is_verified && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Verified Farmer
                </span>
              )}
            </div>
          </div>

          {/* Editable name + phone */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <User className="w-3 h-3" /> Display Name
              </Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={saveProfile} disabled={saving} className="bg-cropguard-forest hover:bg-cropguard-dark text-xs h-7">
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                Save
              </Button>
              {toast && (
                <span className={cn('text-xs font-medium flex items-center gap-1',
                  toast.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {toast.message}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farm details */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {farmer?.community && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cropguard-mint rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-cropguard-dark" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Location</p>
                <p className="text-sm font-medium text-cropguard-forest">
                  {farmer.community}{farmer.district ? `, ${farmer.district}` : ''}
                </p>
              </div>
            </div>
          )}
          {farmer?.primary_crop && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <Sprout className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Primary Crop</p>
                <p className="text-sm font-medium text-cropguard-forest capitalize">{farmer.primary_crop}</p>
              </div>
            </div>
          )}
          {farmer?.years_farm_experience != null && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Experience</p>
                <p className="text-sm font-medium text-cropguard-forest">{farmer.years_farm_experience} years</p>
              </div>
            </div>
          )}
          {joinedDate && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Joined</p>
                <p className="text-sm font-medium text-cropguard-forest">{joinedDate}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password change */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-cropguard-forest" />
            <p className="text-sm font-bold text-gray-800">Change Password</p>
          </div>
          <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" className="h-8 text-sm" />
          <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm password" className="h-8 text-sm" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={changePassword} disabled={changingPw || !newPw} className="text-xs h-7">
              {changingPw ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
              Update
            </Button>
            {pwToast && (
              <span className={cn('text-xs font-medium flex items-center gap-1',
                pwToast.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                {pwToast.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {pwToast.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-red-600 border-red-100 hover:bg-red-50" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
