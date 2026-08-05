import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardCheck, HelpCircle, CalendarCheck,
  ChevronRight, AlertTriangle, Clock, UserPlus,
  WifiOff, RefreshCw, Leaf, CheckCircle, Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';

/* ── types ───────────────────────────────────────────────── */
interface KPIs {
  farmers: number;
  pendingVerifications: number;
  helpRequests: number;
  visitsDue: number;
}

interface QueueItem {
  /* null id = farmer hasn't submitted yet (agent-only path) */
  id: string | null;
  farmerId: string;
  farmerName: string;
  farmerPhoto: string | null;
  weekNumber: number;
  submittedAt: string | null;
  currentFRI: number | null;
  community: string;
  isAgentOnly: boolean;
  helpRequested: boolean;
}

interface CohortMeta {
  id: string;
  checkin_start_date: string | null;
  total_weeks: number | null;
}

interface WeatherAlert {
  type: 'dry' | 'pest' | 'flood';
  title: string;
  body: string;
  agentTip: string;
}

/* ── static weather alerts ───────────────────────────────── */
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

/* ── helpers ─────────────────────────────────────────────── */
function getWeekNumber(cohort: CohortMeta): number {
  if (!cohort.checkin_start_date) {
    const d = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  const start = new Date(cohort.checkin_start_date + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
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

/* ── priority action card ────────────────────────────────── */
function PriorityCard({
  icon: Icon, label, count, color, to,
}: {
  icon: React.ElementType; label: string; count: number; color: string; to: string;
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
          <p className="text-[10px] text-gray-400">Last synced {new Date(lastSyncedAt).toLocaleTimeString()}</p>
        )}
      </div>
      {isOnline && !isSyncing && pendingCount > 0 && (
        <button onClick={() => syncNow()} className="text-[10px] font-bold text-blue-600 underline">Sync now</button>
      )}
    </div>
  );
}

/* ── queue card ──────────────────────────────────────────── */
function QueueCard({ item }: { item: QueueItem }) {
  const age = item.submittedAt ? daysSince(item.submittedAt) : null;
  const urgent = age !== null && age > 3;
  const to = item.id ? `/agent/verify/${item.id}` : `/agent/verify/farmer/${item.farmerId}`;

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 bg-white rounded-xl border p-3 active:bg-gray-50 transition-colors',
        urgent ? 'border-red-200' : item.isAgentOnly ? 'border-dashed border-indigo-200' : 'border-gray-100'
      )}
    >
      <div className="relative w-9 h-9 shrink-0">
        <div className="w-9 h-9 rounded-full bg-cropguard-mint flex items-center justify-center">
          {item.farmerPhoto ? (
            <img src={item.farmerPhoto} alt={item.farmerName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="text-cropguard-dark font-bold text-sm">{item.farmerName.charAt(0)}</span>
          )}
        </div>
        {item.helpRequested && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <HelpCircle className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-cropguard-forest truncate">{item.farmerName}</p>
        <p className="text-[10px] text-gray-400">Week {item.weekNumber} · {item.community}</p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {item.isAgentOnly ? (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
            <Shield className="w-2 h-2" /> Verify Now
          </span>
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: zoneColor(item.currentFRI) }}
          >
            {item.currentFRI ?? '–'}
          </div>
        )}
        <span className={cn('text-[9px] font-semibold', urgent ? 'text-red-500' : 'text-gray-400')}>
          {age === null ? 'Not submitted' : age === 0 ? 'Today' : `${age}d ago`}
        </span>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
    </Link>
  );
}

