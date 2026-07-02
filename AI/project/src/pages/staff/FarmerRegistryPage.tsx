import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, Download, Upload, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, X, RefreshCw, History, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { REGION_LABELS, REGION_OPTIONS, CROP_LABELS, phoneToEmail } from '@/lib/constants';
import type { RegionCode, CropType } from '@/types';
import { cn } from '@/lib/utils';

interface FarmerRecord {
  id:             string;
  full_name:      string;
  phone:          string;
  region_code:    RegionCode;
  district:       string;
  primary_crop:   CropType;
  is_verified:    boolean;
  created_at:     string;
  risk_category:  string | null;
  current_zone:   string | null;
  current_fri:    number | null;
  cohort_name:    string | null;
  program_name:   string | null;
  duplicate_flag: boolean;
}

interface EnrollmentHistoryEntry {
  id:           string;
  status:       string;
  enrolled_at:  string;
  graduated_at: string | null;
  withdrawn_at: string | null;
  program_name: string;
  cohort_name:  string | null;
}

const ENR_STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  graduated: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

interface Filters {
  search:   string;
  region:   string;
  district: string;
  zone:     string;
  status:   string;
  cohort:   string;
}

const EMPTY_FILTERS: Filters = {
  search: '', region: '', district: '', zone: '', status: '', cohort: '',
};

const ZONE_OPTIONS = [
  'Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter',
];

