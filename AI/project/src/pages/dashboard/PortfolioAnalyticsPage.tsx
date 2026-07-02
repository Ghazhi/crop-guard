import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  type ZoneMigration, type InterventionUptake,
  type AgentVerificationQuality, type RiskByGeo, type CohortFriTrend,
  ZONE_COLORS,
} from '@/components/intelligence/types';

const ZONES = ['Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter'];

interface Program { id: string; name: string }
interface Cohort  { id: string; name: string; program_id: string }

export default function PortfolioAnalyticsPage() {
  const navigate = useNavigate();
  const [programs,  setPrograms]  = useState<Program[]>([]);
  const [cohorts,   setCohorts]   = useState<Cohort[]>([]);
  const [progId,    setProgId]    = useState('');
  const [cohortId,  setCohortId]  = useState('');
  const [migration, setMigration] = useState<ZoneMigration[]>([]);
  const [uptake,    setUptake]    = useState<InterventionUptake[]>([]);
  const [agentQual, setAgentQual] = useState<AgentVerificationQuality[]>([]);
  const [riskGeo,   setRiskGeo]   = useState<RiskByGeo[]>([]);
  const [trend,     setTrend]     = useState<CohortFriTrend[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    supabase.from('programs').select('id,name').eq('is_active', true).then(({ data }) => {
      const list = (data ?? []) as Program[];
      setPrograms(list);
      if (list.length > 0) setProgId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!progId) return;
    supabase.from('cohorts').select('id,name,program_id').eq('program_id', progId).eq('is_active', true)
      .then(({ data }) => setCohorts((data ?? []) as Cohort[]));
    setCohortId('');
  }, [progId]);

  const load = useCallback(async () => {
    setLoading(true);
    const pid = progId  || null;
    const cid = cohortId || null;
    const [migRes, uptakeRes, agentRes, geoRes, trendRes] = await Promise.all([
      supabase.rpc('get_zone_migration',              { p_program_id: pid, p_cohort_id: cid } as never),
      supabase.rpc('get_intervention_uptake',         { p_program_id: pid } as never),
      supabase.rpc('get_agent_verification_quality',  { p_program_id: pid } as never),
      supabase.rpc('get_risk_by_geography',           { p_program_id: pid, p_zone_filter: 'Resilience Starter' } as never),
      supabase.rpc('get_cohort_fri_trend',            { p_cohort_id: cid, p_program_id: pid } as never),
    ]);
    setMigration((migRes.data ?? []) as ZoneMigration[]);
    setUptake((uptakeRes.data ?? []) as InterventionUptake[]);
    setAgentQual((agentRes.data ?? []) as AgentVerificationQuality[]);
    setRiskGeo((geoRes.data ?? []) as RiskByGeo[]);
    setTrend((trendRes.data ?? []) as CohortFriTrend[]);
    setLoading(false);
  }, [progId, cohortId]);

  useEffect(() => { if (progId) load(); }, [load, progId, cohortId]);

  // Zone migration matrix
  const migrationMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    ZONES.forEach(fz => {
      matrix[fz] = {};
      ZONES.forEach(tz => { matrix[fz][tz] = 0; });
    });
    migration.forEach(m => {
      if (matrix[m.from_zone]) matrix[m.from_zone][m.to_zone] = m.farmer_count;
    });
    return matrix;
  }, [migration]);

  const trendChartData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const w = trend.find(t => t.week_number === i + 1);
      return { week: `W${i + 1}`, final: w?.avg_fri_final ?? null, provisional: w?.avg_fri_provisional ?? null };
    }),
    [trend]
  );

  const geoChartData = useMemo(() =>
    riskGeo.slice(0, 12).map(g => ({
      name: g.community ?? g.district ?? '—',
      count: g.farmer_count,
      avg: g.avg_fri,
    })),
    [riskGeo]
  );

  const filteredCohorts = cohorts.filter(c => c.program_id === progId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Analytics</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={progId}
            onChange={e => setProgId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={cohortId}
            onChange={e => setCohortId(e.target.value)}
            disabled={filteredCohorts.length === 0}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">All Cohorts</option>
            {filteredCohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Portfolio Health Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Portfolio FRI Trend (Current Season)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-52 w-full" /> :
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 2" />
                <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="4 2" />
                <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="final" name="Final" stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="provisional" name="Provisional" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          }
        </CardContent>
      </Card>

      {/* Zone Migration Matrix */}
      <Card>
        <CardHeader><CardTitle className="text-base">Zone Migration: Baseline → Current Season</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      From → To
                    </th>
                    {ZONES.map(z => (
                      <th key={z} className="px-4 py-3 text-center text-xs font-semibold" style={{ color: ZONE_COLORS[z] ?? '#6b7280' }}>
                        {z.replace('Resilience ', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ZONES.map((fromZ, fi) => (
                    <tr key={fromZ} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-xs" style={{ color: ZONE_COLORS[fromZ] ?? '#6b7280' }}>
                        {fromZ.replace('Resilience ', '')}
                      </td>
                      {ZONES.map((toZ, ti) => {
                        const count = migrationMatrix[fromZ]?.[toZ] ?? 0;
                        const isDiag = fi === ti;
                        const isUp   = ti < fi;
                        return (
                          <td
                            key={toZ}
                            className={cn(
                              'px-4 py-3 text-center font-bold text-sm',
                              count === 0 ? 'text-gray-200' : isDiag ? 'text-gray-700 bg-gray-50' :
                              isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                            )}
                          >
                            {count > 0 ? count : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 px-4 py-2">
                <span className="text-emerald-600 font-medium">Green</span> = improvement · <span className="text-red-500 font-medium">Red</span> = decline · Gray = no change
              </p>
            </div>
          }
        </CardContent>
      </Card>

      {/* Intervention Uptake */}
      <Card>
        <CardHeader><CardTitle className="text-base">Intervention Uptake</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> :
            uptake.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No active interventions.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Intervention', 'Type', 'Enrolled', 'Approved', 'Delivered', '% Eligible Enrolled', 'Avg FRI'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uptake.map(u => {
                        const pctEnrolled = u.enrolled_count > 0 ? Math.round((u.enrolled_count / Math.max(u.enrolled_count, 1)) * 100) : 0;
                        return (
                          <tr key={u.intervention_id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/dashboard?filter_intervention=${u.intervention_id}`)}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{u.intervention_name}</td>
                            <td className="px-4 py-3 text-gray-600">{u.intervention_type}</td>
                            <td className="px-4 py-3 font-medium">{u.enrolled_count}</td>
                            <td className="px-4 py-3 text-emerald-600 font-medium">{u.approved_count}</td>
                            <td className="px-4 py-3 text-blue-600 font-medium">{u.delivered_count}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pctEnrolled}%` }} />
                                </div>
                                <span className="text-xs text-gray-600">{pctEnrolled}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700 font-medium">
                              {u.avg_fri?.toFixed(1) ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
          }
        </CardContent>
      </Card>

      {/* Risk by Geography */}
      <Card>
        <CardHeader><CardTitle className="text-base">Risk Concentration (Zone 4 by Community)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> :
            geoChartData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No Zone 4 farmers.</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={geoChartData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v: number) => [`${v} farmers`, 'Count']} />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
          }
        </CardContent>
      </Card>

      {/* Agent Verification Quality */}
      <Card>
        <CardHeader><CardTitle className="text-base">Agent Verification Quality</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> :
            agentQual.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No agent data.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Agent', 'Assigned', 'Verified', 'Total', 'Rate %', 'Final', 'Provisional'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {agentQual.map(a => (
                        <tr
                          key={a.agent_id}
                          className={cn(
                            'border-b border-gray-50',
                            a.verification_rate < 40 ? 'bg-red-50/40' :
                            a.verification_rate < 60 ? 'bg-amber-50/30' : ''
                          )}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{a.agent_name}</td>
                          <td className="px-4 py-3 text-gray-600">{a.assigned_farmers}</td>
                          <td className="px-4 py-3 text-gray-600">{a.checkins_verified}</td>
                          <td className="px-4 py-3 text-gray-600">{a.total_checkins}</td>
                          <td className="px-4 py-3">
                            <span className={cn('font-bold text-sm',
                              a.verification_rate >= 80 ? 'text-emerald-600' :
                              a.verification_rate >= 60 ? 'text-amber-600' : 'text-red-600'
                            )}>
                              {a.verification_rate?.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">{a.final_count}</td>
                          <td className="px-4 py-3 text-amber-600 font-medium">{a.provisional_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 px-4 py-2">
                    <span className="text-amber-600 font-medium">Amber</span> = &lt;60% · <span className="text-red-500 font-medium">Red</span> = &lt;40%
                  </p>
                </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
