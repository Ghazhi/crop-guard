import { TrendingUp, TrendingDown, Minus, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trajectory, ScoreStatus, Recommendation, FriZone, RiskBand } from './types';
import {
  ZONE_BG, TRAJECTORY_COLORS, RECOMMENDATION_COLORS, RISK_BAND_COLORS,
} from './types';

// ── ScoreStatusBadge ─────────────────────────────────────────────────────────

export function ScoreStatusBadge({ status }: { status: ScoreStatus | string | null }) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'final' || s === 'approved')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
        ● Final
      </span>
    );
  if (s === 'provisional' || s === 'submitted')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        ◐ Provisional
      </span>
    );
  if (s === 'missed')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        ✕ Missed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      — Pending
    </span>
  );
}

// ── ZoneBadge ────────────────────────────────────────────────────────────────

export function ZoneBadge({ zone }: { zone: FriZone | string | null }) {
  if (!zone) return <span className="text-xs text-gray-400">—</span>;
  const cls = ZONE_BG[zone] ?? 'bg-gray-100 text-gray-600';
  const short: Record<string, string> = {
    'Resilience Leader':  'Z1',
    'Resilience Builder': 'Z2',
    'Resilience Learner': 'Z3',
    'Resilience Starter': 'Z4',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cls)}>
      {short[zone] ?? 'Z?'} {zone}
    </span>
  );
}

// ── TrajectoryBadge ──────────────────────────────────────────────────────────

export function TrajectoryBadge({ trajectory }: { trajectory: Trajectory | string | null }) {
  if (!trajectory) return null;
  const color = TRAJECTORY_COLORS[trajectory] ?? '#9ca3af';
  const icons: Record<string, React.ReactNode> = {
    'Improving':   <TrendingUp className="w-3 h-3" />,
    'Stable':      <Minus className="w-3 h-3" />,
    'Declining':   <TrendingDown className="w-3 h-3" />,
    'At Risk':     <AlertTriangle className="w-3 h-3" />,
    'No Baseline': <HelpCircle className="w-3 h-3" />,
  };
  const bgMap: Record<string, string> = {
    'Improving':   'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Stable':      'bg-blue-50 text-blue-700 border-blue-200',
    'Declining':   'bg-amber-50 text-amber-700 border-amber-200',
    'At Risk':     'bg-red-50 text-red-700 border-red-200',
    'No Baseline': 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', bgMap[trajectory] ?? 'bg-gray-50 text-gray-500 border-gray-200')}
      style={{ color }}
    >
      {icons[trajectory]}
      {trajectory}
    </span>
  );
}

// ── RecommendationBadge ──────────────────────────────────────────────────────

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation | string | null }) {
  if (!recommendation) return null;
  const cls = RECOMMENDATION_COLORS[recommendation] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full', cls)}>
      {recommendation}
    </span>
  );
}

// ── RiskBandBadge ────────────────────────────────────────────────────────────

export function RiskBandBadge({ band }: { band: RiskBand | string | null }) {
  if (!band) return null;
  const cls = RISK_BAND_COLORS[band] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full', cls)}>
      {band}
    </span>
  );
}

// ── RiskFlagBadge ────────────────────────────────────────────────────────────

export function RiskFlagBadge({ activeCount, highCount }: { activeCount: number; highCount: number }) {
  if (activeCount === 0) return <span className="text-xs text-gray-300">—</span>;
  if (highCount > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3" /> {activeCount} flag{activeCount !== 1 ? 's' : ''}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3 h-3" /> {activeCount} flag{activeCount !== 1 ? 's' : ''}
    </span>
  );
}

// ── PillarBar ────────────────────────────────────────────────────────────────

const PILLAR_COLORS = ['#10b981', '#3b82f6', '#64748b', '#f59e0b'];

export function PillarBar({
  label,
  value,
  max,
  pillarIndex,
}: {
  label: string;
  value: number;
  max: number;
  pillarIndex: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = PILLAR_COLORS[pillarIndex] ?? '#10b981';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-900">
          {value.toFixed(1)}<span className="font-normal text-gray-400">/{max}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── FRIScoreCard ─────────────────────────────────────────────────────────────

export function FRIScoreCard({
  score,
  zone,
  trajectory,
  isProvisional,
  baseline,
}: {
  score: number;
  zone: FriZone | string | null;
  trajectory?: Trajectory | string;
  isProvisional: boolean;
  baseline?: number | null;
}) {
  const color = zone ? (
    zone.includes('Leader')  ? '#10b981' :
    zone.includes('Builder') ? '#3b82f6' :
    zone.includes('Learner') ? '#f59e0b' :
    '#ef4444'
  ) : '#9ca3af';

  const delta = baseline != null ? score - baseline : null;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Score ring */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 border-4"
        style={{ borderColor: color }}
      >
        <div className="text-center">
          <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(score)}</p>
          <p className="text-[10px] text-gray-400 font-medium">/ 100</p>
        </div>
      </div>
      {/* Labels */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <ZoneBadge zone={zone} />
          <ScoreStatusBadge status={isProvisional ? 'provisional' : 'final'} />
        </div>
        {trajectory && <TrajectoryBadge trajectory={trajectory} />}
        {delta != null && (
          <p className="text-xs text-gray-500">
            <span className={delta >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)} pts
            </span>{' '}
            vs baseline ({baseline?.toFixed(0)})
          </p>
        )}
      </div>
    </div>
  );
}

// ── WeekStatusChip ───────────────────────────────────────────────────────────

export function WeekStatusChip({
  weekNum,
  score,
  status,
  active,
  onClick,
}: {
  weekNum: number;
  score: number | null;
  status: ScoreStatus | string;
  active?: boolean;
  onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    final:       'bg-emerald-500 text-white',
    approved:    'bg-emerald-500 text-white',
    provisional: 'bg-amber-400 text-white',
    submitted:   'bg-amber-400 text-white',
    pending:     'bg-gray-200 text-gray-500',
    missed:      'bg-red-400 text-white',
  };
  const cls = colors[status?.toLowerCase()] ?? 'bg-gray-200 text-gray-500';
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg w-11 h-14 transition-all border-2',
        cls,
        active ? 'scale-110 shadow-md border-gray-800' : 'border-transparent hover:scale-105',
      )}
    >
      <span className="text-[10px] font-medium opacity-80">W{weekNum}</span>
      {score != null
        ? <span className="text-sm font-bold leading-none">{Math.round(score)}</span>
        : <span className="text-xs opacity-60">—</span>
      }
    </button>
  );
}
