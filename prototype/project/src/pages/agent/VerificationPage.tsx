import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, AlertTriangle,
  ChevronDown, ChevronUp, Leaf, CheckCircle, Clock, Loader2, Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import {
  WEEKLY_ACTIVITIES,
  calcWeeklyPillarScore, PILLAR_MAX,
  assignZone, zoneShortLabel, zoneHex,
  type FarmerResponse, type WeeklyActivityDef,
} from '@/lib/scoring';

// Build dynamic pillar groups from a custom activity list
function buildPillarGroups(activities: WeeklyActivityDef[]) {
  return (['p1','p2','p3','p4'] as const).map(key => ({
    key,
    label: { p1: 'P1 — Agronomy Readiness', p2: 'P2 — CSA & Climate-Smart', p3: 'P3 — Advisory & Commitment', p4: 'P4 — Farm Enterprise Discipline' }[key]!,
    activities: activities.filter(a => a.pillar === key),
  }));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentVerdict = 'verified' | 'not_verified' | 'under_review' | null;

// Legacy map for old a1-a8 codes (pre-migration checkins stored with short codes)
const FARMER_CODE_TO_ACTIVITY_ID: Record<string, string> = {
  a1: 'fertilizer_use',
  a2: 'pest_disease',
  a3: 'mulching',
  a4: 'water_harvesting',
  a5: 'attends_training',
  a6: 'follows_agronomist',
  a7: 'repayment_history',
  a8: 'savings_habit',
};

// Dynamic pillar groups are built via buildPillarGroups() from loaded activities

// ── Score calculation helpers ─────────────────────────────────────────────────

function buildAgentVerificationMap(verdicts: Record<string, AgentVerdict>, acts: WeeklyActivityDef[] = WEEKLY_ACTIVITIES): Record<string, 'verified' | 'not_verified' | 'under_review'> {
  const map: Record<string, 'verified' | 'not_verified' | 'under_review'> = {};
  acts.forEach(a => { map[a.id] = verdicts[a.id] ?? 'not_verified'; });
  return map;
}

function calcScores(
  farmerResponses: Record<string, FarmerResponse>,
  verdicts: Record<string, AgentVerdict>,
  acts: WeeklyActivityDef[] = WEEKLY_ACTIVITIES,
) {
  const agentVerifs = buildAgentVerificationMap(verdicts, acts);
  const p1 = calcWeeklyPillarScore(acts.filter(a => a.pillar === 'p1'), farmerResponses, agentVerifs);
  const p2 = calcWeeklyPillarScore(acts.filter(a => a.pillar === 'p2'), farmerResponses, agentVerifs);
  const p3 = calcWeeklyPillarScore(acts.filter(a => a.pillar === 'p3'), farmerResponses, agentVerifs);
  const p4 = calcWeeklyPillarScore(acts.filter(a => a.pillar === 'p4'), farmerResponses, agentVerifs);
  const total = p1 + p2 + p3 + p4;
  return { p1, p2, p3, p4, total };
}

// ── VerificationToggle ────────────────────────────────────────────────────────

function VerificationToggle({
  value, onChange, disabled,
}: { value: AgentVerdict; onChange: (v: AgentVerdict) => void; disabled?: boolean }) {
  type Opt = { v: Exclude<AgentVerdict, null>; label: string; active: string };
  const opts: Opt[] = [
    { v: 'verified',      label: 'Verified',    active: 'bg-emerald-600 text-white' },
    { v: 'not_verified',  label: 'Not Verified', active: 'bg-red-500 text-white'    },
    { v: 'under_review',  label: 'Review',       active: 'bg-amber-500 text-white'  },
  ];
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 shrink-0">
      {opts.map(opt => (
        <button
          key={opt.v}
          disabled={disabled}
          onClick={() => onChange(value === opt.v ? null : opt.v)}
          className={cn(
            'h-9 px-2.5 text-[10px] font-bold transition-colors',
            value === opt.v ? opt.active : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── FarmerResponseChip ────────────────────────────────────────────────────────

function FarmerResponseChip({ response }: { response: FarmerResponse | null }) {
  const style =
    response === 'yes'     ? 'bg-green-100 text-green-700' :
    response === 'partial' ? 'bg-amber-100 text-amber-700' :
    response === 'no'      ? 'bg-red-100 text-red-700' :
                             'bg-gray-100 text-gray-500';
  return (
    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize', style)}>
      Farmer: {response ?? '—'}
    </span>
  );
}

// ── ActivityRow ───────────────────────────────────────────────────────────────

function ActivityRow({
  act,
  farmerResponse,
  agentVerdict,
  evidenceUrl,
  submitting,
  readOnly,
  onVerdictChange,
  onEvidenceCapture,
}: {
  act:               WeeklyActivityDef;
  farmerResponse:    FarmerResponse | null;
  agentVerdict:      AgentVerdict;
  evidenceUrl:       string | null;
  submitting:        boolean;
  readOnly:          boolean;
  onVerdictChange:   (v: AgentVerdict) => void;
  onEvidenceCapture: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onEvidenceCapture(URL.createObjectURL(file));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-cropguard-forest">{act.label}</p>
          <p className="text-[10px] text-gray-400 leading-snug">{act.desc}</p>
        </div>
        <FarmerResponseChip response={farmerResponse} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-gray-500 font-medium">Agent:</span>
        <VerificationToggle value={agentVerdict} onChange={onVerdictChange} disabled={submitting || readOnly} />
      </div>
      {!readOnly && (
      <div className="flex items-center gap-2">
        {evidenceUrl ? (
          <div className="relative w-14 h-14 shrink-0">
            <img src={evidenceUrl} alt="evidence" className="w-14 h-14 rounded-lg object-cover" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] font-medium text-cropguard-mid bg-cropguard-mint px-2.5 py-1.5 rounded-lg"
          >
            <Camera className="w-3.5 h-3.5" /> Add photo
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      )}
      {readOnly && evidenceUrl && (
        <div className="relative w-14 h-14 shrink-0">
          <img src={evidenceUrl} alt="evidence" className="w-14 h-14 rounded-lg object-cover" />
        </div>
      )}
    </div>
  );
}

// ── PillarSection ─────────────────────────────────────────────────────────────

function PillarSection({
  pillarKey, label, acts, farmerResponses, verdicts, evidence, submitting, readOnly,
  onVerdictChange, onEvidence,
}: {
  pillarKey:       string;
  label:           string;
  acts:            WeeklyActivityDef[];
  farmerResponses: Record<string, FarmerResponse>;
  verdicts:        Record<string, AgentVerdict>;
  evidence:        Record<string, string | null>;
  submitting:      boolean;
  readOnly:        boolean;
  onVerdictChange: (id: string, v: AgentVerdict) => void;
  onEvidence:      (id: string, url: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const agentVerifs = buildAgentVerificationMap(verdicts, acts);
  const score    = calcWeeklyPillarScore(acts, farmerResponses, agentVerifs);
  const max      = PILLAR_MAX[pillarKey.toUpperCase() as keyof typeof PILLAR_MAX];
  const verified = acts.filter(a => verdicts[a.id] === 'verified').length;

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white"
      >
        <div className="text-left">
          <p className="text-xs font-bold text-cropguard-forest">{label}</p>
          <p className="text-[10px] text-gray-400">{verified}/{acts.length} verified</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-cropguard-dark">
            {score}<span className="text-[9px] font-normal text-gray-400">/{max}</span>
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-gray-50 border-t border-gray-100">
          {acts.map(act => (
            <ActivityRow
              key={act.id}
              act={act}
              farmerResponse={farmerResponses[act.id] ?? null}
              agentVerdict={verdicts[act.id]}
              evidenceUrl={evidence[act.id] ?? null}
              submitting={submitting}
              readOnly={readOnly}
              onVerdictChange={v => onVerdictChange(act.id, v)}
              onEvidenceCapture={url => onEvidence(act.id, url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const { checkinId, farmerId: routeFarmerId } = useParams<{ checkinId: string; farmerId: string }>();
  const navigate      = useNavigate();
  const profile       = useAuthStore(s => s.profile);

  const [farmerName,       setFarmerName]       = useState('');
  const [farmerId,         setFarmerId]         = useState('');
  const [enrollmentId,     setEnrollmentId]     = useState('');
  const [weekNumber,       setWeekNumber]       = useState(0);
  const [checkinStatus,    setCheckinStatus]    = useState<string>('submitted');
  const [farmerResponses,  setFarmerResponses]  = useState<Record<string, FarmerResponse>>({});
  const [verdicts,         setVerdicts]         = useState<Record<string, AgentVerdict>>(
    Object.fromEntries(WEEKLY_ACTIVITIES.map(a => [a.id, null])) as Record<string, AgentVerdict>
  );
  const [evidence,         setEvidence]         = useState<Record<string, string | null>>(
    Object.fromEntries(WEEKLY_ACTIVITIES.map(a => [a.id, null])) as Record<string, string | null>
  );
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [doneScores, setDoneScores] = useState({ p1: 0, p2: 0, p3: 0, p4: 0 });
  const [activities, setActivities] = useState<WeeklyActivityDef[]>(WEEKLY_ACTIVITIES);
  const [isAgentOnly, setIsAgentOnly] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [createdCheckinId, setCreatedCheckinId] = useState<string | null>(null);
  const templateIdRef = useRef<string | null>(null);

  // Debounced DB persist for in-progress verdicts
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistVerdicts = useCallback(async (
    ciId: string,
    v: Record<string, AgentVerdict>,
  ) => {
    // Upsert agent_response on each response row so state survives page reload
    const updates = activities
      .filter(a => v[a.id] !== null)
      .map(a =>
        (supabase.from('farmer_checkin_responses') as any)
          .update({ agent_response: v[a.id] })
          .eq('checkin_id', ciId)
          .eq('activity_code', a.id)
      );
    await Promise.all(updates);
  }, []);

  const scheduleSave = useCallback((
    ciId: string,
    v: Record<string, AgentVerdict>,
  ) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistVerdicts(ciId, v), 1000);
  }, [persistVerdicts]);

  const loadCheckin = useCallback(async () => {
    // ── Route A: agent opens existing check-in by ID ──
    if (checkinId) {
      const { data: ci } = await supabase
        .from('farmer_checkins')
        .select('*, farmer_checkin_responses(*), farmers(full_name), checkin_template_id, verification_mode')
        .eq('id', checkinId)
        .maybeSingle();

      if (!ci) { setLoading(false); return; }

      const farmer = ci.farmers as { full_name: string } | null;
      setFarmerName(farmer?.full_name ?? 'Unknown');
      setFarmerId(ci.farmer_id);
      setCheckinStatus(ci.status ?? 'submitted');
      setWeekNumber(ci.week_number);

      // Fetch enrollment separately (no FK from farmer_checkins to enrollments)
      const { data: enrRows } = await supabase
        .from('enrollments')
        .select('id')
        .eq('farmer_id', ci.farmer_id)
        .eq('status', 'active')
        .limit(1);
      const enr = (enrRows ?? [])[0] as { id: string } | undefined;
      setEnrollmentId(enr?.id ?? '');

      const templateId = (ci as any).checkin_template_id;
      const componentToPillar: Record<string, 'p1'|'p2'|'p3'|'p4'> = {
        agronomy: 'p1', climate_smart: 'p2', advisory_commitment: 'p3', farm_enterprise: 'p4',
      };

      let templateActivities: WeeklyActivityDef[] | null = null;
      if (templateId) {
        const ciWeek = ci.week_number ?? 1;
        const { data: tplItems } = await supabase
          .from('checkin_template_items')
          .select('id, component, activity_code, label, description, week_number')
          .eq('checkin_template_id', templateId)
          .eq('is_active', true)
          .eq('week_number', ciWeek)
          .order('sort_order');
        if (tplItems?.length) {
          templateActivities = (tplItems as any[]).map(q => ({
            id: q.activity_code || q.id,
            pillar: componentToPillar[q.component] ?? 'p1',
            label: q.label,
            desc: q.description ?? '',
          }));
        }
      }

      // Build initial activity list from template or fallback
      let ACTIVITIES = templateActivities ?? WEEKLY_ACTIVITIES;
      const agentOnly = (ci as any).verification_mode === 'agent_only';

      // Always reconcile ACTIVITIES against stored response rows so that
      // activity codes saved at submission time are represented — template may
      // have been updated or used UUID ids that differ from the defaults.
      const responseRows = (ci.farmer_checkin_responses ?? []) as {
        activity_code: string; pillar?: string; farmer_response: string;
        agent_response: string | null; evidence_url: string | null;
      }[];

      if (responseRows.length > 0) {
        const allMatch = responseRows.every(r =>
          ACTIVITIES.find(a => a.id === r.activity_code || a.id === FARMER_CODE_TO_ACTIVITY_ID[r.activity_code])
        );
        if (!allMatch) {
          // Rebuild ACTIVITIES from actual response rows — this is the authoritative source
          // for what was recorded; labels will be generic but scores will be correct.
          ACTIVITIES = responseRows.map(r => {
            const legacyId = FARMER_CODE_TO_ACTIVITY_ID[r.activity_code];
            const existing = WEEKLY_ACTIVITIES.find(a => a.id === r.activity_code || a.id === legacyId);
            return existing ?? {
              id: r.activity_code,
              pillar: (componentToPillar[r.pillar ?? ''] ?? 'p1') as 'p1'|'p2'|'p3'|'p4',
              label: r.activity_code,
              desc: '',
            };
          });
        }
      }

      setActivities(ACTIVITIES);
      setIsAgentOnly(agentOnly);

      const resp: Record<string, FarmerResponse> = Object.fromEntries(
        ACTIVITIES.map(a => [a.id, agentOnly ? 'yes' as FarmerResponse : 'no' as FarmerResponse])
      );
      const agtResp: Record<string, AgentVerdict> = Object.fromEntries(
        ACTIVITIES.map(a => [a.id, null])
      );
      const evid: Record<string, string | null> = Object.fromEntries(
        ACTIVITIES.map(a => [a.id, null])
      );

      for (const r of responseRows) {
        // Resolve the canonical activity id: direct match, then legacy code map
        const actId = ACTIVITIES.find(a => a.id === r.activity_code)?.id
          ?? ACTIVITIES.find(a => a.id === FARMER_CODE_TO_ACTIVITY_ID[r.activity_code])?.id
          ?? null;
        if (!actId) continue;
        const fr = r.farmer_response as FarmerResponse;
        if (fr === 'yes' || fr === 'partial' || fr === 'no') resp[actId] = fr;
        if (r.agent_response === 'verified' || r.agent_response === 'not_verified' || r.agent_response === 'under_review') {
          agtResp[actId] = r.agent_response as AgentVerdict;
        }
        if (r.evidence_url) evid[actId] = r.evidence_url;
      }

      setFarmerResponses(resp);
      setVerdicts(agtResp);
      setEvidence(evid);

      if (ci.status === 'verified') {
        // Try checkin_id first; if upsert used farmer_id+week conflict key, fall back to that
        const { data: friById } = await (supabase.from('farmer_fri_scores') as any)
          .select('total_score,p1_score,p2_score,p3_score,p4_score')
          .eq('checkin_id', checkinId)
          .maybeSingle();
        const { data: friFallback } = !friById
          ? await (supabase.from('farmer_fri_scores') as any)
              .select('total_score,p1_score,p2_score,p3_score,p4_score')
              .eq('farmer_id', ci.farmer_id)
              .eq('week_number', ci.week_number)
              .maybeSingle()
          : { data: null };
        const fri = friById ?? friFallback;
        if (fri) {
          setFinalScore(fri.total_score ?? 0);
          setDoneScores({ p1: fri.p1_score ?? 0, p2: fri.p2_score ?? 0, p3: fri.p3_score ?? 0, p4: fri.p4_score ?? 0 });
        } else {
          const s = calcScores(resp, agtResp, ACTIVITIES);
          setFinalScore(s.total);
          setDoneScores({ p1: s.p1, p2: s.p2, p3: s.p3, p4: s.p4 });
        }
        setIsReadOnly(true);
      }

      setLoading(false);
      return;
    }

    // ── Route B: agent starts verification for a farmer with no check-in yet ──
    if (!routeFarmerId || !profile) { setLoading(false); return; }

    // Load farmer details
    const { data: farmerRow } = await supabase
      .from('farmers')
      .select('id, full_name, organisation_id, primary_crop')
      .eq('id', routeFarmerId)
      .maybeSingle();
    if (!farmerRow) { setLoading(false); return; }

    setFarmerName((farmerRow as any).full_name ?? 'Unknown');
    setFarmerId(routeFarmerId);

    // Load enrollment + cohort to compute week number and template
    const { data: enrRow } = await supabase
      .from('enrollments')
      .select('id, cohort_id')
      .eq('farmer_id', routeFarmerId)
      .eq('status', 'active')
      .limit(1);
    const enrList = (enrRow ?? []) as { id: string; cohort_id: string | null }[];
    const enr = enrList[0] ?? null;
    setEnrollmentId(enr?.id ?? '');

    let weekNum = 1;
    let templateId: string | null = null;
    if (enr?.cohort_id) {
      const { data: cohort } = await supabase
        .from('cohorts')
        .select('checkin_start_date, checkin_window_days, checkin_grace_days, checkin_template_id, total_weeks')
        .eq('id', enr.cohort_id)
        .maybeSingle();
      if (cohort) {
        const c = cohort as any;
        templateId = c.checkin_template_id ?? null;
        if (c.checkin_start_date) {
          const startDate = new Date(c.checkin_start_date + 'T00:00:00');
          const today = new Date(); today.setHours(0,0,0,0);
          const diffDays = Math.floor((today.getTime() - startDate.getTime()) / 86400000);
          weekNum = diffDays < 0 ? 0 : Math.floor(diffDays / 7) + 1;
        } else {
          const d = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
          d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        }
      }
    }
    setWeekNumber(weekNum);

    // Load activities — same fallback chain as farmer portal
    templateIdRef.current = templateId;
    const farmerCrop = (farmerRow as any)?.primary_crop ?? null;
    const componentToPillar: Record<string, 'p1'|'p2'|'p3'|'p4'> = {
      agronomy: 'p1', climate_smart: 'p2', advisory_commitment: 'p3', farm_enterprise: 'p4',
    };

    let activeActivities: WeeklyActivityDef[] = [];

    // 1. Try cohort-linked checkin template
    if (templateId) {
      const { data: tplItems } = await supabase
        .from('checkin_template_items')
        .select('id, component, activity_code, label, description, week_number')
        .eq('checkin_template_id', templateId)
        .eq('is_active', true)
        .eq('week_number', weekNum)
        .order('sort_order');
      if (tplItems?.length) {
        activeActivities = (tplItems as any[]).map(q => ({
          id: q.activity_code || q.id,
          pillar: componentToPillar[q.component] ?? 'p1',
          label: q.label,
          desc: q.description ?? '',
        }));
      }
    }

    // 2. Fall back to crop-specific checkin_questions
    if (!activeActivities.length && farmerCrop && profile?.organisation_id) {
      const { data: cropQs } = await supabase
        .from('checkin_questions')
        .select('id, component, label, description')
        .eq('organisation_id', profile.organisation_id)
        .eq('crop_type', farmerCrop)
        .eq('week_number', weekNum)
        .eq('is_active', true)
        .order('sort_order');
      if (cropQs?.length) {
        activeActivities = (cropQs as any[]).map(q => ({
          id: q.id,
          pillar: componentToPillar[q.component] ?? 'p1',
          label: q.label,
          desc: q.description ?? '',
        }));
      }
    }

    // 3. Fall back to weekly_activity_config, then hardcoded defaults
    if (!activeActivities.length) {
      const { data: dbActivities } = await supabase
        .from('weekly_activity_config')
        .select('activity_code, pillar, label, description')
        .eq('is_active', true)
        .order('sort_order');
      activeActivities = dbActivities?.length
        ? (dbActivities as any[]).map(a => ({
            id: a.activity_code,
            pillar: a.pillar as 'p1'|'p2'|'p3'|'p4',
            label: a.label,
            desc: a.description,
          }))
        : WEEKLY_ACTIVITIES;
    }

    const ACTIVITIES = activeActivities;
    setActivities(ACTIVITIES);
    setIsAgentOnly(true);
    setCheckinStatus('pending');

    // Pre-fill farmer responses as 'yes' (agent will verify)
    const resp: Record<string, FarmerResponse> = Object.fromEntries(
      ACTIVITIES.map(a => [a.id, 'yes' as FarmerResponse])
    );
    setFarmerResponses(resp);
    setVerdicts(Object.fromEntries(ACTIVITIES.map(a => [a.id, null])));
    setEvidence(Object.fromEntries(ACTIVITIES.map(a => [a.id, null])));

    setLoading(false);
  }, [checkinId, routeFarmerId, profile]);

  useEffect(() => { loadCheckin(); }, [loadCheckin]);

  const effectiveCheckinId = checkinId ?? createdCheckinId;

  function handleVerdictChange(id: string, v: AgentVerdict) {
    const next = { ...verdicts, [id]: v };
    setVerdicts(next);
    if (effectiveCheckinId) scheduleSave(effectiveCheckinId, next);
  }

  const scores        = calcScores(farmerResponses, verdicts, activities);
  const totalVerified = activities.filter(a => verdicts[a.id] === 'verified').length;
  const allVerified   = totalVerified === activities.length;
  const isProvisional = totalVerified > 0 && !allVerified;
  const pillarGroups  = buildPillarGroups(activities);

  async function handleSubmit() {
    if (!profile || !farmerId) return;
    setSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      let ciId = effectiveCheckinId;

      // ── If no check-in exists yet (agent-only), create it now ──
      if (!ciId) {
        // Load org_id from farmer record
        const { data: farmerRow } = await supabase
          .from('farmers').select('organisation_id').eq('id', farmerId).maybeSingle();
        const orgId = (farmerRow as any)?.organisation_id ?? profile.organisation_id;

        const tplId = templateIdRef.current;

        const { data: newCi, error: ciErr } = await (supabase.from('farmer_checkins') as any)
          .insert({
            farmer_id:         farmerId,
            organisation_id:  orgId,
            week_number:       weekNumber,
            status:            'submitted',
            help_requested:    false,
            challenge_notes:  null,
            verification_mode: 'agent_only',
            is_agent_only:     true,
            checkin_template_id: tplId,
          })
          .select('id').maybeSingle();

        if (ciErr || !newCi) { setSubmitting(false); return; }
        ciId = newCi.id;
        setCreatedCheckinId(ciId);

        // Insert response rows (farmer_response defaults to 'yes' for agent-only)
        await (supabase.from('farmer_checkin_responses') as any).insert(
          activities.map(a => ({
            checkin_id:      ciId,
            activity_code:   a.id,
            pillar:          a.pillar,
            farmer_response: 'yes',
            is_flagged:      false,
            photo_url:       null,
          }))
        );
      }

      // Upload evidence photos
      const evidenceUrls: Record<string, string> = {};
      for (const [actId, localUrl] of Object.entries(evidence)) {
        if (!localUrl || localUrl.startsWith('http')) {
          if (localUrl) evidenceUrls[actId] = localUrl;
          continue;
        }
        try {
          const res  = await fetch(localUrl);
          const blob = await res.blob();
          const path = `verifications/${ciId}/${actId}.jpg`;
          const { data: upData } = await supabase.storage
            .from('cropguard-evidence')
            .upload(path, blob, { upsert: true });
          if (upData) {
            const { data: pubData } = supabase.storage.from('cropguard-evidence').getPublicUrl(path);
            evidenceUrls[actId] = pubData.publicUrl;
          }
        } catch { /* continue */ }
      }

      // Update each response with agent verification
      for (const act of activities) {
        const verdict = verdicts[act.id];
        if (verdict === null) continue;
        await (supabase.from('farmer_checkin_responses') as any)
          .update({
            agent_response: verdict,
            evidence_url:   evidenceUrls[act.id] ?? null,
            verified_at:    new Date().toISOString(),
          })
          .eq('checkin_id', ciId)
          .eq('activity_code', act.id);
      }

      const finalScoreVal = scores.total;
      setFinalScore(finalScoreVal);
      setDoneScores({ p1: scores.p1, p2: scores.p2, p3: scores.p3, p4: scores.p4 });

      const agentVerifMap = buildAgentVerificationMap(verdicts, activities);
      const scoreStatusVal = allVerified ? 'final' : isProvisional ? 'provisional' : 'pending';

      await (supabase.from('farmer_fri_scores') as any).upsert({
        farmer_id:       farmerId,
        enrollment_id:   enrollmentId || null,
        checkin_id:      ciId,
        organisation_id: profile.organisation_id,
        week_number:     weekNumber,
        total_score:     finalScoreVal,
        p1_score:        scores.p1,
        p2_score:        scores.p2,
        p3_score:        scores.p3,
        p4_score:        scores.p4,
        zone:            assignZone(finalScoreVal),
        is_provisional:  isProvisional,
        score_status:    scoreStatusVal,
        raw_responses:   {
          farmer_responses:    farmerResponses,
          agent_verifications: agentVerifMap,
          verification_mode:   isAgentOnly ? 'agent_only' : 'farmer_then_agent',
        },
      }, { onConflict: 'farmer_id,week_number' });

      await (supabase.from('farmer_checkins') as any).update({
        is_verified:       true,
        verified_at:       new Date().toISOString(),
        verified_by:       profile.id,
        agent_verified_at: new Date().toISOString(),
        agent_verified_by: profile.id,
        status:            'verified',
      }).eq('id', ciId);

      await supabase.from('farmers')
        .update({ current_fri_score: finalScoreVal } as never)
        .eq('id', farmerId);

      setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Done screen ───────────────────────────────────────────────────────────

  if (done) {
    const zone      = assignZone(finalScore);
    const zoneLabel = zoneShortLabel(zone);
    const hex       = zoneHex(finalScore);
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-cropguard-forest">Verification Complete</h3>
          <p className="text-sm text-gray-500 mt-1">{farmerName}</p>
          {isProvisional && (
            <p className="text-xs text-amber-600 mt-1">Score recorded as Provisional — some activities unverified</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center w-full max-w-xs">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
            {allVerified ? 'Final' : 'Provisional'} FRI Score
          </p>
          <p className="text-5xl font-black" style={{ color: hex }}>{finalScore}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">{zoneLabel}</p>
          <div className="grid grid-cols-4 gap-1 mt-4">
            {[
              { label: 'P1', score: doneScores.p1, max: PILLAR_MAX.P1 },
              { label: 'P2', score: doneScores.p2, max: PILLAR_MAX.P2 },
              { label: 'P3', score: doneScores.p3, max: PILLAR_MAX.P3 },
              { label: 'P4', score: doneScores.p4, max: PILLAR_MAX.P4 },
            ].map(p => (
              <div key={p.label} className="text-center">
                <p className="text-[9px] text-gray-400">{p.label}</p>
                <p className="text-xs font-bold text-gray-800">{p.score}<span className="text-[8px] text-gray-400">/{p.max}</span></p>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-full max-w-xs py-3 bg-cropguard-dark text-white rounded-xl font-semibold text-sm"
        >
          Back to Check-ins
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-cropguard-forest">{farmerName}</h2>
          <p className="text-[10px] text-gray-400">Week {weekNumber} verification</p>
        </div>
        {isAgentOnly && (
          <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Agent Only</span>
        )}
      </div>

      {isAgentOnly && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="text-[10px] text-indigo-700">
            Agent-only verification: the farmer has not submitted this check-in. You are verifying directly on their behalf. Scores will be flagged as agent-verified.
          </p>
        </div>
      )}

      {/* FRI score card */}
      <div className="bg-cropguard-dark rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-cropguard-pale uppercase tracking-wide font-semibold">
            {isReadOnly ? 'Verified FRI Score' : 'Live FRI Preview'}
          </p>
          <div className="text-right">
            <span className="text-2xl font-black text-white">{isReadOnly ? finalScore : scores.total}</span>
            {isReadOnly
              ? <span className="ml-2 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">Verified</span>
              : isProvisional && (
                <span className="ml-2 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Provisional</span>
              )}
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-cropguard-light transition-all duration-500"
            style={{ width: `${isReadOnly ? finalScore : scores.total}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-1 pt-1">
          {[
            { p: 'P1', score: isReadOnly ? doneScores.p1 : scores.p1, max: PILLAR_MAX.P1 },
            { p: 'P2', score: isReadOnly ? doneScores.p2 : scores.p2, max: PILLAR_MAX.P2 },
            { p: 'P3', score: isReadOnly ? doneScores.p3 : scores.p3, max: PILLAR_MAX.P3 },
            { p: 'P4', score: isReadOnly ? doneScores.p4 : scores.p4, max: PILLAR_MAX.P4 },
          ].map(({ p, score, max }) => (
            <div key={p} className="text-center">
              <p className="text-[8px] text-cropguard-pale uppercase">{p}</p>
              <p className="text-xs font-bold text-white">{score}<span className="text-[8px] text-cropguard-pale">/{max}</span></p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-cropguard-pale">{totalVerified}/{activities.length} verified</p>
          {totalVerified < activities.length && !isReadOnly && (
            <div className="flex items-center gap-1 text-[10px] text-amber-300">
              <AlertTriangle className="w-3 h-3" />
              {activities.length - totalVerified} remaining
            </div>
          )}
        </div>
      </div>

      {/* Scoring rule reminder / verified banner */}
      {isReadOnly ? (
        <div className="flex gap-3 items-start bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-green-700 uppercase tracking-wider mb-0.5">Verification Complete</p>
            <p className="text-[10px] text-green-700 leading-relaxed">
              This check-in was verified at {finalScore} pts — {zoneShortLabel(assignZone(finalScore))} zone. Scores are read-only.
            </p>
          </div>
        </div>
      ) : (
      <div className="flex gap-3 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
        <div className="w-7 h-7 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0">
          <Leaf className="w-3.5 h-3.5 text-cropguard-light" />
        </div>
        <div>
          <p className="text-[9px] font-bold text-cropguard-dark uppercase tracking-wider mb-0.5">Norvi AI — Scoring Rule</p>
          <p className="text-[10px] text-cropguard-forest leading-relaxed">
            {totalVerified === 0
              ? 'Mark each activity as Verified, Not Verified, or Under Review. Only Verified activities contribute to the score. Yes+Verified = full points; Partial+Verified = half points.'
              : totalVerified < activities.length / 2
              ? 'Score increases only for Verified activities. "Not Verified" and "Under Review" both score zero for this week. The score will be Provisional until all activities are reviewed.'
              : allVerified
              ? `All activities verified. Score is Final at ${scores.total} pts — ${zoneShortLabel(assignZone(scores.total))} zone.`
              : `Score is Provisional at ${scores.total} pts. Verify remaining activities to lock in a Final score.`}
          </p>
        </div>
      </div>
      )}

      {/* Pillar sections */}
      {pillarGroups.map(({ key, label, activities: acts }) => (
        <PillarSection
          key={key}
          pillarKey={key}
          label={label}
          acts={acts}
          farmerResponses={farmerResponses}
          verdicts={verdicts}
          evidence={evidence}
          submitting={submitting}
          readOnly={isReadOnly}
          onVerdictChange={(id, v) => handleVerdictChange(id, v)}
          onEvidence={(id, url) => setEvidence(prev => ({ ...prev, [id]: url }))}
        />
      ))}

      {/* Submit / Back button */}
      {isReadOnly ? (
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-cropguard-dark active:scale-[0.98] transition-all"
        >
          Back to Check-ins
        </button>
      ) : (
      <div className="space-y-2 pt-2">
        {!allVerified && totalVerified > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-700">
              {activities.length - totalVerified} activities not yet verified. Score will be recorded as Provisional.
            </p>
          </div>
        )}
        {totalVerified === 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-[10px] text-blue-700">
              No activities verified yet. You can still submit to log the check-in with zero score.
            </p>
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={cn(
            'w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2',
            submitting ? 'bg-gray-400' : 'bg-cropguard-dark active:scale-[0.98]',
          )}
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
            : `Submit · ${scores.total} pts${isProvisional ? ' (Provisional)' : allVerified ? ' (Final)' : ''}`}
        </button>
      </div>
      )}
    </div>
  );
}
