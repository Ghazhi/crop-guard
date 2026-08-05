import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ClipboardList, TrendingUp, Zap,
  MapPin, Phone, Leaf, Shield, AlertTriangle, Landmark, Globe2, Briefcase,
  Wallet, FileText, Sparkles, Brain, Loader2, AlertCircle, Target, Lightbulb,
  ArrowUpRight, BarChart2, Building2, FileSpreadsheet, RefreshCw,
  CloudRain, Grid3x3,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, CartesianGrid, Legend } from 'recharts';
import { CROP_LABELS } from '@/lib/constants';
import type { CropType, RiskCategory } from '@/types/database';
import { cn } from '@/lib/utils';
import { computeExposureScore, computeQuadrant, QUADRANT_INFO, type QuadrantKey } from '@/lib/exposure';

interface Stats {
  totalFarmers: number;
  activeEnrollments: number;
  totalAgents: number;
  avgFRI: number | null;
  cooperatives: number;
  communities: number;
  programs: number;
  cohorts: number;
  interventions: number;
  applications: number;
  fundRequests: number;
  offtakeAgreements: number;
  insurancePolicies: number;
  norviOutputs: number;
  totalUsers: number;
}

interface ExposureSummary {
  cohortCount: number;
  avgExposure: number | null;
  highExposureCohorts: number;
  quadrantCounts: Record<QuadrantKey, number>;
  totalScored: number;
}

interface CropBreakdown { crop: string; count: number; }
interface RiskBreakdown { category: RiskCategory; count: number; }
interface CoopBreakdown { name: string; members: number; }
interface ZoneBreakdown { zone: string; count: number; }
interface TrendPoint { month: string; avg_fri: number; enrollments: number; }

interface FarmerRow {
  id: string; full_name: string; phone: string; community: string; region: string;
  primary_crop: CropType; current_fri_score: number | null; is_verified: boolean; risk_category: RiskCategory | null;
}
interface EnrollmentRow {
  id: string; status: string; created_at: string;
  farmers: { full_name: string; phone: string; community: string } | null;
  cohorts: { name: string } | null;
}
interface AgentRow { id: string; full_name: string; phone: string | null; region_code: string | null; is_active: boolean; }

const RISK_COLORS: Record<RiskCategory, string> = {
  low: '#4CAF50', medium: '#FF9800', high: '#F44336', critical: '#B71C1C',
};

type DrawerType = 'farmers' | 'enrollments' | 'agents' | 'scored' | null;

function friZone(score: number | null) {
  if (score === null) return { label: 'N/A', color: 'bg-gray-100 text-gray-500' };
  if (score >= 80) return { label: 'Leader', color: 'bg-cropguard-dark text-white' };
  if (score >= 60) return { label: 'Builder', color: 'bg-cropguard-mid text-white' };
  if (score >= 40) return { label: 'Learner', color: 'bg-amber-100 text-amber-800' };
  return { label: 'Starter', color: 'bg-red-100 text-red-800' };
}

