import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, AlertTriangle,
  ChevronDown, ChevronUp, Leaf, CheckCircle, Clock, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import {
  WEEKLY_ACTIVITIES, P1_ACTIVITIES, P2_ACTIVITIES, P3_ACTIVITIES, P4_ACTIVITIES,
  calcWeeklyPillarScore, PILLAR_MAX,
  assignZone, zoneShortLabel, zoneHex,
  type FarmerResponse, type WeeklyActivityDef,
} from '@/lib/scoring';

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

const PILLAR_GROUPS = [
  { key: 'p1' as const, label: 'P1 — Agronomy Readiness',         activities: P1_ACTIVITIES },
  { key: 'p2' as const, label: 'P2 — CSA & Climate-Smart',        activities: P2_ACTIVITIES },
  { key: 'p3' as const, label: 'P3 — Advisory & Commitment',      activities: P3_ACTIVITIES },
  { key: 'p4' as const, label: 'P4 — Farm Enterprise Discipline', activities: P4_ACTIVITIES },
];

// ── Score calculation helpers ─────────────────────────────────────────────────

function buildAgentVerificationMap(verdicts: Record<string, AgentVerdict>): Record<string, 'verified' | 'not_verified' | 'under_review'> {
  const map: Record<string, 'verified' | 'not_verified' | 'under_review'> = {};
  WEEKLY_ACTIVITIES.forEach(a => { map[a.id] = verdicts[a.id] ?? 'not_verified'; });
  return map;
}

function calcScores(
  farmerResponses: Record<string, FarmerResponse>,
  verdicts: Record<string, AgentVerdict>,
) {
  const agentVerifs = buildAgentVerificationMap(verdicts);
  const p1 = calcWeeklyPillarScore(P1_ACTIVITIES, farmerResponses, agentVerifs);
  const p2 = calcWeeklyPillarScore(P2_ACTIVITIES, farmerResponses, agentVerifs);
  const p3 = calcWeeklyPillarScore(P3_ACTIVITIES, farmerResponses, agentVerifs);
  const p4 = calcWeeklyPillarScore(P4_ACTIVITIES, farmerResponses, agentVerifs);
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
  onVerdictChange,
  onEvidenceCapture,
}: {
  act:               WeeklyActivityDef;
  farmerResponse:    FarmerResponse | null;
  agentVerdict:      AgentVerdict;
  evidenceUrl:       string | null;
  submitting:        boolean;
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
        <VerificationToggle value={agentVerdict} onChange={onVerdictChange} disabled={submitting} />
      </div>
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
    </div>
  );
}

// ── PillarSection ─────────────────────────────────────────────────────────────

