import { useEffect, useState, useRef } from 'react';
import {
  FileText, Plus, Clock, CheckCircle, WifiOff,
  RefreshCw, ChevronDown, ChevronUp, Trash2, Leaf, Sparkles,
  TrendingUp, AlertTriangle, Users, ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/offline';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/* ── types ─────────────────────────────────────────────── */
type ReportType = 'weekly_summary' | 'field_visit' | 'intervention' | 'risk_flag' | 'incident';

interface Draft {
  id: string;
  type: ReportType;
  content: string;
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
  synced: boolean;
}

interface SubmittedReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  content: string;
  submitted_at: string;
}

interface CohortData {
  totalFarmers: number;
  checkedInThisWeek: number;
  verified: number;
  pending: number;
  helpRequests: number;
  avgFRI: number;
  critical: number;   // FRI < 40
  starter: number;    // FRI 40–59
  builder: number;    // FRI 60–79
  leader: number;     // FRI >= 80
}

const REPORT_TYPES: { key: ReportType; label: string; desc: string }[] = [
  { key: 'weekly_summary', label: 'Weekly Summary',  desc: 'Check-in rate, verification progress, zone distribution' },
  { key: 'field_visit',    label: 'Field Visit Log', desc: 'Farm visits completed and outcomes' },
  { key: 'intervention',   label: 'Intervention',    desc: 'Input distributions, training sessions, advisories' },
  { key: 'risk_flag',      label: 'Risk Flag',       desc: 'Emerging pest, weather or agronomic risk' },
  { key: 'incident',       label: 'Incident Report', desc: 'Unexpected events or disputes' },
];

const TYPE_LABELS: Record<ReportType, string> = Object.fromEntries(
  REPORT_TYPES.map(t => [t.key, t.label])
) as Record<ReportType, string>;

/* ── cohort data fetch ────────────────────────────────────── */
async function fetchCohortData(_organisationId: string, agentUserId: string): Promise<CohortData> {
  const weekNum = getWeekNum();

  // Get farmers assigned to this agent via active enrollments
  const { data: myEnrollments } = await supabase
    .from('enrollments')
    .select('farmer_id')
    .eq('agent_id', agentUserId)
    .eq('status', 'active');

  const myFarmerIds = (myEnrollments ?? []).map((e: { farmer_id: string }) => e.farmer_id);

  if (myFarmerIds.length === 0) {
    return { totalFarmers: 0, checkedInThisWeek: 0, verified: 0, pending: 0, helpRequests: 0, avgFRI: 0, critical: 0, starter: 0, builder: 0, leader: 0 };
  }

  const [
    { data: farmers },
    { data: checkins },
    { data: helpReqs },
  ] = await Promise.all([
    supabase.from('farmers').select('current_fri_score').in('id', myFarmerIds),
    (supabase.from('farmer_checkins') as any).select('farmer_id, verified_at').in('farmer_id', myFarmerIds).eq('week_number', weekNum),
    (supabase.from('farmer_checkins') as any).select('id').in('farmer_id', myFarmerIds).eq('help_requested', true).is('verified_at', null),
  ]);

  const scores = (farmers ?? []).map((f: { current_fri_score: number | null }) => f.current_fri_score).filter((s): s is number => s !== null);
  const avgFRI = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const verified = (checkins ?? []).filter((c: { verified_at: string | null }) => c.verified_at).length;
  const pending = (checkins ?? []).filter((c: { verified_at: string | null }) => !c.verified_at).length;

  return {
    totalFarmers: myFarmerIds.length,
    checkedInThisWeek: (checkins ?? []).length,
    verified,
    pending,
    helpRequests: (helpReqs ?? []).length,
    avgFRI,
    critical: scores.filter((s: number) => s < 40).length,
    starter: scores.filter((s: number) => s >= 40 && s < 60).length,
    builder: scores.filter((s: number) => s >= 60 && s < 80).length,
    leader: scores.filter((s: number) => s >= 80).length,
  };
}

