import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Download, TrendingUp, TrendingDown, Minus, RefreshCw, X,
  User, MapPin, Crop, Calendar, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, BarChart3, ShieldCheck, Phone, Hash,
  Building2, Users, Layers, ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Program, Cohort } from '@/types';
import type { RegionCode, RiskCategory } from '@/types';
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
  WEEKLY_ACTIVITIES,
  BASELINE_P1_ITEMS, BASELINE_P2_ITEMS, BASELINE_P3_ITEMS, BASELINE_P4_ITEMS,
  ECI_ITEMS, ECI_MAX,
  PILLAR_MAX, BASELINE_PILLAR_MAX,
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
  responses:        Array<{ activity_code: string; farmer_response: string; is_flagged: boolean }>;
  verifiedByName?:  string;
}

interface FRIFarmer {
  id:                 string;
  full_name:          string;
  phone:              string;
  national_id:        string | null;
  date_of_birth:      string | null;
  gender:             string | null;
  region_code:        string;
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
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold" style={{ color: ZONE_HEX[zone] ?? '#374151' }}>{score}</span>
      <Badge className={cn('text-[9px] border-0', ZONE_COLORS[zone] ?? 'bg-gray-100 text-gray-600')}>
        {zone.replace('Resilience ', '')}
      </Badge>
    </div>
  );
}

// ── Checkin week row ──────────────────────────────────────────────────────────

