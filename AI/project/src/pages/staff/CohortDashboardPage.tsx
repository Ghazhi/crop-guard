import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, TrendingUp, ArrowUp, ArrowDown, Minus, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

interface CohortMeta {
  id:           string;
  name:         string;
  target_count: number;
  region_code:  string;
  district:     string;
  program_id:   string;
}

interface FarmerRow {
  id:        string;
  full_name: string;
  baseline_fri:  number | null;
  current_fri:   number | null;
  current_zone:  string | null;
  current_week:  number | null;
  trajectory:    'up' | 'down' | 'flat' | null;
  agent_name:    string | null;
}

interface AgentVerification {
  agent_name: string;
  total:      number;
  verified:   number;
  rate:       number;
}

interface WeekTrend {
  week: string;
  avg_fri: number;
  count:   number;
}

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#7C3AED',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#ca8a04',
  'Resilience Starter': '#dc2626',
};

function TrajectoryIcon({ t }: { t: 'up' | 'down' | 'flat' | null }) {
  if (t === 'up')   return <ArrowUp   className="w-3.5 h-3.5 text-emerald-600" />;
  if (t === 'down') return <ArrowDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
}

function ZoneBadge({ zone }: { zone: string | null }) {
  const color = zone ? ZONE_COLORS[zone] ?? '#6B7280' : '#6B7280';
  const short = zone?.replace('Resilience ', '') ?? '—';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {short}
    </span>
  );
}

