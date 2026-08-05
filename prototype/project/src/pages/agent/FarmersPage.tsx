import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Search, Filter, WifiOff, Download, Check,
  ChevronLeft, ChevronRight, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/offline';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import type { Farmer, CropType } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CROP_LABELS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

/* ── zone helpers ─────────────────────────────────────────── */
function zoneLabel(score: number | null) {
  if (score === null) return 'N/A';
  if (score >= 80) return 'Leader';
  if (score >= 60) return 'Builder';
  if (score >= 40) return 'Learner';
  return 'Starter';
}
function zoneStyle(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 80) return 'bg-cropguard-dark text-white';
  if (score >= 60) return 'bg-cropguard-mid text-white';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

/* ── types ─────────────────────────────────────────────────── */
type FRIZone = 'all' | 'leader' | 'builder' | 'learner' | 'starter' | 'none';
type CheckinFilter = 'all' | 'submitted' | 'verified' | 'missed';

interface FarmerWithMeta extends Farmer {
  latestCheckinStatus?: 'submitted' | 'verified' | 'missed' | 'none';
  cachedOffline?: boolean;
  isEnrolled: boolean;
  programName?: string;
  programId?: string;
  cohortName?: string;
  cohortId?: string;
  cooperativeName?: string;
  currentWeek?: number;
}

interface ProgramOption { id: string; name: string; }
interface CohortOption  { id: string; name: string; programId: string; }

/* ── filter chip sets ──────────────────────────────────────── */
const ZONE_FILTERS: { key: FRIZone; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'leader', label: 'Leader' },
  { key: 'builder', label: 'Builder' }, { key: 'learner', label: 'Learner' },
  { key: 'starter', label: 'Starter' }, { key: 'none', label: 'N/A' },
];
const CHECKIN_FILTERS: { key: CheckinFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'submitted', label: 'Submitted' },
  { key: 'verified', label: 'Verified' }, { key: 'missed', label: 'Missed' },
];

/* ── status badge ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: FarmerWithMeta['latestCheckinStatus'] }) {
  const styles: Record<string, string> = {
    submitted: 'bg-orange-100 text-orange-700',
    verified:  'bg-green-100 text-green-700',
    missed:    'bg-red-100 text-red-700',
    none:      'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    submitted: 'Submitted', verified: 'On Track', missed: 'Missed', none: 'No Check-in',
  };
  const s = status ?? 'none';
  return <Badge className={cn('text-[9px] border-0 shrink-0', styles[s])}>{labels[s]}</Badge>;
}

/* ── farmer card ───────────────────────────────────────────── */
function FarmerCard({ f, offlineIds }: { f: FarmerWithMeta; offlineIds: Set<string> }) {
  return (
    <Link
      to={`/agent/farmers/${f.id}/profile`}
      className="flex items-center gap-3 bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 hover:border-cropguard-pale transition-colors"
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-cropguard-mint flex items-center justify-center overflow-hidden">
          {f.photo_url
            ? <img src={f.photo_url} alt={f.full_name} className="w-11 h-11 object-cover" />
            : <span className="text-cropguard-dark font-bold text-sm">{f.full_name.charAt(0)}</span>}
        </div>
        {/* checkin status dot */}
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
          f.latestCheckinStatus === 'verified' || f.latestCheckinStatus === 'submitted'
            ? 'bg-green-500'
            : f.latestCheckinStatus === 'missed'
            ? 'bg-red-500'
            : 'bg-yellow-400'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-cropguard-forest text-[13px] uppercase tracking-wide truncate max-w-[140px]">{f.full_name}</p>
          {f.currentWeek !== undefined && f.currentWeek > 0 && (
            <Badge className="text-[9px] border-0 shrink-0 bg-cropguard-dark/10 text-cropguard-dark">
              Wk {f.currentWeek}
            </Badge>
          )}
          <StatusBadge status={f.latestCheckinStatus} />
        </div>
        {f.cohortName && (
          <p className="text-[11px] text-cropguard-slate mt-0.5 font-semibold">{f.cohortName}</p>
        )}
        <p className="text-[10px] text-cropguard-mid font-medium mt-0.5 flex items-center gap-1">
          {f.cooperativeName && <><Users className="w-2.5 h-2.5 shrink-0" /> {f.cooperativeName}</>}
          {f.cooperativeName && f.community && <span className="text-gray-300">·</span>}
          {f.community && <span className="text-gray-500">{f.community}</span>}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <div className={cn('text-[11px] font-bold w-9 h-9 rounded-full flex items-center justify-center', zoneStyle(f.current_fri_score))}>
          {f.current_fri_score ?? '–'}
        </div>
        <p className="text-[9px] text-gray-400 mt-0.5">{zoneLabel(f.current_fri_score)}</p>
      </div>
    </Link>
  );
}

