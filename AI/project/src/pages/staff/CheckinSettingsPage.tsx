import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, Edit2, Save, X, Plus, Trash2,
  ChevronDown, ChevronUp, Download, ClipboardCheck,
  Calendar, Layers, CheckSquare,
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
  checkin_start_date: string | null;
  checkin_window_days: number;
  checkin_grace_days: number;
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
};

type Section = 'questions' | 'schedules' | 'baseline';

const SECTIONS: { key: Section; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'questions', icon: ClipboardCheck, label: 'Weekly Questions',    desc: 'Crop-specific check-in questions per week'  },
  { key: 'schedules', icon: Calendar,       label: 'Cohort Schedules',    desc: 'Configure timing windows per cohort'        },
  { key: 'baseline',  icon: Layers,         label: 'Baseline Activities', desc: 'Pillar activities for baseline assessment'  },
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

/* ── Inline Question Form ───────────────────────────────────── */
function InlineQuestionForm({
  initial, onSave, onCancel, saving,
}: {
  initial: { component: CheckinComponent; label: string; description: string; is_active: boolean };
  onSave: (v: typeof initial) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState(initial);
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {COMPONENTS.map(comp => {
          const meta = COMPONENT_META[comp];
          return (
            <button key={comp} type="button" onClick={() => setValues(v => ({ ...v, component: comp }))}
              className={cn('text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors',
                values.component === comp
                  ? `${meta.bg} ${meta.border} ${meta.color} border-2`
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}>
              {meta.label}
            </button>
          );
        })}
      </div>
      <Input value={values.label} onChange={e => setValues(v => ({ ...v, label: e.target.value }))}
        placeholder="Question statement…" className="text-sm" />
      <Input value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))}
        placeholder="Optional hint for agent" className="text-sm" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setValues(v => ({ ...v, is_active: !v.is_active }))}
          className={cn('relative h-5 w-9 rounded-full transition-colors', values.is_active ? 'bg-emerald-500' : 'bg-gray-300')}>
          <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            values.is_active ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
        <span className="text-xs text-gray-500">{values.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(values)} disabled={saving || !values.label.trim()} size="sm"
          className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
          <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} disabled={saving} variant="outline" size="sm">
          <X className="w-3.5 h-3.5 mr-1.5" />Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── Weekly Questions Section ───────────────────────────────── */