const STATUS_OPTIONS = [
  { value: 'verified',   label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
];

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  'bg-purple-100 text-purple-800',
  'Resilience Builder': 'bg-green-100 text-green-800',
  'Resilience Learner': 'bg-yellow-100 text-yellow-800',
  'Resilience Starter': 'bg-red-100 text-red-800',
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

export default function FarmerRegistryPage() {
  const profile = useAuthStore(s => s.profile);
  const [farmers,  setFarmers]  = useState<FarmerRecord[]>([]);
  const [cohorts,  setCohorts]  = useState<{ id: string; name: string }[]>([]);
  const [filters,  setFilters]  = useState<Filters>(EMPTY_FILTERS);
  const [loading,  setLoading]  = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen,  setImportOpen]  = useState(false);
  const [importLog,   setImportLog]   = useState<string[]>([]);
  const [importing,   setImporting]   = useState(false);
  const [selected,    setSelected]    = useState<FarmerRecord | null>(null);
  const [enrHistory,  setEnrHistory]  = useState<EnrollmentHistoryEntry[]>([]);
  const [enrLoading,  setEnrLoading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const [{ data: cohortRaw }, { data: farmersRaw }] = await Promise.all([
      supabase.from('cohorts')
        .select('id, name, programs!inner(organisation_id)')
        .eq('programs.organisation_id', profile.organisation_id),
      supabase.from('farmers')
        .select('id,full_name,phone,region_code,district,primary_crop,is_verified,created_at,risk_category')
        .eq('organisation_id', profile.organisation_id)
        .order('created_at', { ascending: false }),
    ]);

    const farmerList = (farmersRaw ?? []) as Omit<FarmerRecord, 'duplicate_flag' | 'current_zone' | 'current_fri' | 'cohort_name' | 'program_name'>[];
    const cohortList = (cohortRaw ?? []) as { id: string; name: string }[];
    setCohorts(cohortList);

    if (farmerList.length === 0) { setFarmers([]); setLoading(false); return; }

    const ids = farmerList.map(f => f.id);
    const [{ data: scores }, { data: enrollments }] = await Promise.all([
      (supabase.from('farmer_fri_scores') as any)
        .select('farmer_id,total_score,zone,week_number')
        .in('farmer_id', ids)
        .order('week_number', { ascending: false }),
      supabase.from('enrollments')
        .select('farmer_id, cohorts(name, programs(name))')
        .in('farmer_id', ids)
        .eq('status', 'active'),
    ]);

    const latestScore = new Map<string, { total_score: number; zone: string }>();
    (scores ?? []).forEach((s: { farmer_id: string; total_score: number; zone: string; week_number: number }) => {
      if (!latestScore.has(s.farmer_id)) latestScore.set(s.farmer_id, s);
    });

    const enrollMap = new Map<string, { cohort_name: string; program_name: string }>();
    (enrollments ?? []).forEach((e: any) => {
      if (!enrollMap.has(e.farmer_id)) {
        enrollMap.set(e.farmer_id, {
          cohort_name:  e.cohorts?.name ?? '',
          program_name: e.cohorts?.programs?.name ?? '',
        });
      }
    });

    // Detect duplicates by phone
    const phoneCount = new Map<string, number>();
    farmerList.forEach(f => phoneCount.set(f.phone, (phoneCount.get(f.phone) ?? 0) + 1));

    const enriched: FarmerRecord[] = farmerList.map(f => {
      const s = latestScore.get(f.id);
      const e = enrollMap.get(f.id);
      return {
        ...f,
        current_fri:    s?.total_score ?? null,
        current_zone:   s?.zone ?? null,
        cohort_name:    e?.cohort_name ?? null,
        program_name:   e?.program_name ?? null,
        duplicate_flag: (phoneCount.get(f.phone) ?? 1) > 1,
      };
    });

    setFarmers(enriched);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const openFarmerDetail = async (f: FarmerRecord) => {
    setSelected(f);
    setEnrHistory([]);
    setEnrLoading(true);
    const { data } = await supabase
      .from('enrollments')
      .select('id, status, enrolled_at, graduated_at, withdrawn_at, programs(name), cohorts(name)')
      .eq('farmer_id', f.id)
      .order('enrolled_at', { ascending: false });
    setEnrHistory(
      (data ?? []).map((e: any) => ({
        id:           e.id,
        status:       e.status,
        enrolled_at:  e.enrolled_at,
        graduated_at: e.graduated_at ?? null,
        withdrawn_at: e.withdrawn_at ?? null,
        program_name: e.programs?.name ?? '—',
        cohort_name:  e.cohorts?.name ?? null,
      }))
    );
    setEnrLoading(false);
  };

  const filtered = farmers.filter(f => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!f.full_name.toLowerCase().includes(q) && !f.phone.includes(q) && !f.district.toLowerCase().includes(q)) return false;
    }
    if (filters.region   && f.region_code !== filters.region) return false;
    if (filters.district && !f.district.toLowerCase().includes(filters.district.toLowerCase())) return false;
    if (filters.zone     && f.current_zone !== filters.zone) return false;
    if (filters.cohort   && f.cohort_name !== filters.cohort) return false;
    if (filters.status === 'verified'   && !f.is_verified) return false;
    if (filters.status === 'unverified' && f.is_verified)  return false;
    return true;
  });

  const activeFilterCount = Object.entries(filters)
    .filter(([k, v]) => k !== 'search' && v !== '').length;

  const duplicateCount = farmers.filter(f => f.duplicate_flag).length;

  function exportCSV() {
    const header = 'Full Name,Phone,Region,District,Crop,Verified,FRI Score,Zone,Cohort,Program,Created';
    const rows = filtered.map(f => [
      `"${f.full_name}"`,
      f.phone,
      REGION_LABELS[f.region_code] ?? f.region_code,
      f.district,
      CROP_LABELS[f.primary_crop] ?? f.primary_crop,
      f.is_verified ? 'Yes' : 'No',
      f.current_fri ?? '',
      f.current_zone ?? '',
      f.cohort_name ?? '',
      f.program_name ?? '',
      new Date(f.created_at).toLocaleDateString('en-GB'),
    ].join(','));
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `farmers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setImporting(true);
    setImportLog([]);
    const text = await file.text();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(Boolean);
    const dataLines = lines.slice(1); // skip header
    const log: string[] = [`Parsed ${dataLines.length} rows from CSV.`];

    let inserted = 0;
    let skipped  = 0;
    for (const line of dataLines) {
      const cols          = parseCsvLine(line);
      const full_name     = cols[0] ?? '';
      const phone         = cols[1] ?? '';
      const national_id   = cols[2] ?? '';
      const date_of_birth = cols[3] ?? '';
      const gender        = cols[4] ?? '';
      const region_code   = cols[5] as RegionCode ?? '';
      const district      = cols[6] ?? '';
      const community     = cols[7] ?? '';
      const primary_crop  = (cols[8] ?? 'other') as CropType;
      const total_farm_size_ha = parseFloat(cols[9] ?? '0') || 0;

      if (!full_name || !phone || !national_id || !region_code || !district) {
        log.push(`Skipped: missing required fields in row "${line.substring(0, 40)}"`);
        skipped++;
        continue;
      }

      const { data: existing } = await supabase
        .from('farmers')
        .select('id')
        .eq('phone', phone)
        .eq('organisation_id', profile.organisation_id)
        .maybeSingle();

      if (existing) {
        log.push(`Skipped: duplicate phone ${phone} (${full_name})`);
        skipped++;
        continue;
      }

      const { data: farmer, error } = await supabase.from('farmers').insert({
        full_name,
        phone,
        national_id,
        date_of_birth:      date_of_birth || null,
        gender:             gender || null,
        region_code,
        district,
        community:          community || '',
        primary_crop,
        total_farm_size_ha,
        organisation_id:    profile.organisation_id,
        is_verified:        false,
      }).select('id').maybeSingle();

      if (error) {
        log.push(`Error inserting ${full_name}: ${error.message}`);
        skipped++;
      } else {
        // Create auth account so farmer can log in with default PIN
        const { data: su } = await supabase.auth.signUp({
          email: phoneToEmail(phone),
          password: '654321',
          options: { data: { role: 'farmer', full_name, organisation_id: profile.organisation_id, farmer_id: farmer?.id } },
        });
        if (su?.user?.id) {
          await supabase.from('users').update({ must_change_password: true }).eq('id', su.user.id);
        }
        inserted++;
      }
    }

    log.push(`Done. Inserted: ${inserted}, Skipped/failed: ${skipped}.`);
    setImportLog(log);
    setImporting(false);
    if (inserted > 0) load();
  }

  function setFilter(key: keyof Filters, val: string) {
    setFilters(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Farmer Registry</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">
            {loading ? 'Loading…' : `${farmers.length.toLocaleString()} total farmers`}
            {!loading && duplicateCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">· {duplicateCount} duplicate flag{duplicateCount > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-8 gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
          <Button onClick={() => load()} variant="ghost" size="sm" className="h-8 w-8 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Duplicate alert */}
      {!loading && duplicateCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{duplicateCount} farmer{duplicateCount > 1 ? 's' : ''}</span> share a phone number with another record. Review and merge as needed.
          </p>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name, phone, district…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className="pl-9 h-9"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <Button
            variant="outline" size="sm"
            className={cn('h-9 gap-1.5', activeFilterCount > 0 && 'border-cropguard-green text-cropguard-green')}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-cropguard-green text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-gray-500" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Select value={filters.region || '__none__'} onValueChange={v => setFilter('region', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Regions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All Regions</SelectItem>
                {REGION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="District…"
              value={filters.district}
              onChange={e => setFilter('district', e.target.value)}
              className="h-8 text-xs"
            />
            <Select value={filters.zone || '__none__'} onValueChange={v => setFilter('zone', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Zones" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All Zones</SelectItem>
                {ZONE_OPTIONS.map(z => <SelectItem key={z} value={z}>{z.replace('Resilience ', '')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || '__none__'} onValueChange={v => setFilter('status', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.cohort || '__none__'} onValueChange={v => setFilter('cohort', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Cohorts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All Cohorts</SelectItem>
                {cohorts.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!loading && filtered.length !== farmers.length && (
        <p className="text-xs text-cropguard-slate">
          Showing <span className="font-semibold text-cropguard-forest">{filtered.length}</span> of {farmers.length} farmers
        </p>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Farmer', 'Phone', 'Region / District', 'Verified', 'FRI', 'Zone', 'Cohort', 'Flags'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No farmers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(f => (
                  <tr
                    key={f.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openFarmerDetail(f)}
                  >
                    <td className="px-4 py-3 font-medium text-cropguard-forest">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden ${(f as any).photo_url ? '' : 'bg-cropguard-mint text-cropguard-dark'}`}>
                          {(f as any).photo_url
                            ? <img src={(f as any).photo_url} alt={f.full_name} className="w-full h-full object-cover" />
                            : f.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{f.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{f.phone}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {REGION_LABELS[f.region_code] ?? f.region_code} · {f.district}
                    </td>
                    <td className="px-4 py-3">
                      {f.is_verified
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle className="w-3 h-3" /> Yes</span>
                        : <span className="text-xs text-gray-400">No</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-cropguard-forest text-xs">
                      {f.current_fri !== null ? `${f.current_fri}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {f.current_zone
                        ? <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', ZONE_COLORS[f.current_zone] ?? 'bg-gray-100 text-gray-600')}>
                            {f.current_zone.replace('Resilience ', '')}
                          </span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{f.cohort_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {f.duplicate_flag && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5" /> Duplicate
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Farmer detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => { setSelected(null); setEnrHistory([]); }}
        title={selected?.full_name ?? ''}
        subtitle={selected?.duplicate_flag ? 'Duplicate phone flag detected' : undefined}
        width="max-w-lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* Farmer photo + identity header */}
            <div className="flex items-center gap-4 p-4 bg-cropguard-mint/30 rounded-xl border border-cropguard-green/10">
              <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-cropguard-mint">
                {(selected as any).photo_url
                  ? <img src={(selected as any).photo_url} alt={selected.full_name} className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-cropguard-dark">{selected.full_name.charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <p className="text-base font-bold text-cropguard-forest leading-tight">{selected.full_name}</p>
                <p className="text-xs text-cropguard-slate mt-0.5">{selected.phone}</p>
                {selected.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                    Verified
                  </span>
                )}
              </div>
            </div>
            {/* Core details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Phone',      selected.phone],
                ['Region',     REGION_LABELS[selected.region_code] ?? selected.region_code],
                ['District',   selected.district],
                ['Crop',       CROP_LABELS[selected.primary_crop] ?? selected.primary_crop],
                ['Verified',   selected.is_verified ? 'Yes' : 'No'],
                ['FRI Score',  selected.current_fri !== null ? `${selected.current_fri}/100` : 'No score'],
                ['Zone',       selected.current_zone ?? '—'],
                ['Registered', new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="font-medium text-cropguard-forest text-xs">{v}</p>
                </div>
              ))}
            </div>

            {/* Enrollment history */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-cropguard-mid" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program History</p>
              </div>

              {enrLoading ? (
                <div className="flex items-center gap-2 text-sm text-cropguard-slate py-4">
                  <Clock className="w-4 h-4 animate-pulse" /> Loading…
                </div>
              ) : enrHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-3">Not enrolled in any program.</p>
              ) : (
                <div className="space-y-2">
                  {enrHistory.map(e => {
                    const endDate = e.graduated_at ?? e.withdrawn_at;
                    return (
                      <div key={e.id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-cropguard-forest">{e.program_name}</p>
                          {e.cohort_name && (
                            <p className="text-[11px] text-cropguard-slate mt-0.5">{e.cohort_name}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">
                            Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {endDate && (
                              <> · {e.graduated_at ? 'Graduated' : 'Withdrawn'} {new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                            )}
                          </p>
                        </div>
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border-0',
                          ENR_STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-500'
                        )}>
                          {e.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Import Drawer */}
      <Drawer
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportLog([]); }}
        title="Import Farmers from CSV"
        width="max-w-lg"
      >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">Required CSV columns (in order):</p>
              <p className="font-mono text-xs bg-white rounded px-3 py-2 border border-blue-100">Full Name, Phone, National ID, Date of Birth, Gender, Region Code, District, Community, Primary Crop, Farm Size (ha)</p>
              <p className="text-xs text-blue-600">Region Code: 2-letter code (e.g. AH, NR). Crop: maize, rice, cassava, etc. Date of Birth: YYYY-MM-DD. Gender: male/female/other. Required: Full Name, Phone, National ID, Region Code, District. First row is treated as a header and skipped.</p>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-cropguard-green transition-colors" onClick={() => fileRef.current?.click()}>
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Click to select a CSV file</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </div>
            {importing && <div className="flex items-center gap-2 text-sm text-cropguard-slate"><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</div>}
            {importLog.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 max-h-48 overflow-y-auto">
                {importLog.map((line, i) => <p key={i} className="text-xs font-mono text-gray-700">{line}</p>)}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => { setImportOpen(false); setImportLog([]); }}>Close</Button>
          </div>
      </Drawer>
    </div>
  );
}
