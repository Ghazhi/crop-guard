import { useEffect, useState } from 'react';
import {
  GraduationCap, Video, MapPin, Link2, Clock, CalendarDays,
  FileText, Image, Film, File, Loader2, BookOpen, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { SpeakButton } from '@/components/SpeakButton';

const TRAINING_BUCKET = 'cropguard-training';

type CropType = 'maize' | 'soybean' | 'cocoa';

interface TrainingTemplate {
  id: string;
  crop_type: CropType;
  week_number: number;
  week_title: string;
  title: string;
  topic: string;
  description: string;
  notes: string;
}

interface TrainingMaterial {
  id: string;
  template_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

interface TrainingSession {
  id: string;
  title: string;
  description: string;
  session_type: 'in_person' | 'online';
  crop_type: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  meeting_link: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

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

/**
 * Returns the current week number based on a cohort's training start date.
 * Returns null if no start date or the training hasn't started yet.
 */
function computeCurrentWeek(startDate: string, windowDays: number): number | null {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / windowDays) + 1;
}

/* ── Weekly Materials card ──────────────────────────────────── */
export function FarmerWeeklyMaterials({ farmerId, farmerCrop }: { farmerId: string | null; farmerCrop: CropType | null }) {
  const profile = useAuthStore(s => s.profile);
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [materials, setMaterials] = useState<Record<string, TrainingMaterial[]>>({});
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [withheld, setWithheld] = useState<Set<string>>(new Set());
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organisation_id || !farmerCrop) { setLoading(false); return; }

    (async () => {
      // Load templates for this crop
      const { data: tmpls } = await supabase
        .from('training_templates')
        .select('id, crop_type, week_number, week_title, title, topic, description, notes')
        .eq('organisation_id', profile.organisation_id)
        .eq('crop_type', farmerCrop)
        .eq('is_active', true)
        .order('week_number');
      const tmplList = (tmpls ?? []) as TrainingTemplate[];
      setTemplates(tmplList);

      // Load materials
      if (tmplList.length > 0) {
        const { data: mats } = await supabase
          .from('training_materials')
          .select('id, template_id, file_path, file_name, mime_type, file_size')
          .in('template_id', tmplList.map(t => t.id))
          .order('sort_order');
        const matMap: Record<string, TrainingMaterial[]> = {};
        (mats ?? []).forEach((m: TrainingMaterial) => {
          if (!matMap[m.template_id]) matMap[m.template_id] = [];
          matMap[m.template_id].push(m);
        });
        setMaterials(matMap);
      }

      // Load overrides for this farmer
      if (farmerId) {
        const { data: ovr } = await supabase
          .from('training_farmer_overrides')
          .select('template_id, status')
          .eq('farmer_id', farmerId);
        const sendSet = new Set<string>();
        const withholdSet = new Set<string>();
        (ovr ?? []).forEach((o: any) => {
          if (o.status === 'send' && o.template_id) sendSet.add(o.template_id);
          if (o.status === 'withhold' && o.template_id) withholdSet.add(o.template_id);
        });
        setOverrides(sendSet);
        setWithheld(withholdSet);
      }

      // Compute current week from any cohort this farmer belongs to
      if (farmerId) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('cohort_id')
          .eq('farmer_id', farmerId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        if (enrollment?.cohort_id) {
          const { data: cohort } = await supabase
            .from('cohorts')
            .select('training_start_date, training_window_days')
            .eq('id', enrollment.cohort_id)
            .maybeSingle();
          if (cohort?.training_start_date) {
            setCurrentWeek(computeCurrentWeek(cohort.training_start_date, cohort.training_window_days || 7));
          }
        }
      }

      setLoading(false);
    })();
  }, [profile, farmerId, farmerCrop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <GraduationCap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-xs text-gray-400">No training materials available yet.</p>
      </div>
    );
  }

  // Determine which templates are visible to this farmer
  const visibleTemplates = templates.filter(t => {
    // Withheld templates are never shown
    if (withheld.has(t.id)) return false;
    // Force-sent templates are always shown
    if (overrides.has(t.id)) return true;
    // Otherwise, only show if the week has been released
    if (currentWeek === null) return false;
    return t.week_number <= currentWeek;
  });

  if (visibleTemplates.length === 0) {
    return (
      <div className="text-center py-8">
        <GraduationCap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-xs text-gray-400">Your training materials will appear here when they are released.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleTemplates.map(tmpl => {
        const mats = materials[tmpl.id] ?? [];
        return (
          <div key={tmpl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-cropguard-mint flex items-center justify-center shrink-0">
                <GraduationCap className="w-3.5 h-3.5 text-cropguard-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cropguard-forest">Week {tmpl.week_number}: {tmpl.title}</p>
                {tmpl.topic && <p className="text-[10px] text-cropguard-mid font-medium">{tmpl.topic}</p>}
              </div>
              {overrides.has(tmpl.id) && (
                <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Featured</span>
              )}
            </div>
            {tmpl.description && <p className="text-xs text-gray-600 mb-2">{tmpl.description}</p>}
            {tmpl.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mb-2">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{tmpl.notes}</p>
                <div className="flex justify-end mt-1">
                  <SpeakButton text={tmpl.notes} className="shrink-0" />
                </div>
              </div>
            )}
            {mats.length > 0 && (
              <div className="space-y-1.5">
                {mats.map(mat => {
                  const Icon = fileIcon(mat.mime_type);
                  const url = fileUrl(mat.file_path);
                  const isImage = mat.mime_type.startsWith('image/');
                  const isVideo = mat.mime_type.startsWith('video/');
                  return (
                    <div key={mat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Icon className="w-4 h-4 text-cropguard-mid shrink-0" />
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-cropguard-forest font-medium hover:underline truncate flex-1">
                        {mat.file_name}
                      </a>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatBytes(mat.file_size)}</span>
                    </div>
                  );
                })}
                {/* Show image previews */}
                {mats.filter(m => m.mime_type.startsWith('image/')).map(mat => (
                  <img key={`img-${mat.id}`} src={fileUrl(mat.file_path)} alt={mat.file_name}
                    className="w-full rounded-lg border border-gray-100 max-h-48 object-cover" />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Training Sessions card ──────────────────────────────────── */
export function FarmerTrainingSessions({ farmerCrop }: { farmerCrop: CropType | null }) {
  const profile = useAuthStore(s => s.profile);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organisation_id) { setLoading(false); return; }

    (async () => {
      let query = supabase
        .from('training_sessions')
        .select('id, title, description, session_type, crop_type, scheduled_date, start_time, end_time, location, meeting_link, status')
        .eq('organisation_id', profile.organisation_id)
        .eq('status', 'scheduled')
        .order('scheduled_date');

      // We can't easily filter by crop_type IS NULL OR eq in a single query with the client,
      // so we fetch all and filter client-side
      const { data } = await query;
      const all = (data ?? []) as TrainingSession[];
      const visible = all.filter(s => s.crop_type === null || s.crop_type === farmerCrop);
      setSessions(visible);
      setLoading(false);
    })();
  }, [profile, farmerCrop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Video className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-xs text-gray-400">No training sessions scheduled.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter(s => s.scheduled_date >= today);

  return (
    <div className="space-y-3">
      {upcoming.map(s => {
        const isOnline = s.session_type === 'online';
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                isOnline ? 'bg-blue-50' : 'bg-emerald-50')}>
                {isOnline ? <Link2 className="w-3.5 h-3.5 text-blue-600" /> : <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cropguard-forest">{s.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full',
                    isOnline ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>
                    {isOnline ? 'Online' : 'In-Person'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {new Date(s.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {s.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {s.start_time}{s.end_time && `–${s.end_time}`}
                </span>
              )}
            </div>
            {isOnline && s.meeting_link ? (
              <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline block truncate">{s.meeting_link}</a>
            ) : !isOnline && s.location ? (
              <p className="text-xs text-gray-500">{s.location}</p>
            ) : null}
            {s.description && <p className="text-xs text-gray-500 mt-2">{s.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
