import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, ChevronRight, Users, CheckCircle, HelpCircle,
  Shield, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/* ── types ─────────────────────────────────────────────── */
interface CheckinSummary {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhoto: string | null;
  community: string;
  weekNumber: number;
  submittedAt: string;
  helpRequested: boolean;
  verifiedAt: string | null;
  currentFRI: number | null;
  cohortName: string | null;
  verificationMode: 'farmer_then_agent' | 'agent_only';
  status: string;
  isAgentOnly: boolean;
  hasCheckin: boolean;
  /** true when this row is for the cohort's current week */
  isCurrentWeek: boolean;
  /** the cohort's current week number (for due-date comparison) */
  cohortCurrentWeek: number;
}

interface CohortMeta {
  id: string;
  name: string;
  checkin_start_date: string | null;
  checkin_window_days: number;
  checkin_grace_days: number;
  schedule_paused: boolean;
  total_weeks: number | null;
}

/* ── week calculation ──────────────────────────────────── */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekNumber(cohort: CohortMeta): number {
  if (!cohort.checkin_start_date) return getISOWeekNumber(new Date());
  const startDate = new Date(cohort.checkin_start_date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / 86400000);
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
}

/* ── helpers ─────────────────────────────────────────────── */
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

/* ── checkin card ────────────────────────────────────────── */
function CheckinCard({ ci }: { ci: CheckinSummary }) {
  const age = ci.hasCheckin ? daysSince(ci.submittedAt) : 0;
  const urgent = ci.hasCheckin && !ci.verifiedAt && age > 3;

  const linkTo = ci.hasCheckin
    ? `/agent/verify/${ci.id}`
    : `/agent/verify/farmer/${ci.farmerId}`;

  return (
    <Link
      to={linkTo}
      className={cn(
        'flex items-center gap-3 bg-white rounded-xl border p-3.5 active:bg-gray-50 transition-colors',
        urgent ? 'border-red-200' : ci.verifiedAt ? 'border-green-100' : !ci.hasCheckin ? 'border-dashed border-indigo-200' : 'border-gray-100'
      )}
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-cropguard-mint flex items-center justify-center">
          {ci.farmerPhoto ? (
            <img src={ci.farmerPhoto} alt={ci.farmerName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="text-cropguard-dark font-bold text-xs">{ci.farmerName.charAt(0)}</span>
          )}
        </div>
        {ci.helpRequested && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <HelpCircle className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-cropguard-forest truncate">{ci.farmerName}</p>
        <p className="text-[10px] text-gray-400">{ci.community} · Week {ci.weekNumber}</p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {ci.isAgentOnly && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
            <Shield className="w-2 h-2" /> Agent Only
          </span>
        )}
        {ci.verifiedAt ? (
          <div className="flex items-center gap-1 text-[9px] font-semibold text-green-600">
            <CheckCircle className="w-3 h-3" /> Verified
          </div>
        ) : ci.hasCheckin && ci.status === 'submitted' ? (
          <>
            <div
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: zoneColor(ci.currentFRI) }}
            >
              {ci.currentFRI ?? '–'}
            </div>
            <span className={cn('text-[9px] font-semibold', urgent ? 'text-red-500' : 'text-gray-400')}>
              {age === 0 ? 'Today' : `${age}d ago`}
            </span>
          </>
        ) : ci.hasCheckin && ci.status === 'draft' ? (
          <span className="text-[9px] font-semibold text-gray-400 capitalize">Draft</span>
        ) : (
          <span className="text-[9px] font-semibold text-indigo-500 flex items-center gap-0.5">
            <Shield className="w-2.5 h-2.5" /> Verify Now
          </span>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
    </Link>
  );
}

/* ── stat row ────────────────────────────────────────────── */
function StatRow({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl border p-3', color)}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium flex-1">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}

/* ── collapsible cohort group ────────────────────────────── */
function CohortGroup({ cohort, items }: { cohort: string; items: CheckinSummary[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-0.5"
      >
        <Users className="w-3.5 h-3.5 text-cropguard-mid shrink-0" />
        <p className="text-[10px] font-bold text-cropguard-slate uppercase tracking-wide flex-1 text-left">{cohort}</p>
        <span className="text-[9px] text-gray-400 font-semibold">{items.length}</span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        }
      </button>
      {open && (
        <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto scrollbar-thin pr-1">
          {items.map(ci => <CheckinCard key={ci.id || ci.farmerId} ci={ci} />)}
        </div>
      )}
    </div>
  );
}

/* ── tab badge ───────────────────────────────────────────── */
function TabBadge({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span className={cn('ml-1 text-white text-[8px] px-1 rounded-full', color)}>{count}</span>
  );
}

type Tab = 'pending' | 'missed' | 'verified' | 'all';

/* ── main page ───────────────────────────────────────────── */
export default function CheckinsPage() {
  const profile = useAuthStore(s => s.profile);
  const [checkins, setCheckins] = useState<CheckinSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('pending');

  useEffect(() => {
    if (!profile) return;
    loadCheckins();
  }, [profile]);

  async function loadCheckins() {
    if (!profile?.id || !profile?.organisation_id) { setLoading(false); return; }

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('farmer_id, cohort_id, agent_id, status')
      .eq('agent_id', profile.id)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) { setLoading(false); return; }

    const farmerIds = enrollments.map(e => e.farmer_id);
    const cohortIds = [...new Set(enrollments.map(e => e.cohort_id).filter(Boolean))] as string[];

    const cohortMap: Record<string, CohortMeta> = {};
    if (cohortIds.length > 0) {
      const { data: cohorts } = await supabase
        .from('cohorts')
        .select('id, name, checkin_start_date, checkin_window_days, checkin_grace_days, schedule_paused, total_weeks')
        .in('id', cohortIds);
      (cohorts ?? []).forEach((c: any) => { cohortMap[c.id] = c as CohortMeta; });
    }

    const { data: farmers } = await supabase
      .from('farmers')
      .select('id, full_name, photo_url, current_fri_score, community')
      .in('id', farmerIds);

    const farmerMap: Record<string, any> = {};
    (farmers ?? []).forEach((f: any) => { farmerMap[f.id] = f; });

    const { data: existingCheckins } = await (supabase.from('farmer_checkins') as any)
      .select('id, farmer_id, week_number, created_at, help_requested, verified_at, status, verification_mode, is_agent_only')
      .in('farmer_id', farmerIds)
      .order('created_at', { ascending: false });

    const allCheckins: any[] = existingCheckins ?? [];

    // Index by farmer+week
    const checkinByFarmerWeek: Record<string, any> = {};
    allCheckins.forEach((c: any) => {
      const key = `${c.farmer_id}-${c.week_number}`;
      if (!checkinByFarmerWeek[key]) checkinByFarmerWeek[key] = c;
    });

    const enrollmentByFarmer: Record<string, any> = {};
    enrollments.forEach((e: any) => { enrollmentByFarmer[e.farmer_id] = e; });

    // Current-week row per enrolled farmer
    const currentWeekSummaries: CheckinSummary[] = enrollments.map((enr: any) => {
      const farmer  = farmerMap[enr.farmer_id];
      const cohort  = cohortMap[enr.cohort_id];
      const currentWeek = cohort ? getWeekNumber(cohort) : getISOWeekNumber(new Date());
      const existing    = checkinByFarmerWeek[`${enr.farmer_id}-${currentWeek}`];
      return {
        id: existing?.id ?? '',
        farmerId: enr.farmer_id,
        farmerName: farmer?.full_name ?? 'Unknown',
        farmerPhoto: farmer?.photo_url ?? null,
        community: farmer?.community ?? '',
        weekNumber: currentWeek,
        submittedAt: existing?.created_at ?? new Date().toISOString(),
        helpRequested: existing?.help_requested ?? false,
        verifiedAt: existing?.verified_at ?? null,
        currentFRI: farmer?.current_fri_score ?? null,
        cohortName: cohort?.name ?? null,
        verificationMode: existing?.verification_mode ?? 'farmer_then_agent',
        status: existing?.status ?? 'pending',
        isAgentOnly: existing?.is_agent_only ?? false,
        hasCheckin: !!existing,
        isCurrentWeek: true,
        cohortCurrentWeek: currentWeek,
      };
    });

    // Missed: past-week unverified check-ins (submitted but not verified)
    const currentWeekCheckinIds = new Set(currentWeekSummaries.map(s => s.id).filter(Boolean));

    const missedSummaries: CheckinSummary[] = allCheckins
      .filter((c: any) => !c.verified_at && !currentWeekCheckinIds.has(c.id))
      .map((c: any) => {
        const farmer = farmerMap[c.farmer_id];
        const enr    = enrollmentByFarmer[c.farmer_id];
        const cohort = enr ? cohortMap[enr.cohort_id] : null;
        const currentWeek = cohort ? getWeekNumber(cohort) : getISOWeekNumber(new Date());
        return {
          id: c.id,
          farmerId: c.farmer_id,
          farmerName: farmer?.full_name ?? 'Unknown',
          farmerPhoto: farmer?.photo_url ?? null,
          community: farmer?.community ?? '',
          weekNumber: c.week_number,
          submittedAt: c.created_at,
          helpRequested: c.help_requested ?? false,
          verifiedAt: c.verified_at ?? null,
          currentFRI: farmer?.current_fri_score ?? null,
          cohortName: cohort?.name ?? null,
          verificationMode: c.verification_mode ?? 'farmer_then_agent',
          status: c.status,
          isAgentOnly: c.is_agent_only ?? false,
          hasCheckin: true,
          isCurrentWeek: false,
          cohortCurrentWeek: currentWeek,
        };
      });

    // Verified: all verified check-ins across all weeks
    const verifiedSummaries: CheckinSummary[] = allCheckins
      .filter((c: any) => !!c.verified_at)
      .map((c: any) => {
        const farmer = farmerMap[c.farmer_id];
        const enr    = enrollmentByFarmer[c.farmer_id];
        const cohort = enr ? cohortMap[enr.cohort_id] : null;
        const currentWeek = cohort ? getWeekNumber(cohort) : getISOWeekNumber(new Date());
        return {
          id: c.id,
          farmerId: c.farmer_id,
          farmerName: farmer?.full_name ?? 'Unknown',
          farmerPhoto: farmer?.photo_url ?? null,
          community: farmer?.community ?? '',
          weekNumber: c.week_number,
          submittedAt: c.created_at,
          helpRequested: c.help_requested ?? false,
          verifiedAt: c.verified_at,
          currentFRI: farmer?.current_fri_score ?? null,
          cohortName: cohort?.name ?? null,
          verificationMode: c.verification_mode ?? 'farmer_then_agent',
          status: c.status,
          isAgentOnly: c.is_agent_only ?? false,
          hasCheckin: true,
          isCurrentWeek: c.week_number === currentWeek,
          cohortCurrentWeek: currentWeek,
        };
      });

    // All tab: current week + all verified + missed (deduplicated by id)
    const seen = new Set<string>();
    const allSummaries: CheckinSummary[] = [];
    for (const s of [...currentWeekSummaries, ...missedSummaries, ...verifiedSummaries]) {
      const key = s.id || s.farmerId;
      if (!seen.has(key)) { seen.add(key); allSummaries.push(s); }
    }

    setCheckins(allSummaries);
    setLoading(false);
  }

  // Tab datasets
  const pending  = checkins.filter(c => c.isCurrentWeek && !c.verifiedAt);
  const missed   = checkins.filter(c => !c.isCurrentWeek && !c.verifiedAt && c.hasCheckin);
  const verified = checkins.filter(c => !!c.verifiedAt);
  const helpReqs = checkins.filter(c => c.helpRequested && !c.verifiedAt);

  const displayed =
    tab === 'pending'  ? pending  :
    tab === 'missed'   ? missed   :
    tab === 'verified' ? verified :
    checkins;

  const grouped = displayed.reduce<Record<string, CheckinSummary[]>>((acc, ci) => {
    const key = ci.cohortName ?? 'Unassigned';
    (acc[key] = acc[key] ?? []).push(ci);
    return acc;
  }, {});

  const tabs: { key: Tab; label: string; count: number; badgeColor: string }[] = [
    { key: 'pending',  label: 'Pending',  count: pending.length,  badgeColor: 'bg-orange-400' },
    { key: 'missed',   label: 'Missed',   count: missed.length,   badgeColor: 'bg-red-500'    },
    { key: 'verified', label: 'Verified', count: verified.length, badgeColor: 'bg-green-500'  },
    { key: 'all',      label: 'All',      count: checkins.length, badgeColor: 'bg-gray-500'   },
  ];

  const emptyMessage =
    tab === 'pending'  ? 'No pending verifications this week.' :
    tab === 'missed'   ? 'No missed check-ins.' :
    tab === 'verified' ? 'No verified check-ins yet.' :
    'No check-ins found.';

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">Check-ins</h2>
        <p className="text-sm text-cropguard-slate">Weekly verification queue</p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="space-y-1.5">
          <StatRow icon={ClipboardCheck} label="Pending verification" value={pending.length}  color="bg-orange-50 border-orange-200 text-orange-700" />
          <StatRow icon={CheckCircle}    label="Verified"             value={verified.length} color="bg-green-50 border-green-200 text-green-700"   />
          <StatRow icon={HelpCircle}     label="Help requests"        value={helpReqs.length} color="bg-red-50 border-red-200 text-red-700"          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ key, label, count, badgeColor }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-colors',
              tab === key ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500'
            )}
          >
            {label}
            <TabBadge count={count} color={badgeColor} />
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12">
          {tab === 'missed'
            ? <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            : <ClipboardCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          }
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cohort, items]) => (
            <CohortGroup key={cohort} cohort={cohort} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}