function getWeekNum() {
  const now = new Date(), s = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}

/* ── AI content generation ────────────────────────────────── */
function generateContent(type: ReportType, data: CohortData, periodStart: string, periodEnd: string): string {
  const checkinRate = data.totalFarmers > 0
    ? Math.round((data.checkedInThisWeek / data.totalFarmers) * 100)
    : 0;
  const verifyRate = data.checkedInThisWeek > 0
    ? Math.round((data.verified / data.checkedInThisWeek) * 100)
    : 0;
  const zoneLabel = data.avgFRI >= 80 ? 'Leader' : data.avgFRI >= 60 ? 'Builder' : data.avgFRI >= 40 ? 'Learner' : 'Starter';

  switch (type) {
    case 'weekly_summary':
      return `Weekly Summary Report — ${periodStart} to ${periodEnd}

COHORT OVERVIEW
Total assigned farmers: ${data.totalFarmers}
Check-in submissions this week: ${data.checkedInThisWeek} (${checkinRate}% completion rate)
Verifications completed: ${data.verified} of ${data.checkedInThisWeek} (${verifyRate}% verified)
Pending verifications: ${data.pending}
Help requests outstanding: ${data.helpRequests}

ZONE DISTRIBUTION
Leader (≥80): ${data.leader} farmers
Builder (60–79): ${data.builder} farmers
Learner (40–59): ${data.starter} farmers
Starter (<40): ${data.critical} farmers
Average cohort FRI: ${data.avgFRI} (${zoneLabel} zone)

KEY OBSERVATIONS
${checkinRate < 70 ? `Check-in rate of ${checkinRate}% is below the 70% programme target. Follow up with non-submitting farmers via phone or field visit.` : `Check-in rate of ${checkinRate}% meets the programme target.`}
${data.critical > 0 ? `${data.critical} farmer(s) remain in the Starter zone and require immediate advisory intervention.` : 'No critical-risk farmers identified this week.'}
${data.helpRequests > 0 ? `${data.helpRequests} outstanding help request(s) need resolution before end of week.` : 'No unresolved help requests.'}

PLANNED ACTIONS FOR NEXT WEEK
1. Complete ${data.pending} pending verifications
2. Follow up with farmers who missed check-in
3. Schedule advisory visits for Starter-zone farmers`;

    case 'field_visit':
      return `Field Visit Log — ${periodStart} to ${periodEnd}

VISITS CONDUCTED
[List farm visits completed this period — farmer name, date, location, key observations]

AGRONOMIC OBSERVATIONS
• Crop growth stage: [describe current stage across cohort]
• Pest and disease status: [observed pressures, if any]
• Soil moisture conditions: [field assessment notes]
• Input application status: [adherence to recommended schedule]

FARMER INTERACTIONS
[Summarise key discussions, challenges raised, and advisory guidance provided]

FOLLOW-UP REQUIRED
[List farmers requiring follow-up visits and reasons]

ADDITIONAL NOTES
[Any other relevant field observations or programme updates]`;

    case 'intervention':
      return `Intervention Report — ${periodStart} to ${periodEnd}

TYPE OF INTERVENTION
[Specify: Input Distribution / Training Session / Advisory Visit / Credit Facilitation]

FARMERS REACHED
Total: [number]
Names and IDs: [list key participants]

ACTIVITIES CONDUCTED
• [Describe each activity, inputs distributed, topics covered, etc.]
• Materials/inputs provided: [quantities and types]
• Location(s): [community/farm locations]

OUTCOMES AND IMPACT
• Immediate farmer response: [reactions, questions, uptake]
• Expected impact on FRI scores: [which pillars will improve]
• Challenges encountered: [barriers to adoption, gaps]

FOLLOW-UP ACTIONS
1. [Action required]
2. [Timeline]

RESOURCES USED
[Personnel, materials, transport — for programme records]`;

    case 'risk_flag':
      return `Risk Flag Report — ${periodStart} to ${periodEnd}

RISK IDENTIFIED
Type: [Pest / Weather / Agronomic / Market / Social]
Severity: [Critical / High / Medium / Low]
Affected area: [community, district, region]

DESCRIPTION
${data.critical > 0 ? `${data.critical} farmer(s) in cohort currently scoring below 40 FRI — Starter zone status indicates significant farm risk.` : '[Describe the specific risk or threat observed]'}
[Provide details on onset, spread, and current impact]

FARMERS AT RISK
[List affected farmers with IDs and current FRI scores]

EVIDENCE
[Describe observations, photos taken, or third-party reports received]

RECOMMENDED RESPONSE
1. [Immediate action required]
2. [Programme-level escalation if needed]
3. [Monitoring plan]

ESCALATION REQUIRED
[ ] Yes — escalate to programme coordinator
[ ] No — monitoring only`;

    case 'incident':
      return `Incident Report — ${periodStart} to ${periodEnd}

INCIDENT TYPE
[Data discrepancy / Farmer dispute / Misconduct / Equipment loss / Other]

DATE AND LOCATION
Date: [DD/MM/YYYY]
Location: [Community, District]

DESCRIPTION OF INCIDENT
[Provide a factual, chronological account of what happened, who was involved, and the immediate outcome]

PARTIES INVOLVED
• [Names and roles]

IMMEDIATE ACTION TAKEN
[Describe steps taken at the time of the incident]

IMPACT ON PROGRAMME
[Effect on farmer relationships, data integrity, or field operations]

RECOMMENDED RESOLUTION
[Steps to prevent recurrence or resolve the issue]

REPORTED BY
${''/* will be filled by agent name */}
Date reported: ${new Date().toLocaleDateString()}`;

    default:
      return '';
  }
}

