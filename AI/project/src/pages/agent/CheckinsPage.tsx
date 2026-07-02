import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ChevronRight, Users, CheckCircle, Clock, HelpCircle } from 'lucide-react';
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
  const age = daysSince(ci.submittedAt);
  const urgent = !ci.verifiedAt && age > 3;

  return (
    <Link
      to={`/agent/verify/${ci.id}`}
      className={cn(
        'flex items-center gap-3 bg-white rounded-xl border p-3.5 active:bg-gray-50 transition-colors',
        urgent ? 'border-red-200' : ci.verifiedAt ? 'border-green-100' : 'border-gray-100'
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
        {ci.verifiedAt ? (
          <div className="flex items-center gap-1 text-[9px] font-semibold text-green-600">
            <CheckCircle className="w-3 h-3" /> Verified
          </div>
        ) : (
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

/* ── main page ───────────────────────────────────────────── */
export default function CheckinsPage() {
  const profile = useAuthStore(s => s.profile);
  const [checkins, setCheckins] = useState<CheckinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'verified' | 'all'>('pending');

  useEffect(() => {
    if (!profile) return;
    loadCheckins();
  }, [profile]);

  async function loadCheckins() {
    if (!profile?.organisation_id) { setLoading(false); return; }

    const { data } = await supabase
      .from('farmer_checkins')
      .select(`
        id, farmer_id, week_number, created_at, help_requested, verified_at,
        farmers(full_name, photo_url, current_fri_score, community)
      `)
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (!data) { setLoading(false); return; }

    // Load cohort names for each farmer via their active enrollment
    const farmerIds = data.map(c => c.farmer_id);
    const cohortMap: Record<string, string> = {};
    if (farmerIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('farmer_id, cohorts(name)')
        .in('farmer_id', farmerIds)
        .eq('status', 'active');
      (enrollments ?? []).forEach((e: any) => {
        const name = e.cohorts?.name;
        if (name) cohortMap[e.farmer_id] = name;
      });
    }

    setCheckins(data.map(c => {
      const f = c.farmers as {
        full_name: string;
        photo_url: string | null;
        current_fri_score: number | null;
        community: string;
      } | null;
      return {
        id: c.id,
        farmerId: c.farmer_id,
        farmerName: f?.full_name ?? 'Unknown',
        farmerPhoto: f?.photo_url ?? null,
        community: f?.community ?? '',
        weekNumber: c.week_number,
        submittedAt: c.created_at,
        helpRequested: c.help_requested,
        verifiedAt: c.verified_at,
        currentFRI: f?.current_fri_score ?? null,
        cohortName: cohortMap[c.farmer_id] ?? null,
      };
    }));
    setLoading(false);
  }

  const pending  = checkins.filter(c => !c.verifiedAt);
  const verified = checkins.filter(c => !!c.verifiedAt);
  const helpReqs = checkins.filter(c => c.helpRequested && !c.verifiedAt);

  const displayed = tab === 'pending' ? pending : tab === 'verified' ? verified : checkins;

  // Group by cohort
  const grouped = displayed.reduce<Record<string, CheckinSummary[]>>((acc, ci) => {
    const key = ci.cohortName ?? 'Unassigned';
    (acc[key] = acc[key] ?? []).push(ci);
    return acc;
  }, {});

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
          <StatRow icon={CheckCircle}    label="Verified this week"   value={verified.length} color="bg-green-50 border-green-200 text-green-700"   />
          <StatRow icon={HelpCircle}     label="Help requests"        value={helpReqs.length} color="bg-red-50 border-red-200 text-red-700"           />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([['pending', 'Pending'], ['verified', 'Verified'], ['all', 'All']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-colors',
              tab === key ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500'
            )}
          >
            {label}
            {key === 'pending' && pending.length > 0 && (
              <span className="ml-1 bg-orange-400 text-white text-[8px] px-1 rounded-full">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {tab === 'pending' ? 'No pending verifications.' : 'No check-ins found.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([cohort, items]) => (
          <div key={cohort} className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cropguard-mid" />
              <p className="text-[10px] font-bold text-cropguard-slate uppercase tracking-wide">{cohort}</p>
              <span className="text-[9px] text-gray-400 ml-auto">{items.length}</span>
            </div>
            {items.map(ci => <CheckinCard key={ci.id} ci={ci} />)}
          </div>
        ))
      )}
    </div>
  );
}
