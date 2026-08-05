import { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import {
  Brain, TrendingUp, AlertTriangle, BarChart2, Loader2,
  Sparkles, RefreshCw, AlertCircle, Lightbulb, Target,
  TrendingDown, CheckCircle, ArrowUpRight, Zap, CloudRain, Grid3x3,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const FRIDashboardPage      = lazy(() => import('@/pages/staff/FRIDashboardPage'));
const RiskIntelligencePage = lazy(() => import('@/pages/staff/RiskIntelligencePage'));
const ReportsPage           = lazy(() => import('@/pages/staff/ReportsPage'));
const ClimateExposureTab    = lazy(() => import('@/pages/staff/ClimateExposureTab'));
const RiskQuadrantTab       = lazy(() => import('@/pages/staff/RiskQuadrantTab'));
type IntelTab = 'overview' | 'fri' | 'risk' | 'climate' | 'quadrant' | 'reports';

const TABS: { key: IntelTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'AI Overview',        icon: Sparkles },
  { key: 'fri',      label: 'FRI Dashboard',       icon: TrendingUp },
  { key: 'risk',    label: 'Risk Intelligence',    icon: AlertTriangle },
  { key: 'climate', label: 'Climate Exposure',     icon: CloudRain },
  { key: 'quadrant', label: 'Risk Quadrant',       icon: Grid3x3 },
  { key: 'reports', label: 'Reports',             icon: BarChart2 },
];

// ── KPI types ──────────────────────────────────────────────────────────────────

interface IntelKPIs {
  totalFarmers:       number;
  scoredFarmers:      number;
  avgFri:             number | null;
  highRisk:           number;
  mediumRisk:         number;
  lowRisk:            number;
  checkinRate:        number;
  activeEnrollments:  number;
  helpRequests:       number;
  zoneDistribution:   { zone: string; count: number; color: string }[];
  weeklyTrend:        { week: string; avg: number; count: number }[];
  topRiskFactors:     { factor: string; count: number }[];
  regionBreakdown:    { region: string; avgFri: number; farmers: number; highRisk: number }[];
}

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#16a34a',
  'Resilience Builder': '#3b82f6',
  'Resilience Learner': '#f59e0b',
  'Resilience Starter': '#dc2626',
  low:    '#16a34a',
  medium: '#f59e0b',
  high:   '#dc2626',
};

const RISK_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#10b981',
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [tab, setTab] = useState<IntelTab>('overview');

  return (
    <div>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cropguard-forest to-cropguard-dark rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Intelligence</h1>
            <p className="text-sm text-gray-500">FRI scores, risk monitoring, reports & AI-powered insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.key ? 'bg-white text-cropguard-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && <AIOverview onJumpTab={setTab} />}
      {tab === 'fri' && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cropguard-mid" /></div>}>
          <FRIDashboardPage />
        </Suspense>
      )}
      {tab === 'risk' && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cropguard-mid" /></div>}>
          <RiskIntelligencePage />
        </Suspense>
      )}
      {tab === 'climate' && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cropguard-mid" /></div>}>
          <ClimateExposureTab />
        </Suspense>
      )}
      {tab === 'quadrant' && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cropguard-mid" /></div>}>
          <RiskQuadrantTab />
        </Suspense>
      )}
      {tab === 'reports' && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cropguard-mid" /></div>}>
          <ReportsPage />
        </Suspense>
      )}
    </div>
  );
}

// ── AI Overview ───────────────────────────────────────────────────────────────

