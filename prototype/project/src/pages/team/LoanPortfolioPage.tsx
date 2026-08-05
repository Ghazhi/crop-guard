import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Search } from 'lucide-react';
import { Pagination } from '../../components/ui/pagination';

interface LoanRow {
  id: string;
  farmer_id: string;
  intervention_name: string | null;
  disbursed_amount: number;
  repayment_total: number;
  interest_rate: number;
  disbursement_date: string | null;
  repayment_due_date: string | null;
  status: string;
  loan_duration_weeks: number;
  farmers: { full_name: string | null } | null;
}

export default function LoanPortfolioPage() {
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('farmer_intervention_applications')
        .select(`
          id, farmer_id, intervention_name, disbursed_amount, repayment_total,
          interest_rate, disbursement_date, repayment_due_date, status, loan_duration_weeks,
          farmers ( full_name )
        `)
        .gt('disbursed_amount', 0)
        .order('disbursement_date', { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = rows.filter(r => {
    const name = r.farmers?.full_name ?? '';
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const pageSize = loadAll ? filtered.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [search]);

  const totalDisbursed = rows.reduce((s, r) => s + Number(r.disbursed_amount), 0);
  const totalRepaid = rows.reduce((s, r) => s + Number(r.repayment_total), 0);
  const outstanding = totalDisbursed - totalRepaid;
  const defaultedCount = rows.filter(r => r.status === 'defaulted').length;
  const repaymentRate = totalDisbursed > 0 ? (totalRepaid / totalDisbursed) * 100 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loan Portfolio</h1>
        <p className="text-gray-500 mt-1">Cross-portfolio view of all credit disbursements and repayments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Disbursed', value: `GHS ${totalDisbursed.toLocaleString()}`, icon: Wallet, color: 'text-blue-600' },
          { label: 'Repaid', value: `GHS ${totalRepaid.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Outstanding', value: `GHS ${outstanding.toLocaleString()}`, icon: TrendingDown, color: 'text-amber-600' },
          { label: 'Repayment Rate', value: `${repaymentRate.toFixed(1)}%`, icon: DollarSign, color: 'text-gray-700' },
          { label: 'Defaulted', value: defaultedCount, icon: TrendingDown, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search by farmer name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">No loans found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Farmer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Intervention</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Disbursed</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Repaid</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Outstanding</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Interest</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Weeks</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Disbursed</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map(r => {
                    const outstandingBal = Number(r.disbursed_amount) - Number(r.repayment_total);
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.farmers?.full_name ?? 'Unknown'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.intervention_name ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">GHS {Number(r.disbursed_amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">GHS {Number(r.repayment_total).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-amber-600">GHS {outstandingBal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{Number(r.interest_rate).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right">{r.loan_duration_weeks}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.disbursement_date?.slice(0,10) ?? '—'}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{r.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
