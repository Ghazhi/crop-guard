import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronRight, Leaf, TrendingUp,
  Loader2, Users, MapPin, AlertTriangle, Award,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserRole } from '@/types/database';

/* ── zone helpers ────────────────────────────────────────── */

function zoneColor(score: number | null) {
  if (score === null) return '#9CA3AF';
  if (score >= 80) return '#1A3D2B';
  if (score >= 60) return '#3D7A56';
  if (score >= 40) return '#E8963A';
  return '#D94F3D';
}

function zoneLabel(score: number | null) {
  if (score === null) return 'Not Assessed';
  if (score >= 80) return 'Leader';
  if (score >= 60) return 'Builder';
  if (score >= 40) return 'Learner';
  return 'Starter';
}

function zoneFull(score: number | null) {
  if (score === null) return 'Not Assessed';
  if (score >= 80) return 'Resilience Leader';
  if (score >= 60) return 'Resilience Builder';
  if (score >= 40) return 'Resilience Learner';
  return 'Resilience Starter';
}

function zoneRisk(score: number | null) {
  if (score === null) return 'No Data';
  if (score >= 80) return 'Low Risk';
  if (score >= 60) return 'Managed Risk';
  if (score >= 40) return 'Elevated Risk';
  return 'Critical Risk';
}

function zoneSubtitle(score: number | null): string {
  if (score === null) return 'No assessment data available yet.';
  if (score >= 80) return 'Strong resilience — maintain current practices and mentor other farmers.';
  if (score >= 60) return 'Moderate resilience — targeted improvements will lift this farmer into the Leader zone.';
  if (score >= 40) return 'Elevated risk — advisory support needed to strengthen weak pillars.';
  return 'Critical risk — immediate advisory intervention needed to prevent farm failure.';
}

const ZONE_BADGE: Record<string, string> = {
  'Leader':  'bg-emerald-100 text-emerald-700',
  'Builder': 'bg-green-100 text-green-700',
  'Learner': 'bg-amber-100 text-amber-700',
  'Starter': 'bg-red-100 text-red-700',
};

/* ── FRI arc gauge ────────────────────────────────────────── */

function FRIArc({ score }: { score: number | null }) {
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  const color = zoneColor(score);
  const filled = score !== null ? (score / 100) * circ * 0.75 : 0;
  return (
    <svg width="140" height="108" viewBox="0 0 140 108">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth="9"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${filled} ${circ - filled + circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cx - 5} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1A3D2B">
        {score ?? '–'}
      </text>
      <text x={cx} y={cx + 15} textAnchor="middle" fontSize="11" fontWeight="600" fill="#4A5568">
        {zoneLabel(score)}
      </text>
    </svg>
  );
}

/* ── pillar bar ───────────────────────────────────────────── */

function PillarBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{score}<span className="text-gray-400 font-normal">/{max}</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ── week status chip ─────────────────────────────────────── */

function WeekStatusChip({ week, score, isProvisional }: { week: number; score: number | null; isProvisional?: boolean }) {
  const color = score !== null ? zoneColor(score) : '#E5E7EB';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}>
        {score !== null ? (isProvisional ? 'P' : 'V') : '–'}
      </div>
      <span className="text-[8px] text-gray-400">{week === 0 ? 'Base' : `W${week}`}</span>
    </div>
  );
}

/* ── chart tooltip ────────────────────────────────────────── */

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow text-xs font-semibold text-cropguard-dark">
      {payload[0].value} pts
    </div>
  );
}

/* ── norvi interpretation ─────────────────────────────────── */

function buildInterpretation(latest: ScoreRow | null, farmerName: string): string {
  if (!latest) return `${farmerName} has not completed any check-ins yet. No FRI score available.`;
  const { total_score, p1_score, p2_score, p3_score, p4_score } = latest;
  const zone = zoneLabel(total_score);
  const weakest = [
    { name: 'Agronomy', score: p1_score, max: 30 },
    { name: 'CSA', score: p2_score, max: 30 },
    { name: 'Advisory', score: p3_score, max: 20 },
    { name: 'Discipline', score: p4_score, max: 20 },
  ].sort((a, b) => (a.score / a.max) - (b.score / b.max));
  return `${farmerName}'s Farm Risk Index of ${total_score} places them in the ${zone} zone (${zoneRisk(total_score)}). The ${weakest[0].name} and ${weakest[1].name} pillars have the most room for improvement. Targeted advisory support in these areas will help advance their score and unlock more programme benefits.`;
}

