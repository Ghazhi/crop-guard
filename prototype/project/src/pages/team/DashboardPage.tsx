import { useEffect, useState } from 'react';
import {
  Wallet, ClipboardList, TrendingUp, TrendingDown,
  Clock, CheckCircle, XCircle, AlertCircle,
  Plus, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';

interface Account { id: string; name: string; balance: number; currency: string; }
interface Transaction { id: string; type: string; category: string; description: string; amount: number; transaction_date: string; }
interface FundRequest { id: string; title: string; total_amount: number; status: string; priority: string; created_at: string; }

interface Stats {
  balance: number;
  currency: string;
  accountName: string;
  pendingRequests: number;
  approvedThisMonth: number;
  totalDisbursed: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid:     'bg-blue-100 text-blue-700',
};
const STATUS_ICONS: Record<string, React.ElementType> = {
  draft:    Clock,
  pending:  AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
  paid:     CheckCircle,
};

const PRIORITY_DOT: Record<string, string> = {
  low:    'bg-gray-400',
  medium: 'bg-amber-400',
  high:   'bg-orange-500',
  urgent: 'bg-red-500',
};

function fmt(amount: number, currency = 'GHS') {
  return `${currency} ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export default function TeamDashboardPage() {
  const profile = useAuthStore(s => s.profile);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [recentReqs, setRecentReqs] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const [acctRes, txRes, reqRes] = await Promise.all([
        supabase.from('petty_cash_accounts').select('id,name,balance,currency').eq('is_active', true).maybeSingle(),
        supabase.from('petty_cash_transactions').select('id,type,category,description,amount,transaction_date').order('transaction_date', { ascending: false }).limit(5),
        supabase.from('fund_requests').select('id,title,total_amount,status,priority,created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const account: Account | null = acctRes.data;

      const txMonth = await supabase
        .from('petty_cash_transactions')
        .select('type,amount')
        .gte('transaction_date', monthStart);

      let incomeThisMonth = 0, expenseThisMonth = 0;
      (txMonth.data ?? []).forEach((t: any) => {
        if (t.type === 'income') incomeThisMonth += Number(t.amount);
        else expenseThisMonth += Number(t.amount);
      });

      const reqStats = await supabase
        .from('fund_requests')
        .select('status,total_amount')
        .gte('created_at', monthStart);

      let pendingRequests = 0, approvedThisMonth = 0, totalDisbursed = 0;
      (reqStats.data ?? []).forEach((r: any) => {
        if (r.status === 'pending') pendingRequests++;
        if (r.status === 'approved' || r.status === 'paid') { approvedThisMonth++; totalDisbursed += Number(r.total_amount); }
      });

      setStats({
        balance: account?.balance ?? 0,
        currency: account?.currency ?? 'GHS',
        accountName: account?.name ?? 'Petty Cash',
        pendingRequests,
        approvedThisMonth,
        totalDisbursed,
        incomeThisMonth,
        expenseThisMonth,
      });
      setRecentTx((txRes.data ?? []) as Transaction[]);
      setRecentReqs((reqRes.data ?? []) as FundRequest[]);
    } catch {}
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const s = stats ?? { balance: 0, currency: 'GHS', accountName: 'Petty Cash', pendingRequests: 0, approvedThisMonth: 0, totalDisbursed: 0, incomeThisMonth: 0, expenseThisMonth: 0 };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/team/petty-cash"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Transaction
          </Link>
          <Link
            to="/team/requests"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Fund Request
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{s.accountName}</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold">{fmt(s.balance, s.currency)}</p>
          <p className="text-slate-400 text-xs mt-1">Current balance</p>
        </div>

        <StatCard icon={TrendingUp}    label="Income this month"   value={fmt(s.incomeThisMonth, s.currency)}  color="bg-emerald-600 text-white" />
        <StatCard icon={TrendingDown}  label="Expenses this month" value={fmt(s.expenseThisMonth, s.currency)} color="bg-red-500 text-white" />
        <StatCard icon={ClipboardList} label="Pending fund requests" value={s.pendingRequests} color="bg-amber-500 text-white" />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
            <Link to="/team/petty-cash" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-medium">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTx.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No transactions yet</p>
            ) : (
              recentTx.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
                  )}>
                    {tx.type === 'income'
                      ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                      : <TrendingDown className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.category} · {new Date(tx.transaction_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold shrink-0',
                    tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent fund requests */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Fund Requests</h2>
            <Link to="/team/requests" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-medium">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentReqs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No fund requests yet</p>
            ) : (
              recentReqs.map(req => {
                const StatusIcon = STATUS_ICONS[req.status] ?? Clock;
                return (
                  <div key={req.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', PRIORITY_DOT[req.priority] ?? 'bg-gray-400')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{req.title}</p>
                      <p className="text-xs text-gray-400">
                        {fmt(req.total_amount)} · {new Date(req.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[req.status])}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Month summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-slate-50 rounded-2xl border border-emerald-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">This Month Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Approved Requests', value: String(s.approvedThisMonth), sub: 'this month' },
            { label: 'Total Disbursed', value: fmt(s.totalDisbursed, s.currency), sub: 'approved + paid' },
            { label: 'Net Cash Flow', value: fmt(s.incomeThisMonth - s.expenseThisMonth, s.currency), sub: 'income − expenses' },
            { label: 'Closing Balance', value: fmt(s.balance, s.currency), sub: 'petty cash' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white/70 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-base font-bold text-gray-900 mt-0.5 truncate">{value}</p>
              <p className="text-[10px] text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
