import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users, ClipboardCheck, Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CROP_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CropDist {
  crop:  string;
  count: number;
}

interface ZoneDist {
  zone:  string;
  count: number;
}

interface WeeklyCheckins {
  week:  number;
  count: number;
}

const ZONE_COLORS: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#7f1d1d',
};

export default function AgronomistReportsPage() {
  const [cropDist,        setCropDist]        = useState<CropDist[]>([]);
  const [zoneDist,        setZoneDist]        = useState<ZoneDist[]>([]);
  const [weeklyCheckins,  setWeeklyCheckins]  = useState<WeeklyCheckins[]>([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {

      // Crop distribution
      const { data: farmers } = await supabase
        .from('farmers')
        .select('primary_crop');

      const cropMap: Record<string, number> = {};
      (farmers ?? []).forEach((f: any) => {
        const c = f.primary_crop ?? 'other';
        cropMap[c] = (cropMap[c] ?? 0) + 1;
      });
      setCropDist(
        Object.entries(cropMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([k, v]) => ({
            crop:  CROP_LABELS[k as keyof typeof CROP_LABELS] ?? k,
            count: v,
          }))
      );

      // Zone distribution from FRI scores
      const { data: fri } = await supabase
        .from('farmer_fri_scores')
        .select('zone')
        .order('created_at', { ascending: false })
        .limit(1000);

      const zoneMap: Record<string, number> = {};
      (fri ?? []).forEach((r: any) => {
        const z = r.zone ?? 'unknown';
        zoneMap[z] = (zoneMap[z] ?? 0) + 1;
      });
      setZoneDist(
        Object.entries(zoneMap).map(([zone, count]) => ({ zone, count }))
      );

      // Weekly check-ins (last 12 weeks)
      const { data: checkins } = await supabase
        .from('farmer_checkins')
        .select('week_number')
        .eq('status', 'approved')
        .order('week_number');

      const weekMap: Record<number, number> = {};
      (checkins ?? []).forEach((c: any) => {
        weekMap[c.week_number] = (weekMap[c.week_number] ?? 0) + 1;
      });
      setWeeklyCheckins(
        Object.entries(weekMap)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .slice(-12)
          .map(([w, c]) => ({ week: Number(w), count: c }))
      );

      } catch (err) {
        console.error('Agro reports load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Agronomic program performance and crop distribution analytics.</p>
      </div>

      {/* Weekly check-ins */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          Approved Check-ins by Week
        </h2>
        {loading
          ? <Skeleton className="h-48 w-full" />
          : weeklyCheckins.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">No data available.</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyCheckins} barSize={28}>
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={w => `W${w}`} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                    formatter={(v: number) => [v, 'Check-ins']}
                    labelFormatter={(l: number) => `Week ${l}`}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Crop distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            Crop Distribution
          </h2>
          {loading
            ? <Skeleton className="h-48 w-full" />
            : cropDist.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">No data.</p>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cropDist} layout="vertical" barSize={16}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="crop" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
                      formatter={(v: number) => [v, 'Farmers']}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
          }
        </div>

        {/* Risk zone distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Risk Zone Distribution
          </h2>
          {loading
            ? <Skeleton className="h-48 w-full" />
            : zoneDist.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">No FRI data yet.</p>
              : (
                <div className="space-y-3">
                  {zoneDist.map(z => {
                    const total = zoneDist.reduce((s, x) => s + x.count, 0);
                    const pct   = total > 0 ? (z.count / total) * 100 : 0;
                    return (
                      <div key={z.zone}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize font-medium text-gray-700">{z.zone}</span>
                          <span className="text-gray-500">{z.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: ZONE_COLORS[z.zone] ?? '#9ca3af',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
}
