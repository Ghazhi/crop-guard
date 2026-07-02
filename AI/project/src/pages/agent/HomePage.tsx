import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardCheck, HelpCircle, CalendarCheck,
  ChevronRight, AlertTriangle, Clock, UserPlus,
  WifiOff, RefreshCw, Leaf, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

/* ── types ───────────────────────────────────────────────── */
interface KPIs {
  farmers: number;
  pendingVerifications: number;
  helpRequests: number;
  visitsDue: number;
}

interface PendingCheckin {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhoto: string | null;
  weekNumber: number;
  submittedAt: string;
  currentFRI: number | null;
  community: string;
}

interface WeatherAlert {
  type: 'dry' | 'pest' | 'flood';
  title: string;
  body: string;
  agentTip: string;
}

/* ── weather alerts (static this sprint) ────────────────── */
const WEATHER_ALERTS: WeatherAlert[] = [
  {
    type: 'dry',
    title: 'Dry Spell — 10-day forecast',
    body: 'Rainfall <20mm expected across Northern and Savannah regions.',
    agentTip: 'Advise farmers to mulch immediately and delay fertiliser application.',
  },
  {
    type: 'pest',
    title: 'Fall Armyworm Risk',
    body: 'Elevated FAW pressure reported in Ejura–Sekyedumase district.',
    agentTip: 'Conduct visual scouting on your next farm visit and report any outbreaks.',
  },
];

const WEATHER_COLORS: Record<WeatherAlert['type'], string> = {
  dry:   'bg-amber-50 border-amber-100',
  pest:  'bg-red-50 border-red-100',
  flood: 'bg-blue-50 border-blue-100',
};

/* ── stat card ───────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-cropguard-slate leading-none mb-0.5">{label}</p>
        <p className="text-xl font-black text-cropguard-forest leading-none">{value}</p>
      </div>
    </div>
  );
}

/* ── priority action card ────────────────────────────────── */
function PriorityCard({
  icon: Icon,
  label,
  count,
  color,
  to,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  to: string;
}) {
  if (count === 0) return null;
  return (
    <Link to={to} className={cn('flex items-center gap-3 rounded-xl border p-3 active:scale-[0.98] transition-transform', color)}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-xs font-semibold flex-1">{label}</span>
      <div className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center">
        <span className="text-[10px] font-bold">{count}</span>
      </div>
      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
    </Link>
  );
}

