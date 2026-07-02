import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Leaf, TrendingUp, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

/* ── types ───────────────────────────────────────────────── */
interface FRIRow {
  week_number: number;
  total_score: number;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p4_score: number;
  is_provisional: boolean;
}

/* ── zone helper ─────────────────────────────────────────── */
function zoneColor(score: number | null) {
  if (score === null) return '#9CA3AF';
  if (score >= 80) return '#1A3D2B';
  if (score >= 60) return '#3D7A56';
  if (score >= 40) return '#E8963A';
  return '#D94F3D';
}
function zoneLabel(score: number | null) {
  if (score === null) return 'Not Assessed';
  if (score >= 80) return 'Leader';
  if (score >= 60) return 'Builder';
  if (score >= 40) return 'Learner';
  return 'Starter';
}

/* ── FRI arc ─────────────────────────────────────────────── */
function FRIArc({ score }: { score: number | null }) {
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  const color = zoneColor(score);
  const filled = score !== null ? (score / 100) * circ * 0.75 : 0;
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
        {zoneLabel(score)}
      </text>
    </svg>
  );
}

/* ── PillarBar ────────────────────────────────────────────── */
interface PillarBarProps {
  label: string;
  score: number;
  max: number;
  color: string;
}
function PillarBar({ label, score, max, color }: PillarBarProps) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{score}<span className="text-gray-400 font-normal">/{max}</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ── WeekStatusChip ──────────────────────────────────────── */
function WeekStatusChip({ week, score, isProvisional }: { week: number; score: number | null; isProvisional?: boolean }) {
  const color = score !== null ? zoneColor(score) : '#E5E7EB';
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {score !== null ? (isProvisional ? 'P' : 'V') : '–'}
      </div>
      <span className="text-[8px] text-gray-400">{week === 0 ? 'Base' : `W${week}`}</span>
    </div>
  );
}

/* ── Norvi interpretation ────────────────────────────────── */
function buildInterpretation(latest: FRIRow | null): string {
  if (!latest) return 'Complete your first check-in to receive a personalised Norvi AI farm assessment.';
  const { total_score, p1_score, p2_score, p3_score, p4_score } = latest;
  const zone = zoneLabel(total_score);
  const weakest = [
    { name: 'Agronomy', score: p1_score, max: 30 },
    { name: 'CSA', score: p2_score, max: 30 },
    { name: 'Advisory', score: p3_score, max: 20 },
    { name: 'Discipline', score: p4_score, max: 20 },
  ].sort((a, b) => (a.score / a.max) - (b.score / b.max));
  return `Your Farm Risk Index of ${total_score} places you in the ${zone} zone. Your ${weakest[0].name} and ${weakest[1].name} pillars have the most room for improvement. Focus on these areas this week to advance your score and unlock more programme benefits.`;
}

/* ── top improvements ─────────────────────────────────────── */
const IMPROVE_TIPS: Record<string, string> = {
  p1: 'Apply recommended inputs and record planting/weeding activities on time.',
  p2: 'Record soil moisture readings and practice one CSA technique this week.',
  p3: 'Request an agent visit or complete a training session to boost advisory pillar.',
  p4: 'Submit your check-in by Thursday to maintain your Discipline score.',
};
const PILLAR_KEYS = ['p1', 'p2', 'p3', 'p4'] as const;

function topTwoImprovements(latest: FRIRow | null) {
  if (!latest) return [];
  const pillars = [
    { key: 'p1', score: latest.p1_score, max: 30 },
    { key: 'p2', score: latest.p2_score, max: 30 },
    { key: 'p3', score: latest.p3_score, max: 20 },
    { key: 'p4', score: latest.p4_score, max: 20 },
  ];
  return pillars.sort((a, b) => (a.score / a.max) - (b.score / b.max)).slice(0, 2);
}

