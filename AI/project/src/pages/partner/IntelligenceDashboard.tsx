import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2, Download, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Shield, Users, RefreshCw, X, ChevronDown,
  CheckCircle2, XCircle, Clock, ArrowUp, ArrowDown, Search,
  BarChart2, FileText, Zap, ChevronRight, MapPin, UserCheck,
  Package, Star, BookOpen, Brain, Info, Filter, SortAsc, SortDesc,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { NorviOutput } from '@/components/NorviOutput';

// ── Constants ─────────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  'bg-purple-600 text-white',
  'Resilience Builder': 'bg-green-600 text-white',
  'Resilience Learner': 'bg-yellow-500 text-white',
  'Resilience Starter': 'bg-red-500 text-white',
};

const ZONE_BG: Record<string, string> = {
  'Resilience Leader':  'bg-purple-50 border-purple-200',
  'Resilience Builder': 'bg-green-50 border-green-200',
  'Resilience Learner': 'bg-yellow-50 border-yellow-200',
  'Resilience Starter': 'bg-red-50 border-red-200',
};

const ZONE_HEX: Record<string, string> = {
  'Resilience Leader':  '#7C3AED',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#ca8a04',
  'Resilience Starter': '#dc2626',
};

const ZONE_RISK: Record<string, string> = {
  'Resilience Leader':  'Low Risk',
  'Resilience Builder': 'Managed Risk',
  'Resilience Learner': 'Elevated Risk',
  'Resilience Starter': 'Critical Risk',
};

const INTERVENTION_TYPE_COLORS: Record<string, string> = {
  'Input Loan':     'bg-blue-100 text-blue-800',
  'Grant':          'bg-green-100 text-green-800',
  'Insurance':      'bg-purple-100 text-purple-800',
  'Market Linkage': 'bg-amber-100 text-amber-800',
  'Advisory':       'bg-teal-100 text-teal-800',
  'Training':       'bg-sky-100 text-sky-800',
  'Recovery':       'bg-red-100 text-red-800',
};

const TRAJECTORY_CONFIG: Record<string, { label: string; color: string; bg: string; hex: string }> = {
  Improving:    { label: 'Improving',   color: 'text-emerald-700', bg: 'bg-emerald-100', hex: '#16a34a' },
  Stable:       { label: 'Stable',      color: 'text-blue-700',    bg: 'bg-blue-100',    hex: '#2563eb' },
  Declining:    { label: 'Declining',   color: 'text-amber-700',   bg: 'bg-amber-100',   hex: '#d97706' },
  'At Risk':    { label: 'At Risk',     color: 'text-red-700',     bg: 'bg-red-100',     hex: '#dc2626' },
  'No Baseline':{ label: 'No Baseline', color: 'text-gray-500',    bg: 'bg-gray-100',    hex: '#9ca3af' },
};

