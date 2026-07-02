import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Filter, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/offline';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import type { Farmer, CropType } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CROP_LABELS, REGION_LABELS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/* ── zone helpers ─────────────────────────────────────────── */
function zoneLabel(score: number | null) {
  if (score === null) return 'N/A';
  if (score >= 80) return 'Leader';
  if (score >= 60) return 'Builder';
  if (score >= 40) return 'Learner';
  return 'Starter';
}
function zoneStyle(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score >= 80) return 'bg-cropguard-dark text-white';
  if (score >= 60) return 'bg-cropguard-mid text-white';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

/* ── filter types ────────────────────────────────────────── */
type FRIZone = 'all' | 'leader' | 'builder' | 'learner' | 'starter' | 'none';
type CheckinFilter = 'all' | 'submitted' | 'verified' | 'missed';

interface FarmerWithCheckin extends Farmer {
  latestCheckinStatus?: 'submitted' | 'verified' | 'missed' | 'none';
  verificationPct?: number;
  cachedOffline?: boolean;
  isEnrolled: boolean;
}

const ZONE_FILTERS: { key: FRIZone; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'leader',  label: 'Leader'  },
  { key: 'builder', label: 'Builder' },
  { key: 'learner', label: 'Learner' },
  { key: 'starter', label: 'Starter' },
  { key: 'none',    label: 'N/A'     },
];

const CHECKIN_FILTERS: { key: CheckinFilter; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'submitted', label: 'Submitted' },
  { key: 'verified',  label: 'Verified'  },
  { key: 'missed',    label: 'Missed'    },
];

/* ── status badge ────────────────────────────────────────── */
function StatusBadge({ status }: { status: FarmerWithCheckin['latestCheckinStatus'] }) {
  const styles: Record<string, string> = {
    submitted: 'bg-orange-100 text-orange-700',
    verified:  'bg-green-100 text-green-700',
    missed:    'bg-red-100 text-red-700',
    none:      'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    submitted: 'Submitted',
    verified:  'Verified',
    missed:    'Missed',
    none:      'No Check-in',
  };
  const s = status ?? 'none';
  return (
    <Badge className={cn('text-[9px] border-0 shrink-0', styles[s])}>
      {labels[s]}
    </Badge>
  );
}

