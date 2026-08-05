import { useEffect, useState, useMemo, useCallback } from 'react';
import { X, ArrowUpDown, ArrowUp, ArrowDown, Brain, Loader2, RefreshCw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { fetchExposureDashboardData, type FarmerWithQuadrant, type ExposureDashboardData, type ExposureFilters } from '@/lib/exposure-data';
import { FilterBar } from '@/components/exposure/FilterBar';
import {
  computeDisplayedLabel, generateExplanation,
  QUADRANT_INFO, FRI_HIGH_THRESHOLD, EXPOSURE_HIGH_THRESHOLD,
  type QuadrantKey,
} from '@/lib/exposure';

type SortKey = 'name' | 'friScore' | 'exposureScore';
type SortDir = 'asc' | 'desc';

const EMPTY_FILTERS: ExposureFilters = { programId: null, cohortId: null, cooperativeId: null, communityId: null };

export default function RiskQuadrantTab() {
  const { profile } = useAuthStore();
  const [data, setData] = useState<ExposureDashboardData>({ cohorts: [], farmers: [], filterOptions: { programs: [], cohorts: [], cooperatives: [], communities: [] }, loading: true, error: null });
  const [filters, setFilters] = useState<ExposureFilters>(EMPTY_FILTERS);
  const [filter, setFilter] = useState<QuadrantKey | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('friScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchExposureDashboardData(profile.organisation_id, filters);
      setData(result);
    } catch (err: any) {
      setData({ cohorts: [], farmers: [], filterOptions: { programs: [], cohorts: [], cooperatives: [], communities: [] }, loading: false, error: err.message ?? 'Failed to load data' });
    }
  }, [profile?.organisation_id, filters]);

  useEffect(() => { load(); }, [load]);

  const { cohorts, farmers, loading, error, filterOptions } = data;

  const quadrantCounts = useMemo(() => {
    const counts: Record<QuadrantKey, number> = {
      HighCap_LowExp: 0, HighCap_HighExp: 0, LowCap_LowExp: 0, LowCap_HighExp: 0,
    };
    farmers.forEach(f => { counts[f.quadrant]++; });
    return counts;
  }, [farmers]);

  const filteredRows = useMemo(() => {
    let r = filter === 'all' ? farmers : farmers.filter(r => r.quadrant === filter);
    r = [...r].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [farmers, filter, sortKey, sortDir]);

  const selectedFarmer = farmers.find(r => r.id === selectedFarmerId) ?? null;
  const selectedCohort = cohorts.find(c => c.id === selectedFarmer?.cohortId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0E2419]" /> : <ArrowDown className="w-3 h-3 text-[#0E2419]" />;
  };

  if (loading && farmers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#C79A3D]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
          <button onClick={load} className="ml-2 underline">Retry</button>
        </div>
      </div>
    );
  }

  if (farmers.length === 0 && !loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Header onRefresh={load} />
        <FilterBar options={filterOptions} filters={filters} onChange={setFilters} />
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No enrolled farmers match the selected filters. Adjust filters or enroll farmers into cohorts to see risk quadrant data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Header onRefresh={load} />

      <FilterBar options={filterOptions} filters={filters} onChange={setFilters} />

      {/* Quadrant filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="All Farmers"
          count={farmers.length}
          color="#0E2419"
        />
        {(Object.keys(QUADRANT_INFO) as QuadrantKey[]).map(qk => {
          const qi = QUADRANT_INFO[qk];
          return (
            <FilterButton
              key={qk}
              active={filter === qk}
              onClick={() => setFilter(qk)}
              label={qi.axisLabel}
              count={quadrantCounts[qk]}
              color={qi.color}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Table */}
        <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden', selectedFarmer ? 'lg:col-span-3' : 'lg:col-span-5')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Farmer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cohort</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('friScore')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-[#0E2419]">
                      FRI <SortIcon col="friScore" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('exposureScore')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-[#0E2419]">
                      Exposure <SortIcon col="exposureScore" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quadrant</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(r => {
                  const qi = QUADRANT_INFO[r.quadrant];
                  const isSelected = r.id === selectedFarmerId;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedFarmerId(r.id)}
                      className={cn(
                        'border-b border-gray-50 cursor-pointer transition-colors',
                        isSelected ? 'bg-[#C79A3D]/5' : 'hover:bg-gray-50/50',
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-[#0E2419]">{r.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.cohortName}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#3E7D5A]">{r.friScore}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{r.friZone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#B04A2E]">{r.exposureScore}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{r.exposureTier}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: qi.color }}>
                          {qi.shortLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selectedFarmer && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative">
            <button
              onClick={() => setSelectedFarmerId(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <h3 className="font-serif text-lg text-[#0E2419] pr-8">{selectedFarmer.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{selectedFarmer.cohortName}</p>

            {/* Displayed label — the ONLY primary label */}
            <div className="mt-4 bg-[#0E2419] rounded-xl p-4">
              <p className="text-[10px] text-[#C79A3D] uppercase tracking-wider font-semibold mb-1">Displayed Label</p>
              <p className="font-serif text-lg text-white">
                {computeDisplayedLabel(selectedFarmer.friZone, selectedFarmer.exposureTier)}
              </p>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <ScoreCard label="FRI Score" value={selectedFarmer.friScore} sub={selectedFarmer.friZone} color="#3E7D5A" />
              <ScoreCard label="Exposure" value={selectedFarmer.exposureScore} sub={`${selectedFarmer.exposureTier} Exposure`} color="#B04A2E" />
            </div>

            {/* P1–P4 breakdown */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-[#3E7D5A] uppercase tracking-wider mb-2">Capacity Pillars (P1–P4)</p>
              <div className="space-y-2">
                {([
                  { k: 'P1', label: 'Agronomy Readiness', val: selectedFarmer.p1, max: 30 },
                  { k: 'P2', label: 'CSA & Climate-Smart', val: selectedFarmer.p2, max: 30 },
                  { k: 'P3', label: 'Advisory & Commitment', val: selectedFarmer.p3, max: 20 },
                  { k: 'P4', label: 'Enterprise Discipline', val: selectedFarmer.p4, max: 20 },
                ]).map(p => (
                  <div key={p.k}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{p.k} — {p.label}</span>
                      <span className="text-xs font-semibold text-gray-700">{p.val}/{p.max}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#3E7D5A] transition-all" style={{ width: `${(p.val / p.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* E1–E4 breakdown */}
            {selectedCohort && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#B04A2E] uppercase tracking-wider mb-2">Exposure Components (E1–E4)</p>
                <div className="space-y-2">
                  {selectedCohort.exposure.components.map(c => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{c.key} — {c.label}</span>
                        <span className="text-xs font-semibold text-gray-700">{c.raw} → {c.weighted.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#B04A2E] transition-all" style={{ width: `${c.raw}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Norvi AI explanation */}
            <div className="mt-5 bg-[#163425] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#C79A3D]/20 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-[#C79A3D]" />
                </div>
                <p className="text-xs font-semibold text-[#C79A3D] uppercase tracking-wider">Norvi AI Assessment</p>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                {generateExplanation(selectedFarmer.friZone, selectedFarmer.exposureTier, selectedFarmer.quadrant)}
              </p>
            </div>

            {/* Intervention routing */}
            <div className="mt-4 border border-[#C79A3D]/30 bg-[#C79A3D]/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-[#C79A3D] uppercase tracking-wider mb-1">Intervention Routing</p>
              <p className="text-sm text-[#0E2419] leading-relaxed">
                {QUADRANT_INFO[selectedFarmer.quadrant].recommendation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scatter chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-serif text-lg text-[#0E2419] mb-1">Portfolio Quadrant Map</h3>
        <p className="text-xs text-gray-400 mb-4">Exposure on X-axis, FRI on Y-axis. Dashed thresholds at FRI={FRI_HIGH_THRESHOLD} and Exposure={EXPOSURE_HIGH_THRESHOLD}.</p>
        <QuadrantScatter rows={farmers} selectedId={selectedFarmerId} onSelect={setSelectedFarmerId} />
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-serif text-2xl text-[#0E2419]">Risk Portfolio Quadrant</h2>
        <p className="text-sm text-gray-500 mt-1">
          Combines each farmer's FRI score with their cohort's current climate exposure. Computed at read time — not persisted.
        </p>
      </div>
      <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0E2419] px-3 py-1.5 rounded-lg hover:bg-gray-50">
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>
    </div>
  );
}

// ── Filter button ─────────────────────────────────────────────────────────────

function FilterButton({ active, onClick, label, count, color }: {
  active: boolean; onClick: () => void; label: string; count: number; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border',
        active ? 'text-white shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
      )}
      style={active ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {label}
      <span className={cn(
        'text-xs font-bold px-1.5 py-0.5 rounded-full',
        active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500',
      )}>
        {count}
      </span>
    </button>
  );
}

// ── Score card ─────────────────────────────────────────────────────────────────

function ScoreCard({ label, value, sub, color }: {
  label: string; value: number; sub: string; color: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="font-serif text-2xl font-bold mt-1" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Scatter chart ──────────────────────────────────────────────────────────────

function QuadrantScatter({ rows, selectedId, onSelect }: {
  rows: FarmerWithQuadrant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const W = 720;
  const H = 420;
  const PAD = { top: 20, right: 30, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xScale = (v: number) => PAD.left + (v / 100) * plotW;
  const yScale = (v: number) => PAD.top + (1 - v / 100) * plotH;

  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredFarmer = rows.find(r => r.id === hovered) ?? null;

  // Quadrant label positions (center of each quadrant region)
  const quadrantLabels: { key: QuadrantKey; x: number; y: number }[] = [
    { key: 'HighCap_LowExp',  x: xScale(EXPOSURE_HIGH_THRESHOLD / 2), y: yScale((FRI_HIGH_THRESHOLD + 100) / 2) },
    { key: 'HighCap_HighExp', x: xScale((EXPOSURE_HIGH_THRESHOLD + 100) / 2), y: yScale((FRI_HIGH_THRESHOLD + 100) / 2) },
    { key: 'LowCap_LowExp',   x: xScale(EXPOSURE_HIGH_THRESHOLD / 2), y: yScale(FRI_HIGH_THRESHOLD / 2) },
    { key: 'LowCap_HighExp',  x: xScale((EXPOSURE_HIGH_THRESHOLD + 100) / 2), y: yScale(FRI_HIGH_THRESHOLD / 2) },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 500 }}>
        {/* Quadrant background tints */}
        <rect x={xScale(0)} y={yScale(100)} width={xScale(EXPOSURE_HIGH_THRESHOLD) - xScale(0)} height={yScale(FRI_HIGH_THRESHOLD) - yScale(100)} fill="#3E7D5A" opacity={0.06} />
        <rect x={xScale(EXPOSURE_HIGH_THRESHOLD)} y={yScale(100)} width={xScale(100) - xScale(EXPOSURE_HIGH_THRESHOLD)} height={yScale(FRI_HIGH_THRESHOLD) - yScale(100)} fill="#C79A3D" opacity={0.06} />
        <rect x={xScale(0)} y={yScale(FRI_HIGH_THRESHOLD)} width={xScale(EXPOSURE_HIGH_THRESHOLD) - xScale(0)} height={yScale(0) - yScale(FRI_HIGH_THRESHOLD)} fill="#6B9AC4" opacity={0.06} />
        <rect x={xScale(EXPOSURE_HIGH_THRESHOLD)} y={yScale(FRI_HIGH_THRESHOLD)} width={xScale(100) - xScale(EXPOSURE_HIGH_THRESHOLD)} height={yScale(0) - yScale(FRI_HIGH_THRESHOLD)} fill="#B04A2E" opacity={0.06} />

        {/* Quadrant name labels */}
        {quadrantLabels.map(({ key, x, y }) => {
          const qi = QUADRANT_INFO[key];
          return (
            <text key={key} x={x} y={y} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600 }} fill={qi.color} opacity={0.35}>
              {qi.axisLabel}
            </text>
          );
        })}

        {/* Threshold lines */}
        <line x1={xScale(EXPOSURE_HIGH_THRESHOLD)} y1={PAD.top} x2={xScale(EXPOSURE_HIGH_THRESHOLD)} y2={H - PAD.bottom} stroke="#B04A2E" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.5} />
        <line x1={PAD.left} y1={yScale(FRI_HIGH_THRESHOLD)} x2={W - PAD.right} y2={yScale(FRI_HIGH_THRESHOLD)} stroke="#3E7D5A" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.5} />

        {/* Axes */}
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#d1d5db" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#d1d5db" strokeWidth={1} />

        {/* Axis labels */}
        <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 11 }}>Climate Exposure Score →</text>
        <text x={14} y={H / 2} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`} className="fill-gray-500" style={{ fontSize: 11 }}>FRI Score →</text>

        {/* Tick labels */}
        {[0, 34, 67, 100].map(v => (
          <text key={`x${v}`} x={xScale(v)} y={H - PAD.bottom + 16} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>{v}</text>
        ))}
        {[0, 40, 60, 80, 100].map(v => (
          <text key={`y${v}`} x={PAD.left - 8} y={yScale(v) + 4} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>{v}</text>
        ))}

        {/* Dots */}
        {rows.map(r => {
          const qi = QUADRANT_INFO[r.quadrant];
          const isSelected = r.id === selectedId;
          const isHovered = r.id === hovered;
          const dim = hovered && !isHovered;
          return (
            <g
              key={r.id}
              onClick={() => onSelect(r.id)}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx={xScale(r.exposureScore)}
                cy={yScale(r.friScore)}
                r={isSelected || isHovered ? 9 : 6}
                fill={qi.color}
                opacity={isSelected ? 1 : dim ? 0.25 : 0.75}
                stroke={isSelected ? '#0E2419' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
              />
              {isSelected && (
                <text x={xScale(r.exposureScore) + 12} y={yScale(r.friScore) + 4} className="fill-[#0E2419] font-semibold" style={{ fontSize: 11 }}>
                  {r.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoveredFarmer && (
          <g pointerEvents="none">
            {(() => {
              const cx = xScale(hoveredFarmer.exposureScore);
              const cy = yScale(hoveredFarmer.friScore);
              const tipW = 180;
              const tipH = 56;
              const tipX = cx + 14 + tipW > W - PAD.right ? cx - 14 - tipW : cx + 14;
              const tipY = cy - tipH / 2 < PAD.top ? PAD.top : cy + tipH / 2 > H - PAD.bottom ? H - PAD.bottom - tipH : cy - tipH / 2;
              const qi = QUADRANT_INFO[hoveredFarmer.quadrant];
              const subLine = [hoveredFarmer.cooperativeName, hoveredFarmer.community].filter(Boolean).join(' · ') || hoveredFarmer.cohortName;
              return (
                <>
                  <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={8} fill="#0E2419" opacity={0.95} />
                  <rect x={tipX} y={tipY} width={4} height={tipH} rx={2} fill={qi.color} />
                  <text x={tipX + 12} y={tipY + 20} className="fill-white font-semibold" style={{ fontSize: 12 }}>{hoveredFarmer.name}</text>
                  <text x={tipX + 12} y={tipY + 38} className="fill-gray-300" style={{ fontSize: 10 }}>{subLine}</text>
                  <text x={tipX + 12} y={tipY + 50} className="fill-gray-400" style={{ fontSize: 9 }}>FRI {hoveredFarmer.friScore} · Exp {hoveredFarmer.exposureScore} · {qi.shortLabel}</text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3">
        {(Object.keys(QUADRANT_INFO) as QuadrantKey[]).map(qk => {
          const qi = QUADRANT_INFO[qk];
          return (
            <div key={qk} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: qi.color }} />
              <span className="text-xs text-gray-600">{qi.axisLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