const IMPROVE_TIPS: Record<string, string> = {
  p1: 'Apply recommended inputs and record planting/weeding activities on time.',
  p2: 'Record soil moisture readings and practice one CSA technique this week.',
  p3: 'Request an agent visit or complete a training session to boost advisory pillar.',
  p4: 'Submit check-in by Thursday to maintain Discipline score.',
};
const PILLAR_KEYS = ['p1', 'p2', 'p3', 'p4'] as const;

function topTwoImprovements(latest: ScoreRow | null) {
  if (!latest) return [];
  const pillars = [
    { key: 'p1', score: latest.p1_score, max: 30 },
    { key: 'p2', score: latest.p2_score, max: 30 },
    { key: 'p3', score: latest.p3_score, max: 20 },
    { key: 'p4', score: latest.p4_score, max: 20 },
  ];
  return pillars.sort((a, b) => (a.score / a.max) - (b.score / b.max)).slice(0, 2);
}

/* ── types ───────────────────────────────────────────────── */

interface ScoreRow {
  week_number: number;
  total_score: number;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p4_score: number;
  is_provisional: boolean;
  created_at?: string;
}

interface FarmerWithScore {
  id: string;
  full_name: string;
  phone: string;
  region: string | null;
  district: string | null;
  community: string | null;
  primary_crop: string | null;
  current_fri_score: number | null;
  is_verified: boolean;
  cohort_name: string | null;
  program_name: string | null;
  latest_score: number | null;
  latest_zone: string | null;
  latest_week: number | null;
  is_provisional: boolean;
}

interface GroupedFarmers {
  label: string;
  farmers: FarmerWithScore[];
}

/* ── main component ───────────────────────────────────────── */

interface Props {
  role: UserRole;
  organisationId?: string | null;
  agentUserId?: string | null;
}

