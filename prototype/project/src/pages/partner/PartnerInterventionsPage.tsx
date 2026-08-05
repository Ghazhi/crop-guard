import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Pagination } from '../../components/ui/pagination';

interface InterventionRow {
  id: string;
  name: string;
  type: string;
  status: string;
  capacity: number | null;
  description: string | null;
  _count: { id: number } | undefined;
}

export default function PartnerInterventionsPage() {
  const [rows, setRows] = useState<InterventionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,  setPage]  = useState(1);
  const BASE_PAGE_SIZE = 8;
  const [loadAll, setLoadAll] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('interventions_catalog')
        .select('id, name, type, status, capacity, description')
        .order('created_at', { ascending: false });
      
      const withCounts = await Promise.all(
        (data ?? []).map(async i => {
          const { count } = await supabase
            .from('farmer_intervention_applications')
            .select('id', { count: 'exact', head: true })
            .eq('intervention_id', i.id);
          return { ...i, _count: count ?? 0 };
        })
      );
      setRows(withCounts);
      setLoading(false);
    }
    fetch();
  }, []);

  const totalEnrollments = rows.reduce((s, r) => s + (r._count ?? 0), 0);
  const activeCount = rows.filter(r => r.status === 'Active').length;

  const pageSize = loadAll ? rows.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interventions Overview</h1>
        <p className="text-gray-500 mt-1">Donor-facing view of all interventions, funding allocation, and reach</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Interventions', value: rows.length, icon: Zap, color: 'text-amber-600' },
          { label: 'Active', value: activeCount, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Total Enrollments', value: totalEnrollments, icon: Users, color: 'text-blue-600' },
          { label: 'Avg Reach', value: rows.length > 0 ? Math.round(totalEnrollments / rows.length) : 0, icon: DollarSign, color: 'text-purple-600' },
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

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">No interventions available.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedRows.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-600" />
                  </div>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{r.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{r.type}</p>
                {r.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{r.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Enrollments</p>
                    <p className="text-lg font-bold text-gray-900">{r._count ?? 0}</p>
                  </div>
                  {r.capacity && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Capacity</p>
                      <p className="text-lg font-bold text-gray-900">{r.capacity}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && rows.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={rows.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
      )}
    </div>
  );
}