/* ── main ────────────────────────────────────────────────── */
export default function AgentHomePage() {
  const profile = useAuthStore(s => s.profile);
  const [kpis, setKPIs] = useState<KPIs>({ farmers: 0, pendingVerifications: 0, helpRequests: 0, visitsDue: 0 });
  const [verificationQueue, setVerificationQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    if (!profile?.id) return;
    setLoading(true);

    // 1. All active enrollments for this agent
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('farmer_id, cohort_id')
      .eq('agent_id', profile.id)
      .eq('status', 'active');

    if (!enrollments?.length) {
      setKPIs({ farmers: 0, pendingVerifications: 0, helpRequests: 0, visitsDue: 0 });
      setLoading(false);
      return;
    }

    const farmerIds = enrollments.map(e => e.farmer_id);
    const cohortIds = [...new Set(enrollments.map(e => e.cohort_id).filter(Boolean))] as string[];

    // 2. Cohort metadata for week calculation
    const cohortMap: Record<string, CohortMeta> = {};
    if (cohortIds.length) {
      const { data: cohorts } = await supabase
        .from('cohorts')
        .select('id, checkin_start_date, total_weeks')
        .in('id', cohortIds);
      (cohorts ?? []).forEach((c: any) => { cohortMap[c.id] = c; });
    }

    // 3. Farmer details
    const { data: farmers } = await supabase
      .from('farmers')
      .select('id, full_name, photo_url, current_fri_score, community')
      .in('id', farmerIds);
    const farmerMap: Record<string, any> = {};
    (farmers ?? []).forEach((f: any) => { farmerMap[f.id] = f; });

    // 4. Existing check-ins for these farmers
    const { data: checkins } = await (supabase.from('farmer_checkins') as any)
      .select('id, farmer_id, week_number, created_at, help_requested, verified_at, status, is_agent_only')
      .in('farmer_id', farmerIds)
      .order('created_at', { ascending: false });

    // Index by farmer+week (most recent first)
    const checkinByKey: Record<string, any> = {};
    (checkins ?? []).forEach((c: any) => {
      const key = `${c.farmer_id}-${c.week_number}`;
      if (!checkinByKey[key]) checkinByKey[key] = c;
    });

    // 5. Build the full queue — one entry per enrolled farmer for their current week
    const allItems: QueueItem[] = enrollments.map((enr: any) => {
      const farmer = farmerMap[enr.farmer_id];
      const cohort = cohortMap[enr.cohort_id];
      const weekNum = cohort ? getWeekNumber(cohort) : 1;
      const existing = checkinByKey[`${enr.farmer_id}-${weekNum}`];

      return {
        id: existing?.id ?? null,
        farmerId: enr.farmer_id,
        farmerName: farmer?.full_name ?? 'Unknown',
        farmerPhoto: farmer?.photo_url ?? null,
        weekNumber: weekNum,
        submittedAt: existing?.created_at ?? null,
        currentFRI: farmer?.current_fri_score ?? null,
        community: farmer?.community ?? '',
        isAgentOnly: !existing,
        helpRequested: existing?.help_requested ?? false,
      };
    });

    // Pending = unverified (farmer submitted) + no submission yet
    const pending = allItems.filter(i => !i.id || !checkinByKey[`${i.farmerId}-${i.weekNumber}`]?.verified_at);
    const helpReqs = allItems.filter(i => i.helpRequested && !checkinByKey[`${i.farmerId}-${i.weekNumber}`]?.verified_at);

    // Sort: help requests first, then submitted-but-unverified, then not-yet-submitted
    const sorted = [...pending].sort((a, b) => {
      if (a.helpRequested && !b.helpRequested) return -1;
      if (!a.helpRequested && b.helpRequested) return 1;
      if (a.id && !b.id) return -1;
      if (!a.id && b.id) return 1;
      if (a.submittedAt && b.submittedAt) return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return 0;
    });

    setKPIs({
      farmers: enrollments.length,
      pendingVerifications: pending.length,
      helpRequests: helpReqs.length,
      visitsDue: 0,
    });
    setVerificationQueue(sorted);
    setLoading(false);
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
        <Link
          to="/agent/farmers/register"
          className="flex items-center gap-1.5 bg-cropguard-dark text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
        >
          <UserPlus className="w-3.5 h-3.5" /> Register
        </Link>
      </div>

      <SyncBanner />

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users}          label="Assigned Farmers"  value={kpis.farmers}              color="bg-cropguard-mint text-cropguard-dark" />
          <StatCard icon={ClipboardCheck} label="Pending Verify"    value={kpis.pendingVerifications} color="bg-orange-50 text-orange-600"          />
          <StatCard icon={HelpCircle}     label="Help Requests"     value={kpis.helpRequests}         color="bg-red-50 text-red-600"                />
          <StatCard icon={CalendarCheck}  label="Visits Due"        value={kpis.visitsDue}            color="bg-blue-50 text-blue-600"              />
        </div>
      )}

      {/* Priority actions */}
      <div className="space-y-2">
        <PriorityCard icon={ClipboardCheck} label="Pending verifications" count={kpis.pendingVerifications} color="bg-orange-50 border-orange-200 text-orange-700" to="/agent/checkins" />
        <PriorityCard icon={HelpCircle}     label="Help requests"         count={kpis.helpRequests}         color="bg-red-50 border-red-200 text-red-700"           to="/agent/checkins" />
      </div>

      {/* Verification queue */}
      {!loading && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Verification Queue</p>
            <Link to="/agent/checkins" className="text-xs text-cropguard-mid font-medium">See all</Link>
          </div>
          {verificationQueue.length === 0 ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-xs text-green-700 font-medium">All farmers verified for this week.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {verificationQueue.slice(0, 5).map(item => (
                <QueueCard key={item.farmerId} item={item} />
              ))}
            </div>
          )}
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
            {kpis.pendingVerifications > 0
              ? `${kpis.pendingVerifications} farmer${kpis.pendingVerifications !== 1 ? 's' : ''} pending verification this week. ${kpis.helpRequests > 0 ? `${kpis.helpRequests} help request${kpis.helpRequests !== 1 ? 's' : ''} need urgent attention.` : 'Prioritise oldest submissions first.'}`
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
