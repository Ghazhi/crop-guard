import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, BarChart2, Download,
  Calendar, Wallet, ClipboardList, ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Pagination } from '../../components/ui/pagination';

interface TxRow   { type: string; category: string; amount: number; transaction_date: string; description: string; }
interface ReqRow  { status: string; total_amount: number; priority: string; created_at: string; title: string; }

interface Summary {
  totalIncome: number; totalExpense: number; netFlow: number;
  balance: number; currency: string;
  pendingReqs: number; approvedReqs: number; disbursed: number;
  txCount: number;
}

interface CategoryBreakdown { category: string; amount: number; count: number; pct: number; }

function fmt(n: number, currency = 'GHS') {
  return `${currency} ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

const CATEGORY_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500',
  'bg-red-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
];

const PRESET_RANGES = [
  { label: 'This Month', getValue: () => {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  }},
  { label: 'Last Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
  }},
  { label: 'This Quarter', getValue: () => {
    const now = new Date(); const q = Math.floor(now.getMonth() / 3);
    return { from: new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  }},
  { label: 'This Year', getValue: () => {
    const now = new Date();
    return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().split('T')[0] };
  }},
];

export default function FinancialReportsPage() {
  const profile = useAuthStore(s => s.profile);

  const defaultRange = PRESET_RANGES[0].getValue();
  const [from, setFrom]       = useState(defaultRange.from);
  const [to, setTo]           = useState(defaultRange.to);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cats, setCats]       = useState<CategoryBreakdown[]>([]);
  const [txRows, setTxRows]   = useState<TxRow[]>([]);
  const [reqRows, setReqRows] = useState<ReqRow[]>([]);
  const [activePreset, setActivePreset] = useState(0);
  const [reqPage, setReqPage] = useState(1);
  const REQ_PAGE_SIZE = 10;
  const [reqLoadAll, setReqLoadAll] = useState(false);

  useEffect(() => { if (profile) loadReport(); }, [profile, from, to]);
  useEffect(() => { setReqPage(1); }, [from, to]);

  const reqPageSize = reqLoadAll ? reqRows.length : REQ_PAGE_SIZE;
  const reqTotalPages = Math.max(1, Math.ceil(reqRows.length / reqPageSize));

  async function loadReport() {
    setLoading(true);
    try {
      const [acctRes, txRes, reqRes] = await Promise.all([
        supabase.from('petty_cash_accounts').select('balance,currency').eq('is_active', true).maybeSingle(),
        supabase.from('petty_cash_transactions')
          .select('type,category,amount,transaction_date,description')
          .gte('transaction_date', from).lte('transaction_date', to)
          .order('transaction_date', { ascending: false }),
        supabase.from('fund_requests')
          .select('status,total_amount,priority,created_at,title')
          .gte('created_at', from).lte('created_at', to + 'T23:59:59')
          .order('created_at', { ascending: false }),
      ]);

      const txs: TxRow[]  = (txRes.data ?? []) as TxRow[];
      const reqs: ReqRow[] = (reqRes.data ?? []) as ReqRow[];

      let totalIncome = 0, totalExpense = 0;
      const catMap = new Map<string, { amount: number; count: number }>();

      for (const t of txs) {
        const amt = Number(t.amount);
        if (t.type === 'income') { totalIncome += amt; }
        else {
          totalExpense += amt;
          const existing = catMap.get(t.category) ?? { amount: 0, count: 0 };
          catMap.set(t.category, { amount: existing.amount + amt, count: existing.count + 1 });
        }
      }

      let pendingReqs = 0, approvedReqs = 0, disbursed = 0;
      for (const r of reqs) {
        if (r.status === 'pending')  pendingReqs++;
        if (r.status === 'approved' || r.status === 'paid') { approvedReqs++; disbursed += Number(r.total_amount); }
      }

      const catArr: CategoryBreakdown[] = Array.from(catMap.entries())
        .map(([category, { amount, count }]) => ({ category, amount, count, pct: totalExpense ? (amount / totalExpense) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount);

      setSummary({
        totalIncome, totalExpense, netFlow: totalIncome - totalExpense,
        balance: acctRes.data?.balance ?? 0,
        currency: acctRes.data?.currency ?? 'GHS',
        pendingReqs, approvedReqs, disbursed,
        txCount: txs.length,
      });
      setCats(catArr);
      setTxRows(txs);
      setReqRows(reqs);
    } catch {}
    setLoading(false);
  }

  function applyPreset(idx: number) {
    setActivePreset(idx);
    const { from: f, to: t } = PRESET_RANGES[idx].getValue();
    setFrom(f); setTo(t);
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Type', 'Category', 'Description', 'Amount'],
      ...txRows.map(t => [t.transaction_date, t.type, t.category, `"${t.description}"`, t.amount]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `financial-report-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const s = summary;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of petty cash and fund request activity</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Date range controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
            {PRESET_RANGES.map((p, i) => (
              <button
                key={p.label}
                onClick={() => applyPreset(i)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                  activePreset === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date" value={from} onChange={e => { setFrom(e.target.value); setActivePreset(-1); }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date" value={to} onChange={e => { setTo(e.target.value); setActivePreset(-1); }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : !s ? null : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Balance</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold">{fmt(s.balance, s.currency)}</p>
              <p className="text-slate-400 text-xs mt-1">Current</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Income</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">{fmt(s.totalIncome, s.currency)}</p>
              <p className="text-gray-400 text-xs mt-1">{txRows.filter(t => t.type === 'income').length} transactions</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Expenses</span>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">{fmt(s.totalExpense, s.currency)}</p>
              <p className="text-gray-400 text-xs mt-1">{txRows.filter(t => t.type === 'expense').length} transactions</p>
            </div>

            <div className={cn(
              'rounded-2xl border p-5 shadow-sm',
              s.netFlow >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Net Flow</span>
                <ArrowUpRight className={cn('w-4 h-4', s.netFlow >= 0 ? 'text-emerald-500' : 'text-red-500 rotate-180')} />
              </div>
              <p className={cn('text-xl font-bold', s.netFlow >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                {s.netFlow >= 0 ? '+' : ''}{fmt(s.netFlow, s.currency)}
              </p>
              <p className="text-gray-400 text-xs mt-1">Income − Expenses</p>
            </div>
          </div>

          {/* Fund request summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Fund Requests</h2>
              <span className="text-xs text-gray-400 ml-auto">{from} – {to}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Requests', value: String(reqRows.length), sub: 'in period' },
                { label: 'Approved / Paid', value: String(s.approvedReqs), sub: 'of ' + reqRows.length },
                { label: 'Total Disbursed', value: fmt(s.disbursed, s.currency), sub: 'approved + paid' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category breakdown */}
            {cats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Expense Breakdown</h2>
                </div>
                <div className="space-y-3">
                  {cats.map((c, i) => (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2.5 h-2.5 rounded-full', CATEGORY_COLORS[i % CATEGORY_COLORS.length])} />
                          <span className="font-medium text-gray-700 capitalize">{c.category}</span>
                          <span className="text-gray-400 text-xs">({c.count})</span>
                        </div>
                        <span className="font-semibold text-gray-900">{fmt(c.amount, s.currency)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', CATEGORY_COLORS[i % CATEGORY_COLORS.length])}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 text-right">{c.pct.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction log */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Transaction Log</h2>
                <span className="text-xs text-gray-400">{txRows.length} records</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {txRows.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">No transactions in this period</p>
                ) : txRows.map((tx, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                      tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
                    )}>
                      {tx.type === 'income'
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 capitalize">{tx.category} · {new Date(tx.transaction_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span className={cn('text-sm font-semibold shrink-0', tx.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                      {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fund requests detail */}
          {reqRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Fund Requests Detail</h2>
                <span className="text-xs text-gray-400">{reqRows.length} requests</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Priority</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reqRows.slice((reqPage - 1) * reqPageSize, reqPage * reqPageSize).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{r.title}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(r.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-gray-600 text-xs font-medium">{r.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                            r.status === 'approved' || r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                            r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(r.total_amount, s.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={reqPage} totalPages={reqTotalPages} onPageChange={setReqPage} totalItems={reqRows.length} pageSize={reqPageSize} onLoadAll={() => { setReqLoadAll(true); setReqPage(1); }} onResetPaging={() => { setReqLoadAll(false); setReqPage(1); }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
