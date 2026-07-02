import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ZoneBadge, TrajectoryBadge, RecommendationBadge, RiskBandBadge,
  RiskFlagBadge, ScoreStatusBadge,
} from '@/components/intelligence/Badges';
import {
  enrichFarmer,
  type PortfolioFarmer, type Trajectory, type Recommendation, type FriZone, type RiskBand,
} from '@/components/intelligence/types';

type SortKey = keyof PortfolioFarmer | 'weeks';
type SortDir = 'asc' | 'desc';

const REC_SORT_ORDER: Record<string, number> = { Decline: 0, Defer: 1, Review: 2, Approve: 3 };
const PAGE_SIZE = 25;

export default function FarmerIntelligenceListPage() {
  // programId / cohortId can be passed via URL search params in future
  const programId: string | undefined = undefined;
  const cohortId:  string | undefined = undefined;
  const navigate = useNavigate();
  const [farmers,  setFarmers]  = useState<PortfolioFarmer[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(0);
  const [sortKey,  setSortKey]  = useState<SortKey>('recommendation');
  const [sortDir,  setSortDir]  = useState<SortDir>('asc');
  // filters
  const [zoneFilter,       setZoneFilter]       = useState<Set<FriZone>>(new Set());
  const [trajFilter,       setTrajFilter]       = useState<Set<Trajectory>>(new Set());
  const [recFilter,        setRecFilter]        = useState<Set<Recommendation>>(new Set());
  const [riskBandFilter,   setRiskBandFilter]   = useState<Set<RiskBand>>(new Set());
  const [finalOnlyFilter,  setFinalOnlyFilter]  = useState(false);
  const [flagsOnlyFilter,  setFlagsOnlyFilter]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_portfolio_farmers', {
      p_program_id: programId ?? null,
      p_cohort_id:  cohortId  ?? null,
    } as never);
    setFarmers(((data ?? []) as PortfolioFarmer[]).map(enrichFarmer));
    setLoading(false);
    setPage(0);
  }, [programId, cohortId]);

  useEffect(() => { load(); }, [load]);

  function toggleFilter<T>(set: Set<T>, val: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
    setPage(0);
  }

  const filtered = useMemo(() => {
    let list = farmers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.full_name.toLowerCase().includes(q) ||
        f.asinyo_id?.toLowerCase().includes(q)
      );
    }
    if (zoneFilter.size > 0)     list = list.filter(f => f.zone && zoneFilter.has(f.zone as FriZone));
    if (trajFilter.size > 0)     list = list.filter(f => f.trajectory && trajFilter.has(f.trajectory as Trajectory));
    if (recFilter.size > 0)      list = list.filter(f => f.recommendation && recFilter.has(f.recommendation as Recommendation));
    if (riskBandFilter.size > 0) list = list.filter(f => f.risk_band && riskBandFilter.has(f.risk_band as RiskBand));
    if (finalOnlyFilter)         list = list.filter(f => !f.is_provisional);
    if (flagsOnlyFilter)         list = list.filter(f => f.active_flag_count > 0);

    list = [...list].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === 'recommendation') {
        av = REC_SORT_ORDER[a.recommendation ?? ''] ?? 3;
        bv = REC_SORT_ORDER[b.recommendation ?? ''] ?? 3;
      } else if (sortKey === 'weeks') {
        av = a.weeks_final + a.weeks_provisional;
        bv = b.weeks_final + b.weeks_provisional;
      } else {
        av = (a as Record<string, unknown>)[sortKey] as number | string ?? 0;
        bv = (b as Record<string, unknown>)[sortKey] as number | string ?? 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return (a.total_score ?? 0) - (b.total_score ?? 0);
    });
    return list;
  }, [farmers, search, zoneFilter, trajFilter, recFilter, riskBandFilter, finalOnlyFilter, flagsOnlyFilter, sortKey, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-emerald-600" />
      : <ChevronDown className="w-3 h-3 text-emerald-600" />;
  }

  const zones:       FriZone[]       = ['Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter'];
  const trajs:       Trajectory[]    = ['Improving', 'Stable', 'Declining', 'At Risk', 'No Baseline'];
  const recs:        Recommendation[] = ['Approve', 'Review', 'Defer', 'Decline'];
  const riskBands:   RiskBand[]       = ['Low', 'Moderate', 'High', 'Critical'];

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name or ASY-ID…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
            <input type="checkbox" checked={finalOnlyFilter} onChange={e => { setFinalOnlyFilter(e.target.checked); setPage(0); }} className="rounded" />
            Final Only
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
            <input type="checkbox" checked={flagsOnlyFilter} onChange={e => { setFlagsOnlyFilter(e.target.checked); setPage(0); }} className="rounded" />
            Active Flags Only
          </label>
        </div>

        {/* Chip filters */}
        <div className="flex flex-wrap gap-2">
          {zones.map(z => (
            <button
              key={z}
              onClick={() => toggleFilter(zoneFilter, z, setZoneFilter)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                zoneFilter.has(z)
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {z.replace('Resilience ', 'Z')}
            </button>
          ))}
          <div className="w-px bg-gray-200 self-stretch" />
          {trajs.map(t => (
            <button
              key={t}
              onClick={() => toggleFilter(trajFilter, t, setTrajFilter)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                trajFilter.has(t)
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {t}
            </button>
          ))}
          <div className="w-px bg-gray-200 self-stretch" />
          {recs.map(r => (
            <button
              key={r}
              onClick={() => toggleFilter(recFilter, r, setRecFilter)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                recFilter.has(r)
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {r}
            </button>
          ))}
          <div className="w-px bg-gray-200 self-stretch" />
          {riskBands.map(rb => (
            <button
              key={rb}
              onClick={() => toggleFilter(riskBandFilter, rb, setRiskBandFilter)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                riskBandFilter.has(rb)
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {rb}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { key: 'full_name',       label: 'Farmer / ID'     },
                  { key: 'community',       label: 'Community'       },
                  { key: 'total_score',     label: 'FRI Score'       },
                  { key: 'zone',            label: 'Zone'            },
                  { key: 'credit_score',    label: 'Credit Score'    },
                  { key: 'risk_band',       label: 'Risk Band'       },
                  { key: 'recommendation',  label: 'Recommendation'  },
                  { key: 'trajectory',      label: 'Trajectory'      },
                  { key: 'score_status',    label: 'Status'          },
                  { key: 'active_flag_count', label: 'Flags'         },
                  { key: 'weeks',           label: 'Weeks'           },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key as SortKey)}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon k={key as SortKey} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 11 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paged.map(f => (
                    <tr
                      key={f.farmer_id}
                      onClick={() => navigate(`/dashboard/farmer/${f.farmer_id}`)}
                      className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 hover:text-emerald-700">{f.full_name}</p>
                        <p className="text-xs text-gray-400">{f.asinyo_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{f.community}</p>
                        <p className="text-xs text-gray-400">{f.district}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('font-bold text-base', f.is_provisional ? 'text-amber-700' : 'text-gray-900')}>
                          {f.total_score?.toFixed(0) ?? '—'}
                        </span>
                        <ScoreStatusBadge status={f.is_provisional ? 'provisional' : 'final'} />
                      </td>
                      <td className="px-4 py-3"><ZoneBadge zone={f.zone} /></td>
                      <td className="px-4 py-3 font-medium text-gray-800">{f.credit_score ?? '—'}</td>
                      <td className="px-4 py-3"><RiskBandBadge band={f.risk_band ?? null} /></td>
                      <td className="px-4 py-3"><RecommendationBadge recommendation={f.recommendation ?? null} /></td>
                      <td className="px-4 py-3"><TrajectoryBadge trajectory={f.trajectory ?? null} /></td>
                      <td className="px-4 py-3"><ScoreStatusBadge status={f.score_status} /></td>
                      <td className="px-4 py-3"><RiskFlagBadge activeCount={f.active_flag_count} highCount={f.high_flag_count} /></td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {f.weeks_final + f.weeks_provisional}/12
                        <span className="text-xs text-gray-400 ml-1">({f.weeks_final}F)</span>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} farmers
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                      p === page ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