/* ── main page ───────────────────────────────────────────── */
export default function AgentFarmersPage() {
  const profile   = useAuthStore(s => s.profile);
  const isOnline  = useOfflineStore(s => s.isOnline);
  const [farmers, setFarmers]       = useState<FarmerWithCheckin[]>([]);
  const [search, setSearch]         = useState('');
  const [zoneFilter, setZoneFilter] = useState<FRIZone>('all');
  const [ciFilter, setCiFilter]     = useState<CheckinFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    loadFarmers();
    loadOfflineCache();
  }, [profile]);

  async function loadFarmers() {
    if (!profile) return;
    setLoading(true);
    try {
      // Only load farmers explicitly assigned to this agent via active enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('farmer_id')
        .eq('agent_id', profile.id)
        .eq('status', 'active');

      const assignedIds = (enrollments ?? []).map((e: { farmer_id: string }) => e.farmer_id);

      if (assignedIds.length === 0) {
        setFarmers([]);
        setLoading(false);
        return;
      }

      const { data: allFarmers } = await supabase
        .from('farmers')
        .select('*')
        .in('id', assignedIds)
        .order('full_name', { ascending: true });

      if (!allFarmers) { setLoading(false); return; }

      // All visible farmers are enrolled (that's how they were fetched)
      const enrolledSet = new Set(assignedIds);

      // Get week check-in statuses
      const weekNum = getWeekNum();
      const { data: checkins } = await supabase
        .from('farmer_checkins')
        .select('farmer_id, verified_at')
        .in('farmer_id', allFarmers.map(f => f.id))
        .eq('week_number', weekNum);

      const ciMap = new Map(checkins?.map(c => [
        c.farmer_id,
        c.verified_at ? 'verified' : 'submitted',
      ]));

      setFarmers(allFarmers.map(f => ({
        ...(f as Farmer),
        latestCheckinStatus: (ciMap.get(f.id) as FarmerWithCheckin['latestCheckinStatus']) ?? 'none',
        isEnrolled: enrolledSet.has(f.id),
      })));
    } catch {
      // fallback to offline cache
      const cached = await db.farmers.toArray();
      setFarmers(cached.map(c => ({ ...(c.data as unknown as Farmer), isEnrolled: false })));
    }
    setLoading(false);
  }

  async function loadOfflineCache() {
    const cached = await db.farmers.toArray();
    setOfflineIds(new Set(cached.map(c => c.id)));
  }

  function getWeekNum() {
    const now = new Date(), s = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
  }

  function matchesZone(f: FarmerWithCheckin): boolean {
    if (zoneFilter === 'all') return true;
    const s = f.current_fri_score;
    if (zoneFilter === 'none')    return s === null;
    if (zoneFilter === 'leader')  return s !== null && s >= 80;
    if (zoneFilter === 'builder') return s !== null && s >= 60 && s < 80;
    if (zoneFilter === 'learner') return s !== null && s >= 40 && s < 60;
    if (zoneFilter === 'starter') return s !== null && s < 40;
    return true;
  }

  function matchesCiFilter(f: FarmerWithCheckin): boolean {
    if (ciFilter === 'all') return true;
    if (ciFilter === 'missed') return f.latestCheckinStatus === 'none' || f.latestCheckinStatus === 'missed';
    return f.latestCheckinStatus === ciFilter;
  }

  const filtered = farmers.filter(f =>
    (!search ||
      f.full_name.toLowerCase().includes(search.toLowerCase()) ||
      f.phone.includes(search) ||
      f.national_id.includes(search) ||
      f.community.toLowerCase().includes(search.toLowerCase())) &&
    matchesZone(f) &&
    matchesCiFilter(f)
  );

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">Farmers</h2>
        <Button asChild size="sm" className="bg-cropguard-dark hover:bg-cropguard-forest h-8 gap-1.5">
          <Link to="/agent/farmers/register"><UserPlus className="w-3.5 h-3.5" /> Add</Link>
        </Button>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Name, phone, community…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn('h-10 px-3', showFilters && 'bg-cropguard-mint border-cropguard-pale')}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-3">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">FRI Zone</p>
            <div className="flex gap-1 flex-wrap">
              {ZONE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setZoneFilter(key)}
                  className={cn(
                    'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    zoneFilter === key ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Check-in Status</p>
            <div className="flex gap-1 flex-wrap">
              {CHECKIN_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCiFilter(key)}
                  className={cn(
                    'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                    ciFilter === key ? 'bg-cropguard-dark text-white border-cropguard-dark' : 'border-gray-200 text-gray-600'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-cropguard-slate">
          {filtered.length} farmer{filtered.length !== 1 ? 's' : ''}
          {!isOnline && <span className="inline-flex items-center gap-1 ml-2 text-amber-600"><WifiOff className="w-3 h-3" /> offline</span>}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-cropguard-slate text-sm">
          {search || zoneFilter !== 'all' || ciFilter !== 'all'
            ? 'No farmers match your filters.'
            : 'No farmers yet. Register one!'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(f => (
            <Link
              key={f.id}
              to={`/agent/farmers/${f.id}/profile`}
              className="block bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 hover:border-cropguard-pale transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-cropguard-mint flex items-center justify-center">
                    {f.photo_url ? (
                      <img src={f.photo_url} alt={f.full_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-cropguard-dark font-bold text-sm">{f.full_name.charAt(0)}</span>
                    )}
                  </div>
                  {offlineIds.has(f.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white" title="Cached offline" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-cropguard-forest text-sm truncate max-w-[140px]">{f.full_name}</p>
                    <StatusBadge status={f.latestCheckinStatus} />
                    <Badge className={cn(
                      'text-[9px] border-0 shrink-0',
                      f.isEnrolled ? 'bg-cropguard-mint text-cropguard-forest' : 'bg-gray-100 text-gray-500'
                    )}>
                      {f.isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-cropguard-slate mt-0.5">
                    {f.community} · {CROP_LABELS[f.primary_crop as CropType] ?? f.primary_crop}
                  </p>
                  <p className="text-[10px] text-gray-400">{REGION_LABELS[f.region_code]} · {f.phone}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className="text-[10px] font-bold px-2 py-1 rounded-full text-center"
                    style={{
                      backgroundColor: f.current_fri_score !== null
                        ? (f.current_fri_score >= 80 ? '#1A3D2B' : f.current_fri_score >= 60 ? '#3D7A56' : f.current_fri_score >= 40 ? '#FEF3C7' : '#FEE2E2')
                        : '#F3F4F6',
                      color: f.current_fri_score !== null && f.current_fri_score >= 40 && f.current_fri_score < 80 ? '#92400E' : f.current_fri_score !== null && f.current_fri_score < 40 ? '#991B1B' : f.current_fri_score !== null ? '#fff' : '#6B7280',
                    }}
                  >
                    {f.current_fri_score ?? '–'}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{zoneLabel(f.current_fri_score)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
