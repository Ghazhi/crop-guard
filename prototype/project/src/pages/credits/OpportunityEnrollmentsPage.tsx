import { useState, useEffect, useCallback } from 'react';
import {
  Search, DollarSign, TrendingUp, Clock, CheckCircle,
  AlertTriangle, ChevronRight, Wallet, Calendar,
  Loader2, X, Plus, FileText, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { CROP_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Pagination } from '../../components/ui/pagination';

// ── Types ────────────────────────────────────────────────────────────────────

interface Application {
  id:                  string;
  farmer_id:           string;
  intervention_id:     string;
  status:              string;
  notes:               string | null;
  applied_at:          string;
  approved_at:         string | null;
  created_at:          string;
  updated_at:          string;
  // financial fields
  disbursed_amount:    number | null;
  repayment_total:     number | null;
  interest_rate:       number | null;
  disbursement_date:   string | null;
  repayment_due_date:  string | null;
  repayment_frequency: string | null;
  loan_duration_weeks: number | null;
  disbursed_at:        string | null;
  // joined
  farmer:              { full_name: string; phone: string; region: string; primary_crop: string | null } | null;
  intervention:        { name: string; type: string; value_description: string; min_fri: number } | null;
  enrollments:          { id: string; status: string; cohorts: { name: string } | null; programs: { name: string } | null } | null;
}

interface RepaymentRow {
  id:             string;
  application_id: string;
  installment_no: number;
  due_date:       string;
  amount_due:     number;
  amount_paid:    number;
  status:         string;
  paid_at:        string | null;
  notes:          string | null;
}

interface FRIInfo {
  total_score: number;
  zone: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  applied:     'bg-amber-100 text-amber-700',
  approved:    'bg-blue-100 text-blue-700',
  disbursed:   'bg-emerald-100 text-emerald-700',
  repaying:    'bg-indigo-100 text-indigo-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  defaulted:   'bg-red-200 text-red-900',
};

const ZONE_STYLE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

const FREQ_LABELS: Record<string, string> = {
  lump_sum:   'Lump Sum',
  weekly:     'Weekly',
  biweekly:   'Bi-Weekly',
  monthly:    'Monthly',
  quarterly:  'Quarterly',
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'GHS 0';
  return `GHS ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Repayment Schedule Generator ─────────────────────────────────────────────

function generateSchedule(
  principal: number,
  interestRate: number,
  frequency: string,
  durationWeeks: number,
  startDate: string,
): { due_date: string; amount_due: number; installment_no: number }[] {
  if (principal <= 0 || durationWeeks <= 0) return [];

  const totalOwed = principal * (1 + interestRate / 100);
  const start = new Date(startDate);

  let intervals = 1;
  let stepWeeks = durationWeeks;
  switch (frequency) {
    case 'weekly':     stepWeeks = 1;    intervals = Math.max(1, Math.floor(durationWeeks / 1));  break;
    case 'biweekly':   stepWeeks = 2;    intervals = Math.max(1, Math.floor(durationWeeks / 2));  break;
    case 'monthly':    stepWeeks = 4;    intervals = Math.max(1, Math.floor(durationWeeks / 4));  break;
    case 'quarterly':  stepWeeks = 12;   intervals = Math.max(1, Math.floor(durationWeeks / 12)); break;
    default:           intervals = 1;   break;
  }

  const perInstallment = totalOwed / intervals;
  const schedule: { due_date: string; amount_due: number; installment_no: number }[] = [];

  for (let i = 1; i <= intervals; i++) {
    const due = new Date(start);
    due.setDate(due.getDate() + stepWeeks * i * 7);
    schedule.push({
      installment_no: i,
      due_date: due.toISOString(),
      amount_due: Math.round(perInstallment * 100) / 100,
    });
  }

  return schedule;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OpportunityEnrollmentsPage() {
  const { profile } = useAuthStore();
  const [apps, setApps]             = useState<Application[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]            = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [repayments, setRepayments]   = useState<RepaymentRow[]>([]);
  const [repayLoading, setRepayLoading] = useState(false);
  const [friMap, setFriMap] = useState<Record<string, FRIInfo>>({});
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  // Disbursement form
  const [disbForm, setDisbForm] = useState({
    amount: '',
    interestRate: '',
    frequency: 'lump_sum',
    durationWeeks: '',
    disbursementDate: '',
  });
  const [disbursing, setDisbursing] = useState(false);

  // Repayment form
  const [payingInstallment, setPayingInstallment] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, friRes] = await Promise.all([
        supabase
          .from('farmer_intervention_applications')
          .select(`
            id, farmer_id, intervention_id, status, notes, applied_at, approved_at,
            created_at, updated_at, disbursed_amount, repayment_total, interest_rate,
            disbursement_date, repayment_due_date, repayment_frequency, loan_duration_weeks,
            disbursed_at,
            farmer:farmers(full_name, phone, region, primary_crop),
            intervention:interventions_catalog(name, type, value_description, min_fri),
            enrollments:enrollments(id, status, cohorts(name), programs(name))
          `)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('farmer_fri_scores')
          .select('farmer_id, total_score, zone, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      const appsData = (appsRes.data ?? []) as unknown as Application[];
      setApps(appsData);

      // Latest FRI per farmer
      const fMap: Record<string, FRIInfo> = {};
      (friRes.data ?? []).forEach((r: any) => {
        if (!fMap[r.farmer_id]) fMap[r.farmer_id] = { total_score: Number(r.total_score), zone: r.zone };
      });
      setFriMap(fMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Aggregate financials ─────────────────────────────────────────────────────

  const totalDisbursed  = apps.reduce((s, a) => s + (a.disbursed_amount ?? 0), 0);
  const totalRepaid     = apps.reduce((s, a) => s + (a.repayment_total ?? 0), 0);
  const outstanding     = totalDisbursed - totalRepaid;
  const pendingApproval = apps.filter(a => a.status === 'applied').length;
  const activeLoans     = apps.filter(a => a.status === 'disbursed' || a.status === 'repaying').length;
  const defaulted       = apps.filter(a => a.status === 'defaulted').length;

  // ── Filters ──────────────────────────────────────────────────────────────────

  let filtered = apps;
  if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(a =>
      a.farmer?.full_name?.toLowerCase().includes(q) ||
      a.intervention?.name?.toLowerCase().includes(q)
    );
  }

  const pageSize = loadAll ? filtered.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [query, statusFilter]);

  // ── Open detail drawer ───────────────────────────────────────────────────────

  async function openDetail(app: Application) {
    setSelectedApp(app);
    setDrawerOpen(true);
    setRepayLoading(true);
    setDisbForm({
      amount: app.disbursed_amount ? String(app.disbursed_amount) : '',
      interestRate: app.interest_rate ? String(app.interest_rate) : '',
      frequency: app.repayment_frequency ?? 'lump_sum',
      durationWeeks: app.loan_duration_weeks ? String(app.loan_duration_weeks) : '',
      disbursementDate: app.disbursement_date ? app.disbursement_date.split('T')[0] : '',
    });

    try {
      const { data } = await supabase
        .from('repayment_schedule')
        .select('*')
        .eq('application_id', app.id)
        .order('installment_no', { ascending: true });
      setRepayments((data ?? []) as RepaymentRow[]);
    } catch (e) {
      console.error(e);
    } finally {
      setRepayLoading(false);
    }
  }

  // ── Approve application ──────────────────────────────────────────────────────

  async function approveApp(app: Application) {
    try {
      await supabase
        .from('farmer_intervention_applications')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: profile?.id })
        .eq('id', app.id);
      await load();
      const updated = apps.find(a => a.id === app.id);
      if (updated) setSelectedApp({ ...updated, status: 'approved' });
    } catch (e) {
      console.error(e);
    }
  }

  async function rejectApp(app: Application) {
    try {
      await supabase
        .from('farmer_intervention_applications')
        .update({ status: 'rejected' })
        .eq('id', app.id);
      await load();
      setDrawerOpen(false);
    } catch (e) {
      console.error(e);
    }
  }

  // ── Disburse funds + generate schedule ────────────────────────────────────────

  async function handleDisburse() {
    if (!selectedApp) return;
    setDisbursing(true);
    try {
      const amount = parseFloat(disbForm.amount) || 0;
      const rate = parseFloat(disbForm.interestRate) || 0;
      const weeks = parseInt(disbForm.durationWeeks) || 0;
      const disbursementDate = disbForm.disbursementDate
        ? new Date(disbForm.disbursementDate).toISOString()
        : new Date().toISOString();

      const totalOwed = amount * (1 + rate / 100);

      // Update application
      await supabase
        .from('farmer_intervention_applications')
        .update({
          status: 'disbursed',
          disbursed_amount: amount,
          repayment_total: 0,
          interest_rate: rate,
          repayment_frequency: disbForm.frequency,
          loan_duration_weeks: weeks,
          disbursement_date: disbursementDate,
          repayment_due_date: weeks > 0
            ? new Date(new Date(disbursementDate).getTime() + weeks * 7 * 86400000).toISOString()
            : null,
          disbursed_at: new Date().toISOString(),
          disbursed_by: profile?.id,
        })
        .eq('id', selectedApp.id);

      // Generate and insert repayment schedule
      const schedule = generateSchedule(amount, rate, disbForm.frequency, weeks, disbursementDate);
      if (schedule.length > 0) {
        const rows = schedule.map(s => ({
          application_id: selectedApp.id,
          installment_no: s.installment_no,
          due_date: s.due_date,
          amount_due: s.amount_due,
          amount_paid: 0,
          status: 'pending',
        }));
        await supabase.from('repayment_schedule').upsert(rows, { onConflict: 'application_id,installment_no' });
      }

      await load();
      setDrawerOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setDisbursing(false);
    }
  }

  // ── Record a repayment ──────────────────────────────────────────────────────

  async function handleRecordPayment(row: RepaymentRow) {
    const amount = parseFloat(payAmount);
    if (!selectedApp || isNaN(amount) || amount <= 0) return;
    setRecordingPayment(true);
    try {
      const newPaid = Number(row.amount_paid) + amount;
      const newStatus = newPaid >= Number(row.amount_due) ? 'paid' : 'partial';

      await supabase
        .from('repayment_schedule')
        .update({
          amount_paid: newPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          paid_by: profile?.id,
        })
        .eq('id', row.id);

      // Update repayment_total on the application
      const newTotal = (selectedApp.repayment_total ?? 0) + amount;
      const appStatus = newTotal >= (selectedApp.disbursed_amount ?? 0) * (1 + (selectedApp.interest_rate ?? 0) / 100)
        ? 'completed' : 'repaying';

      await supabase
        .from('farmer_intervention_applications')
        .update({ repayment_total: newTotal, status: appStatus })
        .eq('id', selectedApp.id);

      // Refresh repayments
      const { data } = await supabase
        .from('repayment_schedule')
        .select('*')
        .eq('application_id', selectedApp.id)
        .order('installment_no', { ascending: true });
      setRepayments((data ?? []) as RepaymentRow[]);

      setSelectedApp({ ...selectedApp, repayment_total: newTotal, status: appStatus });
      setPayingInstallment(null);
      setPayAmount('');
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setRecordingPayment(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opportunity Enrollments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage opportunity pathway enrollments with full financial tracking — disbursements, repayments, and schedules.
        </p>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Disbursed',  value: fmtMoney(totalDisbursed), icon: Wallet,      color: 'bg-blue-50 text-blue-700'      },
          { label: 'Total Repayments', value: fmtMoney(totalRepaid),    icon: TrendingUp,  color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Outstanding',      value: fmtMoney(outstanding),    icon: AlertTriangle,color: 'bg-amber-50 text-amber-700'    },
          { label: 'Pending Approval', value: pendingApproval,         icon: Clock,       color: 'bg-orange-50 text-orange-700'  },
          { label: 'Active Loans',     value: activeLoans,             icon: DollarSign,   color: 'bg-indigo-50 text-indigo-700'   },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', color)}>
              <Icon className="w-4 h-4" />
            </div>
            {loading
              ? <Skeleton className="h-6 w-20 mb-1" />
              : <p className="text-lg font-bold text-gray-900">{value}</p>
            }
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Defaulted callout */}
      {!loading && defaulted > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-800">
            {defaulted} loan{defaulted !== 1 ? 's' : ''} in default — review and take action.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search farmer or opportunity…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="repaying">Repaying</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Farmer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Opportunity</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Program / Cohort</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden xl:table-cell">FRI</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Disbursed</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Repaid</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-4 hidden xl:table-cell"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-18 rounded-full" /></td>
                      <td />
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No enrollments found.</p>
                      </td>
                    </tr>
                  )
                  : filtered.slice((page - 1) * pageSize, page * pageSize).map(a => {
                      const fri = friMap[a.farmer_id];
                      const outstandingRow = (a.disbursed_amount ?? 0) - (a.repayment_total ?? 0);
                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => openDetail(a)}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-blue-700 text-xs font-bold">
                                  {a.farmer?.full_name?.charAt(0) ?? '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{a.farmer?.full_name ?? '—'}</p>
                                <p className="text-xs text-gray-400">{a.farmer?.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <p className="font-medium text-gray-800 text-sm">{a.intervention?.name ?? '—'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{a.intervention?.type ?? ''}</p>
                          </td>
                          <td className="px-4 py-3.5 hidden lg:table-cell text-sm text-gray-600">
                            <p>{a.enrollments?.programs?.name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{a.enrollments?.cohorts?.name ?? ''}</p>
                          </td>
                          <td className="px-4 py-3.5 hidden xl:table-cell">
                            {fri ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-800 text-sm">{fri.total_score.toFixed(1)}</span>
                                {fri.zone && (
                                  <span className={cn(
                                    'text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize',
                                    ZONE_STYLE[fri.zone] ?? 'bg-gray-100 text-gray-500'
                                  )}>
                                    {fri.zone}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-gray-800">
                            {a.disbursed_amount ? fmtMoney(a.disbursed_amount) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                            {a.repayment_total ? (
                              <div>
                                <p className="font-medium text-emerald-700">{fmtMoney(a.repayment_total)}</p>
                                {outstandingRow > 0 && (
                                  <p className="text-xs text-amber-600">{fmtMoney(outstandingRow)} left</p>
                                )}
                              </div>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                              STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-500'
                            )}>
                              {a.status}
                            </span>
                          </td>
                          <td className="pr-4">
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </td>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
      </div>

      {/* ── Detail Drawer ─────────────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width="max-w-3xl" title="Enrollment Detail">
          {selectedApp && (
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {/* Farmer + opportunity info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Farmer</p>
                  <p className="font-semibold text-gray-900">{selectedApp.farmer?.full_name ?? '—'}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{selectedApp.farmer?.phone}</span>
                    <span>{selectedApp.farmer?.region ?? '—'}</span>
                    <span>{CROP_LABELS[selectedApp.farmer?.primary_crop as keyof typeof CROP_LABELS] ?? selectedApp.farmer?.primary_crop ?? '—'}</span>
                  </div>
                  {friMap[selectedApp.farmer_id] && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm font-semibold text-gray-700">
                        FRI: {friMap[selectedApp.farmer_id].total_score.toFixed(1)}
                      </span>
                      {friMap[selectedApp.farmer_id].zone && (
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                          ZONE_STYLE[friMap[selectedApp.farmer_id].zone!] ?? 'bg-gray-100 text-gray-500'
                        )}>
                          {friMap[selectedApp.farmer_id].zone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Opportunity</p>
                  <p className="font-semibold text-gray-900">{selectedApp.intervention?.name ?? '—'}</p>
                  <p className="text-sm text-gray-600">{selectedApp.intervention?.type ?? ''}</p>
                  {selectedApp.intervention?.value_description && (
                    <p className="text-xs text-gray-500">{selectedApp.intervention.value_description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                      STATUS_STYLE[selectedApp.status] ?? 'bg-gray-100 text-gray-500'
                    )}>
                      {selectedApp.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Applied date + notes */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Applied on {fmtDate(selectedApp.applied_at)}
              </div>
              {selectedApp.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-amber-800">{selectedApp.notes}</p>
                </div>
              )}

              {/* Action buttons for applied status */}
              {selectedApp.status === 'applied' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => approveApp(selectedApp)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    onClick={() => rejectApp(selectedApp)}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </div>
              )}

              {/* Disbursement form (for approved status) */}
              {selectedApp.status === 'approved' && (
                <div className="border border-blue-100 rounded-xl p-5 space-y-4 bg-blue-50/50">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-700" />
                    <h3 className="font-semibold text-blue-900">Disburse Funds</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">Disbursement Amount (GHS) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={disbForm.amount}
                        onChange={e => setDisbForm(f => ({ ...f, amount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">Interest Rate (%)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 10"
                        value={disbForm.interestRate}
                        onChange={e => setDisbForm(f => ({ ...f, interestRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">Repayment Frequency</Label>
                      <Select
                        value={disbForm.frequency}
                        onValueChange={v => setDisbForm(f => ({ ...f, frequency: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(FREQ_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">Duration (weeks)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 16"
                        value={disbForm.durationWeeks}
                        onChange={e => setDisbForm(f => ({ ...f, durationWeeks: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">Disbursement Date</Label>
                      <Input
                        type="date"
                        value={disbForm.disbursementDate}
                        onChange={e => setDisbForm(f => ({ ...f, disbursementDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleDisburse}
                    disabled={disbursing || !disbForm.amount}
                    className="bg-blue-700 hover:bg-blue-800 text-white w-full"
                  >
                    {disbursing
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Disbursing…</>
                      : <><Wallet className="w-4 h-4 mr-2" />Disburse & Generate Schedule</>}
                  </Button>
                </div>
              )}

              {/* Financial summary (for disbursed/repaying/completed) */}
              {(selectedApp.status === 'disbursed' || selectedApp.status === 'repaying' || selectedApp.status === 'completed' || selectedApp.status === 'defaulted') && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Disbursed',    value: fmtMoney(selectedApp.disbursed_amount) },
                    { label: 'Repaid',       value: fmtMoney(selectedApp.repayment_total) },
                    { label: 'Outstanding',  value: fmtMoney((selectedApp.disbursed_amount ?? 0) - (selectedApp.repayment_total ?? 0)) },
                    { label: 'Interest Rate', value: selectedApp.interest_rate ? `${selectedApp.interest_rate}%` : '0%' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Repayment schedule */}
              {(selectedApp.status === 'disbursed' || selectedApp.status === 'repaying' || selectedApp.status === 'completed' || selectedApp.status === 'defaulted') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Repayment Schedule
                    </h3>
                    <span className="text-xs text-gray-400">
                      {repayments.filter(r => r.status === 'paid').length} / {repayments.length} paid
                    </span>
                  </div>

                  {repayLoading
                    ? <Skeleton className="h-32 w-full" />
                    : repayments.length === 0
                      ? (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                          <p className="text-sm text-gray-400">No repayment schedule generated yet.</p>
                        </div>
                      )
                      : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">#</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Due Date</th>
                                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Amount Due</th>
                                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Paid</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                                <th className="w-20" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {repayments.map(r => {
                                const isPaying = payingInstallment === r.id;
                                return (
                                  <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-700">{r.installment_no}</td>
                                    <td className="px-4 py-3 text-gray-600">{fmtDate(r.due_date)}</td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtMoney(r.amount_due)}</td>
                                    <td className="px-4 py-3 text-right hidden sm:table-cell text-emerald-700 font-medium">
                                      {fmtMoney(r.amount_paid)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={cn(
                                        'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                                        r.status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                                        r.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                        r.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                                 'bg-gray-100 text-gray-500'
                                      )}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {r.status !== 'paid' && (
                                        isPaying ? (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              placeholder="Amount"
                                              value={payAmount}
                                              onChange={e => setPayAmount(e.target.value)}
                                              className="h-8 w-20 text-xs"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleRecordPayment(r)}
                                              disabled={recordingPayment}
                                              className="text-emerald-600 hover:text-emerald-800 p-1"
                                              title="Confirm"
                                            >
                                              {recordingPayment
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <CheckCircle className="w-4 h-4" />}
                                            </button>
                                            <button
                                              onClick={() => { setPayingInstallment(null); setPayAmount(''); }}
                                              className="text-gray-400 hover:text-gray-600 p-1"
                                              title="Cancel"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setPayingInstallment(r.id);
                                              setPayAmount(String(Number(r.amount_due) - Number(r.amount_paid)));
                                            }}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                          >
                                            Record Payment
                                          </button>
                                        )
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                  }
                </div>
              )}

              {/* Program / cohort info */}
              {selectedApp.enrollments && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enrollment</p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedApp.enrollments.programs?.name ?? '—'}
                    {selectedApp.enrollments.cohorts?.name && ` · ${selectedApp.enrollments.cohorts.name}`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">Status: {selectedApp.enrollments.status}</p>
                </div>
              )}
            </div>
          )}
      </Drawer>
    </div>
  );
}
