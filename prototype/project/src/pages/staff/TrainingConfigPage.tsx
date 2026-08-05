import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GraduationCap, Calendar, Video, Plus, Edit2, Save, X, Trash2,
  ChevronDown, ChevronUp, AlertCircle, Upload, FileText, Image,
  Film, File, Loader2, Users, Pause, Send, Ban, CheckCircle2,
  MapPin, Link2, Clock, CalendarDays, PlayCircle, Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { WEEK_TITLES, type CheckinCropType as CropType } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────── */
interface TrainingBundle {
  id: string;
  organisation_id: string;
  title: string;
  crop_type: CropType;
  season: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  total_weeks: number | null;
}

interface TrainingTemplate {
  id: string;
  organisation_id: string;
  bundle_id: string | null;
  crop_type: CropType;
  week_number: number;
  week_title: string;
  title: string;
  topic: string;
  description: string;
  notes: string;
  is_active: boolean;
  sort_order: number;
}

interface TrainingMaterial {
  id: string;
  template_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  display_label: string;
  sort_order: number;
}

interface CohortRow {
  id: string;
  name: string;
  program_id: string | null;
  training_start_date: string | null;
  training_window_days: number;
  training_grace_days: number;
}

interface FarmerOverride {
  id: string;
  farmer_id: string;
  template_id: string | null;
  status: 'paused' | 'send' | 'withhold';
  notes: string;
}

interface FarmerRow {
  id: string;
  full_name: string;
  phone: string;
  primary_crop: CropType;
}

interface TrainingSession {
  id: string;
  title: string;
  description: string;
  session_type: 'in_person' | 'online';
  crop_type: string | null;
  cohort_id: string | null;
  program_id: string | null;
  cooperative_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  meeting_link: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

/* ── Constants ───────────────────────────────────────────────── */
const CROP_META: Record<CropType, { label: string; weeks: number }> = {
  maize:   { label: 'Maize',    weeks: 12 },
  soybean: { label: 'Soybeans', weeks: 11 },
  cocoa:   { label: 'Cocoa',    weeks: 16 },
};

const CROP_OPTIONS: CropType[] = ['maize', 'soybean', 'cocoa'];

type Section = 'content' | 'schedule' | 'sessions';

const SECTIONS: { key: Section; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'content',   icon: GraduationCap, label: 'Weekly Content',  desc: 'Crop-specific training templates per week'    },
  { key: 'schedule',  icon: Calendar,      label: 'Training Schedule', desc: 'Cohort schedules & per-farmer overrides'    },
  { key: 'sessions',  icon: Video,          label: 'Training Sessions', desc: 'In-person & online event scheduling'        },
];

const TRAINING_BUCKET = 'cropguard-training';

/* ── Toast ──────────────────────────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
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

/* ── File icon helper ────────────────────────────────────────── */
function fileIcon(mime: string) {
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('image/')) return Image;
  if (mime === 'application/pdf') return FileText;
  return File;
}

