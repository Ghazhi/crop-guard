import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Info, Loader2,
  ShieldCheck, CalendarDays, User, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import {
  BASELINE_P1_ITEMS, BASELINE_P2_ITEMS, BASELINE_P3_ITEMS, BASELINE_P4_ITEMS,
  COCOA_BASELINE_P1_ITEMS, COCOA_BASELINE_P2_ITEMS, COCOA_BASELINE_P3_ITEMS, COCOA_BASELINE_P4_ITEMS,
  SOYBEAN_BASELINE_P1_ITEMS, SOYBEAN_BASELINE_P2_ITEMS, SOYBEAN_BASELINE_P3_ITEMS, SOYBEAN_BASELINE_P4_ITEMS,
  ECI_ITEMS, ECI_MAX, COCOA_ECI_ITEMS, COCOA_ECI_MAX, SOYBEAN_ECI_ITEMS, SOYBEAN_ECI_MAX,
  runBaselineScoringPreview, runDynamicBaselineScoringPreview,
  assignZone, zoneShortLabel,
  type BaselineItemDef, type EciItemDef,
  BASELINE_PILLAR_MAX,
} from '@/lib/scoring';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type StepKey = 'p1' | 'p2' | 'p3' | 'p4' | 'eci';

interface TemplateItem {
  id: string;
  label: string;
  max: number;
  guidance: string;
}

interface BaselineTemplate {
  id: string;
  title: string;
  p1_items: TemplateItem[];
  p2_items: TemplateItem[];
  p3_items: TemplateItem[];
  p4_items: TemplateItem[];
  include_eci: boolean;
  eci_items: TemplateItem[];
}

interface StepDef {
  key:         StepKey;
  label:       string;
  description: string;
  items:       (BaselineItemDef | EciItemDef | TemplateItem)[];
  pillarMax:   number;
  color:       string;
}

interface CompletedBaseline {
  id:           string;
  assessed_at:  string;
  agent_id:     string | null;
  total_score:  number;
  zone:         string;
  p1_score?:    number;
  p2_score?:    number;
  p3_score?:    number;
  p4_score?:    number;
  eci_raw?:     number;
  agentName?:   string;
  template_id?: string | null;
  p1: Record<string, number>;
  p2: Record<string, number>;
  p3: Record<string, number>;
  p4: Record<string, number>;
  eci: Record<string, number>;
}

const DEFAULT_STEPS: StepDef[] = [
  { key: 'p1', label: 'P1 — Agronomy Readiness', description: 'Accumulated farming knowledge and agronomic practice', items: BASELINE_P1_ITEMS, pillarMax: BASELINE_PILLAR_MAX.p1, color: 'bg-cropguard-mint text-cropguard-forest' },
  { key: 'p2', label: 'P2 — CSA & Climate-Smart', description: 'Climate-smart agriculture practices in place on farm', items: BASELINE_P2_ITEMS, pillarMax: BASELINE_PILLAR_MAX.p2, color: 'bg-blue-50 text-blue-800' },
  { key: 'p3', label: 'P3 — Advisory & Commitment', description: 'Engagement with advisory services and cooperative structures', items: BASELINE_P3_ITEMS, pillarMax: BASELINE_PILLAR_MAX.p3, color: 'bg-amber-50 text-amber-800' },
  { key: 'p4', label: 'P4 — Farm Enterprise Discipline', description: 'Financial discipline and enterprise management', items: BASELINE_P4_ITEMS, pillarMax: BASELINE_PILLAR_MAX.p4, color: 'bg-rose-50 text-rose-800' },
  { key: 'eci', label: 'ECI — Eligibility & Compliance', description: 'Compliance layer assessed once at baseline (max 40 pts)', items: ECI_ITEMS, pillarMax: ECI_MAX, color: 'bg-gray-50 text-gray-800' },
];

