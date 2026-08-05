import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, Loader2, X, Search, Truck,
  Sprout, MapPin, Filter, Download, Users, Landmark,
  CheckCircle, AlertCircle, FileText, TrendingUp, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { CocoaTraceabilityRecord } from '@/types/database';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';

interface CoopLite { id: string; name: string; }
interface FarmerLite { id: string; full_name: string; cooperative_id: string | null; }
interface FarmLite { id: string; name: string; farmer_id: string; }

interface TraceRow extends CocoaTraceabilityRecord {
  farmer_name?: string | null;
  coop_name?: string | null;
  farm_name?: string | null;
}

export default function TraceabilityPage() {
  const { profile } = useAuthStore();
  const orgId = profile?.organisation_id ?? '';
  const role = profile?.role ?? '';
  const canEdit = ['staff', 'admin', 'super_admin', 'agent'].includes(role);

  const [items, setItems] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsOpen, setStatsOpen] = useState(() => localStorage.getItem('trace_stats_open') === 'true');
  const toggleStats = () => setStatsOpen(o => { const n = !o; localStorage.setItem('trace_stats_open', String(n)); return n; });
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [coopFilter, setCoopFilter] = useState('all');
  const [page, setPage] = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [coops, setCoops] = useState<CoopLite[]>([]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cocoa_traceability_records') // table name unchanged; generic UI
      .select(`
        id, organisation_id, farmer_id, farm_id, cooperative_id, harvest_date,
        batch_weight_kg, fermentation_confirmed, drying_confirmed, drying_moisture_pct,
        lbc_receipt_number, cocobod_producer_price, premium_paid, sale_date, season,
        created_at, updated_at,
        farmers ( full_name ),
        cooperatives ( name ),
        farm_details ( name )
      `)
      .eq('organisation_id', orgId)
      .order('harvest_date', { ascending: false });
    if (error) { console.error('traceability load', error); }
    const rows = (data ?? []) as unknown as Array<CocoaTraceabilityRecord & {
      farmers: { full_name: string } | null;
      cooperatives: { name: string } | null;
      farm_details: { name: string } | null;
    }>;
    setItems(rows.map(r => ({
      ...r,
      farmer_name: r.farmers?.full_name ?? null,
      coop_name: r.cooperatives?.name ?? null,
      farm_name: r.farm_details?.name ?? null,
    })));
    setLoading(false);
  }, [orgId]);

  const loadCoops = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase.from('cooperatives').select('id, name').eq('organisation_id', orgId).order('name');
    setCoops((data as CoopLite[]) ?? []);
  }, [orgId]);

  useEffect(() => { load(); loadCoops(); }, [load, loadCoops]);

  const seasons = useMemo(() => {
    const s = new Set(items.map(i => i.season).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let f = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(i =>
        (i.lbc_receipt_number ?? '').toLowerCase().includes(q) ||
        (i.farmer_name ?? '').toLowerCase().includes(q) ||
        (i.coop_name ?? '').toLowerCase().includes(q) ||
        (i.season ?? '').toLowerCase().includes(q)
      );
    }
    if (seasonFilter !== 'all') f = f.filter(i => i.season === seasonFilter);
    if (coopFilter !== 'all') f = f.filter(i => i.cooperative_id === coopFilter);
    return f;
  }, [items, search, seasonFilter, coopFilter]);

  const pageSize = loadAll ? filtered.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedFiltered = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalWeight = filtered.reduce((a, i) => a + Number(i.batch_weight_kg), 0);
  const totalPremium = filtered.reduce((a, i) => a + Number(i.premium_paid ?? 0), 0);
  const fermentedCount = filtered.filter(i => i.fermentation_confirmed).length;
  const driedCount = filtered.filter(i => i.drying_confirmed).length;
  const linkedFarmers = new Set(filtered.map(i => i.farmer_id).filter(Boolean)).size;
  const linkedCoops = new Set(filtered.map(i => i.cooperative_id).filter(Boolean)).size;

  async function del(id: string) {
    await supabase.from('cocoa_traceability_records').delete().eq('id', id);
    load();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cropguard-forest rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Crop Traceability</h1>
          <p className="text-sm text-gray-500">Track produce batches from farm to sale — supports traceability and sustainability compliance</p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <button
          onClick={toggleStats}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', statsOpen ? '' : '-rotate-90')} />
          Statistics
        </button>
        {statsOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TraceStat icon={Truck} label="Batches" value={String(filtered.length)} />
            <TraceStat icon={Download} label="Total Weight (kg)" value={totalWeight.toLocaleString('en-GH')} />
            <TraceStat icon={TrendingUp} label="Total Premium (GHS)" value={totalPremium.toLocaleString('en-GH', { minimumFractionDigits: 2 })} />
            <TraceStat icon={Users} label="Linked Farmers" value={String(linkedFarmers)} />
            <TraceStat icon={Landmark} label="Linked Cooperatives" value={String(linkedCoops)} />
            <TraceStat icon={CheckCircle} label="Fermented" value={`${fermentedCount}/${filtered.length}`} />
            <TraceStat icon={CheckCircle} label="Dried" value={`${driedCount}/${filtered.length}`} />
            <TraceStat icon={FileText} label="Receipts" value={String(filtered.filter(i => i.lbc_receipt_number).length)} />
          </div>
        )}
      </div>

      {/* Module links info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How Traceability Links to Other Modules</p>
            <ul className="space-y-0.5 text-xs text-blue-700">
              <li><strong>Farmers & Farms:</strong> Each batch is linked to a specific farmer and farm, connecting to the Registry module for farmer details and farm sizes.</li>
              <li><strong>Cooperatives:</strong> Batches are tied to cooperatives, linking to the Governance module for member rosters and compliance records.</li>
              <li><strong>Offtake Agreements:</strong> Receipt numbers and producer prices connect to the Credits module's offtake agreement tracking.</li>
              <li><strong>Sustainability Attestations:</strong> Fermentation and drying confirmation feed into the sustainability attestation workflow.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by receipt, farmer, cooperative, or season..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <Select value={seasonFilter} onValueChange={(v) => { setSeasonFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9 text-sm"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={coopFilter} onValueChange={(v) => { setCoopFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 text-sm"><Landmark className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cooperatives</SelectItem>
            {coops.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {canEdit && <Button onClick={() => setShowForm(true)} className="h-9 gap-1.5"><Plus className="w-4 h-4" /> Add Batch</Button>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No batches recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Harvest Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Farmer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cooperative</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Farm</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ferm.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dried</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">LBC Receipt</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Premium</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Season</th>
                  {canEdit && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedFiltered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(r.harvest_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-gray-700">{r.farmer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{r.coop_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.farm_name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{Number(r.batch_weight_kg).toLocaleString('en-GH')}</td>
                    <td className="px-4 py-3">{r.fermentation_confirmed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-300" />}</td>
                    <td className="px-4 py-3">
                      {r.drying_confirmed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-300" />}
                      {r.drying_moisture_pct != null && <span className="text-xs text-gray-400 ml-1">{r.drying_moisture_pct}%</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.lbc_receipt_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.premium_paid != null ? `GHS ${r.premium_paid}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.season ?? '—'}</td>
                    {canEdit && <td className="px-4 py-3"><button onClick={() => del(r.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
        </div>
      )}

      {showForm && <AddBatchForm orgId={orgId} coops={coops} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function TraceStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-cropguard-forest/10 rounded-lg flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-cropguard-forest" /></div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AddBatchForm({ orgId, coops, onClose, onSaved }: {
  orgId: string;
  coops: CoopLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [coopId, setCoopId] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [farmers, setFarmers] = useState<FarmerLite[]>([]);
  const [farms, setFarms] = useState<FarmLite[]>([]);
  const [harvestDate, setHarvestDate] = useState('');
  const [weight, setWeight] = useState('');
  const [fermentation, setFermentation] = useState(false);
  const [drying, setDrying] = useState(false);
  const [moisture, setMoisture] = useState('');
  const [receipt, setReceipt] = useState('');
  const [producerPrice, setProducerPrice] = useState('');
  const [premium, setPremium] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [season, setSeason] = useState('');
  const [saving, setSaving] = useState(false);

  // Load farmers when cooperative changes
  useEffect(() => {
    if (!coopId) { setFarmers([]); return; }
    supabase.from('farmers').select('id, full_name, cooperative_id').eq('cooperative_id', coopId).order('full_name').limit(200)
      .then(({ data }) => setFarmers((data as FarmerLite[]) ?? []));
  }, [coopId]);

  // Load farms when farmer changes
  useEffect(() => {
    if (!farmerId) { setFarms([]); return; }
    supabase.from('farm_details').select('id, name, farmer_id').eq('farmer_id', farmerId).order('name')
      .then(({ data }) => setFarms((data as FarmLite[]) ?? []));
  }, [farmerId]);

  async function save() {
    setSaving(true);
    await supabase.from('cocoa_traceability_records').insert({
      organisation_id: orgId,
      cooperative_id: coopId || null,
      farmer_id: farmerId || null,
      farm_id: farmId || null,
      harvest_date: harvestDate,
      batch_weight_kg: Number(weight),
      fermentation_confirmed: fermentation,
      drying_confirmed: drying,
      drying_moisture_pct: moisture ? Number(moisture) : null,
      lbc_receipt_number: receipt || null,
      cocobod_producer_price: producerPrice ? Number(producerPrice) : null,
      premium_paid: premium ? Number(premium) : null,
      sale_date: saleDate || null,
      season: season || null,
    });
    setSaving(false); onSaved();
  }

  return (
    <Drawer open={true} onClose={onClose} title="Add Cocoa Batch">
      <div className="space-y-3">
        {/* Module links */}
        <div>
          <Label className="text-xs">Cooperative <span className="text-gray-400">(Governance link)</span></Label>
          <Select value={coopId} onValueChange={(v) => { setCoopId(v); setFarmerId(''); setFarmId(''); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select cooperative" /></SelectTrigger>
            <SelectContent>
              {coops.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Farmer <span className="text-gray-400">(Registry link)</span></Label>
          <Select value={farmerId} onValueChange={(v) => { setFarmerId(v); setFarmId(''); }} disabled={!coopId}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={coopId ? 'Select farmer' : 'Select cooperative first'} /></SelectTrigger>
            <SelectContent>
              {farmers.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Farm <span className="text-gray-400">(Registry link)</span></Label>
          <Select value={farmId} onValueChange={setFarmId} disabled={!farmerId}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={farmerId ? 'Select farm' : 'Select farmer first'} /></SelectTrigger>
            <SelectContent>
              {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-100 pt-3" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Harvest Date</Label>
            <Input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Batch Weight (kg)</Label>
            <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Drying Moisture (%)</Label>
            <Input type="number" step="0.1" value={moisture} onChange={e => setMoisture(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">LBC Receipt #</Label>
            <Input value={receipt} onChange={e => setReceipt(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Producer Price (GHS/ton)</Label>
            <Input type="number" value={producerPrice} onChange={e => setProducerPrice(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Premium (GHS)</Label>
            <Input type="number" value={premium} onChange={e => setPremium(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Sale Date</Label>
            <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Season</Label>
            <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2025/2026" className="h-9 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fermentation} onChange={e => setFermentation(e.target.checked)} className="rounded" />
            Fermentation confirmed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={drying} onChange={e => setDrying(e.target.checked)} className="rounded" />
            Drying confirmed
          </label>
        </div>
        <Button onClick={save} disabled={saving || !harvestDate || !weight} className="w-full h-9 text-sm gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Batch
        </Button>
      </div>
    </Drawer>
  );
}
