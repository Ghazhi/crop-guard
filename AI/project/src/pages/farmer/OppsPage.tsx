import { useEffect, useState, useCallback } from 'react';
import {
  Zap, CheckCircle, Clock, XCircle, ChevronRight,
  Shield, Package, TrendingUp, Leaf, BookOpen, Star,
  AlertTriangle, Check, ArrowUpRight, Loader2, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LiveIntervention {
  id:                string;
  program_id:        string;
  name:              string;
  type:              string;
  description:       string | null;
  value_description: string;
  min_fri:           number;
  eligibility_rules: Array<{
    rule_id: string; label: string; field: string;
    operator: string; value: number; display_value: string;
  }>;
  improvement_steps: string[];
  capacity:          number | null;
  status:            string;
  approval_workflow: string;
  partner_name?:     string;
}

interface FarmerFacts {
  farmer_id:    string;
  enrollment_id:string | null;
  total_score:  number;
  p1_score:     number;
  p2_score:     number;
  p3_score:     number;
  p4_score:     number;
  eci_score:    number;
  credit_score: number | null;
  is_verified:  boolean;
}

interface Application {
  id:            string;
  intervention_id: string;
  status:        string;
  created_at:    string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
  'Input Loan':    Leaf,
  'Grant':         Star,
  'Insurance':     Shield,
  'Market Linkage':TrendingUp,
  'Advisory':      BookOpen,
  'Training':      BookOpen,
  'Recovery':      AlertTriangle,
};

const TYPE_BG: Record<string, string> = {
  'Input Loan':    'bg-cropguard-mint',
  'Grant':         'bg-emerald-50',
  'Insurance':     'bg-blue-50',
  'Market Linkage':'bg-amber-50',
  'Advisory':      'bg-teal-50',
  'Training':      'bg-sky-50',
  'Recovery':      'bg-red-50',
};

const TYPE_FG: Record<string, string> = {
  'Input Loan':    'text-cropguard-dark',
  'Grant':         'text-emerald-700',
  'Insurance':     'text-blue-700',
  'Market Linkage':'text-amber-700',
  'Advisory':      'text-teal-700',
  'Training':      'text-sky-700',
  'Recovery':      'text-red-700',
};

const APP_STATUS_LABEL: Record<string, string> = {
  submitted:    'Applied',
  'under review':'Under Review',
  approved:     'Approved',
  declined:     'Declined',
  active:       'Active',
  delivered:    'Delivered',
};

const APP_STATUS_COLOR: Record<string, string> = {
  submitted:    'text-blue-600',
  'under review':'text-amber-600',
  approved:     'text-emerald-600',
  active:       'text-emerald-700',
  delivered:    'text-emerald-700',
  declined:     'text-red-500',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function evalRule(facts: FarmerFacts, field: string, operator: string, value: number): boolean {
  const map: Record<string, number | null> = {
    fri_total:    facts.total_score,
    p1_score:     facts.p1_score,
    p2_score:     facts.p2_score,
    p3_score:     facts.p3_score,
    p4_score:     facts.p4_score,
    eci_score:    facts.eci_score,
    credit_score: facts.credit_score,
  };
  const v = map[field] ?? 0;
  if (operator === '>=') return v >= value;
  if (operator === '<=') return v <= value;
  if (operator === '==') return v === value;
  if (operator === '!=') return v !== value;
  return false;
}

function isEligible(iv: LiveIntervention, facts: FarmerFacts): boolean {
  if (facts.total_score < iv.min_fri) return false;
  if (iv.eligibility_rules.length === 0) return true;
  return iv.eligibility_rules.every(r => evalRule(facts, r.field, r.operator, r.value));
}

function friGap(iv: LiveIntervention, facts: FarmerFacts): number {
  const friGap = Math.max(0, iv.min_fri - facts.total_score);
  const ruleGaps = iv.eligibility_rules
    .filter(r => !evalRule(facts, r.field, r.operator, r.value) && r.field === 'fri_total')
    .map(r => Math.max(0, r.value - facts.total_score));
  return Math.max(friGap, ...ruleGaps, 0);
}

// ── FRI threshold bar ──────────────────────────────────────────────────────────

function ThresholdBar({ score, interventions }: { score: number | null; interventions: LiveIntervention[] }) {
  const thresholds = [...new Set([40, 60, 70, 80, ...(interventions.map(iv => iv.min_fri))])].sort((a, b) => a - b).filter(t => t > 0 && t <= 100);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Your FRI</p>
        <span className="text-lg font-black text-cropguard-dark">
          {score ?? '–'}<span className="text-xs font-normal text-gray-400">/100</span>
        </span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-visible">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width:      score !== null ? `${score}%` : '0%',
            background: 'linear-gradient(to right, #D94F3D, #E8963A, #3D7A56, #1A3D2B)',
          }}
        />
        {thresholds.map(t => (
          <div
            key={t}
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/70"
            style={{ left: `${t}%` }}
          />
        ))}
        {score !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-cropguard-dark rounded-full shadow transition-all duration-700"
            style={{ left: `calc(${score}% - 7px)` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        {thresholds.slice(0, 5).map(t => (
          <span key={t} className="text-[8px] text-gray-400">{t}</span>
        ))}
      </div>
    </div>
  );
}

// ── Opportunity card ───────────────────────────────────────────────────────────

interface CardProps {
  iv:          LiveIntervention;
  facts:       FarmerFacts;
  application: Application | null;
  onApply:     (iv: LiveIntervention) => void;
}

function OpportunityCard({ iv, facts, application, onApply }: CardProps) {
  const eligible = isEligible(iv, facts);
  const gap      = friGap(iv, facts);
  const Icon     = TYPE_ICON[iv.type] ?? Zap;
  const iconBg   = TYPE_BG[iv.type]  ?? 'bg-gray-100';
  const iconFg   = TYPE_FG[iv.type]  ?? 'text-gray-600';
  const appStatus = application?.status ?? null;

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-4 space-y-3',
      eligible ? 'border-cropguard-pale' : 'border-gray-100',
      appStatus === 'approved' || appStatus === 'active' ? 'border-emerald-200' : '',
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconFg)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-cropguard-forest">{iv.name}</p>
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{iv.type}</span>
          </div>
          {iv.partner_name && (
            <p className="text-[10px] text-cropguard-slate">{iv.partner_name}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {iv.description && (
        <p className="text-xs text-gray-600 leading-relaxed">{iv.description}</p>
      )}

      {/* Eligibility rules */}
      <div className="bg-gray-50 rounded-xl p-2.5 space-y-1">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Eligibility</p>
        {/* FRI threshold rule */}
        <div className="flex items-center gap-1.5">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', facts.total_score >= iv.min_fri ? 'bg-green-500' : 'bg-red-400')} />
          <span className="text-[10px] text-gray-600">FRI ≥ {iv.min_fri}</span>
        </div>
        {/* Additional rules from rule builder */}
        {iv.eligibility_rules.map(r => {
          const pass = evalRule(facts, r.field, r.operator, r.value);
          return (
            <div key={r.rule_id} className="flex items-center gap-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', pass ? 'bg-green-500' : 'bg-gray-300')} />
              <span className="text-[10px] text-gray-600">{r.label} {r.display_value}</span>
            </div>
          );
        })}
        {iv.capacity !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
            <span className="text-[10px] text-gray-600">Limited capacity ({iv.capacity} slots)</span>
          </div>
        )}
      </div>

      {/* Benefit + action */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Benefit</p>
          <p className="text-xs font-semibold text-cropguard-forest">{iv.value_description || '—'}</p>
        </div>
        {appStatus ? (
          <div className={cn('flex items-center gap-1 text-xs font-semibold', APP_STATUS_COLOR[appStatus] ?? 'text-blue-600')}>
            {(appStatus === 'approved' || appStatus === 'active' || appStatus === 'delivered')
              ? <CheckCircle className="w-3.5 h-3.5" />
              : appStatus === 'declined'
              ? <XCircle className="w-3.5 h-3.5" />
              : <Clock className="w-3.5 h-3.5" />
            }
            {APP_STATUS_LABEL[appStatus] ?? appStatus}
          </div>
        ) : eligible ? (
          <button
            onClick={() => onApply(iv)}
            className="text-xs bg-cropguard-dark text-white px-3 py-1.5 rounded-lg font-semibold active:scale-95 transition-transform"
          >
            Apply
          </button>
        ) : (
          <span className="text-[10px] text-gray-400 font-medium">Need +{gap} pts</span>
        )}
      </div>

      {/* Improvement steps for near-qualifying */}
      {!eligible && gap <= 20 && iv.improvement_steps.length > 0 && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">How to qualify</p>
          {iv.improvement_steps.slice(0, 2).map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <ArrowUpRight className="w-3 h-3 text-cropguard-green shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-600 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Application modal ──────────────────────────────────────────────────────────

function ApplyModal({
  iv, onClose, onConfirm, submitting,
}: {
  iv: LiveIntervention;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const [step, setStep] = useState<'details' | 'consent'>('details');
  const [consented, setConsented] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        {step === 'details' ? (
          <>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold text-cropguard-forest">{iv.name}</h3>
            {iv.description && <p className="text-sm text-gray-600">{iv.description}</p>}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What you'll receive</p>
              <p className="text-sm font-medium text-cropguard-dark">{iv.value_description || '—'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</p>
              <p className="text-sm text-gray-700">{iv.type}</p>
            </div>
            {iv.approval_workflow !== 'Auto' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  This application requires <strong>{iv.approval_workflow}</strong> review. You'll be notified within 3 working days.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={() => setStep('consent')} className="flex-1 py-3 bg-cropguard-dark rounded-xl text-sm font-semibold text-white">Continue</button>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
            <h3 className="text-base font-bold text-cropguard-forest">Consent & Declaration</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              By applying, you confirm that the information in your farm profile and check-ins is accurate and truthful.
              You consent to Asinyo and its partners using your farm data to process this application and deliver the programme benefit.
            </p>
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                className="mt-0.5 accent-cropguard-dark"
                checked={consented}
                onChange={e => setConsented(e.target.checked)}
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                I agree to the terms above and consent to the use of my farm data for this programme.
              </span>
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('details')} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Back</button>
              <button
                onClick={onConfirm}
                disabled={!consented || submitting}
                className={cn('flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity',
                  consented && !submitting ? 'bg-cropguard-dark' : 'bg-gray-300 opacity-60 cursor-not-allowed')}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Application'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = ['Available', 'Close', 'Applied', 'Not Yet'] as const;
type Tab = typeof TABS[number];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OppsPage() {
  const profile = useAuthStore(s => s.profile);

  const [facts,          setFacts]          = useState<FarmerFacts | null>(null);
  const [interventions,  setInterventions]  = useState<LiveIntervention[]>([]);
  const [applications,   setApplications]   = useState<Application[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState<Tab>('Available');
  const [pendingIv,      setPendingIv]      = useState<LiveIntervention | null>(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [successName,    setSuccessName]    = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // 1. Resolve farmer record
    const { data: farmerRow } = await supabase
      .from('farmers')
      .select('id, is_verified')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!farmerRow) { setLoading(false); return; }

    // 2. Active enrollment (to get program context + enrollment_id)
    const { data: enrRow } = await supabase
      .from('enrollments')
      .select('id, program_id')
      .eq('farmer_id', farmerRow.id)
      .eq('status', 'active')
      .maybeSingle();

    // 3. Latest FRI score
    const { data: scoreRow } = await (supabase.from('farmer_fri_scores') as any)
      .select('total_score, p1_score, p2_score, p3_score, p4_score, eci_score, credit_score')
      .eq('farmer_id', farmerRow.id)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    setFacts({
      farmer_id:    farmerRow.id,
      enrollment_id: enrRow?.id ?? null,
      total_score:  scoreRow?.total_score  ?? 0,
      p1_score:     scoreRow?.p1_score     ?? 0,
      p2_score:     scoreRow?.p2_score     ?? 0,
      p3_score:     scoreRow?.p3_score     ?? 0,
      p4_score:     scoreRow?.p4_score     ?? 0,
      eci_score:    scoreRow?.eci_score    ?? 0,
      credit_score: scoreRow?.credit_score ?? null,
      is_verified:  farmerRow.is_verified,
    });

    // 4. Interventions — either from enrolled program or all active ones visible to the org
    const ivQuery = supabase
      .from('interventions_catalog')
      .select('*')
      .eq('status', 'Active');
    if (enrRow?.program_id) {
      ivQuery.eq('program_id', enrRow.program_id);
    }
    const { data: ivRows } = await ivQuery.order('min_fri');
    setInterventions((ivRows ?? []) as LiveIntervention[]);

    // 5. Existing applications
    const { data: appRows } = await supabase
      .from('enrollments_opp')
      .select('id, product_type, status, created_at, metadata')
      .eq('farmer_id', farmerRow.id);

    // Map product_type → intervention_id via metadata
    setApplications(
      (appRows ?? []).map((a: any) => ({
        id:              a.id,
        intervention_id: a.metadata?.intervention_id ?? '',
        status:          a.status,
        created_at:      a.created_at,
      }))
    );

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  // ── Submit application ───────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!pendingIv || !facts) return;
    setSubmitting(true);

    const payload: any = {
      farmer_id:    facts.farmer_id,
      enrollment_id:facts.enrollment_id,
      product_type: pendingIv.type,
      status:       'submitted',
      metadata:     { intervention_id: pendingIv.id, intervention_name: pendingIv.name },
    };

    const { error } = await supabase.from('enrollments_opp').insert(payload);

    if (!error) {
      setSuccessName(pendingIv.name);
      setTimeout(() => setSuccessName(null), 4000);
      setPendingIv(null);
      await load();
    }
    setSubmitting(false);
    if (error) setPendingIv(null);
  }

  // ── Tab filtering ────────────────────────────────────────────────────────────

  const score = facts?.total_score ?? 0;

  const appMap = Object.fromEntries(applications.map(a => [a.intervention_id, a]));

  const filteredIvs = interventions.filter(iv => {
    const eligible = facts ? isEligible(iv, facts) : false;
    const gap      = iv.min_fri - score;
    const applied  = !!appMap[iv.id];
    if (activeTab === 'Available') return eligible && !applied;
    if (activeTab === 'Close')     return !eligible && !applied && gap <= 20;
    if (activeTab === 'Applied')   return applied;
    if (activeTab === 'Not Yet')   return !eligible && !applied && gap > 20;
    return false;
  });

  const countByTab: Record<Tab, number> = {
    Available: interventions.filter(iv => facts ? isEligible(iv, facts) && !appMap[iv.id] : false).length,
    Close:     interventions.filter(iv => {
      const gap = iv.min_fri - score;
      return facts ? !isEligible(iv, facts) && !appMap[iv.id] && gap <= 20 : false;
    }).length,
    Applied:   applications.length,
    'Not Yet': interventions.filter(iv => {
      const gap = iv.min_fri - score;
      return facts ? !isEligible(iv, facts) && !appMap[iv.id] && gap > 20 : false;
    }).length,
  };

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Page header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cropguard-forest">For You</h2>
          <p className="text-sm text-cropguard-slate">Programmes and benefits you can access</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />}
        {!loading && (
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* FRI bar — only shows after load */}
      {!loading && (
        <ThresholdBar score={facts?.total_score ?? null} interventions={interventions} />
      )}

      {/* Success toast */}
      {successName && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-700">Application submitted!</p>
            <p className="text-[11px] text-green-600">{successName} — we'll be in touch within 3 working days.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-colors relative',
              activeTab === tab ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500',
            )}
          >
            {tab}
            {countByTab[tab] > 0 && (
              <span className={cn(
                'ml-1 inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-bold rounded-full',
                activeTab === tab ? 'bg-cropguard-dark text-white' : 'bg-gray-400 text-white',
              )}>
                {countByTab[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded" />
              <div className="h-2.5 bg-gray-100 rounded w-4/5" />
              <div className="h-8 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredIvs.length === 0 ? (
        <EmptyState tab={activeTab} hasScore={facts !== null && facts.total_score > 0} />
      ) : (
        <div className="space-y-3">
          {filteredIvs.map(iv => (
            <OpportunityCard
              key={iv.id}
              iv={iv}
              facts={facts ?? {
                farmer_id: '', enrollment_id: null,
                total_score: 0, p1_score: 0, p2_score: 0,
                p3_score: 0, p4_score: 0, eci_score: 0,
                credit_score: null, is_verified: false,
              }}
              application={appMap[iv.id] ?? null}
              onApply={setPendingIv}
            />
          ))}
        </div>
      )}

      {/* Motivation nudge for Not Yet */}
      {activeTab === 'Not Yet' && filteredIvs.length > 0 && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">Keep improving your FRI score each week to unlock these programmes.</p>
        </div>
      )}

      {/* No active program notice */}
      {!loading && facts && !facts.enrollment_id && interventions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Not enrolled in a program</p>
          <p className="text-xs text-amber-600">Speak to your Asinyo agent to be enrolled in a programme and unlock opportunities.</p>
        </div>
      )}

      {/* Application modal */}
      {pendingIv && (
        <ApplyModal
          iv={pendingIv}
          onClose={() => setPendingIv(null)}
          onConfirm={handleConfirm}
          submitting={submitting}
        />
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ tab, hasScore }: { tab: Tab; hasScore: boolean }) {
  return (
    <div className="text-center py-10">
      {tab === 'Available' && !hasScore ? (
        <>
          <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Complete your first check-in to see available programmes</p>
        </>
      ) : tab === 'Available' ? (
        <>
          <Check className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No new programmes to apply for right now</p>
        </>
      ) : tab === 'Applied' ? (
        <>
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No applications yet</p>
          <p className="text-xs text-gray-400 mt-1">Switch to Available to apply</p>
        </>
      ) : tab === 'Close' ? (
        <>
          <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No programmes within 20 points of your FRI</p>
        </>
      ) : (
        <>
          <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No programmes in this category</p>
        </>
      )}
    </div>
  );
}
