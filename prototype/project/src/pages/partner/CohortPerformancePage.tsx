import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Users, TrendingUp, Target } from 'lucide-react';
import { Pagination } from '../../components/ui/pagination';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_weeks: number | null;
  _farmerCount: number;
  _avgFri: number | null;
}

export default function CohortPerformancePage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,  setPage]  = useState(1);
  const BASE_PAGE_SIZE = 8;
  const [loadAll, setLoadAll] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('cohorts')
        .select('id, name, region_code, is_active, total_weeks')
        .order('created_at', { ascending: false });

      const enriched = await Promise.all(
        (data ?? []).map(async c => {
          const [enrollRes, enrollRows] = await Promise.all([
            supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('cohort_id', c.id),
            supabase.from('enrollments').select('farmer_id').eq('cohort_id', c.id).eq('status', 'active'),
          ]);
          const farmerIds = (enrollRows.data ?? []).map((e: { farmer_id: string }) => e.farmer_id);
          let avgFri: number | null = null;
          if (farmerIds.length > 0) {
            const { data: friRows } = await supabase
              .from('farmer_fri_scores')
              .select('total_score')
              .in('farmer_id', farmerIds)
              .order('created_at', { ascending: false })
              .limit(50);
            if (friRows && friRows.length > 0) {
              avgFri = friRows.reduce((s, r) => s + (r.total_score ?? 0), 0) / friRows.length;
            }
          }
          return { ...c, _farmerCount: enrollRes.count ?? 0, _avgFri: avgFri };
        })
      );
      setCohorts(enriched);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading cohort performance...</div>;

  const totalFarmers = cohorts.reduce((s, c) => s + c._farmerCount, 0);
  const activeCohorts = cohorts.filter(c => c.is_active).length;
  const avgFriAcross = cohorts.filter(c => c._avgFri !== null).length > 0
    ? cohorts.filter(c => c._avgFri !== null).reduce((s, c) => s + (c._avgFri ?? 0), 0) / cohorts.filter(c => c._avgFri !== null).length
    : 0;

  const pageSize = loadAll ? cohorts.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(cohorts.length / pageSize));
  const pagedCohorts = cohorts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cohort Performance</h1>
        <p className="text-gray-500 mt-1">Per-cohort outcomes, graduation rates, and FRI improvements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cohorts', value: cohorts.length, icon: Award, color: 'text-indigo-600' },
          { label: 'Active Cohorts', value: activeCohorts, icon: Target, color: 'text-emerald-600' },
          { label: 'Total Farmers', value: totalFarmers, icon: Users, color: 'text-blue-600' },
          { label: 'Avg FRI Score', value: avgFriAcross.toFixed(1), icon: TrendingUp, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {cohorts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">No cohorts available.</CardContent></Card>
      ) : (
        <>
        <div className="space-y-4">
          {pagedCohorts.map(c => (
            <Card key={c.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                    {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                  </div>
                  <Badge variant="outline" className="capitalize">{c.is_active ? 'active' : 'inactive'}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Farmers</p>
                    <p className="text-xl font-bold text-gray-900">{c._farmerCount}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Avg FRI</p>
                    <p className="text-xl font-bold text-gray-900">{c._avgFri !== null ? c._avgFri.toFixed(1) : '—'}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Duration</p>
                    <p className="text-xl font-bold text-gray-900">{c.total_weeks ?? '—'}{c.total_weeks ? ' wks' : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={cohorts.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </>
      )}
    </div>
  );
}
