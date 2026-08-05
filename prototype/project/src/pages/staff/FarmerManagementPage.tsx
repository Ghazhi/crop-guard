import { useState, useEffect, useCallback, useRef, Fragment, type ReactNode } from 'react';
import {
  Search, Check, UserPlus, Loader2, X,
  Users, Upload, Plus, Edit2,
  UserMinus, Download, AlertTriangle, Phone,
  UserCog, Trash2, Eye,
  RefreshCw, History, Clock,
  PackageCheck, Truck, CreditCard, UserCheck, FileText,
  ArrowRight, GitBranch, BarChart2, ChevronDown, ChevronUp,
  LayoutList, ClipboardList, Filter, SlidersHorizontal,
  Calendar, CheckCircle2, XCircle, Circle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Farmer, Program, Cohort, Enrollment, User } from '@/types';
import type { CropType, RegionCode, Gender } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CROP_LABELS, CROP_OPTIONS, REGION_LABELS,
  GENDER_LABELS,
  DISTRICTS_BY_REGION, phoneToEmail,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';
import FarmerRegistrationForm, { type FarmerFormData } from '@/components/FarmerRegistrationForm';

interface WorkflowEntry {
  id:            string;
  enrollment_id: string;
  farmer_id:     string;
  stage:         number;
  stage_name:    string;
  status:        string;
  notes:         string | null;
  reason_code:   string | null;
  actor_role:    string | null;
  created_at:    string;
}

interface FarmerWithMeta extends Farmer {
  enrollment?:       Enrollment;
  current_fri:       number | null;
  current_zone:      string | null;
  cohort_name:       string | null;
  program_name:      string | null;
  agent_name:        string | null;
  current_stage:     number;
  workflow:          WorkflowEntry[];
  duplicate_flag:     boolean;
  cooperative_name:  string | null;
  community_name:    string | null;
  baseline_done:     boolean;
  checkin_on_track:  boolean | null;
}

// ── Workflow constants ────────────────────────────────────────────────────────

const WORKFLOW_STAGES = [
  { stage: 1, name: 'Submitted',      icon: FileText    },
  { stage: 2, name: 'Consent',        icon: UserCheck   },
  { stage: 3, name: 'Under Review',   icon: Clock       },
  { stage: 4, name: 'Credit Review',  icon: CreditCard  },
  { stage: 5, name: 'Final Approval', icon: Check       },
  { stage: 6, name: 'Active',         icon: Check       },
  { stage: 7, name: 'Delivered',      icon: Truck       },
  { stage: 8, name: 'Repayment',      icon: PackageCheck },
];

const REASON_CODES = [
  'Eligibility criteria not met',
  'Incomplete documentation',
  'Credit risk too high',
  'Capacity limit reached',
  'Program suspended',
  'Farmer withdrew',
  'Other',
];

const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  approved:  'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  declined:  'bg-red-100 text-red-700',
  active:    'bg-emerald-100 text-emerald-700',
  graduated: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

// ── StageTracker ──────────────────────────────────────────────────────────────

function StageTracker({ current, workflow }: { current: number; workflow: WorkflowEntry[] }) {
  const getStatus = (stage: number) => {
    const entry = workflow.find(w => w.stage === stage);
    if (!entry) return stage < current ? 'completed' : stage === current ? 'active' : 'pending';
    if (entry.status === 'declined') return 'declined';
    if (stage < current || entry.status === 'approved') return 'completed';
    if (stage === current) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {WORKFLOW_STAGES.map((s, idx) => {
        const status = getStatus(s.stage);
        const Icon = s.icon;
        return (
          <div key={s.stage} className="flex items-start min-w-0">
            <div className="flex flex-col items-center min-w-[72px]">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                status === 'completed' && 'bg-emerald-500',
                status === 'active'    && 'bg-cropguard-dark ring-4 ring-cropguard-dark/20',
                status === 'pending'   && 'bg-gray-200',
                status === 'declined'  && 'bg-red-500',
              )}>
                {status === 'completed' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : status === 'declined' ? (
                  <X className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={cn('w-3.5 h-3.5', status === 'active' ? 'text-white' : 'text-gray-400')} />
                )}
              </div>
              <p className={cn(
                'text-[9px] text-center mt-1 leading-tight max-w-[60px]',
                status === 'active' ? 'text-cropguard-dark font-semibold' : 'text-gray-400'
              )}>
                {s.name}
              </p>
            </div>
            {idx < WORKFLOW_STAGES.length - 1 && (
              <div className={cn(
                'w-6 h-0.5 mt-4 shrink-0',
                status === 'completed' ? 'bg-emerald-400' : 'bg-gray-200'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface FarmerForm {
  full_name:          string;
  first_name:         string;
  last_name:          string;
  phone:              string;
  national_id:        string;
  national_id_type:   string;
  date_of_birth:      string;
  gender:             Gender | '';
  region:             string | '';
  district:           string;
  community:          string;
  primary_crop:       CropType | '';
  secondary_crop:     string;
  acres_cultivated:   string;
  years_farm_experience: string;
  primary_bags_prev_season: string;
  secondary_bags_prev_season: string;
  owns_tractor:       string;
  owns_house:         string;
  marital_status:      string;
  wives_count:        string;
  children_count:     string;
  other_business:     string;
  other_business_specify: string;
  is_community_native: string;
  origin_if_not_native: string;
  community_preferences: string;
  other_agric_companies: string;
  other_agric_companies_specify: string;
  desired_assets:     string;
  input_credit_participation: string;
  other_org_engagement: string;
  other_org_name:     string;
  other_org_activities: string;
  asinyo_improvement_notes: string;
  gps_address:        string;
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

const EMPTY_FARMER: FarmerForm = {
  full_name: '', first_name: '', last_name: '', phone: '', national_id: '', national_id_type: 'ghana_card',
  date_of_birth: '', gender: '', region: '', district: '', community: '',
  primary_crop: '', secondary_crop: '', acres_cultivated: '', years_farm_experience: '', primary_bags_prev_season: '',
  secondary_bags_prev_season: '', owns_tractor: '', owns_house: '', marital_status: '', wives_count: '',
  children_count: '', other_business: '', other_business_specify: '', is_community_native: '',
  origin_if_not_native: '', community_preferences: '', other_agric_companies: '',
  other_agric_companies_specify: '', desired_assets: '', input_credit_participation: '',
  other_org_engagement: '', other_org_name: '', other_org_activities: '',
  asinyo_improvement_notes: '', gps_address: '',
};

const CSV_HEADERS = [
  'first_name','last_name','phone','national_id','national_id_type','date_of_birth','gender',
  'region','district','community','primary_crop','secondary_crop',
  'acres_cultivated','years_farm_experience','primary_bags_prev_season','secondary_bags_prev_season',
  'owns_tractor','owns_house','marital_status','wives_count','children_count',
  'other_business','other_business_specify','is_community_native','origin_if_not_native',
  'community_preferences','other_agric_companies','other_agric_companies_specify',
  'desired_assets','input_credit_participation','other_org_engagement',
  'other_org_name','other_org_activities','asinyo_improvement_notes','gps_address',
  'residential_address','has_disability','disability_specify','is_refugee_displaced','refugee_specify',
  'primary_occupation','secondary_occupation','farming_type','farm_location','main_buyer_market',
  'loan_type','loan_tenor','preferred_repayment','average_income',
  'account_type','account_number','bank_name','mobile_money_network',
  'other_income_sources','existing_loans','existing_loan_detail','farm_loss_history','has_agric_insurance',
  'willing_sell_via_asinyo','willing_repay','declaration_date',
  'interpreter_name','interpreter_language','interpreter_address',
  'support_needed',
];

const ZONE_OPTIONS = [
  'Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter',
];

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  'bg-purple-100 text-purple-800',
  'Resilience Builder': 'bg-green-100 text-green-800',
  'Resilience Learner': 'bg-yellow-100 text-yellow-800',
  'Resilience Starter': 'bg-red-100 text-red-800',
};

const ZONE_RISK: Record<string, string> = {
  'Resilience Leader':  'Low Risk',
  'Resilience Builder': 'Managed Risk',
  'Resilience Learner': 'Elevated Risk',
  'Resilience Starter': 'Critical Risk',
};

const ENR_STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  graduated: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

// ── Registration table columns ────────────────────────────────────────────────

const boolStr = (v: boolean | null | undefined) => v === true ? 'Yes' : v === false ? 'No' : '—';
const arrStr = (v: string[] | null | undefined) => v && v.length ? v.join(', ') : '—';

const currentWeekNumber = (startDate: string | null): number => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  if (days < 0) return 0;
  return Math.floor(days / 7) + 1;
};

interface RegColumn {
  key: string;
  label: string;
  render: (f: FarmerWithMeta) => ReactNode;
}

const REG_COLUMNS: RegColumn[] = [
  { key: 'farmer_id', label: 'Farmer ID', render: f => <td className="px-2 py-2 font-mono text-[11px] text-cropguard-mid font-semibold whitespace-nowrap">{(f as any).farmer_id ?? '—'}</td> },
  { key: 'name', label: 'Name', render: f => <td className="px-2 py-2 font-medium text-cropguard-forest whitespace-nowrap">{f.full_name}</td> },
  { key: 'phone', label: 'Phone', render: f => <td className="px-2 py-2 font-mono text-gray-500 whitespace-nowrap">{f.phone}</td> },
  { key: 'national_id', label: 'National ID', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.national_id}</td> },
  { key: 'national_id_type', label: 'ID Type', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).national_id_type ?? '—'}</td> },
  { key: 'date_of_birth', label: 'DOB', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.date_of_birth ?? '—'}</td> },
  { key: 'gender', label: 'Gender', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.gender ? GENDER_LABELS[f.gender] : '—'}</td> },
  { key: 'region', label: 'Region', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.region ?? REGION_LABELS[f.region_code] ?? f.region_code ?? '—'}</td> },
  { key: 'district', label: 'District', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.district}</td> },
  { key: 'community', label: 'Community', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.community_name ?? (f.community || '—')}</td> },
  { key: 'primary_crop', label: 'Primary Crop', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{CROP_LABELS[f.primary_crop] ?? f.primary_crop}</td> },
  { key: 'secondary_crop', label: 'Secondary Crop', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).secondary_crop ?? '—'}</td> },
  { key: 'acres_cultivated', label: 'Acres', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).acres_cultivated ?? '—'}</td> },
  { key: 'years_farm_experience', label: 'Yrs Exp', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).years_farm_experience ?? '—'}</td> },
  { key: 'primary_bags_prev_season', label: 'Primary Bags', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).primary_bags_prev_season ?? '—'}</td> },
  { key: 'secondary_bags_prev_season', label: 'Sec. Bags', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).secondary_bags_prev_season ?? '—'}</td> },
  { key: 'owns_tractor', label: 'Tractor', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{boolStr((f as any).owns_tractor)}</td> },
  { key: 'owns_house', label: 'House', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{boolStr((f as any).owns_house)}</td> },
  { key: 'marital_status', label: 'Marital', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).marital_status ?? '—'}</td> },
  { key: 'wives_count', label: 'Wives', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).wives_count ?? '—'}</td> },
  { key: 'children_count', label: 'Children', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).children_count ?? '—'}</td> },
  { key: 'other_business', label: 'Other Biz', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).other_business ?? '—'}</td> },
  { key: 'is_community_native', label: 'Native', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{boolStr((f as any).is_community_native)}</td> },
  { key: 'origin_if_not_native', label: 'Origin', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).origin_if_not_native ?? '—'}</td> },
  { key: 'community_preferences', label: 'Community Prefs', render: f => <td className="px-2 py-2 text-gray-500">{arrStr((f as any).community_preferences)}</td> },
  { key: 'other_agric_companies', label: 'Other Agric Co.', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).other_agric_companies ?? '—'}</td> },
  { key: 'desired_assets', label: 'Desired Assets', render: f => <td className="px-2 py-2 text-gray-500">{arrStr((f as any).desired_assets)}</td> },
  { key: 'input_credit_participation', label: 'Input Credit', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).input_credit_participation ?? '—'}</td> },
  { key: 'other_org_engagement', label: 'Other Org', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{(f as any).other_org_engagement ?? '—'}</td> },
  { key: 'gps_address', label: 'GPS', render: f => <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{f.gps_address ?? '—'}</td> },
  { key: 'asinyo_improvement_notes', label: 'Notes', render: f => <td className="px-2 py-2 text-gray-500 max-w-40 truncate">{(f as any).asinyo_improvement_notes ?? '—'}</td> },
];

function downloadCsvTemplate() {
  const rows = [
    CSV_HEADERS.join(','),
    'Ama,Mensah,0241234567,GHA-XXXXXXXXX-X,ghana_card,1985-03-15,female,AH,Kumasi Metro,Adum,maize,rice,'
    + '3.5,5,20,15,no,yes,married,1,3,no,,yes,Kumasi,,Roads|Water|Hospital,no,,no,Tractor|Irrigation system,yes,no,,,"Keep improving",5.6789,-1.2345,'
    + '12 Mango Street Kumasi,no,,no,,crop_farming,trading,own_land,Near Asankragua,Local market,'
    + 'input_credit,6_months,harvest_lumpsum,5000,mobile_money,0241234567,,mtn,Remittances,no,,no,false,yes,yes,2026-07-26,'
    + 'John Doe,Twi,Kumasi,Seeds|Fertilizer|Tractor/Ploughing',
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'farmers_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(text: string): Partial<FarmerForm>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj as Partial<FarmerForm>;
  });
}

