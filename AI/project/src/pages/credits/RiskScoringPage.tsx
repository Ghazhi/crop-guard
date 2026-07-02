import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGION_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface FarmerScore {
  farmer_id:     string;
  full_name:     string;
  phone:         string;
  region_code:   string;
  total_score:   number;
  p1_score:      number | null;
  p2_score:      number | null;
  p3_score:      number | null;
  p4_score:      number | null;
  eci_score:     number | null;
  baseline_score: number | null;
  zone:          string | null;
  week_number:   number;
  is_provisional: boolean;
}

const CREDIT_GRADE = (score: number) => {
  if (score >= 80) return { label: 'A – Excellent', cls: 'bg-emerald-100 text-emerald-700' };
  if (score >= 65) return { label: 'B – Good',      cls: 'bg-blue-100 text-blue-700' };
  if (score >= 50) return { label: 'C – Fair',      cls: 'bg-amber-100 text-amber-700' };
  return             { label: 'D – Poor',      cls: 'bg-red-100 text-red-700' };
};

const ZONE_STYLE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

type SortKey = 'total_score' | 'baseline_score' | 'week_number';

export default function CreditsRiskScoringPage() {
  const [rows,        setRows]        = useState<FarmerScore[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState('');
  const [zoneFilter,  setZoneFilter]  = useState('all');
  const [sortKey,     setSortKey]     = useState<SortKey>('total_score');
  const [sortDesc,    setSortDesc]    = useState(true);
  const [expandId,    setExpandId]    = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: friData } = await supabase
        .from('farmer_fri_scores')
        .select('farmer_id, total_score, p1_score, p2_score, p3_score, p4_score, eci_score, baseline_score, zone, week_number, is_provisional, created_at')
        .order('created_at', { ascending: false })
        .limit(400);

      if (!friData?.length) { setRows([]); setLoading(false); return; }

      // One score per farmer — latest
      const seen = new Set<string>();
      const latest: typeof friData = [];
      for (const r of friData) {
        if (seen.has(r.farmer_id)) continue;
        seen.add(r.farmer_id);
        latest.push(r);
      }

      const ids = latest.map(r => r.farmer_id);
      const { data: farmerData } = await supabase
        .from('farmers')
        .select('id, full_name, phone, region_code')
        .in('id', ids);

      const fmap: Record<string, any> = {};
      (farmerData ?? []).forEach((f: any) => { fmap[f.id] = f; });

      let merged: FarmerScore[] = latest
        .map(r => {
          const f = fmap[r.farmer_id];
          if (!f) return null;
          return {
            farmer_id:      r.farmer_id,
            full_name:      f.full_name,
            phone:          f.phone,
            region_code:    f.region_code,
            total_score:    Number(r.total_score),
            p1_score:       r.p1_score != null ? Number(r.p1_score) : null,
            p2_score:       r.p2_score != null ? Number(r.p2_score) : null,
            p3_score:       r.p3_score != null ? Number(r.p3_score) : null,
            p4_score:       r.p4_score != null ? Number(r.p4_score) : null,
            eci_score:      r.eci_score != null ? Number(r.eci_score) : null,
            baseline_score: r.baseline_score != null ? Number(r.baseline_score) : null,
            zone:           r.zone,
            week_number:    r.week_number,
            is_provisional: r.is_provisional ?? false,
          } as FarmerScore;
        })
        .filter(Boolean) as FarmerScore[];

      if (zoneFilter !== 'all') merged = merged.filter(r => r.zone === zoneFilter);
      if (query.trim()) {
        const q = query.toLowerCase();
        merged = merged.filter(r => r.full_name.toLowerCase().includes(q));
      }

      merged.sort((a, b) => {
        const va = a[sortKey] ?? 0;
        const vb = b[sortKey] ?? 0;
        return sortDesc ? (vb as number) - (va as number) : (va as number) - (vb as number);
      });

      setRows(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, zoneFilter, sortKey, sortDesc]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortDesc ? <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 opacity-60" /> : <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 opacity-60" />;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Scoring</h1>
        <p className="text-sm text-gray-500 mt-1">
          FRI pillar breakdown and credit grades. Expand a row to see P1–P4 and ECI sub-scores.
        </p>
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
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
              <th
                className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort('total_score')}
              >
                FRI Score <SortIcon k="total_score" />
              </th>
              <th
                className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort('baseline_score')}
              >
                Baseline <SortIcon k="baseline_score" />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Grade</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Zone</th>
              <th
                className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort('week_number')}
              >
                Week <SortIcon k="week_number" />
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-10" /></td>
                    <td />
                  </tr>
                ))
              : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-gray-400 text-sm">
                      <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      No scoring data found.
                    </td>
                  </tr>
                )
                : rows.map(r => {
                    const grade   = CREDIT_GRADE(r.total_score);
                    const expanded = expandId === r.farmer_id;
                    const hasSubScores = r.p1_score != null || r.p2_score != null;
                    return (
                      <>
                        <tr
                          key={r.farmer_id}
                          className={cn(
                            'border-b border-gray-50 hover:bg-gray-50 transition-colors',
                            hasSubScores ? 'cursor-pointer' : 'cursor-default'
                          )}
                          onClick={() => hasSubScores && setExpandId(expanded ? null : r.farmer_id)}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {hasSubScores && (
                                <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform shrink-0', expanded && 'rotate-180')} />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{r.full_name}</p>
                                <p className="text-xs text-gray-400">{r.phone}</p>
                              </div>
                              {r.is_provisional && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-1">Provisional</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 hidden sm:table-cell">
                            {REGION_LABELS[r.region_code as keyof typeof REGION_LABELS] ?? r.region_code ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-gray-800">{r.total_score.toFixed(1)}</td>
                          <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">
                            {r.baseline_score != null ? r.baseline_score.toFixed(1) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', grade.cls)}>
                              {grade.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                              ZONE_STYLE[r.zone ?? ''] ?? 'bg-gray-100 text-gray-500'
                            )}>
                              {r.zone ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 hidden lg:table-cell">W{r.week_number}</td>
                          <td className="pr-4">
                            <button
                              className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                              onClick={e => { e.stopPropagation(); navigate(`/dashboard/farmer/${r.farmer_id}`); }}
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                        {expanded && hasSubScores && (
                          <tr key={`${r.farmer_id}-expanded`} className="bg-blue-50/40 border-b border-gray-100">
                            <td colSpan={8} className="px-8 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                {[
                                  { label: 'P1 Agronomy',    value: r.p1_score },
                                  { label: 'P2 Climate',     value: r.p2_score },
                                  { label: 'P3 Advisory',    value: r.p3_score },
                                  { label: 'P4 Enterprise',  value: r.p4_score },
                                  { label: 'ECI',            value: r.eci_score },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                                    <p className="text-lg font-bold text-gray-900">
                                      {value != null ? value.toFixed(1) : <span className="text-gray-300 text-base">—</span>}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
