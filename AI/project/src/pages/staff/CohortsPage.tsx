import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Cohort, Program, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { REGION_OPTIONS, REGION_LABELS } from '@/lib/constants';
import type { RegionCode } from '@/types';
import { cn } from '@/lib/utils';

interface CohortForm {
  program_id:   string;
  name:         string;
  region_code:  string;
  district:     string;
  target_count: number;
  agent_id:     string;
}

const EMPTY_FORM: CohortForm = {
  program_id: '', name: '', region_code: '', district: '', target_count: 50, agent_id: '',
};

export default function StaffCohortsPage() {
  const profile = useAuthStore(s => s.profile);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [filterProgram, setFilterProgram] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Cohort | null>(null);
  const [form, setForm] = useState<CohortForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: programs }, { data: agents }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).eq('is_active', true),
      supabase.from('users').select('id, full_name').eq('organisation_id', profile.organisation_id).eq('role', 'agent'),
    ]);
    setPrograms(programs ?? []);
    setAgents(agents ?? []);
  }, [profile]);

  const loadCohorts = useCallback(async () => {
    if (!profile) return;
    let query = supabase
      .from('cohorts')
      .select('*, programs!inner(organisation_id)')
      .eq('programs.organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false });
    if (filterProgram) query = query.eq('program_id', filterProgram);
    const { data } = await query;
    const cohortList = (data ?? []) as unknown as Cohort[];
    setCohorts(cohortList);

    if (cohortList.length > 0) {
      const { data: counts } = await supabase
        .from('enrollments')
        .select('cohort_id')
        .in('cohort_id', cohortList.map(c => c.id))
        .eq('status', 'active');
      const map: Record<string, number> = {};
      (counts ?? []).forEach(e => {
        map[e.cohort_id] = (map[e.cohort_id] ?? 0) + 1;
      });
      setEnrollmentCounts(map);
    }
    setLoading(false);
  }, [profile, filterProgram]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCohorts(); }, [loadCohorts]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setOpen(true); };
  const openEdit = (c: Cohort) => {
    setEditing(c);
    setForm({
      program_id: c.program_id, name: c.name, region_code: c.region_code,
      district: c.district, target_count: c.target_count, agent_id: c.agent_id ?? '',
    });
    setError('');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.program_id || !form.name || !form.region_code || !form.district) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      program_id:   form.program_id,
      name:         form.name,
      region_code:  form.region_code as RegionCode,
      district:     form.district,
      target_count: form.target_count,
      agent_id:     form.agent_id || null,
    };
    if (editing) {
      await supabase.from('cohorts').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('cohorts').insert(payload);
    }
    setSaving(false);
    setOpen(false);
    loadCohorts();
  };

  const filtered = filterProgram ? cohorts.filter(c => c.program_id === filterProgram) : cohorts;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Cohorts</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">Manage farmer groups within programs</p>
        </div>
        <Button onClick={openCreate} className="bg-cropguard-dark hover:bg-cropguard-forest">
          <Plus className="w-4 h-4 mr-2" /> New Cohort
        </Button>
      </div>

      <div className="max-w-xs">
        <Select value={filterProgram || '__none__'} onValueChange={v => setFilterProgram(v === '__none__' ? '' : v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All programs</SelectItem>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-cropguard-slate">
          <p className="text-lg font-medium text-cropguard-forest">No cohorts found</p>
          <p className="text-sm mt-1">Create a cohort to group farmers together.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(c => {
            const enrolled = enrollmentCounts[c.id] ?? 0;
            const pct = Math.round((enrolled / c.target_count) * 100);
            const agent = agents.find(a => a.id === c.agent_id);
            return (
              <div key={c.id} className={cn('bg-white rounded-xl p-5 border shadow-sm space-y-3', !c.is_active && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-cropguard-forest">{c.name}</p>
                  <Badge className={cn('text-[10px] border-0', c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-cropguard-slate">{REGION_LABELS[c.region_code]} &middot; {c.district}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-cropguard-slate">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {enrolled} / {c.target_count}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cropguard-green rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                {agent && (
                  <p className="text-xs text-cropguard-slate">Agent: <span className="font-medium text-cropguard-dark">{agent.full_name}</span></p>
                )}
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => openEdit(c)}>
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cohort' : 'Create Cohort'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program *</Label>
              <Select value={form.program_id} onValueChange={v => setForm(f => ({ ...f, program_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort Name *</Label>
              <Input placeholder="e.g. Ashanti Batch A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region *</Label>
              <Select value={form.region_code} onValueChange={v => setForm(f => ({ ...f, region_code: v }))}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  {REGION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District *</Label>
              <Input placeholder="e.g. Kumasi Metro" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Count</Label>
              <Input type="number" min="1" value={form.target_count} onChange={e => setForm(f => ({ ...f, target_count: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Agent</Label>
              <Select value={form.agent_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, agent_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="No agent assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No agent</SelectItem>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-cropguard-red">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={saving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleSave}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Cohort'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
