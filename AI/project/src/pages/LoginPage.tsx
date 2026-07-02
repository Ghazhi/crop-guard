import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { phoneToEmail } from '@/lib/constants';
import { cn } from '@/lib/utils';

type AuthTab = 'farmer' | 'staff';

/* ── Force-password-change modal ─────────────────────────────────────────── */
function ForcePasswordChangeModal({ onDone }: { onDone: () => void }) {
  const profile = useAuthStore(s => s.profile);
  const fetchProfile = useAuthStore(s => s.fetchProfile);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    setError('');
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) { setError(updateErr.message); setSaving(false); return; }
    if (profile?.id) {
      await supabase.from('users').update({ must_change_password: false }).eq('id', profile.id);
      await fetchProfile(profile.id);
    }
    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-cropguard-forest px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Change Your Password</h2>
              <p className="text-cropguard-pale text-xs mt-0.5">Required before you can continue</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Your account was set up with a default password. Please choose a new password to secure your account.
          </p>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type={showNew ? 'text' : 'password'} placeholder="At least 6 characters" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} className="pl-10 pr-10 h-11" autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowNew(p => !p)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type={showConfirm ? 'text' : 'password'} placeholder="Repeat new password" value={confirm}
                onChange={e => setConfirm(e.target.value)} className="pl-10 pr-10 h-11" autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowConfirm(p => !p)}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full h-11 bg-cropguard-dark hover:bg-cropguard-forest text-white font-semibold">
            {saving ? 'Saving…' : 'Set New Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ── Login page ──────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const fetchProfile = useAuthStore(s => s.fetchProfile);
  const [tab, setTab] = useState<AuthTab>('farmer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleForceChangeDone = () => { setPendingUserId(null); navigate('/'); };

  const checkMustChange = async (userId: string): Promise<boolean> => {
    const { data } = await supabase.from('users').select('must_change_password').eq('id', userId).maybeSingle();
    return data?.must_change_password === true;
  };

  const handleFarmerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || pin.length < 6) { setError('Enter your phone number and 6-digit PIN.'); return; }
    setError(''); setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password: pin });
    if (authError) { setLoading(false); setError('Incorrect phone number or PIN. Please try again.'); return; }
    const userId = authData.user.id;
    await fetchProfile(userId);
    const mustChange = await checkMustChange(userId);
    setLoading(false);
    if (mustChange) setPendingUserId(userId); else navigate('/');
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email address and password.'); return; }
    setError(''); setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setLoading(false); setError('Incorrect email or password. Please try again.'); return; }
    const userId = authData.user.id;
    await fetchProfile(userId);
    const mustChange = await checkMustChange(userId);
    setLoading(false);
    if (mustChange) setPendingUserId(userId); else navigate('/');
  };

  return (
    <>
      {pendingUserId && <ForcePasswordChangeModal onDone={handleForceChangeDone} />}

      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-6">
          <img
            src="/cropguard_logo_4.png"
            alt="CropGuard+"
            className="w-48 object-contain"
          />
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            <button
              className={cn(
                'flex-1 py-3.5 text-sm font-semibold transition-colors',
                tab === 'farmer'
                  ? 'text-cropguard-forest border-b-2 border-cropguard-green'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              onClick={() => { setTab('farmer'); setError(''); setShowPassword(false); }}
            >
              Farmer Login
            </button>
            <button
              className={cn(
                'flex-1 py-3.5 text-sm font-semibold transition-colors',
                tab === 'staff'
                  ? 'text-cropguard-forest border-b-2 border-cropguard-green'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              onClick={() => { setTab('staff'); setError(''); setShowPassword(false); }}
            >
              Staff Login
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {tab === 'farmer' ? (
              <form onSubmit={handleFarmerLogin} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="0241 234 567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-gray-200 focus:border-cropguard-green"
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    6-Digit PIN
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                      className="pl-10 pr-10 h-12 rounded-xl border-gray-200 tracking-widest"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(p => !p)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-cropguard-forest hover:bg-cropguard-dark text-white font-bold rounded-xl text-base mt-1"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="you@organisation.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-gray-200 focus:border-cropguard-green"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 rounded-xl border-gray-200"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(p => !p)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-cropguard-forest hover:bg-cropguard-dark text-white font-bold rounded-xl text-base mt-1"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            )}
          </div>

          {/* Footer bar */}
          <div className="bg-cropguard-forest px-6 py-3 text-center">
            <p className="text-white/60 text-xs">Powered by Norvi AI &nbsp;&middot;&nbsp; &copy; asinyo 2026</p>
          </div>
        </div>
      </div>
    </>
  );
}
