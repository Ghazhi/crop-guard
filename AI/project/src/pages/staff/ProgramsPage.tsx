import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Power, X, Check, ChevronDown, ChevronRight,
  Users, GitBranch, Loader2, Trash2, ToggleLeft, ToggleRight,
  AlertTriangle, UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Program, Cohort, User, CropType, RegionCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CROP_LABELS, REGION_LABELS, CROP_OPTIONS, REGION_OPTIONS } from '@/lib/constants';
import type { RegionCode as RC } from '@/types';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgramForm {
  name: string; description: string; crop_season: string;
  start_date: string; end_date: string; target_enrollment: number;
  crop_types: CropType[]; regions: RegionCode[];
}

interface CohortForm {
  program_id: string; name: string; region_code: string;
  district: string; target_count: number; agent_id: string;
}

interface CohortFarmer {
  id: string;
  full_name: string;
  phone: string;
  region_code: string;
  current_fri_score: number | null;
  is_verified: boolean;
}

const EMPTY_PROGRAM: ProgramForm = {
  name: '', description: '', crop_season: '', start_date: '', end_date: '',
  target_enrollment: 100, crop_types: [], regions: [],
};

const EMPTY_COHORT: CohortForm = {
  program_id: '', name: '', region_code: '', district: '', target_count: 50, agent_id: '',
};

// ── MultiSelect ───────────────────────────────────────────────────────────────