/* ── collapsible cohort group ──────────────────────────────── */
function CohortGroup({
  name, programName, farmers, renderCards,
}: {
  name: string;
  programName: string;
  farmers: FarmerWithMeta[];
  renderCards: (items: FarmerWithMeta[]) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 pt-2 pb-1 sticky top-0 z-10 bg-cropguard-gray"
      >
        <Users className="w-3.5 h-3.5 text-cropguard-mid shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-[10px] font-bold text-cropguard-slate uppercase tracking-wider block">{name}</span>
          {programName && (
            <span className="text-[9px] text-gray-400 font-medium block leading-tight">{programName}</span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-cropguard-mid bg-cropguard-mint px-2 py-0.5 rounded-full">{farmers.length}</span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="space-y-2 pt-1 max-h-[calc(100vh-16rem)] overflow-y-auto scrollbar-thin pr-1">
          {renderCards(farmers)}
        </div>
      )}
    </div>
  );
}

/* ── main page ─────────────────────────────────────────────── */
export default function AgentFarmersPage() {
  const profile  = useAuthStore(s => s.profile);
  const isOnline = useOfflineStore(s => s.isOnline);

  const [farmers, setFarmers]         = useState<FarmerWithMeta[]>([]);
  const [programs, setPrograms]       = useState<ProgramOption[]>([]);
  const [cohorts, setCohorts]         = useState<CohortOption[]>([]);
  const [search, setSearch]           = useState('');
  const [zoneFilter, setZoneFilter]   = useState<FRIZone>('all');
  const [ciFilter, setCiFilter]       = useState<CheckinFilter>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter]   = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [offlineIds, setOfflineIds]   = useState<Set<string>>(new Set());
  const [page, setPage]               = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  useEffect(() => {
    if (!profile) return;
    loadFarmers();
    loadOfflineCache();
  }, [profile]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, zoneFilter, ciFilter, programFilter, cohortFilter]);

  async function loadFarmers() {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Farmers assigned directly via enrollments.agent_id
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('farmer_id, program_id, cohort_id, programs(name), cohorts(name, checkin_start_date)')
        .eq('agent_id', profile.id)
        .eq('status', 'active');

      // 2. Farmers assigned via cohort_agents junction (agent assigned to a cohort)
      const { data: cohortAgentRows } = await supabase
        .from('cohort_agents')
        .select('cohort_id')
        .eq('agent_id', profile.id);

      const junctionCohortIds = (cohortAgentRows ?? []).map((r: any) => r.cohort_id);

      let cohortEnrollments: any[] = [];
      if (junctionCohortIds.length > 0) {
        const { data: ce } = await supabase
          .from('enrollments')
          .select('farmer_id, program_id, cohort_id, programs(name), cohorts(name, checkin_start_date)')
          .in('cohort_id', junctionCohortIds)
          .eq('status', 'active');
        cohortEnrollments = ce ?? [];
      }

      // Merge both sources, deduplicating by farmer_id
      const allEnrollments = [...(enrollments ?? []), ...cohortEnrollments] as any[];
      const seenFarmerIds = new Set<string>();
      const dedupEnrollments = allEnrollments.filter((e: any) => {
        if (seenFarmerIds.has(e.farmer_id)) return false;
        seenFarmerIds.add(e.farmer_id);
        return true;
      });

      const assignedIds = dedupEnrollments.map((e: any) => e.farmer_id);

      // Build option lists for program/cohort filter dropdowns
      const programMap = new Map<string, string>();
      const cohortMap  = new Map<string, { name: string; programId: string }>();
      for (const e of dedupEnrollments as any[]) {
        if (e.program_id && e.programs?.name) programMap.set(e.program_id, e.programs.name);
        if (e.cohort_id  && e.cohorts?.name)  cohortMap.set(e.cohort_id, { name: e.cohorts.name, programId: e.program_id ?? '' });
      }
      setPrograms([...programMap.entries()].map(([id, name]) => ({ id, name })));
      setCohorts([...cohortMap.entries()].map(([id, { name, programId }]) => ({ id, name, programId })));

      if (assignedIds.length === 0) { setFarmers([]); setLoading(false); return; }

      const assignedSet = new Set(assignedIds);

      // Fetch all farmers in the agent's org (RLS scopes to org) then filter
      // client-side to avoid URL-length limits when many IDs are assigned.
      const { data: allFarmersRaw } = await supabase
        .from('farmers').select('*, cooperatives!farmers_cooperative_id_fkey(name)').eq('organisation_id', profile.organisation_id).order('full_name');
      const allFarmers = (allFarmersRaw ?? []).filter((f: any) => assignedSet.has(f.id));
      if (allFarmers.length === 0) { setFarmers([]); setLoading(false); return; }

      // Compute the current week number per cohort (same logic as CheckinsPage).
      // Agent-only verifications save check-ins with the cohort-based week number,
      // not the ISO week number, so we must look up check-ins by the correct week.
      const cohortWeekByFarmer = new Map<string, number>();
      for (const e of dedupEnrollments as any[]) {
        if (!cohortWeekByFarmer.has(e.farmer_id)) {
          const cohort = e.cohorts as { checkin_start_date?: string } | null;
          let week = 0;
          if (cohort?.checkin_start_date) {
            const startDate = new Date(cohort.checkin_start_date + 'T00:00:00');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today.getTime() - startDate.getTime()) / 86400000);
            week = diffDays < 0 ? 0 : Math.floor(diffDays / 7) + 1;
          } else {
            week = getWeekNum();
          }
          cohortWeekByFarmer.set(e.farmer_id, week);
        }
      }

      const farmerIds = allFarmers.map(f => (f as any).id);
      // Fetch all recent check-ins for these farmers (no week filter) so we can
      // match against the correct cohort-based week per farmer.
      let checkins: any[] = [];
      const BATCH = 25;
      for (let i = 0; i < farmerIds.length; i += BATCH) {
        const batch = farmerIds.slice(i, i + BATCH);
        const { data: batchData } = await supabase
          .from('farmer_checkins')
          .select('farmer_id, week_number, verified_at, status')
          .in('farmer_id', batch)
          .order('created_at', { ascending: false });
        if (batchData) checkins = checkins.concat(batchData);
      }

      // Build a map of farmer_id -> latest check-in status for the current cohort week
      const ciMap = new Map<string, 'verified' | 'submitted'>();
      for (const c of checkins) {
        const expectedWeek = cohortWeekByFarmer.get(c.farmer_id) ?? getWeekNum();
        if (c.week_number !== expectedWeek) continue;
        if (ciMap.has(c.farmer_id)) continue; // first match wins (already sorted desc)
        ciMap.set(c.farmer_id, c.verified_at ? 'verified' : 'submitted');
      }

      // Map per-farmer enrollment info (cohort takes precedence of first enrollment)
      const farmerEnrollMap = new Map<string, { programName: string; programId: string; cohortName: string; cohortId: string }>();
      for (const e of dedupEnrollments as any[]) {
        if (!farmerEnrollMap.has(e.farmer_id)) {
          farmerEnrollMap.set(e.farmer_id, {
            programName: e.programs?.name ?? '',
            programId: e.program_id ?? '',
            cohortName: e.cohorts?.name ?? '',
            cohortId: e.cohort_id ?? '',
          });
        }
      }

      const coopMap = new Map<string, string>();
      for (const f of (allFarmers ?? []) as any[]) {
        const coop = f.cooperatives as { name: string } | null;
        if (coop?.name) coopMap.set(f.id, coop.name);
      }

      const enrolledSet = new Set(assignedIds);
      setFarmers(allFarmers.map(f => ({
        ...(f as Farmer),
        latestCheckinStatus: (ciMap.get(f.id) as FarmerWithMeta['latestCheckinStatus']) ?? 'none',
        isEnrolled: enrolledSet.has(f.id),
        ...farmerEnrollMap.get(f.id),
        cooperativeName: coopMap.get(f.id),
        currentWeek: cohortWeekByFarmer.get(f.id),
      })));
    } catch {
      const cached = await db.farmers.toArray();
      setFarmers(cached.map(c => ({ ...(c.data as unknown as Farmer), isEnrolled: false })));
    }
    setLoading(false);
  }

  async function loadOfflineCache() {
    const cached = await db.farmers.toArray();
    setOfflineIds(new Set(cached.map(c => c.id)));
  }

  async function downloadOffline() {
    if (!profile || downloading) return;
    setDownloading(true);
    try {
      await db.farmers.bulkPut(
        farmers.map(f => ({
          id: f.id,
          data: f as unknown as Record<string, unknown>,
          organisationId: profile.organisation_id ?? undefined,
          cachedAt: new Date().toISOString(),
        }))
      );
      setOfflineIds(new Set(farmers.map(f => f.id)));
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } finally {
      setDownloading(false);
    }
  }

  function getWeekNum() {
    const now = new Date(), s = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
  }

  /* ── filtering ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return farmers.filter(f => {
      if (search && !(
        f.full_name.toLowerCase().includes(search.toLowerCase()) ||
        f.phone.includes(search) ||
        f.national_id?.includes(search) ||
        f.community.toLowerCase().includes(search.toLowerCase())
      )) return false;

      if (zoneFilter !== 'all') {
        const s = f.current_fri_score;
        if (zoneFilter === 'none'    && s !== null) return false;
        if (zoneFilter === 'leader'  && !(s !== null && s >= 80)) return false;
        if (zoneFilter === 'builder' && !(s !== null && s >= 60 && s < 80)) return false;
        if (zoneFilter === 'learner' && !(s !== null && s >= 40 && s < 60)) return false;
        if (zoneFilter === 'starter' && !(s !== null && s < 40)) return false;
      }

      if (ciFilter !== 'all') {
        if (ciFilter === 'missed' && !(f.latestCheckinStatus === 'none' || f.latestCheckinStatus === 'missed')) return false;
        if (ciFilter !== 'missed' && f.latestCheckinStatus !== ciFilter) return false;
      }

      if (programFilter !== 'all' && f.programId !== programFilter) return false;
      if (cohortFilter  !== 'all' && f.cohortId  !== cohortFilter)  return false;

      return true;
    });
  }, [farmers, search, zoneFilter, ciFilter, programFilter, cohortFilter]);

  /* ── cohort-grouped view when no specific cohort is selected ── */
  const grouped = useMemo(() => {
    if (cohortFilter !== 'all') return null; // flat list when filtered to one cohort

    const map = new Map<string, { label: string; programName: string; farmers: FarmerWithMeta[] }>();
    for (const f of filtered) {
      const key = f.cohortId ?? '__none';
      const label = f.cohortName ?? (f.programName ?? 'Unassigned');
      const prog = f.cohortName ? (f.programName ?? '') : '';
      if (!map.has(key)) map.set(key, { label, programName: prog, farmers: [] });
      map.get(key)!.farmers.push(f);
    }
    // Sort groups alphabetically
    return [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [filtered, cohortFilter]);

  /* ── pagination (flat, used when grouped is null) ─────────── */
  const totalPages = cohortFilter !== 'all' ? Math.ceil(filtered.length / PAGE_SIZE) : 1;
  const paginated  = cohortFilter !== 'all'
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : [];

  /* ── cohorts to show in filter (scoped to selected program) ── */
  const visibleCohorts = programFilter === 'all'
    ? cohorts
    : cohorts.filter(c => c.programId === programFilter);

  const hasActiveFilters = zoneFilter !== 'all' || ciFilter !== 'all' || programFilter !== 'all' || cohortFilter !== 'all';

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">Farmers</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={downloadOffline}
            disabled={downloading || farmers.length === 0}
            className={cn('h-8 gap-1.5 text-xs', downloadDone && 'bg-green-50 border-green-200 text-green-700')}
          >
            {downloadDone
              ? <><Check className="w-3.5 h-3.5" /> Saved</>
              : <><Download className="w-3.5 h-3.5" /> Save offline</>}
          </Button>
          <Button asChild size="sm" className="bg-cropguard-dark hover:bg-cropguard-forest h-8 gap-1.5">
            <Link to="/agent/farmers/register"><UserPlus className="w-3.5 h-3.5" /> Add</Link>
          </Button>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Name, phone, community…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn('h-10 px-3 relative', (showFilters || hasActiveFilters) && 'bg-cropguard-mint border-cropguard-pale')}
        >
          <Filter className="w-4 h-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cropguard-dark rounded-full" />
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-3.5">

          {/* Program filter */}
          {programs.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Program</p>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => { setProgramFilter('all'); setCohortFilter('all'); }}
                  className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    programFilter === 'all' ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600')}
                >All</button>
                {programs.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProgramFilter(p.id); setCohortFilter('all'); }}
                    className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                      programFilter === p.id ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600')}
                  >{p.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Cohort filter */}
          {visibleCohorts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cohort</p>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setCohortFilter('all')}
                  className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    cohortFilter === 'all' ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600')}
                >All</button>
                {visibleCohorts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCohortFilter(c.id)}
                    className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                      cohortFilter === c.id ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600')}
                  >{c.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* FRI Zone */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">FRI Zone</p>
            <div className="flex gap-1 flex-wrap">
              {ZONE_FILTERS.map(({ key, label }) => (
                <button key={key} onClick={() => setZoneFilter(key)}
                  className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    zoneFilter === key ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600')}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Check-in status */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Check-in Status</p>
            <div className="flex gap-1 flex-wrap">
              {CHECKIN_FILTERS.map(({ key, label }) => (
                <button key={key} onClick={() => setCiFilter(key)}
                  className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    ciFilter === key ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600')}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-cropguard-slate">
          {filtered.length} farmer{filtered.length !== 1 ? 's' : ''}
          {!isOnline && <span className="inline-flex items-center gap-1 ml-2 text-amber-600"><WifiOff className="w-3 h-3" /> offline</span>}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-cropguard-slate text-sm">
          {search || hasActiveFilters ? 'No farmers match your filters.' : 'No farmers yet. Register one!'}
        </div>
      ) : cohortFilter === 'all' && grouped ? (
        /* ── grouped by cohort ─────────────────────────────────── */
        <div className="space-y-1">
          {grouped.map(([key, group]) => (
            <CohortGroup
              key={key}
              name={group.label}
              programName={group.programName}
              farmers={group.farmers}
              renderCards={(items) => items.map(f => (
                <FarmerCard key={f.id} f={f} offlineIds={offlineIds} />
              ))}
            />
          ))}
        </div>
      ) : (
        /* ── paginated flat list (single-cohort filter active) ─── */
        <>
          <div className="space-y-2">
            {paginated.map(f => <FarmerCard key={f.id} f={f} offlineIds={offlineIds} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline" size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <Button
                variant="outline" size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-8 gap-1 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