/* ── sync banner ─────────────────────────────────────────── */
function SyncBanner() {
  const { pendingCount, isSyncing, lastSyncedAt, isOnline, syncNow } = useOfflineStore();
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-xl border p-3',
      isOnline ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'
    )}>
      {!isOnline ? (
        <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
      ) : isSyncing ? (
        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
      )}
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-700">
          {!isOnline ? 'Working offline' : isSyncing ? 'Syncing…' : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`}
        </p>
        {lastSyncedAt && (
          <p className="text-[10px] text-gray-400">
            Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
      {isOnline && !isSyncing && pendingCount > 0 && (
        <button onClick={() => syncNow()} className="text-[10px] font-bold text-blue-600 underline">
          Sync now
        </button>
      )}
    </div>
  );
}

/* ── main ────────────────────────────────────────────────── */
export default function AgentHomePage() {
  const profile = useAuthStore(s => s.profile);
  const [kpis, setKPIs] = useState<KPIs>({ farmers: 0, pendingVerifications: 0, helpRequests: 0, visitsDue: 0 });
  const [verificationQueue, setVerificationQueue] = useState<PendingCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    if (!profile) return;
    setLoading(true);
    const orgId = profile.organisation_id;
    if (!orgId) { setLoading(false); return; }

    // Farmers count — only those explicitly assigned to this agent via enrollments
    const [{ count: farmerCount }, { data: checkins }, { data: helpCheckins }] = await Promise.all([
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('agent_id', profile.id).eq('status', 'active'),
      supabase.from('farmer_checkins')
        .select('id, farmer_id, week_number, created_at, help_requested, farmers(full_name, photo_url, current_fri_score, community)')
        .eq('organisation_id', orgId)
        .is('verified_at', null)
        .order('created_at', { ascending: true })
        .limit(20),
      supabase.from('farmer_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', orgId)
        .eq('help_requested', true)
        .is('verified_at', null),
    ]);

    const pendingVer = checkins?.length ?? 0;
    const helpReqs = helpCheckins?.length ?? 0;

    setKPIs({
      farmers: farmerCount ?? 0,
      pendingVerifications: pendingVer,
      helpRequests: helpReqs,
      visitsDue: 0,
    });

    if (checkins) {
      setVerificationQueue(
        checkins.map(c => {
          const farmer = c.farmers as { full_name: string; photo_url: string | null; current_fri_score: number | null; community: string } | null;
          return {
            id: c.id,
            farmerId: c.farmer_id,
            farmerName: farmer?.full_name ?? 'Unknown',
            farmerPhoto: farmer?.photo_url ?? null,
            weekNumber: c.week_number,
            submittedAt: c.created_at,
            currentFRI: farmer?.current_fri_score ?? null,
            community: farmer?.community ?? '',
          };
        })
      );
    }
    setLoading(false);
  }

  function daysSince(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  function zoneColor(score: number | null) {
    if (score === null) return '#9CA3AF';
    if (score >= 80) return '#1A3D2B';
    if (score >= 60) return '#3D7A56';
    if (score >= 40) return '#E8963A';
    return '#D94F3D';
  }

  const greet = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-cropguard-slate">{greet()},</p>
          <h2 className="text-xl font-bold text-cropguard-forest">
            {profile?.full_name?.split(' ')[0] ?? 'Agent'}
          </h2>
        </div>
        <Link to="/agent/farmers/register"
          className="flex items-center gap-1.5 bg-cropguard-dark text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform">
          <UserPlus className="w-3.5 h-3.5" /> Register
        </Link>
      </div>

      <SyncBanner />

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users}         label="Assigned Farmers"   value={kpis.farmers}               accent="bg-cropguard-mint text-cropguard-dark" />
          <StatCard icon={ClipboardCheck} label="Pending Verify"    value={kpis.pendingVerifications}  accent="bg-orange-50 text-orange-600"          />
          <StatCard icon={HelpCircle}     label="Help Requests"     value={kpis.helpRequests}           accent="bg-red-50 text-red-600"                />
          <StatCard icon={CalendarCheck}  label="Visits Due"        value={kpis.visitsDue}              accent="bg-blue-50 text-blue-600"              />
        </div>
      )}

      {/* Priority actions */}
      <div className="space-y-2">
        <PriorityCard icon={ClipboardCheck} label="Pending verifications" count={kpis.pendingVerifications} color="bg-orange-50 border-orange-200 text-orange-700" to="/agent/checkins" />
        <PriorityCard icon={HelpCircle}     label="Help requests"         count={kpis.helpRequests}         color="bg-red-50 border-red-200 text-red-700"           to="/agent/checkins" />
      </div>

      {/* Verification queue */}
      {verificationQueue.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Verification Queue</p>
            <Link to="/agent/checkins" className="text-xs text-cropguard-mid font-medium">See all</Link>
          </div>
          <div className="space-y-2">
            {verificationQueue.slice(0, 5).map(ci => {
              const age = daysSince(ci.submittedAt);
              return (
                <Link
                  key={ci.id}
                  to={`/agent/verify/${ci.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 active:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
                    {ci.farmerPhoto ? (
                      <img src={ci.farmerPhoto} alt={ci.farmerName} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <span className="text-cropguard-dark font-bold text-sm">{ci.farmerName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-cropguard-forest truncate">{ci.farmerName}</p>
                    <p className="text-[10px] text-gray-400">Week {ci.weekNumber} · {ci.community}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: zoneColor(ci.currentFRI) }}
                    >
                      {ci.currentFRI ?? '–'}
                    </div>
                    <span className={cn('text-[9px] font-semibold', age > 3 ? 'text-red-500' : 'text-gray-400')}>
                      {age === 0 ? 'Today' : `${age}d ago`}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Norvi AI strip */}
      <div className="flex gap-3 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
        <div className="w-8 h-8 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Leaf className="w-4 h-4 text-cropguard-light" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-cropguard-dark uppercase tracking-wider mb-0.5">Norvi AI · Agent Brief</p>
          <p className="text-xs text-cropguard-forest leading-relaxed">
            {verificationQueue.length > 0
              ? `${verificationQueue.length} check-in${verificationQueue.length !== 1 ? 's' : ''} awaiting verification. Prioritise oldest submissions to maintain farmer FRI score timeliness.`
              : 'All check-ins are verified. Focus on farm visits and advisory sessions to maintain cohort scores.'}
          </p>
        </div>
      </div>

      {/* Weather alerts */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Weather Alerts</p>
        {WEATHER_ALERTS.map(alert => (
          <div key={alert.title} className={cn('rounded-xl border p-3 space-y-1.5', WEATHER_COLORS[alert.type])}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-gray-800">{alert.title}</p>
            </div>
            <p className="text-[11px] text-gray-600">{alert.body}</p>
            <div className="flex items-start gap-1.5 bg-white/60 rounded-lg p-2">
              <CheckCircle className="w-3 h-3 text-cropguard-mid shrink-0 mt-0.5" />
              <p className="text-[10px] text-cropguard-forest font-medium">{alert.agentTip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
