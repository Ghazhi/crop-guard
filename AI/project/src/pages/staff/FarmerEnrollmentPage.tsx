import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, ActivitySquare, ShieldCheck,
  Search, Plus, KeyRound, Save, X, Eye, EyeOff,
  CheckCircle, XCircle, Clock, ChevronDown,
  Loader2, AlertCircle, RefreshCw, UserCog,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { User, AuditLog, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────── */
type Section = 'users' | 'logs' | 'permissions';
type Access = 'full' | 'view' | 'none';

const SECTIONS: { key: Section; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'users',       icon: Users,          label: 'Users',               desc: 'Manage org accounts & roles'     },
  { key: 'logs',        icon: ActivitySquare, label: 'Activity Logs',       desc: 'Audit trail of all user actions' },
  { key: 'permissions', icon: ShieldCheck,    label: 'Roles & Permissions', desc: 'Permission matrix per role'      },
];

const ROLES: UserRole[] = ['admin', 'staff', 'agronomist', 'credits', 'agent', 'partner'];

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin:      { label: 'Admin',      color: 'text-red-800',    bg: 'bg-red-100'    },
  staff:      { label: 'Staff',      color: 'text-blue-800',   bg: 'bg-blue-100'   },
  agronomist: { label: 'Agronomist', color: 'text-green-800',  bg: 'bg-green-100'  },
  credits:    { label: 'Credits',    color: 'text-teal-800',   bg: 'bg-teal-100'   },
  agent:      { label: 'Agent',      color: 'text-amber-800',  bg: 'bg-amber-100'  },
  partner:    { label: 'Partner',    color: 'text-purple-800', bg: 'bg-purple-100' },
  farmer:     { label: 'Farmer',     color: 'text-lime-800',   bg: 'bg-lime-100'   },
};

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  INSERT: { label: 'Create', color: 'text-emerald-800', bg: 'bg-emerald-100' },
  UPDATE: { label: 'Update', color: 'text-blue-800',    bg: 'bg-blue-100'   },
  DELETE: { label: 'Delete', color: 'text-red-800',     bg: 'bg-red-100'    },
  LOGIN:  { label: 'Login',  color: 'text-gray-800',    bg: 'bg-gray-100'   },
  LOGOUT: { label: 'Logout', color: 'text-gray-700',    bg: 'bg-gray-100'   },
  EXPORT: { label: 'Export', color: 'text-amber-800',   bg: 'bg-amber-100'  },
};

interface PermRow {
  feature: string;
  admin: Access; staff: Access; agronomist: Access; credits: Access;
  agent: Access; partner: Access; farmer: Access;
}

const PERMISSION_MATRIX: PermRow[] = [
  { feature: 'Dashboard',              admin: 'full', staff: 'full',  agronomist: 'full',  credits: 'full',  agent: 'none', partner: 'view', farmer: 'none' },
  { feature: 'Programs & Cohorts',     admin: 'full', staff: 'full',  agronomist: 'view',  credits: 'view',  agent: 'none', partner: 'none', farmer: 'none' },
  { feature: 'Farmer Management',      admin: 'full', staff: 'full',  agronomist: 'full',  credits: 'view',  agent: 'none', partner: 'none', farmer: 'none' },
  { feature: 'Agent Assignment',       admin: 'full', staff: 'full',  agronomist: 'none',  credits: 'none',  agent: 'none', partner: 'none', farmer: 'none' },
  { feature: 'FRI Dashboard',          admin: 'full', staff: 'full',  agronomist: 'view',  credits: 'full',  agent: 'none', partner: 'view', farmer: 'none' },
  { feature: 'Interventions',          admin: 'full', staff: 'full',  agronomist: 'full',  credits: 'view',  agent: 'view', partner: 'none', farmer: 'none' },
  { feature: 'Risk Intelligence',      admin: 'full', staff: 'full',  agronomist: 'view',  credits: 'full',  agent: 'none', partner: 'view', farmer: 'none' },
  { feature: 'Reports',                admin: 'full', staff: 'full',  agronomist: 'view',  credits: 'view',  agent: 'view', partner: 'none', farmer: 'none' },
  { feature: 'Check-in Config',        admin: 'full', staff: 'full',  agronomist: 'full',  credits: 'full',  agent: 'none', partner: 'none', farmer: 'none' },
  { feature: 'User Management',        admin: 'full', staff: 'none',  agronomist: 'none',  credits: 'none',  agent: 'none', partner: 'none', farmer: 'none' },
  { feature: 'Portfolio Intelligence', admin: 'full', staff: 'full',  agronomist: 'none',  credits: 'view',  agent: 'none', partner: 'full', farmer: 'none' },
  { feature: 'Agent Portal',           admin: 'none', staff: 'none',  agronomist: 'none',  credits: 'none',  agent: 'full', partner: 'none', farmer: 'none' },
  { feature: 'Farmer Portal',          admin: 'none', staff: 'none',  agronomist: 'none',  credits: 'none',  agent: 'none', partner: 'none', farmer: 'full' },
];