/* ── Norvi AI suggestion card ─────────────────────────────── */
interface Suggestion {
  icon: React.ElementType;
  title: string;
  preview: string;
  type: ReportType;
  urgency: 'high' | 'medium' | 'low';
}

function buildSuggestions(data: CohortData): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (data.checkedInThisWeek > 0) {
    suggestions.push({
      icon: ClipboardCheck,
      title: 'Weekly Summary Due',
      preview: `${data.checkedInThisWeek} check-ins received, ${data.pending} pending verification. Cohort avg FRI: ${data.avgFRI}.`,
      type: 'weekly_summary',
      urgency: 'high',
    });
  }

  if (data.critical > 0) {
    suggestions.push({
      icon: AlertTriangle,
      title: `${data.critical} Starter-Zone Risk Flag`,
      preview: `${data.critical} farmer(s) below FRI 40. Flag for immediate programme review.`,
      type: 'risk_flag',
      urgency: 'high',
    });
  }

  if (data.helpRequests > 0) {
    suggestions.push({
      icon: Users,
      title: `${data.helpRequests} Help Request(s) Unresolved`,
      preview: `Log intervention report for help requests to track advisory response.`,
      type: 'intervention',
      urgency: 'medium',
    });
  }

  suggestions.push({
    icon: TrendingUp,
    title: 'Log Field Visits',
    preview: `Record farm visits from this week to maintain programme compliance and evidence trail.`,
    type: 'field_visit',
    urgency: 'low',
  });

  return suggestions;
}

const URGENCY_STYLES: Record<Suggestion['urgency'], string> = {
  high:   'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  low:    'border-gray-100 bg-white',
};
const URGENCY_ICON: Record<Suggestion['urgency'], string> = {
  high:   'text-red-500',
  medium: 'text-amber-500',
  low:    'text-cropguard-mid',
};