export default function FarmerScoresView({ role, organisationId, agentUserId }: Props) {
  const { profile } = useAuthStore();
  const [farmers, setFarmers] = useState<FarmerWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('__all__');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerWithScore | null>(null);
  const [detailScores, setDetailScores] = useState<ScoreRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const orgId = organisationId ?? profile?.organisation_id ?? null;
  const aId = agentUserId ?? (role === 'agent' ? profile?.id : null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let farmerQuery = supabase.from('farmers').select(`
        id, full_name, phone, region, district, community,
        primary_crop, current_fri_score, is_verified
      `);

      if (role === 'agent' && aId) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('farmer_id')
          .eq('agent_id', aId)
          .eq('status', 'active');
        const farmerIds = (enrollments ?? []).map((e: any) => e.farmer_id);
        if (farmerIds.length === 0) { setFarmers([]); setLoading(false); return; }
        farmerQuery = farmerQuery.in('id', farmerIds);
      } else if (orgId && role !== 'super_admin') {
        farmerQuery = farmerQuery.eq('organisation_id', orgId);
      }

      const { data: farmerRows } = await farmerQuery.limit(500) as any;
      if (!farmerRows || farmerRows.length === 0) { setFarmers([]); setLoading(false); return; }

      const farmerIds = farmerRows.map((f: any) => f.id);

      const [enrollRes, scoresRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('farmer_id, status, cohort:cohorts(name), program:programs(name)')
          .in('farmer_id', farmerIds)
          .eq('status', 'active') as any,
        supabase
          .from('farmer_fri_scores')
          .select('farmer_id, week_number, total_score, p1_score, p2_score, p3_score, p4_score, is_provisional, zone')
          .in('farmer_id', farmerIds.slice(0, 500))
          .order('week_number', { ascending: false }) as any,
      ]);

      const enrollMap: Record<string, { cohort: string | null; program: string | null }> = {};
      (enrollRes.data ?? []).forEach((e: any) => {
        enrollMap[e.farmer_id] = {
          cohort: e.cohort?.name ?? null,
          program: e.program?.name ?? null,
        };
      });

      const latestByFarmer: Record<string, any> = {};
      (scoresRes.data ?? []).forEach((s: any) => {
        if (!latestByFarmer[s.farmer_id] || s.week_number > latestByFarmer[s.farmer_id].week_number) {
          latestByFarmer[s.farmer_id] = s;
        }
      });

      const enriched: FarmerWithScore[] = farmerRows.map((f: any) => {
        const latest = latestByFarmer[f.id];
        return {
          id: f.id,
          full_name: f.full_name,
          phone: f.phone,
          region: f.region,
          district: f.district,
          community: f.community,
          primary_crop: f.primary_crop,
          current_fri_score: f.current_fri_score,
          is_verified: f.is_verified,
          cohort_name: enrollMap[f.id]?.cohort ?? null,
          program_name: enrollMap[f.id]?.program ?? null,
          latest_score: latest ? Number(latest.total_score) : null,
          latest_zone: latest?.zone ?? null,
          latest_week: latest ? Number(latest.week_number) : null,
          is_provisional: latest?.is_provisional ?? false,
        };
      });

      setFarmers(enriched);
    } catch (err) {
      console.error('FarmerScoresView load error', err);
    } finally {
      setLoading(false);
    }
  }, [role, orgId, aId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return farmers.filter(f => {
      if (search && !f.full_name.toLowerCase().includes(search.toLowerCase()) &&
          !f.phone.includes(search)) return false;
      if (zoneFilter !== '__all__') {
        const z = zoneLabel(f.latest_score);
        if (z !== zoneFilter) return false;
      }
      return true;
    });
  }, [farmers, search, zoneFilter]);

  const grouped = useMemo<GroupedFarmers[]>(() => {
    const map: Record<string, FarmerWithScore[]> = {};
    filtered.forEach(f => {
      const key = f.cohort_name ?? f.program_name ?? 'Unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(f);
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, farmers]) => ({
        label,
        farmers: farmers.sort((a, b) => (a.full_name).localeCompare(b.full_name)),
      }));
  }, [filtered]);

  const zoneCounts = useMemo(() => {
    const c: Record<string, number> = { Leader: 0, Builder: 0, Learner: 0, Starter: 0, 'Not Assessed': 0 };
    farmers.forEach(f => { c[zoneLabel(f.latest_score)]++; });
    return c;
  }, [farmers]);

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  }

  async function openFarmerDetail(farmer: FarmerWithScore) {
    setSelectedFarmer(farmer);
    setDetailLoading(true);
    try {
      const { data } = await supabase
        .from('farmer_fri_scores')
        .select('week_number, total_score, p1_score, p2_score, p3_score, p4_score, is_provisional, created_at')
        .eq('farmer_id', farmer.id)
        .order('week_number', { ascending: true });
      setDetailScores((data as ScoreRow[]) ?? []);
    } catch {
      setDetailScores([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const detailLatest = detailScores[detailScores.length - 1] ?? null;
  const detailChart = detailScores.map(r => ({ week: r.week_number === 0 ? 'Base' : `W${r.week_number}`, score: r.total_score }));
  const detailTop2 = topTwoImprovements(detailLatest);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-cropguard-forest" />
          Farmer Scores
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Browse FRI scores across all farmers, grouped by cohort. Tap a farmer to see their arc gauge score card.
        </p>
      </div>

      {/* Zone summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', count: farmers.length, color: 'bg-gray-50 text-gray-700 border-gray-200' },
          { label: 'Leader', count: zoneCounts['Leader'], color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Builder', count: zoneCounts['Builder'], color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Learner', count: zoneCounts['Learner'], color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Starter', count: zoneCounts['Starter'], color: 'bg-red-50 text-red-700 border-red-200' },
        ].map(({ label, count, color }) => (
          <div key={label} className={cn('rounded-xl border p-3', color)}>
            <p className="text-2xl font-bold tabular-nums">{loading ? '–' : count}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cropguard-forest/20 focus:border-cropguard-forest"
          />
        </div>
        <select
          value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cropguard-forest/20 focus:border-cropguard-forest"
        >
          <option value="__all__">All Zones</option>
          <option value="Leader">Leader (≥80)</option>
          <option value="Builder">Builder (60-79)</option>
          <option value="Learner">Learner (40-59)</option>
          <option value="Starter">Starter (&lt;40)</option>
        </select>
      </div>

      {/* Farmer list grouped by cohort */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {farmers.length === 0 ? 'No farmers available for your scope.' : 'No farmers match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => {
            const isCollapsed = collapsedGroups[group.label];
            return (
              <div key={group.label} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed
                      ? <ChevronRight className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    <span className="font-semibold text-gray-900 text-sm">{group.label}</span>
                    <span className="text-xs text-gray-400">({group.farmers.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {group.farmers.slice(0, 10).map(f => (
                      <div key={f.id} className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: zoneColor(f.latest_score) }} />
                    ))}
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-gray-50">
                    {group.farmers.map(f => (
                      <button
                        key={f.id}
                        onClick={() => openFarmerDetail(f)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: zoneColor(f.latest_score) }}>
                            {f.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{f.full_name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {f.cohort_name ?? 'No cohort'} · {f.community ?? f.district ?? '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {f.is_provisional && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Prov.
                            </span>
                          )}
                          <span className="text-sm font-bold tabular-nums"
                            style={{ color: zoneColor(f.latest_score) }}>
                            {f.latest_score ?? '–'}
                          </span>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            ZONE_BADGE[zoneLabel(f.latest_score)] ?? 'bg-gray-100 text-gray-500')}>
                            {zoneLabel(f.latest_score)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Farmer detail drawer */}
      <Drawer
        open={!!selectedFarmer}
        onClose={() => setSelectedFarmer(null)}
        title={selectedFarmer?.full_name ?? ''}
        subtitle={selectedFarmer ? `${selectedFarmer.cohort_name ?? 'No cohort'} · ${selectedFarmer.primary_crop ?? '—'}` : ''}
        loading={detailLoading}
        width="max-w-lg"
      >
        {selectedFarmer && !detailLoading && (
          <div className="space-y-5">
            {/* Arc gauge card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <FRIArc score={detailLatest?.total_score ?? selectedFarmer.latest_score} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      ZONE_BADGE[zoneLabel(detailLatest?.total_score ?? selectedFarmer.latest_score)] ?? 'bg-gray-100 text-gray-500')}>
                      {zoneFull(detailLatest?.total_score ?? selectedFarmer.latest_score)}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500">
                      {zoneRisk(detailLatest?.total_score ?? selectedFarmer.latest_score)}
                    </span>
                  </div>
                  {detailLatest && (
                    <span className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full',
                      detailLatest.is_provisional ? 'bg-amber-100 text-amber-700' : 'bg-cropguard-mint text-cropguard-dark')}>
                      {detailLatest.is_provisional ? 'Provisional' : 'Verified'}
                    </span>
                  )}
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {detailLatest
                      ? `${detailLatest.week_number === 0 ? 'Baseline assessment' : `Week ${detailLatest.week_number} result`}. ${detailLatest.is_provisional ? 'Agent verification pending.' : 'Verified by agent.'}`
                      : 'No check-in data yet.'}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed italic border-l-2 border-gray-200 pl-2">
                    {zoneSubtitle(detailLatest?.total_score ?? selectedFarmer.latest_score)}
                  </p>
                </div>
              </div>
            </div>

            {/* Farmer info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {selectedFarmer.community ?? '—'}, {selectedFarmer.district ?? '—'}, {selectedFarmer.region ?? '—'}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {selectedFarmer.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Leaf className="w-3.5 h-3.5 text-gray-400" />
                Primary crop: <span className="font-medium capitalize">{selectedFarmer.primary_crop ?? '—'}</span>
              </div>
              {detailLatest?.created_at && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Award className="w-3.5 h-3.5 text-gray-400" />
                  Last assessed: <span className="font-medium">{new Date(detailLatest.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Pillar breakdown */}
            {detailLatest && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pillar Breakdown</p>
                <PillarBar label="P1 — Agronomy" score={detailLatest.p1_score} max={30} color="#1A3D2B" />
                <PillarBar label="P2 — CSA" score={detailLatest.p2_score} max={30} color="#3D7A56" />
                <PillarBar label="P3 — Advisory" score={detailLatest.p3_score} max={20} color="#E8963A" />
                <PillarBar label="P4 — Discipline" score={detailLatest.p4_score} max={20} color="#2563EB" />
              </div>
            )}

            {/* Score trend */}
            {detailChart.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Score Trend</p>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={detailChart} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="score" stroke="#3D7A56" strokeWidth={2}
                      dot={{ r: 3, fill: '#3D7A56', strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: '#1A3D2B' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Weekly history */}
            {detailScores.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Weekly History</p>
                <div className="flex gap-2 flex-wrap">
                  {detailScores.map(r => (
                    <WeekStatusChip key={r.week_number} week={r.week_number} score={r.total_score} isProvisional={r.is_provisional} />
                  ))}
                </div>
                <p className="text-[9px] text-gray-400 mt-2">P = Provisional · V = Verified</p>
              </div>
            )}

            {/* Norvi interpretation */}
            <div className="flex gap-3 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
              <div className="w-8 h-8 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Leaf className="w-4 h-4 text-cropguard-light" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-cropguard-dark uppercase tracking-wider mb-0.5">Norvi AI</p>
                <p className="text-xs text-cropguard-forest leading-relaxed">
                  {buildInterpretation(detailLatest, selectedFarmer.full_name)}
                </p>
              </div>
            </div>

            {/* What to improve */}
            {detailTop2.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What to Improve</p>
                {detailTop2.map(({ key }) => (
                  <div key={key} className="flex gap-2.5 items-start p-3 bg-gray-50 rounded-xl">
                    <div className="w-5 h-5 rounded-full bg-cropguard-dark flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{IMPROVE_TIPS[key as typeof PILLAR_KEYS[number]]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* No data state */}
            {!detailLatest && (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">This farmer has not completed any check-ins yet.</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