function MultiSelect<T extends string>({
  label, options, selected, onChange,
}: { label: string; options: { value: T; label: string }[]; selected: T[]; onChange: (v: T[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (v: T) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-white hover:border-cropguard-mid transition-colors"
        >
          <span className={selected.length ? 'text-cropguard-forest' : 'text-gray-400'}>
            {selected.length ? `${selected.length} selected` : `Select ${label.toLowerCase()}`}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {open && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-cropguard-mint text-left"
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  selected.includes(o.value) ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-300'
                )}>
                  {selected.includes(o.value) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map(v => (
            <span key={v} className="flex items-center gap-1 text-[11px] bg-cropguard-mint text-cropguard-forest px-2 py-0.5 rounded-full">
              {options.find(o => o.value === v)?.label}
              <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => toggle(v)} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CohortRow ─────────────────────────────────────────────────────────────────

interface CohortRowProps {
  cohort: Cohort;
  agents: User[];
  enrolledCount: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onViewFarmers: () => void;
}

function CohortRow({ cohort, agents, enrolledCount, onEdit, onToggle, onDelete, onViewFarmers }: CohortRowProps) {
  const agent = agents.find(a => a.id === cohort.agent_id);
  const pct = Math.min(Math.round((enrolledCount / cohort.target_count) * 100), 100);
  return (
    <div className={cn('flex items-start gap-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors', !cohort.is_active && 'opacity-50')}>
      <GitBranch className="w-4 h-4 text-cropguard-mid shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-cropguard-forest">{cohort.name}</p>
          {!cohort.is_active && (
            <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">Inactive</span>
          )}
        </div>
        <p className="text-xs text-cropguard-slate mt-0.5">
          {REGION_LABELS[cohort.region_code as RC]} &middot; {cohort.district}
          {agent && <> &middot; <span className="text-cropguard-dark font-medium">{agent.full_name}</span></>}
          {!agent && <> &middot; <span className="text-amber-600">No agent</span></>}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 max-w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : 'bg-cropguard-green')} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-cropguard-slate whitespace-nowrap">
            {enrolledCount} / {cohort.target_count}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-cropguard-slate hover:text-cropguard-dark"
          title="View farmers"
          onClick={onViewFarmers}
        >
          <Users className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn('h-7 w-7 p-0', cohort.is_active ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600')}
          title={cohort.is_active ? 'Deactivate cohort' : 'Activate cohort'}
          onClick={onToggle}
        >
          {cohort.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
          title="Delete cohort"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── ProgramCard ───────────────────────────────────────────────────────────────

interface ProgramCardProps {
  program: Program;
  cohorts: Cohort[];
  agents: User[];
  enrollmentCounts: Record<string, number>;
  onEditProgram: () => void;
  onToggleProgram: () => void;
  onNewCohort: () => void;
  onEditCohort: (c: Cohort) => void;
  onToggleCohort: (c: Cohort) => void;
  onDeleteCohort: (c: Cohort) => void;
  onViewFarmers: (c: Cohort) => void;
}

function ProgramCard({
  program, cohorts, agents, enrollmentCounts,
  onEditProgram, onToggleProgram, onNewCohort, onEditCohort,
  onToggleCohort, onDeleteCohort, onViewFarmers,
}: ProgramCardProps) {
  const [expanded, setExpanded] = useState(true);
  const totalEnrolled = cohorts.reduce((s, c) => s + (enrollmentCounts[c.id] ?? 0), 0);
  const pct = Math.round((totalEnrolled / program.target_enrollment) * 100);

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm overflow-hidden', !program.is_active && 'opacity-70')}>
      {/* Program header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-0.5 text-cropguard-mid hover:text-cropguard-dark transition-colors shrink-0"
          >
            <ChevronRight className={cn('w-4 h-4 transition-transform', expanded && 'rotate-90')} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-cropguard-forest">{program.name}</p>
                <p className="text-xs text-cropguard-slate mt-0.5">{program.crop_season}</p>
              </div>
              <Badge className={cn('text-[10px] border-0 shrink-0', program.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                {program.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {program.description && (
              <p className="text-xs text-cropguard-slate mt-1.5 line-clamp-1">{program.description}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {program.crop_types.slice(0, 3).map(c => (
                <span key={c} className="text-[10px] bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                  {CROP_LABELS[c as CropType]}
                </span>
              ))}
              {program.crop_types.length > 3 && (
                <span className="text-[10px] text-cropguard-slate">+{program.crop_types.length - 3} more</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-xs text-cropguard-slate">
                <span>{new Date(program.start_date).toLocaleDateString()} – {new Date(program.end_date).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {totalEnrolled.toLocaleString()} / {program.target_enrollment.toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-semibold text-cropguard-dark">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : 'bg-cropguard-green')}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 ml-7">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEditProgram}>
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onToggleProgram}>
            <Power className="w-3 h-3 mr-1" /> {program.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" className="h-7 text-xs bg-cropguard-dark hover:bg-cropguard-forest ml-auto" onClick={onNewCohort}>
            <Plus className="w-3 h-3 mr-1" /> Add Cohort
          </Button>
        </div>
      </div>

      {/* Cohorts section */}
      {expanded && (
        <div className="border-t bg-gray-50/60">
          {cohorts.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-4">
              <p className="text-xs text-cropguard-slate flex-1">No cohorts yet. Add a cohort to group farmers.</p>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={onNewCohort}>
                <Plus className="w-3 h-3 mr-1" /> Add Cohort
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {cohorts.map(c => (
                <CohortRow
                  key={c.id}
                  cohort={c}
                  agents={agents}
                  enrolledCount={enrollmentCounts[c.id] ?? 0}
                  onEdit={() => onEditCohort(c)}
                  onToggle={() => onToggleCohort(c)}
                  onDelete={() => onDeleteCohort(c)}
                  onViewFarmers={() => onViewFarmers(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffProgramsPage() {
  const profile = useAuthStore(s => s.profile);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Program dialog
  const [progDialogOpen, setProgDialogOpen] = useState(false);
  const [progSaving, setProgSaving] = useState(false);
  const [editingProg, setEditingProg] = useState<Program | null>(null);
  const [progForm, setProgForm] = useState<ProgramForm>(EMPTY_PROGRAM);
  const [progError, setProgError] = useState('');

  // Cohort dialog
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false);
  const [cohortSaving, setCohortSaving] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [cohortForm, setCohortForm] = useState<CohortForm>(EMPTY_COHORT);
  const [cohortError, setCohortError] = useState('');

  // Delete cohort dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cohortToDelete, setCohortToDelete] = useState<Cohort | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Farmers drawer
  const [farmersDrawerOpen, setFarmersDrawerOpen] = useState(false);
  const [drawerCohort, setDrawerCohort] = useState<Cohort | null>(null);
  const [cohortFarmers, setCohortFarmers] = useState<CohortFarmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!profile) return;
    const [{ data: progs }, { data: coh }, { data: agts }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).order('created_at', { ascending: false }),
      supabase.from('cohorts').select('*, programs!inner(organisation_id)').eq('programs.organisation_id', profile.organisation_id).order('created_at', { ascending: false }),
      supabase.from('users').select('id,full_name').eq('organisation_id', profile.organisation_id).eq('role', 'agent'),
    ]);
    const cohortList = (coh ?? []) as unknown as Cohort[];
    setPrograms(progs ?? []);
    setCohorts(cohortList);
    setAgents(agts ?? []);

    if (cohortList.length > 0) {
      const { data: counts } = await supabase
        .from('enrollments')
        .select('cohort_id')
        .in('cohort_id', cohortList.map(c => c.id))
        .eq('status', 'active');
      const map: Record<string, number> = {};
      (counts ?? []).forEach((e: { cohort_id: string }) => { map[e.cohort_id] = (map[e.cohort_id] ?? 0) + 1; });
      setEnrollmentCounts(map);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Program CRUD ──────────────────────────────────────────────────────────

  const openCreateProg = () => {
    setEditingProg(null); setProgForm(EMPTY_PROGRAM); setProgError(''); setProgDialogOpen(true);
  };
  const openEditProg = (p: Program) => {
    setEditingProg(p);
    setProgForm({
      name: p.name, description: p.description ?? '', crop_season: p.crop_season,
      start_date: p.start_date, end_date: p.end_date, target_enrollment: p.target_enrollment,
      crop_types: p.crop_types, regions: p.regions,
    });
    setProgError(''); setProgDialogOpen(true);
  };
  const handleSaveProg = async () => {
    if (!progForm.name || !progForm.crop_season || !progForm.start_date || !progForm.end_date) {
      setProgError('Please fill in all required fields.'); return;
    }
    if (progForm.crop_types.length === 0 || progForm.regions.length === 0) {
      setProgError('Select at least one crop type and one region.'); return;
    }
    setProgSaving(true); setProgError('');
    const payload = { ...progForm, organisation_id: profile!.organisation_id };
    if (editingProg) {
      await supabase.from('programs').update(payload).eq('id', editingProg.id);
    } else {
      await supabase.from('programs').insert(payload);
    }
    setProgSaving(false); setProgDialogOpen(false); loadAll();
  };
  const toggleActive = async (p: Program) => {
    await supabase.from('programs').update({ is_active: !p.is_active }).eq('id', p.id);
    loadAll();
  };

  // ── Cohort CRUD ───────────────────────────────────────────────────────────

  const openCreateCohort = (programId: string) => {
    setEditingCohort(null);
    setCohortForm({ ...EMPTY_COHORT, program_id: programId });
    setCohortError(''); setCohortDialogOpen(true);
  };
  const openEditCohort = (c: Cohort) => {
    setEditingCohort(c);
    setCohortForm({
      program_id: c.program_id, name: c.name, region_code: c.region_code,
      district: c.district, target_count: c.target_count, agent_id: c.agent_id ?? '',
    });
    setCohortError(''); setCohortDialogOpen(true);
  };
  const handleSaveCohort = async () => {
    if (!cohortForm.program_id || !cohortForm.name || !cohortForm.region_code || !cohortForm.district) {
      setCohortError('Please fill in all required fields.'); return;
    }
    setCohortSaving(true); setCohortError('');
    const payload = {
      program_id:   cohortForm.program_id,
      name:         cohortForm.name,
      region_code:  cohortForm.region_code as RC,
      district:     cohortForm.district,
      target_count: cohortForm.target_count,
      agent_id:     cohortForm.agent_id || null,
    };
    if (editingCohort) {
      await supabase.from('cohorts').update(payload).eq('id', editingCohort.id);
      // propagate agent change to active enrollments
      if (payload.agent_id) {
        await (supabase.from('enrollments') as any)
          .update({ agent_id: payload.agent_id })
          .eq('cohort_id', editingCohort.id)
          .eq('status', 'active');
      }
    } else {
      await supabase.from('cohorts').insert(payload);
    }
    setCohortSaving(false); setCohortDialogOpen(false); loadAll();
  };

  const toggleCohort = async (c: Cohort) => {
    await supabase.from('cohorts').update({ is_active: !c.is_active }).eq('id', c.id);
    loadAll();
  };

  const openDeleteCohort = (c: Cohort) => {
    setCohortToDelete(c); setDeleteDialogOpen(true);
  };

  const handleDeleteCohort = async () => {
    if (!cohortToDelete) return;
    setDeleting(true);
    // Remove enrollments first to avoid FK violation
    await (supabase.from('enrollments') as any).delete().eq('cohort_id', cohortToDelete.id);
    await supabase.from('cohorts').delete().eq('id', cohortToDelete.id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setCohortToDelete(null);
    loadAll();
  };

  // ── Cohort Farmers Drawer ─────────────────────────────────────────────────

  const openFarmersDrawer = async (c: Cohort) => {
    setDrawerCohort(c);
    setFarmersDrawerOpen(true);
    setCohortFarmers([]);
    setFarmersLoading(true);
    const { data: enrollments } = await (supabase.from('enrollments') as any)
      .select('farmer_id')
      .eq('cohort_id', c.id)
      .eq('status', 'active');
    const farmerIds = (enrollments ?? []).map((e: { farmer_id: string }) => e.farmer_id);
    if (farmerIds.length === 0) {
      setCohortFarmers([]);
      setFarmersLoading(false);
      return;
    }
    const { data: farmers } = await supabase
      .from('farmers')
      .select('id,full_name,phone,region_code,current_fri_score,is_verified')
      .in('id', farmerIds)
      .order('full_name');
    setCohortFarmers((farmers ?? []) as CohortFarmer[]);
    setFarmersLoading(false);
  };

  const cohortsFor = (programId: string) => cohorts.filter(c => c.program_id === programId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Programs & Cohorts</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">
            {programs.length} program{programs.length !== 1 ? 's' : ''} &middot; {cohorts.length} cohort{cohorts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreateProg} className="bg-cropguard-dark hover:bg-cropguard-forest">
          <Plus className="w-4 h-4 mr-2" /> New Program
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-20 text-cropguard-slate">
          <div className="w-16 h-16 bg-cropguard-mint rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-cropguard-dark" />
          </div>
          <p className="text-lg font-medium text-cropguard-forest">No programs yet</p>
          <p className="text-sm mt-1">Create your first agricultural program to get started.</p>
          <Button onClick={openCreateProg} className="mt-4 bg-cropguard-dark hover:bg-cropguard-forest">
            <Plus className="w-4 h-4 mr-2" /> Create Program
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map(p => (
            <ProgramCard
              key={p.id}
              program={p}
              cohorts={cohortsFor(p.id)}
              agents={agents}
              enrollmentCounts={enrollmentCounts}
              onEditProgram={() => openEditProg(p)}
              onToggleProgram={() => toggleActive(p)}
              onNewCohort={() => openCreateCohort(p.id)}
              onEditCohort={openEditCohort}
              onToggleCohort={toggleCohort}
              onDeleteCohort={openDeleteCohort}
              onViewFarmers={openFarmersDrawer}
            />
          ))}
        </div>
      )}

      {/* Program Drawer */}
      <Drawer open={progDialogOpen} onClose={() => setProgDialogOpen(false)} title={editingProg ? 'Edit Program' : 'Create Program'} width="max-w-lg">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program Name *</Label><Input placeholder="e.g. 2024 Maize Outgrower Scheme" value={progForm.name} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</Label><Input placeholder="Brief description" value={progForm.description} onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crop Season *</Label><Input placeholder="e.g. 2024A" value={progForm.crop_season} onChange={e => setProgForm(f => ({ ...f, crop_season: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date *</Label><Input type="date" value={progForm.start_date} onChange={e => setProgForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date *</Label><Input type="date" value={progForm.end_date} onChange={e => setProgForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Enrollment</Label><Input type="number" min="1" value={progForm.target_enrollment} onChange={e => setProgForm(f => ({ ...f, target_enrollment: Number(e.target.value) }))} /></div>
            <MultiSelect label="Crop Types *" options={CROP_OPTIONS} selected={progForm.crop_types} onChange={v => setProgForm(f => ({ ...f, crop_types: v }))} />
            <MultiSelect label="Regions *" options={REGION_OPTIONS} selected={progForm.regions} onChange={v => setProgForm(f => ({ ...f, regions: v }))} />
            {progError && <p className="text-xs text-red-600">{progError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProgDialogOpen(false)}>Cancel</Button>
              <Button disabled={progSaving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleSaveProg}>
                {progSaving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</> : editingProg ? 'Save Changes' : 'Create Program'}
              </Button>
            </div>
          </div>
      </Drawer>

      {/* Cohort Drawer */}
      <Drawer open={cohortDialogOpen} onClose={() => setCohortDialogOpen(false)} title={editingCohort ? 'Edit Cohort' : 'Add Cohort'}>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</Label><Select value={cohortForm.program_id} onValueChange={v => setCohortForm(f => ({ ...f, program_id: v }))}><SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger><SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort Name *</Label><Input placeholder="e.g. Ashanti Batch A" value={cohortForm.name} onChange={e => setCohortForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region *</Label><Select value={cohortForm.region_code} onValueChange={v => setCohortForm(f => ({ ...f, region_code: v }))}><SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger><SelectContent>{REGION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District *</Label><Input placeholder="e.g. Kumasi Metro" value={cohortForm.district} onChange={e => setCohortForm(f => ({ ...f, district: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Count</Label><Input type="number" min="1" value={cohortForm.target_count} onChange={e => setCohortForm(f => ({ ...f, target_count: Number(e.target.value) }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Agent</Label><Select value={cohortForm.agent_id || '__none__'} onValueChange={v => setCohortForm(f => ({ ...f, agent_id: v === '__none__' ? '' : v }))}><SelectTrigger><SelectValue placeholder="No agent assigned" /></SelectTrigger><SelectContent><SelectItem value="__none__">No agent</SelectItem>{agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent></Select></div>
            {cohortError && <p className="text-xs text-red-600">{cohortError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCohortDialogOpen(false)}>Cancel</Button>
              <Button disabled={cohortSaving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleSaveCohort}>
                {cohortSaving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</> : editingCohort ? 'Save Changes' : 'Add Cohort'}
              </Button>
            </div>
          </div>
      </Drawer>

      {/* Delete Cohort Drawer */}
      <Drawer open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} title="Delete Cohort">
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">This action cannot be undone</p>
                <p className="text-xs text-red-600 mt-1">Deleting <strong>{cohortToDelete?.name}</strong> will remove all {enrollmentCounts[cohortToDelete?.id ?? ''] ?? 0} enrollment records associated with this cohort.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteCohort}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Delete Cohort</>}
              </Button>
            </div>
          </div>
      </Drawer>

      {/* Cohort Farmers Drawer */}
      <Drawer
        open={farmersDrawerOpen}
        onClose={() => setFarmersDrawerOpen(false)}
        title={`${drawerCohort?.name ?? ''} — Farmers`}
        subtitle={drawerCohort ? `${REGION_LABELS[drawerCohort.region_code as RC]} · ${drawerCohort.district} · ${enrollmentCounts[drawerCohort.id] ?? 0}/${drawerCohort.target_count} enrolled` : undefined}
        loading={farmersLoading}
        width="max-w-lg"
      >
        {cohortFarmers.length === 0 ? (
          <div className="text-center py-10 text-cropguard-slate">
            <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-cropguard-forest">No farmers enrolled yet</p>
            <p className="text-xs mt-1">Enroll farmers from the Farmers page.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {cohortFarmers.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
                  <span className="text-cropguard-dark font-bold text-xs">{f.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cropguard-forest">{f.full_name}</p>
                  <p className="text-xs text-cropguard-slate">{f.phone} · {REGION_LABELS[f.region_code as RC]}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {f.is_verified && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">Verified</span>}
                  {f.current_fri_score !== null && <span className="text-xs font-bold text-cropguard-dark">FRI {f.current_fri_score}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
