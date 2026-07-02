import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Camera, HelpCircle,
  CheckCircle2, Loader2, AlertTriangle, Check,
  Clock, ShieldCheck, CalendarDays, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Drawer } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import {
  WEEKLY_ACTIVITIES, PILLAR_MAX,
  type WeeklyActivityDef, type FarmerResponse,
} from '@/lib/scoring';
import { SpeakButton } from '@/components/SpeakButton';

// ── Types ──────────────────────────────────────────────────────────────────────

type Answer = FarmerResponse | null;
type PillarKey = 'p1' | 'p2' | 'p3' | 'p4';

interface ActivityState {
  id:      string;
  answer:  Answer;
  photo:   string | null;
  flagged: boolean;
}

interface CohortConfig {
  checkin_start_date:  string | null;
  checkin_window_days: number;
  checkin_grace_days:  number;
}

// ── Pillar group structure (built dynamically from loaded activities) ──────────

const PILLAR_LABELS: Record<PillarKey, { label: string; weight: number }> = {
  p1: { label: 'Agronomy',      weight: 30 },
  p2: { label: 'CSA Practices', weight: 30 },
  p3: { label: 'Advisory',      weight: 20 },
  p4: { label: 'Discipline',    weight: 20 },
};

// ── Programme week helpers ─────────────────────────────────────────────────────

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface WindowInfo {
  weekNumber:   number;
  isOpen:       boolean;
  closeDate:    Date | null;
  programDay:   number;    // days since programme start (or -1 if not started)
  hasStarted:   boolean;
}

