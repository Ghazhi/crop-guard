import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, ShieldCheck, Phone } from 'lucide-react';
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showNew ? 'text' : 'password'} placeholder="At least 6 characters" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 h-11 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cropguard-green/30 focus:border-cropguard-green"
                autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowNew(p => !p)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showConfirm ? 'text' : 'password'} placeholder="Repeat new password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full pl-10 pr-10 h-11 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cropguard-green/30 focus:border-cropguard-green"
                autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowConfirm(p => !p)}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full h-11 rounded-lg bg-cropguard-forest hover:bg-cropguard-dark text-white font-semibold text-sm transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Set New Password'}
          </button>
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

      {/* Light green background */}
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-cropguard-mint">
        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-10 pt-10 pb-8 space-y-7">

            {/* Logo */}
            <div className="flex justify-center">
              <img
                src="/cropguard_logo_4.png"
                alt="CropGuard+"
                onClick={() => navigate('/')}
                className="h-20 object-contain cursor-pointer transition-transform hover:scale-105"
              />
            </div>

            {/* Heading */}
            <div className="text-center space-y-1">
              <p className="text-sm text-gray-500">Sign in to access your account</p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
              {(['farmer', 'staff'] as AuthTab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(''); setShowPassword(false); }}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                    tab === t
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {t === 'staff' ? 'Staff / Agent' : 'Farmer'}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Forms */}
            {tab === 'farmer' ? (
              <form onSubmit={handleFarmerLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="0241 234 567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="tel"
                      className="w-full pl-10 pr-4 h-12 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cropguard-green/20 focus:border-cropguard-green transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">6-Digit PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your PIN"
                      maxLength={6}
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 h-12 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 tracking-widest focus:outline-none focus:ring-2 focus:ring-cropguard-green/20 focus:border-cropguard-green transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg bg-cropguard-forest hover:bg-cropguard-dark active:bg-cropguard-forest text-white font-semibold text-sm transition-colors disabled:opacity-60 mt-1"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleStaffLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full px-4 h-12 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cropguard-green/20 focus:border-cropguard-green transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full pl-4 pr-10 h-12 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cropguard-green/20 focus:border-cropguard-green transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg bg-cropguard-forest hover:bg-cropguard-dark active:bg-cropguard-forest text-white font-semibold text-sm transition-colors disabled:opacity-60 mt-1"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Footer note */}
            <div className="text-center text-xs text-gray-400 pb-2 space-y-1">
              <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
              <p>Need help? Contact our support team</p>
            </div>
          </div>

          {/* Powered by footer */}
          <div className="border-t border-gray-100 px-10 py-3 text-center bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">
              Powered by <span className="font-medium text-cropguard-dark">asinyo</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
