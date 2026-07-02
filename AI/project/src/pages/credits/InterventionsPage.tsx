import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Zap, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, X, Check, PlayCircle,
  Package, Shield, TrendingUp, BookOpen,
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
  'Input Loan':     Package,
  'Insurance':      Shield,
  'Market Linkage': TrendingUp,
  'Training':       BookOpen,
  'Grant':          Zap,
  'Advisory':       BookOpen,
  'Recovery':       AlertTriangle,
};

const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Active:    'bg-emerald-100 text-emerald-700',
  Closed:    'bg-blue-100 text-blue-700',
  Suspended: 'bg-amber-100 text-amber-700',
};

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
    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Live Rule Preview</p>
        <Badge className={cn('text-[10px] border-0', allPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
          {allPass ? 'Eligible' : 'Not Eligible'}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Simulated FRI Score</span>
          <span className="font-bold text-blue-900">{fri}</span>
        </div>
        <input
          type="range" min="0" max="100" value={fri}
          onChange={e => setFri(Number(e.target.value))}
          className="w-full h-1.5 accent-blue-600"
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

function RuleBuilder({ rules, onChange }: { rules: EligibilityRule[]; onChange: (r: EligibilityRule[]) => void }) {
  const addRule = () => {
    onChange([...rules, {
      rule_id: `r${Date.now()}`, label: 'Minimum FRI',
      field: 'fri_total', operator: '>=', value: 60, display_value: '≥ 60',
    }]);
  };
  const update = (idx: number, patch: Partial<EligibilityRule>) => {
    onChange(rules.map((r, i) => {
      if (i !== idx) return r;
      const merged = { ...r, ...patch };
      merged.label = RULE_FIELDS.find(f => f.value === merged.field)?.label ?? merged.field;
      merged.display_value = `${merged.operator} ${merged.value}`;
      return merged;
    }));
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
              <SelectContent>{RULE_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Op</Label>
            <Select value={r.operator} onValueChange={v => update(idx, { operator: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Value</Label>
            <Input type="number" className="h-8 text-xs" value={r.value} onChange={e => update(idx, { value: Number(e.target.value) })} />
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

function StepsEditor({ steps, onChange }: { steps: string[]; onChange: (s: string[]) => void }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input className="text-xs h-8" value={s} placeholder={`Step ${i + 1}`}
            onChange={e => onChange(steps.map((x, j) => j === i ? e.target.value : x))} />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0"
            onClick={() => onChange(steps.filter((_, j) => j !== i))}>
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

function InterventionCard({ item, program, onEdit, onDelete, onToggle }: {
  item: Intervention; program: Program | undefined;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = TYPE_ICONS[item.type] ?? Zap;

  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden', item.status === 'Suspended' && 'opacity-70')}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <TypeIcon className="w-4 h-4 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
              <Badge className={cn('text-[10px] border-0 shrink-0', STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500')}>
                {item.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{item.type} · {item.season}</p>
            {program && <p className="text-xs text-gray-400 mt-0.5">{program.name}</p>}
            {item.value_description && (
              <p className="text-xs text-blue-700 font-medium mt-1">{item.value_description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
              <span>Min FRI: <strong className="text-gray-800">{item.min_fri}</strong></span>
              {item.capacity !== null && <span>Capacity: <strong className="text-gray-800">{item.capacity}</strong></span>}
              <span>{item.eligibility_rules.length} rule{item.eligibility_rules.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onToggle}>
            <PlayCircle className="w-3 h-3 mr-1" />
            {item.status === 'Active' ? 'Suspend' : 'Activate'}
          </Button>
          <button className="ml-auto p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t bg-gray-50/60 px-4 py-4 space-y-4">
          {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
          {item.eligibility_rules.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Eligibility Rules</p>
              <div className="space-y-1">
                {item.eligibility_rules.map(r => (
                  <div key={r.rule_id} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    {r.label} <span className="text-blue-700 font-medium">{r.display_value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.improvement_steps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Improvement Steps</p>
              <ol className="space-y-1 list-decimal list-inside">
                {item.improvement_steps.map((s, i) => <li key={i} className="text-xs text-gray-700">{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreditsInterventionsPage() {
  const profile = useAuthStore(s => s.profile);

  const [items,         setItems]         = useState<Intervention[]>([]);
  const [programs,      setPrograms]      = useState<Program[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filterProgram, setFilterProgram] = useState('__none__');
  const [filterStatus,  setFilterStatus]  = useState('__none__');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editing,    setEditing]    = useState<Intervention | null>(null);
  const [form,       setForm]       = useState<InterventionForm>(EMPTY_FORM);
  const [formError,  setFormError]  = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete,   setToDelete]   = useState<Intervention | null>(null);
  const [deleting,   setDeleting]   = useState(false);

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
      program_id: item.program_id, name: item.name, type: item.type, season: item.season,
      description: item.description ?? '', value_description: item.value_description,
      min_fri: String(item.min_fri), capacity: item.capacity !== null ? String(item.capacity) : '',
      status: item.status, approval_workflow: item.approval_workflow,
      eligibility_rules: item.eligibility_rules, improvement_steps: item.improvement_steps,
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
      program_id: form.program_id, name: form.name, type: form.type, season: form.season,
      description: form.description || null, value_description: form.value_description,
      min_fri: parseInt(form.min_fri) || 0,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      status: form.status, approval_workflow: form.approval_workflow,
      eligibility_rules: form.eligibility_rules, improvement_steps: form.improvement_steps,
      created_by: profile!.id,
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
    setDeleteOpen(false);
    setToDelete(null);
    load();
  };

  const visible = items
    .filter(i => filterProgram === '__none__' || i.program_id === filterProgram)
    .filter(i => filterStatus === '__none__' || i.status === filterStatus);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interventions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} intervention{items.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-700 hover:bg-blue-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Intervention
        </Button>
      </div>

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
          <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            onClick={() => { setFilterProgram('__none__'); setFilterStatus('__none__'); }}>
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-lg font-medium text-gray-800">No interventions yet</p>
          <p className="text-sm mt-1">Create an intervention to configure eligibility rules.</p>
          <Button onClick={openCreate} className="mt-4 bg-blue-700 hover:bg-blue-800 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Intervention
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visible.map(item => (
            <InterventionCard
              key={item.id} item={item} program={programs.find(p => p.id === item.program_id)}
              onEdit={() => openEdit(item)}
              onDelete={() => { setToDelete(item); setDeleteOpen(true); }}
              onToggle={() => handleToggle(item)}
            />
          ))}
        </div>
      )}

      <Drawer open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Edit Intervention' : 'New Intervention'} width="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTERVENTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
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
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Approval</Label>
                <Select value={form.approval_workflow} onValueChange={v => setForm(f => ({ ...f, approval_workflow: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_WORKFLOWS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
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
          <Button disabled={saving} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white" onClick={handleSave}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editing ? 'Save Changes' : 'Create Intervention'}
          </Button>
        </div>
      </Drawer>

      <Drawer open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Intervention">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">Delete <strong>{toDelete?.name}</strong>? This cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Delete</>}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
