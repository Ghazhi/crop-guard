import { useState, useEffect, useCallback } from 'react';
import {
  UserCog, Users, CheckCircle2, Search,
  UserCheck, Loader2, X, AlertTriangle,
  UserMinus, Plus, UserPlus, ChevronDown, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Cohort, Program, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { REGION_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentStats {
  id: string;
  full_name: string;
  region_code: string | null;
  is_active: boolean;
  cohortCount: number;
  farmerCount: number;
  checkinCount: number;
}

interface CohortAgent {
  agent_id: string;
  is_primary: boolean;
}

interface CohortWithProgram extends Cohort {
  programName: string;
  assignedAgents: CohortAgent[];
}

interface AgentFarmer {
  id: string;
  full_name: string;
  phone: string;
  region_code: string;
  current_fri_score: number | null;
  enrollment_id: string;
  cohort_id: string | null;
  program_id: string | null;
  cohort_name?: string;
  program_name?: string;
}

interface EnrollmentWithFarmer {
  id: string;
  farmer_id: string;
  agent_id: string | null;
  cohort_id: string | null;
  farmers: { id: string; full_name: string; phone: string; region_code: string; current_fri_score: number | null };
}

type UnassignedFilter = 'all' | 'unassigned' | 'assigned';

// ── Workload bar ──────────────────────────────────────────────────────────────

function WorkloadBar({ count, max }: { count: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min((count / max) * 100, 100);
  const color = pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-cropguard-green';
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-gray-400 whitespace-nowrap">{count} farmers</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffAgentAssignmentPage() {
  const profile = useAuthStore(s => s.profile);

  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [cohorts, setCohorts] = useState<CohortWithProgram[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [filterProgram, setFilterProgram] = useState('');
  const [filterAssignment, setFilterAssignment] = useState<UnassignedFilter>('all');
  const [cohortSearch, setCohortSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentStats | null>(null);

  // Single cohort assignment drawer
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeCohort, setActiveCohort] = useState<CohortWithProgram | null>(null);
  const [addAgentId, setAddAgentId] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk cohort assign drawer
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkCohortIds, setBulkCohortIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');

  // Agent farmers drawer
  const [farmersOpen, setFarmersOpen] = useState(false);
  const [drawerAgent, setDrawerAgent] = useState<AgentStats | null>(null);
  const [agentFarmers, setAgentFarmers] = useState<AgentFarmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [drawerFilterProgram, setDrawerFilterProgram] = useState('');
  const [drawerFilterCohort, setDrawerFilterCohort] = useState('');

  // Farmer-level agent assignment drawer
  const [farmerAssignOpen, setFarmerAssignOpen] = useState(false);
  const [farmerAssignCohort, setFarmerAssignCohort] = useState<CohortWithProgram | null>(null);
  const [cohortEnrollments, setCohortEnrollments] = useState<EnrollmentWithFarmer[]>([]);
  const [cohortEnrollLoading, setCohortEnrollLoading] = useState(false);
  const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(new Set());
  const [farmerAssignAgentId, setFarmerAssignAgentId] = useState('');
  const [farmerAssigning, setFarmerAssigning] = useState(false);
  const [farmerAssignMsg, setFarmerAssignMsg] = useState('');
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const [{ data: progs }, { data: agts }, { data: cohData }, { data: caData }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('users').select('id,full_name,region_code,is_active').eq('organisation_id', profile.organisation_id).eq('role', 'agent').order('full_name'),
      supabase.from('cohorts').select('*, programs!inner(organisation_id, name)').eq('programs.organisation_id', profile.organisation_id).order('name'),
      (supabase.from('cohort_agents') as any).select('cohort_id,agent_id,is_primary'),
    ]);

    const progList = progs ?? [];
    const agtList = (agts ?? []) as User[];
    const cohList = (cohData ?? []) as Array<Cohort & { programs: { name: string } }>;
    const caList = (caData ?? []) as { cohort_id: string; agent_id: string; is_primary: boolean }[];

    setPrograms(progList);

    // Build cohort → agents map
    const cohortAgentMap: Record<string, CohortAgent[]> = {};
    caList.forEach(ca => {
      if (!cohortAgentMap[ca.cohort_id]) cohortAgentMap[ca.cohort_id] = [];
      cohortAgentMap[ca.cohort_id].push({ agent_id: ca.agent_id, is_primary: ca.is_primary });
    });

    const cohortsMapped: CohortWithProgram[] = cohList.map(c => ({
      ...c,
      programName: (c.programs as unknown as { name: string })?.name ?? '',
      assignedAgents: cohortAgentMap[c.id] ?? [],
    }));
    setCohorts(cohortsMapped);

    if (cohortsMapped.length > 0) {
      const { data: counts } = await supabase
        .from('enrollments')
        .select('cohort_id,agent_id')
        .in('cohort_id', cohortsMapped.map(c => c.id))
        .eq('status', 'active');

      const cohortMap: Record<string, number> = {};
      const agentFarmerMap: Record<string, number> = {};
      (counts ?? []).forEach((e: { cohort_id: string; agent_id: string | null }) => {
        cohortMap[e.cohort_id] = (cohortMap[e.cohort_id] ?? 0) + 1;
        if (e.agent_id) agentFarmerMap[e.agent_id] = (agentFarmerMap[e.agent_id] ?? 0) + 1;
      });
      setEnrollmentCounts(cohortMap);

      const { data: checkinData } = await (supabase.from('farmer_checkins') as any)
        .select('agent_id')
        .in('agent_id', agtList.map(a => a.id))
        .eq('status', 'submitted');
      const checkinMap: Record<string, number> = {};
      (checkinData ?? []).forEach((c: { agent_id: string }) => {
        checkinMap[c.agent_id] = (checkinMap[c.agent_id] ?? 0) + 1;
      });

      // Agent cohort count from cohort_agents junction
      const agentCohortMap: Record<string, number> = {};
      caList.forEach(ca => {
        agentCohortMap[ca.agent_id] = (agentCohortMap[ca.agent_id] ?? 0) + 1;
      });

      setAgents(agtList.map(a => ({
        id: a.id, full_name: a.full_name, region_code: a.region_code, is_active: a.is_active,
        cohortCount: agentCohortMap[a.id] ?? 0,
        farmerCount: agentFarmerMap[a.id] ?? 0,
        checkinCount: checkinMap[a.id] ?? 0,
      })));
    } else {
      setAgents(agtList.map(a => ({
        id: a.id, full_name: a.full_name, region_code: a.region_code, is_active: a.is_active,
        cohortCount: 0, farmerCount: 0, checkinCount: 0,
      })));
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  // ── Cohort agent assignment ───────────────────────────────────────────────

  const openAssign = (c: CohortWithProgram) => {
    setActiveCohort(c);
    setAddAgentId('');
    setAssignOpen(true);
  };

  const handleAddAgentToCohort = async () => {
    if (!activeCohort || !addAgentId) return;
    setSaving(true);
    await (supabase.from('cohort_agents') as any).upsert(
      { cohort_id: activeCohort.id, agent_id: addAgentId, is_primary: activeCohort.assignedAgents.length === 0 },
      { onConflict: 'cohort_id,agent_id' }
    );
    // Keep cohorts.agent_id as the primary agent for backwards compat
    if (activeCohort.assignedAgents.length === 0) {
      await supabase.from('cohorts').update({ agent_id: addAgentId }).eq('id', activeCohort.id);
    }
    setSaving(false);
    setAssignOpen(false);
    load();
  };

  const handleRemoveAgentFromCohort = async (cohortId: string, agentId: string) => {
    await (supabase.from('cohort_agents') as any)
      .delete()
      .eq('cohort_id', cohortId)
      .eq('agent_id', agentId);
    // Update cohorts.agent_id: find next primary or null
    const remaining = cohorts.find(c => c.id === cohortId)?.assignedAgents.filter(a => a.agent_id !== agentId) ?? [];
    const nextPrimary = remaining.find(a => a.is_primary) ?? remaining[0] ?? null;
    await supabase.from('cohorts').update({ agent_id: nextPrimary?.agent_id ?? null }).eq('id', cohortId);
    load();
  };

  // ── Bulk cohort assign ─────────────────────────────────────────────────────

  const toggleBulkCohort = (id: string) => {
    setBulkCohortIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkAssign = async () => {
    if (!bulkAgentId || bulkCohortIds.size === 0) {
      setBulkMsg('Select an agent and at least one cohort.'); return;
    }
    setBulkSaving(true); setBulkMsg('');
    const rows = [...bulkCohortIds].map(cohort_id => ({ cohort_id, agent_id: bulkAgentId, is_primary: false }));
    await (supabase.from('cohort_agents') as any).upsert(rows, { onConflict: 'cohort_id,agent_id' });
    // Set primary if cohort had no agents
    for (const cohortId of bulkCohortIds) {
      const existing = cohorts.find(c => c.id === cohortId);
      if (!existing?.assignedAgents.length) {
        await supabase.from('cohorts').update({ agent_id: bulkAgentId }).eq('id', cohortId);
        await (supabase.from('cohort_agents') as any).update({ is_primary: true }).eq('cohort_id', cohortId).eq('agent_id', bulkAgentId);
      }
    }
    setBulkSaving(false); setBulkOpen(false);
    setBulkCohortIds(new Set()); setBulkAgentId('');
    load();
  };

  // ── Agent farmers drawer ──────────────────────────────────────────────────

  const openAgentFarmers = async (agent: AgentStats) => {
    setDrawerAgent(agent); setFarmersOpen(true);
    setAgentFarmers([]); setFarmersLoading(true);
    setDrawerFilterProgram(''); setDrawerFilterCohort('');
    const { data: enrollments } = await (supabase.from('enrollments') as any)
      .select('farmer_id, cohort_id, program_id')
      .eq('agent_id', agent.id)
      .eq('status', 'active');
    const farmerIds = (enrollments ?? []).map((e: { farmer_id: string }) => e.farmer_id);
    if (farmerIds.length === 0) { setAgentFarmers([]); setFarmersLoading(false); return; }
    const enrollmentMeta: Record<string, { cohort_id: string | null; program_id: string | null }> = {};
    (enrollments ?? []).forEach((e: { farmer_id: string; cohort_id: string | null; program_id: string | null }) => {
      enrollmentMeta[e.farmer_id] = { cohort_id: e.cohort_id, program_id: e.program_id };
    });
    const { data: farmers } = await supabase
      .from('farmers')
      .select('id,full_name,phone,region_code,current_fri_score')
      .in('id', farmerIds)
      .order('full_name');
    const cohortNames: Record<string, string> = {};
    const programNames: Record<string, string> = {};
    cohorts.forEach(c => { cohortNames[c.id] = c.name; programNames[c.id] = c.programName; });
    setAgentFarmers((farmers ?? []).map((f: AgentFarmer) => {
      const meta = enrollmentMeta[f.id];
      return {
        ...f,
        enrollment_id: '',
        cohort_id:    meta?.cohort_id ?? null,
        program_id:   meta?.program_id ?? null,
        cohort_name:  meta?.cohort_id ? (cohortNames[meta.cohort_id] ?? '') : '',
        program_name: meta?.cohort_id ? (programNames[meta.cohort_id] ?? '') : '',
      };
    }));
    setFarmersLoading(false);
  };

  // ── Per-farmer agent assignment ───────────────────────────────────────────

  const openFarmerAssign = async (c: CohortWithProgram) => {
    setFarmerAssignCohort(c);
    setSelectedEnrollments(new Set());
    setFarmerAssignAgentId('');
    setFarmerAssignMsg('');
    setFarmerAssignOpen(true);
    setCohortEnrollLoading(true);
    const { data } = await (supabase.from('enrollments') as any)
      .select('id, farmer_id, agent_id, cohort_id, farmers(id,full_name,phone,region_code,current_fri_score)')
      .eq('cohort_id', c.id)
      .eq('status', 'active')
      .order('farmers(full_name)');
    setCohortEnrollments((data ?? []) as EnrollmentWithFarmer[]);
    setCohortEnrollLoading(false);
  };

  const toggleEnrollment = (id: string) => {
    setSelectedEnrollments(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAllEnrollments = () => setSelectedEnrollments(new Set(cohortEnrollments.map(e => e.id)));
  const clearEnrollmentSelection = () => setSelectedEnrollments(new Set());

  const handleFarmerAssign = async () => {
    if (!farmerAssignAgentId || selectedEnrollments.size === 0) {
      setFarmerAssignMsg('Select an agent and at least one farmer.'); return;
    }
    setFarmerAssigning(true); setFarmerAssignMsg('');
    const { error } = await (supabase.from('enrollments') as any)
      .update({ agent_id: farmerAssignAgentId })
      .in('id', [...selectedEnrollments]);
    setFarmerAssigning(false);
    if (error) {
      setFarmerAssignMsg('Failed to assign. Please try again.');
    } else {
      setFarmerAssignMsg(`${selectedEnrollments.size} farmer${selectedEnrollments.size > 1 ? 's' : ''} assigned successfully.`);
      setSelectedEnrollments(new Set());
      // Refresh cohort enrollment list
      if (farmerAssignCohort) openFarmerAssign(farmerAssignCohort);
      load();
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const maxFarmers = Math.max(...agents.map(a => a.farmerCount), 1);

  // Drawer farmers filtered by program/cohort
  const drawerPrograms = Array.from(new Map(
    agentFarmers.filter(f => f.program_id && f.program_name).map(f => [f.program_id!, f.program_name!])
  ).entries()).map(([id, name]) => ({ id, name }));

  const drawerCohorts = Array.from(new Map(
    agentFarmers
      .filter(f => f.cohort_id && f.cohort_name && (!drawerFilterProgram || f.program_id === drawerFilterProgram))
      .map(f => [f.cohort_id!, f.cohort_name!])
  ).entries()).map(([id, name]) => ({ id, name }));

  const filteredAgentFarmers = agentFarmers.filter(f => {
    if (drawerFilterProgram && f.program_id !== drawerFilterProgram) return false;
    if (drawerFilterCohort  && f.cohort_id  !== drawerFilterCohort)  return false;
    return true;
  });

  const visibleCohorts = cohorts
    .filter(c => !filterProgram || c.program_id === filterProgram)
    .filter(c => filterAssignment === 'unassigned' ? c.assignedAgents.length === 0 : filterAssignment === 'assigned' ? c.assignedAgents.length > 0 : true)
    .filter(c => !cohortSearch || c.name.toLowerCase().includes(cohortSearch.toLowerCase()) || c.district.toLowerCase().includes(cohortSearch.toLowerCase()))
    .filter(c => !selectedAgent || c.assignedAgents.some(a => a.agent_id === selectedAgent.id));

  const unassignedCount = cohorts.filter(c => c.assignedAgents.length === 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Agent Assignments</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">
            {agents.length} agents &middot; {cohorts.length} cohorts
            {unassignedCount > 0 && (
              <button
                className="ml-2 text-amber-600 font-medium hover:underline"
                onClick={() => setFilterAssignment(f => f === 'unassigned' ? 'all' : 'unassigned')}
              >
                &middot; {unassignedCount} unassigned
              </button>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-cropguard-mid text-cropguard-dark"
          onClick={() => { setBulkAgentId(''); setBulkCohortIds(new Set()); setBulkMsg(''); setBulkOpen(true); }}
        >
          <UserCog className="w-4 h-4 mr-2" /> Bulk Assign
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Agent roster cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAgent(prev => prev?.id === a.id ? null : a)}
                className={cn(
                  'text-left bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md',
                  selectedAgent?.id === a.id && 'border-cropguard-dark ring-2 ring-cropguard-dark/10',
                  !a.is_active && 'opacity-60'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
                    <span className="text-cropguard-dark font-bold text-sm">{a.full_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-cropguard-forest text-sm truncate">{a.full_name}</p>
                    <p className="text-xs text-cropguard-slate">
                      {a.region_code ? REGION_LABELS[a.region_code as keyof typeof REGION_LABELS] ?? a.region_code : 'All regions'}
                    </p>
                  </div>
                  {!a.is_active && <Badge className="text-[9px] bg-gray-100 text-gray-500 border-0 shrink-0">Inactive</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-1 text-center mb-2">
                  <div>
                    <p className="text-lg font-bold text-cropguard-dark leading-none">{a.cohortCount}</p>
                    <p className="text-[10px] text-cropguard-slate mt-0.5">Cohorts</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-cropguard-dark leading-none">{a.farmerCount}</p>
                    <p className="text-[10px] text-cropguard-slate mt-0.5">Farmers</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-cropguard-dark leading-none">{a.checkinCount}</p>
                    <p className="text-[10px] text-cropguard-slate mt-0.5">Check-ins</p>
                  </div>
                </div>
                <WorkloadBar count={a.farmerCount} max={maxFarmers} />
                <button
                  onClick={e => { e.stopPropagation(); openAgentFarmers(a); }}
                  className="mt-2 text-[10px] text-cropguard-dark hover:underline w-full text-center"
                >
                  View farmers
                </button>
              </button>
            ))}
            {agents.length === 0 && (
              <div className="col-span-full text-center py-8 text-cropguard-slate">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No agents in this organisation.</p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {selectedAgent && (
              <Badge
                className="bg-cropguard-mint text-cropguard-dark border-0 cursor-pointer flex items-center gap-1"
                onClick={() => setSelectedAgent(null)}
              >
                {selectedAgent.full_name} <X className="w-3 h-3" />
              </Badge>
            )}
            <Select
              value={filterProgram || '__none__'}
              onValueChange={v => setFilterProgram(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAssignment} onValueChange={v => setFilterAssignment(v as UnassignedFilter)}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cohorts</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                className="pl-8 h-8 text-sm w-52"
                placeholder="Search cohort / district…"
                value={cohortSearch}
                onChange={e => setCohortSearch(e.target.value)}
              />
            </div>
            {(filterProgram || filterAssignment !== 'all' || cohortSearch) && (
              <button
                className="text-xs text-cropguard-slate hover:text-cropguard-dark flex items-center gap-1"
                onClick={() => { setFilterProgram(''); setFilterAssignment('all'); setCohortSearch(''); }}
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Cohort list */}
          {visibleCohorts.length === 0 ? (
            <div className="text-center py-16 text-cropguard-slate">
              <p className="font-medium text-cropguard-forest">No cohorts found</p>
              <p className="text-sm mt-1">Create cohorts in Programs &amp; Cohorts to assign agents.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-cropguard-forest flex-1">
                  {selectedAgent ? `${selectedAgent.full_name}'s Cohorts` : 'All Cohorts'}
                  <span className="ml-2 font-normal text-cropguard-slate">({visibleCohorts.length})</span>
                </h3>
                {unassignedCount > 0 && filterAssignment !== 'unassigned' && (
                  <button
                    className="text-xs text-amber-600 hover:underline flex items-center gap-1"
                    onClick={() => setFilterAssignment('unassigned')}
                  >
                    <AlertTriangle className="w-3 h-3" /> {unassignedCount} unassigned
                  </button>
                )}
              </div>
              <div className="divide-y">
                {visibleCohorts.map(c => {
                  const count = enrollmentCounts[c.id] ?? 0;
                  const pct = Math.min(Math.round((count / c.target_count) * 100), 100);
                  const isExpanded = expandedCohorts.has(c.id);
                  return (
                    <div key={c.id} className={cn('transition-colors', !c.is_active && 'opacity-60')}>
                      <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-cropguard-forest text-sm">{c.name}</p>
                            {c.assignedAgents.length === 0 && (
                              <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700">Unassigned</Badge>
                            )}
                            {!c.is_active && (
                              <Badge className="text-[9px] border-0 bg-gray-100 text-gray-500">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs text-cropguard-slate mt-0.5">
                            {c.programName} &middot; {REGION_LABELS[c.region_code as keyof typeof REGION_LABELS] ?? c.region_code} &middot; {c.district}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 max-w-40">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                                <div className="h-full bg-cropguard-green rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-cropguard-slate whitespace-nowrap">{count}/{c.target_count}</span>
                            </div>
                            {/* Agent badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {c.assignedAgents.map(ca => {
                                const ag = agents.find(a => a.id === ca.agent_id);
                                if (!ag) return null;
                                return (
                                  <span
                                    key={ca.agent_id}
                                    className={cn(
                                      'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full group',
                                      ca.is_primary
                                        ? 'bg-cropguard-dark text-white'
                                        : 'bg-cropguard-mint text-cropguard-dark'
                                    )}
                                  >
                                    {ag.full_name}
                                    {ca.is_primary && <span className="opacity-60 text-[8px]">primary</span>}
                                    <button
                                      onClick={() => handleRemoveAgentFromCohort(c.id, ca.agent_id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-300"
                                      title="Remove from cohort"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Assign farmers to agent */}
                          {count > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              title="Assign farmers to agents"
                              onClick={() => openFarmerAssign(c)}
                            >
                              <Users className="w-3 h-3" /> Farmers
                            </Button>
                          )}
                          {/* Add agent to cohort */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => openAssign(c)}
                          >
                            <Plus className="w-3 h-3" />
                            {c.assignedAgents.length === 0 ? 'Assign Agent' : 'Add Agent'}
                          </Button>
                          {/* Expand/collapse enrolled farmers summary */}
                          {count > 0 && (
                            <button
                              className="text-gray-300 hover:text-gray-500 transition-colors"
                              onClick={() => setExpandedCohorts(prev => {
                                const n = new Set(prev);
                                n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                                return n;
                              })}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Expanded: show enrolled farmers with their assigned agent */}
                      {isExpanded && (
                        <CohortFarmerList
                          cohortId={c.id}
                          agents={agents}
                          cohortAgents={c.assignedAgents}
                          onReassign={() => openFarmerAssign(c)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Agent to Cohort Drawer */}
      <Drawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Add Agent to Cohort"
        width="max-w-sm"
      >
        <div className="space-y-4 pt-2">
          {activeCohort && (
            <div className="bg-cropguard-mint rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-cropguard-forest">{activeCohort.name}</p>
              <p className="text-xs text-cropguard-slate mt-0.5">
                {activeCohort.programName} &middot; {REGION_LABELS[activeCohort.region_code as keyof typeof REGION_LABELS] ?? activeCohort.region_code} &middot; {activeCohort.district}
              </p>
              <p className="text-xs text-cropguard-slate mt-0.5">{enrollmentCounts[activeCohort.id] ?? 0} enrolled farmers</p>
              {activeCohort.assignedAgents.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {activeCohort.assignedAgents.map(ca => {
                    const ag = agents.find(a => a.id === ca.agent_id);
                    return ag ? (
                      <span key={ca.agent_id} className="text-[10px] bg-white/60 text-cropguard-dark px-2 py-0.5 rounded-full">
                        {ag.full_name}{ca.is_primary ? ' (primary)' : ''}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Agent</Label>
            <Select
              value={addAgentId || '__none__'}
              onValueChange={v => setAddAgentId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select agent…</SelectItem>
                {agents.filter(a => a.is_active && !activeCohort?.assignedAgents.some(ca => ca.agent_id === a.id)).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <span>{a.full_name}</span>
                      <span className="text-xs text-gray-400">{a.farmerCount} farmers</span>
                      {a.farmerCount > maxFarmers * 0.8 && (
                        <span className="text-[9px] bg-red-100 text-red-600 rounded-full px-1">High load</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {addAgentId && (() => {
            const ag = agents.find(a => a.id === addAgentId);
            if (!ag) return null;
            const pct = maxFarmers === 0 ? 0 : Math.round((ag.farmerCount / maxFarmers) * 100);
            return (
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-cropguard-slate space-y-1">
                <p className="font-medium text-cropguard-forest">{ag.full_name}</p>
                <p>Currently managing {ag.cohortCount} cohort{ag.cohortCount !== 1 ? 's' : ''} &middot; {ag.farmerCount} farmers</p>
                <WorkloadBar count={ag.farmerCount} max={maxFarmers} />
                {pct > 80 && (
                  <p className="text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> Agent has high workload
                  </p>
                )}
              </div>
            );
          })()}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button disabled={saving || !addAgentId} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleAddAgentToCohort}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Cohort'}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Bulk Assignment Drawer */}
      <Drawer
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Agent Assignment"
        width="max-w-lg"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign Agent</Label>
            <Select value={bulkAgentId} onValueChange={setBulkAgentId}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                {agents.filter(a => a.is_active).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                    <span className="ml-2 text-xs text-gray-400">{a.farmerCount} farmers</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Select Cohorts ({bulkCohortIds.size} selected)
              </Label>
              {bulkCohortIds.size > 0 && (
                <button className="text-xs text-cropguard-slate hover:text-cropguard-dark" onClick={() => setBulkCohortIds(new Set())}>
                  Clear selection
                </button>
              )}
            </div>
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {cohorts.map(c => (
                <div
                  key={c.id}
                  onClick={() => toggleBulkCohort(c.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                    bulkCohortIds.has(c.id) ? 'bg-cropguard-mint' : 'hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    bulkCohortIds.has(c.id) ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-300'
                  )}>
                    {bulkCohortIds.has(c.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-cropguard-forest">{c.name}</p>
                      {c.assignedAgents.length === 0 && <span className="text-[9px] bg-amber-100 text-amber-700 rounded-full px-1.5">Unassigned</span>}
                    </div>
                    <p className="text-xs text-cropguard-slate">{c.programName} &middot; {REGION_LABELS[c.region_code as keyof typeof REGION_LABELS] ?? c.region_code}</p>
                  </div>
                  {c.assignedAgents.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {c.assignedAgents.map(ca => (
                        <span key={ca.agent_id} className="text-[9px] text-cropguard-slate bg-gray-100 rounded-full px-1.5 py-0.5">
                          {agents.find(a => a.id === ca.agent_id)?.full_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {bulkMsg && <p className="text-xs text-red-600">{bulkMsg}</p>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkSaving || !bulkAgentId || bulkCohortIds.size === 0}
              className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
              onClick={handleBulkAssign}
            >
              {bulkSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : `Assign to ${bulkCohortIds.size} Cohort${bulkCohortIds.size !== 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Agent Farmers Drawer */}
      <Drawer
        open={farmersOpen}
        onClose={() => setFarmersOpen(false)}
        title={drawerAgent ? `${drawerAgent.full_name} — Assigned Farmers` : 'Assigned Farmers'}
        loading={farmersLoading}
        width="max-w-lg"
      >
        <div className="pt-2">
          {drawerAgent && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Cohorts', value: drawerAgent.cohortCount },
                { label: 'Farmers', value: drawerAgent.farmerCount },
                { label: 'Check-ins', value: drawerAgent.checkinCount },
              ].map(s => (
                <div key={s.label} className="bg-cropguard-mint rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-cropguard-dark">{s.value}</p>
                  <p className="text-xs text-cropguard-slate">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Program + Cohort filters */}
          {agentFarmers.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Select
                value={drawerFilterProgram || '__none__'}
                onValueChange={v => {
                  setDrawerFilterProgram(v === '__none__' ? '' : v);
                  setDrawerFilterCohort('');
                }}
              >
                <SelectTrigger className="h-8 flex-1 min-w-[140px] text-xs">
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All programs</SelectItem>
                  {drawerPrograms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={drawerFilterCohort || '__none__'}
                onValueChange={v => setDrawerFilterCohort(v === '__none__' ? '' : v)}
                disabled={drawerCohorts.length === 0}
              >
                <SelectTrigger className="h-8 flex-1 min-w-[140px] text-xs">
                  <SelectValue placeholder="All cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All cohorts</SelectItem>
                  {drawerCohorts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(drawerFilterProgram || drawerFilterCohort) && (
                <button
                  className="text-xs text-cropguard-slate hover:text-cropguard-dark flex items-center gap-1 shrink-0"
                  onClick={() => { setDrawerFilterProgram(''); setDrawerFilterCohort(''); }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}

          {agentFarmers.length === 0 && !farmersLoading ? (
            <div className="text-center py-10 text-cropguard-slate">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium text-cropguard-forest">No farmers assigned yet</p>
              <p className="text-xs mt-1">Assign farmers to this agent via the Farmers button on each cohort.</p>
            </div>
          ) : filteredAgentFarmers.length === 0 ? (
            <div className="text-center py-10 text-cropguard-slate">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium text-cropguard-forest">No farmers match filters</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border overflow-hidden">
              {filteredAgentFarmers.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0 overflow-hidden">
                    {(f as any).photo_url
                      ? <img src={(f as any).photo_url} alt={f.full_name} className="w-full h-full object-cover" />
                      : <span className="text-cropguard-dark font-bold text-xs">{f.full_name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cropguard-forest">{f.full_name}</p>
                    <p className="text-xs text-cropguard-slate">{f.phone} &middot; {REGION_LABELS[f.region_code as keyof typeof REGION_LABELS] ?? f.region_code}</p>
                    {f.cohort_name && <p className="text-[10px] text-gray-400">{f.program_name ? `${f.program_name} · ` : ''}{f.cohort_name}</p>}
                  </div>
                  {f.current_fri_score !== null && (
                    <span className="text-xs font-bold text-cropguard-dark shrink-0">FRI {f.current_fri_score}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* Per-Farmer Agent Assignment Drawer */}
      <Drawer
        open={farmerAssignOpen}
        onClose={() => setFarmerAssignOpen(false)}
        title={farmerAssignCohort ? `Assign Farmers — ${farmerAssignCohort.name}` : 'Assign Farmers to Agent'}
        loading={cohortEnrollLoading}
        width="max-w-lg"
      >
        <div className="space-y-4 pt-2">
          {farmerAssignCohort && (
            <div className="bg-cropguard-mint rounded-lg px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-cropguard-forest">{farmerAssignCohort.programName} &middot; {farmerAssignCohort.name}</p>
                <p className="text-xs text-cropguard-slate">{cohortEnrollments.length} enrolled farmers</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {farmerAssignCohort.assignedAgents.map(ca => {
                  const ag = agents.find(a => a.id === ca.agent_id);
                  return ag ? (
                    <span key={ca.agent_id} className="text-[10px] bg-cropguard-dark text-white px-2 py-0.5 rounded-full">
                      {ag.full_name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Agent selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Assign selected farmers to
            </Label>
            <Select value={farmerAssignAgentId || '__none__'} onValueChange={v => setFarmerAssignAgentId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select agent…</SelectItem>
                {/* Show agents assigned to this cohort first */}
                {farmerAssignCohort?.assignedAgents.map(ca => {
                  const ag = agents.find(a => a.id === ca.agent_id);
                  return ag ? (
                    <SelectItem key={ag.id} value={ag.id}>
                      <div className="flex items-center gap-2">
                        <span>{ag.full_name}</span>
                        {ca.is_primary && <span className="text-[9px] bg-cropguard-mint text-cropguard-dark rounded-full px-1.5">cohort agent</span>}
                      </div>
                    </SelectItem>
                  ) : null;
                })}
                {/* Other active agents */}
                {agents.filter(a => a.is_active && !farmerAssignCohort?.assignedAgents.some(ca => ca.agent_id === a.id)).map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Farmer list */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Farmers ({selectedEnrollments.size} selected)
              </Label>
              <div className="flex gap-2 text-xs">
                <button className="text-cropguard-dark hover:underline" onClick={selectAllEnrollments}>All</button>
                <span className="text-gray-300">|</span>
                <button className="text-cropguard-slate hover:underline" onClick={clearEnrollmentSelection}>None</button>
              </div>
            </div>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {cohortEnrollLoading ? (
                <div className="p-3 space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : cohortEnrollments.length === 0 ? (
                <div className="py-8 text-center text-sm text-cropguard-slate">No enrolled farmers in this cohort.</div>
              ) : (
                cohortEnrollments.map(enr => {
                  const f = enr.farmers;
                  const assignedAgent = agents.find(a => a.id === enr.agent_id);
                  const isSelected = selectedEnrollments.has(enr.id);
                  return (
                    <div
                      key={enr.id}
                      onClick={() => toggleEnrollment(enr.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                        isSelected ? 'bg-cropguard-mint' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-300'
                      )}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0 overflow-hidden">
                        {(f as any).photo_url
                          ? <img src={(f as any).photo_url} alt={f.full_name} className="w-full h-full object-cover" />
                          : <span className="text-cropguard-dark font-bold text-[10px]">{f.full_name.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                        <p className="text-xs text-cropguard-slate">{f.phone}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {assignedAgent ? (
                          <span className="text-[10px] bg-cropguard-mint text-cropguard-dark px-1.5 py-0.5 rounded-full">{assignedAgent.full_name}</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Unassigned</span>
                        )}
                        {f.current_fri_score !== null && (
                          <p className="text-[10px] font-bold text-cropguard-dark mt-0.5">FRI {f.current_fri_score}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {farmerAssignMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm', farmerAssignMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
              {farmerAssignMsg}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setFarmerAssignOpen(false)}>Close</Button>
            <Button
              disabled={farmerAssigning || !farmerAssignAgentId || selectedEnrollments.size === 0}
              className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
              onClick={handleFarmerAssign}
            >
              {farmerAssigning
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Assigning…</>
                : <><UserPlus className="w-4 h-4 mr-2" />Assign {selectedEnrollments.size > 0 ? selectedEnrollments.size : ''} Farmer{selectedEnrollments.size !== 1 ? 's' : ''}</>
              }
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// ── Inline cohort farmer list (expandable) ────────────────────────────────────

function CohortFarmerList({
  cohortId,
  agents,
  cohortAgents,
  onReassign,
}: {
  cohortId: string;
  agents: AgentStats[];
  cohortAgents: CohortAgent[];
  onReassign: () => void;
}) {
  const [rows, setRows] = useState<EnrollmentWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from('enrollments') as any)
        .select('id,farmer_id,agent_id,cohort_id,farmers(id,full_name,phone,region_code,current_fri_score)')
        .eq('cohort_id', cohortId)
        .eq('status', 'active')
        .limit(20);
      setRows((data ?? []) as EnrollmentWithFarmer[]);
      setLoading(false);
    })();
  }, [cohortId]);

  if (loading) return <div className="px-5 py-3 bg-gray-50"><Skeleton className="h-8" /></div>;
  if (rows.length === 0) return null;

  return (
    <div className="bg-gray-50 border-t">
      <div className="px-5 py-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Enrolled Farmers</p>
        <button onClick={onReassign} className="text-[10px] text-cropguard-dark hover:underline flex items-center gap-1">
          <UserCog className="w-3 h-3" /> Manage assignments
        </button>
      </div>
      <div className="divide-y divide-gray-100 px-5 pb-3 max-h-48 overflow-y-auto">
        {rows.map(enr => {
          const f = enr.farmers;
          const ag = agents.find(a => a.id === enr.agent_id);
          return (
            <div key={enr.id} className="flex items-center gap-3 py-2">
              <div className="w-6 h-6 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0 overflow-hidden">
                {(f as any).photo_url
                  ? <img src={(f as any).photo_url} alt={f.full_name} className="w-full h-full object-cover" />
                  : <span className="text-cropguard-dark font-bold text-[9px]">{f.full_name.charAt(0)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-cropguard-forest truncate">{f.full_name}</p>
                <p className="text-[10px] text-gray-400">{f.phone}</p>
              </div>
              {ag ? (
                <span className="text-[9px] bg-cropguard-mint text-cropguard-dark px-1.5 py-0.5 rounded-full shrink-0">{ag.full_name}</span>
              ) : (
                <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">Unassigned</span>
              )}
            </div>
          );
        })}
        {rows.length === 20 && (
          <p className="text-[10px] text-gray-400 pt-2">Showing first 20 — use Manage assignments to see all.</p>
        )}
      </div>
    </div>
  );
}