const COCOA_DEFAULT_STEPS: StepDef[] = [
  { key: 'p1', label: 'P1 — Cocoa Agronomy Readiness', description: 'Cocoa farming experience, shade, pruning, pest & disease management', items: COCOA_BASELINE_P1_ITEMS, pillarMax: COCOA_BASELINE_P1_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-cropguard-mint text-cropguard-forest' },
  { key: 'p2', label: 'P2 — Cocoa CSA & Climate-Smart', description: 'Mulching, composting, soil conservation, water management', items: COCOA_BASELINE_P2_ITEMS, pillarMax: COCOA_BASELINE_P2_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-blue-50 text-blue-800' },
  { key: 'p3', label: 'P3 — Advisory & Commitment', description: 'Engagement with cocoa advisory services and cooperative structures', items: COCOA_BASELINE_P3_ITEMS, pillarMax: COCOA_BASELINE_P3_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-amber-50 text-amber-800' },
  { key: 'p4', label: 'P4 — Cocoa Farm Enterprise Discipline', description: 'Repayment, savings, fermentation quality, LBC arrangement', items: COCOA_BASELINE_P4_ITEMS, pillarMax: COCOA_BASELINE_P4_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-rose-50 text-rose-800' },
  { key: 'eci', label: 'ECI — Cocoa Eligibility & Compliance', description: 'COCOBOD registration, traceability, sustainability certification', items: COCOA_ECI_ITEMS, pillarMax: COCOA_ECI_MAX, color: 'bg-gray-50 text-gray-800' },
];

const SOYBEAN_DEFAULT_STEPS: StepDef[] = [
  { key: 'p1', label: 'P1 — Agronomy Readiness', description: 'Soybean farming experience, weed management, planting, fertilizer, pest & disease control', items: SOYBEAN_BASELINE_P1_ITEMS, pillarMax: SOYBEAN_BASELINE_P1_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-cropguard-mint text-cropguard-forest' },
  { key: 'p2', label: 'P2 — CSA & Climate-Smart', description: 'Mulching, composting, crop rotation, water harvesting, conservation tillage', items: SOYBEAN_BASELINE_P2_ITEMS, pillarMax: SOYBEAN_BASELINE_P2_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-blue-50 text-blue-800' },
  { key: 'p3', label: 'P3 — Advisory & Commitment', description: 'Training attendance, agronomist advice, cooperative visits and affiliation', items: SOYBEAN_BASELINE_P3_ITEMS, pillarMax: SOYBEAN_BASELINE_P3_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-amber-50 text-amber-800' },
  { key: 'p4', label: 'P4 — Farm Enterprise Discipline', description: 'Repayment history, savings, additional income, offtaker confirmation', items: SOYBEAN_BASELINE_P4_ITEMS, pillarMax: SOYBEAN_BASELINE_P4_ITEMS.reduce((s, i) => s + i.max, 0), color: 'bg-rose-50 text-rose-800' },
  { key: 'eci', label: 'ECI — Eligibility & Compliance', description: 'Income stability, financial stability, identity, production commitment, consent', items: SOYBEAN_ECI_ITEMS, pillarMax: SOYBEAN_ECI_MAX, color: 'bg-gray-50 text-gray-800' },
];

function buildStepsFromTemplate(tpl: BaselineTemplate): StepDef[] {
  return [
    { key: 'p1', label: 'P1 — Agronomy Readiness', description: 'Accumulated farming knowledge and agronomic practice', items: tpl.p1_items ?? [], pillarMax: (tpl.p1_items ?? []).reduce((s, i) => s + i.max, 0) || BASELINE_PILLAR_MAX.p1, color: 'bg-cropguard-mint text-cropguard-forest' },
    { key: 'p2', label: 'P2 — CSA & Climate-Smart', description: 'Climate-smart agriculture practices in place on farm', items: tpl.p2_items ?? [], pillarMax: (tpl.p2_items ?? []).reduce((s, i) => s + i.max, 0) || BASELINE_PILLAR_MAX.p2, color: 'bg-blue-50 text-blue-800' },
    { key: 'p3', label: 'P3 — Advisory & Commitment', description: 'Engagement with advisory services and cooperative structures', items: tpl.p3_items ?? [], pillarMax: (tpl.p3_items ?? []).reduce((s, i) => s + i.max, 0) || BASELINE_PILLAR_MAX.p3, color: 'bg-amber-50 text-amber-800' },
    { key: 'p4', label: 'P4 — Farm Enterprise Discipline', description: 'Financial discipline and enterprise management', items: tpl.p4_items ?? [], pillarMax: (tpl.p4_items ?? []).reduce((s, i) => s + i.max, 0) || BASELINE_PILLAR_MAX.p4, color: 'bg-rose-50 text-rose-800' },
    ...(tpl.include_eci ? [{ key: 'eci' as const, label: 'ECI — Eligibility & Compliance', description: 'Compliance layer assessed once at baseline', items: tpl.eci_items ?? [], pillarMax: (tpl.eci_items ?? []).reduce((s, i) => s + i.max, 0) || ECI_MAX, color: 'bg-gray-50 text-gray-800' }] : []),
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function zoneHex(score: number): string {
  if (score >= 80) return '#1A3D2B';
  if (score >= 60) return '#3D7A56';
  if (score >= 40) return '#E8963A';
  return '#D94F3D';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── ScoreSelector ──────────────────────────────────────────────────────────────

function ScoreSelector({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const steps = max <= 8 ? max : 6;
  return (
    <div className="flex gap-1 mt-2 flex-wrap">
      {Array.from({ length: steps + 1 }, (_, i) => {
        const score = max <= 8 ? i : Math.round((i / steps) * max);
        return (
          <button key={score} type="button" onClick={() => onChange(score)}
            className={cn('flex-1 min-w-[2rem] h-9 rounded-lg text-xs font-bold transition-all',
              value === score ? 'bg-cropguard-dark text-white shadow-sm scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
            {score}
          </button>
        );
      })}
    </div>
  );
}

// ── ItemRow ────────────────────────────────────────────────────────────────────

function ItemRow({ item, value, onChange }: { item: BaselineItemDef | EciItemDef | TemplateItem; value: number; onChange: (v: number) => void }) {
  const [showGuidance, setShowGuidance] = useState(false);
  const max = item.max;
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const quality =
    pct >= 80 ? { label: 'Excellent',    cls: 'bg-cropguard-mint text-cropguard-forest' } :
    pct >= 60 ? { label: 'Good',         cls: 'bg-blue-50 text-blue-700' }               :
    pct >= 40 ? { label: 'Acceptable',   cls: 'bg-amber-50 text-amber-700' }             :
    pct >  0  ? { label: 'Poor',         cls: 'bg-orange-50 text-orange-700' }           :
                { label: 'None/Unknown', cls: 'bg-red-50 text-red-600' };
  const guidance = (item as any).guidance ?? '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-3.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-800">{item.label}</p>
            {guidance && (
              <button type="button" onClick={() => setShowGuidance(v => !v)} className="text-gray-300 hover:text-cropguard-dark transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showGuidance && guidance && (
            <p className="text-xs text-blue-700 mt-1 bg-blue-50 px-2 py-1.5 rounded-lg leading-relaxed">{guidance}</p>
          )}
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', quality.cls)}>{quality.label}</span>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <ScoreSelector value={value} onChange={onChange} max={max} />
        <span className="text-[10px] text-gray-400 shrink-0 w-12 text-right">{value}/{max}</span>
      </div>
    </div>
  );
}

// ── StepSection ────────────────────────────────────────────────────────────────

function StepSection({ step, values, onChange }: { step: StepDef; values: Record<string, number>; onChange: (key: string, val: number) => void }) {
  const rawScore = step.items.reduce((s, item) => s + (values[item.id] ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className={cn('rounded-xl px-4 py-3 flex items-center justify-between', step.color)}>
        <div>
          <p className="font-bold text-sm">{step.label}</p>
          <p className="text-xs opacity-70">{step.description}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{rawScore}</p>
          <p className="text-xs opacity-60">/{step.pillarMax}</p>
        </div>
      </div>
      <div className="space-y-3">
        {step.items.map(item => (
          <ItemRow key={item.id} item={item} value={values[item.id] ?? 0} onChange={v => onChange(item.id, v)} />
        ))}
      </div>
    </div>
  );
}

// ── Completed status view ──────────────────────────────────────────────────────

function CompletedView({ baseline, onReassess, steps }: { baseline: CompletedBaseline; onReassess: () => void; steps: StepDef[] }) {
  const navigate = useNavigate();
  const { farmerId } = useParams<{ farmerId: string }>();
  const score = baseline.total_score;
  const hex   = zoneHex(score);

  const preview = useMemo(() => {
    if (baseline.template_id) {
      return runDynamicBaselineScoringPreview({
        p1: baseline.p1, p2: baseline.p2, p3: baseline.p3, p4: baseline.p4, eci: baseline.eci,
        p1Items: (steps.find(s => s.key === 'p1')?.items ?? []) as { id: string; max: number }[],
        p2Items: (steps.find(s => s.key === 'p2')?.items ?? []) as { id: string; max: number }[],
        p3Items: (steps.find(s => s.key === 'p3')?.items ?? []) as { id: string; max: number }[],
        p4Items: (steps.find(s => s.key === 'p4')?.items ?? []) as { id: string; max: number }[],
        eciItems: (steps.find(s => s.key === 'eci')?.items ?? []) as { id: string; max: number }[],
      });
    }
    return runBaselineScoringPreview({ p1: baseline.p1, p2: baseline.p2, p3: baseline.p3, p4: baseline.p4, eci: baseline.eci });
  }, [baseline, steps]);

  const eciStep = steps.find(s => s.key === 'eci');
  const eciRaw = eciStep ? eciStep.items.reduce((s, i) => s + Math.min(baseline.eci[i.id] ?? 0, i.max), 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cropguard-forest text-white px-4 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate(`/agent/farmers/${farmerId}/profile`)} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </button>
          <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Baseline Assessment</span>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-cropguard-dark px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Baseline Assessment Complete</p>
              <p className="text-xs text-cropguard-pale">This farmer has already been assessed</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cropguard-mint rounded-lg flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-cropguard-dark" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Assessment date</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(baseline.assessed_at)}</p>
              </div>
            </div>
            {baseline.agentName && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cropguard-mint rounded-lg flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-cropguard-dark" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Assessed by</p>
                  <p className="text-sm font-semibold text-gray-800">{baseline.agentName}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-3 font-semibold">Baseline FRI Score</p>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-5xl font-black" style={{ color: hex }}>{score}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1">{zoneShortLabel(assignZone(score))}</p>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { label: 'P1 Agronomy',   score: preview.p1_score },
                { label: 'P2 CSA',         score: preview.p2_score },
                { label: 'P3 Advisory',    score: preview.p3_score },
                { label: 'P4 Enterprise',  score: preview.p4_score },
              ].map(p => (
                <div key={p.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-gray-500">{p.label}</span>
                    <span className="font-bold text-gray-700">{p.score}/100</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-cropguard-dark transition-all" style={{ width: `${p.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {eciStep && (
            <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">ECI Score</p>
                <p className="text-lg font-black text-gray-800">{eciRaw}<span className="text-xs font-normal text-gray-400">/{eciStep.pillarMax}</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recorded Responses</p>
          {steps.map(step => {
            const stepValues = baseline[step.key as keyof Pick<CompletedBaseline, 'p1'|'p2'|'p3'|'p4'|'eci'>] as Record<string, number>;
            const raw = step.items.reduce((s, i) => s + (stepValues[i.id] ?? 0), 0);
            return (
              <details key={step.key} className="bg-white rounded-xl border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold', step.color)}>{step.key.toUpperCase()}</div>
                    <p className="text-sm font-semibold text-gray-800">{step.label.split('—')[1]?.trim()}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-700">{raw}/{step.pillarMax}</span>
                </summary>
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-2">
                  {step.items.map(item => {
                    const val = stepValues[item.id] ?? 0;
                    const max = item.max;
                    const pct = max > 0 ? Math.round((val / max) * 100) : 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <p className="text-xs text-gray-600 flex-1">{item.label}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-cropguard-dark rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 w-8 text-right">{val}/{max}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>

        <Button className="w-full bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => navigate(`/agent/farmers/${farmerId}/profile`)}>
          Back to Farmer Profile
        </Button>
        <ReassessSection onConfirm={onReassess} />
      </div>
    </div>
  );
}

function ReassessSection({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dashed border-gray-200 rounded-2xl p-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" /> Re-assess this farmer
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 bg-amber-50 rounded-xl p-3 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Re-assessing will <strong>replace</strong> the existing baseline. This affects the farmer's FRI score, credit score, and programme eligibility. Only re-assess if new information significantly changes the farmer's profile.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold">Proceed with Re-assess</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────

export default function BaselineAssessmentForm() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate     = useNavigate();
  const { profile }  = useAuthStore();

  const [step,        setStep]        = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [completed,   setCompleted]   = useState<CompletedBaseline | null>(null);
  const [reassessing, setReassessing] = useState(false);
  const [template,    setTemplate]    = useState<BaselineTemplate | null>(null);
  const [templateId,  setTemplateId]  = useState<string | null>(null);
  const [farmerCrop,  setFarmerCrop]  = useState<string>('maize');

  const [p1,  setP1]  = useState<Record<string, number>>({});
  const [p2,  setP2]  = useState<Record<string, number>>({});
  const [p3,  setP3]  = useState<Record<string, number>>({});
  const [p4,  setP4]  = useState<Record<string, number>>({});
  const [eci, setEci] = useState<Record<string, number>>({});

  const steps = useMemo<StepDef[]>(() => {
    if (template) return buildStepsFromTemplate(template);
    if (farmerCrop === 'cocoa') return COCOA_DEFAULT_STEPS;
    if (farmerCrop === 'soybean') return SOYBEAN_DEFAULT_STEPS;
    return DEFAULT_STEPS;
  }, [template, farmerCrop]);

  // Load existing active baseline + cohort-linked template on mount
  useEffect(() => {
    if (!farmerId) { setLoading(false); return; }
    (async () => {
      // 1. Load existing baseline
      const { data: existing } = await (supabase.from('baseline_assessments') as any)
        .select('id, assessed_at, agent_id, total_score, zone, p1, p2, p3, p4, eci, template_id')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      // 2. Load farmer's crop type + cohort → baseline_template_id
      let cohortTemplateId: string | null = null;
      const { data: farmerRow } = await supabase
        .from('farmers').select('primary_crop').eq('id', farmerId).maybeSingle();
      const crop = (farmerRow as { primary_crop?: string } | null)?.primary_crop ?? 'maize';
      setFarmerCrop(crop);

      const { data: enrRaw } = await supabase
        .from('enrollments').select('cohort_id').eq('farmer_id', farmerId).eq('status', 'active').limit(1);
      const enrList = (enrRaw ?? []) as { cohort_id: string | null }[];
      const cohortId = enrList[0]?.cohort_id ?? null;

      if (cohortId) {
        const { data: cohort } = await supabase
          .from('cohorts').select('baseline_template_id').eq('id', cohortId).maybeSingle();
        cohortTemplateId = (cohort as any)?.baseline_template_id ?? null;
      }

      // 3. Load the template items
      if (cohortTemplateId) {
        const { data: tpl } = await supabase
          .from('baseline_templates')
          .select('id, title, p1_items, p2_items, p3_items, p4_items, include_eci, eci_items')
          .eq('id', cohortTemplateId)
          .maybeSingle();
        if (tpl) {
          setTemplate(tpl as BaselineTemplate);
          setTemplateId(cohortTemplateId);
        }
      }

      // 4. If existing baseline, show completed view
      if (existing) {
        let agentName: string | undefined;
        if (existing.agent_id) {
          const { data: agentRow } = await supabase
            .from('users').select('full_name').eq('id', existing.agent_id).maybeSingle();
          agentName = (agentRow as { full_name?: string } | null)?.full_name;
        }
        setCompleted({ ...existing, agentName });
      }

      setLoading(false);
    })();
  }, [farmerId]);

  const setters: Record<StepKey, React.Dispatch<React.SetStateAction<Record<string, number>>>> = {
    p1: setP1, p2: setP2, p3: setP3, p4: setP4, eci: setEci,
  };
  const values: Record<StepKey, Record<string, number>> = { p1, p2, p3, p4, eci };

  const preview = useMemo(() => {
    if (template) {
      return runDynamicBaselineScoringPreview({
        p1, p2, p3, p4, eci,
        p1Items: (steps.find(s => s.key === 'p1')?.items ?? []) as { id: string; max: number }[],
        p2Items: (steps.find(s => s.key === 'p2')?.items ?? []) as { id: string; max: number }[],
        p3Items: (steps.find(s => s.key === 'p3')?.items ?? []) as { id: string; max: number }[],
        p4Items: (steps.find(s => s.key === 'p4')?.items ?? []) as { id: string; max: number }[],
        eciItems: (steps.find(s => s.key === 'eci')?.items ?? []) as { id: string; max: number }[],
      });
    }
    return runBaselineScoringPreview({ p1, p2, p3, p4, eci });
  }, [p1, p2, p3, p4, eci, template, steps]);

  const isReview    = step === steps.length;
  const currentStep = isReview ? null : steps[step];

  const handleSave = async () => {
    if (!profile || !farmerId) return;
    setSaving(true); setError('');
    try {
      const { data: enrRaw } = await supabase
        .from('enrollments').select('id').eq('farmer_id', farmerId).eq('status', 'active').limit(1);
      const enrList = (enrRaw ?? []) as { id: string }[];
      const enr = enrList[0] ?? null;
      if (!enr) throw new Error('No active enrollment found. Enroll this farmer in a programme first.');

      const { data: farmerRaw } = await supabase
        .from('farmers').select('organisation_id').eq('id', farmerId).maybeSingle();
      const farmer = farmerRaw as { organisation_id: string } | null;
      if (!farmer) throw new Error('Farmer not found.');

      const { error: insertErr } = await (supabase.from('baseline_assessments') as any).insert({
        enrollment_id: enr.id,
        farmer_id:     farmerId,
        agent_id:      profile.id,
        template_id:   templateId,
        p1, p2, p3, p4, eci,
        total_score:   preview.total_score,
        zone:          preview.zone,
        assessed_at:   new Date().toISOString(),
        is_active:     true,
      });
      if (insertErr) throw new Error(insertErr.message);

      await (supabase.from('farmer_fri_scores') as any).upsert({
        farmer_id:       farmerId,
        enrollment_id:   enr.id,
        organisation_id: farmer.organisation_id,
        week_number:     0,
        total_score:     preview.total_score,
        p1_score:        Math.round((preview.p1_score / 100) * 30),
        p2_score:        Math.round((preview.p2_score / 100) * 30),
        p3_score:        Math.round((preview.p3_score / 100) * 20),
        p4_score:        Math.round((preview.p4_score / 100) * 20),
        eci_score:       preview.eci_score,
        credit_score:    preview.credit_score,
        zone:            preview.zone,
        raw_responses:   { p1, p2, p3, p4, eci },
        is_provisional:  false,
        crop_type:       farmerCrop,
      }, { onConflict: 'farmer_id,week_number' });

      await supabase.from('farmers')
        .update({ current_fri_score: preview.total_score } as never)
        .eq('id', farmerId);

      setCompleted({
        id:           '',
        assessed_at:  new Date().toISOString(),
        agent_id:     profile.id,
        agentName:    profile.full_name,
        total_score:  preview.total_score,
        zone:         preview.zone,
        template_id:  templateId,
        p1, p2, p3, p4, eci,
      });
      setReassessing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-cropguard-dark" />
      </div>
    );
  }

  if (completed && !reassessing) {
    return (
      <CompletedView
        baseline={completed}
        steps={steps}
        onReassess={() => {
          setP1(completed.p1 ?? {});
          setP2(completed.p2 ?? {});
          setP3(completed.p3 ?? {});
          setP4(completed.p4 ?? {});
          setEci(completed.eci ?? {});
          setStep(0);
          setReassessing(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cropguard-forest text-white px-4 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { if (step === 0) { reassessing ? setReassessing(false) : navigate(-1); } else { setStep(s => s - 1); } }}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? (reassessing ? 'Cancel Re-assess' : 'Cancel') : 'Back'}
          </button>
          <span className="text-xs text-white/60">{isReview ? 'Review' : `${step + 1} / ${steps.length}`}</span>
        </div>
        <h1 className="text-base font-bold mb-2">{reassessing ? 'Re-assess Farmer' : 'Baseline Assessment'}</h1>
        {template && <p className="text-xs text-cropguard-light mb-2">Template: {template.title}</p>}
        {reassessing && <p className="text-xs text-amber-300 mb-2">Replacing existing baseline</p>}
        <Progress value={(step / steps.length) * 100} className="h-1 bg-white/20 [&>div]:bg-cropguard-light" />
        <div className="flex gap-4 mt-3 text-xs text-white/70 flex-wrap">
          <span>FRI: <strong className="text-white">{preview.total_score}</strong></span>
          <span>Zone: <strong className={preview.zone === 'Resilience Leader' ? 'text-cropguard-light' : preview.zone === 'Resilience Builder' ? 'text-blue-300' : preview.zone === 'Resilience Learner' ? 'text-amber-300' : 'text-red-300'}>{zoneShortLabel(preview.zone)}</strong></span>
          <span>ECI: <strong className="text-white">{preview.eci_raw}/{steps.find(s => s.key === 'eci')?.pillarMax ?? ECI_MAX}</strong></span>
        </div>
      </div>

      <div className="p-4 pb-24">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

        {isReview ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Review & Submit</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Baseline FRI Score</p>
                  <p className="text-5xl font-bold mt-1" style={{ color: zoneHex(preview.total_score) }}>{preview.total_score}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge className="text-xs bg-cropguard-mint text-cropguard-dark border-0">{zoneShortLabel(preview.zone)}</Badge>
                  <p className="text-xs text-gray-500">ECI: {preview.eci_raw}/{steps.find(s => s.key === 'eci')?.pillarMax ?? ECI_MAX}</p>
                </div>
              </div>
            </div>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 space-y-3">
                {[
                  { key: 'p1', label: 'P1 — Agronomy',     score: preview.p1_score },
                  { key: 'p2', label: 'P2 — Climate-Smart', score: preview.p2_score },
                  { key: 'p3', label: 'P3 — Advisory',      score: preview.p3_score },
                  { key: 'p4', label: 'P4 — Enterprise',    score: preview.p4_score },
                ].map(p => (
                  <div key={p.key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600">{p.label}</span>
                      <span className="font-bold text-gray-800">{p.score}/100</span>
                    </div>
                    <Progress value={p.score} />
                  </div>
                ))}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">ECI (raw)</span>
                    <span className="font-bold text-gray-700">{preview.eci_raw}/{steps.find(s => s.key === 'eci')?.pillarMax ?? ECI_MAX}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">ECI (normalised)</span>
                    <span className="font-bold text-gray-700">{preview.eci_score}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button className="w-full bg-cropguard-dark hover:bg-cropguard-forest" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : reassessing ? 'Save Revised Assessment' : 'Save Baseline Assessment'}
            </Button>
          </div>
        ) : currentStep ? (
          <StepSection step={currentStep} values={values[currentStep.key]} onChange={(k, v) => setters[currentStep.key](prev => ({ ...prev, [k]: v }))} />
        ) : null}
      </div>

      {!isReview && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { if (step > 0) setStep(s => s - 1); else if (reassessing) setReassessing(false); else navigate(-1); }}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {step === 0 ? (reassessing ? 'Cancel' : 'Cancel') : 'Back'}
          </Button>
          <Button className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => setStep(s => s + 1)}>
            {step === steps.length - 1 ? 'Review' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
