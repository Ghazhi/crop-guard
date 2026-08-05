import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Zap, Target, Award, Activity, MapPin, GraduationCap, DollarSign, Sprout } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';

interface MerlData {
  totalFarmers: number;
  activeEnrollments: number;
  totalInterventions: number;
  avgFriScore: number;
  cohorts: { id: string; name: string; farmer_count: number; avg_fri: number }[];
  recentCheckins: number;
  graduationRate: number;
  yieldImprovement: number | null;
  incomeIncrease: number | null;
}

export default function MerlDashboardPage() {
  const profile = useAuthStore(s => s.profile);
  const [data, setData] = useState<MerlData>({
    totalFarmers: 0, activeEnrollments: 0, totalInterventions: 0,
    avgFriScore: 0, cohorts: [], recentCheckins: 0, graduationRate: 0,
    yieldImprovement: null, incomeIncrease: null,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!profile) return;
      const orgFilter = { organisation_id: profile.organisation_id };

      const { data: progRows } = await supabase.from('programs').select('id').eq('organisation_id', profile.organisation_id);
      const progIds = (progRows ?? []).map((p: any) => p.id);
      const progFilter = progIds.length > 0 ? progIds : ['00000000-0000-0000-0000-000000000000'];

      const { data: farmerIdRows } = await supabase.from('farmers').select('id').eq('organisation_id', profile.organisation_id);
      const farmerIds = (farmerIdRows ?? []).map((f: any) => f.id);
      const farmerFilter = farmerIds.length > 0 ? farmerIds : ['00000000-0000-0000-0000-000000000000'];

      const [farmers, enrollments, interventions, friScores, cohorts, checkins, baselines] = await Promise.all([
        supabase.from('farmers').select('id', { count: 'exact', head: true }).eq('organisation_id', profile.organisation_id),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active').in('program_id', progFilter),
        supabase.from('farmer_intervention_applications').select('id', { count: 'exact', head: true }).eq('organisation_id', profile.organisation_id),
        supabase.from('farmer_fri_scores').select('total_score, week_number, farmer_id').eq('organisation_id', profile.organisation_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('cohorts').select('id, name').in('program_id', progFilter).limit(20),
        supabase.from('farmer_checkins').select('id', { count: 'exact', head: true }).eq('organisation_id', profile.organisation_id),
        (supabase.from('baseline_assessments') as any).select('total_score, farmer_id').eq('is_active', true).in('farmer_id', farmerFilter),
      ]);

      const scoreRows = (friScores.data ?? []) as any[];
      const avgScore = scoreRows.length > 0
        ? scoreRows.reduce((s, r) => s + (Number(r.total_score) ?? 0), 0) / scoreRows.length
        : 0;

      // Graduation rate: farmers whose latest FRI score >= 60 (graduation threshold)
      const latestByFarmer: Record<string, number> = {};
      scoreRows.forEach((s: any) => {
        const fid = s.farmer_id;
        if (latestByFarmer[fid] === undefined) latestByFarmer[fid] = Number(s.total_score) ?? 0;
      });
      const farmerScoreCount = Object.keys(latestByFarmer).length;
      const graduated = Object.values(latestByFarmer).filter(s => s >= 60).length;
      const gradRate = farmerScoreCount > 0 ? Math.round((graduated / farmerScoreCount) * 100) : 0;

      // Yield improvement: compare avg FRI of latest week vs avg baseline score
      const baselineRows = (baselines.data ?? []) as any[];
      const avgBaseline = baselineRows.length > 0
        ? baselineRows.reduce((s, r) => s + (Number(r.total_score) ?? 0), 0) / baselineRows.length
        : 0;
      const yieldImprovement = avgBaseline > 0
        ? Math.round(((avgScore - avgBaseline) / avgBaseline) * 100)
        : null;

      // Income increase: use credit_score delta if available, otherwise null
      // We don't have income data in the DB, so we leave this as null (no placeholder)
      const incomeIncrease: number | null = null;

      const cohortsWithCounts = await Promise.all(
        (cohorts.data ?? []).map(async c => {
          const { count } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('cohort_id', c.id)
            .eq('status', 'active');
          // Avg FRI for this cohort's farmers
          const cohortFarmerIds = new Set<string>();
          const { data: cohortEnrollments } = await supabase
            .from('enrollments')
            .select('farmer_id')
            .eq('cohort_id', c.id)
            .eq('status', 'active');
          (cohortEnrollments ?? []).forEach((e: any) => cohortFarmerIds.add(e.farmer_id));
          const cohortScores = scoreRows.filter((s: any) => cohortFarmerIds.has(s.farmer_id));
          const cohortAvg = cohortScores.length > 0
            ? Math.round(cohortScores.reduce((s, r) => s + (Number(r.total_score) ?? 0), 0) / cohortScores.length)
            : 0;
          return { id: c.id, name: c.name, farmer_count: count ?? 0, avg_fri: cohortAvg };
        })
      );

      setData({
        totalFarmers: farmers.count ?? 0,
        activeEnrollments: enrollments.count ?? 0,
        totalInterventions: interventions.count ?? 0,
        avgFriScore: Math.round(avgScore * 10) / 10,
        cohorts: cohortsWithCounts,
        recentCheckins: checkins.count ?? 0,
        graduationRate: gradRate,
        yieldImprovement,
        incomeIncrease,
      });
      setLoading(false);
    }
    fetch();
  }, [profile]);

  if (loading) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MERL Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitoring, Evaluation, Research & Learning — donor-facing impact overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );

  const pageSize = loadAll ? data.cohorts.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(data.cohorts.length / pageSize));
  const pagedCohorts = data.cohorts.slice((page - 1) * pageSize, page * pageSize);

  const kpis = [
    { label: 'Total Farmers Reached', value: data.totalFarmers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Enrollments', value: data.activeEnrollments, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Interventions Deployed', value: data.totalInterventions, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avg FRI Score', value: data.avgFriScore.toFixed(1), icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Check-ins Recorded', value: data.recentCheckins, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Cohorts', value: data.cohorts.length, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MERL Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitoring, Evaluation, Research & Learning — donor-facing impact overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Outcome indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcome Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-gray-700">Yield Improvement</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.yieldImprovement !== null
                  ? `${data.yieldImprovement >= 0 ? '+' : ''}${data.yieldImprovement}%`
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg FRI vs baseline score</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">Income Increase</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">—</p>
              <p className="text-xs text-gray-400 mt-1">Income data not yet collected</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-medium text-gray-700">Graduation Rate</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.graduationRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Farmers reaching FRI ≥ 60</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohort breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cohort Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.cohorts.length === 0 ? (
            <p className="text-gray-400 text-sm">No cohorts available.</p>
          ) : (
            <div className="space-y-3">
              {pagedCohorts.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{c.farmer_count} farmers</span>
                    {c.avg_fri > 0 && (
                      <span className="text-sm font-medium text-emerald-600">Avg FRI {c.avg_fri}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.cohorts.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
}