/* ── drawer content ─────────────────────────────────────── */
function FarmerListContent({ farmers }: { farmers: FarmerRow[] }) {
  if (!farmers.length) return <p className="text-sm text-gray-400 text-center py-8">No farmers found.</p>;
  return (
    <div className="space-y-2.5">
      {farmers.map(f => {
        const zone = friZone(f.current_fri_score);
        return (
          <div key={f.id} className="bg-gray-50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-cropguard-forest">{f.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <MapPin className="w-2.5 h-2.5" />{f.community}{f.region ? `, ${f.region}` : ''}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Phone className="w-2.5 h-2.5" />{f.phone}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', zone.color)}>
                  {f.current_fri_score ?? '—'}
                </span>
                <p className="text-[9px] text-gray-400 mt-0.5">{zone.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Leaf className="w-2.5 h-2.5 text-cropguard-mid" />
                {CROP_LABELS[f.primary_crop] ?? f.primary_crop}
              </span>
              {f.is_verified && <Badge className="text-[9px] border-0 bg-green-100 text-green-700">Verified</Badge>}
              {f.risk_category && f.risk_category !== 'low' && (
                <Badge className={cn('text-[9px] border-0',
                  f.risk_category === 'critical' ? 'bg-red-100 text-red-700' :
                  f.risk_category === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700')}>
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{f.risk_category}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoredFarmerListContent({ farmers }: { farmers: FarmerRow[] }) {
  if (!farmers.length) return <p className="text-sm text-gray-400 text-center py-8">No scored farmers found.</p>;
  return (
    <div className="space-y-2.5">
      {farmers.map((f, idx) => {
        const zone = friZone(f.current_fri_score);
        return (
          <div key={f.id} className="bg-gray-50 rounded-xl p-3.5 flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-cropguard-forest truncate">{f.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <MapPin className="w-2.5 h-2.5" />{f.community}{f.region ? `, ${f.region}` : ''}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Leaf className="w-2.5 h-2.5 text-cropguard-mid" />{CROP_LABELS[f.primary_crop] ?? f.primary_crop}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', zone.color)}>
                {f.current_fri_score}
              </span>
              <p className="text-[9px] text-gray-400 mt-0.5">{zone.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EnrollmentListContent({ enrollments }: { enrollments: EnrollmentRow[] }) {
  if (!enrollments.length) return <p className="text-sm text-gray-400 text-center py-8">No active enrollments.</p>;
  return (
    <div className="space-y-2.5">
      {enrollments.map(e => (
        <div key={e.id} className="bg-gray-50 rounded-xl p-3.5">
          <p className="text-sm font-semibold text-cropguard-forest">{e.farmers?.full_name ?? '—'}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {e.farmers?.phone && <span className="flex items-center gap-1 text-[10px] text-gray-500"><Phone className="w-2.5 h-2.5" />{e.farmers.phone}</span>}
            {e.farmers?.community && <span className="flex items-center gap-1 text-[10px] text-gray-500"><MapPin className="w-2.5 h-2.5" />{e.farmers.community}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge className="text-[9px] border-0 bg-green-100 text-green-700">{e.status}</Badge>
            {e.cohorts?.name && <span className="text-[10px] text-gray-400">{e.cohorts.name}</span>}
            <span className="text-[10px] text-gray-400 ml-auto">{new Date(e.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentListContent({ agents }: { agents: AgentRow[] }) {
  if (!agents.length) return <p className="text-sm text-gray-400 text-center py-8">No agents found.</p>;
  return (
    <div className="space-y-2.5">
      {agents.map(a => (
        <div key={a.id} className="bg-gray-50 rounded-xl p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-cropguard-forest">{a.full_name}</p>
              {a.phone && <span className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5"><Phone className="w-2.5 h-2.5" />{a.phone}</span>}
              {a.region_code && <span className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5"><MapPin className="w-2.5 h-2.5" />{a.region_code}</span>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="text-[9px] border-0 bg-cropguard-mint text-cropguard-forest"><Shield className="w-2.5 h-2.5 mr-0.5" />Agent</Badge>
              {!a.is_active && <Badge className="text-[9px] border-0 bg-gray-100 text-gray-500">Inactive</Badge>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── compact module pill ────────────────────────────────── */
function ModulePill({ icon: Icon, label, value, to }: {
  icon: React.ElementType; label: string; value: number | string; to: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 px-3.5 py-2.5 transition-all hover:border-gray-200 hover:shadow-sm group"
    >
      <Icon className="w-4 h-4 text-cropguard-mid shrink-0" />
      <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
      <span className="text-sm font-bold text-cropguard-forest ml-auto">{value}</span>
    </button>
  );
}

/* ── main page ──────────────────────────────────────────── */
export default function StaffDashboardPage() {
  const profile = useAuthStore(s => s.profile);
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cropData, setCropData] = useState<CropBreakdown[]>([]);
  const [riskData, setRiskData] = useState<RiskBreakdown[]>([]);
  const [coopData, setCoopData] = useState<CoopBreakdown[]>([]);
  const [zoneData, setZoneData] = useState<ZoneBreakdown[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [scoredFarmers, setScoredFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerFarmers, setDrawerFarmers] = useState<FarmerRow[]>([]);
  const [drawerEnrollments, setDrawerEnrollments] = useState<EnrollmentRow[]>([]);
  const [drawerAgents, setDrawerAgents] = useState<AgentRow[]>([]);
  const [drawerScored, setDrawerScored] = useState<FarmerRow[]>([]);

  const [aiContent, setAiContent] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [exposureSummary, setExposureSummary] = useState<ExposureSummary | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const orgId = profile.organisation_id;

    const { data: enrollmentRows } = await supabase
      .from('enrollments').select('farmer_id').eq('status', 'active');
    const enrolledIds = [...new Set((enrollmentRows ?? []).map((e: any) => e.farmer_id))];

    const { data: progRows } = await supabase.from('programs').select('id').eq('organisation_id', orgId);
    const progIds = (progRows ?? []).map((p: any) => p.id);

    const [
      { count: activeEnrollments },
      { count: totalAgents },
      { data: farmers },
      { data: friScores },
      { count: cooperatives },
      { count: communities },
      { count: programs },
      { count: cohorts },
      { count: interventions },
      { count: applications },
      { count: fundRequests },
      { count: offtakeAgreements },
      { count: insurancePolicies },
      { count: norviOutputs },
      { count: totalUsers },
    ] = await Promise.all([
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('role', 'agent'),
      enrolledIds.length > 0
        ? supabase.from('farmers').select('id, primary_crop, risk_category').in('id', enrolledIds).eq('organisation_id', orgId)
        : Promise.resolve({ data: [], error: null, count: null, status: 200, statusText: 'OK' } as any),
      enrolledIds.length > 0
        ? (supabase.from('farmer_fri_scores') as any).select('total_score').eq('organisation_id', orgId).in('farmer_id', enrolledIds)
        : Promise.resolve({ data: [], error: null, count: null, status: 200, statusText: 'OK' } as any),
      supabase.from('cooperatives').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('communities').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('programs').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cohorts').select('id', { count: 'exact', head: true }).in('program_id', (progIds.length > 0 ? progIds : ['00000000-0000-0000-0000-000000000000'])),
      supabase.from('interventions').select('id', { count: 'exact', head: true }).in('farmer_id', (enrolledIds.length > 0 ? enrolledIds : ['00000000-0000-0000-0000-000000000000'])),
      (supabase.from('farmer_intervention_applications') as any).select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      (supabase.from('fund_requests') as any).select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      (supabase.from('offtake_agreements') as any).select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      (supabase.from('insurance_policies') as any).select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      (supabase.from('norvi_community_outputs') as any).select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
    ]);

    const farmerList = (farmers ?? []) as { primary_crop: CropType; risk_category: RiskCategory }[];
    const scores = (friScores ?? []) as { total_score: number }[];
    const avgFRI = scores.length > 0 ? Math.round(scores.reduce((s, r) => s + r.total_score, 0) / scores.length) : null;

    // Zone breakdown for pie chart
    const zoneMap = new Map<string, number>();
    (farmerList as any[]).forEach(f => {
      const s = (f as any).current_fri_score ?? null;
      const zone = s === null ? 'N/A' : s >= 80 ? 'Leader' : s >= 60 ? 'Builder' : s >= 40 ? 'Learner' : 'Starter';
      zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + 1);
    });
    setZoneData([...zoneMap.entries()].map(([zone, count]) => ({ zone, count })));

    // Trend data: avg FRI + new enrollments by month (last 6 months)
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = (key: string) => { const [y, m] = key.split('-'); return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'short' }); };
    const now = new Date();
    const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 5);

    const { data: friTrendRows } = await supabase.from('farmer_fri_scores').select('total_score, created_at').eq('organisation_id', orgId).gte('created_at', sixMonthsAgo.toISOString()).order('created_at', { ascending: true });
    const monthlyFri: Record<string, number[]> = {};
    (friTrendRows ?? []).forEach((r: any) => { const k = monthKey(new Date(r.created_at)); if (!monthlyFri[k]) monthlyFri[k] = []; monthlyFri[k].push(Number(r.total_score)); });

    const { data: enrollTrendRows } = await supabase.from('enrollments').select('created_at').gte('created_at', sixMonthsAgo.toISOString());
    const monthlyEnroll: Record<string, number> = {};
    (enrollTrendRows ?? []).forEach((r: any) => { const k = monthKey(new Date(r.created_at)); monthlyEnroll[k] = (monthlyEnroll[k] ?? 0) + 1; });

    const trendKeys = Array.from(new Set([...Object.keys(monthlyFri), ...Object.keys(monthlyEnroll)])).sort().slice(-6);
    const trend: TrendPoint[] = trendKeys.map(k => {
      const arr = monthlyFri[k] ?? [];
      return { month: monthLabel(k), avg_fri: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0, enrollments: monthlyEnroll[k] ?? 0 };
    });
    setTrendData(trend);

    setStats({
      totalFarmers: enrolledIds.length,
      activeEnrollments: activeEnrollments ?? 0,
      totalAgents: totalAgents ?? 0,
      avgFRI,
      cooperatives: cooperatives ?? 0,
      communities: communities ?? 0,
      programs: programs ?? 0,
      cohorts: cohorts ?? 0,
      interventions: interventions ?? 0,
      applications: applications ?? 0,
      fundRequests: fundRequests ?? 0,
      offtakeAgreements: offtakeAgreements ?? 0,
      insurancePolicies: insurancePolicies ?? 0,
      norviOutputs: norviOutputs ?? 0,
      totalUsers: totalUsers ?? 0,
    });

    const cropMap = new Map<CropType, number>();
    const riskMap = new Map<RiskCategory, number>();
    farmerList.forEach(f => {
      cropMap.set(f.primary_crop, (cropMap.get(f.primary_crop) ?? 0) + 1);
      if (f.risk_category) riskMap.set(f.risk_category, (riskMap.get(f.risk_category) ?? 0) + 1);
    });
    setCropData(
      [...cropMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([crop, count]) => ({ crop: CROP_LABELS[crop] ?? crop, count }))
    );
    setRiskData([...riskMap.entries()].map(([category, count]) => ({ category, count })));

    // Cooperatives breakdown for chart
    try {
      const { data: coopRows } = await supabase
        .from('cooperatives')
        .select('id, name, member_count')
        .eq('organisation_id', orgId)
        .order('member_count', { ascending: false })
        .limit(6);
      setCoopData((coopRows ?? []).map((c: any) => ({ name: c.name ?? 'Unknown', members: c.member_count ?? 0 })));
    } catch {
      setCoopData([]);
    }

    // ── Climate Exposure & Risk Quadrant summary ──
    try {
      let cohortRows: any[] = [];
      if (progIds.length > 0) {
        const { data: cd } = await supabase.from('cohorts').select('id, name').in('program_id', progIds);
        cohortRows = cd ?? [];
      }
      const cohortIdArr = cohortRows.map(c => c.id);
      let exposureRows: any[] = [];
      if (cohortIdArr.length > 0) {
        const { data: ed } = await supabase.from('cohort_exposure_inputs').select('*').in('cohort_id', cohortIdArr);
        exposureRows = ed ?? [];
      }
      const exposureByCohort: Record<string, number> = {};
      exposureRows.forEach((e: any) => {
        const score = computeExposureScore({
          hazard_classification: e.hazard_classification,
          actual_rainfall: Number(e.actual_rainfall) || 0,
          historical_avg_rainfall: Number(e.historical_avg_rainfall) || 0,
          critical_alert_count: e.critical_alert_count || 0,
          high_alert_count: e.high_alert_count || 0,
          medium_alert_count: e.medium_alert_count || 0,
          in_critical_growth_stage: e.in_critical_growth_stage ?? false,
          forecast_stress_flag: e.forecast_stress_flag ?? false,
        }).score;
        exposureByCohort[e.cohort_id] = score;
      });
      const exposureScores = Object.values(exposureByCohort);
      const avgExposure = exposureScores.length > 0
        ? Math.round(exposureScores.reduce((a, b) => a + b, 0) / exposureScores.length)
        : null;
      const highExposureCohorts = exposureScores.filter(s => s >= 67).length;

      // Quadrant counts from farmers with FRI scores
      let friByFarmer: Record<string, number> = {};
      if (enrolledIds.length > 0) {
        const { data: latestScores } = await (supabase.from('farmer_fri_scores') as any)
          .select('farmer_id, total_score, week_number')
          .in('farmer_id', enrolledIds)
          .order('week_number', { ascending: false });
        const seen = new Set<string>();
        (latestScores ?? []).forEach((s: any) => {
          if (!seen.has(s.farmer_id)) {
            seen.add(s.farmer_id);
            friByFarmer[s.farmer_id] = Number(s.total_score) || 0;
          }
        });
      }
      // Map farmer -> cohort
      const { data: enrRows } = await supabase.from('enrollments').select('farmer_id, cohort_id').eq('status', 'active').in('cohort_id', cohortIdArr.length > 0 ? cohortIdArr : ['00000000-0000-0000-0000-000000000000']);
      const farmerCohort: Record<string, string> = {};
      (enrRows ?? []).forEach((e: any) => { farmerCohort[e.farmer_id] = e.cohort_id; });

      const quadrantCounts: Record<QuadrantKey, number> = {
        HighCap_LowExp: 0, HighCap_HighExp: 0, LowCap_LowExp: 0, LowCap_HighExp: 0,
      };
      let totalScored = 0;
      Object.entries(friByFarmer).forEach(([fid, fri]) => {
        const exp = exposureByCohort[farmerCohort[fid]] ?? 0;
        quadrantCounts[computeQuadrant(fri, exp)]++;
        totalScored++;
      });

      setExposureSummary({
        cohortCount: cohortRows.length,
        avgExposure,
        highExposureCohorts,
        quadrantCounts,
        totalScored,
      });
    } catch {
      // Exposure summary is optional — don't fail the whole dashboard
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const generateAIInsight = useCallback(async () => {
    if (!profile) return;
    const orgId = profile.organisation_id;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/norvi-community-insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session?.access_token ?? ''}` },
        body: JSON.stringify({
          scope: 'organisation', scope_id: orgId, org_id: orgId,
          custom_prompt: 'Provide a program-wide intelligence overview covering farmer FRI score trends, risk distribution, enrollment status, governance (cooperatives and communities), interventions, and recommended actions for the program team.',
        }),
      });
      if (!res.ok) throw new Error('Failed to generate AI insight');
      const data = await res.json() as { content: string };
      setAiContent(data.content);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAiLoading(false);
    }
  }, [profile]);

  async function openDrawer(type: DrawerType) {
    if (!profile || !type) return;
    setDrawerType(type);
    setDrawerLoading(true);
    const orgId = profile.organisation_id!;
    try {
      if (type === 'farmers') {
        const { data } = await supabase
          .from('farmers').select('id, full_name, phone, community, region, primary_crop, current_fri_score, is_verified, risk_category')
          .eq('organisation_id', orgId).order('full_name');
        setDrawerFarmers((data as FarmerRow[]) ?? []);
      } else if (type === 'scored') {
        const { data } = await supabase
          .from('farmers').select('id, full_name, phone, community, region, primary_crop, current_fri_score, is_verified, risk_category')
          .eq('organisation_id', orgId).not('current_fri_score', 'is', null).order('current_fri_score', { ascending: false });
        setDrawerScored((data as FarmerRow[]) ?? []);
      } else if (type === 'enrollments') {
        const { data } = await supabase
          .from('enrollments').select('id, status, created_at, farmers(full_name, phone, community), cohorts(name)')
          .eq('status', 'active').order('created_at', { ascending: false });
        setDrawerEnrollments((data as unknown as EnrollmentRow[]) ?? []);
      } else if (type === 'agents') {
        const { data } = await supabase
          .from('users').select('id, full_name, phone, region_code, is_active')
          .eq('organisation_id', orgId).eq('role', 'agent').order('full_name');
        setDrawerAgents((data as AgentRow[]) ?? []);
      }
    } finally {
      setDrawerLoading(false);
    }
  }

  const drawerMeta: Record<NonNullable<DrawerType>, { title: string; subtitle?: string }> = {
    farmers:     { title: 'All Farmers',        subtitle: `${stats?.totalFarmers ?? 0} registered` },
    scored:      { title: 'Scored Farmers',     subtitle: 'Sorted by FRI score (high to low)' },
    enrollments: { title: 'Active Enrollments', subtitle: `${stats?.activeEnrollments ?? 0} enrolled` },
    agents:      { title: 'Field Agents',        subtitle: `${stats?.totalAgents ?? 0} active` },
  };

  const aiParagraphs = aiContent?.split('\n').filter(p => p.trim()) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Dashboard</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">Program overview & AI insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </>
      ) : stats && (
        <>
          {/* KPI row — 4 cards only */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users}         label="Total Farmers"      value={stats.totalFarmers}      color="bg-cropguard-dark text-white"  onClick={() => openDrawer('farmers')} />
            <StatCard icon={ClipboardList} label="Active Enrollments" value={stats.activeEnrollments} color="bg-cropguard-green text-white"  onClick={() => openDrawer('enrollments')} />
            <StatCard icon={TrendingUp}    label="Average FRI"        value={stats.avgFRI !== null ? `${stats.avgFRI}/100` : '—'} color="bg-emerald-600 text-white" sub="across scored farmers" onClick={() => openDrawer('scored')} />
            <StatCard icon={Zap}            label="Field Agents"       value={stats.totalAgents}       color="bg-cropguard-amber text-white" onClick={() => openDrawer('agents')} />
          </div>

          {/* Modules — compact pills, single row of 6 */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Modules</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <ModulePill icon={Landmark}         label="Cooperatives"  value={stats.cooperatives}      to="/staff/governance" />
              <ModulePill icon={Globe2}           label="Communities"   value={stats.communities}       to="/staff/governance" />
              <ModulePill icon={Briefcase}        label="Programs"      value={stats.programs}          to="/staff/programs" />
              <ModulePill icon={Building2}        label="Cohorts"        value={stats.cohorts}            to="/staff/programs" />
              <ModulePill icon={Zap}              label="Interventions" value={stats.interventions}     to="/staff/interventions" />
              <ModulePill icon={FileText}         label="Applications"  value={stats.applications}      to="/staff/interventions" />
            </div>
          </div>

          {/* Charts — row 1: Top Crops + Cooperatives + Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {cropData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-cropguard-forest">Top Crops</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={cropData} barSize={24}>
                      <XAxis dataKey="crop" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F0F7F4' }} />
                      <Bar dataKey="count" fill="#2E5E3E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {coopData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-cropguard-forest">Cooperatives</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={coopData} layout="vertical" barSize={16}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6B7280' }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F0F7F4' }} />
                      <Bar dataKey="members" name="Members" fill="#4A8B6A" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {riskData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-cropguard-forest">Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={riskData} barSize={36}>
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F0F7F4' }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {riskData.map(d => <Cell key={d.category} fill={RISK_COLORS[d.category]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Charts — row 2: FRI zones pie + FRI trend area chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {zoneData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-cropguard-forest">FRI Zone Distribution</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={160}>
                      <PieChart>
                        <Pie data={zoneData} dataKey="count" nameKey="zone" cx="50%" cy="50%" outerRadius={65} innerRadius={40} paddingAngle={2}>
                          {zoneData.map((entry, i) => {
                            const colors: Record<string, string> = { Leader: '#2E5E3E', Builder: '#4A8B6A', Learner: '#F59E0B', Starter: '#EF4444', 'N/A': '#D1D5DB' };
                            return <Cell key={i} fill={colors[entry.zone] ?? '#D1D5DB'} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {zoneData.map((z, i) => {
                        const colors: Record<string, string> = { Leader: '#2E5E3E', Builder: '#4A8B6A', Learner: '#F59E0B', Starter: '#EF4444', 'N/A': '#D1D5DB' };
                        return (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[z.zone] ?? '#D1D5DB' }} />
                              <span className="text-xs text-gray-600">{z.zone}</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-900">{z.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {trendData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-cropguard-forest">FRI Score Trend (6 months)</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="friTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2E5E3E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2E5E3E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="avg_fri" name="Avg FRI" stroke="#2E5E3E" fill="url(#friTrendGrad)" strokeWidth={2} dot={{ r: 3, fill: '#2E5E3E' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Charts — row 3: enrollment trend */}
          {trendData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-cropguard-forest">New Enrollments (6 months)</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={trendData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F0F7F4' }} />
                    <Bar dataKey="enrollments" name="New Enrollments" fill="#4A8B6A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Climate Exposure & Risk Quadrant summary */}
          {exposureSummary && exposureSummary.cohortCount > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exposure summary card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#B04A2E]/10 flex items-center justify-center">
                        <CloudRain className="w-4 h-4 text-[#B04A2E]" />
                      </div>
                      <h3 className="font-semibold text-cropguard-forest">Climate Exposure</h3>
                    </div>
                    <button onClick={() => navigate('/staff/intelligence')} className="text-xs text-cropguard-mid hover:text-cropguard-forest flex items-center gap-0.5">
                      Details <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="font-serif text-2xl font-bold text-[#0E2419]">{exposureSummary.avgExposure ?? '—'}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Avg Score</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="font-serif text-2xl font-bold text-[#B04A2E]">{exposureSummary.highExposureCohorts}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">High Risk Cohorts</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="font-serif text-2xl font-bold text-[#0E2419]">{exposureSummary.cohortCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Cohorts Tracked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quadrant summary card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#C79A3D]/10 flex items-center justify-center">
                        <Grid3x3 className="w-4 h-4 text-[#C79A3D]" />
                      </div>
                      <h3 className="font-semibold text-cropguard-forest">Risk Quadrant</h3>
                    </div>
                    <button onClick={() => navigate('/staff/intelligence')} className="text-xs text-cropguard-mid hover:text-cropguard-forest flex items-center gap-0.5">
                      Details <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  {exposureSummary.totalScored > 0 ? (
                    <div className="space-y-2">
                      {(Object.keys(QUADRANT_INFO) as QuadrantKey[]).map(qk => {
                        const qi = QUADRANT_INFO[qk];
                        const count = exposureSummary.quadrantCounts[qk];
                        const pct = Math.round((count / exposureSummary.totalScored) * 100);
                        return (
                          <div key={qk} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: qi.color }} />
                            <span className="text-xs text-gray-600 flex-1 truncate">{qi.axisLabel}</span>
                            <span className="text-xs font-semibold text-gray-900 w-8 text-right">{count}</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: qi.color }} />
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-gray-400 pt-1">{exposureSummary.totalScored} scored farmers across {exposureSummary.cohortCount} cohorts</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No scored farmers yet — quadrant data will appear once FRI scores are recorded.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Norvi AI Insight Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cropguard-mint to-cropguard-forest rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Norvi AI Program Summary</h3>
                  <p className="text-xs text-gray-500">AI-generated overview of your program's farmers, governance, interventions, and recommended actions</p>
                </div>
              </div>
              <Button onClick={generateAIInsight} disabled={aiLoading} size="sm" className="h-8 text-xs gap-1.5">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiContent ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {aiError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {aiError}
              </div>
            )}

            {aiContent ? (
              <div className="space-y-4">
                {aiParagraphs.map((para, i) => {
                  const labels = ['Overview', 'Assessment', 'Recommendations'];
                  const icons = [Target, TrendingUp, Lightbulb];
                  const Icon = icons[i] ?? Brain;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-cropguard-forest" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{labels[i] ?? `Section ${i + 1}`}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{para}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !aiLoading && !aiError ? (
              <div className="text-center py-10 text-gray-400">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click "Generate" to get an AI-powered program overview</p>
              </div>
            ) : aiLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={drawerType !== null}
        onClose={() => setDrawerType(null)}
        title={drawerType ? drawerMeta[drawerType].title : ''}
        subtitle={drawerType ? drawerMeta[drawerType].subtitle : undefined}
        loading={drawerLoading}
      >
        {drawerType === 'farmers' ? <FarmerListContent farmers={drawerFarmers} />
          : drawerType === 'scored' ? <ScoredFarmerListContent farmers={drawerScored} />
          : drawerType === 'enrollments' ? <EnrollmentListContent enrollments={drawerEnrollments} />
          : drawerType === 'agents' ? <AgentListContent agents={drawerAgents} />
          : null}
      </Drawer>
    </div>
  );
}
