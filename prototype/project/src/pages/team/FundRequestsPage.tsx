import { useEffect, useState, useRef } from 'react';
import {
  Plus, Search, ChevronDown, ChevronUp, Trash2,
  CheckCircle, XCircle, Clock, AlertCircle, Send,
  DollarSign, FileText, X, Upload, Loader2, Paperclip,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Pagination } from '../../components/ui/pagination';

type ReqStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
type Priority  = 'low' | 'medium' | 'high' | 'urgent';

interface LineItem { id?: string; description: string; quantity: number; unit_cost: number; }
interface FundRequest {
  id: string; title: string; description: string | null;
  total_amount: number; status: ReqStatus; priority: Priority;
  created_at: string; invoice_url?: string | null;
  fund_request_items?: LineItem[];
}

const STATUS_CONFIG: Record<ReqStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:    { label: 'Draft',    color: 'bg-gray-100 text-gray-600',       icon: Clock },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700',     icon: AlertCircle },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700',         icon: XCircle },
  paid:     { label: 'Paid',     color: 'bg-blue-100 text-blue-700',       icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<Priority, { dot: string }> = {
  low:    { dot: 'bg-gray-400' },
  medium: { dot: 'bg-amber-400' },
  high:   { dot: 'bg-orange-500' },
  urgent: { dot: 'bg-red-500' },
};

function fmt(amount: number) {
  return `GHS ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

const TABS: { label: string; value: ReqStatus | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Draft',    value: 'draft' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Paid',     value: 'paid' },
];

const EMPTY_ITEM: LineItem = { description: '', quantity: 1, unit_cost: 0 };

// ── Success banner after submission ───────────────────────────────────────
function SubmissionSuccess({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-medium text-gray-700">"{title}"</span> has been submitted for approval.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          A copy has been sent to the admin for review. You'll be notified once it's approved or rejected.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function FundRequestsPage() {
  const profile = useAuthStore(s => s.profile);
  const [requests, setRequests]     = useState<FundRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<ReqStatus | 'all'>('all');
  const [search, setSearch]         = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 8;
  const [loadAll, setLoadAll] = useState(false);

  // form state
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [items, setItems]       = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [invoiceUrl, setInvoiceUrl]   = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [uploading, setUploading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (profile) loadRequests(); }, [profile, tab]);
  useEffect(() => { setPage(1); }, [search, tab]);

  const pageSize = loadAll ? filtered.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  async function loadRequests() {
    setLoading(true);
    try {
      let q = supabase
        .from('fund_requests')
        .select('id,title,description,total_amount,status,priority,created_at,invoice_url,fund_request_items(id,description,quantity,unit_cost)')
        .order('created_at', { ascending: false });
      if (tab !== 'all') q = q.eq('status', tab);
      const { data } = await q;
      setRequests((data ?? []) as FundRequest[]);
    } catch {}
    setLoading(false);
  }

  function resetForm() {
    setTitle(''); setDesc(''); setPriority('medium');
    setItems([{ ...EMPTY_ITEM }]);
    setInvoiceUrl(''); setInvoiceName('');
    setSubmitError('');
  }

  function openModal() { resetForm(); setModalOpen(true); }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [field]: field === 'description' ? value : Number(value) } : item
    ));
  }

  const lineTotal = items.reduce((s, it) => s + it.quantity * it.unit_cost, 0);

  async function handleUploadInvoice(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `invoices/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('cropguard-avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('cropguard-avatars').getPublicUrl(path);
      setInvoiceUrl(data.publicUrl);
      setInvoiceName(file.name);
    }
    setUploading(false);
  }

  async function handleSubmitDraft(publish: boolean) {
    if (!title.trim()) return;
    if (!profile?.organisation_id) { setSubmitError('No organisation found. Please contact support.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data: req, error } = await supabase
        .from('fund_requests')
        .insert({
          organisation_id: profile.organisation_id,
          requested_by: profile.id,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status: publish ? 'pending' : 'draft',
          total_amount: lineTotal,
          currency: 'GHS',
          invoice_url: invoiceUrl || null,
        })
        .select('id')
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!req) throw new Error('Failed to create request. Check your permissions.');

      const validItems = items.filter(it => it.description.trim());
      if (validItems.length > 0) {
        const { error: itemErr } = await supabase.from('fund_request_items').insert(
          validItems.map(it => ({
            request_id: req.id,
            description: it.description.trim(),
            quantity: it.quantity,
            unit_cost: it.unit_cost,
          }))
        );
        if (itemErr) throw new Error(itemErr.message);
      }

      setModalOpen(false);
      loadRequests();
      if (publish) {
        setSuccessTitle(title.trim());
      }
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  async function updateStatus(id: string, status: ReqStatus) {
    setActioningId(id);
    await supabase.from('fund_requests').update({ status }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setActioningId(null);
  }

  const filtered = requests.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      {/* Success modal */}
      {successTitle && (
        <SubmissionSuccess
          title={successTitle}
          onClose={() => { setSuccessTitle(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fund Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit and track requests for funds</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search requests..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No requests found</p>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {filtered.slice((page - 1) * pageSize, page * pageSize).map(req => {
            const cfg = STATUS_CONFIG[req.status];
            const StatusIcon = cfg.icon;
            const expanded   = expandedId === req.id;
            const lineItems  = req.fund_request_items ?? [];

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : req.id)}
                >
                  <div className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_CONFIG[req.priority]?.dot ?? 'bg-gray-400')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{req.title}</p>
                      {req.invoice_url && (
                        <Paperclip className="w-3 h-3 text-gray-400 shrink-0" title="Has invoice attachment" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(req.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {req.description && <> · {req.description.slice(0, 60)}{req.description.length > 60 ? '…' : ''}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-900">{fmt(req.total_amount)}</span>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.color)}>
                      <StatusIcon className="w-2.5 h-2.5" />{cfg.label}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {lineItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</p>
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Description</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Qty</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Unit Cost</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {lineItems.map((it, i) => (
                                <tr key={it.id ?? i}>
                                  <td className="px-4 py-2.5 text-gray-700">{it.description}</td>
                                  <td className="px-4 py-2.5 text-gray-600 text-right">{it.quantity}</td>
                                  <td className="px-4 py-2.5 text-gray-600 text-right">{fmt(it.unit_cost)}</td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900 text-right">{fmt(it.quantity * it.unit_cost)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right">Total</td>
                                <td className="px-4 py-2.5 font-bold text-gray-900 text-right">{fmt(req.total_amount)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Invoice attachment */}
                    {req.invoice_url && (
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                        <a
                          href={req.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                        >
                          View Invoice / Attachment
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end flex-wrap">
                      {req.status === 'draft' && (
                        <button
                          disabled={actioningId === req.id}
                          onClick={() => updateStatus(req.id, 'pending')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" /> Submit for Approval
                        </button>
                      )}
                      {req.status === 'pending' && (
                        <>
                          <button
                            disabled={actioningId === req.id}
                            onClick={() => updateStatus(req.id, 'rejected')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                          <button
                            disabled={actioningId === req.id}
                            onClick={() => updateStatus(req.id, 'approved')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          disabled={actioningId === req.id}
                          onClick={() => updateStatus(req.id, 'paid')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                        >
                          <DollarSign className="w-3 h-3" /> Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </>
      )}

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Fund Request</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Error */}
              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {submitError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Office supplies for Q3"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  rows={2}
                  placeholder="Optional details about this request..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="flex gap-2">
                  {(['low','medium','high','urgent'] as Priority[]).map(p => (
                    <button
                      key={p} onClick={() => setPriority(p)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-colors',
                        priority === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', PRIORITY_CONFIG[p].dot)} />
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Line Items</label>
                  <button onClick={addItem} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={it.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <input
                        type="number" min="1"
                        value={it.quantity}
                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <input
                        type="number" min="0" step="0.01"
                        value={it.unit_cost || ''}
                        onChange={e => updateItem(i, 'unit_cost', e.target.value)}
                        placeholder="Unit cost"
                        className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <span className="text-sm font-semibold text-gray-700 w-24 text-right">
                        {fmt(it.quantity * it.unit_cost)}
                      </span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm">
                    <span className="text-gray-500">Total: </span>
                    <span className="font-bold text-gray-900">{fmt(lineTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Invoice upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice / Supporting Document</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={handleUploadInvoice}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2.5 border-2 border-dashed rounded-xl py-4 text-sm transition-colors',
                    invoiceUrl
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600'
                  )}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  ) : invoiceUrl ? (
                    <><Paperclip className="w-4 h-4" /> {invoiceName} — tap to replace</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload invoice or receipt (PDF, image, doc)</>
                  )}
                </button>
                {invoiceUrl && (
                  <div className="flex items-center justify-between mt-1.5">
                    <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:underline">Preview uploaded file</a>
                    <button
                      onClick={() => { setInvoiceUrl(''); setInvoiceName(''); }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >Remove</button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting || !title.trim() || uploading}
                onClick={() => handleSubmitDraft(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                disabled={submitting || !title.trim() || uploading}
                onClick={() => handleSubmitDraft(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
