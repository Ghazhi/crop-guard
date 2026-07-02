import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Loader2, Trash2, Edit2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CROP_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AdvisoryNote {
  id:         string;
  title:      string;
  body:       string;
  crop_type:  string | null;
  week:       number | null;
  created_at: string;
  author:     string;
}

interface NoteForm {
  title:     string;
  body:      string;
  crop_type: string;
  week:      string;
}

const EMPTY: NoteForm = { title: '', body: '', crop_type: 'all', week: '' };

export default function AgronomistAdvisoryPage() {
  const { profile } = useAuthStore();
  const [notes,    setNotes]    = useState<AdvisoryNote[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form,     setForm]     = useState<NoteForm>(EMPTY);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('advisory_notes')
      .select(`id, title, body, crop_type, week, created_at, author:users(full_name)`)
      .order('created_at', { ascending: false })
      .limit(60);

    setNotes((data ?? []).map((n: any) => ({
      id:         n.id,
      title:      n.title,
      body:       n.body,
      crop_type:  n.crop_type,
      week:       n.week,
      created_at: n.created_at,
      author:     n.author?.full_name ?? 'Unknown',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY);
    setEditId(null);
    setError('');
    setDrawerOpen(true);
  }

  function openEdit(n: AdvisoryNote) {
    setForm({
      title:     n.title,
      body:      n.body,
      crop_type: n.crop_type ?? 'all',
      week:      n.week != null ? String(n.week) : '',
    });
    setEditId(n.id);
    setError('');
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSaving(true);
    const payload = {
      title:     form.title.trim(),
      body:      form.body.trim(),
      crop_type: form.crop_type === 'all' ? null : form.crop_type,
      week:      form.week ? parseInt(form.week) : null,
      author_id: profile?.id,
    };
    if (editId) {
      await supabase.from('advisory_notes').update(payload).eq('id', editId);
    } else {
      await supabase.from('advisory_notes').insert(payload);
    }
    setSaving(false);
    setDrawerOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from('advisory_notes').delete().eq('id', id);
    setNotes(n => n.filter(x => x.id !== id));
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advisory Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Publish weekly crop-specific guidance for agents and farmers.</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2">
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          : notes.length === 0
            ? (
              <div className="bg-white rounded-xl border border-gray-100 py-16 text-center shadow-sm">
                <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No advisory notes yet.</p>
                <Button size="sm" onClick={openCreate} className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white">
                  Create your first note
                </Button>
              </div>
            )
            : notes.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(p => p === n.id ? null : n.id)}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {n.author}
                        {n.crop_type && ` · ${CROP_LABELS[n.crop_type as keyof typeof CROP_LABELS] ?? n.crop_type}`}
                        {n.week != null && ` · Week ${n.week}`}
                        {' · '}{new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        onClick={e => { e.stopPropagation(); openEdit(n); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expanded === n.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expanded === n.id && (
                    <div className="px-5 pb-5 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-50">
                      {n.body}
                    </div>
                  )}
                </div>
              ))
        }
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-4 p-1">
          <h2 className="text-lg font-bold text-gray-900">{editId ? 'Edit Note' : 'New Advisory Note'}</h2>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Crop</Label>
              <Select value={form.crop_type} onValueChange={v => setForm(f => ({ ...f, crop_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crops</SelectItem>
                  {Object.entries(CROP_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Week (optional)</Label>
              <Input
                type="number"
                min={1}
                max={52}
                placeholder="e.g. 12"
                value={form.week}
                onChange={e => setForm(f => ({ ...f, week: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Body</Label>
            <textarea
              className="w-full min-h-[140px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Publish'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
