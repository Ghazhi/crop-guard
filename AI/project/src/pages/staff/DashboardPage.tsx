import { useState, useEffect, useCallback } from 'react';
import {
  Users, ClipboardList, UserCheck, TrendingUp, ArrowUp, ArrowDown, Minus, Zap,
  ChevronRight, MapPin, Phone, Leaf, Shield, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CROP_LABELS, REGION_LABELS } from '@/lib/constants';
import type { CropType, RiskCategory } from '@/types';
import { cn } from '@/lib/utils';

/* ── domain types ───────────────────────────────────────── */
interface Stats {
  totalFarmers:         number;
  activeEnrollments:    number;
  verifiedFarmers:      number;
  totalAgents:          number;
  avgFRI:               number | null;
  verificationRate:     number;
  opportunityCount:     number;
  trajectoryUp:         number;
  trajectoryDown:       number;
  trajectoryFlat:       number;
}

interface CropBreakdown { crop: string; count: number; }
interface RiskBreakdown  { category: RiskCategory; count: number; }
interface ZoneBreakdown  { zone: string; count: number; }

interface FarmerRow {
  id: string;
  full_name: string;
  phone: string;
  community: string;
  region_code: string;
  primary_crop: CropType;
  current_fri_score: number | null;
  is_verified: boolean;
  risk_category: RiskCategory | null;
}

interface EnrollmentRow {
  id: string;
  status: string;
  created_at: string;
  farmers: { full_name: string; phone: string; community: string } | null;
  cohorts: { name: string } | null;
}

interface AgentRow {
  id: string;
  full_name: string;
  phone: string | null;
  region_code: string | null;
  is_active: boolean;
}

/* ── constants ──────────────────────────────────────────── */
const RISK_COLORS: Record<RiskCategory, string> = {
  low:      '#4CAF50',
  medium:   '#FF9800',
  high:     '#F44336',
  critical: '#B71C1C',
};

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#7C3AED',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#ca8a04',
  'Resilience Starter': '#dc2626',
};

type DrawerType = 'farmers' | 'enrollments' | 'verified' | 'agents' | 'opportunities' | null;

/* ── zone helpers ──────────────────────────────────────── */
function friZone(score: number | null) {
  if (score === null) return { label: 'N/A', color: 'bg-gray-100 text-gray-500' };
  if (score >= 80) return { label: 'Leader',  color: 'bg-cropguard-dark text-white' };
  if (score >= 60) return { label: 'Builder', color: 'bg-cropguard-mid text-white' };
  if (score >= 40) return { label: 'Learner', color: 'bg-amber-100 text-amber-800' };
  return { label: 'Starter', color: 'bg-red-100 text-red-800' };
}