function WeeklyQuestionsSection() {
  const profile = useAuthStore(s => s.profile);
  const [questions, setQuestions] = useState<CheckinQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [cropTab, setCropTab] = useState<CropType>('maize');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingWeek, setCreatingWeek] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data, error } = await supabase
      .from('checkin_questions')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .in('crop_type', ['maize', 'soybean'])
      .order('week_number')
      .order('sort_order');
    if (error) { addToast('Failed to load questions', 'error'); setLoading(false); return; }
    setQuestions((data ?? []) as CheckinQuestion[]);
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const hasQuestions = questions.filter(q => q.crop_type === cropTab).length > 0;

  const seedFromTemplates = async () => {
    if (!profile?.organisation_id) return;
    setSeeding(true);
    const toInsert = CHECKIN_TEMPLATES.filter(t => t.crop_type === cropTab).map(t => ({
      organisation_id: profile.organisation_id,
      crop_type: t.crop_type,
      week_number: t.week_number,
      week_title: t.week_title,
      component: t.component,
      label: t.label,
      description: '',
      is_active: true,
      sort_order: t.sort_order,
    }));
    const { error } = await supabase.from('checkin_questions').insert(toInsert);
    if (error) { addToast('Failed to seed questions', 'error'); setSeeding(false); return; }
    addToast(`${toInsert.length} questions loaded for ${CROP_META[cropTab].label}`);
    await load();
    setSeeding(false);
  };

  const toggleWeek = (wk: number) => {
    setExpandedWeeks(prev => {
      const n = new Set(prev);
      n.has(wk) ? n.delete(wk) : n.add(wk);
      return n;
    });
  };

  const toggleActive = async (q: CheckinQuestion) => {
    const { error } = await supabase.from('checkin_questions').update({ is_active: !q.is_active }).eq('id', q.id);
    if (error) { addToast('Failed to update', 'error'); return; }
    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_active: !q.is_active } : item));
  };

  const handleCreate = async (weekNum: number, values: { component: CheckinComponent; label: string; description: string; is_active: boolean }) => {
    if (!profile?.organisation_id || !values.label.trim()) return;
    setSaving(true);
    const existing = questions.filter(q => q.crop_type === cropTab && q.week_number === weekNum && q.component === values.component);
    const maxOrder = existing.reduce((m, q) => Math.max(m, q.sort_order), -1);
    const { data, error } = await supabase.from('checkin_questions').insert({
      organisation_id: profile.organisation_id,
      crop_type: cropTab,
      week_number: weekNum,
      week_title: WEEK_TITLES[cropTab][weekNum],
      component: values.component,
      label: values.label.trim(),
      description: values.description.trim(),
      is_active: values.is_active,
      sort_order: maxOrder + 1,
    }).select().single();
    setSaving(false);
    if (error) { addToast('Failed to create question', 'error'); return; }
    setQuestions(prev => [...prev, data as CheckinQuestion]);
    setCreatingWeek(null);
    addToast('Question created');
  };

  const handleEdit = async (id: string, values: { component: CheckinComponent; label: string; description: string; is_active: boolean }) => {
    setSaving(true);
    const { error } = await supabase.from('checkin_questions').update({
      ...values, label: values.label.trim(), description: values.description.trim(),
    }).eq('id', id);
    setSaving(false);
    if (error) { addToast('Failed to update', 'error'); return; }
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...values } : q));
    setEditingId(null);
    addToast('Question updated');
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('checkin_questions').delete().eq('id', id);
    setDeletingId(null);
    if (error) { addToast('Failed to delete', 'error'); return; }
    setQuestions(prev => prev.filter(q => q.id !== id));
    addToast('Question deleted');
  };

  const cropQuestions = questions.filter(q => q.crop_type === cropTab);
  const weeks = Array.from({ length: CROP_META[cropTab].weeks }, (_, i) => i + 1);

  return (
    <div className="space-y-5">
      {/* Crop tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['maize', 'soybean'] as CropType[]).map(crop => (
          <button key={crop} type="button"
            onClick={() => { setCropTab(crop); setCreatingWeek(null); setEditingId(null); }}
            className={cn('px-5 py-2 text-sm font-semibold rounded-lg transition-colors',
              cropTab === crop ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
            {CROP_META[crop].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {!hasQuestions ? (
            <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">No {CROP_META[cropTab].label} questions configured</p>
                  <p className="text-xs text-amber-700 mt-0.5">Load the standard template or add questions manually week by week.</p>
                </div>
              </div>
              <Button onClick={seedFromTemplates} disabled={seeding} size="sm"
                className="shrink-0 bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
                <Download className="w-3.5 h-3.5" />{seeding ? 'Loading…' : 'Load Template'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-cropguard-forest">{cropQuestions.length}</span> questions ·{' '}
                <span className="font-semibold text-emerald-600">{cropQuestions.filter(q => q.is_active).length}</span> active
              </p>
              <Button onClick={seedFromTemplates} disabled={seeding} variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                <Download className="w-3 h-3" />{seeding ? 'Loading…' : 'Re-seed'}
              </Button>
            </div>
          )}

          {weeks.map(wk => {
            const weekQs = cropQuestions.filter(q => q.week_number === wk);
            const activeCount = weekQs.filter(q => q.is_active).length;
            const isExpanded = expandedWeeks.has(wk);

            return (
              <div key={wk} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button type="button" onClick={() => toggleWeek(wk)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cropguard-mint flex items-center justify-center text-[11px] font-black text-cropguard-dark shrink-0">
                      W{wk}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cropguard-forest">{WEEK_TITLES[cropTab][wk]}</p>
                      <p className="text-[10px] text-gray-400">{weekQs.length} questions · {activeCount} active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {weekQs.length === 0 && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Empty</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {COMPONENTS.map(comp => {
                      const compQs = weekQs.filter(q => q.component === comp);
                      const meta = COMPONENT_META[comp];
                      if (compQs.length === 0 && creatingWeek !== wk) return null;
                      return (
                        <div key={comp}>
                          {compQs.length > 0 && (
                            <div>
                              <div className={cn('px-4 py-1.5 flex items-center gap-2', meta.bg)}>
                                <span className={cn('text-[10px] font-bold uppercase tracking-wide', meta.color)}>{meta.label}</span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {compQs.map(q => (
                                  <div key={q.id}>
                                    {editingId === q.id ? (
                                      <div className="p-4 bg-white">
                                        <InlineQuestionForm
                                          initial={{ component: q.component, label: q.label, description: q.description, is_active: q.is_active }}
                                          onSave={v => handleEdit(q.id, v)}
                                          onCancel={() => setEditingId(null)}
                                          saving={saving}
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                          <p className={cn('text-xs font-medium leading-snug',
                                            q.is_active ? 'text-cropguard-forest' : 'text-gray-400 line-through')}>
                                            {q.label}
                                          </p>
                                          {q.description && <p className="text-[10px] text-gray-400 mt-0.5">{q.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button type="button" onClick={() => toggleActive(q)}
                                            title={q.is_active ? 'Deactivate' : 'Activate'}
                                            className={cn('relative h-5 w-9 rounded-full transition-colors',
                                              q.is_active ? 'bg-emerald-500' : 'bg-gray-300')}>
                                            <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                                              q.is_active ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                                          </button>
                                          <button type="button"
                                            onClick={() => { setEditingId(q.id); setCreatingWeek(null); }}
                                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button type="button"
                                            onClick={() => handleDelete(q.id)} disabled={deletingId === q.id}
                                            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {creatingWeek === wk && (
                      <div className="p-4 bg-white border-t border-gray-100">
                        <InlineQuestionForm
                          initial={{ component: 'agronomy', label: '', description: '', is_active: true }}
                          onSave={v => handleCreate(wk, v)}
                          onCancel={() => setCreatingWeek(null)}
                          saving={saving}
                        />
                      </div>
                    )}

                    <div className="px-4 py-2.5 border-t border-gray-100 bg-white">
                      <button type="button"
                        onClick={() => { setCreatingWeek(wk); setEditingId(null); }}
                        className="flex items-center gap-1.5 text-xs text-cropguard-forest font-semibold hover:underline">
                        <Plus className="w-3.5 h-3.5" />Add question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ── Cohort Schedules Section ───────────────────────────────── */
function CohortSchedulesSection() {
  const profile = useAuthStore(s => s.profile);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingCohort | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data, error } = await supabase.from('cohorts')
      .select('id, name, checkin_start_date, checkin_window_days, checkin_grace_days')
      .eq('organisation_id', profile.organisation_id).order('name');
    if (error) { addToast('Failed to load cohorts', 'error'); setLoading(false); return; }
    setCohorts((data ?? []) as CohortRow[]);
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.start_date) { addToast('Please select a start date', 'error'); return; }
    if (editing.window_days < 1 || editing.window_days > 14) { addToast('Window must be 1–14 days', 'error'); return; }
    if (editing.grace_days < 0 || editing.grace_days > 7) { addToast('Grace must be 0–7 days', 'error'); return; }
    setSavingId(editing.id);
    const { error } = await supabase.from('cohorts').update({
      checkin_start_date: editing.start_date,
      checkin_window_days: editing.window_days,
      checkin_grace_days: editing.grace_days,
    }).eq('id', editing.id);
    setSavingId(null);
    if (error) { addToast('Failed to save', 'error'); return; }
    setCohorts(prev => prev.map(c => c.id === editing.id
      ? { ...c, checkin_start_date: editing.start_date, checkin_window_days: editing.window_days, checkin_grace_days: editing.grace_days }
      : c));
    addToast('Schedule saved');
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Set the check-in start date and timing window for each cohort.</p>
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No cohorts found for your organisation.</div>
      ) : (
        <div className="space-y-3">
          {cohorts.map(cohort => {
            const isEditing = editing?.id === cohort.id;
            return (
              <div key={cohort.id} className="bg-white border border-gray-200 rounded-xl p-4">
                {!isEditing ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-cropguard-forest">{cohort.name}</h4>
                        {!cohort.checkin_start_date
                          ? <Badge className="text-xs border-0 bg-amber-100 text-amber-800">Not configured</Badge>
                          : <Badge className="text-xs border-0 bg-emerald-100 text-emerald-800">Configured</Badge>
                        }
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {cohort.checkin_start_date
                          ? `Starts ${new Date(cohort.checkin_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${cohort.checkin_window_days}-day window · ${cohort.checkin_grace_days}-day grace`
                          : 'No schedule set — farmers cannot check in until configured.'}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => setEditing({ id: cohort.id, start_date: cohort.checkin_start_date?.split('T')[0] ?? '', window_days: cohort.checkin_window_days || 7, grace_days: cohort.checkin_grace_days || 2 })}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-cropguard-forest">{cohort.name}</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Start Date</label>
                      <Input type="date" value={editing.start_date}
                        onChange={e => setEditing({ ...editing, start_date: e.target.value })} className="text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Window (days)</label>
                        <Input type="number" min="1" max="14" value={editing.window_days}
                          onChange={e => setEditing({ ...editing, window_days: parseInt(e.target.value) || 7 })} className="text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Grace period (days)</label>
                        <Input type="number" min="0" max="7" value={editing.grace_days}
                          onChange={e => setEditing({ ...editing, grace_days: parseInt(e.target.value) || 0 })} className="text-sm" />
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
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ── Baseline Activities Section ────────────────────────────── */
function BaselineActivitiesSection() {
  const [activities, setActivities] = useState<WeeklyActivityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [useDb, setUseDb] = useState(false);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('weekly_activity_config').select('*').order('sort_order');
    if (error || !data?.length) {
      setActivities(WEEKLY_ACTIVITIES.map((act, idx) => ({
        id: act.id, activity_code: act.id, pillar: act.pillar,
        label: act.label, description: act.desc, sort_order: idx, is_active: true,
      })));
      setUseDb(false);
    } else {
      setActivities(data as WeeklyActivityConfig[]);
      setUseDb(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActivity = async (rowId: string, current: boolean) => {
    if (!useDb) { addToast('Cannot toggle read-only activities', 'error'); return; }
    const { error } = await supabase.from('weekly_activity_config').update({ is_active: !current }).eq('id', rowId);
    if (error) { addToast('Failed to save', 'error'); return; }
    setActivities(prev => prev.map(a => a.id === rowId ? { ...a, is_active: !current } : a));
    addToast(!current ? 'Activity enabled' : 'Activity disabled');
  };

  const grouped = {
    p1: activities.filter(a => a.pillar === 'p1'),
    p2: activities.filter(a => a.pillar === 'p2'),
    p3: activities.filter(a => a.pillar === 'p3'),
    p4: activities.filter(a => a.pillar === 'p4'),
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Enable or disable individual activities tracked in the baseline assessment.</p>
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      ) : (
        <>
          {!useDb && (
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">Showing default activities. Toggle controls are disabled until a custom config is saved.</p>
            </div>
          )}
          {(Object.keys(PILLAR_LABELS) as Array<'p1' | 'p2' | 'p3' | 'p4'>).map(pillar => {
            const items = grouped[pillar];
            if (!items.length) return null;
            return (
              <div key={pillar} className="space-y-2">
                <span className={cn('inline-block text-xs font-bold px-3 py-1 rounded-full', PILLAR_COLORS[pillar])}>
                  {PILLAR_LABELS[pillar]}
                </span>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {items.map(activity => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cropguard-forest">{activity.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                      </div>
                      <button type="button" onClick={() => toggleActivity(activity.id, activity.is_active)} disabled={!useDb}
                        className={cn('relative h-6 w-11 rounded-full transition-colors shrink-0 mt-0.5',
                          activity.is_active ? 'bg-emerald-500' : 'bg-gray-300',
                          !useDb && 'opacity-50 cursor-not-allowed')}>
                        <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                          activity.is_active ? 'translate-x-5' : 'translate-x-0.5')} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function CheckinConfigPage() {
  const [activeSection, setActiveSection] = useState<Section>('questions');
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
          Configure weekly check-in questions, cohort schedules, and baseline activities
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left rail */}
        <aside className="w-52 shrink-0 space-y-1">
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

          {activeSection === 'questions' && <WeeklyQuestionsSection />}
          {activeSection === 'schedules' && <CohortSchedulesSection />}
          {activeSection === 'baseline'  && <BaselineActivitiesSection />}
        </div>
      </div>
    </div>
  );
}