/* ── Toast ────────────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

/* ── Create User Drawer ───────────────────────────────────── */
function CreateUserDrawer({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const { session } = useAuthStore();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'staff' as UserRole });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.full_name || !form.email || !form.password) { setError('Name, email and password are required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? 'Failed to create user'); setSaving(false); return; }
      onCreated();
    } catch (e) {
      setError(String(e));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-bold text-cropguard-forest">Create User</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Kofi Mensah" className="text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="kofi@example.com" className="text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="024xxxxxxx" className="text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role *</label>
            <div className="relative">
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cropguard-forest">
                {ROLES.filter(r => r !== 'farmer').map(r => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temporary Password *</label>
            <div className="relative">
              <Input type={showPwd ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters" className="text-sm pr-10" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">User will be prompted to change this on first login.</p>
          </div>
        </div>
        <div className="border-t px-5 py-4 flex gap-2">
          <Button onClick={submit} disabled={saving} className="flex-1 bg-cropguard-forest text-white hover:bg-cropguard-dark">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create User'}
          </Button>
          <Button onClick={onClose} variant="outline" disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Role Dropdown ────────────────────────────────────────── */
function RoleDropdown({ user, onSave }: { user: User; onSave: (id: string, role: UserRole) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const meta = ROLE_META[user.role] ?? ROLE_META.staff;
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors', meta.bg, meta.color)}>
        {meta.label}<ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-20 left-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1">
          {ROLES.filter(r => r !== 'farmer').map(r => {
            const m = ROLE_META[r];
            return (
              <button key={r} type="button"
                onClick={() => { onSave(user.id, r); setOpen(false); }}
                className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors',
                  user.role === r && 'opacity-40 cursor-default')}>
                <span className={cn('w-2 h-2 rounded-full', m.bg)} />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Users Section ────────────────────────────────────────── */
function UsersSection() {
  const profile = useAuthStore(s => s.profile);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast, show: showToast } = useToast();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data, error } = await supabase.from('users')
      .select('*').eq('organisation_id', profile.organisation_id).order('created_at', { ascending: false });
    if (error) { showToast('Failed to load users', 'error'); setLoading(false); return; }
    setUsers((data ?? []) as User[]);
    setLoading(false);
  }, [profile, showToast]);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (id: string, role: UserRole) => {
    setSaving(id);
    const { error } = await supabase.from('users').update({ role }).eq('id', id);
    setSaving(null);
    if (error) { showToast('Failed to update role', 'error'); return; }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    showToast('Role updated');
  };

  const toggleActive = async (u: User) => {
    if (u.id === profile?.id) { showToast('Cannot deactivate your own account', 'error'); return; }
    setSaving(u.id);
    const { error } = await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id);
    setSaving(null);
    if (error) { showToast('Failed to update', 'error'); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    showToast(u.is_active ? 'User deactivated' : 'User activated');
  };

  const forcePasswordChange = async (u: User) => {
    setSaving(`pwd-${u.id}`);
    const { error } = await supabase.from('users').update({ must_change_password: true }).eq('id', u.id);
    setSaving(null);
    if (error) { showToast('Failed to update', 'error'); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, must_change_password: true } : x));
    showToast('Password reset flagged — user will be prompted on next login');
  };

  const visible = users.filter(u => {
    if (u.role === 'farmer') return false;
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || (u.phone ?? '').includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.filter(u => u.role !== 'farmer').length,
    active: users.filter(u => u.is_active && u.role !== 'farmer').length,
    byRole: ROLES.reduce((acc, r) => { acc[r] = users.filter(u => u.role === r).length; return acc; }, {} as Record<UserRole, number>),
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-cropguard-forest' },
          { label: 'Active',      value: stats.active, color: 'text-emerald-600' },
          { label: 'Inactive',    value: stats.total - stats.active, color: 'text-gray-400' },
          { label: 'Admins',      value: stats.byRole.admin ?? 0, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…" className="pl-9 text-sm" />
        </div>
        <div className="relative">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
            className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cropguard-forest">
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
          <Plus className="w-4 h-4" />Create User
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No users found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Last Login</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map(u => {
                  const isSelf = u.id === profile?.id;
                  const isSaving = saving === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cropguard-mint flex items-center justify-center text-xs font-bold text-cropguard-forest shrink-0">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                              {u.full_name}
                              {isSelf && <span className="text-[10px] font-medium text-cropguard-forest bg-cropguard-mint px-1.5 py-0.5 rounded">You</span>}
                            </p>
                            <p className="text-xs text-gray-400">{u.phone ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleDropdown user={u} onSave={updateRole} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-semibold',
                            u.is_active ? 'text-emerald-700' : 'text-gray-400')}>
                            {u.is_active
                              ? <><CheckCircle className="w-3 h-3" />Active</>
                              : <><XCircle className="w-3 h-3" />Inactive</>}
                          </span>
                          {u.must_change_password && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                              <Clock className="w-3 h-3" />Password reset pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" title="Force password reset on next login" disabled={isSelf || saving === `pwd-${u.id}`}
                            onClick={() => forcePasswordChange(u)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-30">
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" title={u.is_active ? 'Deactivate' : 'Activate'}
                            disabled={isSelf || isSaving} onClick={() => toggleActive(u)}
                            className={cn('p-1.5 rounded-lg transition-colors disabled:opacity-30',
                              u.is_active ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600')}>
                            {isSaving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : u.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateUserDrawer
          onCreated={() => { setShowCreate(false); showToast('User created successfully'); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {toast && (
        <div className={cn('fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-md',
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200')}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ── Activity Logs Section ────────────────────────────────── */
function ActivityLogsSection() {
  const profile = useAuthStore(s => s.profile);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { toast, show: showToast } = useToast();

  const load = useCallback(async (quiet = false) => {
    if (!profile?.organisation_id) return;
    if (quiet) setRefreshing(true); else setLoading(true);

    const { data: usersData } = await supabase.from('users')
      .select('id, full_name').eq('organisation_id', profile.organisation_id);
    const map: Record<string, string> = {};
    (usersData ?? []).forEach((u: { id: string; full_name: string }) => { map[u.id] = u.full_name; });
    setUserMap(map);

    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (actionFilter !== 'all') q = q.eq('action', actionFilter);
    if (tableFilter.trim()) q = q.ilike('table_name', `%${tableFilter.trim()}%`);

    const { data, error } = await q;
    if (error) { showToast('Failed to load activity logs', 'error'); setLoading(false); setRefreshing(false); return; }
    setLogs((data ?? []) as AuditLog[]);
    setLoading(false); setRefreshing(false);
  }, [profile, actionFilter, tableFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cropguard-forest">
            <option value="all">All Actions</option>
            {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={tableFilter} onChange={e => setTableFilter(e.target.value)}
            placeholder="Filter by table…" className="pl-9 text-sm" />
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing}
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className={cn('w-4 h-4 text-gray-500', refreshing && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No activity logs found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Table</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Record ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => {
                  const am = ACTION_META[log.action] ?? { label: log.action, color: 'text-gray-700', bg: 'bg-gray-100' };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {userMap[log.actor_id] ?? 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', am.bg, am.color)}>
                          {am.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{log.table_name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400 hidden md:table-cell truncate max-w-32">
                        {log.record_id ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            Showing {logs.length} most recent entries
          </div>
        </div>
      )}

      {toast && (
        <div className={cn('fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-md',
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200')}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ── Roles & Permissions Section ──────────────────────────── */
function PermissionsSection() {
  const DISPLAY_ROLES: UserRole[] = ['admin', 'staff', 'agronomist', 'credits', 'agent', 'partner', 'farmer'];

  function AccessCell({ access }: { access: Access }) {
    if (access === 'full') return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        </div>
      </div>
    );
    if (access === 'view') return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
        </div>
      </div>
    );
    return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center">
          <X className="w-3 h-3 text-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />Full access</span>
        <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-400" />View only</span>
        <span className="flex items-center gap-1.5"><X className="w-3 h-3 text-gray-300" />No access</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-44">Feature</th>
                {DISPLAY_ROLES.map(r => {
                  const m = ROLE_META[r];
                  return (
                    <th key={r} className="px-3 py-3 text-center min-w-24">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', m.bg, m.color)}>
                        {m.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PERMISSION_MATRIX.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{row.feature}</td>
                  {DISPLAY_ROLES.map(r => (
                    <td key={r} className="px-3 py-3"><AccessCell access={row[r]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">This matrix reflects current route-level access controls defined in the application.</p>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function UserManagementPage() {
  const [activeSection, setActiveSection] = useState<Section>('users');
  const active = SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <UserCog className="w-4 h-4 text-red-700" />
          </div>
          <h1 className="text-2xl font-bold text-cropguard-forest">User Management</h1>
        </div>
        <p className="text-sm text-cropguard-slate mt-1 ml-10">
          Manage accounts, review activity logs, and configure role permissions
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-52 shrink-0 space-y-1">
          {SECTIONS.map(({ key, icon: Icon, label, desc }) => (
            <button key={key} type="button" onClick={() => setActiveSection(key)}
              className={cn(
                'w-full text-left rounded-xl px-3 py-3 transition-colors group',
                activeSection === key ? 'bg-cropguard-forest text-white' : 'hover:bg-gray-100 text-gray-600',
              )}>
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-4 h-4 shrink-0',
                  activeSection === key ? 'text-cropguard-light' : 'text-gray-400 group-hover:text-gray-600')} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold leading-tight',
                    activeSection === key ? 'text-white' : 'text-gray-700')}>{label}</p>
                  <p className={cn('text-[10px] mt-0.5 leading-snug',
                    activeSection === key ? 'text-cropguard-pale' : 'text-gray-400')}>{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
            <active.icon className="w-5 h-5 text-cropguard-forest" />
            <h2 className="text-base font-bold text-cropguard-forest">{active.label}</h2>
          </div>
          {activeSection === 'users'       && <UsersSection />}
          {activeSection === 'logs'        && <ActivityLogsSection />}
          {activeSection === 'permissions' && <PermissionsSection />}
        </div>
      </div>
    </div>
  );
}
