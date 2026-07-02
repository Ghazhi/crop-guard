import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, TrendingUp, ShieldCheck, Zap, RefreshCw, Download, ChevronDown, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ZoneBadge, TrajectoryBadge, ScoreStatusBadge,
} from '@/components/intelligence/Badges';
import {
  ZONE_COLORS, TRAJECTORY_COLORS,
  type PortfolioKPIs, type ZoneDistribution, type TrajectoryDistribution,
  type CohortFriTrend,
} from '@/components/intelligence/types';

// ── Local types ───────────────────────────────────────────────────────────────

interface RiskFlag {
  id:          string;
  farmer_id:   string;
  flag_type:   string;
  severity:    string;
  description: string;
  is_resolved: boolean;
  created_at:  string;
  farmers?:    { full_name: string; national_id: string } | null;
}

interface Program { id: string; name: string }
interface Cohort  { id: string; name: string; program_id: string }

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, loading, colorClass, bgClass,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', bgClass)}>
          <Icon className={cn('w-4 h-4', colorClass)} />
        </div>
        {loading
          ? <Skeleton className="h-8 w-20 mb-1" />
          : <p className="text-2xl font-bold text-gray-900">{value}</p>
        }
        {sub && !loading && (
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        )}
        <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioOverviewPage() {
  const navigate = useNavigate();
  const [programs, setPrograms]     = useState<Program[]>([]);
  const [cohorts,  setCohorts]      = useState<Cohort[]>([]);
  const [progId,   setProgId]       = useState<string>('');
  const [cohortId, setCohortId]     = useState<string>('');
  const [kpis,     setKpis]         = useState<PortfolioKPIs | null>(null);
  const [zones,    setZones]         = useState<ZoneDistribution[]>([]);
  const [traj,     setTraj]         = useState<TrajectoryDistribution[]>([]);
  const [trend,    setTrend]        = useState<CohortFriTrend[]>([]);
  const [flags,    setFlags]        = useState<RiskFlag[]>([]);
  const [loading,  setLoading]      = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load programs
  useEffect(() => {
    supabase.from('programs').select('id,name').eq('is_active', true)
      .then(({ data }) => {
        const list = (data ?? []) as Program[];
        setPrograms(list);
        if (list.length > 0) setProgId(list[0].id);
      });
  }, []);

  // Load cohorts when program changes
  useEffect(() => {
    if (!progId) return;
    supabase.from('cohorts').select('id,name,program_id').eq('program_id', progId).eq('is_active', true)
      .then(({ data }) => setCohorts((data ?? []) as Cohort[]));
    setCohortId('');
  }, [progId]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const pid = progId  || undefined;
    const cid = cohortId || undefined;

    const [kpiRes, zoneRes, trajRes, trendRes] = await Promise.all([
      supabase.rpc('get_portfolio_kpis',         { p_program_id: pid ?? null, p_cohort_id: cid ?? null } as never),
      supabase.rpc('get_zone_distribution',      { p_program_id: pid ?? null, p_cohort_id: cid ?? null } as never),
      supabase.rpc('get_trajectory_distribution',{ p_program_id: pid ?? null, p_cohort_id: cid ?? null } as never),
      supabase.rpc('get_cohort_fri_trend',       { p_cohort_id: cid ?? null, p_program_id: pid ?? null } as never),
    ]);

    if (kpiRes.data)  setKpis((kpiRes.data as PortfolioKPIs[])[0] ?? null);
    if (zoneRes.data) setZones(zoneRes.data as ZoneDistribution[]);
    if (trajRes.data) setTraj(trajRes.data as TrajectoryDistribution[]);
    if (trendRes.data) setTrend(trendRes.data as CohortFriTrend[]);

    // Active risk flags
    if (pid) {
      const { data: farmerData } = await supabase
        .rpc('get_portfolio_farmers', { p_program_id: pid ?? null, p_cohort_id: cid ?? null } as never);
      const ids = ((farmerData ?? []) as { farmer_id: string }[]).map(f => f.farmer_id);
      if (ids.length > 0) {
        const { data: flagData } = await (supabase as any)
          .from('risk_flags')
          .select('id,farmer_id,flag_type,severity,description,is_resolved,created_at,farmers(full_name,national_id)')
          .eq('is_resolved', false)
          .in('farmer_id', ids.slice(0, 100))
          .order('severity', { ascending: false })
          .limit(20);
        setFlags((flagData ?? []) as RiskFlag[]);
      }
    }

    setLastUpdated(new Date());
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [progId, cohortId]);

  useEffect(() => { if (progId) load(); }, [load, progId, cohortId]);

  const filteredCohorts = useMemo(
    () => cohorts.filter(c => !progId || c.program_id === progId),
    [cohorts, progId]
  );

  const zoneChartData = useMemo(() =>
    zones.map(z => ({
      name:  z.zone.replace('Resilience ', ''),
      count: z.farmer_count,
      avg:   z.avg_fri,
      fill:  ZONE_COLORS[z.zone] ?? '#9ca3af',
    })),
    [zones]
  );

  const trendChartData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const w = trend.find(t => t.week_number === i + 1);
      return {
        week: `W${i + 1}`,
        final: w?.avg_fri_final ?? null,
        provisional: w?.avg_fri_provisional ?? null,
      };
    }),
    [trend]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CropGuard Intelligence Dashboard</h1>
          {lastUpdated && !loading && kpis && (
            <p className="text-xs text-gray-400 mt-1">
              Scores last updated: {lastUpdated.toLocaleString()} —{' '}
              <span className="text-emerald-600 font-medium">{kpis.final_count ?? 0} Final</span>
              {', '}
              <span className="text-amber-600 font-medium">{kpis.provisional_count ?? 0} Provisional</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <button className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-2 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</label>
          <div className="relative">
            <select
              value={progId}
              onChange={e => setProgId(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort</label>
          <div className="relative">
            <select
              value={cohortId}
              onChange={e => setCohortId(e.target.value)}
              disabled={filteredCohorts.length === 0}
              className="pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              <option value="">All Cohorts</option>
              {filteredCohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Enrolled" loading={loading}
          value={kpis?.enrolled_count ?? 0}
          sub={`${kpis?.final_count ?? 0} Final + ${kpis?.provisional_count ?? 0} Prov.`}
          icon={Users} colorClass="text-slate-600" bgClass="bg-slate-100"
        />
        <KpiCard
          label="Average FRI" loading={loading}
          value={
            <span className={
              (kpis?.avg_fri ?? 0) >= 60 ? 'text-emerald-600' :
              (kpis?.avg_fri ?? 0) >= 40 ? 'text-amber-600' : 'text-red-600'
            }>
              {kpis?.avg_fri?.toFixed(1) ?? '—'}
            </span>
          }
          sub={
            (kpis?.avg_fri ?? 0) >= 80 ? 'Resilience Leader' :
            (kpis?.avg_fri ?? 0) >= 60 ? 'Resilience Builder' :
            (kpis?.avg_fri ?? 0) >= 40 ? 'Resilience Learner' : 'Resilience Starter'
          }
          icon={TrendingUp}
          colorClass={(kpis?.avg_fri ?? 0) >= 60 ? 'text-emerald-600' : (kpis?.avg_fri ?? 0) >= 40 ? 'text-amber-600' : 'text-red-600'}
          bgClass={(kpis?.avg_fri ?? 0) >= 60 ? 'bg-emerald-50' : (kpis?.avg_fri ?? 0) >= 40 ? 'bg-amber-50' : 'bg-red-50'}
        />
        <KpiCard
          label="Verification Rate" loading={loading}
          value={`${kpis?.verification_rate?.toFixed(0) ?? 0}%`}
          sub={`${kpis?.final_count ?? 0} of ${((kpis?.final_count ?? 0) + (kpis?.provisional_count ?? 0))} verified`}
          icon={ShieldCheck}
          colorClass={(kpis?.verification_rate ?? 0) >= 80 ? 'text-emerald-600' : (kpis?.verification_rate ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'}
          bgClass={(kpis?.verification_rate ?? 0) >= 80 ? 'bg-emerald-50' : (kpis?.verification_rate ?? 0) >= 60 ? 'bg-amber-50' : 'bg-red-50'}
        />
        <KpiCard
          label="Opportunity Ready" loading={loading}
          value={kpis?.opportunity_ready ?? 0}
          sub={kpis ? `${Math.round(((kpis.opportunity_ready ?? 0) / Math.max(kpis.enrolled_count, 1)) * 100)}% of enrolled` : undefined}
          icon={Zap} colorClass="text-emerald-600" bgClass="bg-emerald-50"
        />
      </div>

      {/* Zone Distribution + Trajectory */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Zone Distribution</CardTitle></CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-48 w-full" />
              : <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={zoneChartData} margin={{ bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number, _n, props) => [
                          `${v} farmers (avg FRI: ${props.payload.avg})`,
                          props.payload.name + ' Zone'
                        ]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {zoneChartData.map((entry, i) => (
                          <rect key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 divide-y divide-gray-50">
                    {zones.map(z => (
                      <div key={z.zone} className="flex items-center justify-between py-2 text-sm">
                        <ZoneBadge zone={z.zone} />
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span><b className="text-gray-900">{z.farmer_count}</b> farmers</span>
                          <span>avg FRI <b className="text-gray-900">{z.avg_fri?.toFixed(1)}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Trajectory Distribution</CardTitle></CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-48 w-full" />
              : <div className="space-y-3 pt-2">
                  {traj.map(t => {
                    const total = traj.reduce((s, x) => s + x.farmer_count, 0);
                    const pct = total > 0 ? Math.round((t.farmer_count / total) * 100) : 0;
                    return (
                      <div key={t.trajectory} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <TrajectoryBadge trajectory={t.trajectory} />
                          <span className="text-xs text-gray-500">
                            <b className="text-gray-800">{t.farmer_count}</b> farmers · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: TRAJECTORY_COLORS[t.trajectory] ?? '#9ca3af',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {traj.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No data available.</p>}
                </div>
            }
          </CardContent>
        </Card>
      </div>

      {/* Weekly FRI Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly FRI Trend (Current Season)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading
            ? <Skeleton className="h-56 w-full" />
            : <ResponsiveContainer width="100%" height={230}>
                <LineChart data={trendChartData} margin={{ right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number | null, name: string) =>
                      v != null ? [`${v.toFixed(1)}`, name] : ['—', name]
                    }
                  />
                  <Legend />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 2" label={{ value: 'Z1', position: 'right', fontSize: 10 }} />
                  <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="4 2" label={{ value: 'Z2', position: 'right', fontSize: 10 }} />
                  <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Z3', position: 'right', fontSize: 10 }} />
                  <Line
                    type="monotone" dataKey="final"
                    name="Final" stroke="#10b981" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone" dataKey="provisional"
                    name="Provisional" stroke="#f59e0b" strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3, fill: '#f59e0b' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
          }
        </CardContent>
      </Card>

      {/* Active Risk Flags */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Active Risk Flags
          </CardTitle>
          <ScoreStatusBadge status={null} />
        </CardHeader>
        <CardContent className="p-0">
          {loading
            ? <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : flags.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No active risk flags.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Farmer', 'Flag Type', 'Severity', 'Description', 'Triggered'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flags.map(f => (
                        <tr
                          key={f.id}
                          className={cn(
                            'border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors',
                            f.severity === 'high' ? 'bg-red-50/30' : 'bg-amber-50/20'
                          )}
                          onClick={() => navigate(`/staff/fri/farmer/${f.farmer_id}`)}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{(f.farmers as any)?.full_name ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{f.flag_type}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              f.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            )}>
                              {f.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{f.description}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(f.created_at).toLocaleDateString('en-GB')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
