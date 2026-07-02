import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Zap, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, X, Check, PlayCircle,
  Package, Shield, TrendingUp, BookOpen, Users, UserPlus,
  CheckCircle2, Clock, XCircle, Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Program } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EligibilityRule {
  rule_id:       string;
  label:         string;
  field:         string;
  operator:      string;
  value:         number;
  display_value: string;
}

interface Intervention {
  id:                 string;
  program_id:         string;
  name:               string;
  type:               string;
  season:             string;
  description:        string | null;
  value_description:  string;
  min_fri:            number;
  eligibility_rules:  EligibilityRule[];
  improvement_steps:  string[];
  capacity:           number | null;
  status:             string;
  approval_workflow:  string;
  created_at:         string;
}

interface InterventionForm {
  program_id:        string;
  name:              string;
  type:              string;
  season:            string;
  description:       string;
  value_description: string;
  min_fri:           string;
  capacity:          string;
  status:            string;
  approval_workflow: string;
  eligibility_rules: EligibilityRule[];
  improvement_steps: string[];
}

interface FarmerWithFRI {
  id:           string;
  full_name:    string;
  phone:        string;
  region_code:  string;
  primary_crop: string | null;
  fri_score:    number | null;
  zone:         string | null;
}

interface Application {
  id:             string;
  farmer_id:      string;
  intervention_id: string;
  status:         string;
  notes:          string | null;
  applied_at:     string;
  approved_at:    string | null;
  farmer_name:    string;
  farmer_phone:   string;
}

const EMPTY_FORM: InterventionForm = {
  program_id: '', name: '', type: 'Input Loan', season: '', description: '',
  value_description: '', min_fri: '0', capacity: '', status: 'Draft',
  approval_workflow: 'Auto', eligibility_rules: [], improvement_steps: [],
};

const INTERVENTION_TYPES = ['Input Loan', 'Grant', 'Insurance', 'Market Linkage', 'Advisory', 'Training', 'Recovery'];
const APPROVAL_WORKFLOWS = ['Auto', 'Manager', 'Agronomist', 'Credit', 'Partner'];
const STATUSES = ['Draft', 'Active', 'Closed', 'Suspended'];

const RULE_FIELDS = [
  { value: 'fri_total',    label: 'FRI Total Score' },
  { value: 'p1_score',     label: 'P1 Farm Management' },
  { value: 'p2_score',     label: 'P2 Climate Resilience' },
  { value: 'p3_score',     label: 'P3 Economic Inclusion' },
  { value: 'p4_score',     label: 'P4 Social Welfare' },
  { value: 'eci_score',    label: 'ECI Score (0–40)' },
  { value: 'credit_score', label: 'Credit Score (300–850)' },
];

const OPERATORS = ['>=', '<=', '==', '!='];

const TYPE_ICONS: Record<string, React.ElementType> = {
  'Input Loan':    Package,
  'Insurance':     Shield,
  'Market Linkage':TrendingUp,
  'Training':      BookOpen,
  'Grant':         Zap,
  'Advisory':      BookOpen,
  'Recovery':      AlertTriangle,
};

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Active:    'bg-emerald-100 text-emerald-700',
  Closed:    'bg-blue-100 text-blue-700',
  Suspended: 'bg-amber-100 text-amber-700',
};

const ZONE_STYLE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

// ── Preview score panel ───────────────────────────────────────────────────────

