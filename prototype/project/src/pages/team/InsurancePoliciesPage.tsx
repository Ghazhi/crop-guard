import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, DollarSign, TrendingUp, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import type { CropType } from '@/types';
import { Pagination } from '../../components/ui/pagination';

interface Policy {
  id: string;
  farmer_id: string | null;
  policy_number: string;
  crop: CropType | null;
  coverage_amount: number;
  premium_amount: number;
  premium_paid: boolean;
  start_date: string | null;
  end_date: string | null;
  status: string;
  provider_name: string | null;
  notes: string | null;
  farmers: { full_name: string | null } | null;
}

interface Farmer {
  id: string;
  full_name: string;
}

const CROPS: CropType[] = ['maize', 'soybean', 'rice', 'cocoa', 'yam', 'cassava'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  claimed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const emptyForm = {
  farmer_id: '', policy_number: '', crop: 'maize' as CropType,
  coverage_amount: '', premium_amount: '', premium_paid: false,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '', status: 'draft', provider_name: '', notes: '',
};

export default function InsurancePoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  async function fetchAll() {
    setLoading(true);
    const [polRes, farmRes] = await Promise.all([
      supabase.from('insurance_policies').select('*, farmers(full_name)').order('created_at', { ascending: false }),
      supabase.from('farmers').select('id, full_name').order('full_name').limit(500),
    ]);
    setPolicies(polRes.data ?? []);
    setFarmers(farmRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleSubmit() {
    const payload = {
      farmer_id: form.farmer_id || null,
      policy_number: form.policy_number || `POL-${Date.now().toString().slice(-6)}`,
      crop: form.crop,
      coverage_amount: Number(form.coverage_amount) || 0,
      premium_amount: Number(form.premium_amount) || 0,
      premium_paid: form.premium_paid,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      provider_name: form.provider_name || null,
      notes: form.notes || null,
    };
    if (editing) {
      await supabase.from('insurance_policies').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('insurance_policies').insert(payload);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
    fetchAll();
  }

  function startEdit(p: Policy) {
    setEditing(p);
    setForm({
      farmer_id: p.farmer_id ?? '', policy_number: p.policy_number, crop: p.crop ?? 'maize',
      coverage_amount: String(p.coverage_amount), premium_amount: String(p.premium_amount),
      premium_paid: p.premium_paid, start_date: p.start_date ?? '', end_date: p.end_date ?? '',
      status: p.status, provider_name: p.provider_name ?? '', notes: p.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('insurance_policies').update({ status }).eq('id', id);
    fetchAll();
  }

  async function handleDelete(id: string) {
    await supabase.from('insurance_policies').delete().eq('id', id);
    fetchAll();
  }

  const totalCoverage = policies.reduce((s, p) => s + Number(p.coverage_amount), 0);
  const totalPremiums = policies.reduce((s, p) => s + Number(p.premium_amount), 0);
  const activeCount = policies.filter(p => p.status === 'active').length;
  const claimsCount = policies.filter(p => p.status === 'claimed').length;
  const pageSize = loadAll ? policies.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(policies.length / pageSize));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Policies</h1>
          <p className="text-gray-500 mt-1">Manage crop insurance coverage for farmers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ ...emptyForm }); }}>
              <Plus className="w-4 h-4 mr-2" /> New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit Policy' : 'New Insurance Policy'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Farmer</Label>
                <Select value={form.farmer_id} onValueChange={v => setForm({ ...form, farmer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
                  <SelectContent>
                    {farmers.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Policy Number</Label>
                  <Input value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} placeholder="Auto-generated" />
                </div>
                <div>
                  <Label>Provider</Label>
                  <Input value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} placeholder="Insurance company" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Crop</Label>
                  <Select value={form.crop} onValueChange={v => setForm({ ...form, crop: v as CropType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CROPS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['draft', 'active', 'expired', 'claimed', 'cancelled'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Coverage Amount (GHS)</Label>
                  <Input type="number" value={form.coverage_amount} onChange={e => setForm({ ...form, coverage_amount: e.target.value })} />
                </div>
                <div>
                  <Label>Premium (GHS)</Label>
                  <Input type="number" value={form.premium_amount} onChange={e => setForm({ ...form, premium_amount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="premium_paid" checked={form.premium_paid} onChange={e => setForm({ ...form, premium_paid: e.target.checked })} className="w-4 h-4" />
                <Label htmlFor="premium_paid">Premium Paid</Label>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.coverage_amount}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Policies', value: policies.length, icon: Shield, color: 'text-gray-700' },
          { label: 'Active', value: activeCount, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Total Coverage', value: `GHS ${totalCoverage.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
          { label: 'Claims Filed', value: claimsCount, icon: AlertTriangle, color: 'text-amber-600' },
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
      ) : policies.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">No insurance policies yet. Create one to get started.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Policy #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Farmer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Crop</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Coverage</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Premium</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.slice((page - 1) * pageSize, page * pageSize).map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{p.policy_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.farmers?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 capitalize">{p.crop ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.provider_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">GHS {Number(p.coverage_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        GHS {Number(p.premium_amount).toLocaleString()}
                        {p.premium_paid ? <span className="ml-1 text-emerald-600 text-xs">✓</span> : <span className="ml-1 text-amber-600 text-xs">unpaid</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.start_date?.slice(0,10)} → {p.end_date?.slice(0,10)}</td>
                      <td className="px-4 py-3">
                        <Select value={p.status} onValueChange={v => updateStatus(p.id, v)}>
                          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['draft', 'active', 'expired', 'claimed', 'cancelled'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={policies.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
