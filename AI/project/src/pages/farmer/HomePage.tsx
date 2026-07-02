import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  ChevronRight, TrendingUp, Leaf, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguageStore, LANGUAGES, type AppLanguage } from '@/store/language';

function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find(l => l.code === language)!;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-lg px-2 py-1 transition-colors"
      >
        <span className="text-[11px] font-semibold text-cropguard-dark">{current.label}</span>
        <ChevronDown className={cn('w-3 h-3 text-cropguard-slate transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[100px]">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => { setLanguage(lang.code as AppLanguage); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs transition-colors',
                lang.code === language
                  ? 'bg-cropguard-mint text-cropguard-dark font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── zone helpers ──────────────────────────────────────────── */
type ZoneName = 'leader' | 'builder' | 'learner' | 'starter' | 'none';

interface ZoneInfo {
  name: ZoneName;
  label: string;
  color: string;       // stroke / text hex
  ringColor: string;   // tailwind stroke class fallback
  status: 'verified' | 'provisional' | 'none';
}

function zoneOf(score: number | null): ZoneInfo {
  if (score === null) return { name: 'none',    label: 'Not Assessed', color: '#9CA3AF', ringColor: '', status: 'none'        };
  if (score >= 80)    return { name: 'leader',  label: 'Leader',       color: '#1A3D2B', ringColor: '', status: 'provisional' };
  if (score >= 60)    return { name: 'builder', label: 'Builder',      color: '#3D7A56', ringColor: '', status: 'provisional' };
  if (score >= 40)    return { name: 'learner', label: 'Learner',      color: '#E8963A', ringColor: '', status: 'provisional' };
  return                     { name: 'starter', label: 'Starter',      color: '#D94F3D', ringColor: '', status: 'provisional' };
}

/* ── FRI arc gauge ─────────────────────────────────────────── */
function FRIArc({ score, zone }: { score: number | null; zone: ZoneInfo }) {
  const r = 54, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  const filled = score !== null ? (score / 100) * circ * 0.75 : 0;
  return (
    <svg width="140" height="108" viewBox="0 0 140 108" aria-label={`FRI score ${score ?? 'not assessed'}`}>
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth="9"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`} />
      {/* fill */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={zone.color} strokeWidth="9"
        strokeDasharray={`${filled} ${circ - filled + circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cx - 5} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1A3D2B">
        {score ?? '–'}
      </text>
      <text x={cx} y={cx + 15} textAnchor="middle" fontSize="11" fontWeight="600" fill="#4A5568">
        {zone.label}
      </text>
    </svg>
  );
}

/* ── season trajectory badge ───────────────────────────────── */
function TrajectoryBadge({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const delta = scores[scores.length - 1] - scores[scores.length - 2];
  if (delta === 0) return null;
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold',
      delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    )}>
      <TrendingUp className={cn('w-3 h-3', delta < 0 && 'rotate-180')} />
      {delta > 0 ? '+' : ''}{delta} pts this week
    </div>
  );
}

/* ── Norvi strip ───────────────────────────────────────────── */
const TIPS = [
  'Complete your weekly check-in to keep your FRI score updated and unlock programme benefits.',
  'Farmers who apply recommended inputs score an average of 15 points higher in Agronomy.',
  'Record soil moisture readings this week to boost your CSA pillar score.',
  'Request an agent visit if you have challenges — it counts towards your Advisory pillar.',
];

const OPPS = [
  { title: 'Input Support',   desc: 'Subsidised seeds & fertiliser', emoji: '🌱', minFRI: 40  },
  { title: 'Crop Insurance',  desc: 'Weather-indexed coverage',       emoji: '🛡️', minFRI: 60  },
  { title: 'Market Linkage',  desc: 'Premium offtake contracts',      emoji: '📦', minFRI: 70  },
];

function weekNum() {
  const now = new Date(), s = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}