function PillarSection({
  pillarKey, label, acts, farmerResponses, verdicts, evidence, submitting,
  onVerdictChange, onEvidence,
}: {
  pillarKey:       string;
  label:           string;
  acts:            WeeklyActivityDef[];
  farmerResponses: Record<string, FarmerResponse>;
  verdicts:        Record<string, AgentVerdict>;
  evidence:        Record<string, string | null>;
  submitting:      boolean;
  onVerdictChange: (id: string, v: AgentVerdict) => void;
  onEvidence:      (id: string, url: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const agentVerifs = buildAgentVerificationMap(verdicts);
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
  const { checkinId } = useParams<{ checkinId: string }>();
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

  // Debounced DB persist for in-progress verdicts
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistVerdicts = useCallback(async (
    ciId: string,
    v: Record<string, AgentVerdict>,
  ) => {
    // Upsert agent_response on each response row so state survives page reload
    const updates = WEEKLY_ACTIVITIES
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
    if (!checkinId) return;
    const { data: ci } = await supabase
      .from('farmer_checkins')
      .select('*, farmer_checkin_responses(*), farmers(full_name), enrollments(id)')
      .eq('id', checkinId)
      .maybeSingle();

    if (!ci) { setLoading(false); return; }

    const farmer = ci.farmers as { full_name: string } | null;
    const enr    = Array.isArray(ci.enrollments) ? ci.enrollments[0] : ci.enrollments;
    setFarmerName(farmer?.full_name ?? 'Unknown');
    setFarmerId(ci.farmer_id);
    setCheckinStatus(ci.status ?? 'submitted');
    setEnrollmentId((enr as { id: string } | null)?.id ?? '');
    setWeekNumber(ci.week_number);

    // Build farmer response map from stored responses.
    // Farmer used codes a1-a8; also handle direct activity_code matches.
    const resp: Record<string, FarmerResponse> = Object.fromEntries(
      WEEKLY_ACTIVITIES.map(a => [a.id, 'no' as FarmerResponse])
    );
    const agtResp: Record<string, AgentVerdict> = Object.fromEntries(
      WEEKLY_ACTIVITIES.map(a => [a.id, null])
    );
    const evid: Record<string, string | null> = Object.fromEntries(
      WEEKLY_ACTIVITIES.map(a => [a.id, null])
    );

    for (const r of (ci.farmer_checkin_responses ?? []) as {
      activity_code: string;
      farmer_response: string;
      agent_response: string | null;
      evidence_url: string | null;
    }[]) {
      // Resolve activity id: direct match OR map from a1-a8
      const actId = WEEKLY_ACTIVITIES.find(a => a.id === r.activity_code)?.id
        ?? FARMER_CODE_TO_ACTIVITY_ID[r.activity_code]
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

    // If already verified, show done screen with stored scores from DB
    if (ci.status === 'verified') {
      const { data: fri } = await (supabase.from('farmer_fri_scores') as any)
        .select('total_score,p1_score,p2_score,p3_score,p4_score')
        .eq('checkin_id', checkinId)
        .maybeSingle();
      if (fri) {
        setFinalScore(fri.total_score ?? 0);
        setDoneScores({
          p1: fri.p1_score ?? 0,
          p2: fri.p2_score ?? 0,
          p3: fri.p3_score ?? 0,
          p4: fri.p4_score ?? 0,
        });
      } else {
        const s = calcScores(resp, agtResp);
        setFinalScore(s.total);
        setDoneScores({ p1: s.p1, p2: s.p2, p3: s.p3, p4: s.p4 });
      }
      setDone(true);
    }

    setLoading(false);
  }, [checkinId]);

  useEffect(() => { loadCheckin(); }, [loadCheckin]);

  function handleVerdictChange(id: string, v: AgentVerdict) {
    const next = { ...verdicts, [id]: v };
    setVerdicts(next);
    if (checkinId) scheduleSave(checkinId, next);
  }

  const scores        = calcScores(farmerResponses, verdicts);
  const totalVerified = WEEKLY_ACTIVITIES.filter(a => verdicts[a.id] === 'verified').length;
  const allVerified   = totalVerified === WEEKLY_ACTIVITIES.length;
  const isProvisional = totalVerified > 0 && !allVerified;

  async function handleSubmit() {
    if (!checkinId || !profile) return;
    setSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
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
          const path = `verifications/${checkinId}/${actId}.jpg`;
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
      for (const act of WEEKLY_ACTIVITIES) {
        const verdict = verdicts[act.id];
        if (verdict === null) continue;
        await (supabase.from('farmer_checkin_responses') as any)
          .update({
            agent_response: verdict,
            evidence_url:   evidenceUrls[act.id] ?? null,
            verified_at:    new Date().toISOString(),
          })
          .eq('checkin_id', checkinId)
          .eq('activity_code', act.id);
      }

      const finalScoreVal = scores.total;
      setFinalScore(finalScoreVal);
      setDoneScores({ p1: scores.p1, p2: scores.p2, p3: scores.p3, p4: scores.p4 });

      await (supabase.from('farmer_fri_scores') as any).upsert({
        farmer_id:       farmerId,
        enrollment_id:   enrollmentId || null,
        checkin_id:      checkinId,
        organisation_id: profile.organisation_id,
        week_number:     weekNumber,
        total_score:     finalScoreVal,
        p1_score:        scores.p1,
        p2_score:        scores.p2,
        p3_score:        scores.p3,
        p4_score:        scores.p4,
        zone:            assignZone(finalScoreVal),
        is_provisional:  isProvisional,
      }, { onConflict: 'farmer_id,week_number' });

      await (supabase.from('farmer_checkins') as any).update({
        verified_at: new Date().toISOString(),
        verified_by: profile.id,
        status:      allVerified ? 'verified' : 'submitted',
      }).eq('id', checkinId);

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
      </div>

      {/* Live FRI preview */}
      <div className="bg-cropguard-dark rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-cropguard-pale uppercase tracking-wide font-semibold">Live FRI Preview</p>
          <div className="text-right">
            <span className="text-2xl font-black text-white">{scores.total}</span>
            {isProvisional && (
              <span className="ml-2 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Provisional</span>
            )}
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-cropguard-light transition-all duration-500"
            style={{ width: `${scores.total}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-1 pt-1">
          {[
            { p: 'P1', score: scores.p1, max: PILLAR_MAX.P1 },
            { p: 'P2', score: scores.p2, max: PILLAR_MAX.P2 },
            { p: 'P3', score: scores.p3, max: PILLAR_MAX.P3 },
            { p: 'P4', score: scores.p4, max: PILLAR_MAX.P4 },
          ].map(({ p, score, max }) => (
            <div key={p} className="text-center">
              <p className="text-[8px] text-cropguard-pale uppercase">{p}</p>
              <p className="text-xs font-bold text-white">{score}<span className="text-[8px] text-cropguard-pale">/{max}</span></p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-cropguard-pale">{totalVerified}/{WEEKLY_ACTIVITIES.length} verified</p>
          {totalVerified < WEEKLY_ACTIVITIES.length && (
            <div className="flex items-center gap-1 text-[10px] text-amber-300">
              <AlertTriangle className="w-3 h-3" />
              {WEEKLY_ACTIVITIES.length - totalVerified} remaining
            </div>
          )}
        </div>
      </div>

      {/* Scoring rule reminder */}
      <div className="flex gap-3 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
        <div className="w-7 h-7 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0">
          <Leaf className="w-3.5 h-3.5 text-cropguard-light" />
        </div>
        <div>
          <p className="text-[9px] font-bold text-cropguard-dark uppercase tracking-wider mb-0.5">Norvi AI — Scoring Rule</p>
          <p className="text-[10px] text-cropguard-forest leading-relaxed">
            {totalVerified === 0
              ? 'Mark each activity as Verified, Not Verified, or Under Review. Only Verified activities contribute to the score. Yes+Verified = full points; Partial+Verified = half points.'
              : totalVerified < WEEKLY_ACTIVITIES.length / 2
              ? 'Score increases only for Verified activities. "Not Verified" and "Under Review" both score zero for this week. The score will be Provisional until all activities are reviewed.'
              : allVerified
              ? `All activities verified. Score is Final at ${scores.total} pts — ${zoneShortLabel(assignZone(scores.total))} zone.`
              : `Score is Provisional at ${scores.total} pts. Verify remaining activities to lock in a Final score.`}
          </p>
        </div>
      </div>

      {/* Pillar sections */}
      {PILLAR_GROUPS.map(({ key, label, activities }) => (
        <PillarSection
          key={key}
          pillarKey={key}
          label={label}
          acts={activities}
          farmerResponses={farmerResponses}
          verdicts={verdicts}
          evidence={evidence}
          submitting={submitting}
          onVerdictChange={(id, v) => handleVerdictChange(id, v)}
          onEvidence={(id, url) => setEvidence(prev => ({ ...prev, [id]: url }))}
        />
      ))}

      {/* Submit */}
      <div className="space-y-2 pt-2">
        {!allVerified && totalVerified > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-700">
              {WEEKLY_ACTIVITIES.length - totalVerified} activities not yet verified. Score will be recorded as Provisional.
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
    </div>
  );
}