export default function CohortDashboardPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();

  const [meta,    setMeta]    = useState<CohortMeta | null>(null);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [agentStats, setAgentStats] = useState<AgentVerification[]>([]);
  const [weekTrend,  setWeekTrend]  = useState<WeekTrend[]>([]);
  const [zoneData,   setZoneData]   = useState<{ zone: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!cohortId) return;

    const [{ data: cohortRaw }, { data: enrollRaw }] = await Promise.all([
      supabase.from('cohorts').select('id,name,target_count,region_code,district,program_id').eq('id', cohortId).maybeSingle(),
      supabase.from('enrollments')
        .select('farmer_id, status, farmers!inner(id,full_name,is_verified)')
        .eq('cohort_id', cohortId)
        .eq('status', 'active'),
    ]);

    if (!cohortRaw) { setLoading(false); return; }
    setMeta(cohortRaw as CohortMeta);

    const enrollments = (enrollRaw ?? []) as {
      farmer_id: string;
      status: string;
      farmers: { id: string; full_name: string; is_verified: boolean };
    }[];

    const farmerIds = enrollments.map(e => e.farmer_id);
    if (farmerIds.length === 0) { setLoading(false); return; }

    const { data: scoresRaw } = await (supabase.from('farmer_fri_scores') as any)
      .select('farmer_id,week_number,total_score,zone,is_provisional')
      .in('farmer_id', farmerIds)
      .order('week_number', { ascending: true });

    const scores = (scoresRaw ?? []) as {
      farmer_id: string; week_number: number; total_score: number; zone: string; is_provisional: boolean;
    }[];

    // Group by farmer — baseline = week 0, current = latest
    const farmerScoreMap = new Map<string, typeof scores>();
    scores.forEach(s => {
      const arr = farmerScoreMap.get(s.farmer_id) ?? [];
      arr.push(s);
      farmerScoreMap.set(s.farmer_id, arr);
    });

    const rows: FarmerRow[] = enrollments.map(e => {
      const fScores = farmerScoreMap.get(e.farmer_id) ?? [];
      const baseline = fScores.find(s => s.week_number === 0);
      const current  = fScores.length > 0 ? fScores[fScores.length - 1] : null;
      const bScore   = baseline?.total_score ?? null;
      const cScore   = current?.total_score ?? null;
      let trajectory: FarmerRow['trajectory'] = null;
      if (bScore !== null && cScore !== null) {
        trajectory = cScore > bScore + 5 ? 'up' : cScore < bScore - 5 ? 'down' : 'flat';
      }
      return {
        id:           e.farmer_id,
        full_name:    e.farmers.full_name,
        baseline_fri: bScore,
        current_fri:  cScore,
        current_zone: current?.zone ?? null,
        current_week: current?.week_number ?? null,
        trajectory,
        agent_name:   null,
      };
    });
    setFarmers(rows);

    // Zone distribution
    const zoneMap = new Map<string, number>();
    rows.forEach(r => { if (r.current_zone) zoneMap.set(r.current_zone, (zoneMap.get(r.current_zone) ?? 0) + 1); });
    setZoneData([...zoneMap.entries()].map(([zone, count]) => ({ zone, count })));

    // Week-by-week average FRI trend
    const weekMap = new Map<number, { sum: number; count: number }>();
    scores.forEach(s => {
      if (s.week_number === 0) return;
      const w = weekMap.get(s.week_number) ?? { sum: 0, count: 0 };
      w.sum   += s.total_score;
      w.count += 1;
      weekMap.set(s.week_number, w);
    });
    const trend: WeekTrend[] = [...weekMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([wk, { sum, count }]) => ({
        week:    `Wk ${wk}`,
        avg_fri: Math.round(sum / count),
        count,
      }));
    setWeekTrend(trend);

    setLoading(false);
  }, [cohortId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (!meta) return (
    <div className="p-6 text-center text-cropguard-slate">Cohort not found.</div>
  );

  const enrolledCount  = farmers.length;
  const avgFRI         = farmers.length > 0
    ? Math.round(farmers.filter(f => f.current_fri !== null).reduce((s, f) => s + (f.current_fri ?? 0), 0) / (farmers.filter(f => f.current_fri !== null).length || 1))
    : null;
  const upCount   = farmers.filter(f => f.trajectory === 'up').length;
  const downCount = farmers.filter(f => f.trajectory === 'down').length;
  const flatCount = farmers.filter(f => f.trajectory === 'flat').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">{meta.name}</h1>
          <p className="text-sm text-cropguard-slate">{meta.region_code} · {meta.district}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cropguard-dark flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-cropguard-forest">{enrolledCount} / {meta.target_count}</p>
              <p className="text-xs text-cropguard-slate">Enrolled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-cropguard-forest">{avgFRI !== null ? `${avgFRI}/100` : '—'}</p>
              <p className="text-xs text-cropguard-slate">Avg FRI Score</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-cropguard-slate mb-2">Trajectory</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <ArrowUp className="w-3 h-3" /><span className="font-semibold">{upCount}</span> improving
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Minus className="w-3 h-3" /><span className="font-semibold">{flatCount}</span> stable
              </div>
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <ArrowDown className="w-3 h-3" /><span className="font-semibold">{downCount}</span> declining
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-cropguard-slate mb-2">FRI Zone Distribution</p>
            <div className="space-y-1">
              {zoneData.map(({ zone, count }) => (
                <div key={zone} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{zone.replace('Resilience ', '')}</span>
                  <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: ZONE_COLORS[zone] ?? '#6B7280', color: '#fff', border: 'none' }}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Zone distribution bar chart */}
        {zoneData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-cropguard-forest">Zone Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={zoneData} barSize={40}>
                  <XAxis
                    dataKey="zone"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    tickFormatter={v => v.replace('Resilience ', '')}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#F0F7F4' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {zoneData.map(d => <Cell key={d.zone} fill={ZONE_COLORS[d.zone] ?? '#6B7280'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Week-by-week FRI trend */}
        {weekTrend.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-cropguard-forest">FRI Trend (Weekly Avg)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weekTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v: number) => [`${v}/100`, 'Avg FRI']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_fri"
                    stroke="#2E5E3E"
                    strokeWidth={2.5}
                    dot={{ fill: '#2E5E3E', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Farmer trajectory table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-cropguard-forest">Farmer Performance ({farmers.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Farmer</th>
                  <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Baseline</th>
                  <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Current</th>
                  <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Delta</th>
                  <th className="text-center py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Zone</th>
                  <th className="text-center py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {farmers.map(f => {
                  const delta = f.baseline_fri !== null && f.current_fri !== null
                    ? f.current_fri - f.baseline_fri : null;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-cropguard-forest">{f.full_name}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-600">
                        {f.baseline_fri !== null ? `${f.baseline_fri}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-cropguard-forest">
                        {f.current_fri !== null ? `${f.current_fri}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {delta !== null ? (
                          <span className={delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <ZoneBadge zone={f.current_zone} />
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex justify-center">
                          <TrajectoryIcon t={f.trajectory} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {farmers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No enrolled farmers with scores yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Agent verification rate */}
      {agentStats.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-cropguard-forest">Verification Rate by Agent</h3>
            <div className="space-y-3">
              {agentStats.map(a => (
                <div key={a.agent_name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700">{a.agent_name}</span>
                    <span className="text-gray-500">{a.verified}/{a.total} ({a.rate}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cropguard-green rounded-full transition-all" style={{ width: `${a.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