export default function FarmerHomePage() {
  const profile = useAuthStore(s => s.profile);
  const [zone, setZone]               = useState<ZoneInfo>(zoneOf(null));
  const [scoreHistory, setHistory]    = useState<number[]>([]);
  const [checkinDue, setCheckinDue]   = useState(false);
  const [program, setProgram]         = useState('');
  const tip = TIPS[new Date().getDay() % TIPS.length];

  useEffect(() => {
    if (!profile) return;

    supabase.from('farmers').select('id').eq('user_id', profile.id).maybeSingle()
      .then(({ data: f }) => {
        if (!f) return;

        // FRI history
        supabase.from('farmer_fri_scores').select('total_score, is_provisional')
          .eq('farmer_id', f.id).order('week_number', { ascending: true })
          .then(({ data }) => {
            if (!data?.length) return;
            const hist = data.map(r => r.total_score);
            setHistory(hist);
            const latest = data[data.length - 1];
            setZone({ ...zoneOf(latest.total_score), status: latest.is_provisional ? 'provisional' : 'verified' });
          });

        // Check-in due this week
        const wk = weekNum();
        supabase.from('farmer_checkins').select('id').eq('farmer_id', f.id).eq('week_number', wk).maybeSingle()
          .then(({ data: ci }) => setCheckinDue(!ci));
      });

    // Programme name
    supabase.from('enrollments').select('cohorts(programs(name))').eq('farmer_id', profile.id).eq('status', 'active').maybeSingle()
      .then(({ data }) => {
        const p = (data as { cohorts?: { programs?: { name: string } } } | null)?.cohorts?.programs?.name;
        if (p) setProgram(p);
      });
  }, [profile]);

  const greet = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const currentScore = zone.name !== 'none' ? scoreHistory[scoreHistory.length - 1] ?? null : null;

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-cropguard-slate">{greet()},</p>
          <h2 className="text-xl font-bold text-cropguard-forest">
            {profile?.full_name?.split(' ')[0] ?? 'Farmer'}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-0.5">
          <LanguageToggle />
          {program && (
            <div className="text-right">
              <p className="text-[10px] text-cropguard-slate uppercase tracking-wide">Programme</p>
              <p className="text-xs font-semibold text-cropguard-dark">{program}</p>
            </div>
          )}
        </div>
      </div>

      {/* FRI Score card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Farm Risk Index</p>
          <Link to="/farmer/score" className="text-xs text-cropguard-mid font-medium flex items-center gap-0.5">
            Details <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <FRIArc score={currentScore} zone={zone} />
          <div className="flex flex-col gap-2">
            {zone.status !== 'none' && (
              <Badge className={cn('text-[10px] border-0 w-fit',
                zone.status === 'verified' ? 'bg-cropguard-mint text-cropguard-dark' : 'bg-amber-100 text-amber-700')}>
                {zone.status === 'verified' ? 'Verified' : 'Provisional'}
              </Badge>
            )}
            <TrajectoryBadge scores={scoreHistory} />
            {zone.status === 'none' && (
              <p className="text-xs text-cropguard-slate leading-snug max-w-[140px]">
                Complete your first check-in to get a score
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Check-in CTA */}
      {checkinDue && (
        <Link to="/farmer/checkin"
          className="flex items-center gap-3 bg-cropguard-dark rounded-xl p-3.5 hover:bg-cropguard-forest active:scale-[0.98] transition-all">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Weekly check-in due</p>
            <p className="text-cropguard-pale text-xs">Report your farm activities this week</p>
          </div>
          <ChevronRight className="w-4 h-4 text-cropguard-pale shrink-0" />
        </Link>
      )}

      {/* Norvi AI strip */}
      <div className="flex gap-3 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
        <div className="w-8 h-8 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Leaf className="w-4 h-4 text-cropguard-light" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-cropguard-dark uppercase tracking-wider mb-0.5">Norvi AI</p>
          <p className="text-xs text-cropguard-forest leading-relaxed">{tip}</p>
        </div>
      </div>

      {/* Weather alert placeholder */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-800">Dry spell forecast</p>
          <p className="text-[11px] text-amber-700">Apply mulching to conserve soil moisture this week.</p>
        </div>
      </div>

      {/* For You */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">For You</p>
          <Link to="/farmer/opps" className="text-xs text-cropguard-mid font-medium">See all</Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
          {OPPS.map(opp => {
            const eligible = currentScore !== null && currentScore >= opp.minFRI;
            return (
              <Link key={opp.title} to="/farmer/opps"
                className={cn(
                  'snap-start flex-shrink-0 w-36 bg-white rounded-xl p-2.5 border shadow-sm transition-colors',
                  eligible ? 'border-cropguard-pale' : 'border-gray-100 opacity-60'
                )}>
                <div className="text-xl mb-1">{opp.emoji}</div>
                <p className="text-xs font-semibold text-cropguard-forest">{opp.title}</p>
                <p className="text-[10px] text-cropguard-slate mt-0.5 leading-tight">{opp.desc}</p>
                <Badge className={cn('mt-1.5 text-[9px] border-0',
                  eligible ? 'bg-cropguard-mint text-cropguard-dark' : 'bg-gray-100 text-gray-500')}>
                  {eligible ? 'Eligible' : `Need ${opp.minFRI} FRI`}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
