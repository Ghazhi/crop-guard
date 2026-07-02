import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Check, UserPlus, Loader2, X,
  Users, Upload, Plus, Edit2,
  UserMinus, Download, AlertTriangle, Phone,
  UserCog,
  RefreshCw, History, Clock,
  PackageCheck, Truck, CreditCard, UserCheck, FileText,
  ArrowRight, GitBranch, BarChart2, ChevronDown, ChevronUp,
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
  CROP_LABELS, CROP_OPTIONS, REGION_LABELS, REGION_OPTIONS,
  GENDER_LABELS,
  DISTRICTS_BY_REGION, phoneToEmail,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
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
  enrollment?:    Enrollment;
  current_fri:    number | null;
  current_zone:   string | null;
  cohort_name:    string | null;
  program_name:   string | null;
  agent_name:     string | null;
  current_stage:  number;
  workflow:       WorkflowEntry[];
  duplicate_flag: boolean;
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
  region_code:        RegionCode | '';
  district:           string;
  community:          string;
  primary_crop:       CropType | '';
  secondary_crop:     string;
  acres_cultivated:   string;
  years_farm_experience: string;
  primary_bags_prev_season: string;
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
  date_of_birth: '', gender: '', region_code: '', district: '', community: '',
  primary_crop: '', secondary_crop: '', acres_cultivated: '', years_farm_experience: '', primary_bags_prev_season: '',
};