/* ── custom tooltip ──────────────────────────────────────── */
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow text-xs font-semibold text-cropguard-dark">
      {payload[0].value} pts
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */
export default function ScorePage() {
  const profile = useAuthStore(s => s.profile);
  const [rows, setRows] = useState<FRIRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('farmers').select('id').eq('user_id', profile.id).maybeSingle()
      .then(({ data: f }) => {
        if (!f) { setLoading(false); return; }
        supabase.from('farmer_fri_scores')
          .select('week_number, total_score, p1_score, p2_score, p3_score, p4_score, is_provisional')
          .eq('farmer_id', f.id)
          .order('week_number', { ascending: true })
          .then(({ data }) => {
            setRows((data as FRIRow[]) ?? []);
            setLoading(false);
          });
      });
  }, [profile]);

  const latest = rows[rows.length - 1] ?? null;
  const currentScore = latest?.total_score ?? null;
  const chartData = rows.map(r => ({ week: r.week_number === 0 ? 'Base' : `W${r.week_number}`, score: r.total_score }));
  const top2 = topTwoImprovements(latest);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">My Score</h2>
        <p className="text-sm text-cropguard-slate">Current season — Farm Risk Index</p>
      </div>

      {/* FRI card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <FRIArc score={currentScore} />
          <div className="flex-1 space-y-3">
            {latest && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  latest.is_provisional ? 'bg-amber-100 text-amber-700' : 'bg-cropguard-mint text-cropguard-dark'
                )}>
                  {latest.is_provisional ? 'Provisional' : 'Verified'}
                </span>
                {rows.length >= 2 && (() => {
                  const delta = rows[rows.length - 1].total_score - rows[rows.length - 2].total_score;
                  return delta !== 0 ? (
                    <span className={cn(
                      'inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full',
                      delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    )}>
                      <TrendingUp className={cn('w-2.5 h-2.5', delta < 0 && 'rotate-180')} />
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
            <div className="text-xs text-cropguard-slate leading-relaxed">
              {currentScore === null
                ? 'Complete your first weekly check-in to receive your FRI score.'
                : `${latest?.week_number === 0 ? 'Baseline assessment' : `Week ${latest?.week_number} result`}. Agent verification pending.`}
            </div>
          </div>
        </div>
      </div>

      {/* Pillar breakdown */}
      {latest && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Pillar Breakdown</p>
          <PillarBar label="P1 — Agronomy"   score={latest.p1_score} max={30} color="#1A3D2B" />
          <PillarBar label="P2 — CSA"         score={latest.p2_score} max={30} color="#3D7A56" />
          <PillarBar label="P3 — Advisory"   score={latest.p3_score} max={20} color="#E8963A" />
          <PillarBar label="P4 — Discipline" score={latest.p4_score} max={20} color="#2563EB" />
        </div>
      )}

      {/* Sparkline */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide mb-3">Score Trend</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone" dataKey="score" stroke="#3D7A56" strokeWidth={2}
                dot={{ r: 3, fill: '#3D7A56', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#1A3D2B' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly status grid */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide mb-3">Weekly History</p>
          <div className="flex gap-2 flex-wrap">
            {rows.map(r => (
              <WeekStatusChip
                key={r.week_number}
                week={r.week_number}
                score={r.total_score}
                isProvisional={r.is_provisional}
              />
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-2">P = Provisional &nbsp;·&nbsp; V = Verified</p>
        </div>
      )}

      {/* Norvi AI interpretation */}
      <div className="flex gap-3 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
        <div className="w-8 h-8 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Leaf className="w-4 h-4 text-cropguard-light" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-cropguard-dark uppercase tracking-wider mb-0.5">Norvi AI</p>
          <p className="text-xs text-cropguard-forest leading-relaxed">{buildInterpretation(latest)}</p>
        </div>
      </div>

      {/* What to improve */}
      {top2.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">What to Improve</p>
          {top2.map(({ key }) => (
            <div key={key} className="flex gap-2.5 items-start p-3 bg-gray-50 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-cropguard-dark flex items-center justify-center shrink-0 mt-0.5">
                <ChevronUp className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{IMPROVE_TIPS[key as typeof PILLAR_KEYS[number]]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