function fileUrl(filePath: string): string {
  const { data } = supabase.storage.from(TRAINING_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ══════════════════════════════════════════════════════════════
   1. WEEKLY CONTENT SECTION
══════════════════════════════════════════════════════════════ */
function WeeklyContentSection() {
  const profile = useAuthStore(s => s.profile);
  const [bundles, setBundles] = useState<TrainingBundle[]>([]);
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [materials, setMaterials] = useState<Record<string, TrainingMaterial[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [editingTemplate, setEditingTemplate] = useState<{ bundleId: string; weekNum: number; template: TrainingTemplate | null } | null>(null);
  const [creatingBundle, setCreatingBundle] = useState(false);
  const [editingBundle, setEditingBundle] = useState<TrainingBundle | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<string | null>(null);
  const [addingWeek, setAddingWeek] = useState<string | null>(null);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const [{ data: bData, error: bErr }, { data: tData, error: tErr }] = await Promise.all([
      supabase.from('training_bundles').select('*').eq('organisation_id', profile.organisation_id).order('sort_order').order('created_at', { ascending: false }),
      supabase.from('training_templates').select('*').eq('organisation_id', profile.organisation_id).order('week_number').order('sort_order'),
    ]);
    if (bErr || tErr) { addToast('Failed to load training content', 'error'); setLoading(false); return; }
    setBundles((bData ?? []) as TrainingBundle[]);
    const tmpl = (tData ?? []) as TrainingTemplate[];
    setTemplates(tmpl);
    if (tmpl.length > 0) {
      const { data: mats } = await supabase
        .from('training_materials')
        .select('*')
        .in('template_id', tmpl.map(t => t.id))
        .order('sort_order');
      const matMap: Record<string, TrainingMaterial[]> = {};
      (mats ?? []).forEach((m: TrainingMaterial) => {
        if (!matMap[m.template_id]) matMap[m.template_id] = [];
        matMap[m.template_id].push(m);
      });
      setMaterials(matMap);
    }
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const toggleBundle = (id: string) => {
    setExpandedBundles(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleWeek = (key: string) => {
    setExpandedWeeks(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleSaveBundle = async (values: { title: string; crop_type: CropType; season: string; description: string; is_active: boolean }) => {
    if (!profile?.organisation_id || !values.title.trim()) return;
    setSaving(true);
    if (editingBundle) {
      const { error } = await supabase.from('training_bundles').update({
        title: values.title.trim(), crop_type: values.crop_type, season: values.season.trim(),
        description: values.description.trim(), is_active: values.is_active,
      }).eq('id', editingBundle.id);
      setSaving(false);
      if (error) { addToast('Failed to update bundle', 'error'); return; }
      addToast('Bundle updated');
    } else {
      const { data, error } = await supabase.from('training_bundles').insert({
        organisation_id: profile.organisation_id,
        title: values.title.trim(), crop_type: values.crop_type, season: values.season.trim(),
        description: values.description.trim(), is_active: true, sort_order: bundles.length,
      }).select().single();
      setSaving(false);
      if (error) { addToast('Failed to create bundle', 'error'); return; }
      addToast('Bundle created');
    }
    setEditingBundle(null);
    setCreatingBundle(false);
    await load();
  };

  const handleAddWeek = async (bundle: TrainingBundle) => {
    const currentWeeks = bundle.total_weeks ?? CROP_META[bundle.crop_type].weeks;
    const newTotal = currentWeeks + 1;
    setAddingWeek(bundle.id);
    const { error } = await supabase.from('training_bundles').update({ total_weeks: newTotal }).eq('id', bundle.id);
    setAddingWeek(null);
    if (error) { addToast('Failed to add week', 'error'); return; }
    setBundles(prev => prev.map(b => b.id === bundle.id ? { ...b, total_weeks: newTotal } : b));
    addToast(`Week ${newTotal} added`);
  };

  const handleDeleteBundle = async (id: string) => {
    const { error } = await supabase.from('training_bundles').delete().eq('id', id);
    if (error) { addToast('Failed to delete bundle', 'error'); return; }
    setBundles(prev => prev.filter(b => b.id !== id));
    addToast('Bundle deleted');
  };

  const handleSaveTemplate = async (bundle: TrainingBundle, weekNum: number, values: {
    topic: string; description: string; notes: string; is_active: boolean;
  }, files: File[]) => {
    if (!profile?.organisation_id) return;
    setSaving(true);
    const existing = templates.find(t => t.bundle_id === bundle.id && t.week_number === weekNum);
    const payload = {
      organisation_id: profile.organisation_id,
      bundle_id: bundle.id,
      crop_type: bundle.crop_type,
      week_number: weekNum,
      week_title: WEEK_TITLES[bundle.crop_type][weekNum] ?? `Week ${weekNum}`,
      title: '',
      topic: values.topic.trim(),
      description: values.description.trim(),
      notes: values.notes.trim(),
      is_active: values.is_active,
    };
    let templateId: string;
    if (existing) {
      const { error } = await supabase.from('training_templates').update(payload).eq('id', existing.id);
      if (error) { setSaving(false); addToast('Failed to update template', 'error'); return; }
      setTemplates(prev => prev.map(t => t.id === existing.id ? { ...t, ...payload } : t));
      templateId = existing.id;
      addToast('Template updated');
    } else {
      const { data, error } = await supabase.from('training_templates').insert(payload).select().single();
      if (error) { setSaving(false); addToast('Failed to create template', 'error'); return; }
      templateId = (data as TrainingTemplate).id;
      setTemplates(prev => [...prev, data as TrainingTemplate]);
      addToast('Template created');
    }
    if (files.length > 0) {
      setUploading(true);
      for (const file of files) {
        await handleUploadFile(templateId, file);
      }
      setUploading(false);
    }
    setSaving(false);
    setEditingTemplate(null);
  };

  const handleUploadFile = async (templateId: string, file: File) => {
    if (!profile?.organisation_id) return;
    setUploading(true);
    const ext = file.name.split('.').pop() ?? '';
    const filePath = `${profile.organisation_id}/${templateId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(TRAINING_BUCKET)
      .upload(filePath, file, { contentType: file.type });
    if (upErr) { addToast('Upload failed', 'error'); setUploading(false); return; }

    const existing = materials[templateId] ?? [];
    const sortOrder = existing.reduce((m, x) => Math.max(m, x.sort_order), -1) + 1;
    const { data, error } = await supabase.from('training_materials').insert({
      template_id: templateId,
      file_path: filePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      display_label: '',
      sort_order: sortOrder,
    }).select().single();
    setUploading(false);
    if (error) { addToast('Failed to save file record', 'error'); return; }
    setMaterials(prev => ({
      ...prev,
      [templateId]: [...(prev[templateId] ?? []), data as TrainingMaterial],
    }));
    addToast('File uploaded');
  };

  const handleDeleteMaterial = async (mat: TrainingMaterial) => {
    setDeletingMaterial(mat.id);
    await supabase.storage.from(TRAINING_BUCKET).remove([mat.file_path]);
    const { error } = await supabase.from('training_materials').delete().eq('id', mat.id);
    setDeletingMaterial(null);
    if (error) { addToast('Failed to delete file', 'error'); return; }
    setMaterials(prev => ({
      ...prev,
      [mat.template_id]: (prev[mat.template_id] ?? []).filter(m => m.id !== mat.id),
    }));
    addToast('File removed');
  };

  if (creatingBundle || editingBundle) {
    return <BundleEditForm
      initial={editingBundle ?? undefined}
      onSave={handleSaveBundle}
      onCancel={() => { setCreatingBundle(false); setEditingBundle(null); }}
      saving={saving}
    />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Create weekly training bundles — each bundle groups content across all weeks of a season.</p>
        <Button onClick={() => setCreatingBundle(true)} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
          <Plus className="w-3.5 h-3.5" />New Bundle
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No training bundles yet. Create your first bundle to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map(bundle => {
            const isExpanded = expandedBundles.has(bundle.id);
            const bundleTemplates = templates.filter(t => t.bundle_id === bundle.id);
            const weeks = Array.from({ length: bundle.total_weeks ?? CROP_META[bundle.crop_type].weeks }, (_, i) => i + 1);

            return (
              <div key={bundle.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {/* Bundle header */}
                <button type="button" onClick={() => toggleBundle(bundle.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cropguard-mint flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-cropguard-dark" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cropguard-forest">{bundle.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {CROP_META[bundle.crop_type].label}{bundle.season ? ` · ${bundle.season}` : ''}
                        {' · '}{bundleTemplates.length}/{weeks.length} weeks
                      </p>
                      
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {bundle.is_active && (
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Active</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Bundle body */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 space-y-2 p-3">
                    {/* Bundle description + actions */}
                    {bundle.description && (
                      <p className="text-xs text-gray-500 px-1 pb-1">{bundle.description}</p>
                    )}
                    <div className="flex gap-2 pb-2">
                      <button type="button"
                        onClick={() => setEditingBundle(bundle)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-cropguard-forest hover:underline">
                        <Edit2 className="w-3 h-3" /> Edit bundle
                      </button>
                      <button type="button"
                        onClick={() => handleDeleteBundle(bundle.id)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:underline">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>

                    {/* Weeks accordion */}
                    {weeks.map(wk => {
                      const tmpl = bundleTemplates.find(t => t.week_number === wk);
                      const weekKey = `${bundle.id}-${wk}`;
                      const weekOpen = expandedWeeks.has(weekKey);
                      const weekMats = tmpl ? (materials[tmpl.id] ?? []) : [];

                      return (
                        <div key={wk} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <button type="button" onClick={() => toggleWeek(weekKey)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-cropguard-mint flex items-center justify-center text-[10px] font-black text-cropguard-dark shrink-0">
                                W{wk}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-cropguard-forest">{WEEK_TITLES[bundle.crop_type][wk]}</p>
                                <p className="text-[10px] text-gray-400">
                                  {tmpl ? (tmpl.topic || 'Content added') : 'No content yet'}
                                  {weekMats.length > 0 && ` · ${weekMats.length} file${weekMats.length > 1 ? 's' : ''}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {tmpl?.is_active && (
                                <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">Active</span>
                              )}
                              {!tmpl && (
                                <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">Empty</span>
                              )}
                              {weekOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                          </button>

                          {weekOpen && (
                            <div className="border-t border-gray-100 bg-gray-50/30">
                              {editingTemplate?.bundleId === bundle.id && editingTemplate.weekNum === wk ? (
                                <TemplateEditForm
                                  initial={tmpl ? {
                                    topic: tmpl.topic, description: tmpl.description,
                                    notes: tmpl.notes, is_active: tmpl.is_active,
                                  } : { topic: '', description: '', notes: '', is_active: true }}
                                  onSave={(v, files) => handleSaveTemplate(bundle, wk, v, files)}
                                  onCancel={() => setEditingTemplate(null)}
                                  saving={saving || uploading}
                                />
                              ) : tmpl ? (
                                <div className="p-3 bg-white">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1 min-w-0">
                                      {tmpl.topic && <p className="text-[11px] text-cropguard-mid font-medium mt-0.5">Topic: {tmpl.topic}</p>}
                                      {tmpl.description && <p className="text-[11px] text-gray-500 mt-1">{tmpl.description}</p>}
                                      {tmpl.notes && <p className="text-[11px] text-gray-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2 whitespace-pre-wrap">{tmpl.notes}</p>}
                                    </div>
                                    <button type="button"
                                      onClick={() => setEditingTemplate({ bundleId: bundle.id, weekNum: wk, template: tmpl })}
                                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {weekMats.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Materials</p>
                                      {weekMats.map(mat => {
                                        const Icon = fileIcon(mat.mime_type);
                                        return (
                                          <div key={mat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <Icon className="w-4 h-4 text-cropguard-mid shrink-0" />
                                            <a href={fileUrl(mat.file_path)} target="_blank" rel="noopener noreferrer"
                                               className="text-xs text-cropguard-forest font-medium hover:underline truncate flex-1">
                                              {mat.file_name}
                                            </a>
                                            <span className="text-[10px] text-gray-400 shrink-0">{formatBytes(mat.file_size)}</span>
                                            <button type="button" onClick={() => handleDeleteMaterial(mat)} disabled={deletingMaterial === mat.id}
                                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <label className="flex items-center gap-2 text-xs text-cropguard-forest font-semibold cursor-pointer hover:underline">
                                    <Upload className="w-3.5 h-3.5" />
                                    {uploading ? 'Uploading…' : 'Add material (video, image, document)'}
                                    <input type="file" className="hidden"
                                      accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,audio/mpeg,.docx,.pptx"
                                      onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadFile(tmpl.id, f);
                                        e.target.value = '';
                                      }} />
                                  </label>
                                </div>
                              ) : (
                                <div className="p-3 bg-white">
                                  <button type="button"
                                    onClick={() => setEditingTemplate({ bundleId: bundle.id, weekNum: wk, template: null })}
                                    className="flex items-center gap-1.5 text-xs text-cropguard-forest font-semibold hover:underline">
                                    <Plus className="w-3.5 h-3.5" />
                                    Create weekly content
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Add week button */}
                    <button
                      type="button"
                      onClick={() => handleAddWeek(bundle)}
                      disabled={addingWeek === bundle.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-cropguard-forest hover:bg-cropguard-mint/30 hover:border-cropguard-forest transition-colors disabled:opacity-50">
                      {addingWeek === bundle.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Plus className="w-3.5 h-3.5" />}
                      {addingWeek === bundle.id ? 'Adding…' : `Add Week ${(bundle.total_weeks ?? CROP_META[bundle.crop_type].weeks) + 1}`}
                    </button>
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

/* ── Bundle edit form ──────────────────────────────────────── */
function BundleEditForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<TrainingBundle>;
  onSave: (v: { title: string; crop_type: CropType; season: string; description: string; is_active: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [cropType, setCropType] = useState<CropType>(initial?.crop_type ?? 'maize');
  const [season, setSeason] = useState(initial?.season ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [cropOpen, setCropOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <h3 className="text-base font-bold text-cropguard-forest">{initial?.id ? 'Edit Bundle' : 'New Training Bundle'}</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-2">A bundle groups weekly training content for a specific crop and season — similar to a check-in template.</p>

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bundle Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Maize Season 2026 — North Gonja" className="text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Crop Type</Label>
          <div className="relative">
            <button type="button" onClick={() => setCropOpen(o => !o)}
              className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              {CROP_META[cropType].label}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {cropOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {CROP_OPTIONS.map(c => (
                  <button key={c} type="button"
                    onClick={() => { setCropType(c); setCropOpen(false); }}
                    className={cn('w-full text-left px-3 py-2 text-sm hover:bg-gray-50', c === cropType && 'bg-cropguard-mint/50 font-semibold text-cropguard-dark')}>
                    {CROP_META[c].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Season (optional)</Label>
          <Input value={season} onChange={e => setSeason(e.target.value)}
            placeholder="e.g. 2026 Major" className="text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</Label>
        <textarea
          className="w-full min-h-[80px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Short summary of what this training bundle covers" />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setIsActive(a => !a)}
          className={cn('relative h-5 w-9 rounded-full transition-colors', isActive ? 'bg-emerald-500' : 'bg-gray-300')}>
          <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', isActive ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
        <span className="text-xs text-gray-500">{isActive ? 'Active' : 'Inactive'}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave({ title, crop_type: cropType, season, description, is_active: isActive })} disabled={saving || !title.trim()} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
          <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save Bundle'}
        </Button>
        <Button onClick={onCancel} disabled={saving} variant="outline" size="sm">
          <X className="w-3.5 h-3.5 mr-1.5" />Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── Template edit form ──────────────────────────────────────── */
const ACCEPTED_TYPES = 'video/mp4,video/webm,image/jpeg,image/png,image/webp,application/pdf,.docx,.pptx';

function fileKind(mime: string, name: string): 'video' | 'image' | 'document' {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return 'document';
}

function TemplateEditForm({
  initial, onSave, onCancel, saving,
}: {
  initial: { topic: string; description: string; notes: string; is_active: boolean };
  onSave: (v: typeof initial, files: File[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const allowed = ['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const arr: File[] = [];
    for (const f of Array.from(list)) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx' || ext === 'pptx' || allowed.includes(f.type)) {
        arr.push(f);
      }
    }
    if (arr.length) setPendingFiles(prev => [...prev, ...arr]);
  }

  function removeFile(idx: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-4 bg-white space-y-3">
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Topic</Label>
        <Input value={values.topic} onChange={e => setValues(v => ({ ...v, topic: e.target.value }))}
          placeholder="e.g. Soil health and tillage" className="text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</Label>
        <Input value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))}
          placeholder="Short summary for farmers" className="text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Explanation / Notes</Label>
        <textarea
          className="w-full min-h-[100px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          value={values.notes} onChange={e => setValues(v => ({ ...v, notes: e.target.value }))}
          placeholder="Detailed notes, instructions, or explanation for this week's training" />
      </div>

      {/* File upload */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Training Materials</Label>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors',
            dragOver ? 'border-cropguard-forest bg-cropguard-mint/30' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          )}
        >
          <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
          <p className="text-xs text-gray-600 font-medium">Click to browse or drag & drop</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Video, image, PDF, DOCX, PPTX — multiple files allowed</p>
        </div>
        {pendingFiles.length > 0 && (
          <div className="space-y-1.5">
            {pendingFiles.map((f, i) => {
              const kind = fileKind(f.type, f.name);
              const Icon = kind === 'video' ? Film : kind === 'image' ? Image : FileText;
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{f.name}</p>
                    <p className="text-[10px] text-gray-400">{formatBytes(f.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(i)}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setValues(v => ({ ...v, is_active: !v.is_active }))}
          className={cn('relative h-5 w-9 rounded-full transition-colors', values.is_active ? 'bg-emerald-500' : 'bg-gray-300')}>
          <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', values.is_active ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
        <span className="text-xs text-gray-500">{values.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(values, pendingFiles)} disabled={saving} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
          <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} disabled={saving} variant="outline" size="sm">
          <X className="w-3.5 h-3.5 mr-1.5" />Cancel
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. TRAINING SCHEDULE SECTION
══════════════════════════════════════════════════════════════ */
function TrainingScheduleSection() {
  const profile = useAuthStore(s => s.profile);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCohort, setEditingCohort] = useState<{ id: string; start_date: string; window_days: number; grace_days: number } | null>(null);
  const [savingCohort, setSavingCohort] = useState(false);
  const [activeTab, setActiveTab] = useState<'cohorts' | 'farmers'>('cohorts');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ program_id: 'none', cohort_id: 'none', start_date: '', window_days: 7, grace_days: 2 });
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data: pData, error: pErr } = await supabase
      .from('programs').select('id, name').eq('organisation_id', profile.organisation_id).order('name');
    if (pErr) { addToast('Failed to load programs', 'error'); setLoading(false); return; }
    const progList = (pData ?? []) as { id: string; name: string }[];
    setPrograms(progList);
    if (progList.length === 0) { setLoading(false); return; }
    const { data: cData, error: cErr } = await supabase
      .from('cohorts')
      .select('id, name, program_id, training_start_date, training_window_days, training_grace_days')
      .in('program_id', progList.map(p => p.id))
      .order('name');
    if (cErr) { addToast('Failed to load cohorts', 'error'); setLoading(false); return; }
    setCohorts((cData ?? []) as CohortRow[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const saveCohort = async () => {
    if (!editingCohort) return;
    if (!editingCohort.start_date) { addToast('Please select a start date', 'error'); return; }
    setSavingCohort(true);
    const { error } = await supabase.from('cohorts').update({
      training_start_date: editingCohort.start_date,
      training_window_days: editingCohort.window_days,
      training_grace_days: editingCohort.grace_days,
    }).eq('id', editingCohort.id);
    setSavingCohort(false);
    if (error) { addToast('Failed to save', 'error'); return; }
    setCohorts(prev => prev.map(c => c.id === editingCohort.id ? {
      ...c, training_start_date: editingCohort.start_date,
      training_window_days: editingCohort.window_days,
      training_grace_days: editingCohort.grace_days,
    } : c));
    addToast('Training schedule saved');
    setEditingCohort(null);
  };

  const openNewSchedule = () => {
    setScheduleForm({ program_id: 'none', cohort_id: 'none', start_date: '', window_days: 7, grace_days: 2 });
    setDrawerOpen(true);
  };

  const filteredCohorts = scheduleForm.program_id === 'none'
    ? cohorts
    : cohorts.filter(c => c.program_id === scheduleForm.program_id);

  const saveNewSchedule = async () => {
    if (scheduleForm.cohort_id === 'none') { addToast('Please select a cohort', 'error'); return; }
    if (!scheduleForm.start_date) { addToast('Please select a start date', 'error'); return; }
    setSavingSchedule(true);
    const { error } = await supabase.from('cohorts').update({
      training_start_date: scheduleForm.start_date,
      training_window_days: scheduleForm.window_days,
      training_grace_days: scheduleForm.grace_days,
    }).eq('id', scheduleForm.cohort_id);
    setSavingSchedule(false);
    if (error) { addToast('Failed to save schedule', 'error'); return; }
    setCohorts(prev => prev.map(c => c.id === scheduleForm.cohort_id ? {
      ...c, training_start_date: scheduleForm.start_date,
      training_window_days: scheduleForm.window_days,
      training_grace_days: scheduleForm.grace_days,
    } : c));
    addToast('Training schedule created');
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button type="button" onClick={() => setActiveTab('cohorts')}
            className={cn('px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
              activeTab === 'cohorts' ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
            Cohort Schedules
          </button>
          <button type="button" onClick={() => setActiveTab('farmers')}
            className={cn('px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
              activeTab === 'farmers' ? 'bg-white shadow-sm text-cropguard-forest' : 'text-gray-500 hover:text-gray-700')}>
            Per-Farmer Overrides
          </button>
        </div>
        {activeTab === 'cohorts' && (
          <Button onClick={openNewSchedule} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Schedule
          </Button>
        )}
      </div>

      {activeTab === 'cohorts' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Set the training start date and release window for each cohort. Materials become visible to farmers when their week's window opens.</p>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : cohorts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No cohorts found for your organisation.</div>
          ) : (
            cohorts.map(cohort => {
              const isEditing = editingCohort?.id === cohort.id;
              return (
                <div key={cohort.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  {!isEditing ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-cropguard-forest">{cohort.name}</h4>
                          {!cohort.training_start_date
                            ? <Badge className="text-xs border-0 bg-amber-100 text-amber-800">Not configured</Badge>
                            : <Badge className="text-xs border-0 bg-emerald-100 text-emerald-800">Configured</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {cohort.training_start_date
                            ? `Starts ${new Date(cohort.training_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${cohort.training_window_days}-day window · ${cohort.training_grace_days}-day grace`
                            : 'No training schedule set — farmers will not see weekly materials until configured.'}
                        </p>
                      </div>
                      <button type="button"
                        onClick={() => setEditingCohort({
                          id: cohort.id,
                          start_date: cohort.training_start_date?.split('T')[0] ?? '',
                          window_days: cohort.training_window_days || 7,
                          grace_days: cohort.training_grace_days || 2,
                        })}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-cropguard-forest">{cohort.name}</p>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Training Start Date</label>
                        <Input type="date" value={editingCohort.start_date}
                          onChange={e => setEditingCohort({ ...editingCohort, start_date: e.target.value })} className="text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Window (days)</label>
                          <Input type="number" min="1" max="14" value={editingCohort.window_days}
                            onChange={e => setEditingCohort({ ...editingCohort, window_days: parseInt(e.target.value) || 7 })} className="text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Grace period (days)</label>
                          <Input type="number" min="0" max="7" value={editingCohort.grace_days}
                            onChange={e => setEditingCohort({ ...editingCohort, grace_days: parseInt(e.target.value) || 0 })} className="text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button onClick={saveCohort} disabled={savingCohort} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
                          <Save className="w-3.5 h-3.5 mr-1.5" />{savingCohort ? 'Saving…' : 'Save'}
                        </Button>
                        <Button onClick={() => setEditingCohort(null)} disabled={savingCohort} variant="outline" size="sm">
                          <X className="w-3.5 h-3.5 mr-1.5" />Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'farmers' && <FarmerOverridesSection />}

      {/* New Schedule Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Training Schedule">
        <div className="space-y-4 p-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Program</Label>
            <Select value={scheduleForm.program_id} onValueChange={v => setScheduleForm(f => ({ ...f, program_id: v, cohort_id: 'none' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cohort</Label>
            <Select value={scheduleForm.cohort_id} onValueChange={v => setScheduleForm(f => ({ ...f, cohort_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a cohort…</SelectItem>
                {filteredCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {scheduleForm.program_id !== 'none' && filteredCohorts.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">No cohorts found for this program.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Training Start Date</Label>
            <Input type="date" value={scheduleForm.start_date}
              onChange={e => setScheduleForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Window (days)</Label>
              <Input type="number" min="1" max="14" value={scheduleForm.window_days}
                onChange={e => setScheduleForm(f => ({ ...f, window_days: parseInt(e.target.value) || 7 }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Grace Period (days)</Label>
              <Input type="number" min="0" max="7" value={scheduleForm.grace_days}
                onChange={e => setScheduleForm(f => ({ ...f, grace_days: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1 bg-cropguard-forest text-white hover:bg-cropguard-dark" onClick={saveNewSchedule} disabled={savingSchedule}>
              {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Schedule'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ── Per-farmer overrides ────────────────────────────────────── */
function FarmerOverridesSection() {
  const profile = useAuthStore(s => s.profile);
  const [search, setSearch] = useState('');
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerRow | null>(null);
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [overrides, setOverrides] = useState<FarmerOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingOverride, setSavingOverride] = useState<string | null>(null);
  const { toasts, add: addToast } = useToasts();

  const searchFarmers = useCallback(async () => {
    if (!profile?.organisation_id || !search.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('farmers')
      .select('id, full_name, phone, primary_crop')
      .eq('organisation_id', profile.organisation_id)
      .ilike('full_name', `%${search.trim()}%`)
      .limit(10);
    setLoading(false);
    if (error) { addToast('Search failed', 'error'); return; }
    setFarmers((data ?? []) as FarmerRow[]);
  }, [profile, search, addToast]);

  const selectFarmer = async (farmer: FarmerRow) => {
    setSelectedFarmer(farmer);
    if (!profile?.organisation_id) return;
    // Load templates for this farmer's crop
    const { data: tmpls } = await supabase
      .from('training_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .eq('crop_type', farmer.primary_crop)
      .eq('is_active', true)
      .order('week_number');
    setTemplates((tmpls ?? []) as TrainingTemplate[]);
    // Load existing overrides
    const { data: ovr } = await supabase
      .from('training_farmer_overrides')
      .select('*')
      .eq('farmer_id', farmer.id);
    setOverrides((ovr ?? []) as FarmerOverride[]);
  };

  const setOverride = async (templateId: string, status: 'paused' | 'send' | 'withhold') => {
    if (!selectedFarmer || !profile?.organisation_id) return;
    setSavingOverride(templateId);
    const existing = overrides.find(o => o.template_id === templateId);
    if (existing) {
      if (status === 'paused') {
        // "paused" is the default — remove the override to revert to normal
        await supabase.from('training_farmer_overrides').delete().eq('id', existing.id);
        setOverrides(prev => prev.filter(o => o.id !== existing.id));
      } else {
        const { error } = await supabase.from('training_farmer_overrides')
          .update({ status }).eq('id', existing.id);
        if (error) { addToast('Failed to update', 'error'); setSavingOverride(null); return; }
        setOverrides(prev => prev.map(o => o.id === existing.id ? { ...o, status } : o));
      }
    } else {
      if (status === 'paused') {
        // No override needed — already default
        setSavingOverride(null);
        return;
      }
      const { data, error } = await supabase.from('training_farmer_overrides').insert({
        organisation_id: profile.organisation_id,
        farmer_id: selectedFarmer.id,
        template_id: templateId,
        status,
      }).select().single();
      if (error) { addToast('Failed to set override', 'error'); setSavingOverride(null); return; }
      setOverrides(prev => [...prev, data as FarmerOverride]);
    }
    setSavingOverride(null);
    addToast('Override updated');
  };

  const pauseAll = async () => {
    if (!selectedFarmer || !profile?.organisation_id) return;
    // Create withhold overrides for all templates
    const toInsert = templates.map(t => ({
      organisation_id: profile.organisation_id,
      farmer_id: selectedFarmer.id,
      template_id: t.id,
      status: 'withhold' as const,
    }));
    // Delete existing first
    await supabase.from('training_farmer_overrides').delete().eq('farmer_id', selectedFarmer.id);
    const { error } = await supabase.from('training_farmer_overrides').insert(toInsert);
    if (error) { addToast('Failed to pause all', 'error'); return; }
    const { data } = await supabase.from('training_farmer_overrides').select('*').eq('farmer_id', selectedFarmer.id);
    setOverrides((data ?? []) as FarmerOverride[]);
    addToast('All training paused for this farmer');
  };

  const resumeAll = async () => {
    if (!selectedFarmer) return;
    await supabase.from('training_farmer_overrides').delete().eq('farmer_id', selectedFarmer.id);
    setOverrides([]);
    addToast('Training resumed for this farmer');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Pause training for an individual farmer, force-send a specific week, or withhold specific content.</p>

      {/* Search */}
      <div className="flex gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchFarmers()}
          placeholder="Search farmer by name…" className="text-sm" />
        <Button onClick={searchFarmers} disabled={loading} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Search results */}
      {!selectedFarmer && farmers.length > 0 && (
        <div className="space-y-1.5">
          {farmers.map(f => (
            <button key={f.id} type="button" onClick={() => selectFarmer(f)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Users className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cropguard-forest">{f.full_name}</p>
                <p className="text-[10px] text-gray-400">{f.phone || 'No phone'} · {CROP_META[f.primary_crop as CropType]?.label ?? f.primary_crop}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected farmer overrides */}
      {selectedFarmer && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-cropguard-forest">{selectedFarmer.full_name}</p>
              <p className="text-[10px] text-gray-400">{CROP_META[selectedFarmer.primary_crop as CropType]?.label ?? selectedFarmer.primary_crop}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={pauseAll} size="sm" variant="outline" className="text-xs h-7 gap-1.5">
                <Pause className="w-3 h-3" /> Pause All
              </Button>
              <Button onClick={resumeAll} size="sm" variant="outline" className="text-xs h-7 gap-1.5">
                <PlayCircle className="w-3 h-3" /> Resume All
              </Button>
              <Button onClick={() => { setSelectedFarmer(null); setFarmers([]); setSearch(''); }} size="sm" variant="outline" className="text-xs h-7">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <AlertCircle className="w-6 h-6 text-gray-200 mx-auto mb-2" />
              No active training templates for {CROP_META[selectedFarmer.primary_crop as CropType]?.label ?? 'this crop'}.
            </div>
          ) : (
            <div className="space-y-1.5">
              {templates.map(tmpl => {
                const ovr = overrides.find(o => o.template_id === tmpl.id);
                const status = ovr?.status ?? 'normal';
                return (
                  <div key={tmpl.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="w-7 h-7 rounded-lg bg-cropguard-mint flex items-center justify-center text-[10px] font-black text-cropguard-dark shrink-0">
                      W{tmpl.week_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-cropguard-forest truncate">{tmpl.title || `Week ${tmpl.week_number}`}</p>
                      <p className="text-[10px] text-gray-400">{tmpl.topic || tmpl.week_title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(['normal', 'send', 'withhold'] as const).map(s => {
                        const isActive = status === s;
                        const config = {
                          normal:   { icon: CheckCircle2, label: 'Normal',   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                          send:     { icon: Send,         label: 'Force Send', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
                          withhold: { icon: Ban,          label: 'Withhold',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
                        }[s];
                        const Icon = config.icon;
                        return (
                          <button key={s} type="button" disabled={savingOverride === tmpl.id}
                            onClick={() => setOverride(tmpl.id, s === 'normal' ? 'paused' : s)}
                            className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors',
                              isActive ? `${config.bg} ${config.border} ${config.color} border-2` : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300')}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. TRAINING SESSIONS SECTION
══════════════════════════════════════════════════════════════ */
function TrainingSessionsSection() {
  const profile = useAuthStore(s => s.profile);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', session_type: 'in_person' as 'in_person' | 'online',
    crop_type: 'all' as string, cohort_id: 'none' as string,
    program_id: 'none' as string, cooperative_id: 'none' as string,
    scheduled_date: '', start_time: '', end_time: '', location: '', meeting_link: '',
  });
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [cooperatives, setCooperatives] = useState<{ id: string; name: string }[]>([]);
  const programIdsRef = useRef<string[]>([]);
  const { toasts, add: addToast } = useToasts();

  const load = useCallback(async () => {
    if (!profile?.organisation_id) return;
    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('scheduled_date', { ascending: false });
    if (error) { addToast('Failed to load sessions', 'error'); setLoading(false); return; }
    setSessions((data ?? []) as TrainingSession[]);

    const [{ data: cohortData }, { data: programData }, { data: coopData }] = await Promise.all([
      supabase.from('cohorts').select('id, name, program_id').in('program_id', (programIdsRef.current.length > 0 ? programIdsRef.current : ['00000000-0000-0000-0000-000000000000'])).order('name'),
      supabase.from('programs').select('id, name').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('cooperatives').select('id, name').eq('organisation_id', profile.organisation_id).order('name'),
    ]);
    const progList = (programData ?? []) as { id: string; name: string }[];
    programIdsRef.current = progList.map(p => p.id);
    setCohorts((cohortData ?? []) as { id: string; name: string }[]);
    setPrograms(progList);
    setCooperatives((coopData ?? []) as { id: string; name: string }[]);
    setLoading(false);
  }, [profile, addToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({
      title: '', description: '', session_type: 'in_person',
      crop_type: 'all', cohort_id: 'none',
      program_id: 'none', cooperative_id: 'none',
      scheduled_date: '', start_time: '', end_time: '', location: '', meeting_link: '',
    });
    setEditingId(null);
    setDrawerOpen(true);
  };

  const openEdit = (s: TrainingSession) => {
    setForm({
      title: s.title, description: s.description, session_type: s.session_type,
      crop_type: s.crop_type ?? 'all', cohort_id: s.cohort_id ?? 'none',
      program_id: s.program_id ?? 'none', cooperative_id: s.cooperative_id ?? 'none',
      scheduled_date: s.scheduled_date, start_time: s.start_time ?? '', end_time: s.end_time ?? '',
      location: s.location, meeting_link: s.meeting_link,
    });
    setEditingId(s.id);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.organisation_id || !form.title.trim() || !form.scheduled_date) {
      addToast('Title and date are required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      organisation_id: profile.organisation_id,
      title: form.title.trim(),
      description: form.description.trim(),
      session_type: form.session_type,
      crop_type: form.crop_type === 'all' ? null : form.crop_type,
      cohort_id: form.cohort_id === 'none' ? null : form.cohort_id,
      program_id: form.program_id === 'none' ? null : form.program_id,
      cooperative_id: form.cooperative_id === 'none' ? null : form.cooperative_id,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location.trim(),
      meeting_link: form.meeting_link.trim(),
      status: 'scheduled' as const,
    };
    if (editingId) {
      const { error } = await supabase.from('training_sessions').update(payload).eq('id', editingId);
      if (error) { addToast('Failed to update', 'error'); setSaving(false); return; }
      setSessions(prev => prev.map(s => s.id === editingId ? { ...s, ...payload } as TrainingSession : s));
      addToast('Session updated');
    } else {
      const { data, error } = await supabase.from('training_sessions').insert(payload).select().single();
      if (error) { addToast('Failed to create session', 'error'); setSaving(false); return; }
      setSessions(prev => [data as TrainingSession, ...prev]);
      addToast('Session created');
    }
    setSaving(false);
    setDrawerOpen(false);
  };

  const updateStatus = async (id: string, status: 'completed' | 'cancelled') => {
    const { error } = await supabase.from('training_sessions').update({ status }).eq('id', id);
    if (error) { addToast('Failed to update status', 'error'); return; }
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    addToast(`Session marked as ${status}`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);
    if (error) { addToast('Failed to delete', 'error'); return; }
    setSessions(prev => prev.filter(s => s.id !== id));
    addToast('Session deleted');
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter(s => s.scheduled_date >= today && s.status === 'scheduled');
  const past = sessions.filter(s => s.scheduled_date < today || s.status !== 'scheduled');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Schedule in-person or online training sessions for farmers and agents.</p>
        <Button onClick={openCreate} size="sm" className="bg-cropguard-forest text-white hover:bg-cropguard-dark gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Session
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Video className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No training sessions scheduled yet.</p>
          <Button size="sm" onClick={openCreate} className="mt-4 bg-cropguard-forest text-white hover:bg-cropguard-dark">
            Schedule a session
          </Button>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Upcoming</p>
              {upcoming.map(s => <SessionCard key={s.id} session={s} cohorts={cohorts} programs={programs} cooperatives={cooperatives} onEdit={openEdit}
                onStatus={updateStatus} onDelete={handleDelete} />)}
            </div>
          )}
          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Past & Completed</p>
              {past.map(s => <SessionCard key={s.id} session={s} cohorts={cohorts} programs={programs} cooperatives={cooperatives} onEdit={openEdit}
                onStatus={updateStatus} onDelete={handleDelete} />)}
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editingId ? 'Edit Session' : 'New Training Session'}>
        <div className="space-y-4 p-1">

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</Label>
              <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v as 'in_person' | 'online' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Crop (optional)</Label>
              <Select value={form.crop_type} onValueChange={v => setForm(f => ({ ...f, crop_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crops</SelectItem>
                  {CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{CROP_META[c].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Program (optional)</Label>
              <Select value={form.program_id} onValueChange={v => setForm(f => ({ ...f, program_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cohort (optional)</Label>
              <Select value={form.cohort_id} onValueChange={v => setForm(f => ({ ...f, cohort_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Cohorts</SelectItem>
                  {cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cooperative (optional)</Label>
              <Select value={form.cooperative_id} onValueChange={v => setForm(f => ({ ...f, cooperative_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Cooperative</SelectItem>
                  {cooperatives.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</Label>
            <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Start Time</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">End Time</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          {form.session_type === 'in_person' ? (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Community Center, Techiman" />
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Meeting Link</Label>
              <Input value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                placeholder="e.g. https://meet.google.com/…" />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</Label>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What will this session cover?" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1 bg-cropguard-forest text-white hover:bg-cropguard-dark" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Update' : 'Create'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ── Session card ────────────────────────────────────────────── */
function SessionCard({
  session, cohorts, programs, cooperatives, onEdit, onStatus, onDelete,
}: {
  session: TrainingSession;
  cohorts: { id: string; name: string }[];
  programs: { id: string; name: string }[];
  cooperatives: { id: string; name: string }[];
  onEdit: (s: TrainingSession) => void;
  onStatus: (id: string, status: 'completed' | 'cancelled') => void;
  onDelete: (id: string) => void;
}) {
  const cohortName = session.cohort_id ? cohorts.find(c => c.id === session.cohort_id)?.name : null;
  const programName = session.program_id ? programs.find(p => p.id === session.program_id)?.name : null;
  const coopName = session.cooperative_id ? cooperatives.find(c => c.id === session.cooperative_id)?.name : null;
  const isOnline = session.session_type === 'online';
  const isPast = session.status !== 'scheduled' || session.scheduled_date < new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={cn('text-xs border-0', isOnline ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')}>
              {isOnline ? <Link2 className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
              {isOnline ? 'Online' : 'In-Person'}
            </Badge>
            {session.crop_type && (
              <Badge className="text-xs border-0 bg-gray-100 text-gray-600">
                {CROP_META[session.crop_type as CropType]?.label ?? session.crop_type}
              </Badge>
            )}
            {programName && (
              <Badge className="text-xs border-0 bg-purple-100 text-purple-800">{programName}</Badge>
            )}
            {cohortName && (
              <Badge className="text-xs border-0 bg-amber-100 text-amber-800">{cohortName}</Badge>
            )}
            {coopName && (
              <Badge className="text-xs border-0 bg-teal-100 text-teal-800">{coopName}</Badge>
            )}
            {session.status === 'completed' && (
              <Badge className="text-xs border-0 bg-emerald-100 text-emerald-800">Completed</Badge>
            )}
            {session.status === 'cancelled' && (
              <Badge className="text-xs border-0 bg-red-100 text-red-800">Cancelled</Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-cropguard-forest">{session.title}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {new Date(session.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {session.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {session.start_time}{session.end_time && `–${session.end_time}`}
              </span>
            )}
          </div>
          {isOnline ? session.meeting_link && (
            <a href={session.meeting_link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 block truncate">{session.meeting_link}</a>
          ) : session.location && (
            <p className="text-xs text-gray-500 mt-1">{session.location}</p>
          )}
          {session.description && (
            <p className="text-xs text-gray-500 mt-2">{session.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button type="button" onClick={() => onEdit(session)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {session.status === 'scheduled' && !isPast && (
            <button type="button" onClick={() => onStatus(session.id, 'completed')}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Mark complete">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => onDelete(session.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function TrainingConfigPage() {
  const [activeSection, setActiveSection] = useState<Section>('content');
  const active = SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cropguard-mint flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-cropguard-forest" />
            </div>
            <h1 className="text-2xl font-bold text-cropguard-forest">Training Materials</h1>
          </div>
          <p className="text-sm text-cropguard-slate mt-1 ml-10">
            Configure weekly training content, schedules, and sessions
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left rail */}
        <aside className="w-52 shrink-0 space-y-1">
          {SECTIONS.map(({ key, icon: Icon, label, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={cn(
                'w-full text-left rounded-xl px-3 py-3 transition-colors group',
                activeSection === key
                  ? 'bg-cropguard-forest text-white'
                  : 'hover:bg-gray-100 text-gray-600',
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-4 h-4 shrink-0', activeSection === key ? 'text-cropguard-light' : 'text-gray-400 group-hover:text-gray-600')} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold leading-tight', activeSection === key ? 'text-white' : 'text-gray-700')}>{label}</p>
                  <p className={cn('text-[10px] mt-0.5 leading-snug', activeSection === key ? 'text-cropguard-pale' : 'text-gray-400')}>{desc}</p>
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

          {activeSection === 'content'  && <WeeklyContentSection />}
          {activeSection === 'schedule' && <TrainingScheduleSection />}
          {activeSection === 'sessions' && <TrainingSessionsSection />}
        </div>
      </div>
    </div>
  );
}
