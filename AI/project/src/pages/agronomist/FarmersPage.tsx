import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGION_LABELS, CROP_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface FarmerRow {
  id:               string;
  full_name:        string;
  phone:            string;
  region_code:      string;
  primary_crop:     string | null;
  farm_size_ha:     number | null;
  fri_score:        number | null;
  zone:             string | null;
  baseline_done:    boolean;
  checkins_done:    number;
}

const ZONE_STYLE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

export default function AgronomistFarmersPage() {
  const [farmers,    setFarmers]    = useState<FarmerRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('farmers')
        .select('id, full_name, phone, region_code, primary_crop, total_farm_size_ha')
        .order('full_name')
        .limit(150);

      if (query.trim()) q = q.ilike('full_name', `%${query.trim()}%`);

      const { data: farmerData } = await q;
      const ids = (farmerData ?? []).map((f: any) => f.id);
      if (!ids.length) { setFarmers([]); setLoading(false); return; }

      const [friRes, baselineRes, checkinsRes] = await Promise.all([
        supabase
          .from('farmer_fri_scores')
          .select('farmer_id, total_score, zone, created_at')
          .in('farmer_id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('baseline_assessments')
          .select('farmer_id')
          .in('farmer_id', ids)
          .eq('is_active', true),
        supabase
          .from('farmer_checkins')
          .select('farmer_id')
          .in('farmer_id', ids)
          .eq('is_verified', true),
      ]);

      const friMap: Record<string, any> = {};
      (friRes.data ?? []).forEach((r: any) => {
        if (!friMap[r.farmer_id]) friMap[r.farmer_id] = r;
      });

      const baselineSet = new Set((baselineRes.data ?? []).map((b: any) => b.farmer_id));
      const checkinCount: Record<string, number> = {};
      (checkinsRes.data ?? []).forEach((c: any) => {
        checkinCount[c.farmer_id] = (checkinCount[c.farmer_id] ?? 0) + 1;
      });

      let rows: FarmerRow[] = (farmerData ?? []).map((f: any) => ({
        id:            f.id,
        full_name:     f.full_name,
        phone:         f.phone,
        region_code:   f.region_code,
        primary_crop:  f.primary_crop,
        farm_size_ha:  f.total_farm_size_ha,
        fri_score:     friMap[f.id]?.total_score != null ? Number(friMap[f.id].total_score) : null,
        zone:          friMap[f.id]?.zone ?? null,
        baseline_done: baselineSet.has(f.id),
        checkins_done: checkinCount[f.id] ?? 0,
      }));

      if (zoneFilter !== 'all') rows = rows.filter(r => r.zone === zoneFilter);
      setFarmers(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, zoneFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Farmers</h1>
        <p className="text-sm text-gray-500 mt-1">Agronomic profiles, FRI scores, and check-in activity.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search farmers…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Risk zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Farmer</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Region</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Crop / Area</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">FRI</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Zone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Check-ins</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-8" /></td>
                    <td />
                  </tr>
                ))
              : farmers.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No farmers found.</p>
                    </td>
                  </tr>
                )
                : farmers.map(f => (
                    <tr
                      key={f.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/farmer/${f.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {(f as any).photo_url
                              ? <img src={(f as any).photo_url} alt={f.full_name} className="w-full h-full object-cover" />
                              : <span className="text-emerald-700 text-xs font-bold">{f.full_name.charAt(0)}</span>}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{f.full_name}</p>
                            <p className="text-xs text-gray-400">{f.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 hidden sm:table-cell">
                        {REGION_LABELS[f.region_code as keyof typeof REGION_LABELS] ?? f.region_code ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-gray-700 capitalize">
                          {CROP_LABELS[f.primary_crop as keyof typeof CROP_LABELS] ?? f.primary_crop ?? '—'}
                        </p>
                        {f.farm_size_ha != null && (
                          <p className="text-xs text-gray-400">{f.farm_size_ha} ha</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800">
                        {f.fri_score != null ? f.fri_score.toFixed(1) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {f.zone
                          ? <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize', ZONE_STYLE[f.zone] ?? 'bg-gray-100 text-gray-500')}>{f.zone}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className={cn('text-xs font-semibold', f.checkins_done > 0 ? 'text-emerald-600' : 'text-gray-400')}>
                          {f.checkins_done}
                        </span>
                      </td>
                      <td className="pr-4">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
