import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Download, TrendingUp, TrendingDown, Minus, RefreshCw, X,
  User, MapPin, Crop, Calendar, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, BarChart3, ShieldCheck, Shield, Phone, Hash,
  Building2, Users, Layers, ClipboardCheck, Camera, XCircle, AlertTriangle, Info, Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Program, Cohort } from '@/types';
import type { RiskCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { REGION_LABELS, CROP_LABELS, RISK_CATEGORY_COLORS, RISK_CATEGORY_LABELS, GENDER_LABELS } from '@/lib/constants';
import type { CropType } from '@/types';
import { cn } from '@/lib/utils';
import { NorviOutput } from '@/components/NorviOutput';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  WEEKLY_ACTIVITIES,
  BASELINE_P1_ITEMS, BASELINE_P2_ITEMS, BASELINE_P3_ITEMS, BASELINE_P4_ITEMS,
  COCOA_BASELINE_P1_ITEMS, COCOA_BASELINE_P2_ITEMS, COCOA_BASELINE_P3_ITEMS, COCOA_BASELINE_P4_ITEMS,
  SOYBEAN_BASELINE_P1_ITEMS, SOYBEAN_BASELINE_P2_ITEMS, SOYBEAN_BASELINE_P3_ITEMS, SOYBEAN_BASELINE_P4_ITEMS,
  ECI_ITEMS, ECI_MAX,
  COCOA_ECI_ITEMS, COCOA_ECI_MAX,
  SOYBEAN_ECI_ITEMS, SOYBEAN_ECI_MAX,
  PILLAR_MAX, BASELINE_PILLAR_MAX,
  type BaselineItemDef, type EciItemDef,
} from '@/lib/scoring';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FRIScore {
  id:             string;
  farmer_id:      string;
  week_number:    number;
  total_score:    number;
  p1_score:       number;
  p2_score:       number;
  p3_score:       number;
  p4_score:       number;
  eci_score:      number;
  credit_score:   number | null;
  zone:           string;
  score_status:   string;
  is_provisional: boolean;
  season_average: number | null;
  created_at:     string;
  raw_responses?: any;
}

interface BaselineRecord {
  id:           string;
  assessed_at:  string;
  agent_id:     string | null;
  is_active:    boolean;
  total_score:  number;
  zone:         string;
  p1:           Record<string, number>;
  p2:           Record<string, number>;
  p3:           Record<string, number>;
  p4:           Record<string, number>;
  eci:          Record<string, number>;
  agentName?:   string;
}

interface CheckinResponse {
  activity_code:   string;
  farmer_response: string;
  agent_response:  string | null;
  is_flagged:      boolean;
  evidence_url:    string | null;
  score?:          number;
  description?:    string;
}

interface CheckinRecord {
  id:               string;
  farmer_id:        string;
  week_number:      number;
  status:           string;
  is_verified:      boolean;
  verified_at:      string | null;
  verified_by:      string | null;
  help_requested:   boolean;
  challenge_notes:  string | null;
  created_at:       string;
  is_agent_only:    boolean;
  responses:        CheckinResponse[];
  verifiedByName?:  string;
  friScore?:        { p1: number; p2: number; p3: number; p4: number; total: number; is_provisional: boolean };
}

interface QuestionMeta {
  label:       string;
  pillar:      string;
  description?: string;
}