/* ── StatCard ───────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, color, sub, onClick,
}: {
  icon: React.ElementType; label: string; value: number | string; color: string;
  sub?: string; onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'border-0 shadow-sm transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] group',
      )}
    >
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-cropguard-forest">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-xs text-cropguard-slate mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-cropguard-mid transition-colors shrink-0" />
        )}
      </CardContent>
    </Card>
  );
}

function TrajectoryBadge({ label, count, icon: Icon, color }: {
  label: string; count: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-semibold">{count}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

/* ── drawer content components ──────────────────────────── */
function FarmerListContent({ farmers }: { farmers: FarmerRow[] }) {
  if (!farmers.length) return <p className="text-sm text-gray-400 text-center py-8">No farmers found.</p>;
  return (
    <div className="space-y-2.5">
      {farmers.map(f => {
        const zone = friZone(f.current_fri_score);
        return (
          <div key={f.id} className="bg-gray-50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-cropguard-forest">{f.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <MapPin className="w-2.5 h-2.5" />{f.community}{f.region_code ? `, ${REGION_LABELS[f.region_code] ?? f.region_code}` : ''}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Phone className="w-2.5 h-2.5" />{f.phone}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', zone.color)}>
                  {f.current_fri_score ?? '—'}
                </span>
                <p className="text-[9px] text-gray-400 mt-0.5">{zone.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Leaf className="w-2.5 h-2.5 text-cropguard-mid" />
                {CROP_LABELS[f.primary_crop] ?? f.primary_crop}
              </span>
              {f.is_verified && (
                <Badge className="text-[9px] border-0 bg-green-100 text-green-700">Verified</Badge>
              )}
              {f.risk_category && f.risk_category !== 'low' && (
                <Badge className={cn(
                  'text-[9px] border-0',
                  f.risk_category === 'critical' ? 'bg-red-100 text-red-700' :
                  f.risk_category === 'high'     ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                )}>
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                  {f.risk_category}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EnrollmentListContent({ enrollments }: { enrollments: EnrollmentRow[] }) {
  if (!enrollments.length) return <p className="text-sm text-gray-400 text-center py-8">No active enrollments.</p>;
  return (
    <div className="space-y-2.5">
      {enrollments.map(e => (
        <div key={e.id} className="bg-gray-50 rounded-xl p-3.5">
          <p className="text-sm font-semibold text-cropguard-forest">
            {e.farmers?.full_name ?? '—'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {e.farmers?.phone && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Phone className="w-2.5 h-2.5" />{e.farmers.phone}
              </span>
            )}
            {e.farmers?.community && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <MapPin className="w-2.5 h-2.5" />{e.farmers.community}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge className="text-[9px] border-0 bg-green-100 text-green-700">{e.status}</Badge>
            {e.cohorts?.name && (
              <span className="text-[10px] text-gray-400">{e.cohorts.name}</span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">
              {new Date(e.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentListContent({ agents }: { agents: AgentRow[] }) {
  if (!agents.length) return <p className="text-sm text-gray-400 text-center py-8">No agents found.</p>;
  return (
    <div className="space-y-2.5">
      {agents.map(a => (
        <div key={a.id} className="bg-gray-50 rounded-xl p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-cropguard-forest">{a.full_name}</p>
              {a.phone && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                  <Phone className="w-2.5 h-2.5" />{a.phone}
                </span>
              )}
              {a.region_code && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" />{REGION_LABELS[a.region_code] ?? a.region_code}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="text-[9px] border-0 bg-cropguard-mint text-cropguard-forest">
                <Shield className="w-2.5 h-2.5 mr-0.5" />Agent
              </Badge>
              {!a.is_active && (
                <Badge className="text-[9px] border-0 bg-gray-100 text-gray-500">Inactive</Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── main page ──────────────────────────────────────────── */
export default function StaffDashboardPage() {
  const profile = useAuthStore(s => s.profile);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [cropData, setCropData] = useState<CropBreakdown[]>([]);
  const [riskData, setRiskData] = useState<RiskBreakdown[]>([]);
  const [zoneData, setZoneData] = useState<ZoneBreakdown[]>([]);
  const [loading, setLoading]   = useState(true);

  // Drawer state
  const [drawerType, setDrawerType]       = useState<DrawerType>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerFarmers, setDrawerFarmers]         = useState<FarmerRow[]>([]);
  const [drawerEnrollments, setDrawerEnrollments] = useState<EnrollmentRow[]>([]);
  const [drawerAgents, setDrawerAgents]           = useState<AgentRow[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const orgId = profile.organisation_id;

    const [
      { count: totalFarmers },
      { count: activeEnrollments },
      { count: verifiedFarmers },
      { count: totalAgents },
      { count: opportunityCount },
      { data: farmers },
      { data: friScores },
    ] = await Promise.all([
      supabase.from('farmers').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('farmers').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('is_verified', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('role', 'agent'),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active').not('cohort_id', 'is', null),
      supabase.from('farmers').select('primary_crop, risk_category, is_verified').eq('organisation_id', orgId),
      (supabase.from('farmer_fri_scores') as any).select('total_score, zone, score_status, is_provisional').eq('organisation_id', orgId),
    ]);

    const farmerList = (farmers ?? []) as { primary_crop: CropType; risk_category: RiskCategory; is_verified: boolean }[];
    const scores = (friScores ?? []) as { total_score: number; zone: string; score_status: string; is_provisional: boolean }[];

    const totalVerified = verifiedFarmers ?? 0;
    const total = totalFarmers ?? 0;
    const verificationRate = total > 0 ? Math.round((totalVerified / total) * 100) : 0;

    const avgFRI = scores.length > 0
      ? Math.round(scores.reduce((s, r) => s + r.total_score, 0) / scores.length)
      : null;

    const zoneMap = new Map<string, number>();
    scores.forEach(s => { zoneMap.set(s.zone, (zoneMap.get(s.zone) ?? 0) + 1); });

    const leaderCount  = zoneMap.get('Resilience Leader')  ?? 0;
    const builderCount = zoneMap.get('Resilience Builder') ?? 0;
    const trajectoryUp   = leaderCount + builderCount;
    const trajectoryDown = zoneMap.get('Resilience Starter') ?? 0;
    const trajectoryFlat = scores.length - trajectoryUp - trajectoryDown;

    setStats({
      totalFarmers:      total,
      activeEnrollments: activeEnrollments ?? 0,
      verifiedFarmers:   totalVerified,
      totalAgents:       totalAgents ?? 0,
      avgFRI,
      verificationRate,
      opportunityCount:  opportunityCount ?? 0,
      trajectoryUp,
      trajectoryDown,
      trajectoryFlat:    Math.max(trajectoryFlat, 0),
    });

    const cropMap = new Map<CropType, number>();
    const riskMap = new Map<RiskCategory, number>();
    farmerList.forEach(f => {
      cropMap.set(f.primary_crop, (cropMap.get(f.primary_crop) ?? 0) + 1);
      if (f.risk_category) riskMap.set(f.risk_category, (riskMap.get(f.risk_category) ?? 0) + 1);
    });
    setCropData(
      [...cropMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([crop, count]) => ({ crop: CROP_LABELS[crop] ?? crop, count }))
    );
    setRiskData([...riskMap.entries()].map(([category, count]) => ({ category, count })));
    setZoneData([...zoneMap.entries()].map(([zone, count]) => ({ zone, count })));
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function openDrawer(type: DrawerType) {
    if (!profile || !type) return;
    setDrawerType(type);
    setDrawerLoading(true);
    const orgId = profile.organisation_id!;

    try {
      if (type === 'farmers' || type === 'verified') {
        const q = supabase
          .from('farmers')
          .select('id, full_name, phone, community, region_code, primary_crop, current_fri_score, is_verified, risk_category')
          .eq('organisation_id', orgId)
          .order('full_name');
        if (type === 'verified') q.eq('is_verified', true);
        const { data } = await q;
        setDrawerFarmers((data as FarmerRow[]) ?? []);
      } else if (type === 'enrollments' || type === 'opportunities') {
        const q = supabase
          .from('enrollments')
          .select('id, status, created_at, farmers(full_name, phone, community), cohorts(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (type === 'opportunities') (q as any).not('cohort_id', 'is', null);
        const { data } = await q;
        setDrawerEnrollments((data as unknown as EnrollmentRow[]) ?? []);
      } else if (type === 'agents') {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, phone, region_code, is_active')
          .eq('organisation_id', orgId)
          .eq('role', 'agent')
          .order('full_name');
        setDrawerAgents((data as AgentRow[]) ?? []);
      }
    } finally {
      setDrawerLoading(false);
    }
  }

  function closeDrawer() { setDrawerType(null); }

  const drawerMeta: Record<NonNullable<DrawerType>, { title: string; subtitle?: string }> = {
    farmers:      { title: 'All Farmers',          subtitle: `${stats?.totalFarmers ?? 0} registered in your programme` },
    enrollments:  { title: 'Active Enrollments',   subtitle: `${stats?.activeEnrollments ?? 0} farmers currently enrolled` },
    verified:     { title: 'Verified Farmers',      subtitle: `${stats?.verifiedFarmers ?? 0} identity-verified farmers` },
    agents:       { title: 'Field Agents',          subtitle: `${stats?.totalAgents ?? 0} active field agents` },
    opportunities:{ title: 'Opportunity Enrolled',  subtitle: `${stats?.opportunityCount ?? 0} active intervention enrollments` },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cropguard-forest">Dashboard</h1>
        <p className="text-sm text-cropguard-slate mt-0.5">Program overview and key metrics</p>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </>
      ) : stats && (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users}        label="Total Farmers"       value={stats.totalFarmers}       color="bg-cropguard-dark"  onClick={() => openDrawer('farmers')} />
            <StatCard icon={ClipboardList} label="Active Enrollments" value={stats.activeEnrollments} color="bg-cropguard-green"  onClick={() => openDrawer('enrollments')} />
            <StatCard icon={UserCheck}    label="Verified Farmers"    value={stats.verifiedFarmers}    color="bg-cropguard-mid"   onClick={() => openDrawer('verified')} />
            <StatCard icon={TrendingUp}   label="Field Agents"        value={stats.totalAgents}        color="bg-cropguard-amber" onClick={() => openDrawer('agents')} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Average FRI Score"
              value={stats.avgFRI !== null ? `${stats.avgFRI}/100` : '—'}
              color="bg-emerald-600"
              sub="across all scored farmers"
              onClick={() => openDrawer('farmers')}
            />
            <StatCard
              icon={UserCheck}
              label="Verification Rate"
              value={`${stats.verificationRate}%`}
              color="bg-sky-600"
              sub="of registered farmers"
              onClick={() => openDrawer('verified')}
            />
            <StatCard
              icon={Zap}
              label="Opportunity Enrolled"
              value={stats.opportunityCount}
              color="bg-orange-500"
              sub="active intervention enrollments"
              onClick={() => openDrawer('opportunities')}
            />
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <p className="text-xs text-cropguard-slate mb-3">FRI Trajectory</p>
                <div className="flex flex-col gap-1.5">
                  <TrajectoryBadge label="Improving" count={stats.trajectoryUp}   icon={ArrowUp}   color="border-emerald-200 bg-emerald-50 text-emerald-700" />
                  <TrajectoryBadge label="Stable"    count={stats.trajectoryFlat} icon={Minus}     color="border-gray-200 bg-gray-50 text-gray-600" />
                  <TrajectoryBadge label="Declining" count={stats.trajectoryDown} icon={ArrowDown} color="border-red-200 bg-red-50 text-red-700" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {cropData.length > 0 && (
          <Card className="border-0 shadow-sm xl:col-span-1">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-cropguard-forest">Top Crops</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cropData} barSize={24}>
                  <XAxis dataKey="crop" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F0F7F4' }} />
                  <Bar dataKey="count" fill="#2E5E3E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {riskData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-cropguard-forest">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={riskData} barSize={36}>
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F0F7F4' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskData.map(d => <Cell key={d.category} fill={RISK_COLORS[d.category]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {zoneData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-cropguard-forest">FRI Zone Distribution</h3>
              <div className="space-y-3">
                {zoneData.map(({ zone, count }) => {
                  const total = zoneData.reduce((s, z) => s + z.count, 0);
                  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                  const color = ZONE_COLORS[zone] ?? '#6B7280';
                  return (
                    <div key={zone} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-700 font-medium">{zone}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={drawerType !== null}
        onClose={closeDrawer}
        title={drawerType ? drawerMeta[drawerType].title : ''}
        subtitle={drawerType ? drawerMeta[drawerType].subtitle : undefined}
        loading={drawerLoading}
      >
        {drawerType === 'farmers' || drawerType === 'verified' ? (
          <FarmerListContent farmers={drawerFarmers} />
        ) : drawerType === 'enrollments' || drawerType === 'opportunities' ? (
          <EnrollmentListContent enrollments={drawerEnrollments} />
        ) : drawerType === 'agents' ? (
          <AgentListContent agents={drawerAgents} />
        ) : null}
      </Drawer>
    </div>
  );
}