function PreviewPanel({ rules }: { rules: EligibilityRule[] }) {
  const [fri, setFri] = useState(65);

  const mockFacts: Record<string, number> = {
    fri_total:    fri,
    p1_score:     Math.round(fri * 0.30),
    p2_score:     Math.round(fri * 0.28),
    p3_score:     Math.round(fri * 0.22),
    p4_score:     Math.round(fri * 0.20),
    eci_score:    Math.round((fri / 100) * 32),
    credit_score: Math.round(300 + (fri / 100) * 550),
  };

  const evaluate = (r: EligibilityRule) => {
    const v = mockFacts[r.field] ?? 0;
    if (r.operator === '>=') return v >= r.value;
    if (r.operator === '<=') return v <= r.value;
    if (r.operator === '==') return v === r.value;
    if (r.operator === '!=') return v !== r.value;
    return false;
  };

  const allPass = rules.length > 0 && rules.every(evaluate);

  return (
    <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Rule Preview</p>
        <Badge className={cn('text-[10px] border-0', allPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
          {allPass ? 'Eligible' : 'Not Eligible'}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Simulated FRI Score</span>
          <span className="font-bold text-cropguard-dark">{fri}</span>
        </div>
        <input
          type="range" min="0" max="100" value={fri}
          onChange={e => setFri(Number(e.target.value))}
          className="w-full h-1.5 accent-cropguard-dark"
        />
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Add rules to see live evaluation</p>
      ) : (
        <div className="space-y-1.5">
          {rules.map(r => {
            const pass = evaluate(r);
            const curr = mockFacts[r.field] ?? 0;
            return (
              <div key={r.rule_id} className={cn('flex items-center gap-2 rounded-lg px-3 py-2', pass ? 'bg-emerald-50' : 'bg-red-50')}>
                {pass ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                <span className="text-xs flex-1 text-gray-700">{r.label}</span>
                <span className={cn('text-xs font-bold', pass ? 'text-emerald-700' : 'text-red-600')}>
                  {curr} {r.operator} {r.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Rule builder ──────────────────────────────────────────────────────────────

function RuleBuilder({
  rules, onChange,
}: { rules: EligibilityRule[]; onChange: (r: EligibilityRule[]) => void }) {
  const addRule = () => {
    const newRule: EligibilityRule = {
      rule_id:       `r${Date.now()}`,
      label:         'Minimum FRI',
      field:         'fri_total',
      operator:      '>=',
      value:         60,
      display_value: '≥ 60',
    };
    onChange([...rules, newRule]);
  };

  const update = (idx: number, patch: Partial<EligibilityRule>) => {
    const updated = rules.map((r, i) => {
      if (i !== idx) return r;
      const merged = { ...r, ...patch };
      const fieldLabel = RULE_FIELDS.find(f => f.value === merged.field)?.label ?? merged.field;
      merged.label = fieldLabel;
      merged.display_value = `${merged.operator} ${merged.value}`;
      return merged;
    });
    onChange(updated);
  };

  const remove = (idx: number) => onChange(rules.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {rules.map((r, idx) => (
        <div key={r.rule_id} className="flex items-end gap-2 bg-gray-50 rounded-lg p-3">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Field</Label>
            <Select value={r.field} onValueChange={v => update(idx, { field: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Op</Label>
            <Select value={r.operator} onValueChange={v => update(idx, { operator: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Value</Label>
            <Input
              type="number"
              className="h-8 text-xs"
              value={r.value}
              onChange={e => update(idx, { value: Number(e.target.value) })}
            />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0" onClick={() => remove(idx)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={addRule}>
        <Plus className="w-3 h-3 mr-1" /> Add Rule
      </Button>
    </div>
  );
}

// ── Steps editor ──────────────────────────────────────────────────────────────

function StepsEditor({ steps, onChange }: { steps: string[]; onChange: (s: string[]) => void }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input
            className="text-xs h-8"
            value={s}
            placeholder={`Step ${i + 1}`}
            onChange={e => onChange(steps.map((x, j) => j === i ? e.target.value : x))}
          />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0" onClick={() => onChange(steps.filter((_, j) => j !== i))}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => onChange([...steps, ''])}>
        <Plus className="w-3 h-3 mr-1" /> Add Step
      </Button>
    </div>
  );
}

// ── Farmer row for enrol modal ────────────────────────────────────────────────

function FarmerEnrolRow({
  farmer,
  selected,
  onToggle,
  alreadyEnrolled,
}: {
  farmer: FarmerWithFRI;
  selected: boolean;
  onToggle: () => void;
  alreadyEnrolled: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer',
        alreadyEnrolled
          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
          : selected
            ? 'border-cropguard-dark bg-cropguard-mint/30'
            : 'border-gray-100 bg-white hover:border-cropguard-mid',
      )}
      onClick={() => !alreadyEnrolled && onToggle()}
    >
      <div className={cn(
        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
        alreadyEnrolled
          ? 'border-gray-300 bg-gray-100'
          : selected
            ? 'border-cropguard-dark bg-cropguard-dark'
            : 'border-gray-300',
      )}>
        {(selected || alreadyEnrolled) && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="w-8 h-8 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
        <span className="text-cropguard-dark text-xs font-bold">{farmer.full_name.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{farmer.full_name}</p>
        <p className="text-xs text-gray-400">{farmer.phone}</p>
      </div>
      <div className="text-right shrink-0">
        {farmer.fri_score != null && (
          <p className="text-sm font-semibold text-gray-800">{farmer.fri_score.toFixed(1)}</p>
        )}
        {farmer.zone && (
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', ZONE_STYLE[farmer.zone] ?? 'bg-gray-100 text-gray-500')}>
            {farmer.zone}
          </span>
        )}
      </div>
      {alreadyEnrolled && (
        <span className="text-[10px] font-semibold text-gray-400 shrink-0">Enrolled</span>
      )}
    </div>
  );
}

// ── Intervention Detail Modal (4 tabs) ────────────────────────────────────────

type DetailTab = 'eligible' | 'applied' | 'active' | 'closed';

function InterventionDetailModal({
  intervention,
  open,
  onClose,
  profile,
}: {
  intervention: Intervention | null;
  open: boolean;
  onClose: () => void;
  profile: any;
}) {
  const [tab, setTab]                 = useState<DetailTab>('eligible');
  const [farmers, setFarmers]         = useState<FarmerWithFRI[]>([]);
  const [applications, setApps]       = useState<Application[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling]     = useState(false);
  const [search, setSearch]           = useState('');
  const [enrollError, setEnrollError] = useState('');

  const loadData = useCallback(async () => {
    if (!intervention) return;
    setLoading(true);
    try {
      const [farmersRes, friRes, appsRes] = await Promise.all([
        supabase.from('farmers').select('id, full_name, phone, region_code, primary_crop').order('full_name').limit(500),
        supabase.from('farmer_fri_scores').select('farmer_id, total_score, zone, created_at').order('created_at', { ascending: false }).limit(1000),
        supabase.from('farmer_intervention_applications').select('*').eq('intervention_id', intervention.id),
      ]);

      const friMap: Record<string, any> = {};
      (friRes.data ?? []).forEach((r: any) => {
        if (!friMap[r.farmer_id]) friMap[r.farmer_id] = r;
      });

      const enriched: FarmerWithFRI[] = (farmersRes.data ?? []).map((f: any) => ({
        id:           f.id,
        full_name:    f.full_name,
        phone:        f.phone,
        region_code:  f.region_code,
        primary_crop: f.primary_crop,
        fri_score:    friMap[f.id]?.total_score != null ? Number(friMap[f.id].total_score) : null,
        zone:         friMap[f.id]?.zone ?? null,
      }));

      setFarmers(enriched);

      const farmerMap: Record<string, FarmerWithFRI> = {};
      enriched.forEach(f => { farmerMap[f.id] = f; });

      const apps: Application[] = (appsRes.data ?? []).map((a: any) => ({
        id:             a.id,
        farmer_id:      a.farmer_id,
        intervention_id: a.intervention_id,
        status:         a.status,
        notes:          a.notes,
        applied_at:     a.applied_at,
        approved_at:    a.approved_at,
        farmer_name:    farmerMap[a.farmer_id]?.full_name ?? 'Unknown',
        farmer_phone:   farmerMap[a.farmer_id]?.phone ?? '',
      }));
      setApps(apps);
    } finally {
      setLoading(false);
    }
  }, [intervention]);

  useEffect(() => {
    if (open) {
      setTab('eligible');
      setSelected(new Set());
      setSearch('');
      setEnrollError('');
      loadData();
    }
  }, [open, loadData]);

  if (!intervention) return null;

  const enrolledIds = new Set(applications.map(a => a.farmer_id));

  const eligibleFarmers = farmers.filter(f => {
    if (f.fri_score == null) return false;
    if (f.fri_score < intervention.min_fri) return false;
    for (const rule of intervention.eligibility_rules) {
      const val = rule.field === 'fri_total' ? f.fri_score : null;
      if (val == null) continue;
      if (rule.operator === '>=' && val < rule.value) return false;
      if (rule.operator === '<=' && val > rule.value) return false;
      if (rule.operator === '==' && val !== rule.value) return false;
      if (rule.operator === '!=' && val === rule.value) return false;
    }
    return true;
  });

  const searchedEligible = search.trim()
    ? eligibleFarmers.filter(f => f.full_name.toLowerCase().includes(search.toLowerCase()))
    : eligibleFarmers;

  const appliedApps  = applications.filter(a => a.status === 'applied');
  const activeApps   = applications.filter(a => a.status === 'active');
  const closedApps   = applications.filter(a => a.status === 'closed' || a.status === 'suspended');

  const handleEnrol = async () => {
    if (!selected.size) return;
    setEnrolling(true);
    setEnrollError('');
    try {
      const rows = Array.from(selected).map(fid => ({
        farmer_id:       fid,
        intervention_id: intervention.id,
        status:          'applied',
        created_by:      profile?.id ?? null,
        applied_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      }));
      const { error } = await supabase.from('farmer_intervention_applications').upsert(rows, { onConflict: 'farmer_id,intervention_id' });
      if (error) { setEnrollError(error.message); return; }
      setSelected(new Set());
      await loadData();
      setTab('applied');
    } finally {
      setEnrolling(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const patch: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'active') patch.approved_at = new Date().toISOString();
    await supabase.from('farmer_intervention_applications').update(patch).eq('id', appId);
    await loadData();
  };

  const TABS: { key: DetailTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'eligible', label: 'Eligible',        icon: Users,          count: eligibleFarmers.length },
    { key: 'applied',  label: 'Applied',          icon: Clock,          count: appliedApps.length },
    { key: 'active',   label: 'Active',           icon: CheckCircle2,   count: activeApps.length },
    { key: 'closed',   label: 'Closed/Suspended', icon: XCircle,        count: closedApps.length },
  ];

  const renderAppRow = (app: Application, actions: { label: string; status: string; color: string }[]) => (
    <div key={app.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-white">
      <div className="w-8 h-8 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
        <span className="text-cropguard-dark text-xs font-bold">{app.farmer_name.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{app.farmer_name}</p>
        <p className="text-xs text-gray-400">{app.farmer_phone}</p>
      </div>
      <div className="text-xs text-gray-400 shrink-0 hidden sm:block">
        {new Date(app.applied_at).toLocaleDateString()}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {actions.map(a => (
          <button
            key={a.status}
            className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors', a.color)}
            onClick={() => handleStatusChange(app.id, a.status)}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title={intervention.name} width="max-w-2xl">
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-1 rounded-lg transition-colors',
                tab === t.key ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className={cn(
                'text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                tab === t.key ? 'bg-cropguard-mint text-cropguard-dark' : 'bg-gray-200 text-gray-500',
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : (
          <>
            {/* Eligible tab */}
            {tab === 'eligible' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Search farmers…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={selected.size === 0 || enrolling}
                    className="bg-cropguard-dark hover:bg-cropguard-forest h-8 text-xs shrink-0"
                    onClick={handleEnrol}
                  >
                    {enrolling
                      ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Enrolling…</>
                      : <><UserPlus className="w-3 h-3 mr-1" />Enrol {selected.size > 0 ? `(${selected.size})` : ''}</>
                    }
                  </Button>
                </div>
                {enrollError && <p className="text-xs text-red-600">{enrollError}</p>}
                {selected.size > 0 && (
                  <p className="text-xs text-cropguard-slate">
                    {selected.size} farmer{selected.size !== 1 ? 's' : ''} selected.{' '}
                    <button className="text-cropguard-dark font-medium" onClick={() => setSelected(new Set())}>Clear</button>
                  </p>
                )}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {searchedEligible.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No eligible farmers found.</p>
                      <p className="text-xs text-gray-400 mt-1">Min FRI: {intervention.min_fri}</p>
                    </div>
                  ) : (
                    searchedEligible.map(f => (
                      <FarmerEnrolRow
                        key={f.id}
                        farmer={f}
                        selected={selected.has(f.id)}
                        alreadyEnrolled={enrolledIds.has(f.id)}
                        onToggle={() => setSelected(prev => {
                          const next = new Set(prev);
                          next.has(f.id) ? next.delete(f.id) : next.add(f.id);
                          return next;
                        })}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Applied tab */}
            {tab === 'applied' && (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {appliedApps.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No pending applications.</p>
                  </div>
                ) : appliedApps.map(app => renderAppRow(app, [
                  { label: 'Approve', status: 'active',    color: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
                  { label: 'Reject',  status: 'closed',    color: 'border-red-300 text-red-600 hover:bg-red-50' },
                ]))}
              </div>
            )}

            {/* Active tab */}
            {tab === 'active' && (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {activeApps.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No active enrollments.</p>
                  </div>
                ) : activeApps.map(app => renderAppRow(app, [
                  { label: 'Suspend', status: 'suspended', color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
                  { label: 'Close',   status: 'closed',    color: 'border-gray-300 text-gray-600 hover:bg-gray-50' },
                ]))}
              </div>
            )}

            {/* Closed/Suspended tab */}
            {tab === 'closed' && (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {closedApps.length === 0 ? (
                  <div className="text-center py-10">
                    <XCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No closed or suspended applications.</p>
                  </div>
                ) : closedApps.map(app => renderAppRow(app, [
                  { label: 'Reopen', status: 'applied', color: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
                ]))}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

// ── Intervention card ─────────────────────────────────────────────────────────

function InterventionCard({
  item, program, onEdit, onDelete, onToggle, onViewDetail, onEnrol,
}: {
  item: Intervention;
  program: Program | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onViewDetail: () => void;
  onEnrol: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = TYPE_ICONS[item.type] ?? Zap;

  return (
    <div
      className={cn('bg-white rounded-xl border shadow-sm overflow-hidden', item.status === 'Suspended' && 'opacity-70')}
    >
      <div
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onViewDetail}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-cropguard-mint flex items-center justify-center shrink-0">
            <TypeIcon className="w-4 h-4 text-cropguard-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-cropguard-forest text-sm">{item.name}</p>
              <Badge className={cn('text-[10px] border-0 shrink-0', STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500')}>
                {item.status}
              </Badge>
            </div>
            <p className="text-xs text-cropguard-slate mt-0.5">{item.type} &middot; {item.season}</p>
            {program && <p className="text-xs text-cropguard-mid mt-0.5">{program.name}</p>}
            {item.value_description && (
              <p className="text-xs text-cropguard-dark font-medium mt-1">{item.value_description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-cropguard-slate">
              <span>Min FRI: <strong className="text-cropguard-forest">{item.min_fri}</strong></span>
              {item.capacity !== null && <span>Capacity: <strong className="text-cropguard-forest">{item.capacity}</strong></span>}
              <span>{item.eligibility_rules.length} rules</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2 border-t pt-3" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onToggle}>
          <PlayCircle className="w-3 h-3 mr-1" />
          {item.status === 'Active' ? 'Suspend' : 'Activate'}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs bg-cropguard-dark hover:bg-cropguard-forest text-white"
          onClick={onEnrol}
        >
          <UserPlus className="w-3 h-3 mr-1" /> Enrol
        </Button>
        <button
          className="ml-auto p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t bg-gray-50/60 px-4 py-4 space-y-4">
          {item.description && (
            <p className="text-xs text-cropguard-slate">{item.description}</p>
          )}
          {item.eligibility_rules.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Eligibility Rules</p>
              <div className="space-y-1">
                {item.eligibility_rules.map(r => (
                  <div key={r.rule_id} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check className="w-3 h-3 text-cropguard-green shrink-0" />
                    {r.label} <span className="text-cropguard-dark font-medium">{r.display_value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.improvement_steps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Improvement Steps</p>
              <ol className="space-y-1 list-decimal list-inside">
                {item.improvement_steps.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700">{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InterventionsPage() {
  const profile = useAuthStore(s => s.profile);

  const [items, setItems] = useState<Intervention[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('__none__');
  const [filterStatus, setFilterStatus] = useState('__none__');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Intervention | null>(null);
  const [form, setForm] = useState<InterventionForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Intervention | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailOpen, setDetailOpen]         = useState(false);
  const [detailItem, setDetailItem]         = useState<Intervention | null>(null);
  const [enrolOpen, setEnrolOpen]           = useState(false);
  const [enrolItem, setEnrolItem]           = useState<Intervention | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: progs }, { data: interventions }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('interventions_catalog').select('*').order('created_at', { ascending: false }),
    ]);
    setPrograms(progs ?? []);
    setItems((interventions ?? []) as Intervention[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, program_id: programs[0]?.id ?? '' });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (item: Intervention) => {
    setEditing(item);
    setForm({
      program_id:        item.program_id,
      name:              item.name,
      type:              item.type,
      season:            item.season,
      description:       item.description ?? '',
      value_description: item.value_description,
      min_fri:           String(item.min_fri),
      capacity:          item.capacity !== null ? String(item.capacity) : '',
      status:            item.status,
      approval_workflow: item.approval_workflow,
      eligibility_rules: item.eligibility_rules,
      improvement_steps: item.improvement_steps,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.program_id || !form.name || !form.type || !form.season) {
      setFormError('Please fill in all required fields.'); return;
    }
    setSaving(true); setFormError('');
    const payload = {
      program_id:        form.program_id,
      name:              form.name,
      type:              form.type,
      season:            form.season,
      description:       form.description || null,
      value_description: form.value_description,
      min_fri:           parseInt(form.min_fri) || 0,
      capacity:          form.capacity ? parseInt(form.capacity) : null,
      status:            form.status,
      approval_workflow: form.approval_workflow,
      eligibility_rules: form.eligibility_rules,
      improvement_steps: form.improvement_steps,
      created_by:        profile!.id,
    };
    if (editing) {
      await supabase.from('interventions_catalog').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('interventions_catalog').insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleToggle = async (item: Intervention) => {
    const newStatus = item.status === 'Active' ? 'Suspended' : 'Active';
    await supabase.from('interventions_catalog').update({ status: newStatus }).eq('id', item.id);
    load();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    await supabase.from('interventions_catalog').delete().eq('id', toDelete.id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setToDelete(null);
    load();
  };

  const visible = items
    .filter(i => filterProgram === '__none__' || i.program_id === filterProgram)
    .filter(i => filterStatus === '__none__' || i.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Interventions</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">{items.length} intervention{items.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button onClick={openCreate} className="bg-cropguard-dark hover:bg-cropguard-forest">
          <Plus className="w-4 h-4 mr-2" /> New Intervention
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="All programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All programs</SelectItem>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterProgram !== '__none__' || filterStatus !== '__none__') && (
          <button
            className="text-xs text-cropguard-slate hover:text-cropguard-dark flex items-center gap-1"
            onClick={() => { setFilterProgram('__none__'); setFilterStatus('__none__'); }}
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-cropguard-slate">
          <div className="w-16 h-16 bg-cropguard-mint rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-cropguard-dark" />
          </div>
          <p className="text-lg font-medium text-cropguard-forest">No interventions yet</p>
          <p className="text-sm mt-1">Create your first intervention to configure eligibility rules.</p>
          <Button onClick={openCreate} className="mt-4 bg-cropguard-dark hover:bg-cropguard-forest">
            <Plus className="w-4 h-4 mr-2" /> Create Intervention
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visible.map(item => (
            <InterventionCard
              key={item.id}
              item={item}
              program={programs.find(p => p.id === item.program_id)}
              onEdit={() => openEdit(item)}
              onDelete={() => { setToDelete(item); setDeleteDialogOpen(true); }}
              onToggle={() => handleToggle(item)}
              onViewDetail={() => { setDetailItem(item); setDetailOpen(true); }}
              onEnrol={() => { setEnrolItem(item); setEnrolOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit Intervention' : 'New Intervention'}
        width="max-w-2xl"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program *</Label>
                <Select value={form.program_id} onValueChange={v => setForm(f => ({ ...f, program_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Intervention Name *</Label>
                <Input placeholder="e.g. 2026 Groundnut Input Loan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERVENTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Season *</Label>
                  <Input placeholder="2026 Main" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Value Description</Label>
                <Input placeholder="e.g. USD 800–2,500 input package" value={form.value_description} onChange={e => setForm(f => ({ ...f, value_description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</Label>
                <Input placeholder="Brief description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Min FRI</Label>
                  <Input type="number" min="0" max="100" value={form.min_fri} onChange={e => setForm(f => ({ ...f, min_fri: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity</Label>
                  <Input type="number" min="1" placeholder="Unlimited" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Approval</Label>
                  <Select value={form.approval_workflow} onValueChange={v => setForm(f => ({ ...f, approval_workflow: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{APPROVAL_WORKFLOWS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
            </div>
            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Eligibility Rules</Label>
                <RuleBuilder rules={form.eligibility_rules} onChange={r => setForm(f => ({ ...f, eligibility_rules: r }))} />
              </div>
              <PreviewPanel rules={form.eligibility_rules} />
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Improvement Steps</Label>
                <StepsEditor steps={form.improvement_steps} onChange={s => setForm(f => ({ ...f, improvement_steps: s }))} />
              </div>
            </div>
          </div>
          {formError && <p className="text-xs text-red-600 mt-3">{formError}</p>}
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleSave}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editing ? 'Save Changes' : 'Create Intervention'}
            </Button>
          </div>
      </Drawer>

      {/* Delete confirm Drawer */}
      <Drawer open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} title="Delete Intervention">
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">Delete <strong>{toDelete?.name}</strong>? This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Delete</>}
              </Button>
            </div>
          </div>
      </Drawer>

      {/* Intervention detail modal (4 tabs) */}
      <InterventionDetailModal
        intervention={detailItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        profile={profile}
      />

      {/* Enrol drawer (same as detail, opened directly on Eligible tab) */}
      <InterventionDetailModal
        intervention={enrolItem}
        open={enrolOpen}
        onClose={() => setEnrolOpen(false)}
        profile={profile}
      />
    </div>
  );
}
