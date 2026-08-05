import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Users, Search, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Cohort, Program, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { REGION_NAME_OPTIONS } from '@/lib/constants';

import { cn } from '@/lib/utils';

interface CohortForm {
  program_id:   string;
  name:         string;
  region:      string;
  district:     string;
  target_count: number;
  agent_id:     string;
}

const EMPTY_FORM: CohortForm = {
  program_id: '', name: '', region: '', district: '', target_count: 50, agent_id: '',
};

interface FarmerOption {
  id:              string;
  full_name:       string;
  phone:           string | null;
  community:       string | null;
  activeEnrollment: {
    cohort_name:   string;
    program_name:  string;
  } | null;
  alreadyInThisCohort: boolean;
}

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

  // Enrol farmers drawer state
  const [enrolDrawerOpen, setEnrolDrawerOpen] = useState(false);
  const [enrolCohort, setEnrolCohort] = useState<Cohort | null>(null);
  const [farmerOptions, setFarmerOptions] = useState<FarmerOption[]>([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(new Set());
  const [farmerOptionsLoading, setFarmerOptionsLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState('');

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
      program_id: c.program_id, name: c.name, region: c.region ?? '',
      district: c.district, target_count: c.target_count, agent_id: c.agent_id ?? '',
    });
    setError('');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.program_id || !form.name || !form.region || !form.district) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      program_id:   form.program_id,
      name:         form.name,
      region:       form.region,
      district:     form.district,
      target_count: form.target_count,
      agent_id:     form.agent_id || null,
    };
    if (editing) {
      await supabase.from('cohorts').update(payload).eq('id', editing.id);
    } else {
      const { data: newCohort } = await supabase.from('cohorts').insert(payload).select('id').single();
      if (newCohort?.id) {
        const { data: prog } = await supabase.from('programs').select('organisation_id').eq('id', form.program_id).maybeSingle();
        await supabase.from('cohort_exposure_inputs').upsert({
          cohort_id: newCohort.id,
          organisation_id: prog?.organisation_id ?? null,
          hazard_classification: 'Moderate',
          actual_rainfall: 0,
          historical_avg_rainfall: 0,
          critical_alert_count: 0,
          high_alert_count: 0,
          medium_alert_count: 0,
          in_critical_growth_stage: false,
          forecast_stress_flag: false,
        }, { onConflict: 'cohort_id' });
      }
    }
    setSaving(false);
    setOpen(false);
    loadCohorts();
  };

  const openEnrolDrawer = async (c: Cohort) => {
    setEnrolCohort(c);
    setSelectedFarmerIds(new Set());
    setFarmerSearch('');
    setEnrolError('');
    setEnrolDrawerOpen(true);
    setFarmerOptionsLoading(true);

    const [{ data: farmersRaw }, { data: activeEnrollments }] = await Promise.all([
      supabase
        .from('farmers')
        .select('id, full_name, phone, community')
        .eq('organisation_id', profile!.organisation_id)
        .order('full_name'),
      supabase
        .from('enrollments')
        .select('farmer_id, cohort_id, cohorts!inner(name, programs!inner(name))')
        .eq('status', 'active'),
    ]);

    const enrollMap = new Map<string, { cohort_name: string; program_name: string; cohort_id: string }>();
    ((activeEnrollments ?? []) as any[]).forEach(e => {
      enrollMap.set(e.farmer_id, {
        cohort_id:    e.cohort_id,
        cohort_name:  e.cohorts?.name ?? '',
        program_name: e.cohorts?.programs?.name ?? '',
      });
    });

    const options: FarmerOption[] = ((farmersRaw ?? []) as any[]).map(f => {
      const active = enrollMap.get(f.id);
      return {
        id:          f.id,
        full_name:   f.full_name,
        phone:       f.phone,
        community:   f.community,
        activeEnrollment: active ? { cohort_name: active.cohort_name, program_name: active.program_name } : null,
        alreadyInThisCohort: active?.cohort_id === c.id,
      };
    });

    setFarmerOptions(options);
    setFarmerOptionsLoading(false);
  };

  const toggleFarmer = (id: string) => {
    setSelectedFarmerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleEnrol = async () => {
    if (!enrolCohort || selectedFarmerIds.size === 0) return;
    setEnrolling(true);
    setEnrolError('');

    try {
      for (const farmerId of selectedFarmerIds) {
        const farmer = farmerOptions.find(f => f.id === farmerId)!;
        if (farmer.activeEnrollment) {
          await supabase.rpc('deactivate_farmer_active_enrollment', {
            p_farmer_id: farmerId,
            p_reason:    'Re-enrolled in new cohort',
          });
        }
        const { error: insErr } = await supabase.from('enrollments').insert({
          farmer_id:  farmerId,
          program_id: enrolCohort.program_id,
          cohort_id:  enrolCohort.id,
          status:     'active',
        });
        if (insErr) throw insErr;
      }
      setEnrolDrawerOpen(false);
      loadCohorts();
    } catch (e: any) {
      setEnrolError(e.message ?? 'Failed to enrol farmers.');
    } finally {
      setEnrolling(false);
    }
  };

  const filtered = filterProgram ? cohorts.filter(c => c.program_id === filterProgram) : cohorts;

  const filteredFarmers = farmerOptions.filter(f =>
    f.full_name.toLowerCase().includes(farmerSearch.toLowerCase()) ||
    (f.community ?? '').toLowerCase().includes(farmerSearch.toLowerCase())
  );

  const unenrolled    = filteredFarmers.filter(f => !f.alreadyInThisCohort && !f.activeEnrollment);
  const elseEnrolled  = filteredFarmers.filter(f => !f.alreadyInThisCohort && f.activeEnrollment);
  const alreadyHere   = filteredFarmers.filter(f => f.alreadyInThisCohort);

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
                <p className="text-xs text-cropguard-slate">{c.region ?? '—'} &middot; {c.district}</p>
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(c)}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => openEnrolDrawer(c)}>
                    <UserPlus className="w-3 h-3 mr-1" /> Enrol Farmers
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Dialog */}
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
              <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  {REGION_NAME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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

      {/* Enrol Farmers Drawer */}
      <Drawer open={enrolDrawerOpen} onOpenChange={setEnrolDrawerOpen}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="border-b border-gray-100 px-6 py-4 shrink-0">
            <DrawerTitle className="text-lg font-bold text-cropguard-forest">
              Enrol Farmers — {enrolCohort?.name}
            </DrawerTitle>
            <p className="text-xs text-cropguard-slate mt-0.5">
              Select farmers to enrol. Farmers currently in another program will be moved to this cohort.
            </p>
          </DrawerHeader>

          <div className="px-6 py-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or community…"
                className="pl-9 h-9"
                value={farmerSearch}
                onChange={e => setFarmerSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4 min-h-0">
            {farmerOptionsLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (
              <>
                {/* Already in this cohort */}
                {alreadyHere.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Already in this cohort ({alreadyHere.length})
                    </p>
                    <div className="space-y-1.5">
                      {alreadyHere.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 opacity-60">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                            {f.community && <p className="text-xs text-gray-400 truncate">{f.community}</p>}
                          </div>
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 shrink-0">Enrolled</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available (not enrolled anywhere) */}
                {unenrolled.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Available ({unenrolled.length})
                    </p>
                    <div className="space-y-1.5">
                      {unenrolled.map(f => {
                        const checked = selectedFarmerIds.has(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleFarmer(f.id)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                              checked
                                ? 'bg-cropguard-mint border-cropguard-green'
                                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                              checked ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-300'
                            )}>
                              {checked && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                              <p className="text-xs text-gray-400 truncate">{f.community ?? f.phone ?? '—'}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Enrolled elsewhere */}
                {elseEnrolled.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Enrolled in another program ({elseEnrolled.length})
                    </p>
                    <div className="space-y-1.5">
                      {elseEnrolled.map(f => {
                        const checked = selectedFarmerIds.has(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleFarmer(f.id)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                              checked
                                ? 'bg-amber-50 border-amber-400'
                                : 'bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50/40'
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                              checked ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                            )}>
                              {checked && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                              </div>
                              <p className="text-xs text-amber-600 truncate">
                                {f.activeEnrollment!.cohort_name} · {f.activeEnrollment!.program_name}
                              </p>
                            </div>
                            <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0 shrink-0">In program</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredFarmers.length === 0 && !farmerOptionsLoading && (
                  <p className="text-center text-sm text-gray-400 py-8">No farmers found.</p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-white space-y-3">
            {selectedFarmerIds.size > 0 && elseEnrolled.some(f => selectedFarmerIds.has(f.id)) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {Array.from(selectedFarmerIds).filter(id => elseEnrolled.some(f => f.id === id)).length} selected farmer(s) will be moved from their current program to this cohort.
                </p>
              </div>
            )}
            {enrolError && <p className="text-xs text-red-600">{enrolError}</p>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEnrolDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={selectedFarmerIds.size === 0 || enrolling}
                className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
                onClick={handleEnrol}
              >
                {enrolling
                  ? 'Enrolling…'
                  : `Enrol ${selectedFarmerIds.size > 0 ? selectedFarmerIds.size + ' ' : ''}Farmer${selectedFarmerIds.size !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
