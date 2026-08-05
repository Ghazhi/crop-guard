import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, Edit2, Save, X, Plus, Trash2, Copy,
  ChevronDown, ChevronRight, ChevronUp, Download, ClipboardCheck,
  Calendar, Layers, CheckSquare, Pause, Play, Users,
  FileText, Sprout, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { WEEKLY_ACTIVITIES } from '@/lib/scoring';
import {
  CHECKIN_TEMPLATES, WEEK_TITLES,
  type CheckinComponent, type CheckinCropType as CropType,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────── */
interface WeeklyActivityConfig {
  id: string;
  activity_code: string;
  pillar: 'p1' | 'p2' | 'p3' | 'p4';
  label: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

interface CheckinQuestion {
  id: string;
  organisation_id: string;
  crop_type: CropType | 'general';
  component: CheckinComponent;
  week_number: number | null;
  week_title: string | null;
  label: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

interface CohortRow {
  id: string;
  name: string;
  program_id: string;
  checkin_start_date: string | null;
  checkin_window_days: number;
  checkin_grace_days: number;
  total_weeks: number;
  start_mode: 'immediate' | 'scheduled';
  baseline_template_id: string | null;
  checkin_template_id: string | null;
  schedule_paused: boolean;
  paused_at: string | null;
}

interface BaselineTemplate {
  id: string;
  organisation_id: string;
  title: string;
  description: string;
  crop_type: string;
  p1_items: any[];
  p2_items: any[];
  p3_items: any[];
  p4_items: any[];
  include_eci: boolean;
  eci_items: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CheckinTemplate {
  id: string;
  organisation_id: string;
  title: string;
  crop_type: string;
  season: string;
  week_number: number | null;
  description: string;
  is_active: boolean;
  source_template_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CheckinTemplateItem {
  id: string;
  checkin_template_id: string;
  week_number: number;
  week_title: string | null;
  component: string;
  activity_code: string;
  label: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

interface CohortFarmerOverride {
  id: string;
  cohort_id: string;
  farmer_id: string;
  is_paused: boolean;
  paused_at: string | null;
  notes: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface EditingCohort {
  id: string;
  start_date: string;
  window_days: number;
  grace_days: number;
  total_weeks: number;
  start_mode: 'immediate' | 'scheduled';
  baseline_template_id: string;
  checkin_template_id: string;
}

/* ── Constants ──────────────────────────────────────────────── */
const PILLAR_LABELS: Record<'p1' | 'p2' | 'p3' | 'p4', string> = {
  p1: 'P1: Agronomy Readiness',
  p2: 'P2: CSA & Climate-Smart',
  p3: 'P3: Advisory & Commitment',
  p4: 'P4: Farm Enterprise Discipline',
};

const PILLAR_COLORS: Record<'p1' | 'p2' | 'p3' | 'p4', string> = {
  p1: 'bg-blue-100 text-blue-800',
  p2: 'bg-green-100 text-green-800',
  p3: 'bg-amber-100 text-amber-800',
  p4: 'bg-teal-100 text-teal-800',
};

const COMPONENTS: CheckinComponent[] = ['agronomy', 'climate_smart', 'advisory_commitment', 'farm_enterprise'];

const COMPONENT_META: Record<CheckinComponent, { label: string; color: string; bg: string; border: string }> = {
  agronomy:             { label: 'Agronomy',                   color: 'text-blue-800',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
  climate_smart:        { label: 'Climate Smart',              color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  advisory_commitment:  { label: 'Advisory & Commitment',      color: 'text-amber-800',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
  farm_enterprise:      { label: 'Farm Enterprise Discipline', color: 'text-teal-800',    bg: 'bg-teal-50',    border: 'border-teal-200'    },
};

const CROP_META: Record<CropType, { label: string; weeks: number }> = {
  maize:   { label: 'Maize',    weeks: 12 },
  soybean: { label: 'Soybeans', weeks: 11 },
  cocoa:   { label: 'Cocoa',    weeks: 16 },
};

type Section = 'baselines' | 'checkins' | 'schedules' | 'overrides';

const SECTIONS: { key: Section; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'baselines', icon: Layers,         label: 'Baseline Templates',     desc: 'Create reusable baseline assessments with 4 pillars + ECI' },
  { key: 'checkins',  icon: ClipboardCheck, label: 'Weekly Check-in Templates', desc: 'Create multi-week check-in templates by crop & season' },
  { key: 'schedules', icon: Calendar,       label: 'Cohort Schedules',       desc: 'Set start mode, link templates, pause schedules' },
  { key: 'overrides', icon: Users,          label: 'Farmer Overrides',        desc: 'Pause check-ins for specific farmers within a cohort' },
];

/* ── Toast ──────────────────────────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 space-y-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          'px-4 py-3 rounded-lg text-sm font-medium pointer-events-auto shadow-md',
          t.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200',
        )}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: BASELINE TEMPLATES
   ═══════════════════════════════════════════════════════════════ */
function BaselineTemplatesSection() {
  const profile = useAuthStore(s => s.profile);
  const [templates, setTemplates] = useState<BaselineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BaselineTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data, error } = await supabase
      .from('baseline_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false });
    if (error) { addToast('Failed to load baseline templates', 'error'); setLoading(false); return; }
    setTemplates((data ?? []) as BaselineTemplate[]);
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (tpl: Partial<BaselineTemplate> & { title: string }) => {
    if (!profile?.organisation_id) return;
    setSaving(true);
    if (tpl.id) {
      const { error } = await supabase.from('baseline_templates').update({
        title: tpl.title,
        description: tpl.description ?? '',
        crop_type: tpl.crop_type ?? 'maize',
        p1_items: tpl.p1_items ?? [],
        p2_items: tpl.p2_items ?? [],
        p3_items: tpl.p3_items ?? [],
        p4_items: tpl.p4_items ?? [],
        include_eci: tpl.include_eci ?? true,
        eci_items: tpl.eci_items ?? [],
        is_active: tpl.is_active ?? true,
      }).eq('id', tpl.id);
      if (error) { addToast('Failed to update template', 'error'); setSaving(false); return; }
      addToast('Baseline template updated');
    } else {
      const { data, error } = await supabase.from('baseline_templates').insert({
        organisation_id: profile.organisation_id,
        title: tpl.title,
        description: tpl.description ?? '',
        crop_type: tpl.crop_type ?? 'maize',
        p1_items: tpl.p1_items ?? [],
        p2_items: tpl.p2_items ?? [],
        p3_items: tpl.p3_items ?? [],
        p4_items: tpl.p4_items ?? [],
        include_eci: tpl.include_eci ?? true,
        eci_items: tpl.eci_items ?? [],
        is_active: true,
      }).select().single();
      if (error) { addToast('Failed to create template', 'error'); setSaving(false); return; }
      addToast('Baseline template created');
    }
    setSaving(false);
    setEditing(null);
    setCreating(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('baseline_templates').delete().eq('id', id);
    if (error) { addToast('Failed to delete', 'error'); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
    addToast('Template deleted');
  };

  if (creating || editing) {
    return <BaselineTemplateForm
      initial={editing}
      onSave={handleSave}
      onCancel={() => { setCreating(false); setEditing(null); }}
      saving={saving}
    />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Create reusable baseline assessments with the 4 mandatory pillars and optional ECI section.</p>
        <Button onClick={() => setCreating(true)} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
          <Plus className="w-3.5 h-3.5" />New Template
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No baseline templates yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-cropguard-forest">{tpl.title}</h4>
                    <Badge className="text-xs border-0 bg-blue-100 text-blue-800">{tpl.crop_type}</Badge>
                    {tpl.include_eci && <Badge className="text-xs border-0 bg-purple-100 text-purple-800">ECI</Badge>}
                    {!tpl.is_active && <Badge className="text-xs border-0 bg-gray-100 text-gray-500">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{tpl.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    <span>P1: {tpl.p1_items?.length ?? 0} items</span>
                    <span>P2: {tpl.p2_items?.length ?? 0} items</span>
                    <span>P3: {tpl.p3_items?.length ?? 0} items</span>
                    <span>P4: {tpl.p4_items?.length ?? 0} items</span>
                    {tpl.include_eci && <span>ECI: {tpl.eci_items?.length ?? 0} items</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(tpl)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

function BaselineTemplateForm({
  initial, onSave, onCancel, saving,
}: {
  initial: BaselineTemplate | null;
  onSave: (tpl: Partial<BaselineTemplate> & { title: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [cropType, setCropType] = useState(initial?.crop_type ?? 'maize');
  const [includeEci, setIncludeEci] = useState(initial?.include_eci ?? true);

  const pillarKeys = ['p1', 'p2', 'p3', 'p4'] as const;
  const [pillarItems, setPillarItems] = useState<Record<string, any[]>>({
    p1: initial?.p1_items ?? [],
    p2: initial?.p2_items ?? [],
    p3: initial?.p3_items ?? [],
    p4: initial?.p4_items ?? [],
  });
  const [eciItems, setEciItems] = useState<any[]>(initial?.eci_items ?? []);

  const addItem = (pillar: string) => {
    const newItem = { id: `item_${Date.now()}`, label: '', max: 6, guidance: '' };
    if (pillar === 'eci') {
      setEciItems(prev => [...prev, newItem]);
    } else {
      setPillarItems(prev => ({ ...prev, [pillar]: [...prev[pillar], newItem] }));
    }
  };

  const updateItem = (pillar: string, idx: number, field: string, value: string | number) => {
    if (pillar === 'eci') {
      setEciItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
    } else {
      setPillarItems(prev => ({
        ...prev,
        [pillar]: prev[pillar].map((it, i) => i === idx ? { ...it, [field]: value } : it),
      }));
    }
  };

  const removeItem = (pillar: string, idx: number) => {
    if (pillar === 'eci') {
      setEciItems(prev => prev.filter((_, i) => i !== idx));
    } else {
      setPillarItems(prev => ({
        ...prev,
        [pillar]: prev[pillar].filter((_, i) => i !== idx),
      }));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-cropguard-forest">{initial ? 'Edit Baseline Template' : 'New Baseline Template'}</h3>
        <Button onClick={onCancel} variant="outline" size="sm"><X className="w-3.5 h-3.5 mr-1.5" />Cancel</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Template Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Maize Baseline 2026A" className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="text-sm" />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Crop Type</label>
            <select value={cropType} onChange={e => setCropType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="maize">Maize</option>
              <option value="soybean">Soybean</option>
              <option value="cocoa">Cocoa</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <button type="button" onClick={() => setIncludeEci(!includeEci)}
              className={cn('relative h-5 w-9 rounded-full transition-colors', includeEci ? 'bg-emerald-500' : 'bg-gray-300')}>
              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                includeEci ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
            <span className="text-xs text-gray-500">Include ECI Section</span>
          </div>
        </div>
      </div>

      {pillarKeys.map(pillar => (
        <div key={pillar} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn('inline-block text-xs font-bold px-3 py-1 rounded-full', PILLAR_COLORS[pillar])}>
              {PILLAR_LABELS[pillar]}
            </span>
            <button type="button" onClick={() => addItem(pillar)}
              className="flex items-center gap-1 text-xs text-cropguard-forest font-semibold hover:underline">
              <Plus className="w-3.5 h-3.5" />Add Item
            </button>
          </div>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {(pillarItems[pillar] ?? []).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-white">
                <div className="flex-1 space-y-1.5">
                  <Input value={item.label ?? ''} onChange={e => updateItem(pillar, idx, 'label', e.target.value)}
                    placeholder="Item label" className="text-xs h-8" />
                  <Input value={item.guidance ?? ''} onChange={e => updateItem(pillar, idx, 'guidance', e.target.value)}
                    placeholder="Scoring guidance" className="text-xs h-8" />
                </div>
                <Input type="number" value={item.max ?? 0} onChange={e => updateItem(pillar, idx, 'max', parseInt(e.target.value) || 0)}
                  className="text-xs h-8 w-16 shrink-0" />
                <button type="button" onClick={() => removeItem(pillar, idx)}
                  className="p-1.5 hover:bg-red-50 rounded-lg shrink-0 mt-1">
                  <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                </button>
              </div>
            ))}
            {(pillarItems[pillar] ?? []).length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">No items. Click "Add Item" to start.</div>
            )}
          </div>
        </div>
      ))}

      {includeEci && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
              ECI Section (Optional)
            </span>
            <button type="button" onClick={() => addItem('eci')}
              className="flex items-center gap-1 text-xs text-cropguard-forest font-semibold hover:underline">
              <Plus className="w-3.5 h-3.5" />Add ECI Item
            </button>
          </div>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {eciItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-white">
                <div className="flex-1 space-y-1.5">
                  <Input value={item.label ?? ''} onChange={e => updateItem('eci', idx, 'label', e.target.value)}
                    placeholder="ECI item label" className="text-xs h-8" />
                  <Input value={item.guidance ?? ''} onChange={e => updateItem('eci', idx, 'guidance', e.target.value)}
                    placeholder="Scoring guidance" className="text-xs h-8" />
                </div>
                <Input type="number" value={item.max ?? 0} onChange={e => updateItem('eci', idx, 'max', parseInt(e.target.value) || 0)}
                  className="text-xs h-8 w-16 shrink-0" />
                <button type="button" onClick={() => removeItem('eci', idx)}
                  className="p-1.5 hover:bg-red-50 rounded-lg shrink-0 mt-1">
                  <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                </button>
              </div>
            ))}
            {eciItems.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">No ECI items. Click "Add ECI Item" to start.</div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave({
          id: initial?.id,
          title,
          description,
          crop_type: cropType,
          p1_items: pillarItems.p1,
          p2_items: pillarItems.p2,
          p3_items: pillarItems.p3,
          p4_items: pillarItems.p4,
          include_eci: includeEci,
          eci_items: eciItems,
          is_active: initial?.is_active ?? true,
        })} disabled={saving || !title.trim()} size="sm"
          className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
          <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save Template'}
        </Button>
        <Button onClick={onCancel} disabled={saving} variant="outline" size="sm">Cancel</Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: WEEKLY CHECK-IN TEMPLATES
   ═══════════════════════════════════════════════════════════════ */
function TemplateWeeks({
  tplId, tplItems, onAddItem, onUpdateItem, onDeleteItem,
}: {
  tplId: string;
  tplItems: CheckinTemplateItem[];
  onAddItem: (tplId: string, weekNumber: number, component: string) => void;
  onUpdateItem: (tplId: string, itemId: string, updates: Partial<CheckinTemplateItem>) => void;
  onDeleteItem: (tplId: string, itemId: string) => void;
}) {
  const weekNums = Array.from(new Set(tplItems.map(it => it.week_number))).sort((a, b) => a - b);
  const weeks = weekNums.length ? weekNums : [1];
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([weeks[0]]));

  const toggleWeek = (w: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w); else next.add(w);
      return next;
    });
  };

  const addWeek = () => {
    const nextW = (weeks[weeks.length - 1] ?? 0) + 1;
    onAddItem(tplId, nextW, 'agronomy');
    setExpandedWeeks(prev => new Set(prev).add(nextW));
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50/50">
      <div className="px-4 py-2 border-b border-gray-100 bg-amber-50/50 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Weeks:</span>
        {weeks.map(w => (
          <span key={w} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Week {w}</span>
        ))}
        <button onClick={addWeek} className="flex items-center gap-1 text-[10px] text-cropguard-forest font-semibold hover:underline ml-auto">
          <Plus className="w-3 h-3" />Add week
        </button>
      </div>
      {weeks.map(weekNum => {
        const weekItems = tplItems.filter(it => it.week_number === weekNum);
        const isWeekExpanded = expandedWeeks.has(weekNum);
        return (
          <div key={weekNum} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => toggleWeek(weekNum)}
              className="w-full px-4 py-2 flex items-center justify-between bg-amber-50/30 hover:bg-amber-50/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                {isWeekExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                  : <ChevronRight className="w-3.5 h-3.5 text-amber-700" />}
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Week {weekNum}</span>
                <span className="text-[10px] text-gray-500">{weekItems[0]?.week_title ?? ''}</span>
                <span className="text-[10px] text-gray-400">({weekItems.length} items)</span>
              </span>
            </button>
            {isWeekExpanded && (
              <>
                {COMPONENTS.map(comp => {
                  const compItems = weekItems.filter(it => it.component === comp);
                  const meta = COMPONENT_META[comp];
                  return (
                    <div key={comp}>
                      <div className={cn('px-4 py-1 flex items-center justify-between', meta.bg)}>
                        <span className={cn('text-[10px] font-bold uppercase tracking-wide', meta.color)}>{meta.label}</span>
                        <button
                          onClick={() => onAddItem(tplId, weekNum, comp)}
                          className="flex items-center gap-1 text-[10px] text-cropguard-forest font-semibold hover:underline"
                        >
                          <Plus className="w-3 h-3" />Add item
                        </button>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {compItems.map(it => (
                          <div key={it.id} className="flex items-start gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0 space-y-1">
                              <Input value={it.label} onChange={e => onUpdateItem(tplId, it.id, { label: e.target.value })}
                                className="text-xs h-7" />
                              <Input value={it.description} onChange={e => onUpdateItem(tplId, it.id, { description: e.target.value })}
                                placeholder="Description" className="text-xs h-7" />
                            </div>
                            <button onClick={() => onUpdateItem(tplId, it.id, { is_active: !it.is_active })}
                              className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0 mt-1',
                                it.is_active ? 'bg-emerald-500' : 'bg-gray-300')}>
                              <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                                it.is_active ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                            </button>
                            <button onClick={() => onDeleteItem(tplId, it.id)}
                              className="p-1 hover:bg-red-50 rounded shrink-0 mt-1">
                              <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                            </button>
                          </div>
                        ))}
                        {compItems.length === 0 && (
                          <div className="px-4 py-2 text-[10px] text-gray-400">No items for this component.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckinTemplatesSection() {
  const profile = useAuthStore(s => s.profile);
  const [templates, setTemplates] = useState<CheckinTemplate[]>([]);
  const [items, setItems] = useState<Record<string, CheckinTemplateItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingTpl, setEditingTpl] = useState<CheckinTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data, error } = await supabase
      .from('checkin_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false });
    if (error) { addToast('Failed to load check-in templates', 'error'); setLoading(false); return; }
    const tpls = (data ?? []) as CheckinTemplate[];
    setTemplates(tpls);
    // Load items for each template
    if (tpls.length > 0) {
      const { data: allItems } = await supabase
        .from('checkin_template_items')
        .select('*')
        .in('checkin_template_id', tpls.map(t => t.id))
        .order('sort_order');
      const itemMap: Record<string, CheckinTemplateItem[]> = {};
      (allItems ?? []).forEach((it: any) => {
        if (!itemMap[it.checkin_template_id]) itemMap[it.checkin_template_id] = [];
        itemMap[it.checkin_template_id].push(it);
      });
      setItems(itemMap);
    }
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (tpl: Partial<CheckinTemplate> & { title: string }) => {
    if (!profile?.organisation_id) return;
    setSaving(true);
    if (tpl.id) {
      const { error } = await supabase.from('checkin_templates').update({
        title: tpl.title,
        crop_type: tpl.crop_type ?? 'maize',
        season: tpl.season ?? '',
        description: tpl.description ?? '',
        is_active: tpl.is_active ?? true,
      }).eq('id', tpl.id);
      if (error) { addToast('Failed to update template', 'error'); setSaving(false); return; }
      addToast('Check-in template updated');
    } else {
      const { data, error } = await supabase.from('checkin_templates').insert({
        organisation_id: profile.organisation_id,
        title: tpl.title,
        crop_type: tpl.crop_type ?? 'maize',
        season: tpl.season ?? '',
        description: tpl.description ?? '',
        is_active: true,
      }).select().single();
      if (error) { addToast('Failed to create template', 'error'); setSaving(false); return; }
      addToast('Check-in template created');
    }
    setSaving(false);
    setCreating(false);
    setEditingTpl(null);
    await load();
  };

  const handleDuplicate = async (tpl: CheckinTemplate) => {
    if (!profile?.organisation_id) return;
    const { data: newTpl, error } = await supabase.from('checkin_templates').insert({
      organisation_id: profile.organisation_id,
      title: `${tpl.title} (Copy)`,
      crop_type: tpl.crop_type,
      season: tpl.season,
      description: tpl.description,
      is_active: true,
      source_template_id: tpl.id,
    }).select().single();
    if (error) { addToast('Failed to duplicate template', 'error'); return; }

    // Copy items
    const sourceItems = items[tpl.id] ?? [];
    if (sourceItems.length > 0) {
      const { error: itemErr } = await supabase.from('checkin_template_items').insert(
        sourceItems.map(it => ({
          checkin_template_id: newTpl.id,
          week_number: it.week_number ?? 1,
          component: it.component,
          activity_code: it.activity_code,
          label: it.label,
          description: it.description,
          sort_order: it.sort_order,
          is_active: it.is_active,
        }))
      );
      if (itemErr) { addToast('Template duplicated, items failed', 'error'); }
    }
    addToast('Template duplicated');
    await load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('checkin_templates').delete().eq('id', id);
    if (error) { addToast('Failed to delete', 'error'); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
    addToast('Template deleted');
  };

  const handleAddItem = async (tplId: string, weekNumber: number, component: string) => {
    const tplItems = (items[tplId] ?? []).filter(it => it.week_number === weekNumber && it.component === component);
    const maxOrder = tplItems.reduce((m, it) => Math.max(m, it.sort_order), -1);
    const { data, error } = await supabase.from('checkin_template_items').insert({
      checkin_template_id: tplId,
      week_number: weekNumber,
      component,
      activity_code: `act_${Date.now()}`,
      label: 'New activity',
      description: '',
      sort_order: maxOrder + 1,
      is_active: true,
    }).select().single();
    if (error) { addToast('Failed to add item', 'error'); return; }
    setItems(prev => ({ ...prev, [tplId]: [...(prev[tplId] ?? []), data as CheckinTemplateItem] }));
  };

  const handleUpdateItem = async (tplId: string, itemId: string, updates: Partial<CheckinTemplateItem>) => {
    const { error } = await supabase.from('checkin_template_items').update(updates).eq('id', itemId);
    if (error) { addToast('Failed to update item', 'error'); return; }
    setItems(prev => ({
      ...prev,
      [tplId]: (prev[tplId] ?? []).map(it => it.id === itemId ? { ...it, ...updates } : it),
    }));
  };

  const handleDeleteItem = async (tplId: string, itemId: string) => {
    const { error } = await supabase.from('checkin_template_items').delete().eq('id', itemId);
    if (error) { addToast('Failed to delete item', 'error'); return; }
    setItems(prev => ({
      ...prev,
      [tplId]: (prev[tplId] ?? []).filter(it => it.id !== itemId),
    }));
  };

  if (creating || editingTpl) {
    return <CheckinTemplateForm
      initial={editingTpl}
      onSave={handleSave}
      onCancel={() => { setCreating(false); setEditingTpl(null); }}
      saving={saving}
    />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Create weekly check-in templates by crop, season, and week. Duplicate existing templates to save time.</p>
        <Button onClick={() => setCreating(true)} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
          <Plus className="w-3.5 h-3.5" />New Template
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No check-in templates yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {templates.map(tpl => {
            const tplItems = items[tpl.id] ?? [];
            const isExpanded = expandedId === tpl.id;
            return (
              <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-4 p-4">
                  <button onClick={() => setExpandedId(isExpanded ? null : tpl.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-cropguard-forest">{tpl.title}</h4>
                      <Badge className="text-xs border-0 bg-blue-100 text-blue-800">{tpl.crop_type}</Badge>
                      {tpl.season && <Badge className="text-xs border-0 bg-emerald-100 text-emerald-800">{tpl.season}</Badge>}
                      {tpl.source_template_id && <Badge className="text-xs border-0 bg-gray-100 text-gray-500">Duplicated</Badge>}
                      {!tpl.is_active && <Badge className="text-xs border-0 bg-gray-100 text-gray-500">Inactive</Badge>}
                      <Badge className="text-xs border-0 bg-amber-100 text-amber-800">{new Set(tplItems.map(it => it.week_number)).size} weeks</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{tpl.description || 'No description'} · {tplItems.length} items · Weeks {Math.min(...(tplItems.length ? tplItems.map(it => it.week_number) : [1]))}–{Math.max(...(tplItems.length ? tplItems.map(it => it.week_number) : [1]))}</p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleDuplicate(tpl)} title="Duplicate" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => setEditingTpl(tpl)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => handleDelete(tpl.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && <TemplateWeeks tplId={tpl.id} tplItems={tplItems} onAddItem={handleAddItem} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} />}
              </div>
            );
          })}
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

function CheckinTemplateForm({
  initial, onSave, onCancel, saving,
}: {
  initial: CheckinTemplate | null;
  onSave: (tpl: Partial<CheckinTemplate> & { title: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [cropType, setCropType] = useState(initial?.crop_type ?? 'maize');
  const [season, setSeason] = useState(initial?.season ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-cropguard-forest">{initial ? 'Edit Check-in Template' : 'New Check-in Template'}</h3>
        <Button onClick={onCancel} variant="outline" size="sm"><X className="w-3.5 h-3.5 mr-1.5" />Cancel</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Maize Full Season Check-in" className="text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Crop</label>
            <select value={cropType} onChange={e => setCropType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full">
              <option value="maize">Maize</option>
              <option value="soybean">Soybean</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Season</label>
            <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2026A" className="text-sm" />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-700">
          This template covers all weeks of the season. Add items per week in the template editor after saving.
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onSave({
          id: initial?.id,
          title,
          crop_type: cropType,
          season,
          description,
          is_active: initial?.is_active ?? true,
        })} disabled={saving || !title.trim()} size="sm"
          className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
          <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save Template'}
        </Button>
        <Button onClick={onCancel} disabled={saving} variant="outline" size="sm">Cancel</Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: COHORT SCHEDULES
   ═══════════════════════════════════════════════════════════════ */
function CohortSchedulesSection() {
  const profile = useAuthStore(s => s.profile);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [baselines, setBaselines] = useState<BaselineTemplate[]>([]);
  const [checkinTpls, setCheckinTpls] = useState<CheckinTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingCohort | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingPauseId, setTogglingPauseId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCohort, setNewCohort] = useState({
    program_id: '',
    cohort_id: '',
    checkin_start_date: '',
    checkin_window_days: 7,
    checkin_grace_days: 2,
    total_weeks: 12,
    start_mode: 'scheduled' as 'scheduled' | 'immediate',
    baseline_template_id: '',
    checkin_template_id: '',
  });
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const [progRes, cohRes, btRes, ctRes] = await Promise.all([
      supabase.from('programs').select('id, name').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('cohorts')
        .select('id, name, program_id, checkin_start_date, checkin_window_days, checkin_grace_days, total_weeks, start_mode, baseline_template_id, checkin_template_id, schedule_paused, paused_at, programs!inner(organisation_id)')
        .eq('programs.organisation_id', profile.organisation_id).order('name'),
      supabase.from('baseline_templates').select('id, title').eq('organisation_id', profile.organisation_id).eq('is_active', true),
      supabase.from('checkin_templates').select('id, title').eq('organisation_id', profile.organisation_id).eq('is_active', true),
    ]);
    const cohortRows = ((cohRes.data ?? []) as any[]).map(c => ({
      id: c.id, name: c.name, program_id: c.program_id, checkin_start_date: c.checkin_start_date,
      checkin_window_days: c.checkin_window_days, checkin_grace_days: c.checkin_grace_days,
      total_weeks: c.total_weeks ?? 12, start_mode: c.start_mode, baseline_template_id: c.baseline_template_id,
      checkin_template_id: c.checkin_template_id, schedule_paused: c.schedule_paused, paused_at: c.paused_at,
    })) as CohortRow[];
    if (cohRes.error) { addToast('Failed to load cohorts', 'error'); }
    setPrograms((progRes.data ?? []) as any[]);
    setCohorts(cohortRows);
    setBaselines((btRes.data ?? []) as BaselineTemplate[]);
    setCheckinTpls((ctRes.data ?? []) as CheckinTemplate[]);
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const filteredCohorts = selectedProgram
    ? cohorts.filter(c => c.program_id === selectedProgram)
    : cohorts;

  const handleCreate = async () => {
    if (!newCohort.program_id) { addToast('Select a program', 'error'); return; }
    if (!newCohort.cohort_id) { addToast('Select a cohort', 'error'); return; }
    if (newCohort.start_mode === 'scheduled' && !newCohort.checkin_start_date) {
      addToast('Please select a start date', 'error'); return;
    }
    setCreating(true);
    const startDate = newCohort.start_mode === 'immediate'
      ? new Date().toISOString().split('T')[0]
      : newCohort.checkin_start_date;
    const { data, error } = await supabase.from('cohorts').update({
      checkin_start_date: startDate || null,
      checkin_window_days: newCohort.checkin_window_days || 7,
      checkin_grace_days: newCohort.checkin_grace_days || 2,
      total_weeks: newCohort.total_weeks || 12,
      start_mode: newCohort.start_mode,
      baseline_template_id: newCohort.baseline_template_id || null,
      checkin_template_id: newCohort.checkin_template_id || null,
    }).eq('id', newCohort.cohort_id).select().single();
    setCreating(false);
    if (error || !data) { addToast('Failed to apply schedule', 'error'); return; }
    setCohorts(prev => {
      const exists = prev.some(c => c.id === data.id);
      const updated: CohortRow = {
        id: data.id, name: data.name, program_id: data.program_id,
        checkin_start_date: data.checkin_start_date, checkin_window_days: data.checkin_window_days,
        checkin_grace_days: data.checkin_grace_days, total_weeks: data.total_weeks ?? 12,
        start_mode: data.start_mode, baseline_template_id: data.baseline_template_id,
        checkin_template_id: data.checkin_template_id, schedule_paused: data.schedule_paused ?? false,
        paused_at: data.paused_at ?? null,
      };
      return exists ? prev.map(c => c.id === data.id ? updated : c) : [...prev, updated];
    });
    setNewCohort({
      program_id: '', cohort_id: '',
      checkin_start_date: '', checkin_window_days: 7, checkin_grace_days: 2, total_weeks: 12,
      start_mode: 'scheduled', baseline_template_id: '', checkin_template_id: '',
    });
    setShowCreate(false);
    addToast('Schedule applied to cohort');
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.start_mode === 'scheduled' && !editing.start_date) {
      addToast('Please select a start date for scheduled start', 'error');
      return;
    }
    setSavingId(editing.id);
    const startDate = editing.start_mode === 'immediate'
      ? new Date().toISOString().split('T')[0]
      : editing.start_date;
    const { error } = await supabase.from('cohorts').update({
      checkin_start_date: startDate,
      checkin_window_days: editing.window_days,
      checkin_grace_days: editing.grace_days,
      total_weeks: editing.total_weeks,
      start_mode: editing.start_mode,
      baseline_template_id: editing.baseline_template_id || null,
      checkin_template_id: editing.checkin_template_id || null,
    }).eq('id', editing.id);
    setSavingId(null);
    if (error) { addToast('Failed to save schedule', 'error'); return; }
    setCohorts(prev => prev.map(c => c.id === editing.id
      ? { ...c, checkin_start_date: startDate, checkin_window_days: editing.window_days,
          checkin_grace_days: editing.grace_days, total_weeks: editing.total_weeks,
          start_mode: editing.start_mode, baseline_template_id: editing.baseline_template_id || null,
          checkin_template_id: editing.checkin_template_id || null }
      : c));
    addToast('Schedule saved');
    setEditing(null);
  };

  const togglePause = async (cohort: CohortRow) => {
    setTogglingPauseId(cohort.id);
    const newPaused = !cohort.schedule_paused;
    const { error } = await supabase.from('cohorts').update({
      schedule_paused: newPaused,
      paused_at: newPaused ? new Date().toISOString() : null,
    }).eq('id', cohort.id);
    setTogglingPauseId(null);
    if (error) { addToast('Failed to toggle pause', 'error'); return; }
    setCohorts(prev => prev.map(c => c.id === cohort.id
      ? { ...c, schedule_paused: newPaused, paused_at: newPaused ? new Date().toISOString() : null }
      : c));
    addToast(newPaused ? 'Cohort schedule paused' : 'Cohort schedule resumed');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure when each cohort starts check-ins, link baseline and weekly check-in templates, and pause/resume schedules.</p>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No programs found for your organisation.</div>
      ) : (
        <>
          {/* Program filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Filter by Program</label>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
              <button type="button"
                onClick={() => setSelectedProgram(null)}
                className={cn('px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                  !selectedProgram ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
                All
              </button>
              {programs.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setSelectedProgram(p.id)}
                  className={cn('px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                    selectedProgram === p.id ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Create new cohort button / form */}
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-cropguard-forest hover:underline">
              <Plus className="w-4 h-4" />Create new cohort schedule
            </button>
          ) : (
            <div className="bg-white border-2 border-cropguard-mint rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-cropguard-forest">New Cohort Schedule</h4>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Program</label>
                  <select value={newCohort.program_id}
                    onChange={e => setNewCohort({ ...newCohort, program_id: e.target.value, cohort_id: '' })}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full">
                    <option value="">— Select program —</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cohort</label>
                  <select value={newCohort.cohort_id}
                    onChange={e => setNewCohort({ ...newCohort, cohort_id: e.target.value })}
                    disabled={!newCohort.program_id}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full disabled:opacity-50">
                    <option value="">— Select cohort —</option>
                    {cohorts.filter(c => c.program_id === newCohort.program_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Mode</label>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => setNewCohort({ ...newCohort, start_mode: 'immediate' })}
                      className={cn('flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors',
                        newCohort.start_mode === 'immediate'
                          ? 'border-cropguard-forest bg-cropguard-mint text-cropguard-forest'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                      <Clock className="w-3.5 h-3.5 inline mr-1" />Immediate
                    </button>
                    <button type="button"
                      onClick={() => setNewCohort({ ...newCohort, start_mode: 'scheduled' })}
                      className={cn('flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors',
                        newCohort.start_mode === 'scheduled'
                          ? 'border-cropguard-forest bg-cropguard-mint text-cropguard-forest'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />Scheduled
                    </button>
                  </div>
                </div>
                {newCohort.start_mode === 'scheduled' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Start Date</label>
                    <Input type="date" value={newCohort.checkin_start_date}
                      onChange={e => setNewCohort({ ...newCohort, checkin_start_date: e.target.value })} className="text-sm" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Window (days)</label>
                  <Input type="number" min="1" max="14" value={newCohort.checkin_window_days}
                    onChange={e => setNewCohort({ ...newCohort, checkin_window_days: parseInt(e.target.value) || 7 })} className="text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grace period (days)</label>
                  <Input type="number" min="0" max="7" value={newCohort.checkin_grace_days}
                    onChange={e => setNewCohort({ ...newCohort, checkin_grace_days: parseInt(e.target.value) || 2 })} className="text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Number of Weeks</label>
                  <Input type="number" min="1" max="52" value={newCohort.total_weeks}
                    onChange={e => setNewCohort({ ...newCohort, total_weeks: parseInt(e.target.value) || 12 })} className="text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Baseline Template</label>
                  <select value={newCohort.baseline_template_id}
                    onChange={e => setNewCohort({ ...newCohort, baseline_template_id: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full">
                    <option value="">— None —</option>
                    {baselines.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Template</label>
                  <select value={newCohort.checkin_template_id}
                    onChange={e => setNewCohort({ ...newCohort, checkin_template_id: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full">
                    <option value="">— None —</option>
                    {checkinTpls.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleCreate} disabled={creating} size="sm"
                  className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
                  <Save className="w-3.5 h-3.5 mr-1.5" />{creating ? 'Creating…' : 'Create cohort'}
                </Button>
                <Button onClick={() => setShowCreate(false)} disabled={creating} variant="outline" size="sm">
                  <X className="w-3.5 h-3.5 mr-1.5" />Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Cohort list */}
          {filteredCohorts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              {selectedProgram ? 'No cohorts in this program.' : 'No cohorts found for your organisation.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCohorts.map(cohort => {
                const isEditing = editing?.id === cohort.id;
                const linkedBaseline = baselines.find(b => b.id === cohort.baseline_template_id);
                const linkedCheckin = checkinTpls.find(c => c.id === cohort.checkin_template_id);
                return (
                  <div key={cohort.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    {!isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-cropguard-forest">{cohort.name}</h4>
                              {!cohort.checkin_start_date
                                ? <Badge className="text-xs border-0 bg-amber-100 text-amber-800">Not configured</Badge>
                                : <Badge className="text-xs border-0 bg-emerald-100 text-emerald-800">Configured</Badge>
                              }
                              {cohort.schedule_paused && <Badge className="text-xs border-0 bg-red-100 text-red-800">Paused</Badge>}
                              <Badge className="text-xs border-0 bg-gray-100 text-gray-600 capitalize">{cohort.start_mode}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {cohort.checkin_start_date
                                ? `Starts ${new Date(cohort.checkin_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${cohort.checkin_window_days}-day window · ${cohort.checkin_grace_days}-day grace · ${cohort.total_weeks} weeks`
                                : 'No schedule set — farmers cannot check in until configured.'}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{linkedBaseline?.title ?? 'No baseline'}</span>
                              <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" />{linkedCheckin?.title ?? 'No check-in template'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => togglePause(cohort)} disabled={togglingPauseId === cohort.id}
                              title={cohort.schedule_paused ? 'Resume schedule' : 'Pause schedule'}
                              className={cn('p-2 rounded-lg transition-colors',
                                cohort.schedule_paused ? 'hover:bg-emerald-50 text-red-400 hover:text-emerald-600' : 'hover:bg-red-50 text-gray-400 hover:text-red-500')}>
                              {cohort.schedule_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setEditing({
                              id: cohort.id,
                              start_date: cohort.checkin_start_date?.split('T')[0] ?? '',
                              window_days: cohort.checkin_window_days || 7,
                              grace_days: cohort.checkin_grace_days || 2,
                              total_weeks: cohort.total_weeks || 12,
                              start_mode: cohort.start_mode ?? 'scheduled',
                              baseline_template_id: cohort.baseline_template_id ?? '',
                              checkin_template_id: cohort.checkin_template_id ?? '',
                            })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-cropguard-forest">{cohort.name}</p>

                        {/* Start mode */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Mode</label>
                          <div className="flex gap-2">
                            <button type="button"
                              onClick={() => setEditing({ ...editing, start_mode: 'immediate' })}
                              className={cn('flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors',
                                editing.start_mode === 'immediate'
                                  ? 'border-cropguard-forest bg-cropguard-mint text-cropguard-forest'
                                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                              <Clock className="w-3.5 h-3.5 inline mr-1.5" />Immediate
                            </button>
                            <button type="button"
                              onClick={() => setEditing({ ...editing, start_mode: 'scheduled' })}
                              className={cn('flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors',
                                editing.start_mode === 'scheduled'
                                  ? 'border-cropguard-forest bg-cropguard-mint text-cropguard-forest'
                                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                              <Calendar className="w-3.5 h-3.5 inline mr-1.5" />Scheduled
                            </button>
                          </div>
                        </div>

                        {/* Start date (only for scheduled) */}
                        {editing.start_mode === 'scheduled' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Start Date</label>
                            <Input type="date" value={editing.start_date}
                              onChange={e => setEditing({ ...editing, start_date: e.target.value })} className="text-sm" />
                          </div>
                        )}

                        {/* Window, grace & weeks */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Window (days)</label>
                            <Input type="number" min="1" max="14" value={editing.window_days}
                              onChange={e => setEditing({ ...editing, window_days: parseInt(e.target.value) || 7 })} className="text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Grace (days)</label>
                            <Input type="number" min="0" max="7" value={editing.grace_days}
                              onChange={e => setEditing({ ...editing, grace_days: parseInt(e.target.value) || 0 })} className="text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Weeks</label>
                            <Input type="number" min="1" max="52" value={editing.total_weeks}
                              onChange={e => setEditing({ ...editing, total_weeks: parseInt(e.target.value) || 12 })} className="text-sm" />
                          </div>
                        </div>

                        {/* Link templates */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Baseline Template</label>
                            <select value={editing.baseline_template_id}
                              onChange={e => setEditing({ ...editing, baseline_template_id: e.target.value })}
                              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full">
                              <option value="">— None —</option>
                              {baselines.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Template</label>
                            <select value={editing.checkin_template_id}
                              onChange={e => setEditing({ ...editing, checkin_template_id: e.target.value })}
                              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full">
                              <option value="">— None —</option>
                              {checkinTpls.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button onClick={saveEdit} disabled={savingId !== null} size="sm"
                            className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
                            <Save className="w-3.5 h-3.5 mr-1.5" />{savingId ? 'Saving…' : 'Save'}
                          </Button>
                          <Button onClick={() => setEditing(null)} disabled={savingId !== null} variant="outline" size="sm">
                            <X className="w-3.5 h-3.5 mr-1.5" />Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 4: FARMER OVERRIDES (per-farmer pause)
   ═══════════════════════════════════════════════════════════════ */
function FarmerOverridesSection() {
  const profile = useAuthStore(s => s.profile);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string; name: string; program_id: string; schedule_paused: boolean }[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string; phone: string; community: string }[]>([]);
  const [overrides, setOverrides] = useState<CohortFarmerOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const [progRes, cohRes] = await Promise.all([
      supabase.from('programs').select('id, name').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('cohorts')
        .select('id, name, program_id, schedule_paused, programs!inner(organisation_id)')
        .eq('programs.organisation_id', profile.organisation_id).order('name'),
    ]);
    if (progRes.error || cohRes.error) { addToast('Failed to load data', 'error'); setLoading(false); return; }
    setPrograms((progRes.data ?? []) as any[]);
    setCohorts(((cohRes.data ?? []) as any[]).map(c => ({
      id: c.id, name: c.name, program_id: c.program_id, schedule_paused: c.schedule_paused,
    })));
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const filteredCohorts = selectedProgram
    ? cohorts.filter(c => c.program_id === selectedProgram)
    : [];

  const loadCohortFarmers = useCallback(async (cohortId: string) => {
    setLoadingFarmers(true);
    const { data: enrs } = await supabase
      .from('enrollments')
      .select('farmer_id')
      .eq('cohort_id', cohortId)
      .eq('status', 'active');
    const farmerIds = (enrs ?? []).map((e: any) => e.farmer_id);
    if (farmerIds.length === 0) { setFarmers([]); setOverrides([]); setLoadingFarmers(false); return; }

    const [farmersRes, overridesRes] = await Promise.all([
      supabase.from('farmers').select('id, full_name, phone, community').in('id', farmerIds).order('full_name'),
      supabase.from('cohort_farmer_overrides').select('*').eq('cohort_id', cohortId),
    ]);
    setFarmers((farmersRes.data ?? []) as any[]);
    setOverrides((overridesRes.data ?? []) as CohortFarmerOverride[]);
    setLoadingFarmers(false);
  }, []);

  useEffect(() => {
    setSelectedCohort(null);
    setFarmers([]);
    setOverrides([]);
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedCohort) loadCohortFarmers(selectedCohort);
  }, [selectedCohort, loadCohortFarmers]);

  const togglePause = async (farmerId: string) => {
    if (!selectedCohort) return;
    setTogglingId(farmerId);
    const existing = overrides.find(o => o.farmer_id === farmerId);
    if (existing) {
      const newPaused = !existing.is_paused;
      const { error } = await supabase.from('cohort_farmer_overrides').update({
        is_paused: newPaused,
        paused_at: newPaused ? new Date().toISOString() : null,
      }).eq('id', existing.id);
      if (error) { addToast('Failed to update override', 'error'); setTogglingId(null); return; }
      setOverrides(prev => prev.map(o => o.id === existing.id
        ? { ...o, is_paused: newPaused, paused_at: newPaused ? new Date().toISOString() : null }
        : o));
      addToast(newPaused ? 'Farmer check-ins paused' : 'Farmer check-ins resumed');
    } else {
      const { data, error } = await supabase.from('cohort_farmer_overrides').insert({
        cohort_id: selectedCohort,
        farmer_id: farmerId,
        is_paused: true,
        paused_at: new Date().toISOString(),
      }).select().single();
      if (error) { addToast('Failed to pause farmer', 'error'); setTogglingId(null); return; }
      setOverrides(prev => [...prev, data as CohortFarmerOverride]);
      addToast('Farmer check-ins paused');
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Pause check-in schedules for individual farmers within a cohort without affecting the rest of the cohort.</p>

      {loading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : programs.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No programs found for your organisation.</div>
      ) : (
        <>
          {/* Step 1: Program filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">1. Select Program</label>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
              {programs.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setSelectedProgram(p.id)}
                  className={cn('px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                    selectedProgram === p.id ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Cohort filter */}
          {selectedProgram && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">2. Select Cohort</label>
              {filteredCohorts.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">No cohorts in this program.</div>
              ) : (
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
                  {filteredCohorts.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setSelectedCohort(c.id)}
                      className={cn('px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                        selectedCohort === c.id ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
                      {c.name}
                      {c.schedule_paused && <span className="ml-1.5 text-red-500">●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Farmers */}
          {selectedProgram && !selectedCohort ? (
            <div className="text-center py-12 text-sm text-gray-400">Select a cohort to manage farmer overrides.</div>
          ) : selectedCohort && loadingFarmers ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : selectedCohort && farmers.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No active farmers in this cohort.</div>
          ) : selectedCohort && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">3. Farmers</label>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {farmers.map(f => {
                  const override = overrides.find(o => o.farmer_id === f.id);
                  const isPaused = override?.is_paused ?? false;
                  return (
                    <div key={f.id} className="flex items-center gap-3 p-3.5 bg-white hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
                        <span className="text-cropguard-dark font-bold text-xs">{f.full_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cropguard-forest truncate">{f.full_name}</p>
                        <p className="text-[10px] text-gray-400">{f.community || 'No community'} · {f.phone}</p>
                      </div>
                      {isPaused && <Badge className="text-xs border-0 bg-red-100 text-red-800">Paused</Badge>}
                      <button onClick={() => togglePause(f.id)} disabled={togglingId === f.id}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0',
                          isPaused
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 hover:bg-red-100')}>
                        {isPaused ? <><Play className="w-3.5 h-3.5" />Resume</> : <><Pause className="w-3.5 h-3.5" />Pause</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function CheckinConfigPage() {
  const [activeSection, setActiveSection] = useState<Section>('baselines');
  const active = SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cropguard-mint flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-cropguard-forest" />
          </div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Check-in Configuration</h1>
        </div>
        <p className="text-sm text-cropguard-slate mt-1 ml-10">
          Configure baseline templates, weekly check-in templates, cohort schedules, and farmer overrides
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left rail */}
        <aside className="w-56 shrink-0 space-y-1">
          {SECTIONS.map(({ key, icon: Icon, label, desc }) => (
            <button key={key} type="button" onClick={() => setActiveSection(key)}
              className={cn(
                'w-full text-left rounded-xl px-3 py-3 transition-colors group',
                activeSection === key ? 'bg-cropguard-forest text-white' : 'hover:bg-gray-100 text-gray-600',
              )}>
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-4 h-4 shrink-0',
                  activeSection === key ? 'text-cropguard-light' : 'text-gray-400 group-hover:text-gray-600')} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold leading-tight',
                    activeSection === key ? 'text-white' : 'text-gray-700')}>{label}</p>
                  <p className={cn('text-[10px] mt-0.5 leading-snug',
                    activeSection === key ? 'text-cropguard-pale' : 'text-gray-400')}>{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
            <active.icon className="w-5 h-5 text-cropguard-forest" />
            <h2 className="text-base font-bold text-cropguard-forest">{active.label}</h2>
          </div>

          {activeSection === 'baselines' && <BaselineTemplatesSection />}
          {activeSection === 'checkins'  && <CheckinTemplatesSection />}
          {activeSection === 'schedules' && <CohortSchedulesSection />}
          {activeSection === 'overrides' && <FarmerOverridesSection />}
        </div>
      </div>
    </div>
  );
}