const CSV_HEADERS = [
  'first_name','last_name','phone','national_id','national_id_type','date_of_birth','gender',
  'region_code','district','community','primary_crop','secondary_crop',
  'acres_cultivated','years_farm_experience','primary_bags_prev_season',
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

function downloadCsvTemplate() {
  const rows = [
    CSV_HEADERS.join(','),
    'Ama,Mensah,0241234567,GHA-XXXXXXXXX-X,ghana_card,1985-03-15,female,AH,Kumasi Metro,Adum,maize,rice,3.5,5,20',
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
  const [filterZone,      setFilterZone]      = useState('');
  const [filterAgent,     setFilterAgent]     = useState('');
  const [filterFriMin,    setFilterFriMin]    = useState('');
  const [filterFriMax,    setFilterFriMax]    = useState('');
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

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadPrograms = useCallback(async () => {
    if (!profile) return;
    const [{ data: progs }, { data: coh }, { data: agts }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('cohorts').select('*, programs!inner(organisation_id)').eq('programs.organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('users').select('id,full_name,role,is_active,region_code,organisation_id').eq('organisation_id', profile.organisation_id).eq('role', 'agent').eq('is_active', true).order('full_name'),
    ]);
    setPrograms(progs ?? []);
    setCohorts((coh ?? []) as unknown as Cohort[]);
    setAgentList((agts ?? []) as unknown as User[]);
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

    const merged: FarmerWithMeta[] = list.map(f => {
      const sc = latestScore.get(f.id);
      const wf = workflowMap.get(f.id) ?? [];
      const maxStage = wf.reduce((m, w) => Math.max(m, w.stage), f.enrollment ? 1 : 0);
      return {
        ...f,
        enrollment:     enrollMap[f.id],
        current_fri:    sc?.total_score ?? null,
        current_zone:   sc?.zone ?? null,
        cohort_name:    cohortNameMap.get(f.id) ?? null,
        program_name:   programNameMap.get(f.id) ?? null,
        agent_name:     agentNameMap.get(f.id) ?? null,
        current_stage:  maxStage,
        workflow:       wf,
        duplicate_flag: (phoneCount.get(f.phone) ?? 1) > 1,
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

  const displayed = farmers.filter(f => {
    if (filterZone  && f.current_zone !== filterZone)  return false;
    if (filterAgent && f.enrollment?.agent_id !== filterAgent) return false;
    const friMin = parseFloat(filterFriMin);
    const friMax = parseFloat(filterFriMax);
    if (!isNaN(friMin) && (f.current_fri === null || f.current_fri < friMin)) return false;
    if (!isNaN(friMax) && (f.current_fri === null || f.current_fri > friMax)) return false;
    return true;
  });

  const duplicateCount    = farmers.filter(f => f.duplicate_flag).length;
  const activeFilterCount = [filterProgram, filterCohort, filterEnrolled !== 'all', filterZone, filterAgent, filterFriMin, filterFriMax].filter(Boolean).length;

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
      setEnrollMsg({ type: 'success', text: `${selected.size} farmer${selected.size > 1 ? 's' : ''} enrolled successfully.` });
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
    const { data: farmer, error } = await supabase.from('farmers').insert({
      full_name:                    fullName,
      first_name:                   data.first_name,
      last_name:                    data.last_name,
      phone:                        data.phone,
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
    };
    setEditInitialData(data);
    setEditError('');
    setEditOpen(true);
  };

  const handleEditComplete = async (data: FarmerFormData) => {
    if (!editingFarmer) return;
    setEditSaving(true); setEditError('');
    const { error } = await supabase.from('farmers').update({
      full_name:             `${data.first_name} ${data.last_name}`.trim(),
      first_name:            data.first_name || null,
      last_name:             data.last_name || null,
      phone:                 data.phone,
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
      owns_tractor:          data.owns_tractor || null,
      owns_house:            data.owns_house || null,
      marital_status:        data.marital_status || null,
      wives_count:           parseInt(data.wives_count) || null,
      children_count:        parseInt(data.children_count) || null,
      other_business:        data.other_business || null,
      other_business_specify: data.other_business_specify || null,
      is_community_native:   data.is_community_native || null,
      origin_if_not_native:  data.origin_if_not_native || null,
      community_preferences: data.community_preferences.length ? data.community_preferences : null,
      other_agric_companies: data.other_agric_companies || null,
      other_agric_companies_specify: data.other_agric_companies_specify || null,
      desired_assets:        data.desired_assets.length ? data.desired_assets : null,
      input_credit_participation: data.input_credit_participation || null,
      other_org_engagement:  data.other_org_engagement || null,
      other_org_activities:  data.other_org_activities || null,
      other_org_name:        data.other_org_name || null,
      asinyo_improvement_notes: data.asinyo_improvement_notes || null,
      gps_address:           data.gps_address || null,
    }).eq('id', editingFarmer.id);
    setEditSaving(false);
    if (error) { setEditError(error.message); throw error; }
    setEditOpen(false);
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
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const label = `Row ${i + 2}`;
    if (!row.phone || !row.national_id || !row.primary_crop || (!row.first_name && !row.full_name)) {
        errors.push(`${label} (${row.first_name || row.full_name || 'unnamed'}): missing required field`);
        failed++; continue;
      }
      const { error } = await supabase.from('farmers').insert({
        full_name:          `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.full_name,
        first_name:         row.first_name ?? null,
        last_name:          row.last_name ?? null,
        phone:              row.phone!,
        national_id:        row.national_id!,
        national_id_type:   row.national_id_type ?? 'ghana_card',
        date_of_birth:      row.date_of_birth || null,
        gender:             row.gender || null,
        region_code:        row.region_code as RegionCode || null,
        district:           row.district ?? null,
        community:          row.community ?? null,
        primary_crop:       row.primary_crop as CropType,
        secondary_crop:     row.secondary_crop || null,
        acres_cultivated:   parseFloat(row.acres_cultivated ?? '0') || null,
        years_farm_experience: parseInt(row.years_farm_experience ?? '0') || null,
        primary_bags_prev_season: parseInt(row.primary_bags_prev_season ?? '0') || null,
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
    const header = 'Full Name,Phone,Region,District,Crop,Farm Size,Verified,FRI Score,Zone,Program,Cohort,Enrolled,Created';
    const rows = displayed.map(f => [
      `"${f.full_name}"`,
      f.phone,
      REGION_LABELS[f.region_code as RegionCode] ?? f.region_code,
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
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Farmer Management</h1>
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

      {/* Search + filters — always visible */}
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10 h-9"
              placeholder="Search by name, phone or national ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
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
              setFilterZone(''); setFilterAgent(''); setFilterFriMin(''); setFilterFriMax('');
            }}>
              <X className="w-3 h-3 mr-1" /> Clear filters
            </Button>
          )}
        </div>

        {/* Filter row — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 pt-1 border-t border-gray-100">
          {/* Program */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Program</Label>
            <Select value={filterProgram || '__none__'} onValueChange={v => setFilterProgram(v === '__none__' ? '' : v)}>
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
            <Select value={filterCohort || '__none__'} onValueChange={v => setFilterCohort(v === '__none__' ? '' : v)} disabled={filteredCohorts.length === 0}>
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
            <Select value={filterEnrolled} onValueChange={v => setFilterEnrolled(v as typeof filterEnrolled)}>
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
            <Select value={filterZone || '__none__'} onValueChange={v => setFilterZone(v === '__none__' ? '' : v)}>
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
            <Select value={filterAgent || '__none__'} onValueChange={v => setFilterAgent(v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All agents</SelectItem>
                {agentList.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* FRI range */}
          <div className="space-y-1 col-span-2 sm:col-span-1 lg:col-span-2">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">FRI Score</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number" min="0" max="100" placeholder="Min"
                value={filterFriMin}
                onChange={e => setFilterFriMin(e.target.value)}
                className="h-8 text-xs w-full"
              />
              <span className="text-gray-400 text-xs shrink-0">—</span>
              <Input
                type="number" min="0" max="100" placeholder="Max"
                value={filterFriMax}
                onChange={e => setFilterFriMax(e.target.value)}
                className="h-8 text-xs w-full"
              />
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
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
            {(filterFriMin || filterFriMax) && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                FRI {filterFriMin || '0'}–{filterFriMax || '100'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => { setFilterFriMin(''); setFilterFriMax(''); }} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Select-all bar */}
      {!loading && displayed.length > 0 && (
        <div className="flex items-center justify-between px-1">
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
      )}

      {/* Card list */}
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
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Column header */}
          <div className="hidden lg:grid grid-cols-[auto_200px_1fr_160px_160px_auto] gap-0 px-4 py-2 border-b bg-gray-50/80">
            <div className="w-[56px]" />
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pl-0 pr-5">Farmer Details</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Program Information</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Enrolment Workflow</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">FRI Score</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pl-4 pr-2 w-[112px]">Actions</p>
          </div>
          <div className="divide-y divide-gray-100">
            {displayed.map(f => {
              const isSelected = selected.has(f.id);
              const enr = f.enrollment;
              const currentStageDef = WORKFLOW_STAGES.find(s => s.stage === f.current_stage);
              return (
                <div
                  key={f.id}
                  className={cn(
                    'flex items-stretch transition-colors group',
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/70'
                  )}
                >
                  {/* Checkbox + Avatar */}
                  <div className="flex items-center gap-3 py-4 px-4 shrink-0">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0',
                        isSelected ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-200 hover:border-cropguard-mid'
                      )}
                      onClick={() => toggleSelect(f.id)}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      enr ? 'bg-cropguard-mint text-cropguard-dark' : 'bg-gray-100 text-gray-500'
                    )}>
                      {f.photo_url ? (
                        <img src={f.photo_url} alt={f.full_name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        f.full_name.charAt(0)
                      )}
                    </div>
                  </div>

                  {/* Section 1 — Farmer Details */}
                  <div
                    className="flex flex-col justify-center py-4 pr-5 w-[200px] shrink-0 cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-cropguard-forest text-sm leading-tight truncate">{f.full_name}</p>
                      {f.duplicate_flag && (
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-gray-400 font-mono">{f.phone}</span>
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
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                          {f.cohort_name && (
                            <span className="text-[11px] text-gray-500 truncate">{f.cohort_name}</span>
                          )}
                          {f.cohort_name && f.agent_name && (
                            <span className="text-gray-300 text-[10px] shrink-0">·</span>
                          )}
                          {f.agent_name && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-500 min-w-0">
                              <UserCog className="w-3 h-3 text-gray-300 shrink-0" />
                              <span className="truncate">{f.agent_name}</span>
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </div>

                  {/* Section 3 — Enrolment Workflow */}
                  <div
                    className="flex flex-col justify-center py-4 px-5 shrink-0 w-[160px] cursor-pointer border-r border-gray-100"
                    onClick={() => openDetail(f)}
                  >
                    {enr && f.current_stage > 0 ? (
                      <>
                        <div className="flex gap-px mb-1.5">
                          {WORKFLOW_STAGES.map(s => (
                            <div key={s.stage} className={cn(
                              'h-1 rounded-sm flex-1',
                              s.stage < f.current_stage   ? 'bg-emerald-400' :
                              s.stage === f.current_stage ? 'bg-cropguard-dark' : 'bg-gray-200'
                            )} />
                          ))}
                        </div>
                        <span className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                          {currentStageDef?.name ?? `Stage ${f.current_stage}`}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          Stage {f.current_stage} of {WORKFLOW_STAGES.length}
                        </span>
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
                  </div>
                </div>
              );
            })}
          </div>
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
                ['Phone',       detailFarmer.phone],
                ['National ID', detailFarmer.national_id],
                ['Region',      REGION_LABELS[detailFarmer.region_code as RegionCode] ?? detailFarmer.region_code],
                ['District',    detailFarmer.district],
                ['Community',   detailFarmer.community || '—'],
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
          key={editingFarmer?.id ?? 'edit'}
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

      {/* ── CSV upload drawer ─────────────────────────────────────────────────── */}
      <Drawer open={csvOpen} onClose={() => { setCsvOpen(false); setCsvRows([]); setCsvError(''); setCsvMsg(''); }} title="Bulk Upload Farmers" width="max-w-2xl">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-700">CSV Format</p>
            <p className="text-xs text-blue-600 font-mono">{CSV_HEADERS.join(', ')}</p>
            <Button size="sm" variant="outline" className="mt-1" onClick={downloadCsvTemplate}>
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
              <div className="border rounded-lg overflow-auto max-h-52">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Name','Phone','National ID','Region','District','Crop'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {csvRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className={cn('hover:bg-gray-50', (!row.full_name || !row.phone || !row.national_id || !row.region_code || !row.district || !row.primary_crop) && 'bg-red-50')}>
                        <td className="px-3 py-2 truncate max-w-24">{row.full_name || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2">{row.phone || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2">{row.national_id || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2">{row.region_code || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2">{row.district || <span className="text-red-400">missing</span>}</td>
                        <td className="px-3 py-2 text-gray-500">{row.primary_crop || <span className="text-red-400">missing</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 10 && <p className="text-xs text-gray-400 px-3 py-2">… and {csvRows.length - 10} more rows</p>}
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
