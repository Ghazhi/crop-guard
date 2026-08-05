import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Plus, X, Loader2,
  Wallet, Filter, Search, Upload, AlertCircle, ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Pagination } from '../../components/ui/pagination';

// ── Toast ──────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; message: string; type: 'success' | 'error'; }

function Toast({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto',
            t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────

interface Account { id: string; name: string; balance: number; currency: string; description: string | null; }
interface Transaction {
  id: string; account_id: string; type: 'income' | 'expense';
  category: string; description: string; amount: number;
  transaction_date: string; notes: string | null; receipt_url: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Office Supplies', 'Transport', 'Utilities', 'Catering / Refreshments',
  'Printing & Stationery', 'Fuel', 'Maintenance', 'Communication', 'Miscellaneous',
];
const INCOME_CATEGORIES = [
  'Top-up / Fund Transfer', 'Refund / Recovery', 'Grant', 'Other Income',
];

function fmt(amount: number, currency = 'GHS') {
  return `${currency} ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

// ── Transaction form modal ─────────────────────────────────────────────────

interface TxFormProps {
  account: Account;
  onClose: () => void;
  onSaved: () => void;
  orgId: string;
  userId: string;
}

function TransactionForm({ account, onClose, onSaved, orgId, userId }: TxFormProps) {
  const [type, setType]         = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDesc]  = useState('');
  const [amount, setAmount]     = useState('');
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `receipts/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('cropguard-avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('cropguard-avatars').getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { setError('Please select a category.'); return; }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      const amt = parseFloat(amount);
      const { error: txErr } = await supabase.from('petty_cash_transactions').insert({
        account_id: account.id,
        organisation_id: orgId,
        type, category, description, amount: amt, notes: notes || null,
        transaction_date: date, recorded_by: userId,
        receipt_url: receiptUrl || null,
      });
      if (txErr) throw txErr;

      // Update account balance
      const newBalance = type === 'income'
        ? Number(account.balance) + amt
        : Number(account.balance) - amt;
      await supabase.from('petty_cash_accounts').update({ balance: newBalance }).eq('id', account.id);

      onSaved();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save transaction.');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map(t => (
              <button
                key={t} type="button" onClick={() => { setType(t); setCategory(''); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors',
                  type === t
                    ? t === 'income' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {t === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category *</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c} type="button" onClick={() => setCategory(c)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                    category === c ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  )}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description *</Label>
            <Input placeholder="Brief description of this transaction" value={description} onChange={e => setDesc(e.target.value)} required />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount ({account.currency}) *</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</Label>
            <textarea
              rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>

          {/* Receipt */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt (optional)</Label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
            <button
              type="button" onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 text-sm transition-colors',
                receiptUrl ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'
              )}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {receiptUrl ? 'Receipt uploaded — tap to replace' : 'Upload receipt'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              type="submit" disabled={saving}
              className={cn('flex-1', type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PettyCashPage() {
  const profile = useAuthStore(s => s.profile);
  const [account, setAccount]       = useState<Account | null>(null);
  const [transactions, setTx]       = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch]         = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [creating, setCreating]     = useState(false);
  const [toasts, setToasts]         = useState<ToastMsg[]>([]);
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);
  const toastCounter                = useRef(0);

  function addToast(message: string, type: 'success' | 'error') {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: acct } = await supabase
        .from('petty_cash_accounts')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (acct) {
        setAccount(acct as Account);
        let q = supabase.from('petty_cash_transactions').select('*').eq('account_id', acct.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
        const { data: txData } = await q;
        setTx((txData ?? []) as Transaction[]);
      } else {
        setAccount(null);
        setTx([]);
      }
    } catch {}
    setLoading(false);
  }

  async function ensureAccount() {
    if (account) { setShowForm(true); return; }
    if (!profile?.organisation_id) return;
    setCreating(true);
    const { data, error } = await supabase.from('petty_cash_accounts').insert({
      organisation_id: profile.organisation_id,
      name: 'Main Petty Cash',
      description: 'Default petty cash account',
      balance: 0,
      currency: 'GHS',
      created_by: profile.id,
    }).select().maybeSingle();
    setCreating(false);
    if (error) {
      addToast(error.message ?? 'Failed to create petty cash account.', 'error');
      return;
    }
    if (data) { setAccount(data as Account); setShowForm(true); }
  }

  const filtered = transactions.filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (dateFrom && tx.transaction_date < dateFrom) return false;
    if (dateTo && tx.transaction_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      return tx.description.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q);
    }
    return true;
  });

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const pageSize = loadAll ? filtered.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [search, typeFilter, dateFrom, dateTo]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Petty Cash</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track day-to-day income and expenses</p>
        </div>
        <Button
          onClick={ensureAccount} disabled={creating}
          className="bg-slate-800 hover:bg-slate-900 gap-1.5"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Transaction
        </Button>
      </div>

      {/* Account balance card */}
      {loading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex items-center gap-6">
          <div className="w-12 h-12 bg-emerald-400/20 rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{account?.name ?? 'No Account'}</p>
            <p className="text-3xl font-bold mt-0.5">{fmt(account?.balance ?? 0, account?.currency)}</p>
            <p className="text-slate-400 text-sm mt-0.5">Available balance</p>
          </div>
          <div className="hidden sm:flex flex-col gap-2 text-right shrink-0">
            <div>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Filtered In</p>
              <p className="text-emerald-400 font-semibold text-sm">+{fmt(totalIncome, account?.currency)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Filtered Out</p>
              <p className="text-red-400 font-semibold text-sm">-{fmt(totalExpense, account?.currency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button
              key={t} onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                typeFilter === t ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors', showFilters ? 'bg-slate-100 border-slate-300' : 'border-gray-200 text-gray-600')}
        >
          <Filter className="w-4 h-4" />
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3 flex-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          </div>
          {(dateFrom || dateTo) && (
            <div className="flex items-end">
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium pb-2">Clear dates</button>
            </div>
          )}
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No transactions found</p>
          <p className="text-sm mt-1">
            {search || typeFilter !== 'all' || dateFrom || dateTo ? 'Adjust your filters' : 'Click "Add Transaction" to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[auto_1fr_140px_120px_80px] gap-0 px-5 py-2.5 border-b bg-gray-50/80">
            <div className="w-10" />
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Description</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Category</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Date</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</p>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.slice((page - 1) * pageSize, page * pageSize).map(tx => (
              <div key={tx.id} className="flex sm:grid sm:grid-cols-[auto_1fr_140px_120px_80px] items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
                )}>
                  {tx.type === 'income'
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                  {tx.notes && <p className="text-xs text-gray-400 truncate">{tx.notes}</p>}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tx.category}</span>
                </div>
                <p className="hidden sm:block text-xs text-gray-400">
                  {new Date(tx.transaction_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className={cn('text-sm font-semibold text-right shrink-0', tx.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                  {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </div>
      )}

      {/* Add transaction modal */}
      {showForm && account && profile && (
        <TransactionForm
          account={account}
          orgId={profile.organisation_id!}
          userId={profile.id}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            addToast('Transaction saved successfully.', 'success');
            loadData();
          }}
        />
      )}

      <Toast toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