const RECOMMENDATION_CONFIG: Record<string, { label: string; color: string }> = {
  Approve:  { label: 'Approve',  color: 'bg-green-100 text-green-800' },
  Review:   { label: 'Review',   color: 'bg-amber-100 text-amber-800' },
  Defer:    { label: 'Defer',    color: 'bg-orange-100 text-orange-800' },
  Decline:  { label: 'Decline',  color: 'bg-red-100 text-red-800' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortfolioFarmer {
  farmer_id:         string;
  full_name:         string;
  phone:             string;
  community:         string | null;
  district:          string | null;
  region_code:       string;
  primary_crop:      string;
  total_farm_size_ha:number;
  is_verified:       boolean;
  asinyo_id:         string;
  gender:            string | null;
  program_id:        string;
  program_name:      string;
  cohort_id:         string | null;
  cohort_name:       string | null;
  enrollment_id:     string;
  enrollment_status: string;
  enrolled_at:       string;
  latest_score_id:   string | null;
  total_score:       number;
  p1_score:          number;
  p2_score:          number;
  p3_score:          number;
  p4_score:          number;
  eci_score:         number;
  credit_score:      number | null;
  zone:              string | null;
  score_status:      string | null;
  is_provisional:    boolean;
  season_average:    number | null;
  week_number:       number;
  baseline_score:    number | null;
  baseline_zone:     string | null;
  active_flag_count: number;
  high_flag_count:   number;
  weeks_final:       number;
  weeks_provisional: number;
  trajectory?:       string;
  recommendation?:   string;
}

interface PortfolioProgram { id: string; name: string; count: number; }
interface PortfolioCohort  { id: string; name: string; program_id: string; }

type TabKey = 'overview' | 'farmers' | 'detail' | 'opportunities' | 'analytics' | 'collection';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTrajectory(f: PortfolioFarmer): string {
  if (f.baseline_score === null) return 'No Baseline';
  if (f.zone === 'Resilience Starter' || f.total_score <= f.baseline_score - 15) return 'At Risk';
  if (f.total_score >= f.baseline_score + 5) return 'Improving';
  if (f.total_score <= f.baseline_score - 5) return 'Declining';
  return 'Stable';
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'Approve';
  if (score >= 60) return 'Approve';
  if (score >= 40) return 'Review';
  if (score >= 20) return 'Defer';
  return 'Decline';
}

function getRecommendationFull(score: number): string {
  if (score >= 80) return 'Approve — Premium Tier';
  if (score >= 60) return 'Approve — Standard';
  if (score >= 40) return 'Conditional — Review P4';
  if (score >= 20) return 'Defer — Requires Improvement';
  return 'Decline — High Risk';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function exportPortfolioCSV(farmers: PortfolioFarmer[], programName: string) {
  const headers = [
    'asinyo_id','full_name','community','district','program','cohort',
    'fri_total','fri_zone','fri_label','credit_score','risk_band','recommendation',
    'fri_status','eci_score','p1_score','p2_score','p3_score','p4_score',
    'baseline_fri','trajectory','weeks_complete','weeks_final','export_timestamp',
  ];
  const rows = farmers.map(f => [
    f.asinyo_id, f.full_name, f.community ?? '', f.district ?? '',
    f.program_name, f.cohort_name ?? '',
    f.total_score, f.zone ?? '', ZONE_RISK[f.zone ?? ''] ?? '',
    f.credit_score ?? '', f.zone ? ZONE_RISK[f.zone] ?? '' : '',
    getRecommendationFull(f.total_score),
    f.is_provisional ? 'Provisional' : 'Final',
    f.eci_score, f.p1_score, f.p2_score, f.p3_score, f.p4_score,
    f.baseline_score ?? '', f.trajectory ?? '',
    f.weeks_final + f.weeks_provisional, f.weeks_final,
    new Date().toISOString(),
  ]);
  const date   = new Date().toISOString().slice(0, 10);
  const slug   = programName.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  const csv    = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob   = new Blob([csv], { type: 'text/csv' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `cropguard_fri_${slug}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TrajectoryBadge({ trajectory }: { trajectory: string }) {
  const cfg = TRAJECTORY_CONFIG[trajectory] ?? TRAJECTORY_CONFIG.Stable;
  const Icon = trajectory === 'Improving' ? TrendingUp
             : trajectory === 'Declining' || trajectory === 'At Risk' ? TrendingDown
             : Minus;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function ZoneBadge({ zone, size = 'sm' }: { zone: string; size?: 'sm' | 'xs' }) {
  const cls = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span className={cn('inline-flex items-center font-semibold rounded-full', cls, ZONE_COLORS[zone] ?? 'bg-gray-100 text-gray-600')}>
      {zone.replace('Resilience ', '')} · {ZONE_RISK[zone] ?? ''}
    </span>
  );
}

function RecommendationBadge({ score }: { score: number }) {
  const rec = getRecommendation(score);
  const cfg = RECOMMENDATION_CONFIG[rec];
  return <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{getRecommendationFull(score)}</span>;
}

function ScorePill({ label, provisional }: { label?: string; provisional: boolean }) {
  return provisional ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock className="w-2.5 h-2.5" /> Provisional
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="w-2.5 h-2.5" /> Final{label ? ` · ${label}` : ''}
    </span>
  );
}

function KPICard({
  icon: Icon, label, value, sub, iconBg, iconColor, valueColor,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', iconBg)}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <p className={cn('text-2xl font-bold leading-none', valueColor ?? 'text-cropguard-forest')}>{value}</p>
      <p className="text-xs text-cropguard-slate mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function PillarBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="font-bold text-cropguard-dark tabular-nums">{score}/{max}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IntelligenceDashboard() {
  const profile = useAuthStore(s => s.profile);

  // Global data
  const [farmers,  setFarmers]  = useState<PortfolioFarmer[]>([]);
  const [programs, setPrograms] = useState<PortfolioProgram[]>([]);
  const [cohorts,  setCohorts]  = useState<PortfolioCohort[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // Filters
  const [filterProgram, setFilterProgram] = useState('__all__');
  const [filterCohort,  setFilterCohort]  = useState('__all__');

  // Active tab & farmer detail
  const [tab,            setTab]           = useState<TabKey>('overview');
  const [selectedFarmer, setSelectedFarmer]= useState<PortfolioFarmer | null>(null);
  const [detailScores,   setDetailScores]  = useState<any[]>([]);
  const [detailFlags,    setDetailFlags]   = useState<any[]>([]);
  const [detailLoading,  setDetailLoading] = useState(false);
  const [selectedWeek,   setSelectedWeek]  = useState<number | 'current' | 'baseline'>('current');
  const [interventions,  setInterventions] = useState<any[]>([]);
  const [eligibility,    setEligibility]   = useState<Record<string, any>>({});

  // List tab state
  const [search,       setSearch]       = useState('');
  const [filterZone,   setFilterZone]   = useState('__all__');
  const [filterTraj,   setFilterTraj]   = useState('__all__');
  const [filterRec,    setFilterRec]    = useState('__all__');
  const [filterStatus, setFilterStatus] = useState('__all__');
  const [flagOnly,     setFlagOnly]     = useState(false);
  const [sortCol,      setSortCol]      = useState<string>('recommendation');
  const [sortDir,      setSortDir]      = useState<'asc'|'desc'>('asc');
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 25;

  // Analytics
  const [analyticsData, setAnalyticsData] = useState<{
    trend: any[]; migration: any[]; uptake: any[]; agentQuality: any[]; geoRisk: any[];
  }>({ trend: [], migration: [], uptake: [], agentQuality: [], geoRisk: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Load portfolio farmers ─────────────────────────────────────────────────

  const loadFarmers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: raw } = await (supabase.rpc as any)('get_portfolio_farmers', {
      p_program_id: filterProgram === '__all__' ? null : filterProgram,
      p_cohort_id:  filterCohort  === '__all__' ? null : filterCohort,
    });

    const enriched: PortfolioFarmer[] = (raw ?? []).map((f: PortfolioFarmer) => ({
      ...f,
      trajectory:     getTrajectory(f),
      recommendation: getRecommendation(f.total_score),
    }));

    setFarmers(enriched);
    setLastUpdated(new Date().toISOString());

    // Build program + cohort lists
    const progMap: Record<string, { name: string; count: number }> = {};
    const cohortSet: Record<string, PortfolioCohort> = {};
    enriched.forEach(f => {
      if (!progMap[f.program_id]) progMap[f.program_id] = { name: f.program_name, count: 0 };
      progMap[f.program_id].count++;
      if (f.cohort_id && !cohortSet[f.cohort_id]) {
        cohortSet[f.cohort_id] = { id: f.cohort_id, name: f.cohort_name ?? f.cohort_id, program_id: f.program_id };
      }
    });
    setPrograms(Object.entries(progMap).map(([id, v]) => ({ id, name: v.name, count: v.count })));
    setCohorts(Object.values(cohortSet));
    setLoading(false);
  }, [profile, filterProgram, filterCohort]);

  useEffect(() => { loadFarmers(); }, [loadFarmers]);

  // ── Load analytics data ────────────────────────────────────────────────────

  const loadAnalytics = useCallback(async () => {
    if (!profile) return;
    setAnalyticsLoading(true);
    const pId = filterProgram === '__all__' ? null : filterProgram;
    const cId = filterCohort  === '__all__' ? null : filterCohort;

    const [trend, migration, uptake, agentQuality, geoRisk] = await Promise.all([
      (supabase.rpc as any)('get_cohort_fri_trend', { p_cohort_id: cId, p_program_id: pId }),
      (supabase.rpc as any)('get_zone_migration', { p_program_id: pId, p_cohort_id: cId }),
      (supabase.rpc as any)('get_intervention_uptake', { p_program_id: pId }),
      (supabase.rpc as any)('get_agent_verification_quality', { p_program_id: pId }),
      (supabase.rpc as any)('get_risk_by_geography', { p_program_id: pId }),
    ]);

    setAnalyticsData({
      trend:        trend.data   ?? [],
      migration:    migration.data ?? [],
      uptake:       uptake.data  ?? [],
      agentQuality: agentQuality.data ?? [],
      geoRisk:      geoRisk.data ?? [],
    });
    setAnalyticsLoading(false);
  }, [profile, filterProgram, filterCohort]);

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadAnalytics]);

  // ── Load farmer detail ─────────────────────────────────────────────────────

  const loadFarmerDetail = useCallback(async (f: PortfolioFarmer) => {
    if (!f) return;
    setDetailLoading(true);
    setSelectedWeek('current');

    const [{ data: scores }, { data: flags }, { data: intv }] = await Promise.all([
      (supabase.from('farmer_fri_scores') as any)
        .select('*')
        .eq('farmer_id', f.farmer_id)
        .order('week_number'),
      (supabase.from('risk_flags') as any)
        .select('*')
        .eq('farmer_id', f.farmer_id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false }),
      (supabase.from('interventions_catalog') as any)
        .select('*')
        .eq('program_id', f.program_id),
    ]);

    setDetailScores(scores ?? []);
    setDetailFlags(flags ?? []);
    setInterventions(intv ?? []);

    // Load eligibility for each intervention
    const eligMap: Record<string, any> = {};
    for (const iv of (intv ?? [])) {
      const eligible = f.total_score >= iv.min_fri;
      const gap = Math.max(0, iv.min_fri - f.total_score);
      const rules: any[] = Array.isArray(iv.eligibility_rules) ? iv.eligibility_rules : [];
      eligMap[iv.id] = { eligible, gap, rules };
    }
    setEligibility(eligMap);
    setDetailLoading(false);
  }, []);

  const openFarmerDetail = useCallback((f: PortfolioFarmer) => {
    setSelectedFarmer(f);
    loadFarmerDetail(f);
    setTab('detail');
  }, [loadFarmerDetail]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const kpiFinal       = farmers.filter(f => !f.is_provisional && f.zone).length;
  const kpiProvisional = farmers.filter(f =>  f.is_provisional && f.zone).length;
  const avgFRI         = farmers.filter(f => f.zone).length > 0
    ? Math.round(farmers.filter(f => f.zone).reduce((s, f) => s + f.total_score, 0) / farmers.filter(f => f.zone).length)
    : 0;
  const verRate = useMemo(() => {
    const tf = farmers.reduce((s, f) => s + f.weeks_final + f.weeks_provisional, 0);
    const vf = farmers.reduce((s, f) => s + f.weeks_final, 0);
    return tf > 0 ? Math.round((vf / tf) * 100) : 0;
  }, [farmers]);
  const oppReady = farmers.filter(f => f.credit_score !== null && f.credit_score >= 500).length;

  const zoneDistribution = ['Resilience Leader','Resilience Builder','Resilience Learner','Resilience Starter'].map(zone => ({
    zone,
    count: farmers.filter(f => f.zone === zone).length,
    pct:   farmers.length > 0 ? Math.round(farmers.filter(f => f.zone === zone).length / farmers.length * 100) : 0,
    avgFRI: (() => {
      const inZone = farmers.filter(f => f.zone === zone);
      return inZone.length > 0 ? Math.round(inZone.reduce((s, f) => s + f.total_score, 0) / inZone.length) : 0;
    })(),
  }));

  const trajectoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    farmers.forEach(f => {
      const t = f.trajectory ?? 'No Baseline';
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts).map(([traj, count]) => ({ traj, count }));
  }, [farmers]);

  const riskAlerts = useMemo(() => {
    const counts: Record<string, number> = {};
    farmers.forEach(f => {
      if (f.high_flag_count > 0) counts.high = (counts.high ?? 0) + f.high_flag_count;
      if (f.active_flag_count > f.high_flag_count) counts.medium = (counts.medium ?? 0) + (f.active_flag_count - f.high_flag_count);
    });
    return counts;
  }, [farmers]);

  const availableCohorts = filterProgram === '__all__' ? cohorts : cohorts.filter(c => c.program_id === filterProgram);

  // ── Filtered + sorted farmer list ─────────────────────────────────────────

  const REC_SORT = { Decline: 1, Defer: 2, Review: 3, Approve: 4 } as Record<string, number>;

  const filteredFarmers = useMemo(() => {
    let list = farmers.filter(f => {
      if (search) {
        const q = search.toLowerCase();
        if (!f.full_name.toLowerCase().includes(q) && !f.asinyo_id.toLowerCase().includes(q)) return false;
      }
      if (filterZone   !== '__all__' && f.zone         !== filterZone)          return false;
      if (filterTraj   !== '__all__' && f.trajectory   !== filterTraj)          return false;
      if (filterRec    !== '__all__' && f.recommendation !== filterRec)         return false;
      if (filterStatus !== '__all__' && (filterStatus === 'Final' ? f.is_provisional : !f.is_provisional)) return false;
      if (flagOnly && f.active_flag_count === 0) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortCol === 'recommendation') {
        av = REC_SORT[a.recommendation ?? 'Approve'] ?? 5;
        bv = REC_SORT[b.recommendation ?? 'Approve'] ?? 5;
      } else if (sortCol === 'fri') {
        av = a.total_score; bv = b.total_score;
      } else if (sortCol === 'credit') {
        av = a.credit_score ?? 0; bv = b.credit_score ?? 0;
      } else if (sortCol === 'name') {
        av = a.full_name; bv = b.full_name;
      } else {
        av = 0; bv = 0;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [farmers, search, filterZone, filterTraj, filterRec, filterStatus, flagOnly, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredFarmers.length / PAGE_SIZE);
  const pageFarmers = filteredFarmers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  // ── Detail view helpers ────────────────────────────────────────────────────

  const activeDetailScore = useMemo(() => {
    if (!selectedFarmer) return null;
    if (selectedWeek === 'baseline') return detailScores.find(s => s.week_number === 0) ?? null;
    if (selectedWeek === 'current')  return detailScores.filter(s => s.week_number > 0).sort((a, b) => b.week_number - a.week_number)[0] ?? null;
    return detailScores.find(s => s.week_number === selectedWeek) ?? null;
  }, [selectedFarmer, detailScores, selectedWeek]);

  const weeksWithScores = useMemo(() => detailScores.filter(s => s.week_number > 0).sort((a, b) => a.week_number - b.week_number), [detailScores]);
  const baselineScore   = useMemo(() => detailScores.find(s => s.week_number === 0), [detailScores]);

  // ── Migration matrix helper ────────────────────────────────────────────────

  const ZONES_ORDER = ['Resilience Leader','Resilience Builder','Resilience Learner','Resilience Starter'];
  const migrationMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    ZONES_ORDER.forEach(f => { m[f] = {}; ZONES_ORDER.forEach(t => { m[f][t] = 0; }); });
    analyticsData.migration.forEach((r: any) => {
      if (m[r.from_zone] && r.to_zone in m[r.from_zone]) {
        m[r.from_zone][r.to_zone] = r.farmer_count;
      }
    });
    return m;
  }, [analyticsData.migration]);

  // ── Tab nav ────────────────────────────────────────────────────────────────

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview',     label: 'Portfolio Overview', icon: BarChart2 },
    { key: 'farmers',      label: 'Farmer Intelligence', icon: Users },
    { key: 'detail',       label: 'Farmer Detail',       icon: FileText },
    { key: 'opportunities',label: 'Opportunities',       icon: Zap },
    { key: 'analytics',    label: 'Portfolio Analytics', icon: TrendingUp },
    { key: 'collection',   label: 'Managed Collection',  icon: Package },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-cropguard-forest tracking-tight">CropGuard Intelligence Dashboard</h1>
            <p className="text-xs text-cropguard-slate mt-0.5">
              Read-only · {farmers.length} farmers · {lastUpdated ? `Updated ${fmtDate(lastUpdated)}` : 'Loading...'}
              {(kpiFinal + kpiProvisional) > 0 && ` · ${kpiFinal} Final, ${kpiProvisional} Provisional scores`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Program filter */}
            <Select value={filterProgram} onValueChange={v => { setFilterProgram(v); setFilterCohort('__all__'); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Cohort filter */}
            <Select value={filterCohort} onValueChange={v => { setFilterCohort(v); setPage(1); }} disabled={availableCohorts.length === 0}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="All Cohorts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Cohorts</SelectItem>
                {availableCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportPortfolioCSV(filteredFarmers, programs.find(p => p.id === filterProgram)?.name ?? 'portfolio')}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={loadFarmers}>
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Risk alerts */}
        {Object.keys(riskAlerts).length > 0 && (
          <div className="flex items-center gap-2 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex-wrap">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs font-medium text-red-700">Risk Concentration Alerts:</span>
            {riskAlerts.high > 0 && <Badge className="text-[10px] border-0 bg-red-200 text-red-800">{riskAlerts.high} high severity</Badge>}
            {riskAlerts.medium > 0 && <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">{riskAlerts.medium} medium severity</Badge>}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-0 mt-4 border-b -mb-px overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); if (key !== 'detail' && key !== 'opportunities') setSelectedFarmer(null); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0',
                tab === key
                  ? 'border-cropguard-green text-cropguard-forest'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {key === 'detail' && !selectedFarmer && <span className="text-[10px] text-gray-300 ml-1">— select a farmer</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── TAB: Portfolio Overview ─────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard icon={Users}     label="Total Enrolled"    value={farmers.length}     sub={`${kpiFinal} Final · ${kpiProvisional} Provisional`}     iconBg="bg-slate-100"   iconColor="text-slate-600" />
              <KPICard icon={TrendingUp} label="Average FRI Score" value={avgFRI}            sub={farmers.filter(f => f.zone).length > 0 ? (farmers.filter(f => f.zone)[0]?.zone ?? '') : '—'} iconBg={avgFRI >= 60 ? 'bg-green-100' : avgFRI >= 40 ? 'bg-amber-100' : 'bg-red-100'} iconColor={avgFRI >= 60 ? 'text-green-600' : avgFRI >= 40 ? 'text-amber-600' : 'text-red-600'} valueColor={avgFRI >= 60 ? 'text-green-700' : avgFRI >= 40 ? 'text-amber-700' : 'text-red-700'} />
              <KPICard icon={CheckCircle2} label="Verification Rate" value={`${verRate}%`}  sub="Submitted check-ins verified" iconBg={verRate >= 80 ? 'bg-green-100' : verRate >= 60 ? 'bg-amber-100' : 'bg-red-100'} iconColor={verRate >= 80 ? 'text-green-600' : verRate >= 60 ? 'text-amber-600' : 'text-red-600'} valueColor={verRate >= 80 ? 'text-green-700' : verRate >= 60 ? 'text-amber-700' : 'text-red-700'} />
              <KPICard icon={Zap}       label="Opportunity Ready" value={oppReady}           sub={`${farmers.length > 0 ? Math.round(oppReady / farmers.length * 100) : 0}% of portfolio`}  iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            </div>

            {/* Zone + Trajectory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Zone distribution */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <p className="text-sm font-semibold text-cropguard-forest mb-4">Zone Distribution</p>
                {loading ? (
                  <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8" />)}</div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {zoneDistribution.map(({ zone, count, pct, avgFRI: az }) => (
                        <button
                          key={zone}
                          onClick={() => { setFilterZone(zone); setTab('farmers'); }}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 group-hover:text-cropguard-forest transition-colors">{zone}</span>
                            <span className="text-gray-400">{count} · {pct}% · avg {az}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: ZONE_HEX[zone] }} />
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={zoneDistribution} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                          <XAxis dataKey="zone" tick={{ fontSize: 9 }} tickFormatter={v => v.replace('Resilience ', '')} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(v: any) => [v, 'Farmers']} labelFormatter={l => l} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {zoneDistribution.map(({ zone }) => <Cell key={zone} fill={ZONE_HEX[zone]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {/* Trajectory distribution */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <p className="text-sm font-semibold text-cropguard-forest mb-4">Trajectory Distribution</p>
                {loading ? (
                  <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      {Object.entries(TRAJECTORY_CONFIG).map(([key, cfg]) => {
                        const entry = trajectoryDistribution.find(t => t.traj === key);
                        const count = entry?.count ?? 0;
                        const pct   = farmers.length > 0 ? Math.round(count / farmers.length * 100) : 0;
                        const Icon  = key === 'Improving' ? TrendingUp : key === 'Declining' || key === 'At Risk' ? TrendingDown : Minus;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-28 shrink-0', cfg.bg, cfg.color)}>
                              <Icon className="w-2.5 h-2.5" /> {cfg.label}
                            </span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.hex }} />
                            </div>
                            <span className="text-xs text-gray-400 w-12 text-right shrink-0">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-3 border-t">
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie
                            data={trajectoryDistribution.filter(t => t.count > 0)}
                            dataKey="count" nameKey="traj"
                            cx="50%" cy="50%" innerRadius={30} outerRadius={55}
                          >
                            {trajectoryDistribution.filter(t => t.count > 0).map(t => (
                              <Cell key={t.traj} fill={TRAJECTORY_CONFIG[t.traj]?.hex ?? '#9ca3af'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any, n: string) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Active risk flags panel */}
            {farmers.some(f => f.active_flag_count > 0) && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50">
                  <p className="text-sm font-semibold text-cropguard-forest">Active Risk Flags</p>
                  <Badge className="text-[10px] border-0 bg-red-100 text-red-700">
                    {farmers.reduce((s, f) => s + f.active_flag_count, 0)} total
                  </Badge>
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {farmers.filter(f => f.active_flag_count > 0).map(f => (
                    <button
                      key={f.farmer_id}
                      onClick={() => openFarmerDetail(f)}
                      className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                        <p className="text-xs text-gray-400">{f.asinyo_id} · {f.district ?? f.region_code}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.high_flag_count > 0 && <Badge className="text-[10px] border-0 bg-red-100 text-red-700">{f.high_flag_count} high</Badge>}
                        {f.active_flag_count - f.high_flag_count > 0 && <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">{f.active_flag_count - f.high_flag_count} medium</Badge>}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Programs summary */}
            {programs.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <p className="text-sm font-semibold text-cropguard-forest mb-4">Assigned Programs</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {programs.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setFilterProgram(p.id); setFilterCohort('__all__'); setPage(1); }}
                      className={cn(
                        'rounded-lg border px-4 py-3 text-left transition-all hover:shadow-sm',
                        filterProgram === p.id ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'bg-gray-50 border-gray-200 hover:border-cropguard-mid'
                      )}
                    >
                      <p className={cn('text-sm font-semibold truncate', filterProgram === p.id ? 'text-white' : 'text-cropguard-forest')}>{p.name}</p>
                      <p className={cn('text-xs mt-0.5', filterProgram === p.id ? 'text-white/70' : 'text-gray-400')}>{p.count} enrolled farmers</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Farmer Intelligence List ────────────────────────────────── */}
        {tab === 'farmers' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search name or ID…"
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-cropguard-mid"
                  />
                </div>
                <Select value={filterZone} onValueChange={v => { setFilterZone(v); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Zones" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Zones</SelectItem>
                    {['Resilience Leader','Resilience Builder','Resilience Learner','Resilience Starter'].map(z => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterTraj} onValueChange={v => { setFilterTraj(v); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="All Trajectories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Trajectories</SelectItem>
                    {['Improving','Stable','Declining','At Risk','No Baseline'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterRec} onValueChange={v => { setFilterRec(v); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="All Recommendations" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Recommendations</SelectItem>
                    {['Approve','Review','Defer','Decline'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Score Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Final + Provisional</SelectItem>
                    <SelectItem value="Final">Final Only</SelectItem>
                    <SelectItem value="Provisional">Provisional Only</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={() => { setFlagOnly(v => !v); setPage(1); }}
                  className={cn('h-7 px-3 text-xs rounded-lg border font-medium transition-colors', flagOnly ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Flags Only
                </button>
                {(search || filterZone !== '__all__' || filterTraj !== '__all__' || filterRec !== '__all__' || filterStatus !== '__all__' || flagOnly) && (
                  <button className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1" onClick={() => { setSearch(''); setFilterZone('__all__'); setFilterTraj('__all__'); setFilterRec('__all__'); setFilterStatus('__all__'); setFlagOnly(false); setPage(1); }}>
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-gray-400">{filteredFarmers.length} farmers</span>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : filteredFarmers.length === 0 ? (
              <div className="text-center py-16 text-cropguard-slate">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-cropguard-forest">No farmers match the filters</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[2fr_1fr_1fr_2fr_1.5fr_1fr_1fr_80px] gap-0 px-4 py-2.5 bg-gray-50 border-b text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {[
                    { key: 'name', label: 'Farmer' },
                    { key: 'fri', label: 'FRI' },
                    { key: 'credit', label: 'Credit' },
                    { key: null, label: 'Zone' },
                    { key: null, label: 'Trajectory' },
                    { key: 'recommendation', label: 'Recommendation' },
                    { key: null, label: 'Status' },
                    { key: null, label: 'Flags' },
                  ].map((col, i) => (
                    <div
                      key={i}
                      className={cn('flex items-center gap-1', col.key && 'cursor-pointer hover:text-gray-600')}
                      onClick={() => col.key && toggleSort(col.key)}
                    >
                      {col.label}
                      {col.key && sortCol === col.key && (
                        sortDir === 'asc' ? <SortAsc className="w-2.5 h-2.5" /> : <SortDesc className="w-2.5 h-2.5" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="divide-y">
                  {pageFarmers.map(f => (
                    <div
                      key={f.farmer_id}
                      onClick={() => openFarmerDetail(f)}
                      className={cn(
                        'grid grid-cols-[2fr_1fr_1fr_2fr_1.5fr_1fr_1fr_80px] gap-0 px-4 py-3 hover:bg-gray-50/70 cursor-pointer transition-colors items-center',
                        f.high_flag_count > 0 && 'bg-red-50/30'
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                        <p className="text-[11px] text-gray-400">{f.asinyo_id} · {f.community ?? f.district ?? f.region_code}</p>
                      </div>
                      <div>
                        {f.zone ? (
                          <p className="text-sm font-bold text-cropguard-dark tabular-nums">{f.total_score}</p>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-cropguard-dark">{f.credit_score ?? '—'}</p>
                      </div>
                      <div className="min-w-0">
                        {f.zone ? <ZoneBadge zone={f.zone} size="xs" /> : <span className="text-gray-300 text-xs">—</span>}
                      </div>
                      <div>
                        {f.trajectory && <TrajectoryBadge trajectory={f.trajectory} />}
                      </div>
                      <div className="min-w-0">
                        {f.zone && <RecommendationBadge score={f.total_score} />}
                      </div>
                      <div>
                        <ScorePill provisional={f.is_provisional} />
                      </div>
                      <div className="flex items-center gap-1">
                        {f.high_flag_count   > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">{f.high_flag_count}H</span>}
                        {(f.active_flag_count - f.high_flag_count) > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{f.active_flag_count - f.high_flag_count}M</span>}
                        {f.active_flag_count === 0 && <span className="text-gray-200 text-xs">—</span>}
                        <span className="text-[10px] text-gray-300 ml-1">{f.weeks_final + f.weeks_provisional}/12w</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                    <span className="text-xs text-gray-400">Page {page} of {totalPages} · {filteredFarmers.length} total</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Farmer Detail ──────────────────────────────────────────── */}
        {tab === 'detail' && (
          !selectedFarmer ? (
            <div className="text-center py-24 text-cropguard-slate">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-cropguard-forest text-lg">No farmer selected</p>
              <p className="text-sm mt-1">Select a farmer from the Farmer Intelligence tab.</p>
              <Button size="sm" className="mt-4" onClick={() => setTab('farmers')}>
                Go to Farmer Intelligence
              </Button>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl">
              {/* Farmer header */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-cropguard-mint flex items-center justify-center text-cropguard-dark font-bold text-lg shrink-0">
                      {selectedFarmer.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-cropguard-forest leading-tight">{selectedFarmer.full_name}</h2>
                      <p className="text-xs text-cropguard-slate">{selectedFarmer.asinyo_id}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedFarmer.community && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedFarmer.community}, {selectedFarmer.district}</span>}
                        {selectedFarmer.is_verified && <span className="text-[10px] text-emerald-700 flex items-center gap-1"><UserCheck className="w-3 h-3" />Verified</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { setTab('opportunities'); }}>
                      <Zap className="w-3.5 h-3.5" /> View Opportunities
                    </Button>
                    <button
                      onClick={() => setSelectedFarmer(null)}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t text-xs">
                  <div><span className="text-gray-400 block">Program</span><p className="font-medium mt-0.5 text-cropguard-forest truncate">{selectedFarmer.program_name}</p></div>
                  <div><span className="text-gray-400 block">Cohort</span><p className="font-medium mt-0.5 text-cropguard-forest">{selectedFarmer.cohort_name ?? '—'}</p></div>
                  <div><span className="text-gray-400 block">Crop</span><p className="font-medium mt-0.5 text-cropguard-forest capitalize">{selectedFarmer.primary_crop}</p></div>
                  <div><span className="text-gray-400 block">Farm Size</span><p className="font-medium mt-0.5 text-cropguard-forest">{selectedFarmer.total_farm_size_ha} ha</p></div>
                  <div><span className="text-gray-400 block">Gender</span><p className="font-medium mt-0.5 text-cropguard-forest capitalize">{selectedFarmer.gender ?? '—'}</p></div>
                  <div><span className="text-gray-400 block">Enrolled</span><p className="font-medium mt-0.5 text-cropguard-forest">{fmtDate(selectedFarmer.enrolled_at)}</p></div>
                </div>
              </div>

              {/* FRI View Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-500">FRI View:</span>
                {[
                  { key: 'current', label: 'Current Season' },
                  { key: 'baseline', label: 'Baseline' },
                  ...[1,2,3,4,5,6,7,8,9,10,11,12].filter(w => detailScores.some(s => s.week_number === w)).map(w => ({ key: w, label: `Week ${w}` })),
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedWeek(opt.key as any)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                      selectedWeek === opt.key
                        ? 'bg-cropguard-dark text-white border-cropguard-dark'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-cropguard-mid'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
              ) : (
                <>
                  {/* Score card */}
                  {activeDetailScore ? (
                    <div className={cn('rounded-xl border p-5 flex flex-col gap-4', ZONE_BG[activeDetailScore.zone] ?? 'bg-gray-50')}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {activeDetailScore.zone && <ZoneBadge zone={activeDetailScore.zone} />}
                            <ScorePill provisional={activeDetailScore.is_provisional} />
                          </div>
                          <p className="text-xs text-gray-600 mt-2">{getRecommendationFull(activeDetailScore.total_score)}</p>
                          {selectedFarmer.trajectory && <TrajectoryBadge trajectory={selectedFarmer.trajectory} />}
                          {baselineScore && (
                            <p className="text-xs text-gray-400 mt-2">
                              Baseline: {baselineScore.total_score} · Delta: {activeDetailScore.total_score - baselineScore.total_score > 0 ? '+' : ''}{(activeDetailScore.total_score - baselineScore.total_score).toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-4xl font-bold text-cropguard-dark tabular-nums leading-none">{activeDetailScore.total_score}</p>
                          <p className="text-sm text-cropguard-slate mt-1">Credit: <span className="font-semibold">{activeDetailScore.credit_score ?? '—'}</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">ECI: {activeDetailScore.eci_score}/40</p>
                          {activeDetailScore.week_number > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              Week {activeDetailScore.week_number} · {selectedFarmer.weeks_final + selectedFarmer.weeks_provisional}/12 weeks
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Pillar cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <PillarBar label="P1 — Agronomy Readiness"       score={activeDetailScore.p1_score} max={30} color="bg-green-500" />
                        <PillarBar label="P2 — CSA & Climate-Smart"      score={activeDetailScore.p2_score} max={30} color="bg-blue-500" />
                        <PillarBar label="P3 — Advisory & Commitment"    score={activeDetailScore.p3_score} max={20} color="bg-amber-500" />
                        <PillarBar label="P4 — Farm Enterprise Discipline" score={activeDetailScore.p4_score} max={20} color="bg-orange-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl border p-8 text-center">
                      <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">No score available for this view</p>
                    </div>
                  )}

                  {/* Season sparkline */}
                  {weeksWithScores.length > 0 && (
                    <div className="bg-white rounded-xl border shadow-sm p-5">
                      <p className="text-sm font-semibold text-cropguard-forest mb-4">Season FRI Trend</p>
                      {/* Week strip */}
                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(w => {
                          const s = weeksWithScores.find(sc => sc.week_number === w);
                          return (
                            <button
                              key={w}
                              onClick={() => setSelectedWeek(w)}
                              className={cn(
                                'shrink-0 w-12 rounded-lg border text-center py-1.5 transition-all',
                                selectedWeek === w ? 'border-cropguard-dark bg-cropguard-dark text-white' : 'border-gray-200 bg-gray-50 hover:border-cropguard-mid'
                              )}
                            >
                              <p className={cn('text-[9px] font-semibold', selectedWeek === w ? 'text-white/70' : 'text-gray-400')}>Wk {w}</p>
                              {s ? (
                                <>
                                  <p className={cn('text-xs font-bold tabular-nums', selectedWeek === w ? 'text-white' : 'text-cropguard-dark')}>{s.total_score}</p>
                                  <div className={cn('w-1.5 h-1.5 rounded-full mx-auto mt-0.5', s.is_provisional ? 'bg-amber-400' : 'bg-emerald-500')} />
                                </>
                              ) : (
                                <p className="text-[9px] text-gray-300">—</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={weeksWithScores} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="week_number" tick={{ fontSize: 10 }} tickFormatter={w => `W${w}`} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: any, n: string) => [v, n === 'total_score' ? 'FRI Score' : n]} labelFormatter={l => `Week ${l}`} />
                          <ReferenceLine y={80} stroke="#7C3AED" strokeDasharray="4 2" label={{ value: '80', fontSize: 9, fill: '#7C3AED' }} />
                          <ReferenceLine y={60} stroke="#16a34a" strokeDasharray="4 2" label={{ value: '60', fontSize: 9, fill: '#16a34a' }} />
                          <ReferenceLine y={40} stroke="#ca8a04" strokeDasharray="4 2" label={{ value: '40', fontSize: 9, fill: '#ca8a04' }} />
                          {baselineScore && <ReferenceLine y={baselineScore.total_score} stroke="#64748b" strokeDasharray="6 2" label={{ value: 'BL', fontSize: 9, fill: '#64748b' }} />}
                          <Line type="monotone" dataKey="total_score" stroke="#16a34a" strokeWidth={2} dot={(p: any) => {
                            const s = weeksWithScores[p.index];
                            return <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill={s?.is_provisional ? '#f59e0b' : '#16a34a'} stroke="#fff" strokeWidth={1.5} />;
                          }} />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="flex items-center gap-4 mt-2 justify-end">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Final</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Provisional</span>
                      </div>
                    </div>
                  )}

                  {/* Risk flags */}
                  {detailFlags.length > 0 && (
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                        <p className="text-sm font-semibold text-cropguard-forest">Active Risk Flags</p>
                        <Badge className="text-[10px] border-0 bg-red-100 text-red-700">{detailFlags.length}</Badge>
                      </div>
                      <div className="divide-y">
                        {detailFlags.map((flag: any) => (
                          <div key={flag.id} className={cn('px-5 py-3', flag.severity === 'high' ? 'bg-red-50/40' : 'bg-amber-50/20')}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge className={cn('text-[9px] border-0', flag.severity === 'high' ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-700')}>{flag.severity}</Badge>
                                  <span className="text-xs font-medium text-gray-700">{flag.flag_type?.replace(/_/g, ' ')}</span>
                                </div>
                                <p className="text-xs text-gray-500">{flag.description}</p>
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">{fmtDate(flag.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Norvi AI Credit Output */}
                  {activeDetailScore && (
                    <NorviOutput
                      farmerId={selectedFarmer.farmer_id}
                      friScoreId={activeDetailScore.id}
                      weekNumber={activeDetailScore.week_number}
                      outputType="credit_brief"
                      autoFetch={true}
                      compact={false}
                    />
                  )}
                </>
              )}
            </div>
          )
        )}

        {/* ── TAB: Opportunity Eligibility ─────────────────────────────────── */}
        {tab === 'opportunities' && (
          !selectedFarmer ? (
            <div className="text-center py-24 text-cropguard-slate">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-cropguard-forest text-lg">No farmer selected</p>
              <p className="text-sm mt-1">Select a farmer from the Farmer Intelligence tab first.</p>
              <Button size="sm" className="mt-4" onClick={() => setTab('farmers')}>Select Farmer</Button>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl">
              {/* Farmer summary bar */}
              <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-cropguard-forest">{selectedFarmer.full_name}</p>
                  <p className="text-xs text-gray-400">{selectedFarmer.asinyo_id} · FRI {selectedFarmer.total_score}/100</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFarmer.zone && <ZoneBadge zone={selectedFarmer.zone} />}
                  <ScorePill provisional={selectedFarmer.is_provisional} />
                </div>
              </div>

              {/* FRI threshold bar */}
              {interventions.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <p className="text-sm font-semibold text-cropguard-forest mb-4">FRI Threshold Comparison</p>
                  <div className="relative">
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden relative mb-6">
                      <div className="h-full bg-gradient-to-r from-red-300 via-amber-300 via-yellow-300 to-green-400 rounded-full" />
                      {/* Farmer marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cropguard-dark"
                        style={{ left: `${selectedFarmer.total_score}%` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-cropguard-dark whitespace-nowrap">
                          You: {selectedFarmer.total_score}
                        </div>
                      </div>
                    </div>
                    {/* Threshold ticks */}
                    <div className="relative h-4">
                      {interventions.map((iv: any) => (
                        <div
                          key={iv.id}
                          className="absolute flex flex-col items-center"
                          style={{ left: `${iv.min_fri}%`, transform: 'translateX(-50%)' }}
                        >
                          <div className={cn('w-0.5 h-4', selectedFarmer.total_score >= iv.min_fri ? 'bg-green-500' : 'bg-red-400')} />
                          <span className="text-[8px] text-gray-500 whitespace-nowrap mt-0.5" style={{ maxWidth: 60 }}>
                            {iv.name.slice(0, 10)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Intervention cards — sorted Eligible first */}
              {detailLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
              ) : interventions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No active interventions in this program</p>
                </div>
              ) : (
                [...interventions].sort((a: any, b: any) => {
                  const ae = eligibility[a.id]?.eligible ?? false;
                  const be = eligibility[b.id]?.eligible ?? false;
                  if (ae && !be) return -1;
                  if (!ae && be) return 1;
                  const ag = eligibility[a.id]?.gap ?? 999;
                  const bg = eligibility[b.id]?.gap ?? 999;
                  return ag - bg;
                }).map((iv: any) => {
                  const elig = eligibility[iv.id] ?? {};
                  const isEligible = elig.eligible ?? false;
                  const gap        = elig.gap ?? Math.max(0, iv.min_fri - selectedFarmer.total_score);
                  const [expanded, setExpanded] = [false, () => {}]; // local state pattern via key

                  return (
                    <InterventionCard
                      key={iv.id}
                      intervention={iv}
                      eligible={isEligible}
                      gap={gap}
                      farmerId={selectedFarmer.farmer_id}
                      friScoreId={selectedFarmer.latest_score_id ?? ''}
                      weekNumber={selectedFarmer.week_number}
                      farmerFRI={selectedFarmer.total_score}
                    />
                  );
                })
              )}
            </div>
          )
        )}

        {/* ── TAB: Portfolio Analytics ─────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
            ) : (
              <>
                {/* Weekly FRI trend */}
                {analyticsData.trend.length > 0 && (
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <p className="text-sm font-semibold text-cropguard-forest mb-4">Weekly FRI Trend — Current Season</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={analyticsData.trend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="week_number" tick={{ fontSize: 10 }} tickFormatter={w => `W${w}`} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip labelFormatter={l => `Week ${l}`} />
                        <ReferenceLine y={80} stroke="#7C3AED" strokeDasharray="4 2" />
                        <ReferenceLine y={60} stroke="#16a34a" strokeDasharray="4 2" />
                        <ReferenceLine y={40} stroke="#ca8a04" strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="avg_fri_final"       stroke="#16a34a" strokeWidth={2} name="Final Avg FRI"       dot={false} />
                        <Line type="monotone" dataKey="avg_fri_provisional" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" name="Provisional Avg FRI" dot={false} />
                        <Legend iconType="line" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Zone migration matrix */}
                {analyticsData.migration.length > 0 && (
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <p className="text-sm font-semibold text-cropguard-forest mb-4">Zone Migration — Baseline → Current Season</p>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr>
                            <th className="text-left font-semibold text-gray-400 pb-2 pr-3">From \ To</th>
                            {ZONES_ORDER.map(z => <th key={z} className="text-center font-semibold pb-2 px-2 whitespace-nowrap" style={{ color: ZONE_HEX[z] }}>{z.replace('Resilience ', '')}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {ZONES_ORDER.map(fromZ => (
                            <tr key={fromZ} className="border-t border-gray-100">
                              <td className="font-semibold py-2 pr-3 whitespace-nowrap" style={{ color: ZONE_HEX[fromZ] }}>{fromZ.replace('Resilience ', '')}</td>
                              {ZONES_ORDER.map(toZ => {
                                const count = migrationMatrix[fromZ]?.[toZ] ?? 0;
                                const isDiag = fromZ === toZ;
                                const isUp   = ZONES_ORDER.indexOf(toZ) < ZONES_ORDER.indexOf(fromZ);
                                const bg = count === 0 ? '' : isDiag ? 'bg-blue-50' : isUp ? 'bg-green-50' : 'bg-red-50';
                                const tc = count === 0 ? 'text-gray-200' : isDiag ? 'text-blue-700' : isUp ? 'text-green-700' : 'text-red-700';
                                return (
                                  <td key={toZ} className={cn('text-center py-2 px-2 font-semibold rounded', bg, tc)}>
                                    {count > 0 ? count : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Intervention uptake */}
                {analyticsData.uptake.length > 0 && (
                  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50">
                      <p className="text-sm font-semibold text-cropguard-forest">Intervention Uptake</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-[10px] text-gray-400 uppercase tracking-wide bg-gray-50/50">
                          <th className="text-left px-5 py-2 font-semibold">Intervention</th>
                          <th className="text-left px-3 py-2 font-semibold">Type</th>
                          <th className="text-center px-3 py-2 font-semibold">Enrolled</th>
                          <th className="text-center px-3 py-2 font-semibold">Approved</th>
                          <th className="text-center px-3 py-2 font-semibold">Delivered</th>
                          <th className="text-center px-3 py-2 font-semibold">Avg FRI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {analyticsData.uptake.map((row: any) => (
                          <tr key={row.intervention_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-cropguard-forest">{row.intervention_name}</td>
                            <td className="px-3 py-3"><span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full', INTERVENTION_TYPE_COLORS[row.intervention_type] ?? 'bg-gray-100 text-gray-600')}>{row.intervention_type}</span></td>
                            <td className="px-3 py-3 text-center text-gray-700">{row.enrolled_count ?? 0}</td>
                            <td className="px-3 py-3 text-center text-emerald-700 font-semibold">{row.approved_count ?? 0}</td>
                            <td className="px-3 py-3 text-center text-blue-700">{row.delivered_count ?? 0}</td>
                            <td className="px-3 py-3 text-center font-semibold text-cropguard-dark">{row.avg_fri ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Geographic risk concentration */}
                {analyticsData.geoRisk.length > 0 && (
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <p className="text-sm font-semibold text-cropguard-forest mb-1">Risk Concentration — Critical Risk Farmers by Community</p>
                    <p className="text-xs text-gray-400 mb-4">Zone: Resilience Starter (FRI 0–39)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analyticsData.geoRisk} layout="vertical" margin={{ left: 60, right: 20, top: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="community" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip formatter={(v: any) => [v, 'Farmers']} />
                        <Bar dataKey="farmer_count" fill="#dc2626" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Agent verification quality */}
                {analyticsData.agentQuality.length > 0 && (
                  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b bg-gray-50">
                      <p className="text-sm font-semibold text-cropguard-forest">Verification Quality — Per Agent</p>
                      <p className="text-xs text-gray-400 mt-0.5">Low verification rate → lower score reliability → triggers program manager review</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-[10px] text-gray-400 uppercase tracking-wide bg-gray-50/50">
                          <th className="text-left px-5 py-2 font-semibold">Agent</th>
                          <th className="text-center px-3 py-2 font-semibold">Farmers</th>
                          <th className="text-center px-3 py-2 font-semibold">Verified</th>
                          <th className="text-center px-3 py-2 font-semibold">Total</th>
                          <th className="text-center px-3 py-2 font-semibold">Rate</th>
                          <th className="text-center px-3 py-2 font-semibold">Final / Prov</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {analyticsData.agentQuality.map((row: any) => {
                          const rate = Number(row.verification_rate ?? 0);
                          const rowBg = rate < 40 ? 'bg-red-50/30' : rate < 60 ? 'bg-amber-50/20' : '';
                          return (
                            <tr key={row.agent_id} className={cn('transition-colors', rowBg)}>
                              <td className="px-5 py-3 font-medium text-cropguard-forest">{row.agent_name}</td>
                              <td className="px-3 py-3 text-center text-gray-700">{row.assigned_farmers}</td>
                              <td className="px-3 py-3 text-center text-emerald-700 font-semibold">{row.checkins_verified}</td>
                              <td className="px-3 py-3 text-center text-gray-700">{row.total_checkins}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={cn('font-bold', rate >= 80 ? 'text-emerald-700' : rate >= 60 ? 'text-amber-700' : 'text-red-700')}>
                                  {rate}%
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-gray-500">{row.final_count} / {row.provisional_count}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {analyticsData.trend.length === 0 && analyticsData.migration.length === 0 && analyticsData.uptake.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No analytics data available yet</p>
                    <p className="text-sm mt-1">Analytics populate once FRI scoring begins.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB: Managed Collection ──────────────────────────────────────── */}
        {tab === 'collection' && (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard icon={Package}    label="Active Loans"      value={farmers.filter(f => f.credit_score !== null).length} sub="Enrolled in loan products"       iconBg="bg-blue-100"   iconColor="text-blue-600" />
              <KPICard icon={AlertTriangle} label="At Risk Borrowers" value={farmers.filter(f => f.zone === 'Resilience Starter').length} sub="Resilience Starter zone"   iconBg="bg-red-100"    iconColor="text-red-600" />
              <KPICard icon={TrendingDown} label="Declining P4"     value={farmers.filter(f => f.p4_score !== undefined && f.p4_score < 10).length} sub="Farm Enterprise < 50%"  iconBg="bg-amber-100"  iconColor="text-amber-600" />
              <KPICard icon={Star}        label="Avg P4 Score"     value={farmers.length > 0 ? Math.round(farmers.reduce((s, f) => s + (f.p4_score ?? 0), 0) / farmers.length) : 0} sub="Farm Enterprise Discipline / 20" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            </div>

            {/* Overdue / at-risk farmer list */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50">
                <p className="text-sm font-semibold text-cropguard-forest">Borrower Risk Monitor</p>
                <p className="text-xs text-gray-400">Sorted by risk — Critical Risk first</p>
              </div>
              {loading ? (
                <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : (
                <div className="divide-y">
                  {[...farmers]
                    .sort((a, b) => a.total_score - b.total_score)
                    .slice(0, 30)
                    .map(f => {
                      const p4Risk = (f.p4_score ?? 0) < 8;
                      return (
                        <div
                          key={f.farmer_id}
                          onClick={() => openFarmerDetail(f)}
                          className={cn(
                            'grid grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] gap-0 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors items-center',
                            f.zone === 'Resilience Starter' && 'bg-red-50/20',
                          )}
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                            <p className="text-[11px] text-gray-400">{f.asinyo_id}</p>
                          </div>
                          <div>{f.zone ? <ZoneBadge zone={f.zone} size="xs" /> : <span className="text-gray-300 text-xs">—</span>}</div>
                          <div>
                            <p className="text-sm font-bold tabular-nums text-cropguard-dark">{f.total_score}</p>
                            <p className="text-[10px] text-gray-400">FRI</p>
                          </div>
                          <div>
                            <p className={cn('text-sm font-bold tabular-nums', p4Risk ? 'text-red-600' : 'text-cropguard-dark')}>{f.p4_score ?? '—'}/20</p>
                            <p className="text-[10px] text-gray-400">P4 Enterprise</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-cropguard-dark">{f.credit_score ?? '—'}</p>
                            <p className="text-[10px] text-gray-400">Credit</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {p4Risk && <Badge className="text-[9px] border-0 bg-red-100 text-red-700">P4 Decline</Badge>}
                            {f.high_flag_count > 0 && <Badge className="text-[9px] border-0 bg-red-200 text-red-800">{f.high_flag_count} flags</Badge>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Intervention Card (separate component for local expand state) ─────────────

function InterventionCard({
  intervention, eligible, gap, farmerId, friScoreId, weekNumber, farmerFRI,
}: {
  intervention:  any;
  eligible:      boolean;
  gap:           number;
  farmerId:      string;
  friScoreId:    string;
  weekNumber:    number;
  farmerFRI:     number;
}) {
  const [expanded, setExpanded] = useState(false);
  const rules: any[] = Array.isArray(intervention.eligibility_rules) ? intervention.eligibility_rules : [];

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm overflow-hidden', eligible ? 'border-green-200' : '')}>
      <button
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', eligible ? 'bg-green-100' : 'bg-red-100')}>
          {eligible ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-cropguard-forest text-sm">{intervention.name}</p>
            <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full', INTERVENTION_TYPE_COLORS[intervention.type] ?? 'bg-gray-100 text-gray-600')}>{intervention.type}</span>
            {eligible
              ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Eligible</span>
              : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Not Eligible · {gap} FRI needed</span>
            }
          </div>
          {intervention.value_description && <p className="text-xs text-gray-500">{intervention.value_description}</p>}
          <p className="text-[11px] text-gray-400 mt-1">Min FRI: {intervention.min_fri} · Capacity: {intervention.capacity ?? 'Unlimited'}</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform mt-1', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* FRI threshold vs farmer */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-400 shrink-0">Min FRI required:</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
              <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: `${intervention.min_fri}%` }} />
              <div className={cn('absolute h-full rounded-full', farmerFRI >= intervention.min_fri ? 'bg-green-500' : 'bg-red-400')} style={{ width: `${farmerFRI}%` }} />
            </div>
            <span className="font-semibold text-cropguard-dark shrink-0">{farmerFRI} / {intervention.min_fri}</span>
          </div>

          {/* Eligibility rules */}
          {rules.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Eligibility Rules</p>
              <div className="flex flex-wrap gap-2">
                {rules.map((r: any, i: number) => {
                  const passed = farmerFRI >= (r.value ?? intervention.min_fri);
                  return (
                    <span key={i} className={cn('text-[10px] font-medium px-2.5 py-1 rounded-full border', passed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200')}>
                      {passed ? '✓' : '✗'} {r.name ?? `Rule ${i + 1}`}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Norvi eligibility insight — only for ineligible */}
          {!eligible && (
            <NorviOutput
              farmerId={farmerId}
              friScoreId={friScoreId}
              weekNumber={weekNumber}
              outputType="opportunity"
              autoFetch={true}
              compact={true}
            />
          )}

          {intervention.improvement_steps && Array.isArray(intervention.improvement_steps) && intervention.improvement_steps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Steps to Qualify</p>
              <ul className="space-y-1">
                {intervention.improvement_steps.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-cropguard-green shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
