import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Users, Zap, TrendingUp, Calendar } from 'lucide-react';
import { Pagination } from '../../components/ui/pagination';

interface ReportData {
  totalFarmers: number;
  totalEnrollments: number;
  totalInterventions: number;
  totalCheckins: number;
  cohorts: { name: string; count: number }[];
}

export default function PartnerReportsPage() {
  const [data, setData] = useState<ReportData>({
    totalFarmers: 0, totalEnrollments: 0, totalInterventions: 0, totalCheckins: 0, cohorts: [],
  });
  const [loading, setLoading] = useState(true);
  const [page,  setPage]  = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  useEffect(() => {
    async function fetch() {
      const [farmers, enrollments, interventions, checkins, cohorts] = await Promise.all([
        supabase.from('farmers').select('id', { count: 'exact', head: true }),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('farmer_intervention_applications').select('id', { count: 'exact', head: true }),
        supabase.from('farmer_checkins').select('id', { count: 'exact', head: true }),
        supabase.from('cohorts').select('id, name').limit(20),
      ]);

      const cohortCounts = await Promise.all(
        (cohorts.data ?? []).map(async c => {
          const { count } = await supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('cohort_id', c.id);
          return { name: c.name, count: count ?? 0 };
        })
      );

      setData({
        totalFarmers: farmers.count ?? 0,
        totalEnrollments: enrollments.count ?? 0,
        totalInterventions: interventions.count ?? 0,
        totalCheckins: checkins.count ?? 0,
        cohorts: cohortCounts,
      });
      setLoading(false);
    }
    fetch();
  }, []);

  function exportCSV() {
    const rows = [
      ['Metric', 'Value'],
      ['Total Farmers', String(data.totalFarmers)],
      ['Total Enrollments', String(data.totalEnrollments)],
      ['Total Interventions', String(data.totalInterventions)],
      ['Total Check-ins', String(data.totalCheckins)],
      ...data.cohorts.map(c => [`Cohort: ${c.name}`, String(c.count)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cropguard-impact-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading report data...</div>;

  const pageSize = loadAll ? data.cohorts.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(data.cohorts.length / pageSize));
  const pagedCohorts = data.cohorts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
          <p className="text-gray-500 mt-1">Generate donor reports and impact summaries</p>
        </div>
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Farmers Reached', value: data.totalFarmers, icon: Users, color: 'text-blue-600' },
          { label: 'Enrollments', value: data.totalEnrollments, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Interventions', value: data.totalInterventions, icon: Zap, color: 'text-amber-600' },
          { label: 'Check-ins', value: data.totalCheckins, icon: Calendar, color: 'text-purple-600' },
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

      {/* Cohort summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cohort Enrollment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {data.cohorts.length === 0 ? (
            <p className="text-gray-400 text-sm">No cohort data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Cohort</th>
                    <th className="text-right py-2 font-medium text-gray-600">Enrollments</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCohorts.map(c => (
                    <tr key={c.name} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-900">{c.name}</td>
                      <td className="py-2 text-right">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.cohorts.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </CardContent>
      </Card>

      {/* Report types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Impact Summary', desc: 'Overall program impact metrics and beneficiary reach', icon: FileText },
          { title: 'Intervention Outcomes', desc: 'Per-intervention enrollment and outcome data', icon: Zap },
        ].map(({ title, desc, icon: Icon }) => (
          <Card key={title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
