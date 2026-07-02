import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, ChevronRight, Layers, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGION_LABELS, CROP_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PathwayRow {
  id:            string;
  farmer_id:     string;
  full_name:     string;
  phone:         string;
  region_code:   string;
  primary_crop:  string | null;
  type:          'enrollment' | 'intervention';
  label:         string;
  sub_label:     string | null;
  status:        string;
  fri_score:     number | null;
  zone:          string | null;
  created_at:    string;
}

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  inactive:  'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
  Active:    'bg-emerald-100 text-emerald-700',
  Draft:     'bg-gray-100 text-gray-500',
  Closed:    'bg-red-100 text-red-700',
  Suspended: 'bg-amber-100 text-amber-700',
};

const ZONE_STYLE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

export default function CreditsApplicationsPage() {
  const [rows,       setRows]       = useState<PathwayRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enrollRes, catalogRes, farmersRes, friRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id, farmer_id, status, created_at, programs(name), cohorts(name)')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('interventions_catalog')
          .select('id, name, type, status, min_fri, program_id, programs(name)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('farmers')
          .select('id, full_name, phone, region_code, primary_crop'),
        supabase
          .from('farmer_fri_scores')
          .select('farmer_id, total_score, zone, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      const farmerMap: Record<string, any> = {};
      (farmersRes.data ?? []).forEach((f: any) => { farmerMap[f.id] = f; });

      // Latest FRI per farmer
      const friMap: Record<string, any> = {};
      (friRes.data ?? []).forEach((r: any) => {
        if (!friMap[r.farmer_id]) friMap[r.farmer_id] = r;
      });

      const result: PathwayRow[] = [];

      // Enrollments
      (enrollRes.data ?? []).forEach((e: any) => {
        const f = farmerMap[e.farmer_id];
        if (!f) return;
        const fri = friMap[e.farmer_id];
        result.push({
          id:           e.id,
          farmer_id:    e.farmer_id,
          full_name:    f.full_name,
          phone:        f.phone,
          region_code:  f.region_code,
          primary_crop: f.primary_crop,
          type:         'enrollment',
          label:        (e.programs as any)?.name ?? 'Program Enrollment',
          sub_label:    (e.cohorts as any)?.name ?? null,
          status:       e.status,
          fri_score:    fri ? Number(fri.total_score) : null,
          zone:         fri?.zone ?? null,
          created_at:   e.created_at,
        });
      });

      // For each intervention in catalog, match enrolled farmers who meet min_fri
      const enrolledFarmerIds = new Set((enrollRes.data ?? []).map((e: any) => e.farmer_id));
      (catalogRes.data ?? []).forEach((iv: any) => {
        enrolledFarmerIds.forEach(fid => {
          const f = farmerMap[fid];
          if (!f) return;
          const fri = friMap[fid];
          const score = fri ? Number(fri.total_score) : null;
          if (score == null) return;
          if (iv.min_fri != null && score < iv.min_fri) return;
          result.push({
            id:           `${iv.id}-${fid}`,
            farmer_id:    fid,
            full_name:    f.full_name,
            phone:        f.phone,
            region_code:  f.region_code,
            primary_crop: f.primary_crop,
            type:         'intervention',
            label:        iv.name,
            sub_label:    `${iv.type}${iv.programs?.name ? ` · ${iv.programs.name}` : ''}`,
            status:       iv.status,
            fri_score:    score,
            zone:         fri?.zone ?? null,
            created_at:   iv.created_at ?? '',
          });
        });
      });

      let filtered = result;
      if (typeFilter === 'enrollment')   filtered = result.filter(r => r.type === 'enrollment');
      if (typeFilter === 'intervention') filtered = result.filter(r => r.type === 'intervention');
      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(r => r.full_name.toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
      }

      filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setRows(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const enrollCount     = rows.filter(r => r.type === 'enrollment').length;
  const interventionCnt = rows.filter(r => r.type === 'intervention').length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opportunity Pathways</h1>
        <p className="text-sm text-gray-500 mt-1">
          All program enrollments and eligible intervention opportunities across the farmer portfolio.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'All Pathways',    value: enrollCount + interventionCnt, filter: 'all',          icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'Enrollments',     value: enrollCount,                   filter: 'enrollment',   icon: Layers,   color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Interventions',   value: interventionCnt,               filter: 'intervention', icon: Zap,      color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, filter, icon: Icon, color }) => (
          <button
            key={filter}
            onClick={() => setTypeFilter(typeFilter === filter ? 'all' : filter)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all flex items-center gap-4',
              typeFilter === filter
                ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300'
                : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
            )}
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search farmer or pathway…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="enrollment">Enrollments</SelectItem>
            <SelectItem value="intervention">Interventions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Farmer</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Region</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Pathway</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">FRI / Zone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td />
                  </tr>
                ))
              : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No pathways found.</p>
                    </td>
                  </tr>
                )
                : rows.map(r => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/farmer/${r.farmer_id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-blue-700 text-xs font-bold">{r.full_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{r.full_name}</p>
                            <p className="text-xs text-gray-400">{r.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 hidden sm:table-cell text-sm">
                        {REGION_LABELS[r.region_code as keyof typeof REGION_LABELS] ?? r.region_code ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900 text-sm">{r.label}</p>
                        {r.sub_label && <p className="text-xs text-gray-400 mt-0.5">{r.sub_label}</p>}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          r.type === 'enrollment' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {r.type === 'enrollment' ? 'Enrollment' : 'Intervention'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {r.fri_score != null
                          ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">{r.fri_score.toFixed(1)}</span>
                              {r.zone && (
                                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', ZONE_STYLE[r.zone] ?? 'bg-gray-100 text-gray-500')}>
                                  {r.zone}
                                </span>
                              )}
                            </div>
                          )
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                          STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-500'
                        )}>
                          {r.status}
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