function getWindowInfo(config: CohortConfig): WindowInfo {
  if (!config.checkin_start_date) {
    return {
      weekNumber: getISOWeekNumber(new Date()),
      isOpen:     true,
      closeDate:  null,
      programDay: 0,
      hasStarted: true,
    };
  }

  const startDate = new Date(config.checkin_start_date + 'T00:00:00');
  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / 86400000);

  if (diffDays < 0) {
    return { weekNumber: 0, isOpen: false, closeDate: startDate, programDay: diffDays, hasStarted: false };
  }

  const weekNumber   = Math.floor(diffDays / 7) + 1;
  const weekStart    = new Date(startDate.getTime() + (weekNumber - 1) * 7 * 86400000);
  const closeDate    = new Date(weekStart.getTime() + (config.checkin_window_days + config.checkin_grace_days - 1) * 86400000);
  closeDate.setHours(23, 59, 59, 999);

  const isOpen = today.getTime() <= closeDate.getTime();

  return { weekNumber, isOpen, closeDate, programDay: diffDays, hasStarted: true };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function nextWeekOpenDate(config: CohortConfig, currentWeek: number): Date | null {
  if (!config.checkin_start_date) {
    const mon = new Date();
    const day = mon.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    mon.setDate(mon.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }
  const startDate = new Date(config.checkin_start_date + 'T00:00:00');
  return new Date(startDate.getTime() + currentWeek * 7 * 86400000);
}

function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

// ── Score preview ──────────────────────────────────────────────────────────────

function calcPreviewScore(
  states: ActivityState[],
  activities: WeeklyActivityDef[],
) {
  let total = 0;
  const pillars: Record<string, number> = {};
  const pillarsUsed = (['p1','p2','p3','p4'] as PillarKey[]);
  for (const key of pillarsUsed) {
    const acts = activities.filter(a => a.pillar === key);
    if (!acts.length) { pillars[key] = 0; continue; }
    const weight = PILLAR_LABELS[key].weight;
    const sum = acts.reduce((s, a) => {
      const st = states.find(x => x.id === a.id);
      if (st?.answer === 'yes')     return s + 1.0;
      if (st?.answer === 'partial') return s + 0.5;
      return s;
    }, 0);
    const pts = Math.round((sum / acts.length) * weight);
    pillars[key] = pts;
    total += pts;
  }
  return { total, pillars };
}

// ── UI components ──────────────────────────────────────────────────────────────

function AnswerToggle({ value, onChange }: { value: Answer; onChange: (v: Answer) => void }) {
  const opts: { v: FarmerResponse; label: string; active: string }[] = [
    { v: 'yes',     label: 'Yes',     active: 'bg-cropguard-dark border-cropguard-dark text-white' },
    { v: 'partial', label: 'Partial', active: 'bg-amber-500 border-amber-500 text-white'           },
    { v: 'no',      label: 'No',      active: 'bg-red-500 border-red-500 text-white'               },
  ];
  return (
    <div className="flex gap-2 mt-2">
      {opts.map(opt => (
        <button key={opt.v} type="button"
          onClick={() => onChange(value === opt.v ? null : opt.v)}
          className={cn(
            'flex-1 h-11 rounded-xl text-xs font-semibold border-2 transition-all select-none active:scale-95',
            value === opt.v
              ? opt.active
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          )}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function AnswerChip({ value }: { value: Answer }) {
  const style =
    value === 'yes'     ? 'bg-cropguard-dark text-white' :
    value === 'partial' ? 'bg-amber-500 text-white'       :
    value === 'no'      ? 'bg-red-500 text-white'          :
                          'bg-gray-100 text-gray-400';
  return (
    <span className={cn('text-xs font-bold px-3 py-1.5 rounded-xl', style)}>
      {value === 'yes' ? 'Yes' : value === 'partial' ? 'Partial' : value === 'no' ? 'No' : '—'}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type PageStatus =
  | 'loading'
  | 'not_started'    // Programme hasn't started yet
  | 'window_closed'  // Submission window closed for this week
  | 'open'
  | 'draft'
  | 'submitted'
  | 'verified';

export default function CheckinPage() {
  const navigate = useNavigate();
  const profile  = useAuthStore(s => s.profile);

  const [pageStatus,    setPageStatus]    = useState<PageStatus>('loading');
  const [farmerId,      setFarmerId]      = useState<string | null>(null);
  const [checkinId,     setCheckinId]     = useState<string | null>(null);
  const [cohortConfig,  setCohortConfig]  = useState<CohortConfig>({
    checkin_start_date: null, checkin_window_days: 7, checkin_grace_days: 2,
  });
  const [activities,    setActivities]    = useState<WeeklyActivityDef[]>(WEEKLY_ACTIVITIES);
  const [acts,          setActs]          = useState<ActivityState[]>(() =>
    WEEKLY_ACTIVITIES.map(a => ({ id: a.id, answer: null, photo: null, flagged: false }))
  );
  const [expanded,      setExpanded]      = useState<Set<PillarKey>>(new Set(['p1']));
  const [helpRequest,   setHelpRequest]   = useState(false);
  const [challenge,     setChallenge]     = useState('');
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [savingDraft,   setSavingDraft]   = useState(false);
  const [uploadingId,   setUploadingId]   = useState<string | null>(null);
  const [verifiedScore, setVerifiedScore] = useState<{
    total: number; p1: number; p2: number; p3: number; p4: number; is_provisional: boolean;
  } | null>(null);

  const fileRefs     = useRef<Record<string, HTMLInputElement | null>>({});
  const saveTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const farmerIdRef  = useRef<string | null>(null);
  const checkinIdRef = useRef<string | null>(null);
  const configRef    = useRef<CohortConfig>({ checkin_start_date: null, checkin_window_days: 7, checkin_grace_days: 2 });
  const activitiesRef = useRef<WeeklyActivityDef[]>(WEEKLY_ACTIVITIES);

  const loadState = useCallback(async () => {
    if (!profile) return;

    // 1. Get farmer record
    const { data: f } = await supabase
      .from('farmers').select('id, primary_crop').eq('user_id', profile.id).maybeSingle();
    if (!f) { setPageStatus('not_started'); return; }

    setFarmerId(f.id);
    farmerIdRef.current = f.id;
    const farmerCrop: string | null = (f as any).primary_crop ?? null;

    // 2. Load cohort config via active enrollment
    let config: CohortConfig = { checkin_start_date: null, checkin_window_days: 7, checkin_grace_days: 2 };
    const { data: enrRaw } = await supabase
      .from('enrollments')
      .select('cohort_id')
      .eq('farmer_id', f.id)
      .eq('status', 'active')
      .limit(1);
    const enrList = (enrRaw ?? []) as { cohort_id: string | null }[];
    const cohortId = enrList[0]?.cohort_id ?? null;

    if (cohortId) {
      const { data: cohort } = await supabase
        .from('cohorts')
        .select('checkin_start_date, checkin_window_days, checkin_grace_days')
        .eq('id', cohortId)
        .maybeSingle();
      if (cohort) {
        config = {
          checkin_start_date:  (cohort as any).checkin_start_date  ?? null,
          checkin_window_days: (cohort as any).checkin_window_days ?? 7,
          checkin_grace_days:  (cohort as any).checkin_grace_days  ?? 2,
        };
      }
    }

    setCohortConfig(config);
    configRef.current = config;

    // 3. Load activities — try crop-specific checkin_questions first, then fall back
    const win0 = getWindowInfo(config);
    const componentToPillar: Record<string, PillarKey> = {
      agronomy:              'p1',
      climate_smart:         'p2',
      advisory_commitment:   'p3',
      farm_enterprise:       'p4',
    };

    let activeActivities: WeeklyActivityDef[] = [];

    if (farmerCrop && win0.hasStarted && profile.organisation_id) {
      const { data: cropQs } = await supabase
        .from('checkin_questions')
        .select('id, component, label, description')
        .eq('organisation_id', profile.organisation_id)
        .eq('crop_type', farmerCrop)
        .eq('week_number', win0.weekNumber)
        .eq('is_active', true)
        .order('sort_order');

      if (cropQs?.length) {
        activeActivities = (cropQs as any[]).map(q => ({
          id:     q.id,
          pillar: componentToPillar[q.component] ?? 'p1',
          label:  q.label,
          desc:   q.description ?? '',
        }));
      }
    }

    if (!activeActivities.length) {
      const { data: dbActivities } = await supabase
        .from('weekly_activity_config')
        .select('activity_code, pillar, label, description')
        .eq('is_active', true)
        .order('sort_order');

      activeActivities = dbActivities?.length
        ? (dbActivities as any[]).map(a => ({
            id:     a.activity_code,
            pillar: a.pillar as PillarKey,
            label:  a.label,
            desc:   a.description,
          }))
        : WEEKLY_ACTIVITIES;
    }

    setActivities(activeActivities);
    activitiesRef.current = activeActivities;
    setActs(activeActivities.map(a => ({ id: a.id, answer: null, photo: null, flagged: false })));

    // 4. Check window
    const win = win0;

    if (!win.hasStarted) { setPageStatus('not_started'); return; }
    if (!win.isOpen)     { setPageStatus('window_closed'); return; }

    // 5. Load existing check-in for this week
    const { data: ci } = await (supabase.from('farmer_checkins') as any)
      .select('id, status, is_verified, help_requested, challenge_notes')
      .eq('farmer_id', f.id)
      .eq('week_number', win.weekNumber)
      .maybeSingle();

    if (!ci) { setPageStatus('open'); return; }

    setCheckinId(ci.id);
    checkinIdRef.current = ci.id;
    setHelpRequest(ci.help_requested ?? false);
    setChallenge(ci.challenge_notes ?? '');

    // 6. Load responses
    const { data: responses } = await (supabase.from('farmer_checkin_responses') as any)
      .select('activity_code, farmer_response, is_flagged, photo_url')
      .eq('checkin_id', ci.id);

    if (responses?.length) {
      setActs(prev => prev.map(a => {
        const r = (responses as any[]).find((r: any) => r.activity_code === a.id);
        if (!r) return a;
        return {
          ...a,
          answer:  (['yes','partial','no'].includes(r.farmer_response) ? r.farmer_response as Answer : null),
          flagged: r.is_flagged,
          photo:   r.photo_url,
        };
      }));
    }

    if (ci.is_verified || ci.status === 'verified') {
      const { data: fri } = await (supabase.from('farmer_fri_scores') as any)
        .select('total_score, p1_score, p2_score, p3_score, p4_score, is_provisional')
        .eq('checkin_id', ci.id)
        .maybeSingle();
      if (fri) {
        setVerifiedScore({
          total: fri.total_score ?? 0,
          p1: fri.p1_score ?? 0, p2: fri.p2_score ?? 0,
          p3: fri.p3_score ?? 0, p4: fri.p4_score ?? 0,
          is_provisional: fri.is_provisional ?? false,
        });
      }
      setPageStatus('verified');
    } else if (ci.status === 'submitted') {
      setPageStatus('submitted');
    } else {
      setPageStatus('draft');
    }
  }, [profile]);

  useEffect(() => { loadState(); }, [loadState]);

  // ── Persist draft ─────────────────────────────────────────────────────────────

  const persistDraft = useCallback(async (
    fid: string, cid: string | null,
    actsArg: ActivityState[], helpArg: boolean, chalArg: string,
  ) => {
    setSavingDraft(true);
    const cfg = configRef.current;
    const win = getWindowInfo(cfg);
    const wk  = win.weekNumber;

    if (!cid) {
      const { data: ci, error } = await (supabase.from('farmer_checkins') as any)
        .insert({
          farmer_id:       fid,
          organisation_id: profile!.organisation_id,
          week_number:     wk,
          status:          'draft',
          help_requested:  helpArg,
          challenge_notes: chalArg || null,
        })
        .select('id').maybeSingle();
      if (error || !ci) { setSavingDraft(false); return; }

      setCheckinId(ci.id);
      checkinIdRef.current = ci.id;
      setPageStatus('draft');

      await (supabase.from('farmer_checkin_responses') as any).insert(
        actsArg.map(a => ({
          checkin_id:      ci.id,
          activity_code:   a.id,
          pillar:          activitiesRef.current.find(x => x.id === a.id)?.pillar ?? 'p1',
          farmer_response: a.answer ?? 'no',
          is_flagged:      a.flagged,
          photo_url:       a.photo,
        }))
      );
    } else {
      await (supabase.from('farmer_checkins') as any)
        .update({ help_requested: helpArg, challenge_notes: chalArg || null })
        .eq('id', cid).eq('status', 'draft');

      await (supabase.from('farmer_checkin_responses') as any).delete().eq('checkin_id', cid);
      await (supabase.from('farmer_checkin_responses') as any).insert(
        actsArg.map(a => ({
          checkin_id:      cid,
          activity_code:   a.id,
          pillar:          activitiesRef.current.find(x => x.id === a.id)?.pillar ?? 'p1',
          farmer_response: a.answer ?? 'no',
          is_flagged:      a.flagged,
          photo_url:       a.photo,
        }))
      );
    }
    setSavingDraft(false);
  }, [profile]);

  const scheduleSave = useCallback((
    actsArg: ActivityState[], helpArg: boolean, chalArg: string,
  ) => {
    if (!farmerIdRef.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      persistDraft(farmerIdRef.current!, checkinIdRef.current, actsArg, helpArg, chalArg);
    }, 800);
  }, [persistDraft]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function setAnswer(id: string, v: Answer) {
    setActs(prev => {
      const next = prev.map(a => a.id === id ? { ...a, answer: v } : a);
      scheduleSave(next, helpRequest, challenge);
      return next;
    });
  }

  function toggleFlag(id: string) {
    setActs(prev => {
      const next = prev.map(a => a.id === id ? { ...a, flagged: !a.flagged } : a);
      scheduleSave(next, helpRequest, challenge);
      return next;
    });
  }

  function togglePillar(p: PillarKey) {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  }

  function onHelpChange(v: boolean) {
    setHelpRequest(v);
    scheduleSave(acts, v, challenge);
  }

  function onChallengeChange(v: string) {
    setChallenge(v);
    scheduleSave(acts, helpRequest, v);
  }

  async function handlePhoto(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingId(id);
    const ext  = file.name.split('.').pop();
    const path = `${profile.id}/ci-${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('cropguard-evidence').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('cropguard-evidence').getPublicUrl(path);
      setActs(prev => {
        const next = prev.map(a => a.id === id ? { ...a, photo: data.publicUrl } : a);
        scheduleSave(next, helpRequest, challenge);
        return next;
      });
    }
    setUploadingId(null);
  }

  async function handleSubmit() {
    if (!farmerId || !profile) return;
    setSubmitting(true);
    const cfg    = configRef.current;
    const win    = getWindowInfo(cfg);
    const wk     = win.weekNumber;
    const scores = calcPreviewScore(acts, activitiesRef.current);
    let ciId     = checkinId;

    if (ciId) {
      await (supabase.from('farmer_checkins') as any)
        .update({ status: 'submitted', help_requested: helpRequest, challenge_notes: challenge || null })
        .eq('id', ciId);

      await (supabase.from('farmer_checkin_responses') as any).delete().eq('checkin_id', ciId);
      await (supabase.from('farmer_checkin_responses') as any).insert(
        acts.map(a => ({
          checkin_id:      ciId,
          activity_code:   a.id,
          pillar:          activitiesRef.current.find(x => x.id === a.id)?.pillar ?? 'p1',
          farmer_response: a.answer ?? 'no',
          is_flagged:      a.flagged,
          photo_url:       a.photo,
        }))
      );
    } else {
      const { data: ci, error: ciErr } = await (supabase.from('farmer_checkins') as any)
        .insert({
          farmer_id:       farmerId,
          organisation_id: profile.organisation_id,
          week_number:     wk,
          status:          'submitted',
          help_requested:  helpRequest,
          challenge_notes: challenge || null,
        })
        .select('id').maybeSingle();

      if (ciErr || !ci) { setSubmitting(false); return; }
      ciId = ci.id;

      await (supabase.from('farmer_checkin_responses') as any).insert(
        acts.map(a => ({
          checkin_id:      ciId,
          activity_code:   a.id,
          pillar:          activitiesRef.current.find(x => x.id === a.id)?.pillar ?? 'p1',
          farmer_response: a.answer ?? 'no',
          is_flagged:      a.flagged,
          photo_url:       a.photo,
        }))
      );
    }

    await (supabase.from('farmer_fri_scores') as any).upsert({
      farmer_id:       farmerId,
      checkin_id:      ciId,
      organisation_id: profile.organisation_id,
      week_number:     wk,
      total_score:     scores.total,
      p1_score:        scores.pillars.p1 ?? 0,
      p2_score:        scores.pillars.p2 ?? 0,
      p3_score:        scores.pillars.p3 ?? 0,
      p4_score:        scores.pillars.p4 ?? 0,
      is_provisional:  true,
    }, { onConflict: 'farmer_id,week_number' });

    await supabase.from('farmers')
      .update({ current_fri_score: scores.total } as never)
      .eq('id', farmerId);

    setCheckinId(ciId);
    checkinIdRef.current = ciId;
    setPageStatus('submitted');
    setShowConfirm(false);
    setSubmitting(false);
  }

  // ── Derived ────────────────────────────────────────────────────────────────────

  const win          = getWindowInfo(cohortConfig);
  const weekNum      = win.weekNumber;
  const answered     = acts.filter(a => a.answer !== null).length;
  const progress     = acts.length > 0 ? Math.round((answered / acts.length) * 100) : 0;
  const preview      = calcPreviewScore(acts, activities);
  const nextOpen     = nextWeekOpenDate(cohortConfig, weekNum);
  const daysToNext   = nextOpen ? daysUntil(nextOpen) : 0;

  const pillarGroups = (['p1','p2','p3','p4'] as PillarKey[]).map(key => ({
    key,
    label:      PILLAR_LABELS[key].label,
    weight:     PILLAR_LABELS[key].weight,
    activities: activities.filter(a => a.pillar === key),
  })).filter(g => g.activities.length > 0);

  // ── Render guards ──────────────────────────────────────────────────────────────

  if (pageStatus === 'loading') {
    return (
      <div className="p-4 space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  if (pageStatus === 'not_started') {
    return (
      <div className="p-4 space-y-4 pb-6">
        <div className="pt-2">
          <h2 className="text-lg font-bold text-cropguard-forest">Weekly Check-in</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">Programme Not Started</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              {cohortConfig.checkin_start_date
                ? `Your programme begins ${formatDate(new Date(cohortConfig.checkin_start_date + 'T00:00:00'))}. Check-ins will open then.`
                : 'Your programme start date has not been set yet. Please contact your field agent.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pageStatus === 'window_closed') {
    const nextOpenDate = nextWeekOpenDate(cohortConfig, weekNum);
    return (
      <div className="p-4 space-y-4 pb-6">
        <div className="pt-2">
          <h2 className="text-lg font-bold text-cropguard-forest">Weekly Check-in</h2>
          <p className="text-xs text-cropguard-slate mt-0.5">Week {weekNum}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">Submission Window Closed</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              The check-in window for Week {weekNum} has closed.
              {win.closeDate && (
                <> It closed on {formatDate(win.closeDate)}.</>
              )}
            </p>
          </div>
        </div>
        {nextOpenDate && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-cropguard-mint rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-cropguard-dark" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cropguard-forest">Next check-in opens</p>
              <p className="text-xs text-cropguard-slate">
                {formatDate(nextOpenDate)} · {Math.max(0, daysUntil(nextOpenDate))} day{daysUntil(nextOpenDate) !== 1 ? 's' : ''} away
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Verified view ─────────────────────────────────────────────────────────────

  if (pageStatus === 'verified') {
    return (
      <div className="p-4 space-y-4 pb-6">
        <div className="pt-2">
          <h2 className="text-lg font-bold text-cropguard-forest">Weekly Check-in</h2>
          <p className="text-xs text-cropguard-slate mt-0.5">Week {weekNum}</p>
        </div>

        <div className="bg-cropguard-dark rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {verifiedScore?.is_provisional ? 'Provisional Score' : 'Verified Score'}
              </p>
              <p className="text-xs text-cropguard-pale">Your agent has reviewed this week's check-in</p>
            </div>
          </div>
          {verifiedScore && (
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-3xl font-black text-white text-center">{verifiedScore.total}</p>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[
                  { l: 'P1', s: verifiedScore.p1, m: PILLAR_MAX.P1 },
                  { l: 'P2', s: verifiedScore.p2, m: PILLAR_MAX.P2 },
                  { l: 'P3', s: verifiedScore.p3, m: PILLAR_MAX.P3 },
                  { l: 'P4', s: verifiedScore.p4, m: PILLAR_MAX.P4 },
                ].map(({ l, s, m }) => (
                  <div key={l} className="text-center">
                    <p className="text-[9px] text-cropguard-pale">{l}</p>
                    <p className="text-xs font-bold text-white">{s}<span className="text-[8px] text-cropguard-pale">/{m}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {nextOpen && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-cropguard-mint rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-cropguard-dark" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cropguard-forest">Next check-in opens</p>
              <p className="text-xs text-cropguard-slate">{formatDate(nextOpen)} · {daysToNext} day{daysToNext !== 1 ? 's' : ''} away</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide mb-2">Your answers this week</p>
          {pillarGroups.map(({ key, label, activities: acts2 }) => {
            const open = expanded.has(key);
            return (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-2">
                <button type="button" onClick={() => togglePillar(key)}
                  className="w-full flex items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cropguard-mint flex items-center justify-center text-[10px] font-bold text-cropguard-dark">
                      {key.toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-cropguard-forest">{label}</p>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {open && (
                  <div className="border-t border-gray-100 px-4 pb-4 divide-y divide-gray-50">
                    {acts2.map(act => {
                      const st = acts.find(x => x.id === act.id);
                      return (
                        <div key={act.id} className="py-3">
                          <p className="text-sm font-bold text-cropguard-forest">{act.label}</p>
                          {act.desc && <p className="text-sm text-gray-600 leading-relaxed mt-1">{act.desc}</p>}
                          <div className="mt-2 flex items-center gap-2">
                            <AnswerChip value={st?.answer ?? null} />
                            {st?.photo && <img src={st.photo} alt="" className="w-7 h-7 rounded-lg object-cover border border-cropguard-pale" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button className="w-full bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => navigate('/farmer/score')}>
          View Full Score
        </Button>
      </div>
    );
  }

  // ── Submitted (awaiting verification) ─────────────────────────────────────────

  if (pageStatus === 'submitted') {
    return (
      <div className="p-4 space-y-4 pb-6">
        <div className="pt-2">
          <h2 className="text-lg font-bold text-cropguard-forest">Weekly Check-in</h2>
          <p className="text-xs text-cropguard-slate mt-0.5">Week {weekNum}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">Submitted — Awaiting Verification</p>
            <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
              Your check-in is submitted. Your field agent will verify each activity and publish your verified FRI score.
            </p>
          </div>
        </div>

        {nextOpen && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-cropguard-mint rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-cropguard-dark" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cropguard-forest">Next check-in opens</p>
              <p className="text-xs text-cropguard-slate">{formatDate(nextOpen)} · {daysToNext} day{daysToNext !== 1 ? 's' : ''} away</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide mb-2">Your submitted answers</p>
          {pillarGroups.map(({ key, label, activities: acts2 }) => {
            const open = expanded.has(key);
            return (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-2">
                <button type="button" onClick={() => togglePillar(key)}
                  className="w-full flex items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[10px] font-bold text-amber-700">
                      {key.toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-cropguard-forest">{label}</p>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {open && (
                  <div className="border-t border-gray-100 px-4 pb-4 divide-y divide-gray-50">
                    {acts2.map(act => {
                      const st = acts.find(x => x.id === act.id);
                      return (
                        <div key={act.id} className="py-3">
                          <p className="text-sm font-bold text-cropguard-forest">{act.label}</p>
                          {act.desc && <p className="text-sm text-gray-600 leading-relaxed mt-1">{act.desc}</p>}
                          <div className="mt-2 flex items-center gap-2">
                            <AnswerChip value={st?.answer ?? null} />
                            {st?.photo && <img src={st.photo} alt="" className="w-7 h-7 rounded-lg object-cover border border-cropguard-pale" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {challenge && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide mb-1.5">Challenge reported</p>
            <p className="text-sm text-gray-700 leading-relaxed">{challenge}</p>
          </div>
        )}

        {helpRequest && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">Agent visit requested</p>
          </div>
        )}

        <Button className="w-full bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => navigate('/farmer/score')}>
          View My Score
        </Button>
      </div>
    );
  }

  // ── Active form (open / draft) ────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-cropguard-forest">Weekly Check-in</h2>
          <p className="text-xs text-cropguard-slate mt-0.5">
            Week {weekNum} · Answer all {acts.length} activities
            {win.closeDate && (
              <span className="ml-2 text-amber-600 font-medium">
                · Closes {formatDate(win.closeDate)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {savingDraft && (
            <span className="flex items-center gap-1 text-[10px] text-cropguard-slate">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
          {!savingDraft && pageStatus === 'draft' && (
            <span className="text-[10px] text-cropguard-mid font-medium">Draft saved</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-cropguard-slate">{answered} / {acts.length} answered</span>
          <span className="text-cropguard-dark">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Pillar sections */}
      {pillarGroups.map(({ key, label, weight, activities: acts2 }) => {
        const done = acts2.filter(a => acts.find(x => x.id === a.id)?.answer !== null).length;
        const open = expanded.has(key);
        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <button type="button" onClick={() => togglePillar(key)}
              className="w-full flex items-center justify-between p-4 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cropguard-mint flex items-center justify-center text-[10px] font-bold text-cropguard-dark">
                  {key.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cropguard-forest">{label}</p>
                  <p className="text-[10px] text-cropguard-slate">{done}/{acts2.length} answered · {weight} pts</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {done === acts2.length && <Check className="w-4 h-4 text-cropguard-green" />}
                {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {open && (
              <div className="border-t border-gray-100 px-4 pb-4 divide-y divide-gray-50">
                {acts2.map(act => {
                  const st = acts.find(x => x.id === act.id)!;
                  return (
                    <div key={act.id} className="py-4">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            <p className="text-sm font-bold text-cropguard-forest leading-snug flex-1">{act.label}</p>
                            <SpeakButton text={`${act.label}. ${act.desc}`} className="mt-0.5 shrink-0" />
                          </div>
                          {act.desc && (
                            <p className="text-sm text-gray-600 leading-relaxed mt-1.5">{act.desc}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => toggleFlag(act.id)}
                          className={cn('shrink-0 mt-0.5 transition-colors', st?.flagged ? 'text-cropguard-amber' : 'text-gray-200 hover:text-gray-400')}>
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                      <AnswerToggle value={st?.answer ?? null} onChange={v => setAnswer(act.id, v)} />
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          ref={el => fileRefs.current[act.id] = el}
                          type="file" accept="image/*,video/*" capture="environment"
                          className="hidden"
                          onChange={e => handlePhoto(act.id, e)}
                        />
                        <button type="button"
                          onClick={() => fileRefs.current[act.id]?.click()}
                          className="flex items-center gap-1.5 text-[11px] text-cropguard-mid font-medium px-2.5 py-1.5 rounded-lg bg-cropguard-mint hover:bg-cropguard-pale transition-colors">
                          {uploadingId === act.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Camera className="w-3.5 h-3.5" />}
                          {st?.photo ? 'Photo added' : 'Add photo'}
                        </button>
                        {st?.photo && (
                          <img src={st.photo} alt="" className="w-8 h-8 rounded-lg object-cover border border-cropguard-pale" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Challenge notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
        <h3 className="text-sm font-semibold text-cropguard-forest">Any challenges this week?</h3>
        <textarea
          value={challenge}
          onChange={e => onChallengeChange(e.target.value)}
          placeholder="Describe farm challenges, pest sightings, or weather issues…"
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-cropguard-mid"
        />
      </div>

      {/* Help request */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-cropguard-amber" />
          <div>
            <p className="text-sm font-semibold text-cropguard-forest">Request agent visit</p>
            <p className="text-xs text-cropguard-slate">Your field agent will be notified</p>
          </div>
        </div>
        <button type="button" onClick={() => onHelpChange(!helpRequest)}
          className={cn('w-12 h-6 rounded-full relative transition-colors', helpRequest ? 'bg-cropguard-amber' : 'bg-gray-200')}>
          <div className={cn('w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform', helpRequest ? 'translate-x-6' : 'translate-x-0.5')} />
        </button>
      </div>

      {/* Submit */}
      <Button
        className="w-full h-12 bg-cropguard-dark hover:bg-cropguard-forest text-sm font-semibold"
        disabled={acts.length === 0 || answered < acts.length}
        onClick={() => setShowConfirm(true)}
      >
        Submit Check-in
        {answered < acts.length && (
          <span className="ml-2 text-[10px] font-normal opacity-70">({acts.length - answered} remaining)</span>
        )}
      </Button>

      {/* Confirm drawer */}
      <Drawer open={showConfirm} onClose={() => setShowConfirm(false)} title="Submit Check-in?" width="max-w-md">
        <div className="space-y-4 pt-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-cropguard-mint rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-cropguard-dark" />
            </div>
          </div>
          <p className="text-sm text-cropguard-slate text-center">
            Provisional FRI preview:{' '}
            <span className="font-bold text-cropguard-dark text-base">{preview.total}</span>
          </p>
          <div className="bg-cropguard-mint rounded-xl p-3.5 space-y-2">
            <p className="text-xs font-bold text-cropguard-dark">What happens next:</p>
            {[
              'Your answers are sent to your field agent for verification.',
              'Each activity is verified on the agent\'s next visit.',
              'Your verified FRI score is published after verification.',
              'You cannot submit another check-in until next week.',
            ].map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-4 h-4 rounded-full bg-cropguard-dark text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-xs text-cropguard-slate leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</Button>
            <Button className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Submit'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