// ── Farmer Stats Panel ────────────────────────────────────────────────────────

const CHART_COLORS = ['#1a5c3a', '#2d8653', '#4db87a', '#90d4a8', '#c5ead5', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-cropguard-forest">{value}</p>
      {sub && <p className="text-xs text-cropguard-slate mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniBarChart({ data, dataKey = 'value', nameKey = 'name', height = 180 }: {
  data: { name: string; value: number }[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey={nameKey} tick={{ fontSize: 10, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          cursor={{ fill: '#f3f4f6' }}
        />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MiniPieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

interface FarmerStatsPanelProps {
  farmers: FarmerWithMeta[];
}

function FarmerStatsPanel({ farmers }: FarmerStatsPanelProps) {
  const total = farmers.length;
  if (total === 0) return <p className="text-sm text-cropguard-slate py-4 text-center">No farmer data to display.</p>;

  // Gender
  const genderCounts = farmers.reduce<Record<string, number>>((acc, f) => {
    const g = f.gender ?? 'unknown';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});
  const genderData = Object.entries(genderCounts).map(([name, value]) => ({
    name: name === 'prefer_not_to_say' ? 'N/S' : name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Age ranges
  const now = new Date();
  let ageBelow18 = 0, ageYouth = 0, ageAdult = 0, ageUnknown = 0;
  farmers.forEach(f => {
    if (!f.date_of_birth) { ageUnknown++; return; }
    const age = Math.floor((now.getTime() - new Date(f.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age < 18) ageBelow18++;
    else if (age <= 35) ageYouth++;
    else ageAdult++;
  });
  const ageData = [
    { name: 'Under 18', value: ageBelow18 },
    { name: 'Youth (18-35)', value: ageYouth },
    { name: 'Adult (35+)', value: ageAdult },
    ...(ageUnknown > 0 ? [{ name: 'Unknown', value: ageUnknown }] : []),
  ].filter(d => d.value > 0);

  // Marital status
  const maritalCounts = farmers.reduce<Record<string, number>>((acc, f) => {
    const m = (f as any).marital_status ?? 'unknown';
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});
  const maritalData = Object.entries(maritalCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })).filter(d => d.name !== 'Unknown' || d.value > 0);

  // Acreage
  let acreBelow1 = 0, acre2to5 = 0, acre6to10 = 0, acreAbove10 = 0, acreUnknown = 0;
  farmers.forEach(f => {
    const a = parseFloat((f as any).acres_cultivated ?? '');
    if (isNaN(a)) { acreUnknown++; return; }
    if (a < 2) acreBelow1++;
    else if (a <= 5) acre2to5++;
    else if (a <= 10) acre6to10++;
    else acreAbove10++;
  });
  const acreData = [
    { name: '< 2 acres', value: acreBelow1 },
    { name: '2–5 acres', value: acre2to5 },
    { name: '6–10 acres', value: acre6to10 },
    { name: '> 10 acres', value: acreAbove10 },
    ...(acreUnknown > 0 ? [{ name: 'Unknown', value: acreUnknown }] : []),
  ].filter(d => d.value > 0);

  // Major crops — only crops with at least 1 farmer
  const cropCounts = farmers.reduce<Record<string, number>>((acc, f) => {
    if (f.primary_crop) acc[f.primary_crop] = (acc[f.primary_crop] ?? 0) + 1;
    return acc;
  }, {});
  const cropData = Object.entries(cropCounts)
    .map(([k, v]) => ({ name: CROP_LABELS[k as CropType] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);

  // Community distribution (top 8)
  const commCounts = farmers.reduce<Record<string, number>>((acc, f) => {
    const c = f.community || 'Unknown';
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const commData = Object.entries(commCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Cooperative distribution
  const coopCounts = farmers.reduce<Record<string, number>>((acc, f) => {
    const c = (f as any).cooperative_id ? 'In a Group' : 'No Group';
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const coopData = Object.entries(coopCounts).map(([name, value]) => ({ name, value }));

  // Other agric companies
  const hasOtherAgric = farmers.filter(f => (f as any).other_agric_companies === true).length;
  const otherAgricData = [
    { name: 'Yes', value: hasOtherAgric },
    { name: 'No', value: total - hasOtherAgric },
  ].filter(d => d.value > 0);

  // Desired assets
  const assetCounts: Record<string, number> = {};
  farmers.forEach(f => {
    const assets: string[] = (f as any).desired_assets ?? [];
    assets.forEach(a => { assetCounts[a] = (assetCounts[a] ?? 0) + 1; });
  });
  const assetData = Object.entries(assetCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Input credit participation
  const inputCredit = farmers.filter(f => (f as any).input_credit_participation === true).length;
  const inputCreditData = [
    { name: 'Yes', value: inputCredit },
    { name: 'No', value: total - inputCredit },
  ].filter(d => d.value > 0);

  // Other org engagement
  const orgEngagement = farmers.filter(f => (f as any).other_org_engagement === true).length;
  const orgEngageData = [
    { name: 'Engaged', value: orgEngagement },
    { name: 'Not Engaged', value: total - orgEngagement },
  ].filter(d => d.value > 0);

  const maleCount   = farmers.filter(f => f.gender === 'male').length;
  const femaleCount = farmers.filter(f => f.gender === 'female').length;

  return (
    <div className="space-y-5">
      {/* KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard title="Total Farmers" value={total} />
        <StatCard title="Male" value={maleCount} sub={`${Math.round(maleCount / total * 100)}% of total`} />
        <StatCard title="Female" value={femaleCount} sub={`${Math.round(femaleCount / total * 100)}% of total`} />
        <StatCard title="Youth (18-35)" value={ageYouth} sub={`${Math.round(ageYouth / total * 100)}% of total`} />
        <StatCard title="Other Agric Co." value={hasOtherAgric} sub={`${Math.round(hasOtherAgric / total * 100)}% engaged`} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="Gender Distribution">
          <MiniPieChart data={genderData} />
        </ChartCard>
        <ChartCard title="Age Ranges">
          <MiniBarChart data={ageData} />
        </ChartCard>
        <ChartCard title="Marital Status">
          {maritalData.length > 0
            ? <MiniPieChart data={maritalData} />
            : <p className="text-xs text-gray-400 py-8 text-center">No data yet</p>}
        </ChartCard>
        <ChartCard title="Acreage Distribution">
          {acreData.length > 0
            ? <MiniBarChart data={acreData} />
            : <p className="text-xs text-gray-400 py-8 text-center">No data yet</p>}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Major Crops Cultivated">
          {cropData.length > 0
            ? <MiniBarChart data={cropData} height={200} />
            : <p className="text-xs text-gray-400 py-8 text-center">No data yet</p>}
        </ChartCard>
        <ChartCard title="Community Distribution">
          {commData.length > 0
            ? <MiniBarChart data={commData} height={200} />
            : <p className="text-xs text-gray-400 py-8 text-center">No data yet</p>}
        </ChartCard>
        <ChartCard title="Group / Cooperative">
          <MiniPieChart data={coopData} />
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="Other Agric Companies">
          <MiniPieChart data={otherAgricData} />
        </ChartCard>
        <ChartCard title="Desired Assets">
          {assetData.length > 0
            ? <MiniBarChart data={assetData} height={180} />
            : <p className="text-xs text-gray-400 py-8 text-center">No data yet</p>}
        </ChartCard>
        <ChartCard title="Input Credit Participation">
          <MiniPieChart data={inputCreditData} />
        </ChartCard>
        <ChartCard title="Active Org Engagement">
          <MiniPieChart data={orgEngageData} />
        </ChartCard>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FarmerManagementPage() {
  const profile = useAuthStore(s => s.profile);

  const [farmers,  setFarmers]  = useState<FarmerWithMeta[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [cohorts,  setCohorts]  = useState<Cohort[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [search,          setSearch]          = useState('');
  const [filterProgram,   setFilterProgram]   = useState('');
  const [filterCohort,    setFilterCohort]    = useState('');
  const [filterEnrolled,  setFilterEnrolled]  = useState<'all' | 'enrolled' | 'unenrolled'>('all');
  const [filterZone,        setFilterZone]        = useState('');
  const [filterAgent,       setFilterAgent]       = useState('');
  const [filterCommunity,   setFilterCommunity]   = useState('');
  const [filterCooperative, setFilterCooperative] = useState('');

  // Column-level filters for table headers
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [openColFilter, setOpenColFilter] = useState<string | null>(null);
  const setColFilter = (key: string, val: string) =>
    setColFilters(prev => { const n = { ...prev }; if (val) n[key] = val; else delete n[key]; return n; });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Farmer detail drawer (read view + history)
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [detailFarmer, setDetailFarmer] = useState<FarmerWithMeta | null>(null);
  const [enrHistory,   setEnrHistory]   = useState<EnrollmentHistoryEntry[]>([]);
  const [enrLoading,   setEnrLoading]   = useState(false);

  // Enroll drawer
  const [enrollOpen,     setEnrollOpen]     = useState(false);
  const [enrollProgram,  setEnrollProgram]  = useState('');
  const [enrollCohort,   setEnrollCohort]   = useState('');
  const [enrollCohorts,  setEnrollCohorts]  = useState<Cohort[]>([]);
  const [enrolling,      setEnrolling]      = useState(false);
  const [enrollMsg,      setEnrollMsg]      = useState<{ type: 'success' | 'error' | 'conflict'; text: string } | null>(null);
  const [enrollConflicts, setEnrollConflicts] = useState<string[]>([]);

  // Add farmer drawer
  const [addOpen,    setAddOpen]    = useState(false);
  const [addSaving,  setAddSaving]  = useState(false);
  const [addError,   setAddError]   = useState('');
  const [newFarmerId, setNewFarmerId] = useState('');
  const [addStep,    setAddStep]    = useState<'form' | 'enroll'>('form');
  const [addEnrollProgram, setAddEnrollProgram] = useState('');
  const [addEnrollCohort,  setAddEnrollCohort]  = useState('');
  const [addEnrollCohorts, setAddEnrollCohorts] = useState<Cohort[]>([]);

  // Edit farmer drawer
  const [editOpen,        setEditOpen]        = useState(false);
  const [editingFarmer,   setEditingFarmer]   = useState<FarmerWithMeta | null>(null);
  const [editInitialData, setEditInitialData] = useState<Partial<FarmerFormData>>({});
  const [editSaving,      setEditSaving]      = useState(false);
  const [editError,       setEditError]       = useState('');
  const [editKey,         setEditKey]         = useState(0);

  // Unenroll drawer
  const [unenrollOpen,     setUnenrollOpen]     = useState(false);
  const [unenrolling,      setUnenrolling]      = useState(false);
  const [farmerToUnenroll, setFarmerToUnenroll] = useState<FarmerWithMeta | null>(null);

  // Per-farmer agent assign
  const [agentAssignOpen,   setAgentAssignOpen]   = useState(false);
  const [agentAssignFarmer, setAgentAssignFarmer] = useState<FarmerWithMeta | null>(null);
  const [agentAssignId,     setAgentAssignId]     = useState('');
  const [agentAssignSaving, setAgentAssignSaving] = useState(false);
  const [agentAssignMsg,    setAgentAssignMsg]    = useState('');
  const [agentList,         setAgentList]         = useState<User[]>([]);

  // Bulk agent assign
  const [bulkAgentAssignOpen,   setBulkAgentAssignOpen]   = useState(false);
  const [bulkAgentAssignId,     setBulkAgentAssignId]     = useState('');
  const [bulkAgentAssignSaving, setBulkAgentAssignSaving] = useState(false);
  const [bulkAgentAssignMsg,    setBulkAgentAssignMsg]    = useState('');

  // CSV upload
  const [csvOpen,      setCsvOpen]      = useState(false);
  const [csvRows,      setCsvRows]      = useState<Partial<FarmerForm>[]>([]);
  const [csvError,     setCsvError]     = useState('');
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvMsg,       setCsvMsg]       = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Workflow action drawer
  const [wfActionOpen,   setWfActionOpen]   = useState(false);
  const [wfActionType,   setWfActionType]   = useState<'approve' | 'decline'>('approve');
  const [wfActionReason, setWfActionReason] = useState('__none__');
  const [wfActionNote,   setWfActionNote]   = useState('');
  const [wfActionSaving, setWfActionSaving] = useState(false);
  const [wfActionFarmer, setWfActionFarmer] = useState<FarmerWithMeta | null>(null);

  // Stats panel
  const [statsOpen, setStatsOpen] = useState(false);

  // View toggle: 'activity' = current table, 'registration' = all registration fields
  const [viewMode, setViewMode] = useState<'activity' | 'registration'>('activity');

  // Registration table column visibility
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const toggleCol = useCallback((key: string) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Community & cooperative lists for filters
  const [communityList,   setCommunityList]   = useState<{ id: string; name: string }[]>([]);
  const [cooperativeList, setCooperativeList] = useState<{ id: string; name: string }[]>([]);

  // Bulk delete
  const [bulkDeleteOpen,    setBulkDeleteOpen]    = useState(false);
  const [bulkDeleteSaving,  setBulkDeleteSaving]  = useState(false);
  const [bulkDeleteMsg,     setBulkDeleteMsg]     = useState('');

  // Single-farmer delete
  const [deleteFarmer,  setDeleteFarmer]  = useState<FarmerWithMeta | null>(null);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteSaving,  setDeleteSaving]  = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  // Collapsible filters
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 15;
  const [loadAll, setLoadAll] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadPrograms = useCallback(async () => {
    if (!profile) return;
    const [{ data: progs }, { data: coh }, { data: agts }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('cohorts').select('*, programs!inner(organisation_id)').eq('programs.organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('users').select('id,full_name,role,is_active,region_code,organisation_id').eq('organisation_id', profile.organisation_id).eq('role', 'agent').eq('is_active', true).order('full_name'), // users table still uses region_code enum
    ]);
    setPrograms(progs ?? []);
    setCohorts((coh ?? []) as unknown as Cohort[]);
    setAgentList((agts ?? []) as unknown as User[]);

    // Load communities & cooperatives for filters
    const [{ data: comms }, { data: coops }] = await Promise.all([
      supabase.from('communities').select('id,name').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('cooperatives').select('id,name').eq('organisation_id', profile.organisation_id).order('name'),
    ]);
    setCommunityList(comms ?? []);
    setCooperativeList(coops ?? []);
  }, [profile]);

  const loadFarmers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let q = supabase
      .from('farmers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name');

    if (search.trim()) {
      const s = search.trim();
      q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,national_id.ilike.%${s}%`);
    }

    const { data: farmerData } = await q.limit(500);
    const list = (farmerData ?? []) as Farmer[];

    if (list.length === 0) { setFarmers([]); setLoading(false); return; }

    const ids = list.map(f => f.id);

    let enrollQ = (supabase.from('enrollments') as any)
      .select('*')
      .in('farmer_id', ids)
      .eq('status', 'active');

    if (filterProgram) enrollQ = enrollQ.eq('program_id', filterProgram);
    if (filterCohort)  enrollQ = enrollQ.eq('cohort_id',  filterCohort);

    const [{ data: enrollData }, { data: scores }] = await Promise.all([
      enrollQ,
      (supabase.from('farmer_fri_scores') as any)
        .select('farmer_id,total_score,zone,week_number')
        .in('farmer_id', ids)
        .order('week_number', { ascending: false }),
    ]);

    const enrollMap: Record<string, Enrollment> = {};
    (enrollData ?? []).forEach((e: Enrollment) => { enrollMap[e.farmer_id] = e; });

    const latestScore = new Map<string, { total_score: number; zone: string }>();
    (scores ?? []).forEach((s: any) => {
      if (!latestScore.has(s.farmer_id)) latestScore.set(s.farmer_id, s);
    });

    // Build cohort/program name map from active enrollments
    const cohortNameMap = new Map<string, string>();
    const programNameMap = new Map<string, string>();
    (enrollData ?? []).forEach((e: any) => {
      const prog = programs.find(p => p.id === e.program_id);
      const coh  = cohorts.find(c => c.id === e.cohort_id);
      if (prog) programNameMap.set(e.farmer_id, prog.name);
      if (coh)  cohortNameMap.set(e.farmer_id,  coh.name);
    });

    // Detect duplicates by phone
    const phoneCount = new Map<string, number>();
    list.forEach(f => phoneCount.set(f.phone, (phoneCount.get(f.phone) ?? 0) + 1));

    // Build agent name map from enrollment agent_id
    const agentNameMap = new Map<string, string>();
    const enrollmentIdToFarmerId = new Map<string, string>();
    (enrollData ?? []).forEach((e: Enrollment) => {
      if (e.agent_id) {
        const agent = (agentList as User[]).find(a => a.id === e.agent_id);
        if (agent) agentNameMap.set(e.farmer_id, agent.full_name);
      }
      enrollmentIdToFarmerId.set(e.id, e.farmer_id);
    });

    // Fetch workflow entries for enrolled farmers
    const enrolledIds = (enrollData ?? []).map((e: Enrollment) => e.id);
    const workflowMap = new Map<string, WorkflowEntry[]>();
    if (enrolledIds.length > 0) {
      const { data: wfData } = await (supabase.from('enrollment_workflow') as any)
        .select('*')
        .in('enrollment_id', enrolledIds)
        .order('stage', { ascending: true });
      (wfData ?? []).forEach((w: WorkflowEntry) => {
        const farmerId = enrollmentIdToFarmerId.get(w.enrollment_id);
        if (farmerId) {
          const arr = workflowMap.get(farmerId) ?? [];
          arr.push(w);
          workflowMap.set(farmerId, arr);
        }
      });
    }

    // Fetch baseline assessments
    const baselineSet = new Set<string>();
    if (ids.length > 0) {
      const { data: baselineData } = await (supabase.from('baseline_assessments') as any)
        .select('farmer_id')
        .in('farmer_id', ids);
      (baselineData ?? []).forEach((b: any) => baselineSet.add(b.farmer_id));
    }

    // Fetch cooperative and community names directly (not from stale state)
    const [{ data: coopsData }, { data: commsData }] = await Promise.all([
      supabase.from('cooperatives').select('id,name').eq('organisation_id', profile.organisation_id),
      supabase.from('communities').select('id,name').eq('organisation_id', profile.organisation_id),
    ]);
    const coopNameMap = new Map<string, string>();
    (coopsData ?? []).forEach((c: any) => coopNameMap.set(c.id, c.name));
    const communityNameMap = new Map<string, string>();
    (commsData ?? []).forEach((c: any) => communityNameMap.set(c.id, c.name));

    const checkinOnTrackMap = new Map<string, boolean | null>();
    if (ids.length > 0) {
      const { data: checkinData } = await (supabase.from('farmer_checkins') as any)
        .select('farmer_id,week_number,status')
        .in('farmer_id', ids);

      const maxWeekByFarmer = new Map<string, number>();
      (checkinData ?? []).forEach((c: any) => {
        if (c.status === 'submitted' || c.status === 'approved' || c.status === 'verified') {
          const cur = maxWeekByFarmer.get(c.farmer_id) ?? 0;
          if (c.week_number > cur) maxWeekByFarmer.set(c.farmer_id, c.week_number);
        }
      });

      list.forEach(f => {
        const enr = enrollMap[f.id];
        if (!enr?.cohort_id) { checkinOnTrackMap.set(f.id, null); return; }
        const cohort = cohorts.find(c => c.id === enr.cohort_id);
        if (!cohort?.checkin_start_date) { checkinOnTrackMap.set(f.id, null); return; }
        const cw = currentWeekNumber(cohort.checkin_start_date);
        if (cw === 0) { checkinOnTrackMap.set(f.id, null); return; }
        const maxWeek = maxWeekByFarmer.get(f.id) ?? 0;
        checkinOnTrackMap.set(f.id, maxWeek >= cw);
      });
    }

    const merged: FarmerWithMeta[] = list.map(f => {
      const sc = latestScore.get(f.id);
      const wf = workflowMap.get(f.id) ?? [];
      const maxStage = wf.reduce((m, w) => Math.max(m, w.stage), f.enrollment ? 1 : 0);
      return {
        ...f,
        enrollment:       enrollMap[f.id],
        current_fri:      sc?.total_score ?? null,
        current_zone:     sc?.zone ?? null,
        cohort_name:      cohortNameMap.get(f.id) ?? null,
        program_name:     programNameMap.get(f.id) ?? null,
        agent_name:       agentNameMap.get(f.id) ?? null,
        current_stage:    maxStage,
        workflow:         wf,
        duplicate_flag:   (phoneCount.get(f.phone) ?? 1) > 1,
        cooperative_name: coopNameMap.get((f as any).cooperative_id) ?? null,
        community_name:   communityNameMap.get((f as any).community_id) ?? null,
        baseline_done:    baselineSet.has(f.id),
        checkin_on_track: checkinOnTrackMap.get(f.id) ?? null,
      };
    });

    // Apply enrollment filter — also exclude no-match when program/cohort filter active
    const postFilter = merged.filter(f => {
      if (filterProgram || filterCohort) return !!f.enrollment;
      if (filterEnrolled === 'enrolled')   return !!f.enrollment;
      if (filterEnrolled === 'unenrolled') return !f.enrollment;
      return true;
    });

    setFarmers(postFilter);
    setLoading(false);
  }, [profile, search, filterProgram, filterCohort, filterEnrolled, programs, cohorts]);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadFarmers(), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [loadFarmers]);

  useEffect(() => { if (!filterProgram) setFilterCohort(''); }, [filterProgram]);

  useEffect(() => {
    if (!enrollProgram) { setEnrollCohorts([]); setEnrollCohort(''); return; }
    setEnrollCohorts(cohorts.filter(c => c.program_id === enrollProgram));
    setEnrollCohort('');
  }, [enrollProgram, cohorts]);

  useEffect(() => {
    if (!addEnrollProgram) { setAddEnrollCohorts([]); setAddEnrollCohort(''); return; }
    setAddEnrollCohorts(cohorts.filter(c => c.program_id === addEnrollProgram));
    setAddEnrollCohort('');
  }, [addEnrollProgram, cohorts]);

  const filteredCohorts = filterProgram ? cohorts.filter(c => c.program_id === filterProgram) : cohorts;

  // ── Client-side filter ────────────────────────────────────────────────────

  // Activity view: only farmers assigned to a program (enrolled)
  const activityFarmers = viewMode === 'activity' ? farmers.filter(f => !!f.enrollment) : farmers;

  const displayed = activityFarmers.filter(f => {
    if (filterZone        && f.current_zone !== filterZone)        return false;
    if (filterAgent       && f.enrollment?.agent_id !== filterAgent) return false;
    if (filterCommunity   && (f as any).community_id   !== filterCommunity)    return false;
    if (filterCooperative && (f as any).cooperative_id !== filterCooperative)  return false;
    // Column-level filters (registration table)
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val) continue;
      let cellVal = '';
      if (key === 'name' || key === 'act_name') cellVal = f.full_name ?? '';
      else if (key === 'phone') cellVal = f.phone ?? '';
      else if (key === 'national_id') cellVal = f.national_id ?? '';
      else if (key === 'farmer_id') cellVal = (f as any).farmer_id ?? '';
      else if (key === 'gender') cellVal = f.gender ? GENDER_LABELS[f.gender] ?? f.gender : '';
      else if (key === 'region') cellVal = f.region ?? REGION_LABELS[f.region_code] ?? f.region_code ?? '';
      else if (key === 'district') cellVal = f.district ?? '';
      else if (key === 'community' || key === 'act_community') cellVal = f.community_name ?? (f.community ?? '');
      else if (key === 'primary_crop') cellVal = CROP_LABELS[f.primary_crop] ?? f.primary_crop ?? '';
      else if (key === 'secondary_crop') cellVal = (f as any).secondary_crop ?? '';
      else if (key === 'verified') cellVal = f.is_verified ? 'verified' : 'unverified';
      else if (key === 'baseline') cellVal = f.baseline_done ? 'done' : 'pending';
      else if (key === 'checkin') cellVal = f.checkin_on_track === true ? 'on track' : f.checkin_on_track === false ? 'missed' : 'none';
      else cellVal = String((f as any)[key] ?? '');
      if (!cellVal.toLowerCase().includes(val.toLowerCase())) return false;
    }
    return true;
  });

  const duplicateCount    = farmers.filter(f => f.duplicate_flag).length;
  const activeFilterCount = [filterProgram, filterCohort, filterEnrolled !== 'all', filterZone, filterAgent, filterCommunity, filterCooperative].filter(Boolean).length;

  const pageSize = loadAll ? displayed.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(displayed.length / pageSize));
  const pagedDisplayed = displayed.slice((page - 1) * pageSize, page * pageSize);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(displayed.map(f => f.id)));
  const clearAll  = () => setSelected(new Set());

  // ── Detail drawer ──────────────────────────────────────────────────────────

  const openDetail = async (f: FarmerWithMeta) => {
    setDetailFarmer(f);
    setDetailOpen(true);
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

  // ── Bulk enroll ────────────────────────────────────────────────────────────

  const openEnroll = () => {
    if (selected.size === 0) return;
    setEnrollProgram(''); setEnrollCohort(''); setEnrollMsg(null); setEnrollOpen(true);
  };

  const handleEnroll = async (forceReenroll = false) => {
    if (!enrollProgram) { setEnrollMsg({ type: 'error', text: 'Select a program.' }); return; }
    setEnrolling(true); setEnrollMsg(null);
    const farmerIds = [...selected];

    if (!forceReenroll) {
      const { data: existing } = await (supabase.from('enrollments') as any)
        .select('farmer_id')
        .in('farmer_id', farmerIds)
        .eq('status', 'active');
      const conflicts = (existing ?? []).map((e: any) => e.farmer_id);
      if (conflicts.length > 0) {
        const conflictNames = farmers.filter(f => conflicts.includes(f.id)).map(f => f.full_name).join(', ');
        setEnrollConflicts(conflicts);
        setEnrollMsg({
          type: 'conflict',
          text: `${conflicts.length} farmer${conflicts.length > 1 ? 's are' : ' is'} already in an active program: ${conflictNames}. Their current enrollment will be marked as graduated before enrolling in the new program.`,
        });
        setEnrolling(false);
        return;
      }
    }

    if (enrollConflicts.length > 0) {
      await Promise.all(enrollConflicts.map(farmer_id =>
        (supabase.rpc as any)('deactivate_farmer_active_enrollment', {
          p_farmer_id: farmer_id,
          p_reason: 'Re-enrolled in new program by staff',
        })
      ));
    }

    const rows = farmerIds.map(farmer_id => ({
      farmer_id,
      program_id: enrollProgram,
      cohort_id:  enrollCohort || null,
      agent_id:   profile!.id,
      status:     'active' as const,
    }));
    const { error } = await (supabase.from('enrollments') as any).insert(rows);
    setEnrolling(false);
    setEnrollConflicts([]);
    if (error) {
      setEnrollMsg({ type: 'error', text: 'Enrollment failed. Please try again.' });
    } else {
      // Auto-create auth accounts for enrolled farmers who don't have one yet
      const enrolledFarmers = farmers.filter(f => farmerIds.includes(f.id));
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (accessToken) {
        await Promise.all(enrolledFarmers.map(async (f) => {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-farmer-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                farmer_id: f.id,
                phone: f.phone,
                full_name: f.full_name,
                organisation_id: profile!.organisation_id,
              }),
            });
          } catch { /* best-effort — account may already exist */ }
        }));
      }
      setEnrollMsg({ type: 'success', text: `${selected.size} farmer${selected.size > 1 ? 's' : ''} enrolled successfully. Account credentials sent.` });
      setSelected(new Set());
      loadFarmers();
    }
  };

  // ── Add farmer ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setAddStep('form'); setAddError('');
    setNewFarmerId(''); setAddEnrollProgram(''); setAddEnrollCohort('');
    setAddOpen(true);
  };

  const handleAddFarmerComplete = async (data: FarmerFormData) => {
    if (!profile) return;
    setAddError('');
    setAddSaving(true);
    const fullName = `${data.first_name} ${data.last_name}`.trim();

    // Generate farmer_id: YY CC NNNNNN (10 digits)
    const yy = String(new Date().getFullYear()).slice(-2);
    const cc = data.cohort_id_ref ? '01' : '01'; // cohort sequence — default 01
    const prefix = `${yy}${cc}`;
    const { data: existingIds } = await supabase.from('farmers')
      .select('farmer_id')
      .like('farmer_id', `${prefix}%`)
      .order('farmer_id', { ascending: false })
      .limit(1);
    let seq = 1;
    if (existingIds && existingIds.length > 0 && (existingIds[0] as any).farmer_id) {
      const lastSeq = parseInt((existingIds[0] as any).farmer_id.slice(-6), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const farmerId = `${prefix}${String(seq).padStart(6, '0')}`;

    const { data: farmer, error } = await supabase.from('farmers').insert({
      farmer_id:                    farmerId,
      full_name:                    fullName,
      first_name:                   data.first_name,
      last_name:                    data.last_name,
      phone:                        data.phone,
      region:                       data.region || null,
      district:                     data.district || null,
      national_id:                  data.national_id,
      national_id_type:             data.national_id_type,
      date_of_birth:                data.date_of_birth || null,
      gender:                       data.gender || null,
      photo_url:                    data.photo_url || null,
      id_front_url:                 data.id_front_url || null,
      id_back_url:                  data.id_back_url || null,
      voice_consent_url:            data.voice_consent_url || null,
      community_id:                 data.community_id || null,
      cooperative_id:               data.cooperative_id || null,
      program_id:                   data.program_id || null,
      cohort_id_ref:                data.cohort_id_ref || null,
      gps_address:                  data.gps_address || null,
      primary_crop:                 data.primary_crop as CropType,
      primary_crop_other:           data.primary_crop_other || null,
      secondary_crop:               data.secondary_crop || null,
      secondary_crop_other:         data.secondary_crop_other || null,
      years_farm_experience:        parseInt(data.years_farm_experience) || null,
      acres_cultivated:             parseFloat(data.acres_cultivated) || null,
      primary_bags_prev_season:     parseInt(data.primary_bags_prev_season) || null,
      secondary_bags_prev_season:   parseInt(data.secondary_bags_prev_season) || null,
      owns_tractor:                 data.owns_tractor === 'yes' ? true : data.owns_tractor === 'no' ? false : null,
      owns_house:                   data.owns_house === 'yes' ? true : data.owns_house === 'no' ? false : null,
      marital_status:               data.marital_status || null,
      wives_count:                  parseInt(data.wives_count) || null,
      children_count:               parseInt(data.children_count) || null,
      other_business:               data.other_business === 'yes' ? true : data.other_business === 'no' ? false : null,
      other_business_specify:       data.other_business_specify || null,
      is_community_native:          data.is_community_native === 'yes' ? true : data.is_community_native === 'no' ? false : null,
      origin_if_not_native:         data.origin_if_not_native || null,
      community_preferences:        data.community_preferences.length ? data.community_preferences : null,
      other_agric_companies:        data.other_agric_companies === 'yes' ? true : data.other_agric_companies === 'no' ? false : null,
      other_agric_companies_specify: data.other_agric_companies_specify || null,
      desired_assets:               data.desired_assets.length ? data.desired_assets : null,
      input_credit_participation:   data.input_credit_participation === 'yes' ? true : data.input_credit_participation === 'no' ? false : null,
      other_org_engagement:         data.other_org_engagement === 'yes' ? true : data.other_org_engagement === 'no' ? false : null,
      other_org_activities:         data.other_org_activities || null,
      other_org_name:               data.other_org_name || null,
      asinyo_improvement_notes:     data.asinyo_improvement_notes || null,
      residential_address:          data.residential_address || null,
      has_disability:                data.has_disability === 'yes' ? true : data.has_disability === 'no' ? false : null,
      disability_specify:            data.disability_specify || null,
      is_refugee_displaced:          data.is_refugee_displaced === 'yes' ? true : data.is_refugee_displaced === 'no' ? false : null,
      refugee_specify:               data.refugee_specify || null,
      primary_occupation:            data.primary_occupation || null,
      secondary_occupation:          data.secondary_occupation || null,
      farming_type:                  data.farming_type || null,
      farm_location:                 data.farm_location || null,
      main_buyer_market:             data.main_buyer_market || null,
      loan_type:                     data.loan_type || null,
      loan_tenor:                    data.loan_tenor || null,
      preferred_repayment:           data.preferred_repayment || null,
      average_income:                parseFloat(data.average_income) || null,
      account_type:                  data.account_type || null,
      account_number:                data.account_number || null,
      bank_name:                     data.bank_name || null,
      mobile_money_network:          data.mobile_money_network || null,
      other_income_sources:          data.other_income_sources || null,
      existing_loans:                data.existing_loans === 'yes' ? true : data.existing_loans === 'no' ? false : null,
      existing_loan_detail:          data.existing_loan_detail || null,
      farm_loss_history:             data.farm_loss_history || null,
      has_agric_insurance:           data.has_agric_insurance === 'yes' ? true : data.has_agric_insurance === 'no' ? false : null,
      willing_sell_via_asinyo:       data.willing_sell_via_asinyo === 'yes' ? true : data.willing_sell_via_asinyo === 'no' ? false : null,
      willing_repay:                 data.willing_repay === 'yes' ? true : data.willing_repay === 'no' ? false : null,
      declaration_date:              data.declaration_date || null,
      interpreter_name:              data.interpreter_name || null,
      interpreter_language:          data.interpreter_language || null,
      interpreter_address:           data.interpreter_address || null,
      support_needed:                data.support_needed.length ? data.support_needed : null,
      organisation_id:              profile.organisation_id,
      is_draft:                     false,
    }).select().maybeSingle();

    setAddSaving(false);
    if (error || !farmer) {
      setAddError(error?.message?.includes('unique') ? 'A farmer with this National ID already exists.' : (error?.message ?? 'Failed to save farmer.'));
      return;
    }
    const { data: signUpResult } = await supabase.auth.signUp({
      email: phoneToEmail(data.phone),
      password: '654321',
      options: { data: { role: 'farmer', full_name: fullName, organisation_id: profile.organisation_id, farmer_id: farmer.id } },
    });
    if (signUpResult?.user?.id) {
      await supabase.from('users').update({ must_change_password: true }).eq('id', signUpResult.user.id);
    }
    setNewFarmerId(farmer.id);
    setAddStep('enroll');
  };

  const handleAddEnroll = async () => {
    if (!addEnrollProgram || !newFarmerId) { setAddOpen(false); loadFarmers(); return; }
    await (supabase.from('enrollments') as any).insert({
      farmer_id:  newFarmerId,
      program_id: addEnrollProgram,
      cohort_id:  addEnrollCohort || null,
      agent_id:   profile!.id,
      status:     'active',
    });
    setAddOpen(false);
    loadFarmers();
  };

  // ── Edit farmer ────────────────────────────────────────────────────────────

  const openEdit = (f: FarmerWithMeta) => {
    setEditingFarmer(f);
    const data: Partial<FarmerFormData> = {
      first_name:            (f as any).first_name ?? '',
      last_name:             (f as any).last_name ?? '',
      gender:                (f.gender as Gender | '') ?? '',
      date_of_birth:         f.date_of_birth ?? '',
      phone:                 f.phone,
      region:                (f as any).region ?? (f as any).region_code ?? '',
      district:              (f as any).district ?? '',
      national_id_type:      (f as any).national_id_type ?? '',
      national_id:           f.national_id,
      photo_url:             (f as any).photo_url ?? '',
      id_front_url:          (f as any).id_front_url ?? '',
      id_back_url:           (f as any).id_back_url ?? '',
      voice_consent_url:     (f as any).voice_consent_url ?? '',
      community_id:          (f as any).community_id ?? '',
      cooperative_id:        (f as any).cooperative_id ?? '',
      program_id:            f.enrollment?.program_id ?? '',
      cohort_id_ref:         f.enrollment?.cohort_id ?? '',
      years_farm_experience: (f as any).years_farm_experience?.toString() ?? '',
      acres_cultivated:      (f as any).acres_cultivated?.toString() ?? '',
      primary_crop:          f.primary_crop ?? '',
      primary_crop_other:    (f as any).primary_crop_other ?? '',
      secondary_crop:        (f as any).secondary_crop ?? '',
      secondary_crop_other:  (f as any).secondary_crop_other ?? '',
      primary_bags_prev_season:   (f as any).primary_bags_prev_season?.toString() ?? '',
      secondary_bags_prev_season: (f as any).secondary_bags_prev_season?.toString() ?? '',
      owns_tractor:          (f as any).owns_tractor ?? '',
      owns_house:            (f as any).owns_house ?? '',
      marital_status:        (f as any).marital_status ?? '',
      wives_count:           (f as any).wives_count?.toString() ?? '',
      children_count:        (f as any).children_count?.toString() ?? '',
      other_business:        (f as any).other_business ?? '',
      other_business_specify: (f as any).other_business_specify ?? '',
      is_community_native:   (f as any).is_community_native ?? '',
      origin_if_not_native:  (f as any).origin_if_not_native ?? '',
      community_preferences: (f as any).community_preferences ?? [],
      other_agric_companies: (f as any).other_agric_companies ?? '',
      other_agric_companies_specify: (f as any).other_agric_companies_specify ?? '',
      desired_assets:        (f as any).desired_assets ?? [],
      input_credit_participation: (f as any).input_credit_participation ?? '',
      other_org_engagement:  (f as any).other_org_engagement ?? '',
      other_org_activities:  (f as any).other_org_activities ?? '',
      other_org_name:        (f as any).other_org_name ?? '',
      asinyo_improvement_notes: (f as any).asinyo_improvement_notes ?? '',
      gps_address:           (f as any).gps_address ?? '',
      residential_address:          (f as any).residential_address ?? '',
      has_disability:                (f as any).has_disability ?? '',
      disability_specify:            (f as any).disability_specify ?? '',
      is_refugee_displaced:          (f as any).is_refugee_displaced ?? '',
      refugee_specify:               (f as any).refugee_specify ?? '',
      primary_occupation:            (f as any).primary_occupation ?? '',
      secondary_occupation:          (f as any).secondary_occupation ?? '',
      farming_type:                  (f as any).farming_type ?? '',
      farm_location:                 (f as any).farm_location ?? '',
      main_buyer_market:             (f as any).main_buyer_market ?? '',
      loan_type:                     (f as any).loan_type ?? '',
      loan_tenor:                    (f as any).loan_tenor ?? '',
      preferred_repayment:           (f as any).preferred_repayment ?? '',
      average_income:                (f as any).average_income?.toString() ?? '',
      account_type:                  (f as any).account_type ?? '',
      account_number:                (f as any).account_number ?? '',
      bank_name:                     (f as any).bank_name ?? '',
      mobile_money_network:          (f as any).mobile_money_network ?? '',
      other_income_sources:          (f as any).other_income_sources ?? '',
      existing_loans:                (f as any).existing_loans ?? '',
      existing_loan_detail:          (f as any).existing_loan_detail ?? '',
      farm_loss_history:             (f as any).farm_loss_history ?? '',
      has_agric_insurance:           (f as any).has_agric_insurance ?? '',
      willing_sell_via_asinyo:       (f as any).willing_sell_via_asinyo ?? '',
      willing_repay:                 (f as any).willing_repay ?? '',
      declaration_date:              (f as any).declaration_date ?? '',
      interpreter_name:              (f as any).interpreter_name ?? '',
      interpreter_language:          (f as any).interpreter_language ?? '',
      interpreter_address:           (f as any).interpreter_address ?? '',
      support_needed:                (f as any).support_needed ?? [],
    };
    setEditInitialData(data);
    setEditError('');
    setEditKey(k => k + 1);
    setEditOpen(true);
  };

  const handleEditComplete = async (data: FarmerFormData, andExit?: boolean) => {
    if (!editingFarmer) return;
    setEditSaving(true); setEditError('');
    const { error } = await supabase.from('farmers').update({
      full_name:             `${data.first_name} ${data.last_name}`.trim(),
      first_name:            data.first_name || null,
      last_name:             data.last_name || null,
      phone:                 data.phone,
      region:                data.region || null,
      district:              data.district || null,
      national_id:           data.national_id,
      national_id_type:      data.national_id_type || null,
      date_of_birth:         data.date_of_birth || null,
      gender:                data.gender || null,
      photo_url:             data.photo_url || null,
      id_front_url:          data.id_front_url || null,
      id_back_url:           data.id_back_url || null,
      voice_consent_url:     data.voice_consent_url || null,
      community_id:          data.community_id || null,
      cooperative_id:        data.cooperative_id || null,
      primary_crop:          data.primary_crop as CropType || null,
      primary_crop_other:    data.primary_crop_other || null,
      secondary_crop:        data.secondary_crop || null,
      secondary_crop_other:  data.secondary_crop_other || null,
      years_farm_experience: parseInt(data.years_farm_experience) || null,
      acres_cultivated:      parseFloat(data.acres_cultivated) || null,
      primary_bags_prev_season:   parseInt(data.primary_bags_prev_season) || null,
      secondary_bags_prev_season: parseInt(data.secondary_bags_prev_season) || null,
      owns_tractor:          data.owns_tractor === 'yes' ? true : data.owns_tractor === 'no' ? false : null,
      owns_house:            data.owns_house === 'yes' ? true : data.owns_house === 'no' ? false : null,
      marital_status:        data.marital_status || null,
      wives_count:           parseInt(data.wives_count) || null,
      children_count:        parseInt(data.children_count) || null,
      other_business:        data.other_business === 'yes' ? true : data.other_business === 'no' ? false : null,
      other_business_specify: data.other_business_specify || null,
      is_community_native:   data.is_community_native === 'yes' ? true : data.is_community_native === 'no' ? false : null,
      origin_if_not_native:  data.origin_if_not_native || null,
      community_preferences: data.community_preferences.length ? data.community_preferences : null,
      other_agric_companies: data.other_agric_companies === 'yes' ? true : data.other_agric_companies === 'no' ? false : null,
      other_agric_companies_specify: data.other_agric_companies_specify || null,
      desired_assets:        data.desired_assets.length ? data.desired_assets : null,
      input_credit_participation: data.input_credit_participation === 'yes' ? true : data.input_credit_participation === 'no' ? false : null,
      other_org_engagement:  data.other_org_engagement === 'yes' ? true : data.other_org_engagement === 'no' ? false : null,
      other_org_activities:  data.other_org_activities || null,
      other_org_name:        data.other_org_name || null,
      asinyo_improvement_notes: data.asinyo_improvement_notes || null,
      residential_address:          data.residential_address || null,
      has_disability:                data.has_disability === 'yes' ? true : data.has_disability === 'no' ? false : null,
      disability_specify:            data.disability_specify || null,
      is_refugee_displaced:          data.is_refugee_displaced === 'yes' ? true : data.is_refugee_displaced === 'no' ? false : null,
      refugee_specify:               data.refugee_specify || null,
      primary_occupation:            data.primary_occupation || null,
      secondary_occupation:          data.secondary_occupation || null,
      farming_type:                  data.farming_type || null,
      farm_location:                 data.farm_location || null,
      main_buyer_market:             data.main_buyer_market || null,
      loan_type:                     data.loan_type || null,
      loan_tenor:                    data.loan_tenor || null,
      preferred_repayment:           data.preferred_repayment || null,
      average_income:                parseFloat(data.average_income) || null,
      account_type:                  data.account_type || null,
      account_number:                data.account_number || null,
      bank_name:                     data.bank_name || null,
      mobile_money_network:          data.mobile_money_network || null,
      other_income_sources:          data.other_income_sources || null,
      existing_loans:                data.existing_loans === 'yes' ? true : data.existing_loans === 'no' ? false : null,
      existing_loan_detail:          data.existing_loan_detail || null,
      farm_loss_history:             data.farm_loss_history || null,
      has_agric_insurance:           data.has_agric_insurance === 'yes' ? true : data.has_agric_insurance === 'no' ? false : null,
      willing_sell_via_asinyo:       data.willing_sell_via_asinyo === 'yes' ? true : data.willing_sell_via_asinyo === 'no' ? false : null,
      willing_repay:                 data.willing_repay === 'yes' ? true : data.willing_repay === 'no' ? false : null,
      declaration_date:              data.declaration_date || null,
      interpreter_name:              data.interpreter_name || null,
      interpreter_language:          data.interpreter_language || null,
      interpreter_address:           data.interpreter_address || null,
      support_needed:                data.support_needed.length ? data.support_needed : null,
      gps_address:           data.gps_address || null,
    }).eq('id', editingFarmer.id);
    setEditSaving(false);
    if (error) { setEditError(error.message); throw error; }
    if (andExit) setEditOpen(false);
    loadFarmers();
  };

  // ── Unenroll ───────────────────────────────────────────────────────────────

  const openUnenroll = (f: FarmerWithMeta) => {
    setFarmerToUnenroll(f);
    setUnenrollOpen(true);
  };

  const handleUnenroll = async () => {
    if (!farmerToUnenroll?.enrollment) return;
    setUnenrolling(true);
    await (supabase.from('enrollments') as any)
      .update({ status: 'withdrawn' })
      .eq('id', farmerToUnenroll.enrollment.id);
    setUnenrolling(false);
    setUnenrollOpen(false);
    loadFarmers();
  };

  // ── Per-farmer agent assign ────────────────────────────────────────────────

  const openAgentAssign = (f: FarmerWithMeta) => {
    setAgentAssignFarmer(f);
    setAgentAssignId(f.enrollment?.agent_id ?? '');
    setAgentAssignMsg('');
    setAgentAssignOpen(true);
  };

  const handleAgentAssign = async () => {
    if (!agentAssignFarmer?.enrollment) return;
    setAgentAssignSaving(true); setAgentAssignMsg('');
    const { error } = await (supabase.from('enrollments') as any)
      .update({ agent_id: agentAssignId || null })
      .eq('id', agentAssignFarmer.enrollment.id);
    setAgentAssignSaving(false);
    if (error) { setAgentAssignMsg('Failed to assign. Please try again.'); return; }
    setAgentAssignMsg('Agent assigned successfully.');
    loadFarmers();
  };

  const openBulkAgentAssign = () => {
    if (selected.size === 0) return;
    const enrolledSelected = farmers.filter(f => selected.has(f.id) && f.enrollment);
    if (enrolledSelected.length === 0) return;
    setBulkAgentAssignId(''); setBulkAgentAssignMsg(''); setBulkAgentAssignOpen(true);
  };

  const handleBulkAgentAssign = async () => {
    if (!bulkAgentAssignId) { setBulkAgentAssignMsg('Select an agent.'); return; }
    setBulkAgentAssignSaving(true); setBulkAgentAssignMsg('');
    const enrollmentIds = farmers
      .filter(f => selected.has(f.id) && f.enrollment)
      .map(f => f.enrollment!.id);
    const { error } = await (supabase.from('enrollments') as any)
      .update({ agent_id: bulkAgentAssignId })
      .in('id', enrollmentIds);
    setBulkAgentAssignSaving(false);
    if (error) { setBulkAgentAssignMsg('Failed to assign. Please try again.'); return; }
    setBulkAgentAssignMsg(`${enrollmentIds.length} farmer${enrollmentIds.length !== 1 ? 's' : ''} assigned successfully.`);
    setSelected(new Set());
    loadFarmers();
  };

  const handleBulkDelete = async () => {
    setBulkDeleteSaving(true); setBulkDeleteMsg('');
    const ids = Array.from(selected);
    let deleted = 0; let failed = 0;
    for (const id of ids) {
      const { error } = await supabase.from('farmers').delete().eq('id', id);
      if (error) failed++; else deleted++;
    }
    setBulkDeleteSaving(false);
    if (failed > 0) {
      setBulkDeleteMsg(`${deleted} deleted, ${failed} failed (may have linked records).`);
    } else {
      setBulkDeleteMsg(`${deleted} farmer${deleted !== 1 ? 's' : ''} deleted successfully.`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      loadFarmers();
    }
  };

  // ── Single-farmer delete ───────────────────────────────────────────────────

  const openDelete = (f: FarmerWithMeta) => {
    setDeleteFarmer(f);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteFarmer) return;
    setDeleteSaving(true); setDeleteError('');
    const { error } = await supabase.from('farmers').delete().eq('id', deleteFarmer.id);
    setDeleteSaving(false);
    if (error) {
      setDeleteError(error.message ?? 'Failed to delete farmer.');
      return;
    }
    setDeleteOpen(false);
    setDeleteFarmer(null);
    if (detailOpen) { setDetailOpen(false); setDetailFarmer(null); }
    loadFarmers();
  };

  // ── CSV upload ─────────────────────────────────────────────────────────────

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(''); setCsvMsg('');
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target?.result as string);
      if (rows.length === 0) { setCsvError('No data rows found in CSV.'); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (csvRows.length === 0) return;
    setCsvUploading(true); setCsvError(''); setCsvMsg('');
    let success = 0; let failed = 0; let skipped = 0;
    const errors: string[] = [];
    const parseArr = (v: string | undefined) =>
      v ? v.split('|').map(s => s.trim()).filter(Boolean) : null;
    const parseBool = (v: string | undefined) =>
      v ? (v.toLowerCase() === 'yes' ? true : v.toLowerCase() === 'no' ? false : null) : null;
    const parseNum = (v: string | undefined) =>
      v ? (parseFloat(v) || null) : null;
    const parseInt2 = (v: string | undefined) =>
      v ? (parseInt(v, 10) || null) : null;
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const label = `Row ${i + 2}`;
    if (!row.phone || !row.national_id || !row.primary_crop || (!row.first_name && !row.full_name)) {
        errors.push(`${label} (${row.first_name || row.full_name || 'unnamed'}): missing required field`);
        failed++; continue;
      }
      const rawGender = (row.gender ?? '').trim().toLowerCase() || null;
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
      const normalizedGender = rawGender && validGenders.includes(rawGender) ? rawGender : null;
      if (rawGender && !validGenders.includes(rawGender)) {
        errors.push(`${label} (${row.full_name || row.first_name}): invalid gender "${row.gender}" — set to null`);
      }
      let normalizedDob: string | null = row.date_of_birth || null;
      if (normalizedDob) {
        const d = new Date(normalizedDob);
        if (isNaN(d.getTime())) {
          errors.push(`${label} (${row.full_name || row.first_name}): invalid date_of_birth "${row.date_of_birth}" — set to null`);
          normalizedDob = null;
        }
      }
      const CROP_ALIASES: Record<string, string> = {
        groundnuts: 'groundnut', soybeans: 'soybean', beans: 'other',
        cowpea: 'other', cowpeas: 'other', wheat: 'other',
      };
      const VALID_CROPS = ['maize','rice','cassava','yam','groundnut','soybean','sorghum','millet','cocoa','coffee','tomato','pepper','plantain','banana','pineapple','other'];
      function normalizeCrop(raw: string | undefined): string | null {
        if (!raw) return null;
        // take the first crop if comma-separated
        const first = raw.split(',')[0].trim().toLowerCase();
        if (VALID_CROPS.includes(first)) return first;
        if (CROP_ALIASES[first]) return CROP_ALIASES[first];
        return null;
      }
      const normalizedPrimaryCrop = normalizeCrop(row.primary_crop);
      if (row.primary_crop && !normalizedPrimaryCrop) {
        errors.push(`${label} (${row.full_name || row.first_name}): unknown crop_type "${row.primary_crop}" — set to null`);
      }
      const normalizedSecondaryCrop = normalizeCrop(row.secondary_crop);
      const { error } = await supabase.from('farmers').insert({
        farmer_id:          (() => {
          const yy = String(new Date().getFullYear()).slice(-2);
          const cc = '01';
          const prefix = `${yy}${cc}`;
          // sequential per import — not concurrency-safe but adequate for bulk import
          return `${prefix}${String(success + 1).padStart(6, '0')}`;
        })(),
        full_name:          `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.full_name,
        first_name:         row.first_name ?? null,
        last_name:          row.last_name ?? null,
        phone:              row.phone!,
        national_id:        row.national_id!,
        national_id_type:   row.national_id_type ?? 'ghana_card',
        date_of_birth:      normalizedDob,
        gender:             normalizedGender,
        region:            row.region || row.region_code || null,
        district:           row.district || 'North Gonja',
        community:          row.community || '',
        primary_crop:       normalizedPrimaryCrop as CropType,
        secondary_crop:     normalizedSecondaryCrop,
        acres_cultivated:   parseNum(row.acres_cultivated),
        years_farm_experience: parseInt2(row.years_farm_experience),
        primary_bags_prev_season: parseInt2(row.primary_bags_prev_season),
        secondary_bags_prev_season: parseInt2(row.secondary_bags_prev_season),
        owns_tractor:       parseBool(row.owns_tractor),
        owns_house:         parseBool(row.owns_house),
        marital_status:      row.marital_status || null,
        wives_count:        parseInt2(row.wives_count),
        children_count:     parseInt2(row.children_count),
        other_business:     row.other_business || null,
        other_business_specify: row.other_business_specify || null,
        is_community_native: parseBool(row.is_community_native),
        origin_if_not_native: row.origin_if_not_native || null,
        community_preferences: parseArr(row.community_preferences),
        other_agric_companies: row.other_agric_companies || null,
        other_agric_companies_specify: row.other_agric_companies_specify || null,
        desired_assets:     parseArr(row.desired_assets),
        input_credit_participation: row.input_credit_participation || null,
        other_org_engagement: row.other_org_engagement || null,
        other_org_name:     row.other_org_name || null,
        other_org_activities: row.other_org_activities || null,
        asinyo_improvement_notes: row.asinyo_improvement_notes || null,
        gps_address:        row.gps_address || null,
        organisation_id:    profile!.organisation_id,
      });
      if (error) {
        if (error.code === '23505') {
          errors.push(`${label} (${row.full_name}): duplicate national ID — skipped`);
          skipped++;
        } else {
          errors.push(`${label} (${row.full_name}): ${error.message}`);
          failed++;
        }
      } else {
        const { data: su } = await supabase.auth.signUp({
          email: phoneToEmail(row.phone!),
          password: '654321',
          options: { data: { role: 'farmer', full_name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.full_name, organisation_id: profile!.organisation_id } },
        });
        if (su?.user?.id) {
          await supabase.from('users').update({ must_change_password: true }).eq('id', su.user.id);
        }
        success++;
      }
    }
    setCsvUploading(false);
    const parts = [`${success} added`];
    if (skipped > 0) parts.push(`${skipped} skipped (duplicate)`);
    if (failed > 0)  parts.push(`${failed} failed`);
    setCsvMsg(`Import complete: ${parts.join(', ')}.`);
    if (errors.length > 0) setCsvError(errors.join('\n'));
    if (success > 0) loadFarmers();
  };

  // ── Workflow action ────────────────────────────────────────────────────────

  const openWfAction = (type: 'approve' | 'decline', farmer: FarmerWithMeta) => {
    setWfActionType(type);
    setWfActionReason('__none__');
    setWfActionNote('');
    setWfActionFarmer(farmer);
    setWfActionOpen(true);
  };

  const handleWfAction = async () => {
    if (!wfActionFarmer?.enrollment) return;
    if (wfActionType === 'decline' && wfActionReason === '__none__') return;
    setWfActionSaving(true);

    const nextStage = wfActionType === 'approve'
      ? wfActionFarmer.current_stage + 1
      : wfActionFarmer.current_stage;
    const stageName = WORKFLOW_STAGES.find(s => s.stage === nextStage)?.name ?? 'Unknown';

    await (supabase.from('enrollment_workflow') as any).insert({
      enrollment_id: wfActionFarmer.enrollment.id,
      farmer_id:     wfActionFarmer.id,
      stage:         nextStage,
      stage_name:    stageName,
      status:        wfActionType === 'approve' ? 'approved' : 'declined',
      actor_id:      profile!.id,
      actor_role:    profile!.role,
      reason_code:   wfActionType === 'decline' ? (wfActionReason === '__none__' ? null : wfActionReason) : null,
      notes:         wfActionNote || null,
    });

    if (wfActionType === 'decline') {
      await (supabase.from('enrollments') as any)
        .update({ status: 'withdrawn' })
        .eq('id', wfActionFarmer.enrollment.id);
    } else if (nextStage >= 6) {
      await (supabase.from('enrollments') as any)
        .update({ status: 'active' })
        .eq('id', wfActionFarmer.enrollment.id);
    }

    setWfActionSaving(false);
    setWfActionOpen(false);
    setDetailOpen(false);
    loadFarmers();
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────

  function exportCSV() {
    const header = 'Farmer ID,Full Name,Phone,Region,District,Crop,Farm Size,Verified,FRI Score,Zone,Program,Cohort,Enrolled,Created';
    const rows = displayed.map(f => [
      `"${(f as any).farmer_id ?? ''}"`,
      `"${f.full_name}"`,
      f.phone,
      f.region ?? REGION_LABELS[f.region_code as RegionCode] ?? f.region_code ?? '',
      f.district,
      CROP_LABELS[f.primary_crop as CropType] ?? f.primary_crop,
      f.total_farm_size_ha ?? '',
      f.is_verified ? 'Yes' : 'No',
      f.current_fri ?? '',
      f.current_zone ?? '',
      f.program_name ?? '',
      f.cohort_name ?? '',
      f.enrollment ? 'Yes' : 'No',
      new Date(f.created_at).toLocaleDateString('en-GB'),
    ].join(','));
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `farmers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col h-full space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Registry</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">
            {loading ? '…' : `${farmers.length.toLocaleString()} farmers`}
            {!loading && duplicateCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">· {duplicateCount} duplicate flag{duplicateCount > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-cropguard-slate">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={clearAll}>Clear</Button>
              <Button size="sm" variant="outline" className="border-cropguard-mid text-cropguard-dark" onClick={openBulkAgentAssign}>
                <UserCog className="w-4 h-4 mr-2" /> Assign Agent
              </Button>
              <Button size="sm" className="bg-cropguard-dark hover:bg-cropguard-forest" onClick={openEnroll}>
                <UserPlus className="w-4 h-4 mr-2" /> Enroll {selected.size}
              </Button>
              <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setBulkDeleteMsg(''); setBulkDeleteOpen(true); }}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete {selected.size}
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={exportCSV} className="h-8 gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => loadFarmers()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" className="bg-cropguard-dark hover:bg-cropguard-forest" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Farmer
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn('h-8 gap-1.5 border-cropguard-mid', statsOpen && 'bg-cropguard-mint text-cropguard-dark')}
            onClick={() => setStatsOpen(v => !v)}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Statistics
            {statsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Statistics panel (collapsible) */}
      {statsOpen && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-cropguard-forest">Farmer Statistics</h2>
              <p className="text-xs text-cropguard-slate mt-0.5">Based on {farmers.length} farmer{farmers.length !== 1 ? 's' : ''} currently loaded</p>
            </div>
            <button onClick={() => setStatsOpen(false)} className="p-1 rounded-lg hover:bg-white transition-colors">
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <FarmerStatsPanel farmers={farmers} />
        </div>
      )}

      {/* Duplicate alert */}
      {!loading && duplicateCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{duplicateCount} farmer{duplicateCount > 1 ? 's' : ''}</span> share a phone number with another record. Review and merge as needed.
          </p>
        </div>
      )}

      {/* Search + filters — collapsible */}
      <div className="bg-white rounded-xl border shadow-sm">
        {/* Search row — always visible */}
        <div className="flex items-center gap-2 p-4 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10 h-9"
              placeholder="Search by name, phone or national ID…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-gray-500 shrink-0" onClick={() => {
              setFilterProgram(''); setFilterCohort(''); setFilterEnrolled('all');
              setFilterZone(''); setFilterAgent(''); setFilterCommunity(''); setFilterCooperative(''); setPage(1);
            }}>
              <X className="w-3 h-3 mr-1" /> Clear filters
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-gray-500 shrink-0 gap-1.5"
            onClick={() => setFiltersOpen(v => !v)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-cropguard-mint text-cropguard-dark text-[10px] font-semibold rounded-full px-1.5 py-px leading-none">{activeFilterCount}</span>
            )}
            {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Filter row — collapsible */}
        {filtersOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 px-4 pb-4 pt-1 border-t border-gray-100">
          {/* Program */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Program</Label>
            <Select value={filterProgram || '__none__'} onValueChange={v => { setFilterProgram(v === '__none__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Cohort */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cohort</Label>
            <Select value={filterCohort || '__none__'} onValueChange={v => { setFilterCohort(v === '__none__' ? '' : v); setPage(1); }} disabled={filteredCohorts.length === 0}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All cohorts</SelectItem>
                {filteredCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Enrollment */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Enrollment</Label>
            <Select value={filterEnrolled} onValueChange={v => { setFilterEnrolled(v as typeof filterEnrolled); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="unenrolled">Not enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Zone */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Zone</Label>
            <Select value={filterZone || '__none__'} onValueChange={v => { setFilterZone(v === '__none__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All zones</SelectItem>
                {ZONE_OPTIONS.map(z => <SelectItem key={z} value={z}>{z.replace('Resilience ', '')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Agent */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Agent</Label>
            <Select value={filterAgent || '__none__'} onValueChange={v => { setFilterAgent(v === '__none__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All agents</SelectItem>
                {agentList.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Community */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Community</Label>
            <Select value={filterCommunity || '__none__'} onValueChange={v => { setFilterCommunity(v === '__none__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All communities</SelectItem>
                {communityList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Cooperative */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cooperative</Label>
            <Select value={filterCooperative || '__none__'} onValueChange={v => { setFilterCooperative(v === '__none__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All cooperatives</SelectItem>
                {cooperativeList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-4 pb-3 pt-1">
            {filterProgram && (
              <span className="flex items-center gap-1 text-xs bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                {programs.find(p => p.id === filterProgram)?.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterProgram('')} />
              </span>
            )}
            {filterCohort && (
              <span className="flex items-center gap-1 text-xs bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                {cohorts.find(c => c.id === filterCohort)?.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCohort('')} />
              </span>
            )}
            {filterEnrolled !== 'all' && (
              <span className="flex items-center gap-1 text-xs bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                {filterEnrolled === 'enrolled' ? 'Enrolled' : 'Not enrolled'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterEnrolled('all')} />
              </span>
            )}
            {filterZone && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {filterZone.replace('Resilience ', '')}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterZone('')} />
              </span>
            )}
            {filterAgent && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {agentList.find(a => a.id === filterAgent)?.full_name ?? 'Agent'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterAgent('')} />
              </span>
            )}
            {filterCommunity && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {communityList.find(c => c.id === filterCommunity)?.name ?? 'Community'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCommunity('')} />
              </span>
            )}
            {filterCooperative && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {cooperativeList.find(c => c.id === filterCooperative)?.name ?? 'Cooperative'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCooperative('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Select-all bar + view toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          {!loading && displayed.length > 0 && (
            <button
              onClick={() => selected.size === displayed.length ? clearAll() : selectAll()}
              className="flex items-center gap-2 text-sm text-cropguard-dark hover:text-cropguard-forest"
            >
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                selected.size === displayed.length && displayed.length > 0
                  ? 'bg-cropguard-dark border-cropguard-dark'
                  : 'border-gray-300'
              )}>
                {selected.size === displayed.length && displayed.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              {selected.size === displayed.length && displayed.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
          )}
          {/* View toggle — always visible */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setViewMode('activity'); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'activity' ? 'bg-white text-cropguard-forest shadow-sm' : 'text-gray-500 hover:text-cropguard-dark'
              )}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Enrolment
            </button>
            <button
              onClick={() => { setViewMode('registration'); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'registration' ? 'bg-white text-cropguard-forest shadow-sm' : 'text-gray-500 hover:text-cropguard-dark'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" /> Registration
            </button>
          </div>
          {viewMode === 'registration' && (
            <div className="relative">
              <button
                onClick={() => setColsOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:text-cropguard-dark hover:bg-gray-100 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Columns
                <ChevronDown className="w-3 h-3" />
              </button>
              {colsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setColsOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 z-20 bg-white rounded-lg border shadow-lg max-h-72 overflow-y-auto w-52 p-2">
                    <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b sticky top-0 bg-white">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">Toggle Columns</span>
                      <button onClick={() => setHiddenCols(new Set())} className="text-[10px] text-cropguard-forest hover:underline">Show all</button>
                    </div>
                    {REG_COLUMNS.map(col => {
                      const visible = !hiddenCols.has(col.key);
                      return (
                        <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0', visible ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-300')}>
                            {visible && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <input type="checkbox" className="sr-only" checked={visible} onChange={() => toggleCol(col.key)} />
                          <span className="text-xs text-gray-600">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <span className="text-xs text-cropguard-slate">{selected.size} of {displayed.length} selected</span>
          )}
          {displayed.length !== farmers.length && (
            <span className="text-xs text-cropguard-slate">
              Showing <span className="font-semibold text-cropguard-forest">{displayed.length}</span> of {farmers.length}
            </span>
          )}
        </div>
      </div>

      {/* Card list / Registration table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-cropguard-slate">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-cropguard-forest">No farmers found</p>
          <p className="text-sm mt-1">Adjust filters or add a farmer.</p>
          <Button onClick={openAdd} className="mt-4 bg-cropguard-dark hover:bg-cropguard-forest">
            <Plus className="w-4 h-4 mr-2" /> Add Farmer
          </Button>
        </div>
      ) : viewMode === 'registration' ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap w-8">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors',
                        displayed.length > 0 && selected.size === displayed.length ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-200 hover:border-cropguard-mid'
                      )}
                      onClick={() => {
                        if (selected.size === displayed.length) setSelected(new Set());
                        else setSelected(new Set(displayed.map(f => f.id)));
                      }}
                    >
                      {displayed.length > 0 && selected.size === displayed.length && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap w-8">#</th>
                  {REG_COLUMNS.filter(c => !hiddenCols.has(c.key)).map(c => (
                    <th key={c.key} className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap relative">
                      <div className="flex items-center gap-1">
                        {c.label}
                        <button
                          onClick={() => setOpenColFilter(openColFilter === c.key ? null : c.key)}
                          className={cn('p-0.5 rounded transition-colors', colFilters[c.key] ? 'text-cropguard-dark' : 'text-gray-300 hover:text-gray-500')}
                        >
                          <Filter className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      {openColFilter === c.key && (
                        <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[160px]">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Filter…"
                            value={colFilters[c.key] ?? ''}
                            onChange={e => setColFilter(c.key, e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded mb-1"
                          />
                          <button
                            onClick={() => { setColFilter(c.key, ''); setOpenColFilter(null); }}
                            className="text-[10px] text-gray-400 hover:text-red-500"
                          >Clear</button>
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedDisplayed.map((f, idx) => {
                  const isSelected = selected.has(f.id);
                  return (
                    <tr key={f.id} className={cn('hover:bg-gray-50/70 cursor-pointer', isSelected && 'bg-blue-50')} onClick={() => openDetail(f)}>
                      <td className="px-2 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div
                          className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors',
                            isSelected ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-200 hover:border-cropguard-mid'
                          )}
                          onClick={() => toggleSelect(f.id)}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-400 font-mono text-[10px] whitespace-nowrap">{idx + 1}</td>
                      {REG_COLUMNS.filter(c => !hiddenCols.has(c.key)).map(c => (
                        <Fragment key={c.key}>{c.render(f)}</Fragment>
                      ))}
                      <td className="px-2 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-cropguard-dark transition-colors" title="Edit farmer">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openDetail(f)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-cropguard-dark transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openDelete(f)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Delete farmer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={displayed.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
          {/* Column header */}
          <div className="hidden lg:grid grid-cols-[auto_220px_1fr_180px_220px_160px_auto] gap-0 px-4 py-2 border-b bg-white sticky top-0 z-10 shadow-sm">
            <div className="w-[84px]" />
            <div className="relative pl-0 pr-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                Farmer Details
                <button onClick={() => setOpenColFilter(openColFilter === 'act_name' ? null : 'act_name')} className={cn('p-0.5 rounded transition-colors', colFilters['act_name'] ? 'text-cropguard-dark' : 'text-gray-300 hover:text-gray-500')}>
                  <Filter className="w-2.5 h-2.5" />
                </button>
              </p>
              {openColFilter === 'act_name' && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[160px]">
                  <input type="text" autoFocus placeholder="Filter name…" value={colFilters['act_name'] ?? ''} onChange={e => setColFilter('act_name', e.target.value)} className="w-full px-2 py-1 text-xs border rounded mb-1" />
                  <button onClick={() => { setColFilter('act_name', ''); setOpenColFilter(null); }} className="text-[10px] text-gray-400 hover:text-red-500">Clear</button>
                </div>
              )}
            </div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Program Information</p>
            <div className="relative px-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                Community Details
                <button onClick={() => setOpenColFilter(openColFilter === 'act_community' ? null : 'act_community')} className={cn('p-0.5 rounded transition-colors', colFilters['act_community'] ? 'text-cropguard-dark' : 'text-gray-300 hover:text-gray-500')}>
                  <Filter className="w-2.5 h-2.5" />
                </button>
              </p>
              {openColFilter === 'act_community' && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[160px]">
                  <input type="text" autoFocus placeholder="Filter community…" value={colFilters['act_community'] ?? ''} onChange={e => setColFilter('act_community', e.target.value)} className="w-full px-2 py-1 text-xs border rounded mb-1" />
                  <button onClick={() => { setColFilter('act_community', ''); setOpenColFilter(null); }} className="text-[10px] text-gray-400 hover:text-red-500">Clear</button>
                </div>
              )}
            </div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Enrolment Workflow</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">FRI Score</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pl-4 pr-2 w-[112px]">Actions</p>
          </div>
          <div className="divide-y divide-gray-100">
            {pagedDisplayed.map((f, idx) => {
              const isSelected = selected.has(f.id);
              const enr = f.enrollment;
              const currentStageDef = WORKFLOW_STAGES.find(s => s.stage === f.current_stage);
              return (
                <div
                  key={f.id}
                  className={cn(
                    'flex items-stretch transition-colors group min-w-max',
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/70'
                  )}
                >
                  {/* Checkbox + Row number */}
                  <div className="flex items-center gap-2 py-4 px-4 shrink-0">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0',
                        isSelected ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-200 hover:border-cropguard-mid'
                      )}
                      onClick={() => toggleSelect(f.id)}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="w-[28px] text-center text-gray-400 font-mono text-[10px] shrink-0">{idx + 1}</span>
                  </div>

                  {/* Section 1 — Farmer Details (avatar + name) */}
                  <div
                    className="flex items-center gap-3 py-4 pr-5 w-[220px] shrink-0 cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      enr ? 'bg-cropguard-mint text-cropguard-dark' : 'bg-gray-100 text-gray-500'
                    )}>
                      {f.photo_url ? (
                        <img src={f.photo_url} alt={f.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        f.full_name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-cropguard-forest text-sm leading-tight truncate">{f.full_name}</p>
                        {f.duplicate_flag && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-gray-400 font-mono"><span className="text-[9px] text-gray-300 uppercase tracking-wide mr-0.5">Ph</span>{f.phone}</span>
                        {(f as any).farmer_id && (
                          <>
                            <span className="text-gray-200 text-[10px]">·</span>
                            <span className="text-[10px] text-cropguard-mid font-mono font-semibold"><span className="text-[9px] text-gray-300 uppercase tracking-wide mr-0.5">ID</span>{(f as any).farmer_id}</span>
                          </>
                        )}
                        <span className="text-gray-200 text-[10px]">·</span>
                        {enr ? (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none', ENR_STATUS_COLORS['active'])}>
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">
                            Not enrolled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2 — Program Information */}
                  <div
                    className="flex flex-col justify-center py-4 px-5 flex-1 min-w-0 cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    {enr ? (
                      <>
                        <p className="text-sm font-semibold text-cropguard-forest leading-tight truncate">
                          {f.program_name ?? '—'}
                        </p>
                        {f.cohort_name && (
                          <p className="text-[11px] text-gray-500 mt-1 truncate">{f.cohort_name}</p>
                        )}
                        {f.agent_name && (
                          <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5 min-w-0">
                            <UserCog className="w-3 h-3 text-gray-300 shrink-0" />
                            <span className="truncate">{f.agent_name}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </div>

                  {/* Section 2b — Community Details */}
                  <div
                    className="flex flex-col justify-center py-4 px-5 shrink-0 w-[180px] cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    <p className="text-xs text-cropguard-forest font-medium leading-tight truncate">{f.community_name ?? (f.community || '—')}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{f.cooperative_name ?? 'No cooperative'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{f.region ?? REGION_LABELS[f.region_code] ?? f.region_code ?? '—'}</p>
                  </div>

                  {/* Section 3 — Enrolment Workflow */}
                  <div
                    className="flex flex-col justify-center py-4 px-5 shrink-0 w-[220px] cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    {enr ? (
                      <>
                        <div className="flex gap-px mb-2">
                          {WORKFLOW_STAGES.map(s => (
                            <div key={s.stage} className={cn(
                              'h-1 rounded-sm flex-1',
                              s.stage < f.current_stage   ? 'bg-emerald-400' :
                              s.stage === f.current_stage ? 'bg-cropguard-dark' : 'bg-gray-200'
                            )} />
                          ))}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>Reg: {new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {f.baseline_done ? (
                              <span className="flex items-center gap-1.5 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> Baseline done
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-gray-400">
                                <Circle className="w-3 h-3 shrink-0" /> Baseline pending
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {f.checkin_on_track === true ? (
                              <span className="flex items-center gap-1.5 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> Check-in: On track
                              </span>
                            ) : f.checkin_on_track === false ? (
                              <span className="flex items-center gap-1.5 text-red-500">
                                <XCircle className="w-3 h-3 shrink-0" /> Check-in: Missed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-gray-400">
                                <Circle className="w-3 h-3 shrink-0" /> No schedule
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </div>

                  {/* Section 4 — FRI Score */}
                  <div
                    className="flex flex-col justify-center py-4 px-5 shrink-0 w-[160px] cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    {f.current_fri !== null ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-bold text-cropguard-forest leading-none tabular-nums">{f.current_fri}</span>
                          <span className="text-[10px] text-gray-400 font-normal">/ 100</span>
                        </div>
                        {f.current_zone && (
                          <span
                            className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full self-start mt-1.5 leading-none', ZONE_COLORS[f.current_zone] ?? 'bg-gray-100 text-gray-600')}
                          >
                            {f.current_zone.replace('Resilience ', '')} · {ZONE_RISK[f.current_zone] ?? ''}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-300">No score</span>
                    )}
                  </div>

                  {/* Section 5 — Actions */}
                  <div className="flex items-center py-4 px-4 shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(f)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-cropguard-dark transition-colors"
                      title="Edit farmer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => enr ? openAgentAssign(f) : undefined}
                      disabled={!enr}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        enr
                          ? 'text-gray-300 hover:bg-cropguard-mint hover:text-cropguard-dark cursor-pointer'
                          : 'text-gray-100 cursor-default'
                      )}
                      title={enr ? 'Assign agent' : undefined}
                    >
                      <UserCog className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => enr ? openUnenroll(f) : undefined}
                      disabled={!enr}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        enr
                          ? 'text-gray-300 hover:bg-red-50 hover:text-red-500 cursor-pointer'
                          : 'text-gray-100 cursor-default'
                      )}
                      title={enr ? 'Unenroll from program' : undefined}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDelete(f)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete farmer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={displayed.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </div>
      )}

      {/* ── Farmer detail drawer ─────────────────────────────────────────────── */}
      <Drawer
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailFarmer(null); setEnrHistory([]); }}
        title={detailFarmer?.full_name ?? ''}
        subtitle={detailFarmer?.duplicate_flag ? 'Duplicate phone flag detected' : undefined}
        width="max-w-lg"
      >
        {detailFarmer && (
          <div className="space-y-5">
            {/* Core info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Farmer ID',  (detailFarmer as any).farmer_id ?? '—'],
                ['Phone',       detailFarmer.phone],
                ['National ID', detailFarmer.national_id],
                ['Region',      detailFarmer.region ?? REGION_LABELS[detailFarmer.region_code as RegionCode] ?? detailFarmer.region_code ?? '—'],
                ['District',    detailFarmer.district],
                ['Community',   detailFarmer.community_name ?? (detailFarmer.community || '—')],
                ['Cooperative', detailFarmer.cooperative_name ?? '—'],
                ['Crop',        CROP_LABELS[detailFarmer.primary_crop as CropType] ?? detailFarmer.primary_crop],
                ['Farm Size',   `${detailFarmer.total_farm_size_ha} ha`],
                ['Gender',      GENDER_LABELS[detailFarmer.gender as Gender] ?? '—'],
                ['Verified',    detailFarmer.is_verified ? 'Yes' : 'No'],
                ['FRI Score',   detailFarmer.current_fri !== null ? `${detailFarmer.current_fri}/100` : 'No score'],
                ['Zone',        detailFarmer.current_zone ?? '—'],
                ['Registered',  new Date(detailFarmer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="font-medium text-cropguard-forest text-xs">{v}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 flex-wrap border-t pt-4">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setDetailOpen(false); openEdit(detailFarmer); }}>
                <Edit2 className="w-3.5 h-3.5" /> Edit Details
              </Button>
              {detailFarmer.enrollment && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setDetailOpen(false); openAgentAssign(detailFarmer); }}>
                    <UserCog className="w-3.5 h-3.5" /> Assign Agent
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setDetailOpen(false); openUnenroll(detailFarmer); }}>
                    <UserMinus className="w-3.5 h-3.5" /> Unenroll
                  </Button>
                </>
              )}
            </div>

            {/* Enrollment Workflow */}
            {detailFarmer.enrollment && detailFarmer.current_stage > 0 && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cropguard-mid" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrollment Workflow</p>
                  </div>
                  <Badge className={cn('text-[9px] border-0', WORKFLOW_STATUS_COLORS[detailFarmer.enrollment.status] ?? 'bg-gray-100 text-gray-500')}>
                    {detailFarmer.enrollment.status}
                  </Badge>
                </div>

                <StageTracker current={detailFarmer.current_stage} workflow={detailFarmer.workflow} />

                {/* Activity log */}
                {detailFarmer.workflow.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Activity Log</p>
                    <div className="space-y-2">
                      {[...detailFarmer.workflow].reverse().map(w => (
                        <div key={w.id} className={cn(
                          'flex items-start gap-3 rounded-lg px-3 py-2.5',
                          w.status === 'declined' ? 'bg-red-50' : w.status === 'approved' ? 'bg-emerald-50' : 'bg-gray-50'
                        )}>
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                            w.status === 'declined' ? 'bg-red-500' : w.status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-cropguard-forest">Stage {w.stage}: {w.stage_name}</p>
                            {w.reason_code && <p className="text-xs text-red-600 mt-0.5">Reason: {w.reason_code}</p>}
                            {w.notes && <p className="text-xs text-gray-600 mt-0.5">{w.notes}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(w.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advance / Decline actions */}
                {detailFarmer.enrollment.status === 'active' && detailFarmer.current_stage < 8 && (
                  <div className="flex gap-3 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => openWfAction('decline', detailFarmer)}
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
                      onClick={() => openWfAction('approve', detailFarmer)}
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Advance to Stage {detailFarmer.current_stage + 1}
                    </Button>
                  </div>
                )}
              </div>
            )}

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
                          {e.cohort_name && <p className="text-[11px] text-cropguard-slate mt-0.5">{e.cohort_name}</p>}
                          <p className="text-[10px] text-gray-400 mt-1">
                            Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {endDate && (
                              <> · {e.graduated_at ? 'Graduated' : 'Withdrawn'} {new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                            )}
                          </p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', ENR_STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-500')}>
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

      {/* ── Workflow action drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={wfActionOpen}
        onClose={() => setWfActionOpen(false)}
        title={wfActionType === 'approve'
          ? `Advance to Stage ${(wfActionFarmer?.current_stage ?? 0) + 1}`
          : 'Decline Enrollment'}
        subtitle={wfActionFarmer?.full_name}
      >
        <div className="space-y-4">
          {wfActionType === 'decline' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason *</Label>
              <Select value={wfActionReason} onValueChange={setWfActionReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select a reason…</SelectItem>
                  {REASON_CODES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</Label>
            <textarea
              value={wfActionNote}
              onChange={e => setWfActionNote(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cropguard-dark/20"
            />
          </div>
          {wfActionType === 'decline' && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
              This enrollment will be marked as withdrawn and the farmer will be unenrolled.
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setWfActionOpen(false)}>Cancel</Button>
            <Button
              disabled={wfActionSaving || (wfActionType === 'decline' && wfActionReason === '__none__')}
              className={cn(
                'flex-1',
                wfActionType === 'approve'
                  ? 'bg-cropguard-dark hover:bg-cropguard-forest'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
              onClick={handleWfAction}
            >
              {wfActionSaving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                : wfActionType === 'approve'
                  ? <><ArrowRight className="w-4 h-4 mr-2" />Advance</>
                  : <><X className="w-4 h-4 mr-2" />Decline</>
              }
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── Enroll drawer ────────────────────────────────────────────────────── */}
      <Drawer open={enrollOpen} onClose={() => setEnrollOpen(false)} title={`Enroll ${selected.size} Farmer${selected.size !== 1 ? 's' : ''}`}>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
            Farmers already enrolled in the selected program will have their cohort updated.
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program *</Label>
            <Select value={enrollProgram} onValueChange={setEnrollProgram}>
              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
              <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort (optional)</Label>
            <Select value={enrollCohort || '__none__'} onValueChange={v => setEnrollCohort(v === '__none__' ? '' : v)} disabled={!enrollProgram}>
              <SelectTrigger><SelectValue placeholder={enrollProgram ? 'Select cohort' : 'Select program first'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No cohort</SelectItem>
                {enrollCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {enrollMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              enrollMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
              enrollMsg.type === 'conflict' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-red-50 text-red-700'
            )}>
              {enrollMsg.text}
            </div>
          )}
          {enrollMsg?.type !== 'success' ? (
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEnrollOpen(false)}>Cancel</Button>
              {enrollMsg?.type === 'conflict' ? (
                <Button disabled={enrolling || !enrollProgram} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleEnroll(true)}>
                  {enrolling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enrolling…</> : 'Graduate & Re-enroll'}
                </Button>
              ) : (
                <Button disabled={enrolling || !enrollProgram} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => handleEnroll(false)}>
                  {enrolling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enrolling…</> : `Enroll ${selected.size}`}
                </Button>
              )}
            </div>
          ) : (
            <Button className="w-full bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => setEnrollOpen(false)}>Done</Button>
          )}
        </div>
      </Drawer>

      {/* ── Add farmer drawer ─────────────────────────────────────────────────── */}
      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title={addStep === 'form' ? 'Add New Farmer' : 'Enroll in Program'} width="max-w-xl">
        {addStep === 'form' ? (
          <FarmerRegistrationForm
            compact
            onComplete={handleAddFarmerComplete}
            onBack={() => setAddOpen(false)}
            saving={addSaving}
            saveError={addError}
          />
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700 font-medium">Farmer added successfully! Enroll them in a program now (optional).</div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</Label>
              <Select value={addEnrollProgram || '__none__'} onValueChange={v => setAddEnrollProgram(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Skip enrollment" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Skip enrollment</SelectItem>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {addEnrollProgram && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort (optional)</Label>
                <Select value={addEnrollCohort || '__none__'} onValueChange={v => setAddEnrollCohort(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="No cohort" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">No cohort</SelectItem>{addEnrollCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setAddOpen(false); loadFarmers(); }}>Skip</Button>
              <Button className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleAddEnroll}>{addEnrollProgram ? 'Enroll & Done' : 'Done'}</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Edit farmer drawer ────────────────────────────────────────────────── */}
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title={`Edit — ${editingFarmer?.full_name ?? ''}`} width="max-w-xl">
        <FarmerRegistrationForm
          key={editKey}
          compact
          mode="edit"
          initialData={editInitialData}
          onComplete={handleEditComplete}
          onBack={() => setEditOpen(false)}
          saving={editSaving}
          saveError={editError}
        />
      </Drawer>

      {/* ── Unenroll drawer ───────────────────────────────────────────────────── */}
      <Drawer open={unenrollOpen} onClose={() => setUnenrollOpen(false)} title="Unenroll Farmer">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Unenroll from program?</p>
              <p className="text-xs text-amber-600 mt-1">
                <strong>{farmerToUnenroll?.full_name}</strong> will be withdrawn from{' '}
                <strong>{programs.find(p => p.id === farmerToUnenroll?.enrollment?.program_id)?.name}</strong>. Their data and scores will be preserved.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setUnenrollOpen(false)}>Cancel</Button>
            <Button disabled={unenrolling} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleUnenroll}>
              {unenrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserMinus className="w-4 h-4 mr-2" />Unenroll</>}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── Per-farmer agent assign ────────────────────────────────────────────── */}
      <Drawer open={agentAssignOpen} onClose={() => setAgentAssignOpen(false)} title="Assign Agent to Farmer" width="max-w-sm">
        <div className="space-y-4 pt-2">
          {agentAssignFarmer && (
            <div className="bg-cropguard-mint rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-cropguard-forest">{agentAssignFarmer.full_name}</p>
              <p className="text-xs text-cropguard-slate mt-0.5">{agentAssignFarmer.phone}</p>
              {agentAssignFarmer.enrollment && (
                <p className="text-xs text-cropguard-slate mt-0.5">
                  {programs.find(p => p.id === agentAssignFarmer.enrollment?.program_id)?.name}
                  {agentAssignFarmer.enrollment?.cohort_id && ` · ${cohorts.find(c => c.id === agentAssignFarmer.enrollment?.cohort_id)?.name}`}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Agent</Label>
            <Select value={agentAssignId || '__none__'} onValueChange={v => setAgentAssignId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Remove assignment</SelectItem>
                {agentList.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {agentAssignMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              agentAssignMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}>
              {agentAssignMsg}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setAgentAssignOpen(false)}>Cancel</Button>
            <Button disabled={agentAssignSaving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleAgentAssign}>
              {agentAssignSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── Bulk agent assign ─────────────────────────────────────────────────── */}
      <Drawer open={bulkAgentAssignOpen} onClose={() => setBulkAgentAssignOpen(false)} title={`Assign Agent — ${selected.size} Farmer${selected.size !== 1 ? 's' : ''}`} width="max-w-sm">
        <div className="space-y-4 pt-2">
          <div className="bg-cropguard-mint rounded-lg px-4 py-3">
            <p className="text-xs text-cropguard-slate">
              {farmers.filter(f => selected.has(f.id) && f.enrollment).length} enrolled farmer{farmers.filter(f => selected.has(f.id) && f.enrollment).length !== 1 ? 's' : ''} will be updated.
              {farmers.filter(f => selected.has(f.id) && !f.enrollment).length > 0 && (
                <span className="block mt-0.5 text-amber-700">
                  {farmers.filter(f => selected.has(f.id) && !f.enrollment).length} unenrolled farmer{farmers.filter(f => selected.has(f.id) && !f.enrollment).length !== 1 ? 's' : ''} will be skipped.
                </span>
              )}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign to Agent</Label>
            <Select value={bulkAgentAssignId || '__none__'} onValueChange={v => setBulkAgentAssignId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select agent…</SelectItem>
                {agentList.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {bulkAgentAssignMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              bulkAgentAssignMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}>
              {bulkAgentAssignMsg}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkAgentAssignOpen(false)}>Cancel</Button>
            <Button disabled={bulkAgentAssignSaving || !bulkAgentAssignId} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleBulkAgentAssign}>
              {bulkAgentAssignSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCog className="w-4 h-4 mr-2" />Assign</>}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── Bulk delete drawer ──────────────────────────────────────────────────── */}
      <Drawer open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title={`Delete ${selected.size} Farmer${selected.size !== 1 ? 's' : ''}`} width="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Delete farmer records?</p>
              <p className="text-xs text-red-600 mt-1">
                <strong>{selected.size}</strong> farmer{selected.size !== 1 ? 's' : ''} will be permanently deleted. This cannot be undone.
                Farmers with linked enrollments, check-ins, or scores may fail to delete.
              </p>
            </div>
          </div>
          {bulkDeleteMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              bulkDeleteMsg.includes('failed') ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            )}>
              {bulkDeleteMsg}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button disabled={bulkDeleteSaving} className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkDelete}>
              {bulkDeleteSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting…</> : <><Trash2 className="w-4 h-4 mr-2" />Delete {selected.size}</>}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── Single-farmer delete drawer ─────────────────────────────────────────── */}
      <Drawer open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Farmer" width="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Delete this farmer?</p>
              <p className="text-xs text-red-600 mt-1">
                <strong>{deleteFarmer?.full_name}</strong> will be permanently deleted along with their enrollments, check-ins, and scores. This cannot be undone.
              </p>
            </div>
          </div>
          {deleteError && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700">{deleteError}</div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button disabled={deleteSaving} className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              {deleteSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting…</> : <><Trash2 className="w-4 h-4 mr-2" />Delete</>}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── CSV upload drawer ─────────────────────────────────────────────────── */}
      <Drawer open={csvOpen} onClose={() => { setCsvOpen(false); setCsvRows([]); setCsvError(''); setCsvMsg(''); }} title="Bulk Upload Farmers" width="max-w-3xl">
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" onClick={downloadCsvTemplate}>
              <Download className="w-3.5 h-3.5 mr-2" /> Download Template
            </Button>
          </div>
          <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-cropguard-mid transition-colors" onClick={() => csvInputRef.current?.click()}>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Click to select a CSV file</p>
            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
          </div>
          {csvError && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 space-y-0.5">
              {csvError.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          )}
          {csvRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-cropguard-forest">{csvRows.length} rows detected</p>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setCsvRows([]); if (csvInputRef.current) csvInputRef.current.value = ''; }}>
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
              <div className="border rounded-lg overflow-auto max-h-[60vh]">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>{CSV_HEADERS.map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h.replace(/_/g,' ')}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {csvRows.map((row, i) => (
                      <tr key={i} className={cn('hover:bg-gray-50', (!row.phone || !row.national_id || !row.primary_crop || (!row.first_name && !row.full_name)) && 'bg-red-50')}>
                        {CSV_HEADERS.map(h => {
                          const val = (row as any)[h] as string | undefined;
                          return <td key={h} className="px-3 py-2 text-gray-700">{val || <span className="text-gray-300">—</span>}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {csvMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              csvMsg.includes('failed') || csvMsg.includes('skipped') ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            )}>
              {csvMsg}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCsvOpen(false)}>Close</Button>
            <Button disabled={csvUploading || csvRows.length === 0} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleCsvUpload}>
              {csvUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing…</> : <><Upload className="w-4 h-4 mr-2" />Import {csvRows.length} Farmers</>}
            </Button>
          </div>
        </div>
      </Drawer>

    </div>
  );
}