/* ── offline draft card ──────────────────────────────────── */
function DraftCard({
  draft,
  onEdit,
  onDelete,
}: {
  draft: Draft;
  onEdit: (d: Draft) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-cropguard-forest">{TYPE_LABELS[draft.type]}</p>
          <p className="text-[10px] text-gray-400">{draft.periodStart} → {draft.periodEnd}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {draft.synced
            ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            : <Clock className="w-3.5 h-3.5 text-amber-500" />}
          <span className="text-[9px] font-medium text-amber-600">{draft.synced ? 'Synced' : 'Draft'}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-600 line-clamp-2">{draft.content || 'No content yet.'}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(draft)}
          className="flex-1 text-[10px] font-semibold py-1.5 bg-cropguard-dark text-white rounded-lg"
        >
          Edit & Submit
        </button>
        <button
          onClick={() => onDelete(draft.id)}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

/* ── submitted report card ───────────────────────────────── */
function SubmittedCard({ report }: { report: SubmittedReport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5">
      <button className="w-full flex items-start justify-between gap-2" onClick={() => setOpen(!open)}>
        <div className="text-left">
          <p className="text-xs font-semibold text-cropguard-forest">
            {TYPE_LABELS[report.report_type as ReportType] ?? report.report_type}
          </p>
          <p className="text-[10px] text-gray-400">{new Date(report.submitted_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>
      {open && (
        <p className="text-[10px] text-gray-600 mt-2 leading-relaxed bg-gray-50 rounded-lg p-2.5 whitespace-pre-line">
          {report.content}
        </p>
      )}
    </div>
  );
}

/* ── compose form ────────────────────────────────────────── */
function ComposeForm({
  initial,
  initialType,
  onClose,
  onSubmitted,
  cohortData,
}: {
  initial?: Partial<Draft>;
  initialType?: ReportType;
  onClose: () => void;
  onSubmitted: () => void;
  cohortData: CohortData | null;
}) {
  const profile   = useAuthStore(s => s.profile);
  const isOnline  = useOfflineStore(s => s.isOnline);
  const [type, setType]           = useState<ReportType>(initialType ?? initial?.type ?? 'weekly_summary');
  const [content, setContent]     = useState(initial?.content ?? '');
  const [periodStart, setPeriodStart] = useState(initial?.periodStart ?? toDateInput(weekStart()));
  const [periodEnd, setPeriodEnd]     = useState(initial?.periodEnd ?? toDateInput(new Date()));
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const draftId = useRef(initial?.id ?? crypto.randomUUID());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toDateInput(d: Date) { return d.toISOString().split('T')[0]; }
  function weekStart() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  async function autoSaveDraft(c: string) {
    await db.config.put({
      key: `draft_${draftId.current}`,
      value: { id: draftId.current, type, content: c, periodStart, periodEnd, updatedAt: new Date().toISOString(), synced: false },
      updatedAt: new Date().toISOString(),
    });
  }

  function handleContentChange(v: string) {
    setContent(v);
    setGenerated(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSaveDraft(v), 800);
  }

  async function handleGenerate() {
    if (!cohortData) return;
    setGenerating(true);
    // Simulate brief AI "thinking" delay for UX polish
    await new Promise(r => setTimeout(r, 900));
    const generated = generateContent(type, cohortData, periodStart, periodEnd);
    setContent(generated);
    setGenerated(true);
    setGenerating(false);
    await autoSaveDraft(generated);
  }

  const [submitError, setSubmitError] = useState('');

  async function handleSubmit() {
    if (!profile || !content.trim()) return;
    setSaving(true);
    setSubmitError('');
    try {
      // Resolve a real program_id from the agent's active enrollment
      const { data: enrRow } = await supabase
        .from('enrollments')
        .select('program_id')
        .eq('agent_id', profile.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      const programId = enrRow?.program_id ?? null;
      if (!programId) {
        setSubmitError('No active programme found for your account. Ask your programme coordinator to assign you to a cohort.');
        return;
      }

      if (isOnline) {
        const { error } = await supabase.from('field_reports').insert({
          agent_id: profile.id,
          program_id: programId,
          report_type: type,
          period_start: periodStart,
          period_end: periodEnd,
          content,
          attachments: [],
          submitted_at: new Date().toISOString(),
          metadata: {},
        } as never);
        if (error) {
          setSubmitError(error.message);
          return;
        }
        await db.config.delete(`draft_${draftId.current}`);
        onSubmitted();
      } else {
        await db.queue.add({
          operation: 'create',
          table: 'field_reports',
          recordId: draftId.current,
          payload: {
            agent_id: profile.id,
            program_id: programId,
            report_type: type,
            period_start: periodStart,
            period_end: periodEnd,
            content,
            attachments: [],
            submitted_at: new Date().toISOString(),
            metadata: {},
          },
          createdAt: new Date().toISOString(),
          attempts: 0,
        });
        onSubmitted();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h3 className="text-base font-bold text-cropguard-forest">New Report</h3>

        {/* Report type */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Report Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {REPORT_TYPES.map(rt => (
              <button
                key={rt.key}
                onClick={() => { setType(rt.key); setGenerated(false); }}
                className={cn(
                  'text-left p-2.5 rounded-xl border text-[10px] font-semibold transition-colors',
                  type === rt.key ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600'
                )}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Generate with Norvi button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !cohortData}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
            generated
              ? 'border-green-400 bg-green-50 text-green-700'
              : generating
              ? 'border-cropguard-pale bg-cropguard-mint text-cropguard-dark'
              : 'border-dashed border-cropguard-mid bg-cropguard-mint/50 text-cropguard-dark hover:bg-cropguard-mint active:scale-[0.98]'
          )}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-cropguard-dark border-t-transparent rounded-full animate-spin" />
              Norvi is generating…
            </>
          ) : generated ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Generated — edit as needed
            </>
          ) : (
            <>
              <div className="w-5 h-5 bg-cropguard-dark rounded-md flex items-center justify-center shrink-0">
                <Leaf className="w-3 h-3 text-cropguard-light" />
              </div>
              Generate with Norvi
            </>
          )}
        </button>

        {/* Content */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Report Content</label>
            <span className="text-[9px] text-gray-400">Auto-saved</span>
          </div>
          <textarea
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            rows={8}
            placeholder="Write your report or tap Generate with Norvi above…"
            className={cn(
              'w-full border rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none transition-colors',
              generated ? 'border-green-300 focus:border-green-400 bg-green-50/30' : 'border-gray-200 focus:border-cropguard-mid'
            )}
          />
          {generated && (
            <p className="text-[9px] text-green-600 font-medium">AI-generated from your cohort data — review before submitting</p>
          )}
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-700">Offline — report will sync automatically when reconnected.</p>
          </div>
        )}

        {submitError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{submitError}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !content.trim()}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold text-white',
              saving || !content.trim() ? 'bg-gray-300' : 'bg-cropguard-dark'
            )}
          >
            {saving ? 'Saving…' : isOnline ? 'Submit' : 'Queue for Sync'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */
export default function AgentReportsPage() {
  const profile = useAuthStore(s => s.profile);
  const { pendingCount, isSyncing, isOnline, syncNow } = useOfflineStore();
  const [drafts, setDrafts]         = useState<Draft[]>([]);
  const [submitted, setSubmitted]   = useState<SubmittedReport[]>([]);
  const [cohortData, setCohortData] = useState<CohortData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [composing, setComposing]   = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | undefined>();
  const [initialType, setInitialType]  = useState<ReportType | undefined>();
  const [tab, setTab]               = useState<'submitted' | 'drafts'>('submitted');

  useEffect(() => {
    if (!profile) return;
    loadAll();
  }, [profile]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadSubmitted(), loadDrafts(), loadCohortData()]);
    } catch (err) {
      console.error('Reports load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubmitted() {
    if (!profile) return;
    try {
      const { data } = await supabase
        .from('field_reports')
        .select('id, report_type, period_start, period_end, content, submitted_at')
        .eq('agent_id', profile.id)
        .order('submitted_at', { ascending: false })
        .limit(30);
      setSubmitted((data as SubmittedReport[]) ?? []);
    } catch { /* offline or DB unavailable — keep empty list */ }
  }

  async function loadDrafts() {
    try {
      const all = await db.config.toArray();
      const draftEntries = all
        .filter(e => e.key.startsWith('draft_'))
        .map(e => e.value as Draft);
      setDrafts(draftEntries);
    } catch { /* IndexedDB unavailable — keep empty drafts */ }
  }

  async function loadCohortData() {
    if (!profile?.organisation_id) return;
    try {
      const data = await fetchCohortData(profile.organisation_id, profile.id);
      setCohortData(data);
      setSuggestions(buildSuggestions(data));
    } catch { /* keep null cohort data */ }
  }

  async function handleDeleteDraft(id: string) {
    await db.config.delete(`draft_${id}`);
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  function openCompose(type?: ReportType, draft?: Draft) {
    setInitialType(type);
    setEditingDraft(draft);
    setComposing(true);
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cropguard-forest">Reports</h2>
          <p className="text-sm text-cropguard-slate">Field reports & observations</p>
        </div>
        <button
          onClick={() => openCompose()}
          className="flex items-center gap-1.5 bg-cropguard-dark text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {/* Sync status */}
      {(pendingCount > 0 || isSyncing) && (
        <div className={cn('flex items-center gap-2.5 rounded-xl border p-3', isOnline ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100')}>
          {isSyncing
            ? <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            : <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
          <p className="text-xs text-gray-700 flex-1">
            {isSyncing ? 'Syncing reports…' : `${pendingCount} report${pendingCount !== 1 ? 's' : ''} queued for sync`}
          </p>
          {isOnline && !isSyncing && (
            <button onClick={() => syncNow()} className="text-[10px] font-bold text-blue-600 underline">Sync</button>
          )}
        </div>
      )}

      {/* Norvi AI suggestions */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-cropguard-dark rounded-md flex items-center justify-center shrink-0">
              <Leaf className="w-3 h-3 text-cropguard-light" />
            </div>
            <p className="text-xs font-bold text-cropguard-dark">Norvi AI Suggestions</p>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className={cn('flex items-start gap-3 rounded-xl border p-3', URGENCY_STYLES[s.urgency])}
                >
                  <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', URGENCY_ICON[s.urgency])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                    <p className="text-[10px] text-gray-600 leading-snug mt-0.5">{s.preview}</p>
                  </div>
                  <button
                    onClick={() => openCompose(s.type)}
                    className="flex items-center gap-1 bg-cropguard-dark text-white text-[9px] font-bold px-2 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Write
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('submitted')}
          className={cn('flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-colors',
            tab === 'submitted' ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500')}
        >
          Submitted ({submitted.length})
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={cn('flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-colors',
            tab === 'drafts' ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500')}
        >
          Drafts {drafts.length > 0 && <span className="ml-1 bg-amber-400 text-white text-[8px] px-1 rounded-full">{drafts.length}</span>}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : tab === 'submitted' ? (
        submitted.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No reports submitted yet.</p>
            <button onClick={() => openCompose()} className="text-xs text-cropguard-mid mt-2 underline">
              Write your first report
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {submitted.map(r => <SubmittedCard key={r.id} report={r} />)}
          </div>
        )
      ) : (
        drafts.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No drafts saved locally.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map(d => (
              <DraftCard
                key={d.id}
                draft={d}
                onEdit={draft => openCompose(draft.type, draft)}
                onDelete={handleDeleteDraft}
              />
            ))}
          </div>
        )
      )}

      {/* Compose modal */}
      {composing && (
        <ComposeForm
          initial={editingDraft}
          initialType={initialType}
          cohortData={cohortData}
          onClose={() => { setComposing(false); setEditingDraft(undefined); setInitialType(undefined); }}
          onSubmitted={() => {
            setComposing(false);
            setEditingDraft(undefined);
            setInitialType(undefined);
            loadAll();
          }}
        />
      )}
    </div>
  );
}