function CheckinWeekRow({ checkin, expanded, onToggle }: {
  checkin: CheckinRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    verified:   { icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50', label: 'Verified' },
    submitted:  { icon: Clock,        cls: 'text-blue-600 bg-blue-50',       label: 'Submitted' },
    draft:      { icon: Clock,        cls: 'text-gray-500 bg-gray-100',      label: 'Draft'     },
    pending:    { icon: AlertCircle,  cls: 'text-amber-600 bg-amber-50',     label: 'Pending'   },
  };
  const cfg = statusConfig[checkin.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  const p1Acts = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p1');
  const p2Acts = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p2');
  const p3Acts = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p3');
  const p4Acts = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p4');

  const respMap: Record<string, string> = {};
  checkin.responses.forEach(r => { respMap[r.activity_code] = r.farmer_response; });

  function pillarScore(acts: typeof WEEKLY_ACTIVITIES): number {
    if (acts.length === 0) return 0;
    const pillar = acts[0].pillar.toUpperCase() as keyof typeof PILLAR_MAX;
    const max = PILLAR_MAX[pillar];
    const sum = acts.reduce((s, a) => {
      const r = respMap[a.id];
      return s + (r === 'yes' ? 1.0 : r === 'partial' ? 0.5 : 0);
    }, 0);
    return Math.round((sum / acts.length) * max);
  }

  function pillarSummary(acts: typeof WEEKLY_ACTIVITIES) {
    const pillar = acts[0]?.pillar.toUpperCase() as keyof typeof PILLAR_MAX;
    const max = PILLAR_MAX[pillar] ?? 0;
    return `${pillarScore(acts)}/${max}`;
  }

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
        <div className="flex items-center gap-3">
          {checkin.help_requested && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">Help needed</span>
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

          {/* Pillar summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'P1', acts: p1Acts, color: 'text-cropguard-forest bg-cropguard-mint' },
              { label: 'P2', acts: p2Acts, color: 'text-blue-700 bg-blue-50' },
              { label: 'P3', acts: p3Acts, color: 'text-amber-700 bg-amber-50' },
              { label: 'P4', acts: p4Acts, color: 'text-rose-700 bg-rose-50' },
            ].map(({ label, acts, color }) => (
              <div key={label} className={cn('rounded-lg p-2 text-[10px] font-medium', color)}>
                <p className="font-bold text-xs">{label}</p>
                <p>{pillarSummary(acts)}</p>
              </div>
            ))}
          </div>

          {/* Activity list */}
          <div className="space-y-1">
            {WEEKLY_ACTIVITIES.map(act => {
              const resp = respMap[act.id] ?? 'no';
              const flagged = checkin.responses.find(r => r.activity_code === act.id)?.is_flagged;
              const badge =
                resp === 'yes'     ? 'bg-emerald-100 text-emerald-700' :
                resp === 'partial' ? 'bg-amber-100 text-amber-700'     :
                                     'bg-gray-100 text-gray-500';
              return (
                <div key={act.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white transition-colors">
                  <div className="flex items-center gap-2">
                    {flagged && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                    <span className={cn('text-[11px]', flagged ? 'text-red-700' : 'text-gray-600')}>{act.label}</span>
                    <span className="text-[9px] text-gray-300 font-medium uppercase">{act.pillar}</span>
                  </div>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full capitalize', badge)}>{resp}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Baseline section ──────────────────────────────────────────────────────────

function BaselineSection({ baseline }: { baseline: BaselineRecord }) {
  const [open, setOpen] = useState(false);
  const pillars = [
    { key: 'p1', label: 'P1 — Agronomy', items: BASELINE_P1_ITEMS, responses: baseline.p1, max: BASELINE_PILLAR_MAX.p1, color: PILLAR_COLORS[0] },
    { key: 'p2', label: 'P2 — CSA',      items: BASELINE_P2_ITEMS, responses: baseline.p2, max: BASELINE_PILLAR_MAX.p2, color: PILLAR_COLORS[1] },
    { key: 'p3', label: 'P3 — Advisory', items: BASELINE_P3_ITEMS, responses: baseline.p3, max: BASELINE_PILLAR_MAX.p3, color: PILLAR_COLORS[2] },
    { key: 'p4', label: 'P4 — Enterprise', items: BASELINE_P4_ITEMS, responses: baseline.p4, max: BASELINE_PILLAR_MAX.p4, color: PILLAR_COLORS[3] },
  ];

  const eciRaw = ECI_ITEMS.reduce((s, i) => s + Math.min(baseline.eci[i.id] ?? 0, i.max), 0);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={cn('rounded-xl border px-4 py-3 flex items-start justify-between gap-3', ZONE_BG[baseline.zone] ?? 'bg-gray-50 border-gray-200')}>
        <div className="space-y-1">
          <Badge className={cn('text-[10px] border-0', ZONE_COLORS[baseline.zone] ?? 'bg-gray-100 text-gray-600')}>
            {baseline.zone}
          </Badge>
          <p className="text-xs text-gray-500">Assessed {formatDate(baseline.assessed_at)}</p>
          {baseline.agentName && (
            <p className="text-xs text-gray-400">Agent: <span className="font-medium text-gray-600">{baseline.agentName}</span></p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold" style={{ color: ZONE_HEX[baseline.zone] ?? '#374151' }}>{baseline.total_score}</p>
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
          <p className="text-xl font-bold text-blue-700">{eciRaw}<span className="text-xs font-normal text-blue-400">/{ECI_MAX}</span></p>
          <p className="text-[10px] text-blue-400">{Math.round((eciRaw / ECI_MAX) * 100)}%</p>
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
              {ECI_ITEMS.map(item => {
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
    calcAge(f.date_of_birth), REGION_LABELS[f.region_code as RegionCode] ?? f.region_code,
    f.district ?? '', f.community ?? '',
    CROP_LABELS[f.primary_crop as CropType] ?? f.primary_crop, f.total_farm_size_ha,
    f.latestScore?.zone ?? '', f.latestScore?.total_score ?? '',
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

function FarmerDetailDrawer({ farmer, allScores, open, onClose }: {
  farmer: FRIFarmer | null;
  allScores: FRIScore[];
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'baseline' | 'checkins' | 'norvi'>('overview');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) { setActiveTab('overview'); setExpandedWeeks(new Set()); }
  }, [open, farmer?.id]);

  if (!farmer) return null;

  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: BarChart3      },
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
              <div className={cn('rounded-xl border px-4 py-4 flex items-start justify-between', ZONE_BG[farmer.latestScore.zone] ?? 'bg-gray-50')}>
                <div className="space-y-1.5">
                  <Badge className={cn('text-[10px] border-0', ZONE_COLORS[farmer.latestScore.zone] ?? 'bg-gray-100 text-gray-600')}>
                    {farmer.latestScore.zone}
                  </Badge>
                  <p className="text-xs text-gray-600">{farmer.recommendation}</p>
                  <p className="text-xs text-gray-400">{farmer.latestScore.is_provisional ? 'Provisional score' : 'Final score'} · Week {farmer.latestScore.week_number}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-4xl font-bold" style={{ color: ZONE_HEX[farmer.latestScore.zone] ?? '#374151' }}>
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
                  { icon: MapPin,   label: 'Region',     value: REGION_LABELS[farmer.region_code as RegionCode] ?? farmer.region_code },
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
  const [detailOpen, setDetailOpen]         = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // 1. Fetch farmers
    const { data: farmerData } = await supabase
      .from('farmers')
      .select('id,full_name,phone,national_id,date_of_birth,gender,region_code,district,community,gps_address,photo_url,primary_crop,total_farm_size_ha,risk_category,current_fri_score,is_verified')
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
      supabase.from('farmer_checkins').select('id,farmer_id,week_number,status,is_verified,verified_at,verified_by,help_requested,challenge_notes,created_at').in('farmer_id', farmerIds).order('week_number', { ascending: false }),
      supabase.from('farmer_checkin_responses').select('checkin_id,activity_code,farmer_response,is_flagged'),
      supabase.from('enrollments').select('id,farmer_id,agent_id,program_id,cohort_id,status,enrolled_at').in('farmer_id', farmerIds).eq('status', 'active').limit(farmerIds.length),
    ]);

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

    const checkinsByFarmer: Record<string, CheckinRecord[]> = {};
    (checkinData ?? []).forEach((c: any) => {
      checkinsByFarmer[c.farmer_id] = checkinsByFarmer[c.farmer_id] ?? [];
      checkinsByFarmer[c.farmer_id].push({
        ...c,
        responses: responsesByCheckin[c.id] ?? [],
        verifiedByName: c.verified_by ? agentMap[c.verified_by] : undefined,
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

    // 5. Merge
    const merged: FRIFarmer[] = farmerList.map((f: any) => {
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
    if (filterZone !== '__none__' && f.latestScore?.zone !== filterZone) return false;
    if (filterStatus === 'baseline_done'    && !f.baseline) return false;
    if (filterStatus === 'baseline_pending' && !!f.baseline) return false;
    if (filterStatus === 'verified_checkin' && !f.checkins.some(c => c.is_verified)) return false;
    if (filterStatus === 'help_needed'      && !f.checkins.some(c => c.help_requested)) return false;
    return true;
  });

  const zoneDistribution = ['Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter'].map(zone => ({
    zone,
    count: farmers.filter(f => f.latestScore?.zone === zone).length,
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
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
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
                      {REGION_LABELS[f.region_code as RegionCode] ?? f.region_code}
                      {f.district && <> &middot; {f.district}</>}
                    </p>
                    <p className="text-[10px] text-gray-300">{CROP_LABELS[f.primary_crop as CropType] ?? f.primary_crop} &middot; {f.total_farm_size_ha}ha</p>
                  </div>
                  <div className="col-span-2 text-center">
                    {f.latestScore ? (
                      <div>
                        <p className="text-lg font-bold leading-none" style={{ color: ZONE_HEX[f.latestScore.zone] ?? '#374151' }}>
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
                      <Badge className={cn('text-[9px] border-0', ZONE_COLORS[f.latestScore.zone] ?? 'bg-gray-100 text-gray-500')}>
                        {f.latestScore.zone.replace('Resilience ', '')}
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
      )}

      <FarmerDetailDrawer
        farmer={selectedFarmer}
        allScores={allScores}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
