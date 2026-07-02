import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { REGION_LABELS, CROP_LABELS } from '@/lib/constants';

interface RegionSummary {
  region:     string;
  count:      number;
  avg_fri:    number;
  pct_low:    number;
}

interface WeekTrend {
  week:     number;
  avg_fri:  number;
  count:    number;
  checkins: number;
}

interface CropRisk {
  crop:    string;
  avg_fri: number;
  count:   number;
  low_pct: number;
}

export default function CreditsReportsPage() {
  const [regionData, setRegionData] = useState<RegionSummary[]>([]);
  const [trendData,  setTrendData]  = useState<WeekTrend[]>([]);
  const [cropData,   setCropData]   = useState<CropRisk[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [compliance, setCompliance] = useState<{ total: number; verified: number } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [friRes, farmersRes, checkinsRes] = await Promise.all([
          supabase
            .from('farmer_fri_scores')
            .select('farmer_id, total_score, zone, week_number, created_at')
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('farmers')
            .select('id, region_code, primary_crop'),
          supabase
            .from('farmer_checkins')
            .select('farmer_id, week_number, is_verified, created_at'),
        ]);

        const friAll = friRes.data ?? [];
        const farmerList = farmersRes.data ?? [];
        const checkinList = checkinsRes.data ?? [];

        // Checkin compliance
        const total    = checkinList.length;
        const verified = checkinList.filter((c: any) => c.is_verified).length;
        setCompliance({ total, verified });

        // Maps
        const regionMap: Record<string, string> = {};
        const cropMap:   Record<string, string> = {};
        farmerList.forEach((f: any) => {
          regionMap[f.id] = f.region_code;
          cropMap[f.id]   = f.primary_crop ?? 'other';
        });

        // Latest FRI per farmer
        const seen = new Set<string>();
        const latest: typeof friAll = [];
        for (const r of friAll) {
          if (seen.has(r.farmer_id)) continue;
          seen.add(r.farmer_id);
          latest.push(r);
        }

        // Region breakdown
        const regGroups: Record<string, { scores: number[]; low: number }> = {};
        latest.forEach(r => {
          const reg = regionMap[r.farmer_id] ?? 'unknown';
          if (!regGroups[reg]) regGroups[reg] = { scores: [], low: 0 };
          regGroups[reg].scores.push(Number(r.total_score));
          if (r.zone === 'low') regGroups[reg].low++;
        });
        setRegionData(
          Object.entries(regGroups)
            .map(([region, { scores, low }]) => ({
              region:  REGION_LABELS[region as keyof typeof REGION_LABELS] ?? region,
              count:   scores.length,
              avg_fri: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
              pct_low: parseFloat(((low / scores.length) * 100).toFixed(0)),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );

        // Crop risk breakdown
        const cropGroups: Record<string, { scores: number[]; low: number }> = {};
        latest.forEach(r => {
          const crop = cropMap[r.farmer_id] ?? 'other';
          if (!cropGroups[crop]) cropGroups[crop] = { scores: [], low: 0 };
          cropGroups[crop].scores.push(Number(r.total_score));
          if (r.zone === 'low') cropGroups[crop].low++;
        });
        setCropData(
          Object.entries(cropGroups)
            .map(([crop, { scores, low }]) => ({
              crop:    CROP_LABELS[crop as keyof typeof CROP_LABELS] ?? crop,
              count:   scores.length,
              avg_fri: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
              low_pct: parseFloat(((low / scores.length) * 100).toFixed(0)),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
        );

        // Weekly trend: avg FRI + checkin count per week
        const weekFri: Record<number, number[]> = {};
        friAll.forEach((r: any) => {
          if (!weekFri[r.week_number]) weekFri[r.week_number] = [];
          weekFri[r.week_number].push(Number(r.total_score));
        });
        const weekCheckins: Record<number, number> = {};
        checkinList.forEach((c: any) => {
          weekCheckins[c.week_number] = (weekCheckins[c.week_number] ?? 0) + 1;
        });
        const allWeeks = new Set([...Object.keys(weekFri), ...Object.keys(weekCheckins)].map(Number));
        setTrendData(
          [...allWeeks]
            .sort((a, b) => a - b)
            .slice(-14)
            .map(w => ({
              week:     w,
              avg_fri:  weekFri[w]?.length
                ? parseFloat((weekFri[w].reduce((a, b) => a + b, 0) / weekFri[w].length).toFixed(1))
                : 0,
              count:    weekFri[w]?.length ?? 0,
              checkins: weekCheckins[w] ?? 0,
            }))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const compliancePct = compliance && compliance.total > 0
    ? Math.round((compliance.verified / compliance.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Portfolio trends, regional risk, crop breakdown, and checkin compliance.</p>
      </div>

      {/* Compliance banner */}
      {!loading && compliance && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Checkin Verification Compliance</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {compliance.verified} of {compliance.total} check-ins verified by agents
            </p>
            <div className="mt-2 h-2 w-full max-w-xs bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${compliancePct}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-emerald-600">{compliancePct}%</p>
            <p className="text-xs text-gray-400">compliance rate</p>
          </div>
        </div>
      )}

      {/* Weekly FRI + checkin trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Weekly FRI Score & Checkin Activity
        </h2>
        {loading
          ? <Skeleton className="h-52 w-full" />
          : trendData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">No data available.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={w => `W${w}`} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} width={32} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                    labelFormatter={(l: number) => `Week ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="avg_fri"  name="Avg FRI"     stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                  <Line type="monotone" dataKey="checkins" name="Checkins"    stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Regional FRI breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Avg FRI by Region
          </h2>
          {loading
            ? <Skeleton className="h-52 w-full" />
            : regionData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">No data available.</p>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={regionData} layout="vertical" barSize={14}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="region" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                      formatter={(v: number, name: string) => [v, name === 'avg_fri' ? 'Avg FRI' : 'Farmers']}
                    />
                    <Bar dataKey="avg_fri" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
          }
        </div>

        {/* Crop risk */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            % Low-Risk by Crop
          </h2>
          {loading
            ? <Skeleton className="h-52 w-full" />
            : cropData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">No data available.</p>
              : (
                <div className="space-y-3">
                  {cropData.map(c => (
                    <div key={c.crop} className="flex items-center gap-3">
                      <p className="text-sm text-gray-700 w-24 shrink-0 truncate capitalize">{c.crop}</p>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${c.low_pct}%` }}
                        />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 w-10 text-right shrink-0">{c.low_pct}%</p>
                      <p className="text-xs text-gray-400 w-12 text-right shrink-0">{c.count} farmers</p>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      </div>

      {/* Region detail table */}
      {!loading && regionData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Regional Credit Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Region</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Farmers</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Avg FRI</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Low-Risk %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {regionData.map(r => (
                  <tr key={r.region} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{r.region}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{r.avg_fri}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.pct_low >= 50 ? 'bg-emerald-100 text-emerald-700' : r.pct_low >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {r.pct_low}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
