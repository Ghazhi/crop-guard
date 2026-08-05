import { useEffect, useState, useCallback } from 'react';
import { CloudRain, AlertTriangle, Sprout, CalendarClock, Info, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { fetchExposureDashboardData, type ExposureDashboardData, type ExposureFilters } from '@/lib/exposure-data';
import { FilterBar } from '@/components/exposure/FilterBar';
import type { ExposureResult, ExposureComponent } from '@/lib/exposure';

const TIER_STYLES: Record<ExposureResult['tier'], { bg: string; text: string; border: string; hex: string }> = {
  High:     { bg: 'bg-[#B04A2E]/10',  text: 'text-[#B04A2E]',  border: 'border-[#B04A2E]/30',  hex: '#B04A2E' },
  Moderate: { bg: 'bg-[#C79A3D]/10',   text: 'text-[#C79A3D]',  border: 'border-[#C79A3D]/30',   hex: '#C79A3D'  },
  Low:      { bg: 'bg-[#3E7D5A]/10',   text: 'text-[#3E7D5A]',  border: 'border-[#3E7D5A]/30',   hex: '#3E7D5A'  },
};

const COMPONENT_ICONS: Record<string, React.ElementType> = {
  E1: AlertTriangle,
  E2: CloudRain,
  E3: CalendarClock,
  E4: Sprout,
};

const EMPTY_FILTERS: ExposureFilters = { programId: null, cohortId: null, cooperativeId: null, communityId: null };

export default function ClimateExposureTab() {
  const { profile } = useAuthStore();
  const [data, setData] = useState<ExposureDashboardData>({ cohorts: [], farmers: [], filterOptions: { programs: [], cohorts: [], cooperatives: [], communities: [] }, loading: true, error: null });
  const [filters, setFilters] = useState<ExposureFilters>(EMPTY_FILTERS);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchExposureDashboardData(profile.organisation_id, filters);
      setData(result);
      if (result.cohorts.length > 0) {
        // Keep current selection if still in the list, otherwise pick first
        if (!selectedCohortId || !result.cohorts.find(c => c.id === selectedCohortId)) {
          setSelectedCohortId(result.cohorts[0].id);
        }
      } else {
        setSelectedCohortId(null);
      }
    } catch (err: any) {
      setData({ cohorts: [], farmers: [], filterOptions: { programs: [], cohorts: [], cooperatives: [], communities: [] }, loading: false, error: err.message ?? 'Failed to load data' });
    }
  }, [profile?.organisation_id, filters]);

  useEffect(() => { load(); }, [load]);

  const { cohorts, loading, error, filterOptions } = data;
  const selected = cohorts.find(c => c.id === selectedCohortId) ?? cohorts[0] ?? null;

  if (loading && cohorts.length === 0) {
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

  if (cohorts.length === 0 && !loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Header onRefresh={load} />
        <FilterBar options={filterOptions} filters={filters} onChange={setFilters} />
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <CloudRain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No cohorts match the selected filters. Adjust filters or create new cohorts to see climate exposure data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Header onRefresh={load} />

      <FilterBar options={filterOptions} filters={filters} onChange={setFilters} />

      {/* Cohort cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cohorts.map(c => {
          const tierStyle = TIER_STYLES[c.exposure.tier];
          const isSelected = c.id === selected?.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCohortId(c.id)}
              className={cn(
                'text-left bg-white rounded-2xl border p-5 transition-all hover:shadow-md',
                isSelected ? 'border-[#C79A3D] shadow-md ring-1 ring-[#C79A3D]/30' : 'border-gray-100',
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#0E2419] line-clamp-2">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.district} · {c.farmerCount} farmers</p>
                </div>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap', tierStyle.bg, tierStyle.text, tierStyle.border)}>
                  {c.exposure.tier}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-bold text-[#0E2419]">{c.exposure.score}</span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${c.exposure.score}%`, backgroundColor: tierStyle.hex }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected cohort detail */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-xl text-[#0E2419]">{selected.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{selected.district} · {selected.farmerCount} enrolled farmers{selected.programName ? ` · ${selected.programName}` : ''}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-4xl font-bold text-[#0E2419]">{selected.exposure.score}</p>
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', TIER_STYLES[selected.exposure.tier].bg, TIER_STYLES[selected.exposure.tier].text, TIER_STYLES[selected.exposure.tier].border)}>
                {selected.exposure.tier} Exposure
              </span>
            </div>
          </div>

          {/* Component breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selected.exposure.components.map((comp: ExposureComponent) => {
              const Icon = COMPONENT_ICONS[comp.key] ?? Info;
              return (
                <div key={comp.key} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#B04A2E]/10 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-[#B04A2E]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0E2419]">{comp.key} — {comp.label}</p>
                        <p className="text-[10px] text-gray-400">Weight: {(comp.weight * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#0E2419]">{comp.raw}</p>
                      <p className="text-[10px] text-gray-400">→ {comp.weighted.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#B04A2E] transition-all" style={{ width: `${comp.raw}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Raw inputs */}
          <div className="mt-6 bg-[#0E2419] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#C79A3D] uppercase tracking-wider mb-3">Raw Climate Inputs</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InputChip label="Hazard Class" value={selected.inputs.hazard_classification} />
              <InputChip label="Actual Rainfall" value={`${selected.inputs.actual_rainfall} mm`} />
              <InputChip label="Historical Avg" value={`${selected.inputs.historical_avg_rainfall} mm`} />
              <InputChip label="Critical Alerts" value={String(selected.inputs.critical_alert_count)} />
              <InputChip label="High Alerts" value={String(selected.inputs.high_alert_count)} />
              <InputChip label="Medium Alerts" value={String(selected.inputs.medium_alert_count)} />
              <InputChip label="In Critical Stage" value={selected.inputs.in_critical_growth_stage ? 'Yes' : 'No'} />
              <InputChip label="Forecast Stress" value={selected.inputs.forecast_stress_flag ? 'Active' : 'None'} />
            </div>
          </div>

          {/* Formula reference */}
          <div className="mt-4 flex items-start gap-2 bg-blue-50 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Score = (E1 × 0.40) + (E2 × 0.25) + (E3 × 0.20) + (E4 × 0.15).
              Tier: High ≥ 67, Moderate ≥ 34, Low &lt; 34.
              E1 is a fixed hazard lookup; E2 uses rainfall deviation; E3 counts alert severity over 3–5 seasons; E4 is stepped by crop-stage window and forecast stress.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-serif text-2xl text-[#0E2419]">Climate Exposure Score</h2>
        <p className="text-sm text-gray-500 mt-1">
          Computed per cohort from four weighted climate-risk components. Independent of farmer FRI scores.
        </p>
      </div>
      <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0E2419] px-3 py-1.5 rounded-lg hover:bg-gray-50">
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>
    </div>
  );
}

function InputChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#163425] rounded-lg px-3 py-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}
