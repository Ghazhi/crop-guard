import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, TrendingUp, Package, DollarSign, Trash2, Pencil } from 'lucide-react';
import type { CropType } from '@/types';
import { Pagination } from '../../components/ui/pagination';

interface OfftakeAgreement {
  id: string;
  buyer_name: string;
  buyer_contact: string | null;
  buyer_phone: string | null;
  crop: CropType;
  total_volume_kg: number;
  unit_price_per_kg: number;
  contract_value: number;
  agreement_date: string;
  delivery_start: string | null;
  delivery_end: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const CROPS: CropType[] = ['maize', 'soybean', 'rice', 'cocoa', 'yam', 'cassava'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const emptyForm = {
  buyer_name: '', buyer_contact: '', buyer_phone: '',
  crop: 'maize' as CropType, total_volume_kg: '', unit_price_per_kg: '',
  agreement_date: new Date().toISOString().slice(0, 10),
  delivery_start: '', delivery_end: '', notes: '',
};

export default function OfftakeAgreementsPage() {
  const [agreements, setAgreements] = useState<OfftakeAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfftakeAgreement | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  async function fetchAgreements() {
    setLoading(true);
    const { data } = await supabase
      .from('offtake_agreements')
      .select('*')
      .order('created_at', { ascending: false });
    setAgreements(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAgreements(); }, []);

  const contractValue = (Number(form.total_volume_kg) || 0) * (Number(form.unit_price_per_kg) || 0);

  async function handleSubmit() {
    const payload = {
      buyer_name: form.buyer_name,
      buyer_contact: form.buyer_contact || null,
      buyer_phone: form.buyer_phone || null,
      crop: form.crop,
      total_volume_kg: Number(form.total_volume_kg) || 0,
      unit_price_per_kg: Number(form.unit_price_per_kg) || 0,
      contract_value: contractValue,
      agreement_date: form.agreement_date,
      delivery_start: form.delivery_start || null,
      delivery_end: form.delivery_end || null,
      notes: form.notes || null,
    };
    if (editing) {
      await supabase.from('offtake_agreements').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('offtake_agreements').insert(payload);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
    fetchAgreements();
  }

  function startEdit(a: OfftakeAgreement) {
    setEditing(a);
    setForm({
      buyer_name: a.buyer_name, buyer_contact: a.buyer_contact ?? '', buyer_phone: a.buyer_phone ?? '',
      crop: a.crop, total_volume_kg: String(a.total_volume_kg), unit_price_per_kg: String(a.unit_price_per_kg),
      agreement_date: a.agreement_date.slice(0, 10),
      delivery_start: a.delivery_start?.slice(0, 10) ?? '', delivery_end: a.delivery_end?.slice(0, 10) ?? '',
      notes: a.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('offtake_agreements').update({ status }).eq('id', id);
    fetchAgreements();
  }

  async function handleDelete(id: string) {
    await supabase.from('offtake_agreements').delete().eq('id', id);
    fetchAgreements();
  }

  const totalValue = agreements.reduce((s, a) => s + Number(a.contract_value), 0);
  const activeCount = agreements.filter(a => a.status === 'active').length;
  const totalVolume = agreements.reduce((s, a) => s + Number(a.total_volume_kg), 0);
  const pageSize = loadAll ? agreements.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(agreements.length / pageSize));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offtake Agreements</h1>
          <p className="text-gray-500 mt-1">Manage buyer contracts for farmer produce</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ ...emptyForm }); }}>
              <Plus className="w-4 h-4 mr-2" /> New Agreement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Agreement' : 'New Offtake Agreement'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Buyer Name</Label>
                <Input value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} placeholder="e.g. Olam Ghana" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Buyer Contact Person</Label>
                  <Input value={form.buyer_contact} onChange={e => setForm({ ...form, buyer_contact: e.target.value })} placeholder="Contact name" />
                </div>
                <div>
                  <Label>Buyer Phone</Label>
                  <Input value={form.buyer_phone} onChange={e => setForm({ ...form, buyer_phone: e.target.value })} placeholder="Phone" />
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
                  <Label>Agreement Date</Label>
                  <Input type="date" value={form.agreement_date} onChange={e => setForm({ ...form, agreement_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total Volume (kg)</Label>
                  <Input type="number" value={form.total_volume_kg} onChange={e => setForm({ ...form, total_volume_kg: e.target.value })} />
                </div>
                <div>
                  <Label>Unit Price (GHS/kg)</Label>
                  <Input type="number" value={form.unit_price_per_kg} onChange={e => setForm({ ...form, unit_price_per_kg: e.target.value })} />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Contract Value</span>
                <span className="text-lg font-bold text-blue-900">GHS {contractValue.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Delivery Start</Label>
                  <Input type="date" value={form.delivery_start} onChange={e => setForm({ ...form, delivery_start: e.target.value })} />
                </div>
                <div>
                  <Label>Delivery End</Label>
                  <Input type="date" value={form.delivery_end} onChange={e => setForm({ ...form, delivery_end: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional terms..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.buyer_name}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Agreements', value: agreements.length, icon: FileText, color: 'text-gray-700' },
          { label: 'Active', value: activeCount, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Total Volume', value: `${totalVolume.toLocaleString()} kg`, icon: Package, color: 'text-blue-600' },
          { label: 'Total Value', value: `GHS ${totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600' },
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

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : agreements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">No offtake agreements yet. Create one to get started.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Buyer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Crop</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Volume (kg)</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Price/kg</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Delivery</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.slice((page - 1) * pageSize, page * pageSize).map(a => (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.buyer_name}</p>
                        {a.buyer_contact && <p className="text-xs text-gray-500">{a.buyer_contact}</p>}
                      </td>
                      <td className="px-4 py-3 capitalize">{a.crop}</td>
                      <td className="px-4 py-3 text-right">{Number(a.total_volume_kg).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">GHS {Number(a.unit_price_per_kg).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">GHS {Number(a.contract_value).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {a.delivery_start ? a.delivery_start.slice(0, 10) : '—'} → {a.delivery_end ? a.delivery_end.slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Select value={a.status} onValueChange={v => updateStatus(a.id, v)}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['draft', 'active', 'completed', 'cancelled'].map(s => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={agreements.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