function AIOverview({ onJumpTab }: { onJumpTab: (t: IntelTab) => void }) {
  const { profile } = useAuthStore();
  const orgId = profile?.organisation_id ?? '';
  const [kpis, setKpis] = useState<IntelKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadKPIs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [
        { count: totalFarmers },
        { data: orgFarmers },
        { data: enrollData },
      ] = await Promise.all([
        supabase.from('farmers').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
        supabase.from('farmers').select('id,region_code,current_fri_score,is_verified').eq('organisation_id', orgId).limit(500),
        (supabase.from('enrollments') as any).select('farmer_id,program_id,agent_id,status').eq('status', 'active'),
      ]);

      const farmerIds = (orgFarmers ?? []).map((f: any) => f.id);
      const activeEnrollments = new Set((enrollData ?? []).map((e: any) => e.farmer_id)).size;

      // FRI scores
      let scoreData: any[] = [];
      if (farmerIds.length > 0) {
        const { data: scores } = await (supabase.from('farmer_fri_scores') as any)
          .select('farmer_id,total_score,zone,week_number')
          .in('farmer_id', farmerIds.slice(0, 500))
          .order('week_number', { ascending: false });
        scoreData = scores ?? [];
      }

      const latestByFarmer: Record<string, any> = {};
      scoreData.forEach((s: any) => {
        if (!latestByFarmer[s.farmer_id] || s.week_number > latestByFarmer[s.farmer_id].week_number) {
          latestByFarmer[s.farmer_id] = s;
        }
      });

      const scoredFarmers = Object.keys(latestByFarmer).length;
      const allScores = Object.values(latestByFarmer).map((s: any) => Number(s.total_score));
      const avgFri = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

      // Risk classification
      const highRisk = allScores.filter(s => s < 40).length;
      const mediumRisk = allScores.filter(s => s >= 40 && s < 60).length;
      const lowRisk = allScores.filter(s => s >= 60).length;

      // Zone distribution
      const zoneCounts: Record<string, number> = {};
      Object.values(latestByFarmer).forEach((s: any) => {
        const zone = normalizeZone(s.zone);
        zoneCounts[zone] = (zoneCounts[zone] ?? 0) + 1;
      });
      const zoneDistribution = Object.entries(zoneCounts).map(([zone, count]) => ({
        zone, count, color: ZONE_COLORS[zone] ?? '#94a3b8',
      }));

      // Weekly trend
      const weekMap: Record<number, number[]> = {};
      scoreData.forEach((s: any) => {
        weekMap[s.week_number] = [...(weekMap[s.week_number] ?? []), Number(s.total_score)];
      });
      const weeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b).slice(-8);
      const weeklyTrend = weeks.map(w => ({
        week: `Wk ${w}`,
        avg: Math.round(weekMap[w].reduce((a, v) => a + v, 0) / weekMap[w].length),
        count: weekMap[w].length,
      }));

      // Check-in data
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCheckins } = await (supabase.from('farmer_checkins') as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      const { count: totalCheckins30 } = await (supabase.from('farmer_checkins') as any)
        .select('*', { count: 'exact', head: true });

      const { count: helpRequests } = await (supabase.from('farmer_checkins') as any)
        .select('*', { count: 'exact', head: true })
        .eq('help_requested', true);

      const checkinRate = totalFarmers > 0 ? Math.round((recentCheckins / totalFarmers) * 100) : 0;

      // Region breakdown
      const regionMap: Record<string, { friScores: number[]; farmers: number; highRisk: number }> = {};
      (orgFarmers ?? []).forEach((f: any) => {
        const region = f.region_code ?? 'Unknown';
        if (!regionMap[region]) regionMap[region] = { friScores: [], farmers: 0, highRisk: 0 };
        regionMap[region].farmers++;
        const score = latestByFarmer[f.id];
        if (score) {
          regionMap[region].friScores.push(Number(score.total_score));
          if (Number(score.total_score) < 40) regionMap[region].highRisk++;
        }
      });
      const regionBreakdown = Object.entries(regionMap).map(([region, data]) => ({
        region,
        avgFri: data.friScores.length > 0 ? Math.round(data.friScores.reduce((a, b) => a + b, 0) / data.friScores.length) : 0,
        farmers: data.farmers,
        highRisk: data.highRisk,
      })).sort((a, b) => b.farmers - a.farmers).slice(0, 6);

      // Top risk factors
      const topRiskFactors = [
        { factor: 'Low FRI Score (<40)',    count: highRisk },
        { factor: 'Below Avg FRI (40-60)',  count: mediumRisk },
        { factor: 'Help Requests',           count: helpRequests ?? 0 },
        { factor: 'No Recent Check-in',      count: Math.max(0, totalFarmers - recentCheckins) },
      ];

      setKpis({
        totalFarmers: totalFarmers ?? 0,
        scoredFarmers,
        avgFri,
        highRisk,
        mediumRisk,
        lowRisk,
        checkinRate,
        activeEnrollments,
        helpRequests: helpRequests ?? 0,
        zoneDistribution,
        weeklyTrend,
        topRiskFactors,
        regionBreakdown,
      });
    } catch (err) {
      console.error('KPI load error', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const generateAIInsight = useCallback(async () => {
    if (!orgId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/norvi-community-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          scope: 'organisation',
          scope_id: orgId,
          org_id: orgId,
          custom_prompt: 'Provide an intelligence overview covering FRI score trends, risk distribution, and recommended actions for the program team.',
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
  }, [orgId]);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  const aiParagraphs = aiContent?.split('\n').filter(p => p.trim()) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IntelKpiCard icon={TrendingUp}   label="Avg FRI Score"  value={kpis.avgFri ?? '—'} sub={`${kpis.scoredFarmers} scored`} color="bg-emerald-50 text-emerald-600" />
          <IntelKpiCard icon={AlertTriangle} label="High Risk"     value={kpis.highRisk}      sub="FRI < 40"                      color="bg-red-50 text-red-600" />
          <IntelKpiCard icon={CheckCircle}   label="Low Risk"      value={kpis.lowRisk}       sub="FRI >= 60"                     color="bg-emerald-50 text-emerald-600" />
          <IntelKpiCard icon={Zap}           label="Active Enrol."  value={kpis.activeEnrollments} sub="farmers"                    color="bg-blue-50 text-blue-600" />
          <IntelKpiCard icon={BarChart2}     label="Check-in Rate"  value={`${kpis.checkinRate}%`} sub="last 7 days"               color="bg-amber-50 text-amber-600" />
          <IntelKpiCard icon={AlertTriangle} label="Help Requests"  value={kpis.helpRequests}    sub="total"                       color="bg-orange-50 text-orange-600" />
          <IntelKpiCard icon={TrendingDown}  label="Medium Risk"    value={kpis.mediumRisk}       sub="FRI 40-59"                    color="bg-amber-50 text-amber-600" />
          <IntelKpiCard icon={CheckCircle}   label="Total Farmers"  value={kpis.totalFarmers}     sub="registered"                   color="bg-gray-50 text-gray-600" />
        </div>
      ) : null}

      {/* Zone distribution + Weekly trend */}
      {kpis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Zone distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">FRI Zone Distribution</h3>
            <div className="space-y-3">
              {kpis.zoneDistribution.length > 0 ? kpis.zoneDistribution.map(z => {
                const pct = kpis.scoredFarmers > 0 ? Math.round((z.count / kpis.scoredFarmers) * 100) : 0;
                return (
                  <div key={z.zone}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{z.zone}</span>
                      <span className="text-sm font-semibold text-gray-900">{z.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: z.color }} />
                    </div>
                  </div>
                );
              }) : <p className="text-sm text-gray-400 text-center py-4">No FRI scores recorded yet.</p>}
            </div>
          </div>

          {/* Weekly trend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Weekly FRI Score Trend</h3>
            {kpis.weeklyTrend.length > 0 ? (
              <div className="flex items-end gap-2 h-40">
                {kpis.weeklyTrend.map((w, i) => {
                  const maxAvg = Math.max(...kpis.weeklyTrend.map(t => t.avg), 1);
                  const heightPct = (w.avg / maxAvg) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-gray-700">{w.avg}</span>
                      <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden flex-1 flex items-end">
                        <div className="w-full bg-gradient-to-t from-cropguard-forest to-cropguard-mint rounded-t-lg transition-all" style={{ height: `${heightPct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{w.week}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-4">No weekly trend data yet.</p>}
          </div>
        </div>
      )}

      {/* Risk factors + Region breakdown */}
      {kpis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Risk Factors</h3>
            <div className="space-y-3">
              {kpis.topRiskFactors.map((r, i) => {
                const max = Math.max(...kpis.topRiskFactors.map(f => f.count), 1);
                const pct = (r.count / max) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{r.factor}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: RISK_COLORS.high }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Regional Breakdown</h3>
            <div className="space-y-2">
              {kpis.regionBreakdown.length > 0 ? kpis.regionBreakdown.map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-cropguard-forest">{r.region.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.region}</p>
                    <p className="text-xs text-gray-500">{r.farmers} farmers · {r.highRisk} high risk</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{r.avgFri || '—'}</span>
                </div>
              )) : <p className="text-sm text-gray-400 text-center py-4">No region data available.</p>}
            </div>
          </div>
        </div>
      )}

      {/* AI Insight Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cropguard-mint to-cropguard-forest rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Norvi AI Intelligence Summary</h3>
              <p className="text-xs text-gray-500">AI-generated overview of your program's FRI trends, risks, and recommended actions</p>
            </div>
          </div>
          <Button onClick={generateAIInsight} disabled={aiLoading} size="sm" className="h-8 text-xs gap-1.5">
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiContent ? 'Regenerate' : 'Generate AI Summary'}
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
            <p className="text-sm">Click "Generate AI Summary" to get an AI-powered intelligence overview</p>
          </div>
        ) : aiLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : null}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink icon={TrendingUp}  label="FRI Dashboard"     description="Detailed farmer FRI scores, trajectories, and pillar breakdowns" onClick={() => onJumpTab('fri')} />
        <QuickLink icon={AlertTriangle} label="Risk Intelligence" description="At-risk farmers, risk factors, and regional analysis"        onClick={() => onJumpTab('risk')} />
        <QuickLink icon={BarChart2}   label="Reports"            description="Generate and download AI-powered reports"                     onClick={() => onJumpTab('reports')} />
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────

function IntelKpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function QuickLink({ icon: Icon, label, description, onClick }: {
  icon: React.ElementType; label: string; description: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left transition-all hover:shadow-md hover:border-gray-200 group">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-cropguard-forest" />
        </div>
        <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-cropguard-forest transition-colors" />
      </div>
      <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </button>
  );
}

function normalizeZone(zone: string | null | undefined): string {
  if (!zone) return 'Resilience Starter';
  const z = zone.toLowerCase();
  if (z === 'low' || z === 'green' || z === 'resilience leader')  return 'Resilience Leader';
  if (z === 'medium' || z === 'blue' || z === 'resilience builder') return 'Resilience Builder';
  if (z === 'amber' || z === 'resilience learner')                  return 'Resilience Learner';
  if (z === 'high' || z === 'red' || z === 'critical' || z === 'resilience starter') return 'Resilience Starter';
  return zone.charAt(0).toUpperCase() + zone.slice(1);
}