interface FRIFarmer {
  id:                 string;
  full_name:          string;
  phone:              string;
  national_id:        string | null;
  date_of_birth:      string | null;
  gender:             string | null;
  region:             string;
  district:           string | null;
  community:          string | null;
  gps_address:        string | null;
  primary_crop:       string;
  total_farm_size_ha: number;
  risk_category:      RiskCategory | null;
  current_fri_score:  number | null;
  is_verified:        boolean;
  photo_url:          string | null;
  latestScore?:       FRIScore;
  prevScore?:         FRIScore;
  trajectory:         'up' | 'down' | 'flat' | 'new';
  recommendation:     string;
  baseline?:          BaselineRecord;
  checkins:           CheckinRecord[];
  enrollment?:        { id: string; status: string; enrolled_at: string; program_name?: string; cohort_name?: string; agentName?: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────

function normalizeZone(raw: string | null | undefined): string {
  if (!raw) return '';
  const z = raw.toLowerCase();
  if (z === 'resilience leader' || z === 'green' || z === 'zone1') return 'Resilience Leader';
  if (z === 'resilience builder' || z === 'lime' || z === 'zone2') return 'Resilience Builder';
  if (z === 'resilience learner' || z === 'yellow' || z === 'amber' || z === 'orange' || z === 'zone3') return 'Resilience Learner';
  if (z === 'resilience starter' || z === 'red' || z === 'zone4') return 'Resilience Starter';
  return raw;
}

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  'bg-emerald-700 text-white',
  'Resilience Builder': 'bg-emerald-500 text-white',
  'Resilience Learner': 'bg-amber-500 text-white',
  'Resilience Starter': 'bg-red-500 text-white',
};

const ZONE_BG: Record<string, string> = {
  'Resilience Leader':  'bg-emerald-50 border-emerald-200',
  'Resilience Builder': 'bg-green-50 border-green-200',
  'Resilience Learner': 'bg-amber-50 border-amber-200',
  'Resilience Starter': 'bg-red-50 border-red-200',
};

const ZONE_HEX: Record<string, string> = {
  'Resilience Leader':  '#065f46',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#d97706',
  'Resilience Starter': '#dc2626',
};

const PILLAR_COLORS = ['bg-cropguard-green', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500'];
const PILLAR_TEXT   = ['text-cropguard-forest', 'text-blue-700', 'text-amber-700', 'text-rose-700'];

function recommendation(score: number): string {
  if (score >= 80) return 'Approve — Premium Tier';
  if (score >= 60) return 'Approve — Standard';
  if (score >= 40) return 'Conditional — Review P4';
  return 'Hold — Requires Intervention';
}

function creditRiskLabel(score: number | null): { label: string; cls: string } {
  if (score == null)  return { label: '—',        cls: 'text-gray-400'    };
  if (score >= 700)   return { label: 'Low Risk',      cls: 'text-emerald-600' };
  if (score >= 550)   return { label: 'Medium Risk',   cls: 'text-amber-600'   };
  if (score >= 400)   return { label: 'High Risk',     cls: 'text-orange-600'  };
  return               { label: 'Critical Risk',  cls: 'text-red-600'     };
}

function trajectoryLabel(t: string) {
  if (t === 'up')   return { icon: TrendingUp,   cls: 'text-emerald-600', label: 'Improving' };
  if (t === 'down') return { icon: TrendingDown, cls: 'text-red-500',     label: 'Declining' };
  if (t === 'flat') return { icon: Minus,        cls: 'text-gray-400',    label: 'Stable'    };
  return { icon: Minus, cls: 'text-blue-400', label: 'New' };
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcAge(dob: string | null): string {
  if (!dob) return '—';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${age} yrs`;
}

// ── FRI arc gauge ─────────────────────────────────────────────────────────────

function FRIArc({ score, zone }: { score: number | null; zone: string }) {
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  const color = ZONE_HEX[normalizeZone(zone)] ?? (score === null ? '#E5E7EB' : '#374151');
  const filled = score !== null ? (score / 100) * circ * 0.75 : 0;
  const label = normalizeZone(zone).replace('Resilience ', '') || '—';
  return (
    <svg width="140" height="108" viewBox="0 0 140 108">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth="9"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${filled} ${circ - filled + circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cx - 5} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1A3D2B">
        {score ?? '–'}
      </text>
      <text x={cx} y={cx + 15} textAnchor="middle" fontSize="11" fontWeight="600" fill="#4A5568">
        {label}
      </text>
    </svg>
  );
}

function ScoreTrendTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow text-xs font-semibold text-cropguard-dark">
      {payload[0].value} pts
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color ?? 'text-cropguard-dark')}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function PillarBar({ label, score, max, colorCls }: { label: string; score: number; max: number; colorCls: string }) {
  const pct = Math.min(Math.round((score / max) * 100), 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-bold text-gray-700">{score}<span className="text-gray-400 font-normal">/{max}</span></span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', colorCls)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400">{pct}%</p>
    </div>
  );
}

function ScoreBadge({ score, zone }: { score: number; zone: string }) {
  const z = normalizeZone(zone);
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold" style={{ color: ZONE_HEX[z] ?? '#374151' }}>{score}</span>
      <Badge className={cn('text-[9px] border-0', ZONE_COLORS[z] ?? 'bg-gray-100 text-gray-600')}>
        {z.replace('Resilience ', '')}
      </Badge>
    </div>
  );
}

// ── Checkin week row ──────────────────────────────────────────────────────────

const COMPONENT_TO_PILLAR: Record<string, string> = {
  agronomy:              'p1',
  climate_smart:         'p2',
  advisory_commitment:   'p3',
  farm_enterprise:       'p4',
};

function CheckinWeekRow({ checkin, questionMap, expanded, onToggle }: {
  checkin:     CheckinRecord;
  questionMap: Record<string, QuestionMeta>;
  expanded:    boolean;
  onToggle:    () => void;
}) {
  const statusConfig = {
    verified:   { icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50', label: 'Verified' },
    submitted:  { icon: Clock,        cls: 'text-blue-600 bg-blue-50',       label: 'Submitted' },
    draft:      { icon: Clock,        cls: 'text-gray-500 bg-gray-100',      label: 'Draft'     },
    pending:    { icon: AlertCircle,  cls: 'text-amber-600 bg-amber-50',     label: 'Pending'   },
  };
  const cfg = statusConfig[checkin.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  const PILLAR_LABELS: Record<string, string> = { p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4' };
  const PILLAR_DISPLAY = ['p1', 'p2', 'p3', 'p4'];

  type PillarColors = { bg: string; text: string };
  const PILLAR_STYLE: Record<string, PillarColors> = {
    p1: { bg: 'text-cropguard-forest bg-cropguard-mint', text: 'text-cropguard-forest' },
    p2: { bg: 'text-blue-700 bg-blue-50',               text: 'text-blue-700' },
    p3: { bg: 'text-amber-700 bg-amber-50',              text: 'text-amber-700' },
    p4: { bg: 'text-rose-700 bg-rose-50',               text: 'text-rose-700' },
  };

  // Use stored FRI scores (authoritative, written by agent verification)
  const fri = checkin.friScore;
  const pillarData = [
    { key: 'p1', score: fri?.p1 ?? 0, max: PILLAR_MAX.P1 },
    { key: 'p2', score: fri?.p2 ?? 0, max: PILLAR_MAX.P2 },
    { key: 'p3', score: fri?.p3 ?? 0, max: PILLAR_MAX.P3 },
    { key: 'p4', score: fri?.p4 ?? 0, max: PILLAR_MAX.P4 },
  ];
  const totalScore = fri?.total ?? 0;

  // Build response lookup: activity_code -> response row
  const respMap: Record<string, CheckinResponse> = {};
  checkin.responses.forEach(r => { respMap[r.activity_code] = r; });

  // Collect all activity codes from responses, ordered by pillar
  const allActivityCodes = checkin.responses.map(r => r.activity_code);
  const orderedCodes = allActivityCodes
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => {
      const pa = (respMap[a] as any)?.pillar ?? questionMap[a]?.pillar ?? 'p4';
      const pb = (respMap[b] as any)?.pillar ?? questionMap[b]?.pillar ?? 'p4';
      return PILLAR_DISPLAY.indexOf(pa) - PILLAR_DISPLAY.indexOf(pb);
    });

  // Compute max points per activity for each pillar (pillar max / activity count in that pillar)
  const activityCountByPillar: Record<string, number> = {};
  orderedCodes.forEach(code => {
    const pillar = (respMap[code] as any)?.pillar ?? questionMap[code]?.pillar ?? 'p1';
    activityCountByPillar[pillar] = (activityCountByPillar[pillar] ?? 0) + 1;
  });
  const maxPerActivity: Record<string, number> = {};
  Object.keys(activityCountByPillar).forEach(p => {
    const maxKey = p.toUpperCase() as keyof typeof PILLAR_MAX;
    maxPerActivity[p] = Math.round((PILLAR_MAX[maxKey] ?? 0) / (activityCountByPillar[p] || 1));
  });

  const agentVerdictLabel: Record<string, string> = {
    verified:      'Verified',
    not_verified:  'Not Verified',
    under_review:  'Under Review',
  };
  const agentVerdictBadge: Record<string, string> = {
    verified:      'bg-emerald-100 text-emerald-700',
    not_verified:  'bg-red-100 text-red-600',
    under_review:  'bg-amber-100 text-amber-700',
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">W{checkin.week_number}</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">Week {checkin.week_number}</p>
            <p className="text-[11px] text-gray-400">{formatDate(checkin.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {checkin.is_agent_only && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" /> Agent Only
            </span>
          )}
          {checkin.help_requested && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">Help needed</span>
          )}
          {fri && (
            <span className="text-xs font-bold text-gray-700">{totalScore}</span>
          )}
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1', cfg.cls)}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 space-y-4 border-t border-gray-100">
          {checkin.is_verified && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified by <strong>{checkin.verifiedByName ?? 'Agent'}</strong> on {formatDate(checkin.verified_at)}</span>
            </div>
          )}
          {checkin.challenge_notes && (
            <div className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
              <strong>Challenge:</strong> {checkin.challenge_notes}
            </div>
          )}

          {/* Pillar score summary from stored FRI */}
          {fri ? (
            <div className="grid grid-cols-4 gap-2 text-center">
              {pillarData.map(p => {
                const { bg } = PILLAR_STYLE[p.key] ?? { bg: 'text-gray-600 bg-gray-50' };
                return (
                  <div key={p.key} className={cn('rounded-lg p-2', bg)}>
                    <p className="font-bold text-xs">{PILLAR_LABELS[p.key]}</p>
                    <p className="text-[10px] font-semibold">{p.score}/{p.max}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-[11px] text-gray-400 py-2">
              No FRI score recorded for this week.
            </div>
          )}

          {/* Activity list — per-question verdict + points */}
          {orderedCodes.length > 0 ? (
            <div className="space-y-1">
              {orderedCodes.map(code => {
                const r = respMap[code];
                if (!r) return null;
                const q = questionMap[code];
                const label = (r as any).label ?? q?.label ?? code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const description = (r as any).description ?? q?.description;
                const pillar = ((r as any).pillar ?? q?.pillar ?? 'p1') as string;
                const { text, bg } = PILLAR_STYLE[pillar] ?? { text: 'text-gray-600', bg: 'text-gray-600 bg-gray-50' };

                const hasEvidence = !!r.evidence_url;
                const maxPts = maxPerActivity[pillar] ?? 0;
                const verdict = r.agent_response ?? null;
                const farmerResp = r.farmer_response ?? 'no';
                const actualPts = verdict === 'verified'
                  ? farmerResp === 'yes'     ? maxPts
                    : farmerResp === 'partial' ? Math.round(maxPts / 2)
                    : 0
                  : 0;
                const scoreExplanation = verdict === 'verified'
                  ? farmerResp === 'yes'
                    ? `Full points awarded — farmer confirmed the activity and the agent verified it.`
                    : farmerResp === 'partial'
                      ? `Half points awarded — farmer partially completed the activity, verified by agent.`
                      : `No points — agent verified but farmer reported not doing this activity.`
                  : verdict === 'not_verified'
                    ? `No points awarded — this activity has not been verified by the field agent.`
                    : verdict === 'under_review'
                      ? `Pending review — the agent has not yet confirmed this activity. Score is provisional.`
                      : `No verification recorded yet for this activity.`;

                return (
                  <div key={code} className="py-1.5 px-2 rounded-lg hover:bg-white transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {r.is_flagged && <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <span className={cn('text-[11px] font-medium', r.is_flagged ? 'text-red-700' : 'text-gray-700')}>{label}</span>
                          <span className={cn('ml-1.5 text-[9px] font-medium uppercase', text)}>{pillar.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Verdict badge — always shown */}
                        {verdict && (
                          <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 capitalize',
                            verdict === 'verified'     ? 'bg-emerald-100 text-emerald-700' :
                            verdict === 'not_verified' ? 'bg-red-100 text-red-600'         :
                            verdict === 'under_review' ? 'bg-amber-100 text-amber-700'      :
                                                         'bg-gray-100 text-gray-500')}>
                            {verdict === 'verified' && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {verdict === 'not_verified' && <XCircle className="w-2.5 h-2.5" />}
                            {verdict === 'under_review' && <AlertTriangle className="w-2.5 h-2.5" />}
                            {agentVerdictLabel[verdict as keyof typeof agentVerdictLabel] ?? verdict}
                          </span>
                        )}
                        {/* Points: actual / max */}
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', bg)}>
                          {actualPts}/{maxPts}
                        </span>
                        {hasEvidence && (
                          <span className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center" title="Evidence photo attached">
                            <Camera className="w-2.5 h-2.5 text-blue-500" />
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Activity description + score explanation */}
                    {(description || scoreExplanation) && (
                      <div className="ml-5 mt-1 space-y-0.5">
                        {description && (
                          <p className="text-[10px] text-gray-400 leading-relaxed">{description}</p>
                        )}
                        <p className="text-[10px] text-gray-500 leading-relaxed flex items-start gap-1">
                          <Info className="w-2.5 h-2.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{scoreExplanation}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-[11px] text-gray-400 py-2">
              No activity responses recorded.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Baseline section ──────────────────────────────────────────────────────────

function detectBaselineItemSet(baseline: BaselineRecord): {
  p1Items: BaselineItemDef[]; p2Items: BaselineItemDef[]; p3Items: BaselineItemDef[]; p4Items: BaselineItemDef[];
  eciItems: EciItemDef[]; eciMax: number;
} {
  const allKeys = [
    ...Object.keys(baseline.p1 ?? {}),
    ...Object.keys(baseline.p2 ?? {}),
    ...Object.keys(baseline.p3 ?? {}),
    ...Object.keys(baseline.p4 ?? {}),
    ...Object.keys(baseline.eci ?? {}),
  ];
  const hasCocoa = allKeys.some(k => k.startsWith('cocoa_'));
  const hasSoy   = allKeys.some(k => k.startsWith('soy_'));
  if (hasCocoa) {
    return {
      p1Items: COCOA_BASELINE_P1_ITEMS, p2Items: COCOA_BASELINE_P2_ITEMS,
      p3Items: COCOA_BASELINE_P3_ITEMS, p4Items: COCOA_BASELINE_P4_ITEMS,
      eciItems: COCOA_ECI_ITEMS, eciMax: COCOA_ECI_MAX,
    };
  }
  if (hasSoy) {
    return {
      p1Items: SOYBEAN_BASELINE_P1_ITEMS, p2Items: SOYBEAN_BASELINE_P2_ITEMS,
      p3Items: SOYBEAN_BASELINE_P3_ITEMS, p4Items: SOYBEAN_BASELINE_P4_ITEMS,
      eciItems: SOYBEAN_ECI_ITEMS, eciMax: SOYBEAN_ECI_MAX,
    };
  }
  return {
    p1Items: BASELINE_P1_ITEMS, p2Items: BASELINE_P2_ITEMS,
    p3Items: BASELINE_P3_ITEMS, p4Items: BASELINE_P4_ITEMS,
    eciItems: ECI_ITEMS, eciMax: ECI_MAX,
  };
}

function BaselineSection({ baseline }: { baseline: BaselineRecord }) {
  const [open, setOpen] = useState(false);
  const itemSet = detectBaselineItemSet(baseline);
  const pillars = [
    { key: 'p1', label: 'P1 — Agronomy', items: itemSet.p1Items, responses: baseline.p1, max: BASELINE_PILLAR_MAX.p1, color: PILLAR_COLORS[0] },
    { key: 'p2', label: 'P2 — CSA',      items: itemSet.p2Items, responses: baseline.p2, max: BASELINE_PILLAR_MAX.p2, color: PILLAR_COLORS[1] },
    { key: 'p3', label: 'P3 — Advisory', items: itemSet.p3Items, responses: baseline.p3, max: BASELINE_PILLAR_MAX.p3, color: PILLAR_COLORS[2] },
    { key: 'p4', label: 'P4 — Enterprise', items: itemSet.p4Items, responses: baseline.p4, max: BASELINE_PILLAR_MAX.p4, color: PILLAR_COLORS[3] },
  ];

  const eciRaw = itemSet.eciItems.reduce((s, i) => s + Math.min(baseline.eci[i.id] ?? 0, i.max), 0);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={cn('rounded-xl border px-4 py-3 flex items-start justify-between gap-3', ZONE_BG[normalizeZone(baseline.zone)] ?? 'bg-gray-50 border-gray-200')}>
        <div className="space-y-1">
          <Badge className={cn('text-[10px] border-0', ZONE_COLORS[normalizeZone(baseline.zone)] ?? 'bg-gray-100 text-gray-600')}>
            {normalizeZone(baseline.zone)}
          </Badge>
          <p className="text-xs text-gray-500">Assessed {formatDate(baseline.assessed_at)}</p>
          {baseline.agentName && (
            <p className="text-xs text-gray-400">Agent: <span className="font-medium text-gray-600">{baseline.agentName}</span></p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold" style={{ color: ZONE_HEX[normalizeZone(baseline.zone)] ?? '#374151' }}>{baseline.total_score}</p>
          <p className="text-[10px] text-gray-400">FRI / 100</p>
        </div>
      </div>

      {/* Pillar bars */}
      <div className="grid grid-cols-2 gap-3">
        {pillars.map((p, i) => {
          const actual = p.items.reduce((s, item) => s + Math.min((p.responses[item.id] ?? 0), item.max), 0);
          return (
            <div key={p.key} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={cn('text-[10px] font-bold uppercase tracking-wide', PILLAR_TEXT[i])}>{p.label}</span>
                <span className="text-xs font-bold text-gray-700">{actual}/{p.max}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', p.color)} style={{ width: `${Math.round((actual / p.max) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ECI */}
      <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-700">ECI — Eligibility Index</p>
          <p className="text-[10px] text-blue-400 mt-0.5">5 eligibility criteria</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-blue-700">{eciRaw}<span className="text-xs font-normal text-blue-400">/{itemSet.eciMax}</span></p>
          <p className="text-[10px] text-blue-400">{Math.round((eciRaw / itemSet.eciMax) * 100)}%</p>
        </div>
      </div>

      {/* Expandable item detail */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium">View all item scores</span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="space-y-4">
          {pillars.map((p, pi) => (
            <div key={p.key}>
              <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-2', PILLAR_TEXT[pi])}>{p.label}</p>
              <div className="space-y-1.5">
                {p.items.map(item => {
                  const v = Math.min(p.responses[item.id] ?? 0, item.max);
                  const pct = Math.round((v / item.max) * 100);
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-600 flex-1 truncate">{item.label}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', p.color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 w-10 text-right">{v}/{item.max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-blue-600">ECI Items</p>
            <div className="space-y-1.5">
              {itemSet.eciItems.map(item => {
                const v = Math.min(baseline.eci[item.id] ?? 0, item.max);
                const pct = Math.round((v / item.max) * 100);
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-600 flex-1 truncate">{item.label}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-10 text-right">{v}/{item.max}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export helper ─────────────────────────────────────────────────────────────

function exportCSV(farmers: FRIFarmer[]) {
  const headers = [
    'Name', 'Phone', 'National ID', 'Gender', 'Age', 'Region', 'District', 'Community',
    'Crop', 'Farm Size (ha)', 'Zone', 'FRI Score', 'Credit Risk',
    'P1', 'P2', 'P3', 'P4', 'ECI', 'Trajectory',
    'Check-ins Submitted', 'Check-ins Verified',
    'Baseline Done', 'Baseline Score', 'Recommendation',
  ];
  const rows = farmers.map(f => [
    f.full_name, f.phone, f.national_id ?? '', GENDER_LABELS[f.gender as keyof typeof GENDER_LABELS] ?? '',
    calcAge(f.date_of_birth), f.region ?? f.region_code ?? '—',
    f.district ?? '', f.community ?? '',
    CROP_LABELS[f.primary_crop as CropType] ?? f.primary_crop, f.total_farm_size_ha,
    normalizeZone(f.latestScore?.zone) ?? '', f.latestScore?.total_score ?? '',
    creditRiskLabel(f.latestScore?.credit_score ?? null).label,
    f.latestScore?.p1_score ?? '', f.latestScore?.p2_score ?? '',
    f.latestScore?.p3_score ?? '', f.latestScore?.p4_score ?? '',
    f.latestScore?.eci_score ?? '',
    f.trajectory,
    f.checkins.length, f.checkins.filter(c => c.is_verified).length,
    f.baseline ? 'Yes' : 'No', f.baseline?.total_score ?? '',
    f.recommendation,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'fri_data.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Farmer detail drawer ──────────────────────────────────────────────────────

function FarmerDetailDrawer({ farmer, allScores, questionMap, open, onClose }: {
  farmer:      FRIFarmer | null;
  allScores:   FRIScore[];
  questionMap: Record<string, QuestionMeta>;
  open:        boolean;
  onClose:     () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'baseline' | 'checkins' | 'norvi' | 'score'>('overview');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) { setActiveTab('overview'); setExpandedWeeks(new Set()); }
  }, [open, farmer?.id]);

  if (!farmer) return null;

  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: BarChart3      },
    { key: 'score',     label: 'FRI Score', icon: Award          },
    { key: 'baseline',  label: 'Baseline',  icon: Layers         },
    { key: 'checkins',  label: 'Check-ins', icon: ClipboardCheck },
    { key: 'norvi',     label: 'Norvi AI',  icon: ShieldCheck    },
  ] as const;

  const checkinRate = farmer.checkins.length > 0
    ? Math.round((farmer.checkins.filter(c => c.is_verified).length / farmer.checkins.length) * 100)
    : 0;

  const weeklyScores = allScores.filter(s => s.week_number > 0).sort((a, b) => a.week_number - b.week_number);

  return (
    <Drawer open={open} onClose={onClose} title={farmer.full_name} width="max-w-2xl">
      <div className="space-y-0 -mt-2">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-50 p-1 rounded-xl mb-5">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all',
                activeTab === key ? 'bg-white shadow-sm text-cropguard-dark' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Current score + zone */}
            {farmer.latestScore ? (
              <div className={cn('rounded-xl border px-4 py-4 flex items-start justify-between', ZONE_BG[normalizeZone(farmer.latestScore.zone)] ?? 'bg-gray-50')}>
                <div className="space-y-1.5">
                  <Badge className={cn('text-[10px] border-0', ZONE_COLORS[normalizeZone(farmer.latestScore.zone)] ?? 'bg-gray-100 text-gray-600')}>
                    {normalizeZone(farmer.latestScore.zone)}
                  </Badge>
                  <p className="text-xs text-gray-600">{farmer.recommendation}</p>
                  <p className="text-xs text-gray-400">{farmer.latestScore.is_provisional ? 'Provisional score' : 'Final score'} · Week {farmer.latestScore.week_number}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-4xl font-bold" style={{ color: ZONE_HEX[normalizeZone(farmer.latestScore.zone)] ?? '#374151' }}>
                    {farmer.latestScore.total_score}
                  </p>
                  <p className="text-[11px] text-gray-400">FRI / 100</p>
                  {farmer.latestScore.credit_score != null && (() => {
                    const cr = creditRiskLabel(farmer.latestScore!.credit_score);
                    return (
                      <>
                        <p className={cn('text-sm font-bold mt-1', cr.cls)}>{cr.label}</p>
                        <p className="text-[10px] text-gray-400">Credit risk</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No FRI score yet</p>
              </div>
            )}

            {/* Pillar breakdown */}
            {farmer.latestScore && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pillar Breakdown</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'P1 Farm Management',    score: farmer.latestScore.p1_score, max: PILLAR_MAX.P1 },
                    { label: 'P2 Climate Resilience', score: farmer.latestScore.p2_score, max: PILLAR_MAX.P2 },
                    { label: 'P3 Economic Inclusion', score: farmer.latestScore.p3_score, max: PILLAR_MAX.P3 },
                    { label: 'P4 Social Welfare',     score: farmer.latestScore.p4_score, max: PILLAR_MAX.P4 },
                  ].map((p, i) => (
                    <PillarBar key={p.label} {...p} colorCls={PILLAR_COLORS[i]} />
                  ))}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Check-ins"
                value={farmer.checkins.length}
                sub={`${farmer.checkins.filter(c => c.is_verified).length} verified`}
              />
              <StatCard
                label="Verify Rate"
                value={`${checkinRate}%`}
                color={checkinRate >= 80 ? 'text-emerald-600' : checkinRate >= 50 ? 'text-amber-600' : 'text-red-500'}
              />
              <StatCard
                label="Baseline"
                value={farmer.baseline ? 'Done' : 'Pending'}
                sub={farmer.baseline ? formatDate(farmer.baseline.assessed_at) : undefined}
                color={farmer.baseline ? 'text-emerald-600' : 'text-amber-600'}
              />
            </div>

            {/* FRI Trend chart */}
            {weeklyScores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">FRI Trend by Week</p>
                <div className="flex items-end gap-1.5 h-20">
                  {weeklyScores.map(s => {
                    const h = Math.max(Math.round((s.total_score / 100) * 80), 4);
                    return (
                      <div key={s.id} className="flex flex-col items-center gap-1 flex-1 group">
                        <span className="text-[8px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{s.total_score}</span>
                        <div
                          className={cn('w-full rounded-t transition-all', s.is_provisional ? 'bg-amber-400' : 'bg-cropguard-green')}
                          style={{ height: `${h}px` }}
                        />
                        <span className="text-[8px] text-gray-400">W{s.week_number}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cropguard-green inline-block" />Final</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />Provisional</span>
                </div>
              </div>
            )}

            {/* Farmer bio */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Farmer Details</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { icon: Phone,    label: 'Phone',      value: farmer.phone },
                  { icon: Hash,     label: 'National ID', value: farmer.national_id ?? '—' },
                  { icon: User,     label: 'Gender',     value: GENDER_LABELS[farmer.gender as keyof typeof GENDER_LABELS] ?? '—' },
                  { icon: Calendar, label: 'Age',        value: calcAge(farmer.date_of_birth) },
                  { icon: MapPin,   label: 'Region',     value: farmer.region ?? farmer.region_code ?? '—' },
                  { icon: MapPin,   label: 'District',   value: farmer.district ?? '—' },
                  { icon: MapPin,   label: 'Community',  value: farmer.community ?? '—' },
                  { icon: Crop,     label: 'Crop',       value: CROP_LABELS[farmer.primary_crop as CropType] ?? farmer.primary_crop },
                  { icon: Layers,   label: 'Farm Size',  value: `${farmer.total_farm_size_ha} ha` },
                  { icon: CheckCircle2, label: 'Verified', value: farmer.is_verified ? 'Yes' : 'No' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400">{label}</p>
                      <p className="text-xs font-medium text-gray-700">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enrollment info */}
            {farmer.enrollment && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enrollment</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {farmer.enrollment.program_name && (
                    <div>
                      <p className="text-gray-400">Program</p>
                      <p className="font-medium text-gray-700">{farmer.enrollment.program_name}</p>
                    </div>
                  )}
                  {farmer.enrollment.cohort_name && (
                    <div>
                      <p className="text-gray-400">Cohort</p>
                      <p className="font-medium text-gray-700">{farmer.enrollment.cohort_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p className="font-medium capitalize text-gray-700">{farmer.enrollment.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Enrolled</p>
                    <p className="font-medium text-gray-700">{formatDate(farmer.enrollment.enrolled_at)}</p>
                  </div>
                  {farmer.enrollment.agentName && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Assigned Agent</p>
                      <p className="font-medium text-gray-700">{farmer.enrollment.agentName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FRI Score tab ────────────────────────────────────────── */}
        {activeTab === 'score' && (() => {
          const latest = allScores[allScores.length - 1] ?? null;
          const chartData = allScores.map(s => ({
            week: s.week_number === 0 ? 'Base' : `W${s.week_number}`,
            score: s.total_score,
          }));
          const zone = normalizeZone(latest?.zone ?? farmer.latestScore?.zone ?? '');
          const score = latest?.total_score ?? farmer.latestScore?.total_score ?? null;
          const p1 = latest?.p1_score ?? farmer.latestScore?.p1_score ?? 0;
          const p2 = latest?.p2_score ?? farmer.latestScore?.p2_score ?? 0;
          const p3 = latest?.p3_score ?? farmer.latestScore?.p3_score ?? 0;
          const p4 = latest?.p4_score ?? farmer.latestScore?.p4_score ?? 0;
          const isProvisional = latest?.is_provisional ?? farmer.latestScore?.is_provisional ?? false;
          const weekNum = latest?.week_number ?? farmer.latestScore?.week_number ?? null;
          return (
            <div className="space-y-4">
              {/* Arc gauge card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <FRIArc score={score} zone={zone} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {zone && (
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border-0', ZONE_COLORS[zone] ?? 'bg-gray-100 text-gray-600')}>
                          {zone}
                        </span>
                      )}
                      {score !== null && (
                        <span className={cn('text-[10px] font-semibold', creditRiskLabel(farmer.latestScore?.credit_score ?? null).cls)}>
                          {creditRiskLabel(farmer.latestScore?.credit_score ?? null).label}
                        </span>
                      )}
                    </div>
                    {latest && (
                      <span className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full',
                        isProvisional ? 'bg-amber-100 text-amber-700' : 'bg-cropguard-mint text-cropguard-dark')}>
                        {isProvisional ? 'Provisional' : 'Verified'}
                      </span>
                    )}
                    <div className="text-xs text-gray-500 leading-relaxed">
                      {latest
                        ? `${weekNum === 0 ? 'Baseline assessment' : `Week ${weekNum} result`}. ${isProvisional ? 'Agent verification pending.' : 'Verified by agent.'}`
                        : 'No check-in data yet.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Farmer info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {[farmer.community, farmer.district, farmer.region].filter(Boolean).join(', ') || '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {farmer.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Crop className="w-3.5 h-3.5 text-gray-400" />
                  Primary crop: <span className="font-medium capitalize ml-1">{CROP_LABELS[farmer.primary_crop as CropType] ?? farmer.primary_crop}</span>
                </div>
              </div>

              {/* Pillar breakdown */}
              {latest && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pillar Breakdown</p>
                  <PillarBar label="P1 — Agronomy"   score={p1} max={PILLAR_MAX.P1} colorCls={PILLAR_COLORS[0]} />
                  <PillarBar label="P2 — CSA"        score={p2} max={PILLAR_MAX.P2} colorCls={PILLAR_COLORS[1]} />
                  <PillarBar label="P3 — Advisory"   score={p3} max={PILLAR_MAX.P3} colorCls={PILLAR_COLORS[2]} />
                  <PillarBar label="P4 — Discipline" score={p4} max={PILLAR_MAX.P4} colorCls={PILLAR_COLORS[3]} />
                </div>
              )}

              {/* Score trend */}
              {chartData.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Score Trend</p>
                  <ResponsiveContainer width="100%" height={110}>
                    <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<ScoreTrendTooltip />} />
                      <Line type="monotone" dataKey="score" stroke="#3D7A56" strokeWidth={2}
                        dot={{ r: 3, fill: '#3D7A56', strokeWidth: 0 }}
                        activeDot={{ r: 4, fill: '#1A3D2B' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Weekly history chips */}
              {allScores.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Weekly History</p>
                  <div className="flex gap-2 flex-wrap">
                    {allScores.map(r => {
                      const z = normalizeZone(r.zone);
                      const hex = ZONE_HEX[z] ?? '#E5E7EB';
                      return (
                        <div key={r.id} className="flex flex-col items-center gap-1">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: hex }}>
                            {r.is_provisional ? 'P' : 'V'}
                          </div>
                          <span className="text-[8px] text-gray-400">{r.week_number === 0 ? 'Base' : `W${r.week_number}`}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">P = Provisional · V = Verified</p>
                </div>
              )}

              {/* No score state */}
              {!latest && (
                <div className="text-center py-10">
                  <Award className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No FRI score recorded yet</p>
                  <p className="text-xs text-gray-300 mt-1">Scores are generated after a verified check-in</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Baseline tab ─────────────────────────────────────────── */}
        {activeTab === 'baseline' && (
          <div>
            {farmer.baseline ? (
              <BaselineSection baseline={farmer.baseline} />
            ) : (
              <div className="text-center py-16 space-y-2">
                <Layers className="w-10 h-10 text-gray-200 mx-auto" />
                <p className="text-sm text-gray-400">No baseline assessment yet</p>
                <p className="text-xs text-gray-300">Baseline must be completed by an agent during a farm visit</p>
              </div>
            )}
          </div>
        )}

        {/* ── Check-ins tab ─────────────────────────────────────────── */}
        {activeTab === 'checkins' && (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total" value={farmer.checkins.length} />
              <StatCard label="Verified" value={farmer.checkins.filter(c => c.is_verified).length} color="text-emerald-600" />
              <StatCard label="Help Req." value={farmer.checkins.filter(c => c.help_requested).length} color="text-amber-600" />
            </div>

            {farmer.checkins.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto" />
                <p className="text-sm text-gray-400">No check-ins submitted yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...farmer.checkins].sort((a, b) => b.week_number - a.week_number).map(c => (
                  <CheckinWeekRow
                    key={c.id}
                    checkin={c}
                    questionMap={questionMap}
                    expanded={expandedWeeks.has(c.id)}
                    onToggle={() => setExpandedWeeks(prev => {
                      const next = new Set(prev);
                      next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                      return next;
                    })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Norvi tab ─────────────────────────────────────────────── */}
        {activeTab === 'norvi' && (
          <div className="space-y-4">
            {farmer.latestScore ? (
              <NorviOutput
                farmerId={farmer.id}
                friScoreId={farmer.latestScore.id}
                weekNumber={farmer.latestScore.week_number}
                outputType="credit_brief"
                compact={false}
              />
            ) : (
              <div className="text-center py-12 text-sm text-gray-400">
                FRI score required for Norvi AI analysis
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FRIDashboardPage() {
  const profile = useAuthStore(s => s.profile);

  const [farmers, setFarmers]     = useState<FRIFarmer[]>([]);
  const [programs, setPrograms]   = useState<Program[]>([]);
  const [cohorts, setCohorts]     = useState<Cohort[]>([]);
  const [loading, setLoading]     = useState(true);

  const [search, setSearch]               = useState('');
  const [filterProgram, setFilterProgram] = useState('__none__');
  const [filterCohort, setFilterCohort]   = useState('__none__');
  const [filterZone, setFilterZone]       = useState('__none__');
  const [filterStatus, setFilterStatus]   = useState('__none__');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedFarmer, setSelectedFarmer] = useState<FRIFarmer | null>(null);
  const [allScores, setAllScores]           = useState<FRIScore[]>([]);
  const [questionMap, setQuestionMap]       = useState<Record<string, QuestionMeta>>({});
  const [detailOpen, setDetailOpen]         = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // 1. Fetch farmers
    const { data: farmerData } = await supabase
      .from('farmers')
      .select('id,full_name,phone,national_id,date_of_birth,gender,region,district,community,gps_address,photo_url,primary_crop,total_farm_size_ha,risk_category,current_fri_score,is_verified')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name')
      .limit(500);

    const farmerList = (farmerData ?? []) as any[];
    if (farmerList.length === 0) { setFarmers([]); setLoading(false); return; }
    const farmerIds = farmerList.map((f: any) => f.id);

    // 2. Parallel fetches
    const [
      { data: scoreData },
      { data: baselineData },
      { data: checkinData },
      { data: checkinResponses },
      { data: enrollmentData },
    ] = await Promise.all([
      supabase.from('farmer_fri_scores').select('*').in('farmer_id', farmerIds).order('week_number', { ascending: false }),
      (supabase.from('baseline_assessments') as any).select('id,farmer_id,agent_id,assessed_at,is_active,total_score,zone,p1,p2,p3,p4,eci').in('farmer_id', farmerIds).eq('is_active', true),
      supabase.from('farmer_checkins').select('id,farmer_id,week_number,status,is_verified,verified_at,verified_by,help_requested,challenge_notes,created_at,is_agent_only,checkin_template_id').in('farmer_id', farmerIds).order('week_number', { ascending: false }),
      supabase.from('farmer_checkin_responses').select('checkin_id,activity_code,farmer_response,agent_response,is_flagged,evidence_url'),
      supabase.from('enrollments').select('id,farmer_id,agent_id,program_id,cohort_id,status,enrolled_at').in('farmer_id', farmerIds).eq('status', 'active').limit(farmerIds.length),
    ]);

    // Collect all template IDs referenced by these check-ins
    const templateIds = new Set<string>();
    (checkinData ?? []).forEach((c: any) => { if (c.checkin_template_id) templateIds.add(c.checkin_template_id); });

    // Also pull template IDs from cohorts linked to these farmers' enrollments
    const cohortTemplateIds = new Set<string>();
    (enrollmentData ?? []).forEach((e: any) => { if (e.cohort_id) cohortTemplateIds.add(e.cohort_id); });

    // Fetch template items for all referenced templates
    const { data: tplItemsData } = templateIds.size > 0
      ? await supabase.from('checkin_template_items')
          .select('activity_code,label,component,week_number,checkin_template_id')
          .in('checkin_template_id', [...templateIds])
          .eq('is_active', true)
          .order('sort_order')
      : { data: [] };

    // Build question map keyed by activity_code (week-aware: prefer matching week)
    // Seed with WEEKLY_ACTIVITIES defaults, then override with template labels
    const qMap: Record<string, QuestionMeta> = {};
    WEEKLY_ACTIVITIES.forEach(a => { qMap[a.id] = { label: a.label, pillar: a.pillar }; });
    // Index template items: activity_code -> { label, pillar, week_number }[]
    // We store one entry per (activity_code, week_number) so the display can pick the right one
    const tplByCodeAndWeek: Record<string, Record<number, QuestionMeta>> = {};
    ((tplItemsData ?? []) as any[]).forEach((q: any) => {
      const pillar = (COMPONENT_TO_PILLAR[q.component] ?? 'p1') as QuestionMeta['pillar'];
      const meta: QuestionMeta = { label: q.label, pillar, description: q.description };
      // Also put in the flat map (last write wins — fine for week-agnostic lookup)
      qMap[q.activity_code] = meta;
      if (!tplByCodeAndWeek[q.activity_code]) tplByCodeAndWeek[q.activity_code] = {};
      tplByCodeAndWeek[q.activity_code][q.week_number] = meta;
    });
    setQuestionMap(qMap);

    // 3. Gather unique agent + program + cohort IDs to resolve names
    const agentIds = new Set<string>();
    const programIds = new Set<string>();
    const cohortIds = new Set<string>();

    (baselineData ?? []).forEach((b: any) => { if (b.agent_id) agentIds.add(b.agent_id); });
    (checkinData ?? []).forEach((c: any) => { if (c.verified_by) agentIds.add(c.verified_by); });
    (enrollmentData ?? []).forEach((e: any) => {
      if (e.agent_id) agentIds.add(e.agent_id);
      if (e.program_id) programIds.add(e.program_id);
      if (e.cohort_id) cohortIds.add(e.cohort_id);
    });

    const [
      { data: agentUsers },
      { data: programRows },
      { data: cohortRows },
    ] = await Promise.all([
      agentIds.size > 0
        ? supabase.from('users').select('id,full_name').in('id', [...agentIds])
        : Promise.resolve({ data: [] }),
      programIds.size > 0
        ? supabase.from('programs').select('id,name').in('id', [...programIds])
        : Promise.resolve({ data: [] }),
      cohortIds.size > 0
        ? supabase.from('cohorts').select('id,name').in('id', [...cohortIds])
        : Promise.resolve({ data: [] }),
    ]);

    const agentMap: Record<string, string> = {};
    (agentUsers ?? []).forEach((u: any) => { agentMap[u.id] = u.full_name; });
    const programMap: Record<string, string> = {};
    (programRows ?? []).forEach((p: any) => { programMap[p.id] = p.name; });
    const cohortMap: Record<string, string> = {};
    (cohortRows ?? []).forEach((c: any) => { cohortMap[c.id] = c.name; });

    // 4. Index by farmer
    const scoresByFarmer: Record<string, FRIScore[]> = {};
    (scoreData ?? []).forEach((s: any) => {
      scoresByFarmer[s.farmer_id] = scoresByFarmer[s.farmer_id] ?? [];
      scoresByFarmer[s.farmer_id].push(s as FRIScore);
    });

    const baselineByFarmer: Record<string, BaselineRecord> = {};
    (baselineData ?? []).forEach((b: any) => {
      baselineByFarmer[b.farmer_id] = {
        ...b,
        agentName: b.agent_id ? agentMap[b.agent_id] : undefined,
      } as BaselineRecord;
    });

    const responsesByCheckin: Record<string, any[]> = {};
    (checkinResponses ?? []).forEach((r: any) => {
      responsesByCheckin[r.checkin_id] = responsesByCheckin[r.checkin_id] ?? [];
      responsesByCheckin[r.checkin_id].push(r);
    });

    // Index fri scores by checkin_id, and also by farmer_id (latest first)
    const friByCheckin: Record<string, any> = {};
    const friByFarmer: Record<string, any[]> = {};
    (scoreData ?? []).forEach((s: any) => {
      if (s.checkin_id) friByCheckin[s.checkin_id] = s;
      friByFarmer[s.farmer_id] = friByFarmer[s.farmer_id] ?? [];
      friByFarmer[s.farmer_id].push(s);
    });
    Object.values(friByFarmer).forEach(arr =>
      arr.sort((a, b) => Number(b.week_number) - Number(a.week_number)),
    );

    // Build synthetic responses from raw_responses JSONB, respecting the check-in's week number
    // so only week-specific template activities are shown (not baseline/other-week items).
    function buildResponsesFromRaw(raw: any, weekNum: number, templateId: string | null): CheckinResponse[] {
      if (!raw || typeof raw !== 'object') return [];
      // Collect the set of valid activity_codes for this week's template
      const weekActivityCodes = new Set<string>();
      if (templateId) {
        (tplItemsData ?? []).forEach((item: any) => {
          if (item.checkin_template_id === templateId && Number(item.week_number) === weekNum) {
            weekActivityCodes.add(item.activity_code);
          }
        });
      }
      const out: CheckinResponse[] = [];
      for (const pillar of ['p1', 'p2', 'p3', 'p4']) {
        const pd = raw[pillar];
        if (!pd || typeof pd !== 'object') continue;
        for (const [code, val] of Object.entries(pd)) {
          // Skip activities not in this week's template (they're baseline/other-week scores)
          if (weekActivityCodes.size > 0 && !weekActivityCodes.has(code)) continue;
          // Prefer the week-specific template label; fall back to generic
          const weekMeta = tplByCodeAndWeek[code]?.[weekNum];
          const genericMeta = qMap[code];
          const meta = weekMeta ?? genericMeta;
          out.push({
            activity_code:  code,
            farmer_response: 'yes',
            agent_response:  'verified',
            is_flagged:      false,
            evidence_url:    null,
            score:           typeof val === 'number' ? val : Number(val) || 0,
            label:           meta?.label,
            pillar:          meta?.pillar,
            description:     meta?.description,
          } as CheckinResponse & { label?: string; pillar?: string; description?: string });
        }
      }
      return out;
    }

    const checkinsByFarmer: Record<string, CheckinRecord[]> = {};
    (checkinData ?? []).forEach((c: any) => {
      checkinsByFarmer[c.farmer_id] = checkinsByFarmer[c.farmer_id] ?? [];
      // Match FRI score: first by checkin_id, then by farmer's latest score for same week
      const friForWeek = friByFarmer[c.farmer_id]?.find((s: any) => Number(s.week_number) === Number(c.week_number));
      const fri = friByCheckin[c.id] ?? friForWeek ?? friByFarmer[c.farmer_id]?.[0];
      const isVerified = c.is_verified === true || (c.verified_at != null && c.verified_by != null);
      // Use real responses if available, otherwise build from raw_responses on the FRI score
      let responses = responsesByCheckin[c.id] ?? [];
      if (responses.length === 0 && fri?.raw_responses) {
        responses = buildResponsesFromRaw(fri.raw_responses, Number(c.week_number), c.checkin_template_id);
      }
      checkinsByFarmer[c.farmer_id].push({
        ...c,
        is_verified: isVerified,
        status: isVerified ? 'verified' : c.status,
        responses,
        verifiedByName: c.verified_by ? agentMap[c.verified_by] : undefined,
        friScore: fri ? {
          p1: Number(fri.p1_score) || 0,
          p2: Number(fri.p2_score) || 0,
          p3: Number(fri.p3_score) || 0,
          p4: Number(fri.p4_score) || 0,
          total: Number(fri.total_score) || 0,
          is_provisional: fri.is_provisional ?? false,
        } : undefined,
      } as CheckinRecord);
    });

    const enrollmentByFarmer: Record<string, any> = {};
    (enrollmentData ?? []).forEach((e: any) => {
      enrollmentByFarmer[e.farmer_id] = {
        ...e,
        program_name: e.program_id ? programMap[e.program_id] : undefined,
        cohort_name:  e.cohort_id  ? cohortMap[e.cohort_id]   : undefined,
        agentName:    e.agent_id   ? agentMap[e.agent_id]      : undefined,
      };
    });

    // 5. Merge — only include farmers with an active enrollment
    const enrolledIds = new Set((enrollmentData ?? []).map((e: any) => e.farmer_id));
    const merged: FRIFarmer[] = farmerList.filter((f: any) => enrolledIds.has(f.id)).map((f: any) => {
      const scores  = scoresByFarmer[f.id] ?? [];
      const latest  = scores[0] ?? null;
      const prev    = scores[1] ?? null;
      let traj: 'up' | 'down' | 'flat' | 'new' = 'new';
      if (latest && prev) {
        const diff = Number(latest.total_score) - Number(prev.total_score);
        traj = diff > 2 ? 'up' : diff < -2 ? 'down' : 'flat';
      } else if (latest) traj = 'flat';

      return {
        ...f,
        latestScore:  latest ?? undefined,
        prevScore:    prev   ?? undefined,
        trajectory:   traj,
        recommendation: latest ? recommendation(Number(latest.total_score)) : 'No data',
        baseline:     baselineByFarmer[f.id] ?? undefined,
        checkins:     checkinsByFarmer[f.id] ?? [],
        enrollment:   enrollmentByFarmer[f.id] ?? undefined,
      };
    });

    setFarmers(merged);
    setLoading(false);
  }, [profile]);

  const loadFilters = useCallback(async () => {
    if (!profile) return;
    const [{ data: progs }, { data: cohs }] = await Promise.all([
      supabase.from('programs').select('id,name').eq('organisation_id', profile.organisation_id),
      supabase.from('cohorts').select('id,name,program_id').order('name'),
    ]);
    setPrograms(progs ?? []);
    setCohorts((cohs ?? []) as Cohort[]);
  }, [profile]);

  useEffect(() => { load(); loadFilters(); }, [load, loadFilters]);

  const openDetail = async (f: FRIFarmer) => {
    setSelectedFarmer(f);
    const { data } = await supabase
      .from('farmer_fri_scores')
      .select('*')
      .eq('farmer_id', f.id)
      .order('week_number', { ascending: true });
    setAllScores((data ?? []) as FRIScore[]);
    setDetailOpen(true);
  };

  const filteredCohorts = filterProgram !== '__none__' ? cohorts.filter(c => c.program_id === filterProgram) : cohorts;

  const visible = farmers.filter(f => {
    if (search && !f.full_name.toLowerCase().includes(search.toLowerCase()) && !f.phone.includes(search)) return false;
    if (filterZone !== '__none__' && normalizeZone(f.latestScore?.zone) !== filterZone) return false;
    if (filterProgram !== '__none__' && f.enrollment?.program_id !== filterProgram) return false;
    if (filterCohort !== '__none__' && f.enrollment?.cohort_id !== filterCohort) return false;
    if (filterStatus === 'baseline_done'    && !f.baseline) return false;
    if (filterStatus === 'baseline_pending' && !!f.baseline) return false;
    if (filterStatus === 'verified_checkin' && !f.checkins.some(c => c.is_verified)) return false;
    if (filterStatus === 'help_needed'      && !f.checkins.some(c => c.help_requested)) return false;
    return true;
  });

  const zoneDistribution = ['Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter'].map(zone => ({
    zone,
    count: farmers.filter(f => normalizeZone(f.latestScore?.zone) === zone).length,
  }));

  const totalBaselines     = farmers.filter(f => f.baseline).length;
  const totalVerified      = farmers.filter(f => f.checkins.some(c => c.is_verified)).length;
  const totalCheckins      = farmers.reduce((s, f) => s + f.checkins.length, 0);
  const totalVerifiedCheck = farmers.reduce((s, f) => s + f.checkins.filter(c => c.is_verified).length, 0);
  const avgFRI             = farmers.filter(f => f.latestScore).length > 0
    ? Math.round(farmers.filter(f => f.latestScore).reduce((s, f) => s + Number(f.latestScore!.total_score), 0) / farmers.filter(f => f.latestScore).length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">FRI Dashboard</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">
            {farmers.length} farmers &middot; {farmers.filter(f => f.latestScore).length} scored
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => exportCSV(visible)}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Farmers"    value={farmers.length}    sub="enrolled" />
        <StatCard label="Avg FRI Score"    value={avgFRI || '—'}     sub="all scored farmers" color={avgFRI >= 60 ? 'text-emerald-600' : avgFRI >= 40 ? 'text-amber-600' : 'text-red-500'} />
        <StatCard label="Baselines Done"   value={totalBaselines}    sub={`${farmers.length - totalBaselines} pending`} />
        <StatCard label="Check-ins"        value={totalCheckins}     sub={`${totalVerifiedCheck} verified`} />
        <StatCard label="Farmers w/ Help"  value={farmers.filter(f => f.checkins.some(c => c.help_requested)).length} sub="help requested" color="text-amber-600" />
      </div>

      {/* Zone distribution */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {zoneDistribution.map(({ zone, count }) => (
          <button
            key={zone}
            onClick={() => setFilterZone(z => z === zone ? '__none__' : zone)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all hover:shadow-md',
              filterZone === zone ? ZONE_BG[zone] : 'bg-white border-gray-200',
            )}
          >
            <p className="text-2xl font-bold text-cropguard-dark">{count}</p>
            <Badge className={cn('text-[9px] border-0 mt-1', ZONE_COLORS[zone] ?? 'bg-gray-100 text-gray-600')}>
              {zone.replace('Resilience ', '')}
            </Badge>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (searchTimer.current) clearTimeout(searchTimer.current);
            }}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterProgram} onValueChange={v => { setFilterProgram(v); setFilterCohort('__none__'); }}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="All programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All programs</SelectItem>
              {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCohort} onValueChange={setFilterCohort} disabled={filteredCohorts.length === 0}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="All cohorts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All cohorts</SelectItem>
              {filteredCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All statuses</SelectItem>
              <SelectItem value="baseline_done">Baseline complete</SelectItem>
              <SelectItem value="baseline_pending">Baseline pending</SelectItem>
              <SelectItem value="verified_checkin">Has verified check-in</SelectItem>
              <SelectItem value="help_needed">Help requested</SelectItem>
            </SelectContent>
          </Select>
          {(filterProgram !== '__none__' || filterCohort !== '__none__' || filterZone !== '__none__' || filterStatus !== '__none__') && (
            <button
              className="text-xs text-cropguard-slate hover:text-cropguard-dark flex items-center gap-1"
              onClick={() => { setFilterProgram('__none__'); setFilterCohort('__none__'); setFilterZone('__none__'); setFilterStatus('__none__'); }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        {visible.length !== farmers.length && (
          <p className="text-xs text-cropguard-slate">Showing {visible.length} of {farmers.length} farmers</p>
        )}
      </div>

      {/* Farmer table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-cropguard-slate">
          <Users className="w-10 h-10 mx-auto text-gray-200 mb-2" />
          <p className="font-medium text-cropguard-forest">No farmers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-[10px] font-semibold text-gray-400 uppercase tracking-wide sticky top-0 z-10">
            <div className="col-span-3">Farmer</div>
            <div className="col-span-2 text-center">FRI Score</div>
            <div className="col-span-2 text-center">Credit Risk</div>
            <div className="col-span-2 text-center">Zone</div>
            <div className="col-span-1 text-center">Baseline</div>
            <div className="col-span-1 text-center">Check-ins</div>
            <div className="col-span-1 text-center">Trend</div>
          </div>
          <div className="divide-y divide-gray-50">
            {visible.map(f => {
              const t = trajectoryLabel(f.trajectory);
              const TrajectoryIcon = t.icon;
              const verifiedCount = f.checkins.filter(c => c.is_verified).length;
              return (
                <div
                  key={f.id}
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors items-center"
                  onClick={() => openDetail(f)}
                >
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-medium text-cropguard-forest truncate">{f.full_name}</p>
                    <p className="text-xs text-cropguard-slate">
                      {f.region ?? f.region_code ?? '—'}
                      {f.district && <> &middot; {f.district}</>}
                    </p>
                    <p className="text-[10px] text-gray-300">{CROP_LABELS[f.primary_crop as CropType] ?? f.primary_crop} &middot; {f.total_farm_size_ha}ha</p>
                  </div>
                  <div className="col-span-2 text-center">
                    {f.latestScore ? (
                      <div>
                        <p className="text-lg font-bold leading-none" style={{ color: ZONE_HEX[normalizeZone(f.latestScore.zone)] ?? '#374151' }}>
                          {f.latestScore.total_score}
                        </p>
                        {f.latestScore.is_provisional && <span className="text-[9px] text-amber-600">Prov.</span>}
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 text-center">
                    {f.latestScore ? (() => {
                      const cr = creditRiskLabel(f.latestScore!.credit_score);
                      return <p className={cn('text-xs font-semibold', cr.cls)}>{cr.label}</p>;
                    })() : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 text-center">
                    {f.latestScore ? (
                      <Badge className={cn('text-[9px] border-0', ZONE_COLORS[normalizeZone(f.latestScore.zone)] ?? 'bg-gray-100 text-gray-500')}>
                        {normalizeZone(f.latestScore.zone).replace('Resilience ', '')}
                      </Badge>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="col-span-1 text-center">
                    {f.baseline ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <p className="text-xs font-semibold text-gray-700">{f.checkins.length}</p>
                    {verifiedCount > 0 && <p className="text-[9px] text-emerald-600">{verifiedCount}✓</p>}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <TrajectoryIcon className={cn('w-4 h-4', t.cls)} />
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      <FarmerDetailDrawer
        farmer={selectedFarmer}
        allScores={allScores}
        questionMap={questionMap}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
