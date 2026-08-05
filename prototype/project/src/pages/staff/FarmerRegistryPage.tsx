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
import { REGION_NAME_OPTIONS, REGION_LABELS, CROP_LABELS, GENDER_LABELS, phoneToEmail } from '@/lib/constants';
import type { CropType, Gender, RegionCode } from '@/types';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';

interface FarmerRecord {
  id:             string;
  farmer_id:      string | null;
  full_name:      string;
  phone:          string;
  region:           string | null;
  region_code:    RegionCode | null;
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
  // Extended registration fields
  first_name:           string | null;
  last_name:            string | null;
  gender:               Gender | null;
  date_of_birth:        string | null;
  national_id:          string | null;
  national_id_type:     string | null;
  photo_url:            string | null;
  id_front_url:         string | null;
  id_back_url:          string | null;
  voice_consent_url:    string | null;
  community:            string;
  community_id:         string | null;
  cooperative_id:       string | null;
  program_id:           string | null;
  cohort_id_ref:        string | null;
  gps_address:          string | null;
  residential_address:  string | null;
  has_disability:       boolean | null;
  disability_specify:   string | null;
  is_refugee_displaced: boolean | null;
  refugee_specify:      string | null;
  years_farm_experience:  number | null;
  acres_cultivated:       number | null;
  secondary_crop:        string | null;
  secondary_crop_other:   string | null;
  primary_crop_other:     string | null;
  primary_bags_prev_season:   number | null;
  secondary_bags_prev_season: number | null;
  owns_tractor:          boolean | null;
  owns_house:            boolean | null;
  marital_status:        string | null;
  wives_count:           number | null;
  children_count:        number | null;
  other_business:        boolean | null;
  other_business_specify: string | null;
  is_community_native:   boolean | null;
  origin_if_not_native:  string | null;
  community_preferences: string[] | null;
  primary_occupation:    string | null;
  secondary_occupation:  string | null;
  farming_type:          string | null;
  farm_location:         string | null;
  main_buyer_market:     string | null;
  loan_type:             string | null;
  loan_tenor:            string | null;
  preferred_repayment:   string | null;
  average_income:        number | null;
  account_type:          string | null;
  account_number:        string | null;
  bank_name:             string | null;
  mobile_money_network:  string | null;
  other_income_sources:  string | null;
  existing_loans:        boolean | null;
  existing_loan_detail:  string | null;
  farm_loss_history:     string | null;
  has_agric_insurance:   boolean | null;
  willing_sell_via_asinyo: boolean | null;
  willing_repay:         boolean | null;
  declaration_date:      string | null;
  interpreter_name:      string | null;
  interpreter_language:  string | null;
  interpreter_address:   string | null;
  support_needed:        string[] | null;
  other_agric_companies: boolean | null;
  other_agric_companies_specify: string | null;
  desired_assets:         string[] | null;
  input_credit_participation: boolean | null;
  other_org_engagement:  boolean | null;
  other_org_name:        string | null;
  other_org_activities:  string | null;
  asinyo_improvement_notes: string | null;
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

// ─── Detail drawer helpers ─────────────────────────────────────

function boolVal(v: boolean | null | undefined): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
}

function arrVal(v: string[] | null | undefined): string {
  if (!v || v.length === 0) return '—';
  return v.join(', ');
}

const ID_TYPE_LABELS: Record<string, string> = {
  ghana_card: 'Ghana Card',
  health_insurance: 'Health Insurance',
  voters_id: "Voter's ID",
  passport: 'Passport',
  other: 'Other',
};

function idTypeLabel(v: string | null): string | null {
  if (!v) return null;
  return ID_TYPE_LABELS[v] ?? v;
}

const MARITAL_LABELS: Record<string, string> = {
  single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed',
};

function maritalLabel(v: string | null): string | null {
  if (!v) return null;
  return MARITAL_LABELS[v] ?? v;
}

const OCCUPATION_LABELS: Record<string, string> = {
  crop_farming: 'Crop Farming', livestock: 'Livestock Rearing', trading: 'Trading',
  processing: 'Processing', teaching: 'Teaching', civil_service: 'Civil Service', other: 'Other',
};

function occupationLabel(v: string | null): string | null {
  if (!v) return null;
  return OCCUPATION_LABELS[v] ?? v;
}

const FARMING_TYPE_LABELS: Record<string, string> = {
  own_land: 'On my own land', leased_land: 'On leased land', shared: 'Shared / communal',
};

function farmingTypeLabel(v: string | null): string | null {
  if (!v) return null;
  return FARMING_TYPE_LABELS[v] ?? v;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  none: 'No loan needed', input_credit: 'Input Credit', cash_loan: 'Cash Loan', asset_loan: 'Asset Loan',
};

