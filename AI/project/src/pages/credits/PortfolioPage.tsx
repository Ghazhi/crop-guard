import { useState, useEffect } from 'react';
import { ShieldCheck, Users, TrendingUp, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CROP_LABELS } from '@/lib/constants';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';

interface ZoneSummary {
  zone:    string;
  count:   number;
  avg_fri: number;
}

interface CropSummary {
  crop:  string;
  count: number;
  avg:   number;
}

interface CohortSummary {
  cohort: string;
  count:  number;
}

const ZONE_COLORS: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#7f1d1d',
};

const ZONE_LABELS: Record<string, string> = {
  low:      'Low Risk',
  medium:   'Medium Risk',
  high:     'High Risk',
  critical: 'Critical',
};

export default function CreditsPortfolioPage() {
  const [zoneSummary,   setZoneSummary]   = useState<ZoneSummary[]>([]);
  const [cropSummary,   setCropSummary]   = useState<CropSummary[]>([]);
  const [cohortSummary, setCohortSummary] = useState<CohortSummary[]>([]);
  const [totalFarmers,  setTotalFarmers]  = useState(0);
  const [totalEnrolled, setTotalEnrolled] = useState(0);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [farmersRes, friRes, enrollRes] = await Promise.all([
          supabase.from('farmers').select('id, primary_crop', { count: 'exact' }),
          supabase
            .from('farmer_fri_scores')
            .select('farmer_id, total_score, zone, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('enrollments')
            .select('farmer_id, cohorts(name)')
            .eq('status', 'active'),
        ]);

        setTotalFarmers(farmersRes.count ?? 0);
        setTotalEnrolled((enrollRes.data ?? []).length);

        // Latest FRI per farmer
        const seen = new Set<string>();
        const latest: any[] = [];
        for (const r of (friRes.data ?? [])) {
          if (seen.has(r.farmer_id)) continue;
          seen.add(r.farmer_id);
          latest.push(r);
        }

        // Zone summary
        const zoneGroups: Record<string, number[]> = {};
        latest.forEach(r => {
          const z = r.zone ?? 'unknown';
          if (!zoneGroups[z]) zoneGroups[z] = [];
          zoneGroups[z].push(Number(r.total_score));
        });
        setZoneSummary(
          ['low', 'medium', 'high', 'critical'].map(z => ({
            zone:    z,
            count:   zoneGroups[z]?.length ?? 0,
            avg_fri: zoneGroups[z]?.length
              ? zoneGroups[z].reduce((a, b) => a + b, 0) / zoneGroups[z].length
              : 0,
          })).filter(s => s.count > 0)
        );

        // Crop breakdown from farmers table
        const cropGroups: Record<string, number[]> = {};
        const friById: Record<string, number> = {};
        latest.forEach(r => { friById[r.farmer_id] = Number(r.total_score); });

        (farmersRes.data ?? []).forEach((f: any) => {
          const crop = f.primary_crop ?? 'other';
          if (!cropGroups[crop]) cropGroups[crop] = [];
          if (friById[f.id] != null) cropGroups[crop].push(friById[f.id]);
          else cropGroups[crop].push(0);
        });
        setCropSummary(
          Object.entries(cropGroups)
            .map(([crop, scores]) => ({
              crop:  CROP_LABELS[crop as keyof typeof CROP_LABELS] ?? crop,
              count: scores.length,
              avg:   parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
        );

        // Cohort breakdown
        const cohortGroups: Record<string, number> = {};
        (enrollRes.data ?? []).forEach((e: any) => {
          const name = (e.cohorts as any)?.name ?? 'Unassigned';
          cohortGroups[name] = (cohortGroups[name] ?? 0) + 1;
        });
        setCohortSummary(
          Object.entries(cohortGroups)
            .map(([cohort, count]) => ({ cohort, count }))
            .sort((a, b) => b.count - a.count)
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = zoneSummary.reduce((s, z) => s + z.count, 0);
  const pieData = zoneSummary.map(s => ({ name: ZONE_LABELS[s.zone] ?? s.zone, value: s.count }));

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        <p className="text-sm text-gray-500 mt-1">Risk distribution, crop breakdown, cohort activity, and enrollment coverage.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Farmers',    value: totalFarmers,  icon: Users,       color: 'bg-blue-50 text-blue-700'      },
          { label: 'Active Enrolled',  value: totalEnrolled, icon: Layers,      color: 'bg-emerald-50 text-emerald-700' },
          { label: 'FRI Scored',       value: total,         icon: TrendingUp,  color: 'bg-indigo-50 text-indigo-700'  },
          { label: 'Low Risk',         value: zoneSummary.find(z => z.zone === 'low')?.count ?? 0,
            icon: ShieldCheck, color: 'bg-green-50 text-green-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', color)}>
              <Icon className="w-5 h-5" />
            </div>
            {loading
              ? <Skeleton className="h-7 w-14 mb-1" />
              : <p className="text-2xl font-bold text-gray-900">{value}</p>
            }
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Zone cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Risk Zone Distribution</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            : ['low', 'medium', 'high', 'critical'].map(z => {
                const s = zoneSummary.find(x => x.zone === z);
                return (
                  <div key={z} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="w-3 h-3 rounded-full mb-3" style={{ backgroundColor: ZONE_COLORS[z] }} />
                    <p className="text-2xl font-bold text-gray-900">{s?.count ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ZONE_LABELS[z]}</p>
                    {s && s.avg_fri > 0 && (
                      <p className="text-xs text-gray-400 mt-1">Avg FRI {s.avg_fri.toFixed(1)}</p>
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Risk Distribution</h2>
          {loading
            ? <Skeleton className="h-56 w-full" />
            : pieData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">No data.</p>
              : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {pieData.map((_, i) => {
                          const zone = zoneSummary[i]?.zone ?? '';
                          return <Cell key={i} fill={ZONE_COLORS[zone] ?? '#9ca3af'} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                        formatter={(v: number) => [`${v} farmers`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 shrink-0">
                    {zoneSummary.map(s => (
                      <div key={s.zone} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ZONE_COLORS[s.zone] ?? '#9ca3af' }} />
                        <span className="text-gray-600">{ZONE_LABELS[s.zone] ?? s.zone}</span>
                        <span className="font-semibold text-gray-900 ml-auto">{total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
          }
        </div>

        {/* Crop breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Farmers by Crop</h2>
          {loading
            ? <Skeleton className="h-56 w-full" />
            : cropSummary.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">No data.</p>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cropSummary} layout="vertical" barSize={14}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="crop" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                      formatter={(v: number, name: string) => [v, name === 'count' ? 'Farmers' : 'Avg FRI']}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
          }
        </div>
      </div>

      {/* Cohort table */}
      {!loading && cohortSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Enrollment by Cohort
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {cohortSummary.map(c => (
              <div key={c.cohort} className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm font-medium text-gray-800">{c.cohort}</p>
                <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {c.count} farmer{c.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
