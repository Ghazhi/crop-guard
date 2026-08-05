import { Filter, X } from 'lucide-react';
import type { FilterOptions, ExposureFilters } from '@/lib/exposure-data';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  options: FilterOptions;
  filters: ExposureFilters;
  onChange: (filters: ExposureFilters) => void;
}

export function FilterBar({ options, filters, onChange }: FilterBarProps) {
  const hasActiveFilter = filters.programId || filters.cohortId || filters.cooperativeId || filters.communityId;

  const update = (patch: Partial<ExposureFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const clear = () => {
    onChange({ programId: null, cohortId: null, cooperativeId: null, communityId: null });
  };

  // Filter cohorts by selected program
  const availableCohorts = filters.programId
    ? options.cohorts.filter(c => c.programId === filters.programId)
    : options.cohorts;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      {/* Program filter */}
      <FilterSelect
        label="Program"
        value={filters.programId ?? ''}
        options={options.programs.map(p => ({ value: p.id, label: p.name }))}
        onChange={v => update({ programId: v || null, cohortId: null })}
      />

      {/* Cohort filter */}
      <FilterSelect
        label="Cohort"
        value={filters.cohortId ?? ''}
        options={availableCohorts.map(c => ({ value: c.id, label: c.name }))}
        onChange={v => update({ cohortId: v || null })}
      />

      {/* Cooperative filter */}
      <FilterSelect
        label="Cooperative"
        value={filters.cooperativeId ?? ''}
        options={options.cooperatives.map(c => ({ value: c.id, label: c.name }))}
        onChange={v => update({ cooperativeId: v || null })}
      />

      {/* Community filter */}
      <FilterSelect
        label="Community"
        value={filters.communityId ?? ''}
        options={options.communities.map(c => ({ value: c.id, label: c.name }))}
        onChange={v => update({ communityId: v || null })}
      />

      {hasActiveFilter && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#B04A2E] px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'appearance-none text-sm rounded-xl border py-2 pl-3 pr-8 cursor-pointer transition-colors',
          value
            ? 'border-[#C79A3D]/40 bg-[#C79A3D]/5 text-[#0E2419] font-medium'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
        )}
      >
        <option value="">All {label}s</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