function loanTypeLabel(v: string | null): string | null {
  if (!v) return null;
  return LOAN_TYPE_LABELS[v] ?? v;
}

const LOAN_TENOR_LABELS: Record<string, string> = {
  '3_months': '3 months', '6_months': '6 months', '12_months': '12 months', '24_months': '24 months',
};

function loanTenorLabel(v: string | null): string | null {
  if (!v) return null;
  return LOAN_TENOR_LABELS[v] ?? v;
}

const REPAYMENT_LABELS: Record<string, string> = {
  harvest_lumpsum: 'Lump sum at harvest', installments: 'Monthly installments', after_sale: 'After produce sale',
};

function repaymentLabel(v: string | null): string | null {
  if (!v) return null;
  return REPAYMENT_LABELS[v] ?? v;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Account', mobile_money: 'Mobile Money', none: 'No account',
};

function accountTypeLabel(v: string | null): string | null {
  if (!v) return null;
  return ACCOUNT_TYPE_LABELS[v] ?? v;
}

const NETWORK_LABELS: Record<string, string> = {
  mtn: 'MTN Mobile Money', vodafone: 'Vodafone Cash', airteltigo: 'AirtelTigo Money',
};

function networkLabel(v: string | null): string | null {
  if (!v) return null;
  return NETWORK_LABELS[v] ?? v;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && value !== '' ? value : '—';
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-gray-400 text-xs shrink-0">{label}</span>
      <span className="text-cropguard-forest font-medium text-xs text-right">{display}</span>
    </div>
  );
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
        .select('id,farmer_id,full_name,phone,region,region_code,district,primary_crop,is_verified,created_at,risk_category,first_name,last_name,gender,date_of_birth,national_id,national_id_type,photo_url,id_front_url,id_back_url,voice_consent_url,community,community_id,cooperative_id,program_id,cohort_id_ref,gps_address,residential_address,has_disability,disability_specify,is_refugee_displaced,refugee_specify,years_farm_experience,acres_cultivated,secondary_crop,secondary_crop_other,primary_crop_other,primary_bags_prev_season,secondary_bags_prev_season,owns_tractor,owns_house,marital_status,wives_count,children_count,other_business,other_business_specify,is_community_native,origin_if_not_native,community_preferences,primary_occupation,secondary_occupation,farming_type,farm_location,main_buyer_market,loan_type,loan_tenor,preferred_repayment,average_income,account_type,account_number,bank_name,mobile_money_network,other_income_sources,existing_loans,existing_loan_detail,farm_loss_history,has_agric_insurance,willing_sell_via_asinyo,willing_repay,declaration_date,interpreter_name,interpreter_language,interpreter_address,support_needed,other_agric_companies,other_agric_companies_specify,desired_assets,input_credit_participation,other_org_engagement,other_org_name,other_org_activities,asinyo_improvement_notes')
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

  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = farmers.filter(f => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!f.full_name.toLowerCase().includes(q) && !f.phone.includes(q) && !f.district.toLowerCase().includes(q)) return false;
    }
    if (filters.region   && (f.region ?? f.region_code) !== filters.region) return false;
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
    const header = 'Farmer ID,Full Name,Phone,Region,District,Crop,Verified,FRI Score,Zone,Cohort,Program,Created';
    const rows = filtered.map(f => [
      `"${f.farmer_id ?? ''}"`,
      `"${f.full_name}"`,
      f.phone,
      f.region ?? f.region_code ?? '',
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
    if (lines.length < 2) {
      setImportLog(['CSV must have a header row and at least one data row.']);
      setImporting(false);
      return;
    }
    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const dataLines = lines.slice(1);
    const log: string[] = [`Parsed ${dataLines.length} rows from CSV (${headers.length} columns).`];

    const get = (obj: Record<string, string>, key: string) => obj[key] ?? '';
    const toBool = (v: string) => v === 'yes' || v === 'true' ? true : v === 'no' || v === 'false' ? false : null;
    const toArr = (v: string) => v ? v.split('|').map(s => s.trim()).filter(Boolean) : [];
    const toNum = (v: string) => parseFloat(v) || null;

    let inserted = 0;
    let skipped  = 0;
    for (const line of dataLines) {
      const vals = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });

      const full_name   = get(row, 'first_name') && get(row, 'last_name') ? `${get(row, 'first_name')} ${get(row, 'last_name')}` : get(row, 'full_name') || get(row, 'first_name') || '';
      const phone       = get(row, 'phone');
      const national_id = get(row, 'national_id');
      const region = get(row, 'region') || get(row, 'region_code') || '';
      const district    = get(row, 'district');

      if (!full_name || !phone || !national_id || !region || !district) {
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
        farmer_id:          (() => {
          const yy = String(new Date().getFullYear()).slice(-2);
          const cc = '01';
          return `${yy}${cc}${String(inserted + 1).padStart(6, '0')}`;
        })(),
        full_name,
        phone,
        national_id,
        national_id_type:              get(row, 'national_id_type') || null,
        date_of_birth:                 get(row, 'date_of_birth') || null,
        gender:                        get(row, 'gender') || null,
        region,
        district,
        community:                     get(row, 'community') || '',
        primary_crop:                  (get(row, 'primary_crop') || 'other') as CropType,
        secondary_crop:                (get(row, 'secondary_crop') || null) as CropType | null,
        acres_cultivated:              toNum(get(row, 'acres_cultivated')),
        years_farm_experience:         toNum(get(row, 'years_farm_experience')),
        primary_bags_prev_season:      toNum(get(row, 'primary_bags_prev_season')),
        secondary_bags_prev_season:   toNum(get(row, 'secondary_bags_prev_season')),
        owns_tractor:                 toBool(get(row, 'owns_tractor')),
        owns_house:                   toBool(get(row, 'owns_house')),
        marital_status:               get(row, 'marital_status') || null,
        wives_count:                  toNum(get(row, 'wives_count')),
        children_count:               toNum(get(row, 'children_count')),
        other_business:               toBool(get(row, 'other_business')),
        other_business_specify:       get(row, 'other_business_specify') || null,
        is_community_native:          toBool(get(row, 'is_community_native')),
        origin_if_not_native:         get(row, 'origin_if_not_native') || null,
        community_preferences:        toArr(get(row, 'community_preferences')),
        other_agric_companies:        toBool(get(row, 'other_agric_companies')),
        other_agric_companies_specify: get(row, 'other_agric_companies_specify') || null,
        desired_assets:                toArr(get(row, 'desired_assets')),
        input_credit_participation:   toBool(get(row, 'input_credit_participation')),
        other_org_engagement:         toBool(get(row, 'other_org_engagement')),
        other_org_name:               get(row, 'other_org_name') || null,
        other_org_activities:         get(row, 'other_org_activities') || null,
        asinyo_improvement_notes:     get(row, 'asinyo_improvement_notes') || null,
        gps_address:                  get(row, 'gps_address') || null,
        residential_address:          get(row, 'residential_address') || null,
        has_disability:                toBool(get(row, 'has_disability')),
        disability_specify:           get(row, 'disability_specify') || null,
        is_refugee_displaced:          toBool(get(row, 'is_refugee_displaced')),
        refugee_specify:               get(row, 'refugee_specify') || null,
        primary_occupation:            get(row, 'primary_occupation') || null,
        secondary_occupation:          get(row, 'secondary_occupation') || null,
        farming_type:                  get(row, 'farming_type') || null,
        farm_location:                 get(row, 'farm_location') || null,
        main_buyer_market:             get(row, 'main_buyer_market') || null,
        loan_type:                     get(row, 'loan_type') || null,
        loan_tenor:                    get(row, 'loan_tenor') || null,
        preferred_repayment:           get(row, 'preferred_repayment') || null,
        average_income:                toNum(get(row, 'average_income')),
        account_type:                  get(row, 'account_type') || null,
        account_number:                get(row, 'account_number') || null,
        bank_name:                     get(row, 'bank_name') || null,
        mobile_money_network:          get(row, 'mobile_money_network') || null,
        other_income_sources:          get(row, 'other_income_sources') || null,
        existing_loans:                toBool(get(row, 'existing_loans')),
        existing_loan_detail:          get(row, 'existing_loan_detail') || null,
        farm_loss_history:             get(row, 'farm_loss_history') || null,
        has_agric_insurance:           toBool(get(row, 'has_agric_insurance')),
        willing_sell_via_asinyo:       toBool(get(row, 'willing_sell_via_asinyo')),
        willing_repay:                 toBool(get(row, 'willing_repay')),
        declaration_date:              get(row, 'declaration_date') || null,
        interpreter_name:              get(row, 'interpreter_name') || null,
        interpreter_language:          get(row, 'interpreter_language') || null,
        interpreter_address:           get(row, 'interpreter_address') || null,
        support_needed:                toArr(get(row, 'support_needed')),
        organisation_id:    profile.organisation_id,
        is_verified:        false,
      }).select('id').maybeSingle();

      if (error) {
        log.push(`Error inserting ${full_name}: ${error.message}`);
        skipped++;
      } else {
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
    setPage(1);
  }

  const pageSize = loadAll ? filtered.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedFiltered = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
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
                {REGION_NAME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                {['Farmer ID', 'Farmer', 'Phone', 'Region / District', 'Verified', 'FRI', 'Zone', 'Cohort', 'Flags'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No farmers match your filters.
                  </td>
                </tr>
              ) : (
                pagedFiltered.map(f => (
                  <tr
                    key={f.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openFarmerDetail(f)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-cropguard-mid font-semibold">{f.farmer_id ?? '—'}</td>
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
                      {f.region ?? f.region_code ?? '—'} · {f.district}
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
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
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
                {selected.photo_url
                  ? <img src={selected.photo_url} alt={selected.full_name} className="w-full h-full object-cover" />
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
                ['Farmer ID', selected.farmer_id ?? '—'],
                ['Phone',      selected.phone],
                ['Region',     REGION_LABELS[selected.region_code as RegionCode] ?? selected.region_code ?? selected.region ?? '—'],
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

            {/* Personal & Identity */}
            <DetailSection title="Personal & Identity">
              <DetailRow label="First Name" value={selected.first_name} />
              <DetailRow label="Last Name" value={selected.last_name} />
              <DetailRow label="Gender" value={selected.gender ? GENDER_LABELS[selected.gender] : null} />
              <DetailRow label="Date of Birth" value={selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-GB') : null} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="Region" value={REGION_LABELS[selected.region_code as RegionCode] ?? selected.region} />
              <DetailRow label="District" value={selected.district} />
              <DetailRow label="Community" value={selected.community} />
              <DetailRow label="Residential Address" value={selected.residential_address} />
              <DetailRow label="GPS Address" value={selected.gps_address} />
              <DetailRow label="Disability" value={boolVal(selected.has_disability)} />
              {selected.has_disability && <DetailRow label="Disability Detail" value={selected.disability_specify} />}
              <DetailRow label="Refugee / Displaced" value={boolVal(selected.is_refugee_displaced)} />
              {selected.is_refugee_displaced && <DetailRow label="Refugee Detail" value={selected.refugee_specify} />}
            </DetailSection>

            {/* ID Documents */}
            <DetailSection title="Identity Documents">
              <DetailRow label="ID Type" value={idTypeLabel(selected.national_id_type)} />
              <DetailRow label="ID Number" value={selected.national_id} />
              <div className="flex gap-3 mt-2">
                {selected.photo_url && (
                  <div className="text-center">
                    <img src={selected.photo_url} alt="Profile" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                    <p className="text-[10px] text-gray-400 mt-1">Profile Photo</p>
                  </div>
                )}
                {selected.id_front_url && (
                  <div className="text-center">
                    <img src={selected.id_front_url} alt="ID Front" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                    <p className="text-[10px] text-gray-400 mt-1">ID Front</p>
                  </div>
                )}
                {selected.id_back_url && (
                  <div className="text-center">
                    <img src={selected.id_back_url} alt="ID Back" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                    <p className="text-[10px] text-gray-400 mt-1">ID Back</p>
                  </div>
                )}
              </div>
              <DetailRow label="Voice Consent" value={selected.voice_consent_url ? 'Recorded' : 'Not recorded'} />
            </DetailSection>

            {/* Farm Information */}
            <DetailSection title="Farm Information">
              <DetailRow label="Years of Experience" value={selected.years_farm_experience != null ? String(selected.years_farm_experience) : null} />
              <DetailRow label="Acres Cultivated" value={selected.acres_cultivated != null ? String(selected.acres_cultivated) : null} />
              <DetailRow label="Primary Crop" value={CROP_LABELS[selected.primary_crop] ?? selected.primary_crop} />
              {selected.primary_crop === 'other' && <DetailRow label="Primary Crop (Other)" value={selected.primary_crop_other} />}
              <DetailRow label="Primary Bags (Prev Season)" value={selected.primary_bags_prev_season != null ? String(selected.primary_bags_prev_season) : null} />
              <DetailRow label="Secondary Crop" value={selected.secondary_crop ? (CROP_LABELS[selected.secondary_crop as CropType] ?? selected.secondary_crop) : null} />
              {selected.secondary_crop === 'other' && <DetailRow label="Secondary Crop (Other)" value={selected.secondary_crop_other} />}
              <DetailRow label="Secondary Bags (Prev Season)" value={selected.secondary_bags_prev_season != null ? String(selected.secondary_bags_prev_season) : null} />
              <DetailRow label="Owns Tractor" value={boolVal(selected.owns_tractor)} />
              <DetailRow label="Primary Occupation" value={occupationLabel(selected.primary_occupation)} />
              <DetailRow label="Secondary Occupation" value={selected.secondary_occupation} />
              <DetailRow label="Type of Farming" value={farmingTypeLabel(selected.farming_type)} />
              <DetailRow label="Farm Location" value={selected.farm_location} />
              <DetailRow label="Main Buyer / Market" value={selected.main_buyer_market} />
            </DetailSection>

            {/* Household & Community */}
            <DetailSection title="Household & Community">
              <DetailRow label="Owns House" value={boolVal(selected.owns_house)} />
              <DetailRow label="Marital Status" value={maritalLabel(selected.marital_status)} />
              <DetailRow label="Number of Wives" value={selected.wives_count != null ? String(selected.wives_count) : null} />
              <DetailRow label="Number of Children" value={selected.children_count != null ? String(selected.children_count) : null} />
              <DetailRow label="Other Business" value={boolVal(selected.other_business)} />
              {selected.other_business && <DetailRow label="Business Detail" value={selected.other_business_specify} />}
              <DetailRow label="Native of Community" value={boolVal(selected.is_community_native)} />
              {selected.is_community_native === false && <DetailRow label="Origin" value={selected.origin_if_not_native} />}
              <DetailRow label="Community Preferences" value={arrVal(selected.community_preferences)} />
            </DetailSection>

            {/* Financial Information */}
            <DetailSection title="Financial Information">
              <DetailRow label="Loan Type" value={loanTypeLabel(selected.loan_type)} />
              <DetailRow label="Loan Tenor" value={loanTenorLabel(selected.loan_tenor)} />
              <DetailRow label="Preferred Repayment" value={repaymentLabel(selected.preferred_repayment)} />
              <DetailRow label="Average Income (GHS/season)" value={selected.average_income != null ? String(selected.average_income) : null} />
              <DetailRow label="Account Type" value={accountTypeLabel(selected.account_type)} />
              {selected.account_type === 'bank' && <>
                <DetailRow label="Bank Name" value={selected.bank_name} />
                <DetailRow label="Account Number" value={selected.account_number} />
              </>}
              {selected.account_type === 'mobile_money' && <>
                <DetailRow label="Mobile Money Network" value={networkLabel(selected.mobile_money_network)} />
                <DetailRow label="Account Number" value={selected.account_number} />
              </>}
              <DetailRow label="Other Income Sources" value={selected.other_income_sources} />
              <DetailRow label="Existing Loans" value={boolVal(selected.existing_loans)} />
              {selected.existing_loans && <DetailRow label="Loan Details" value={selected.existing_loan_detail} />}
              <DetailRow label="Farm Loss History" value={selected.farm_loss_history} />
              <DetailRow label="Agricultural Insurance" value={boolVal(selected.has_agric_insurance)} />
              <DetailRow label="Willing to Sell via Asinyo" value={boolVal(selected.willing_sell_via_asinyo)} />
              <DetailRow label="Willing to Repay Loan" value={boolVal(selected.willing_repay)} />
              <DetailRow label="Declaration Date" value={selected.declaration_date ? new Date(selected.declaration_date).toLocaleDateString('en-GB') : null} />
            </DetailSection>

            {/* Support & Engagement */}
            <DetailSection title="Support & Engagement">
              <DetailRow label="Other Agric Companies" value={boolVal(selected.other_agric_companies)} />
              {selected.other_agric_companies && <DetailRow label="Companies Specified" value={selected.other_agric_companies_specify} />}
              <DetailRow label="Desired Assets" value={arrVal(selected.desired_assets)} />
              <DetailRow label="Input Credit Participation" value={boolVal(selected.input_credit_participation)} />
              <DetailRow label="Other Org Engagement" value={boolVal(selected.other_org_engagement)} />
              {selected.other_org_engagement && <>
                <DetailRow label="Organisation Name" value={selected.other_org_name} />
                <DetailRow label="Activities / Services" value={selected.other_org_activities} />
              </>}
              <DetailRow label="Support Needed" value={arrVal(selected.support_needed)} />
              <DetailRow label="Asinyo Improvement Notes" value={selected.asinyo_improvement_notes} />
            </DetailSection>

            {/* Interpreter */}
            <DetailSection title="Interpreter">
              <DetailRow label="Interpreter Name" value={selected.interpreter_name} />
              <DetailRow label="Language" value={selected.interpreter_language} />
              <DetailRow label="Address" value={selected.interpreter_address} />
            </DetailSection>

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
