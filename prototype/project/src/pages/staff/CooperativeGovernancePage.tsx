import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Loader2, X, Search, Users,
  FileText, Gavel, Wallet, ShieldCheck, Calendar,
  Landmark, Award, AlertCircle, CheckCircle, Clock,
  ChevronRight, ChevronDown, Filter, Sparkles, BarChart3, Download,
  TrendingUp, TrendingDown, Lightbulb, Target, ClipboardList,
  ArrowLeft, ArrowUp, ArrowDown, UserCheck, Upload, MapPin,
  ChevronLeft, ChevronRight as ChevronRightIcon, GripVertical, FilePlus,
  GraduationCap, Video, MapPinned, Link2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast, extractError, extractFetchError } from '@/components/ui/toast';
import type {
  CooperativeOfficer,
  CooperativeMeeting,
  CooperativeResolution,
  CooperativeDocument,
  CooperativeFund,
  CooperativeCompliance,
  FboRegistration,
  CocobodLicense,
} from '@/types/database';

// ── Constants ─────────────────────────────────────────────────────────────────

const OFFICER_ROLES = [
  { value: 'chairman',         label: 'Chairperson' },
  { value: 'vice_chairman',   label: 'Vice Chairperson' },
  { value: 'secretary',        label: 'Secretary' },
  { value: 'treasurer',        label: 'Treasurer' },
  { value: 'executive_member', label: 'Executive Member' },
];

const MEETING_TYPES = [
  { value: 'agm',     label: 'Annual General Meeting' },
  { value: 'general', label: 'General Meeting' },
  { value: 'board',   label: 'Board / Executive Meeting' },
];

const VOTE_OUTCOMES = [
  { value: 'pending',   label: 'Pending' },
  { value: 'passed',    label: 'Passed' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'deferred',  label: 'Deferred' },
];

const IMPLEMENTATION_STATUSES = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'abandoned',   label: 'Abandoned' },
];

const DOCUMENT_TYPES = [
  { value: 'bylaws',            label: 'Bylaws' },
  { value: 'constitution',      label: 'Constitution' },
  { value: 'registration_cert', label: 'Registration Certificate' },
  { value: 'compliance_cert',   label: 'Compliance Certificate' },
  { value: 'other',             label: 'Other' },
];

const FUND_TYPES = [
  { value: 'contribution',      label: 'Member Contribution' },
  { value: 'savings',           label: 'Savings Deposit' },
  { value: 'loan_disbursement', label: 'Loan Disbursement' },
  { value: 'repayment',         label: 'Loan Repayment' },
];

const PAYMENT_MODES = [
  { value: 'momo', label: 'Mobile Money (MoMo)' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
];

const CERTIFICATION_TYPES = [
  { value: 'fbo_registration',  label: 'FBO Registration (Dept. of Cooperatives)' },
  { value: 'cocobod_license',   label: 'COCOBOD License' },
  { value: 'fairtrade',         label: 'Fairtrade Certification' },
  { value: 'organic',           label: 'Organic Certification' },
  { value: 'utz_ra',            label: 'UTZ / Rainforest Alliance' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Cooperative {
  id:              string;
  name:            string;
  community_id:    string | null;
  member_count:    number;
  primary_crops:   string[];
  chairman_name:   string | null;
  secretary_name:  string | null;
  created_at:      string;
  sort_order:      number;
  community_name:  string | null;
  region_code:     string | null;
  region:          string | null;
  district:        string | null;
}

type PageTab = 'cooperative' | 'governance' | 'insights' | 'reports';
type GovTab = 'leadership' | 'meetings' | 'training' | 'resolutions' | 'compliance' | 'funds' | 'documents';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function complianceBadge(status: string, expiryDate: string | null) {
  if (status === 'expired') return { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (status === 'pending_renewal') return { label: 'Pending Renewal', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  const days = daysUntil(expiryDate);
  if (days != null && days < 0) return { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (days != null && days <= 90) return { label: `Expires in ${days}d`, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CooperativeGovernancePage() {
  const { profile } = useAuthStore();
  const toast = useToast();
  const orgId = profile?.organisation_id ?? '';
  const role = profile?.role ?? '';
  const canEdit = ['staff', 'admin', 'super_admin'].includes(role);

  const [pageTab, setPageTab] = useState<PageTab>('cooperative');
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCoop, setSelectedCoop] = useState<Cooperative | null>(null);
  const [regionFilter, setRegionFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [coopPage, setCoopPage] = useState(0);
  const COOPS_PER_PAGE = 8;

  const loadCooperatives = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cooperatives')
      .select(`
        id, name, community_id, member_count, primary_crops, chairman_name, secretary_name, created_at, sort_order,
        communities ( name, region_code, region, district )
      `)
      .eq('organisation_id', orgId)
      .order('sort_order', { ascending: true })
      .order('name');
    if (error) { console.error('loadCooperatives', error); }
    const rows = (data ?? []) as (Cooperative & { communities: { name: string; region_code: string; region: string | null; district: string } | null })[];
    setCooperatives(rows.map(r => ({
      ...r,
      community_name: r.communities?.name ?? null,
      region_code: r.communities?.region_code ?? null,
      region: r.communities?.region ?? null,
      district: r.communities?.district ?? null,
    })));
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadCooperatives(); }, [loadCooperatives]);

  const filtered = useMemo(() => {
    let result = cooperatives;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    if (regionFilter !== 'all') {
      result = result.filter(c => (c.region_code ?? '') === regionFilter);
    }
    if (communityFilter !== 'all') {
      result = result.filter(c => c.community_id === communityFilter);
    }
    return result;
  }, [cooperatives, search, regionFilter, communityFilter]);

  const regions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const c of cooperatives) {
      if (c.region_code && !map.has(c.region_code)) {
        map.set(c.region_code, { code: c.region_code, name: c.region ?? c.region_code });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cooperatives]);

  const communities = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const c of cooperatives) {
      if (c.community_id && c.community_name && !map.has(c.community_id)) {
        map.set(c.community_id, { id: c.community_id, name: c.community_name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cooperatives]);

  const pagedCoops = useMemo(() => {
    const start = coopPage * COOPS_PER_PAGE;
    return filtered.slice(start, start + COOPS_PER_PAGE);
  }, [filtered, coopPage]);

  const totalPages = Math.ceil(filtered.length / COOPS_PER_PAGE);

  async function moveCoop(coop: Cooperative, dir: -1 | 1) {
    const idx = cooperatives.findIndex(c => c.id === coop.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= cooperatives.length) return;
    const swap = cooperatives[swapIdx];
    const updates = [
      { id: coop.id, sort_order: swap.sort_order },
      { id: swap.id, sort_order: coop.sort_order },
    ];
    const newCoops = [...cooperatives];
    [newCoops[idx], newCoops[swapIdx]] = [newCoops[swapIdx], newCoops[idx]];
    const oldOrderA = newCoops[idx].sort_order;
    const oldOrderB = newCoops[swapIdx].sort_order;
    newCoops[idx].sort_order = oldOrderB;
    newCoops[swapIdx].sort_order = oldOrderA;
    setCooperatives(newCoops);
    await Promise.all(updates.map(u => supabase.from('cooperatives').update({ sort_order: u.sort_order }).eq('id', u.id)));
  }

  async function reorderCoops(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const draggedIdx = cooperatives.findIndex(c => c.id === draggedId);
    const targetIdx = cooperatives.findIndex(c => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const newCoops = [...cooperatives];
    const [dragged] = newCoops.splice(draggedIdx, 1);
    newCoops.splice(targetIdx, 0, dragged);
    const updates = newCoops
      .map((c, i) => ({ id: c.id, sort_order: i, old_sort_order: c.sort_order }))
      .filter(u => u.sort_order !== u.old_sort_order);
    newCoops.forEach((c, i) => { c.sort_order = i; });
    setCooperatives(newCoops);
    await Promise.all(updates.map(u => supabase.from('cooperatives').update({ sort_order: u.sort_order }).eq('id', u.id)));
  }

  const totalMembers = cooperatives.reduce((a, c) => a + (c.member_count ?? 0), 0);
  const [statsOpen, setStatsOpen] = useState(() => localStorage.getItem('gov_stats_open') === 'true');
  const toggleStats = () => setStatsOpen(o => { const n = !o; localStorage.setItem('gov_stats_open', String(n)); return n; });

  const PAGE_TABS: { key: PageTab; label: string; icon: React.ElementType }[] = [
    { key: 'cooperative', label: 'Cooperative', icon: Landmark },
    { key: 'governance',   label: 'Governance',   icon: Gavel },
    { key: 'insights',     label: 'Insights',     icon: Sparkles },
    { key: 'reports',      label: 'Reports',      icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cropguard-forest rounded-xl flex items-center justify-center">
          <Landmark className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cooperative Governance</h1>
          <p className="text-sm text-gray-500">Manage cooperatives, governance, AI insights, and reports</p>
        </div>
      </div>

      {/* Summary cards */}
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
            <SummaryCard icon={Users}       label="Cooperatives" value={cooperatives.length} />
            <SummaryCard icon={Users}       label="Total Members" value={totalMembers} />
            <SummaryCard icon={ShieldCheck} label="Active Certs" value="—" />
            <SummaryCard icon={Gavel}        label="Resolutions" value="—" />
          </div>
        )}
      </div>

      {/* Page-level tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto w-fit">
        {PAGE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setPageTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              pageTab === t.key ? 'bg-white text-cropguard-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {pageTab === 'cooperative' && (
        <CooperativeTab
          cooperatives={pagedCoops}
          loading={loading}
          search={search}
          setSearch={setSearch}
          selectedCoop={selectedCoop}
          setSelectedCoop={setSelectedCoop}
          canEdit={canEdit}
          orgId={orgId}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          communityFilter={communityFilter}
          setCommunityFilter={setCommunityFilter}
          regions={regions}
          communities={communities}
          coopPage={coopPage}
          setCoopPage={setCoopPage}
          totalPages={totalPages}
          totalCoops={filtered.length}
          canReorder={canEdit}
          onMoveCoop={moveCoop}
          onReorderCoops={reorderCoops}
        />
      )}
      {pageTab === 'governance' && (
        <GovernanceTab
          cooperatives={pagedCoops}
          loading={loading}
          search={search}
          setSearch={setSearch}
          selectedCoop={selectedCoop}
          setSelectedCoop={setSelectedCoop}
          canEdit={canEdit}
          orgId={orgId}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          communityFilter={communityFilter}
          setCommunityFilter={setCommunityFilter}
          regions={regions}
          communities={communities}
          coopPage={coopPage}
          setCoopPage={setCoopPage}
          totalPages={totalPages}
          totalCoops={filtered.length}
          canReorder={canEdit}
          onMoveCoop={moveCoop}
          onReorderCoops={reorderCoops}
        />
      )}
      {pageTab === 'insights' && (
        <InsightsTab
          cooperatives={pagedCoops}
          loading={loading}
          search={search}
          setSearch={setSearch}
          selectedCoop={selectedCoop}
          setSelectedCoop={setSelectedCoop}
          orgId={orgId}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          communityFilter={communityFilter}
          setCommunityFilter={setCommunityFilter}
          regions={regions}
          communities={communities}
          coopPage={coopPage}
          setCoopPage={setCoopPage}
          totalPages={totalPages}
          totalCoops={filtered.length}
          canReorder={canEdit}
          onMoveCoop={moveCoop}
          onReorderCoops={reorderCoops}
        />
      )}
      {pageTab === 'reports' && (
        <ReportsTab
          cooperatives={pagedCoops}
          loading={loading}
          search={search}
          setSearch={setSearch}
          selectedCoop={selectedCoop}
          setSelectedCoop={setSelectedCoop}
          orgId={orgId}
          canEdit={canEdit}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          communityFilter={communityFilter}
          setCommunityFilter={setCommunityFilter}
          regions={regions}
          communities={communities}
          coopPage={coopPage}
          setCoopPage={setCoopPage}
          totalPages={totalPages}
          totalCoops={filtered.length}
          canReorder={canEdit}
          onMoveCoop={moveCoop}
          onReorderCoops={reorderCoops}
        />
      )}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-cropguard-forest/10 rounded-lg flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-cropguard-forest" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ── Shared: Coop List Sidebar ──────────────────────────────────────────────────

interface SidebarProps {
  cooperatives: Cooperative[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  selectedCoop: Cooperative | null;
  setSelectedCoop: (c: Cooperative | null) => void;
  regionFilter: string;
  setRegionFilter: (v: string) => void;
  communityFilter: string;
  setCommunityFilter: (v: string) => void;
  regions: { code: string; name: string }[];
  communities: { id: string; name: string }[];
  coopPage: number;
  setCoopPage: (n: number) => void;
  totalPages: number;
  totalCoops: number;
  canReorder: boolean;
  onMoveCoop: (coop: Cooperative, dir: -1 | 1) => void;
  onReorderCoops: (draggedId: string, targetId: string) => void;
}

function CoopListSidebar({
  cooperatives, loading, search, setSearch, selectedCoop, setSelectedCoop,
  regionFilter, setRegionFilter, communityFilter, setCommunityFilter,
  regions, communities, coopPage, setCoopPage, totalPages, totalCoops,
  canReorder, onMoveCoop, onReorderCoops,
}: SidebarProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  return (
    <div className="lg:col-span-1 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search cooperatives..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Region & Community filters */}
      <div className="flex gap-2">
        <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setCommunityFilter('all'); setCoopPage(0); }}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map(r => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={communityFilter} onValueChange={(v) => { setCommunityFilter(v); setCoopPage(0); }}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Community" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Communities</SelectItem>
            {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(regionFilter !== 'all' || communityFilter !== 'all') && (
        <button
          onClick={() => { setRegionFilter('all'); setCommunityFilter('all'); setCoopPage(0); }}
          className="text-xs text-cropguard-forest hover:underline flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear filters
        </button>
      )}

      <p className="text-xs text-gray-400">{totalCoops} cooperative{totalCoops !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : cooperatives.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No cooperatives found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {cooperatives.map((coop, idx) => (
              <div
                key={coop.id}
                draggable={canReorder}
                onDragStart={(e) => { if (!canReorder) return; setDraggedId(coop.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                onDragOver={(e) => { if (!canReorder || !draggedId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(coop.id); }}
                onDrop={(e) => { if (!canReorder || !draggedId) return; e.preventDefault(); if (draggedId !== coop.id) onReorderCoops(draggedId, coop.id); setDraggedId(null); setDragOverId(null); }}
                className={cn(
                  'group bg-white rounded-xl border p-3 transition-all relative',
                  selectedCoop?.id === coop.id
                    ? 'border-cropguard-mint shadow-md ring-1 ring-cropguard-mint/30'
                    : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200',
                  canReorder && 'cursor-grab active:cursor-grabbing',
                  draggedId === coop.id && 'opacity-40',
                  dragOverId === coop.id && draggedId && draggedId !== coop.id && 'border-cropguard-mint ring-2 ring-cropguard-mint/40 scale-[1.02]'
                )}
              >
                {canReorder && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" title="Drag to reorder">
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 hover:text-cropguard-forest" />
                  </div>
                )}
                {canReorder && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveCoop(coop, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-300 hover:text-cropguard-forest disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3 h-3 rotate-90" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveCoop(coop, 1); }}
                      disabled={idx === cooperatives.length - 1}
                      className="p-0.5 text-gray-300 hover:text-cropguard-forest disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3 h-3 -rotate-90" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setSelectedCoop(coop)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                      <Landmark className="w-3.5 h-3.5 text-cropguard-forest" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm truncate pr-6">{coop.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{coop.member_count ?? 0}</span>
                    {coop.primary_crops?.length > 0 && <span>{coop.primary_crops.slice(0, 2).join(', ')}</span>}
                    {coop.community_name && (
                      <span className="flex items-center gap-0.5 text-gray-400">
                        <MapPin className="w-2.5 h-2.5" />{coop.community_name}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCoopPage(Math.max(0, coopPage - 1))}
                disabled={coopPage === 0}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-cropguard-forest disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-xs text-gray-400">Page {coopPage + 1} of {totalPages}</span>
              <button
                onClick={() => setCoopPage(Math.min(totalPages - 1, coopPage + 1))}
                disabled={coopPage >= totalPages - 1}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-cropguard-forest disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Cooperative Tab ───────────────────────────────────────────────────────────

function CooperativeTab({
  cooperatives, loading, search, setSearch, selectedCoop, setSelectedCoop, canEdit, orgId,
  regionFilter, setRegionFilter, communityFilter, setCommunityFilter, regions, communities,
  coopPage, setCoopPage, totalPages, totalCoops, canReorder, onMoveCoop, onReorderCoops,
}: SidebarProps & { canEdit: boolean; orgId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <CoopListSidebar
        cooperatives={cooperatives}
        loading={loading}
        search={search}
        setSearch={setSearch}
        selectedCoop={selectedCoop}
        setSelectedCoop={setSelectedCoop}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        communityFilter={communityFilter}
        setCommunityFilter={setCommunityFilter}
        regions={regions}
        communities={communities}
        coopPage={coopPage}
        setCoopPage={setCoopPage}
        totalPages={totalPages}
        totalCoops={totalCoops}
        canReorder={canReorder}
        onMoveCoop={onMoveCoop}
        onReorderCoops={onReorderCoops}
      />
      <div className="lg:col-span-2">
        {selectedCoop ? (
          <CooperativeDetail coop={selectedCoop} canEdit={canEdit} orgId={orgId} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
            <Landmark className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a cooperative to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cooperative Detail (Overview + Edit + Farmer List) ─────────────────────────

function CooperativeDetail({ coop, canEdit, orgId }: { coop: Cooperative; canEdit: boolean; orgId: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<CoopFarmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [liveMemberCount, setLiveMemberCount] = useState(coop.member_count ?? 0);
  const [officers, setOfficers] = useState<OfficerWithFarmer[]>([]);
  const [chairmanFarmerId, setChairmanFarmerId] = useState('');
  const [secretaryFarmerId, setSecretaryFarmerId] = useState('');

  useEffect(() => {
    setLiveMemberCount(coop.member_count ?? 0);
  }, [coop]);

  const loadFarmers = useCallback(async () => {
    setFarmersLoading(true);
    const { data } = await supabase
      .from('farmers')
      .select('id, full_name, phone, primary_crop, is_verified, current_fri_score, region_code, district')
      .eq('cooperative_id', coop.id)
      .order('full_name');
    const farmerData = (data as CoopFarmer[]) ?? [];
    setFarmers(farmerData);
    setLiveMemberCount(farmerData.length);
    setFarmersLoading(false);
  }, [coop.id]);

  const loadOfficers = useCallback(async () => {
    const { data } = await supabase
      .from('cooperative_officers')
      .select('*, farmer_id')
      .eq('cooperative_id', coop.id)
      .eq('is_active', true)
      .order('created_at');
    const officerRows = (data as CooperativeOfficer[]) ?? [];

    const farmerIds = officerRows.map(o => o.farmer_id).filter((id): id is string => id != null);
    let farmerMap: Record<string, { full_name: string; phone: string | null }> = {};
    if (farmerIds.length > 0) {
      const { data: farmersData } = await supabase
        .from('farmers')
        .select('id, full_name, phone')
        .in('id', farmerIds);
      for (const f of (farmersData ?? []) as { id: string; full_name: string; phone: string | null }[]) {
        farmerMap[f.id] = { full_name: f.full_name, phone: f.phone };
      }
    }

    const enriched: OfficerWithFarmer[] = officerRows.map(o => ({
      ...o,
      farmer_name: o.farmer_id ? farmerMap[o.farmer_id]?.full_name ?? o.full_name : o.full_name,
      farmer_phone: o.farmer_id ? farmerMap[o.farmer_id]?.phone ?? o.phone : o.phone,
    }));

    setOfficers(enriched);
    const chairman = enriched.find(o => o.role === 'chairman');
    const secretary = enriched.find(o => o.role === 'secretary');
    setChairmanFarmerId(chairman?.farmer_id ?? '');
    setSecretaryFarmerId(secretary?.farmer_id ?? '');
  }, [coop.id]);

  useEffect(() => { loadFarmers(); loadOfficers(); }, [loadFarmers, loadOfficers]);

  const assignedFarmerIds = new Set(
    officers.filter(o => o.is_active).map(o => o.farmer_id).filter((id): id is string => id != null)
  );

  function availableFarmers(currentId: string) {
    return farmers.filter(f => !assignedFarmerIds.has(f.id) || f.id === currentId);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const currentChairman = officers.find(o => o.role === 'chairman');
      const currentSecretary = officers.find(o => o.role === 'secretary');

      // Deactivate any other active officers holding these roles (excluding the current ones)
      const rolesToCheck: string[] = [];
      if (chairmanFarmerId) rolesToCheck.push('chairman');
      if (secretaryFarmerId) rolesToCheck.push('secretary');
      if (rolesToCheck.length > 0) {
        const excludeIds = [currentChairman?.id, currentSecretary?.id].filter((id): id is string => id != null);
        const { data: others } = await supabase
          .from('cooperative_officers')
          .select('id')
          .eq('cooperative_id', coop.id)
          .in('role', rolesToCheck)
          .eq('is_active', true);
        const otherIds = (others ?? [])
          .map((o: { id: string }) => o.id)
          .filter(id => !excludeIds.includes(id));
        if (otherIds.length > 0) {
          await supabase.from('cooperative_officers').update({ is_active: false }).in('id', otherIds);
        }
      }

      if (chairmanFarmerId) {
        const selectedFarmer = farmers.find(f => f.id === chairmanFarmerId);
        if (currentChairman) {
          await supabase.from('cooperative_officers').update({
            farmer_id: chairmanFarmerId,
            full_name: selectedFarmer?.full_name ?? null,
            phone: selectedFarmer?.phone ?? null,
            is_active: true,
          }).eq('id', currentChairman.id);
        } else {
          await supabase.from('cooperative_officers').insert({
            cooperative_id: coop.id,
            organisation_id: orgId,
            farmer_id: chairmanFarmerId,
            full_name: selectedFarmer?.full_name ?? null,
            phone: selectedFarmer?.phone ?? null,
            role: 'chairman',
            is_active: true,
          });
        }
      } else if (currentChairman) {
        await supabase.from('cooperative_officers').update({ is_active: false }).eq('id', currentChairman.id);
      }

      if (secretaryFarmerId) {
        const selectedFarmer = farmers.find(f => f.id === secretaryFarmerId);
        if (currentSecretary) {
          await supabase.from('cooperative_officers').update({
            farmer_id: secretaryFarmerId,
            full_name: selectedFarmer?.full_name ?? null,
            phone: selectedFarmer?.phone ?? null,
            is_active: true,
          }).eq('id', currentSecretary.id);
        } else {
          await supabase.from('cooperative_officers').insert({
            cooperative_id: coop.id,
            organisation_id: orgId,
            farmer_id: secretaryFarmerId,
            full_name: selectedFarmer?.full_name ?? null,
            phone: selectedFarmer?.phone ?? null,
            role: 'secretary',
            is_active: true,
          });
        }
      } else if (currentSecretary) {
        await supabase.from('cooperative_officers').update({ is_active: false }).eq('id', currentSecretary.id);
      }

      await loadOfficers();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  const liveChairman = officers.find(o => o.role === 'chairman' && o.is_active)?.farmer_name ?? '';
  const liveSecretary = officers.find(o => o.role === 'secretary' && o.is_active)?.farmer_name ?? '';

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-cropguard-forest rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold">{coop.name}</h2>
          </div>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setEditing(true)}>
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>
        <p className="text-xs text-white/60 ml-10">
          {[coop.community_name, coop.region, `${liveMemberCount} members`, `Created ${new Date(coop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {editing ? (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Cooperative Name</Label>
                <Input value={coop.name} disabled className="h-9 text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <Label className="text-xs">Chairperson</Label>
                <Select value={chairmanFarmerId || '__none__'} onValueChange={v => setChairmanFarmerId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select farmer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {availableFarmers(chairmanFarmerId).map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Secretary</Label>
                <Select value={secretaryFarmerId || '__none__'} onValueChange={v => setSecretaryFarmerId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select farmer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {availableFarmers(secretaryFarmerId).map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={saving} size="sm" className="h-8 text-xs gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Save
              </Button>
              <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailStat icon={Users} label="Members" value={liveMemberCount} />
            <DetailStat icon={Landmark} label="Chairperson" value={liveChairman || '—'} />
            <DetailStat icon={FileText} label="Secretary" value={liveSecretary || '—'} />
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Primary Crops</p>
              <p className="text-sm font-medium text-gray-900">{coop.primary_crops?.length ? coop.primary_crops.join(', ') : '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Farmer list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" /> Farmers in Cooperative ({liveMemberCount})
        </h3>
        {farmersLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : farmers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No farmers linked to this cooperative yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {farmers.map(f => (
              <div key={f.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-cropguard-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {f.phone ?? 'No phone'}{f.primary_crop ? ` · ${f.primary_crop}` : ''}{f.district ? ` · ${f.district}` : ''}
                  </p>
                </div>
                {f.is_verified && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Verified</span>}
                {f.current_fri_score != null && (
                  <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-0.5 rounded-full border border-gray-200">FRI {f.current_fri_score}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CoopFarmer {
  id: string; full_name: string; phone: string | null; primary_crop: string | null;
  is_verified: boolean; current_fri_score: number | null; region_code: string | null; district: string | null;
}

function DetailStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-400" />
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}

// ── Governance Tab (left-list + right-canvas) ─────────────────────────────────

function GovernanceTab({
  cooperatives, loading, search, setSearch, selectedCoop, setSelectedCoop, canEdit, orgId,
  regionFilter, setRegionFilter, communityFilter, setCommunityFilter, regions, communities,
  coopPage, setCoopPage, totalPages, totalCoops, canReorder, onMoveCoop, onReorderCoops,
}: SidebarProps & { canEdit: boolean; orgId: string }) {
  const [govTab, setGovTab] = useState<GovTab>('leadership');

  const GOV_TABS: { key: GovTab; label: string; icon: React.ElementType }[] = [
    { key: 'leadership',   label: 'Leadership',   icon: Users },
    { key: 'meetings',     label: 'Meetings',     icon: Calendar },
    { key: 'training',     label: 'Training',     icon: GraduationCap },
    { key: 'resolutions',  label: 'Resolutions',   icon: Gavel },
    { key: 'compliance',   label: 'Compliance',    icon: ShieldCheck },
    { key: 'funds',        label: 'Funds',         icon: Wallet },
    { key: 'documents',    label: 'Documents',     icon: FileText },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <CoopListSidebar
        cooperatives={cooperatives}
        loading={loading}
        search={search}
        setSearch={setSearch}
        selectedCoop={selectedCoop}
        setSelectedCoop={setSelectedCoop}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        communityFilter={communityFilter}
        setCommunityFilter={setCommunityFilter}
        regions={regions}
        communities={communities}
        coopPage={coopPage}
        setCoopPage={setCoopPage}
        totalPages={totalPages}
        totalCoops={totalCoops}
        canReorder={canReorder}
        onMoveCoop={onMoveCoop}
        onReorderCoops={onReorderCoops}
      />
      <div className="lg:col-span-2">
        {selectedCoop ? (
          <div className="space-y-4">
            <div className="bg-cropguard-forest rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Gavel className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold">Governance — {selectedCoop.name}</h2>
              </div>
              <p className="text-xs text-white/60 ml-10">
                {[selectedCoop.community_name, selectedCoop.region, `${selectedCoop.member_count ?? 0} members`, `Created ${new Date(selectedCoop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto w-fit">
              {GOV_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setGovTab(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    govTab === t.key ? 'bg-white text-cropguard-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {govTab === 'leadership'   && <LeadershipTab coop={selectedCoop} canEdit={canEdit} orgId={orgId} />}
              {govTab === 'meetings'     && <MeetingsTab coopId={selectedCoop.id} canEdit={canEdit} orgId={orgId} />}
              {govTab === 'training'     && <TrainingTab coopId={selectedCoop.id} orgId={orgId} />}
              {govTab === 'resolutions'  && <ResolutionsTab coopId={selectedCoop.id} canEdit={canEdit} orgId={orgId} />}
              {govTab === 'compliance'   && <ComplianceTab coopId={selectedCoop.id} canEdit={canEdit} orgId={orgId} />}
              {govTab === 'funds'        && <FundsTab coopId={selectedCoop.id} canEdit={canEdit} orgId={orgId} />}
              {govTab === 'documents'    && <DocumentsTab coopId={selectedCoop.id} canEdit={canEdit} orgId={orgId} />}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
            <Gavel className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a cooperative from the list</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leadership Tab ─────────────────────────────────────────────────────────────

interface OfficerWithFarmer extends CooperativeOfficer {
  farmer_name?: string | null;
  farmer_phone?: string | null;
}

function LeadershipTab({ coop, canEdit, orgId }: { coop: Cooperative; canEdit: boolean; orgId: string }) {
  const toast = useToast();
  const [officers, setOfficers] = useState<OfficerWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OfficerWithFarmer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cooperative_officers')
      .select('*, farmer_id')
      .eq('cooperative_id', coop.id)
      .order('created_at');
    const officerRows = (data as CooperativeOfficer[]) ?? [];

    const farmerIds = officerRows.map(o => o.farmer_id).filter((id): id is string => id != null);
    let farmerMap: Record<string, { full_name: string; phone: string | null }> = {};
    if (farmerIds.length > 0) {
      const { data: farmers } = await supabase
        .from('farmers')
        .select('id, full_name, phone')
        .in('id', farmerIds);
      for (const f of (farmers ?? []) as { id: string; full_name: string; phone: string | null }[]) {
        farmerMap[f.id] = { full_name: f.full_name, phone: f.phone };
      }
    }

    const enriched: OfficerWithFarmer[] = officerRows.map(o => ({
      ...o,
      farmer_name: o.farmer_id ? farmerMap[o.farmer_id]?.full_name ?? o.full_name : o.full_name,
      farmer_phone: o.farmer_id ? farmerMap[o.farmer_id]?.phone ?? o.phone : o.phone,
    }));

    setOfficers(enriched);
    setLoading(false);
  }, [coop.id]);

  useEffect(() => { load(); }, [load]);

  async function deleteOfficer(id: string) {
    const { error } = await supabase.from('cooperative_officers').delete().eq('id', id);
    if (error) { toast.error('Failed to delete officer', extractError(error, 'You may not have permission to delete this officer.')); return; }
    toast.success('Officer removed');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Leadership Roster</h3>
        {canEdit && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-3 h-3" /> Add Officer
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : officers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No officers recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {officers.map(o => (
            <div key={o.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-cropguard-forest" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{o.farmer_name ?? o.full_name ?? 'Unknown'}</p>
                <p className="text-xs text-gray-500">
                  {OFFICER_ROLES.find(r => r.value === o.role)?.label ?? o.role}
                  {(o.farmer_phone ?? o.phone) && ` · ${o.farmer_phone ?? o.phone}`}
                  {o.term_start && ` · Term: ${o.term_start}${o.term_end ? ` – ${o.term_end}` : ''}`}
                </p>
              </div>
              {o.is_active && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Active</span>}
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(o); setShowForm(true); }} className="p-1 text-gray-400 hover:text-gray-700"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteOfficer(o.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <OfficerForm
          coopId={coop.id}
          orgId={orgId}
          existing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Officer Form ──────────────────────────────────────────────────────────────

function OfficerForm({
  coopId, orgId, existing, onClose, onSaved,
}: {
  coopId: string;
  orgId: string;
  existing: OfficerWithFarmer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [farmerId, setFarmerId] = useState(existing?.farmer_id ?? '');
  const [role, setRole] = useState(existing?.role ?? 'executive_member');
  const [termStart, setTermStart] = useState(existing?.term_start ?? '');
  const [termEnd, setTermEnd] = useState(existing?.term_end ?? '');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setFarmersLoading(true);
      const [{ data: farmerData }, { data: officerData }] = await Promise.all([
        supabase.from('farmers').select('id, full_name, phone').eq('cooperative_id', coopId).order('full_name'),
        supabase.from('cooperative_officers').select('farmer_id').eq('cooperative_id', coopId).eq('is_active', true),
      ]);
      const assignedIds = new Set(
        (officerData ?? []).map((o: { farmer_id: string | null }) => o.farmer_id).filter((id): id is string => id != null)
      );
      const allFarmers = (farmerData as { id: string; full_name: string; phone: string | null }[]) ?? [];
      setFarmers(allFarmers.filter(f => !assignedIds.has(f.id) || f.id === existing?.farmer_id));
      setFarmersLoading(false);
    })();
  }, [coopId, existing]);

  async function save() {
    setSaving(true);
    const selectedFarmer = farmers.find(f => f.id === farmerId);
    const payload = {
      cooperative_id: coopId,
      organisation_id: orgId,
      farmer_id: farmerId || null,
      full_name: selectedFarmer?.full_name ?? null,
      phone: selectedFarmer?.phone ?? null,
      role,
      term_start: termStart || null,
      term_end: termEnd || null,
      is_active: isActive,
    };

    // Deactivate any other active officer holding the same role
    if (isActive) {
      const { data: existing } = await supabase
        .from('cooperative_officers')
        .select('id')
        .eq('cooperative_id', coopId)
        .eq('role', role)
        .eq('is_active', true)
        .neq('id', existing?.id ?? '');
      const otherIds = (existing ?? []).map((o: { id: string }) => o.id);
      if (otherIds.length > 0) {
        await supabase.from('cooperative_officers').update({ is_active: false }).in('id', otherIds);
      }
    }

    if (existing) {
      const { error } = await supabase.from('cooperative_officers').update(payload).eq('id', existing.id);
      if (error) { toast.error('Failed to update officer', extractError(error, 'You may not have permission to perform this action.')); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('cooperative_officers').insert(payload);
      if (error) { toast.error('Failed to add officer', extractError(error, 'This farmer may already hold an active position or you lack permission.')); setSaving(false); return; }
    }
    setSaving(false);
    toast.success(existing ? 'Officer updated' : 'Officer added');
    onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{existing ? 'Edit Officer' : 'Add Officer'}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{OFFICER_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Select Officer (Farmer)</Label>
          {farmersLoading ? (
            <Skeleton className="h-9 w-full rounded-lg" />
          ) : farmers.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No farmers in this cooperative. Add farmers first.</p>
          ) : (
            <Select value={farmerId} onValueChange={setFarmerId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a farmer..." /></SelectTrigger>
              <SelectContent>
                {farmers.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.full_name}{f.phone ? ` · ${f.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="officer-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
          <Label htmlFor="officer-active" className="text-xs">Active</Label>
        </div>
        <div />
        <div>
          <Label className="text-xs">Term Start</Label>
          <Input type="date" value={termStart} onChange={e => setTermStart(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Term End</Label>
          <Input type="date" value={termEnd} onChange={e => setTermEnd(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      <Button onClick={save} disabled={saving || !farmerId} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
        {existing ? 'Update' : 'Add'} Officer
      </Button>
    </div>
  );
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────

function MeetingsTab({ coopId, canEdit, orgId }: { coopId: string; canEdit: boolean; orgId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<CooperativeMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<CooperativeMeeting | null>(null);
  const [attendeePopup, setAttendeePopup] = useState<{ meetingId: string; names: string[] } | null>(null);
  const [attendeeLoading, setAttendeeLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cooperative_meetings')
      .select('*')
      .eq('cooperative_id', coopId)
      .order('meeting_date', { ascending: false });
    setItems((data as CooperativeMeeting[]) ?? []);
    setLoading(false);
  }, [coopId]);

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    const { error } = await supabase.from('cooperative_meetings').delete().eq('id', id);
    if (error) { toast.error('Failed to delete meeting', extractError(error, 'You may not have permission to delete this meeting.')); return; }
    toast.success('Meeting deleted');
    load();
  }

  async function openAttendees(e: React.MouseEvent, meetingId: string) {
    e.stopPropagation();
    if (attendeePopup?.meetingId === meetingId) { setAttendeePopup(null); return; }
    setAttendeeLoading(true);
    const { data } = await supabase
      .from('cooperative_meeting_attendance')
      .select('farmer_id, present, farmers(full_name)')
      .eq('meeting_id', meetingId)
      .eq('present', true);
    const names = (data ?? []).map((r: any) => r.farmers?.full_name ?? 'Unknown').sort();
    setAttendeePopup({ meetingId, names });
    setAttendeeLoading(false);
  }

  if (selectedMeeting) {
    return (
      <MeetingDetail
        meeting={selectedMeeting}
        coopId={coopId}
        orgId={orgId}
        canEdit={canEdit}
        onBack={() => { setSelectedMeeting(null); load(); }}
        onSaved={() => { setSelectedMeeting(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Meetings</h3>
        {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}><Plus className="w-3 h-3" /> Add Meeting</Button>}
      </div>
      {showForm && <MeetingForm coopId={coopId} orgId={orgId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {loading ? <Skeleton className="h-20 w-full rounded-xl" /> : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No meetings recorded.</p>
      ) : (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m.id} className="space-y-0">
              <button
                onClick={() => setSelectedMeeting(m)}
                className="w-full text-left bg-gray-50 border border-gray-100 rounded-xl p-3 transition-all hover:border-cropguard-forest/30 hover:shadow-sm group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase text-cropguard-forest bg-cropguard-forest/10 px-2 py-0.5 rounded">{MEETING_TYPES.find(t => t.value === m.meeting_type)?.label ?? m.meeting_type}</span>
                      <span className="text-xs text-gray-500">{new Date(m.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {m.location && <p className="text-sm text-gray-700 mt-1"><span className="text-xs font-medium text-gray-400">Location: </span>{m.location}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={(e) => openAttendees(e, m.id)}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                          attendeePopup?.meetingId === m.id
                            ? 'bg-cropguard-forest text-white'
                            : 'bg-cropguard-forest/10 text-cropguard-forest hover:bg-cropguard-forest/20'
                        )}
                      >
                        <UserCheck className="w-3 h-3" />
                        {m.attendance_count} present
                        {attendeeLoading && attendeePopup?.meetingId !== m.id ? null : null}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 max-w-[45%]">
                    {m.agenda && <p className="text-xs text-gray-500 line-clamp-2 text-right"><span className="text-xs font-medium text-gray-400">Agenda: </span>{m.agenda}</p>}
                    <div className="flex items-center gap-1">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-cropguard-forest transition-colors" />
                      {canEdit && (
                        <span onClick={(e) => { e.stopPropagation(); del(m.id); }} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              {/* Attendee popup panel */}
              {attendeePopup?.meetingId === m.id && (
                <div className="border border-cropguard-forest/20 border-t-0 rounded-b-xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-cropguard-forest uppercase tracking-wide">Attendees ({attendeePopup.names.length})</p>
                    <button onClick={() => setAttendeePopup(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {attendeeLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</div>
                  ) : attendeePopup.names.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No attendance recorded for this meeting.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-40 overflow-y-auto">
                      {attendeePopup.names.map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Meeting Detail / Edit ──────────────────────────────────────────────────────

interface AttendanceRow { id: string; farmer_id: string; full_name: string; phone: string; present: boolean; }

function MeetingDetail({ meeting, coopId, orgId, canEdit, onBack, onSaved }: {
  meeting: CooperativeMeeting; coopId: string; orgId: string; canEdit: boolean; onBack: () => void; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState(meeting.meeting_type);
  const [date, setDate] = useState(meeting.meeting_date);
  const [location, setLocation] = useState(meeting.location ?? '');
  const [agenda, setAgenda] = useState(meeting.agenda ?? '');
  const [minutes, setMinutes] = useState(meeting.minutes ?? '');

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [attSaving, setAttSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    setAttLoading(true);
    // Load all farmers in the cooperative
    const { data: farmers } = await supabase
      .from('farmers')
      .select('id, full_name, phone')
      .eq('cooperative_id', coopId)
      .order('full_name');
    // Load existing attendance records for this meeting
    const { data: existing } = await supabase
      .from('cooperative_meeting_attendance')
      .select('id, farmer_id, present')
      .eq('meeting_id', meeting.id);
    const presentMap: Record<string, boolean> = {};
    (existing ?? []).forEach((r: any) => { presentMap[r.farmer_id] = r.present; });
    setAttendance((farmers ?? []).map((f: any) => ({
      id: f.id, farmer_id: f.id, full_name: f.full_name, phone: f.phone ?? '',
      present: presentMap[f.id] ?? false,
    })));
    setAttLoading(false);
  }, [coopId, meeting.id]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  async function saveMeeting() {
    setSaving(true);
    const { error } = await supabase.from('cooperative_meetings').update({
      meeting_type: type, meeting_date: date, location: location || null,
      agenda: agenda || null, minutes: minutes || null,
    }).eq('id', meeting.id);
    setSaving(false);
    if (error) { toast.error('Failed to save meeting', extractError(error, 'You may not have permission to edit this meeting.')); return; }
    toast.success('Meeting updated');
    setEditing(false);
    onSaved();
  }

  async function saveAttendance() {
    setAttSaving(true);
    const rows = attendance.map(a => ({
      meeting_id: meeting.id, cooperative_id: coopId, organisation_id: orgId,
      farmer_id: a.farmer_id, present: a.present,
    }));
    const { error: delErr } = await supabase.from('cooperative_meeting_attendance').delete().eq('meeting_id', meeting.id);
    if (delErr) { toast.error('Failed to save attendance', extractError(delErr, 'You may not have permission to modify attendance.')); setAttSaving(false); return; }
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('cooperative_meeting_attendance').insert(rows);
      if (insErr) { toast.error('Failed to save attendance', extractError(insErr, 'Some attendance records could not be saved.')); setAttSaving(false); return; }
    }
    const presentCount = attendance.filter(a => a.present).length;
    const { error: updErr } = await supabase.from('cooperative_meetings').update({ attendance_count: presentCount }).eq('id', meeting.id);
    setAttSaving(false);
    if (updErr) { toast.error('Failed to update attendance count', extractError(updErr, 'The attendance count could not be updated.')); return; }
    toast.success('Attendance saved');
  }

  const presentCount = attendance.filter(a => a.present).length;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-cropguard-forest transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to meetings
      </button>

      {/* Meeting header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-cropguard-forest px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-cropguard-light" />
              <span className="text-xs font-semibold text-cropguard-pale uppercase tracking-widest">{MEETING_TYPES.find(t => t.value === (editing ? type : meeting.meeting_type))?.label ?? meeting.meeting_type}</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {new Date(editing ? date : meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
          </div>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-white/30 text-white hover:bg-white/10 h-8 text-xs gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Location</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Agenda</Label>
                <Textarea value={agenda} onChange={e => setAgenda(e.target.value)} className="text-sm" rows={2} />
              </div>
              <div>
                <Label className="text-xs">Minutes</Label>
                <Textarea value={minutes} onChange={e => setMinutes(e.target.value)} className="text-sm" rows={4} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveMeeting} disabled={saving || !date} className="h-9 text-sm gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="h-9 text-sm">Cancel</Button>
              </div>
            </>
          ) : (
            <>
              {meeting.location && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                  <p className="text-sm text-gray-700">{meeting.location}</p>
                </div>
              )}
              {meeting.agenda && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Agenda</p>
                  <p className="text-sm text-gray-700">{meeting.agenda}</p>
                </div>
              )}
              {meeting.minutes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Minutes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.minutes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Attendance section */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cropguard-forest" />
              <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
              <span className="text-xs text-gray-400">({presentCount} of {attendance.length} present)</span>
            </div>
            {canEdit && (
              <Button size="sm" onClick={saveAttendance} disabled={attSaving || attLoading} className="h-8 text-xs gap-1.5">
                {attSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Save Attendance
              </Button>
            )}
          </div>
          <div className="p-3 max-h-96 overflow-y-auto">
            {attLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : attendance.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No farmers in this cooperative.</p>
            ) : (
              <div className="space-y-1">
                {attendance.map((a, i) => (
                  <label
                    key={a.farmer_id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                      a.present ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={a.present}
                      onChange={(e) => {
                        setAttendance(prev => prev.map((row, idx) => idx === i ? { ...row, present: e.target.checked } : row));
                      }}
                      disabled={!canEdit}
                      className="w-4 h-4 rounded text-cropguard-forest focus:ring-cropguard-forest"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{a.full_name}</p>
                      {a.phone && <p className="text-xs text-gray-400">{a.phone}</p>}
                    </div>
                    {a.present && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [type, setType] = useState('general');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('cooperative_meetings').insert({
      cooperative_id: coopId, organisation_id: orgId,
      meeting_type: type, meeting_date: date, location: location || null,
      attendance_count: 0, agenda: agenda || null, minutes: minutes || null,
    });
    setSaving(false);
    if (error) { toast.error('Failed to create meeting', extractError(error, 'You may not have permission to create meetings.')); return; }
    toast.success('Meeting created'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add Meeting</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Location</Label>
          <Input value={location} onChange={e => setLocation(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Agenda</Label>
        <Textarea value={agenda} onChange={e => setAgenda(e.target.value)} className="text-sm" rows={2} />
      </div>
      <div>
        <Label className="text-xs">Minutes</Label>
        <Textarea value={minutes} onChange={e => setMinutes(e.target.value)} className="text-sm" rows={3} />
      </div>
      <Button onClick={save} disabled={saving || !date} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add Meeting
      </Button>
    </div>
  );
}

// ── Resolutions Tab ───────────────────────────────────────────────────────────

function ResolutionsTab({ coopId, canEdit, orgId }: { coopId: string; canEdit: boolean; orgId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<CooperativeResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cooperative_resolutions')
      .select('*')
      .eq('cooperative_id', coopId)
      .order('created_at', { ascending: false });
    setItems((data as CooperativeResolution[]) ?? []);
    setLoading(false);
  }, [coopId]);

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    const { error } = await supabase.from('cooperative_resolutions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete resolution', extractError(error, 'You may not have permission to delete this resolution.')); return; }
    toast.success('Resolution deleted'); load();
  }

  const outcomeCls: Record<string, string> = {
    passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    deferred: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Resolutions</h3>
        {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}><Plus className="w-3 h-3" /> Add Resolution</Button>}
      </div>
      {showForm && <ResolutionForm coopId={coopId} orgId={orgId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {loading ? <Skeleton className="h-20 w-full rounded-xl" /> : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No resolutions recorded.</p>
      ) : (
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.title}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-1">{r.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', outcomeCls[r.vote_outcome] ?? outcomeCls.pending)}>{VOTE_OUTCOMES.find(v => v.value === r.vote_outcome)?.label ?? r.vote_outcome}</span>
                    <span className="text-[10px] text-gray-400">{IMPLEMENTATION_STATUSES.find(s => s.value === r.implementation_status)?.label ?? r.implementation_status}</span>
                    {r.proposed_by && <span className="text-xs text-gray-400">by {r.proposed_by}</span>}
                  </div>
                </div>
                {canEdit && <button onClick={() => del(r.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResolutionForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [proposedBy, setProposedBy] = useState('');
  const [outcome, setOutcome] = useState('pending');
  const [implStatus, setImplStatus] = useState('pending');
  const [dateDecided, setDateDecided] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('cooperative_resolutions').insert({
      cooperative_id: coopId, organisation_id: orgId,
      title, description: desc || null, proposed_by: proposedBy || null,
      vote_outcome: outcome, implementation_status: implStatus,
      date_decided: dateDecided || null,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add resolution', extractError(error, 'You may not have permission to add resolutions.')); return; }
    toast.success('Resolution added'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add Resolution</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="text-sm" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Proposed By</Label>
          <Input value={proposedBy} onChange={e => setProposedBy(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Date Decided</Label>
          <Input type="date" value={dateDecided} onChange={e => setDateDecided(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Vote Outcome</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{VOTE_OUTCOMES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Implementation</Label>
          <Select value={implStatus} onValueChange={setImplStatus}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{IMPLEMENTATION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={save} disabled={saving || !title} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add Resolution
      </Button>
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ coopId, canEdit, orgId }: { coopId: string; canEdit: boolean; orgId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<CooperativeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cooperative_documents')
      .select('*')
      .eq('cooperative_id', coopId)
      .order('created_at', { ascending: false });
    setItems((data as CooperativeDocument[]) ?? []);
    setLoading(false);
  }, [coopId]);

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    const { error } = await supabase.from('cooperative_documents').delete().eq('id', id);
    if (error) { toast.error('Failed to delete document', extractError(error, 'You may not have permission to delete this document.')); return; }
    toast.success('Document deleted'); load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
        {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}><Plus className="w-3 h-3" /> Add Document</Button>}
      </div>
      {showForm && <DocumentForm coopId={coopId} orgId={orgId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {loading ? <Skeleton className="h-20 w-full rounded-xl" /> : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No documents recorded.</p>
      ) : (
        <div className="space-y-2">
          {items.map(d => {
            const badge = complianceBadge(d.status, d.expiry_date);
            return (
              <div key={d.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-cropguard-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-500">{DOCUMENT_TYPES.find(t => t.value === d.document_type)?.label ?? d.document_type}</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', badge.cls)}>{badge.label}</span>
                {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-cropguard-forest hover:underline">View</a>}
                {canEdit && <button onClick={() => del(d.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [docType, setDocType] = useState('bylaws');
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'file';
    const path = `${coopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('coop-documents').upload(path, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) { toast.error('Upload failed', extractError(error, 'The file could not be uploaded. It may be too large or in an unsupported format.')); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('coop-documents').getPublicUrl(data.path);
    setFileUrl(pub.publicUrl);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('cooperative_documents').insert({
      cooperative_id: coopId, organisation_id: orgId,
      document_type: docType, title, file_url: fileUrl || null,
      issue_date: issueDate || null, expiry_date: expiryDate || null,
      status: 'active',
    });
    setSaving(false);
    if (error) { toast.error('Failed to add document', extractError(error, 'You may not have permission to add documents.')); return; }
    toast.success('Document added'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add Document</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Issue Date</Label>
          <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Expiry Date</Label>
          <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Upload File</Label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-cropguard-forest/40 hover:text-cropguard-forest transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Choose file'}
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          {fileUrl && <span className="text-xs text-emerald-600 truncate">Uploaded</span>}
        </div>
      </div>
      <Button onClick={save} disabled={saving || uploading || !title} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add Document
      </Button>
    </div>
  );
}

// ── Funds Tab ─────────────────────────────────────────────────────────────────

function FundsTab({ coopId, canEdit, orgId }: { coopId: string; canEdit: boolean; orgId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<CooperativeFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cooperative_funds')
      .select('*')
      .eq('cooperative_id', coopId)
      .order('transaction_date', { ascending: false });
    setItems((data as CooperativeFund[]) ?? []);
    setLoading(false);
  }, [coopId]);

  useEffect(() => { load(); }, [load]);

  async function del(id: string) {
    const { error } = await supabase.from('cooperative_funds').delete().eq('id', id);
    if (error) { toast.error('Failed to delete fund entry', extractError(error, 'You may not have permission to delete this fund record.')); return; }
    toast.success('Fund entry deleted'); load();
  }

  const balance = items.reduce((a, t) => {
    if (t.transaction_type === 'contribution' || t.transaction_type === 'savings' || t.transaction_type === 'repayment') return a + Number(t.amount);
    return a - Number(t.amount);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Fund Transactions</h3>
        {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}><Plus className="w-3 h-3" /> Add Transaction</Button>}
      </div>
      <div className="bg-cropguard-forest rounded-xl p-4 text-white">
        <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Current Balance</p>
        <p className="text-2xl font-bold mt-1">GHS {balance.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
      {showForm && <FundForm coopId={coopId} orgId={orgId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {loading ? <Skeleton className="h-20 w-full rounded-xl" /> : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No transactions recorded.</p>
      ) : (
        <div className="space-y-2">
          {items.map(t => (
            <div key={t.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 text-cropguard-forest" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{FUND_TYPES.find(f => f.value === t.transaction_type)?.label ?? t.transaction_type}</p>
                <p className="text-xs text-gray-500">{new Date(t.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{t.member_name ? ` · ${t.member_name}` : ''}{t.mode_of_payment ? ` · ${PAYMENT_MODES.find(m => m.value === t.mode_of_payment)?.label ?? t.mode_of_payment}` : ''}{t.reference ? ` · Ref: ${t.reference}` : ''}{t.received_by ? ` · By: ${t.received_by}` : ''}{t.description ? ` · ${t.description}` : ''}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">GHS {Number(t.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
              {canEdit && <button onClick={() => del(t.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FundForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [type, setType] = useState('contribution');
  const [amount, setAmount] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('cash');
  const [reference, setReference] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    supabase.from('farmers').select('id, full_name').eq('cooperative_id', coopId).order('full_name').then(({ data }) => {
      setFarmers((data as { id: string; full_name: string }[]) ?? []);
    });
  }, [coopId]);

  async function save() {
    setSaving(true);
    const selected = farmers.find(f => f.id === memberId);
    const { error } = await supabase.from('cooperative_funds').insert({
      cooperative_id: coopId, organisation_id: orgId,
      transaction_type: type, amount: Number(amount),
      member_id: memberId || null, member_name: (selected?.full_name ?? memberName) || null,
      mode_of_payment: modeOfPayment || null, reference: reference || null,
      received_by: receivedBy || null,
      transaction_date: date, description: desc || null,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add transaction', extractError(error, 'You may not have permission to add fund transactions.')); return; }
    toast.success('Transaction added'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add Transaction</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{FUND_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Amount (GHS)</Label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Member Name</Label>
          <Select value={memberId} onValueChange={(v) => { setMemberId(v); setMemberName(farmers.find(f => f.id === v)?.full_name ?? ''); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select farmer…" /></SelectTrigger>
            <SelectContent>{farmers.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mode of Payment</Label>
          <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Reference / Receipt #</Label>
          <Input value={reference} onChange={e => setReference(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Received By</Label>
          <Input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="text-sm" rows={2} />
      </div>
      <Button onClick={save} disabled={saving || !amount} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add Transaction
      </Button>
    </div>
  );
}

// ── Compliance Tab ────────────────────────────────────────────────────────────

function ComplianceTab({ coopId, canEdit, orgId }: { coopId: string; canEdit: boolean; orgId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<CooperativeCompliance[]>([]);
  const [fboRegs, setFboRegs] = useState<FboRegistration[]>([]);
  const [licenses, setLicenses] = useState<CocobodLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCertForm, setShowCertForm] = useState(false);
  const [showFboForm, setShowFboForm] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [certs, fbos, lic] = await Promise.all([
      supabase.from('cooperative_compliance').select('*').eq('cooperative_id', coopId).order('created_at'),
      supabase.from('fbo_registrations').select('*').eq('cooperative_id', coopId).order('created_at'),
      supabase.from('cocobod_licenses').select('*').eq('cooperative_id', coopId).order('created_at'),
    ]);
    setItems((certs.data as CooperativeCompliance[]) ?? []);
    setFboRegs((fbos.data as FboRegistration[]) ?? []);
    setLicenses((lic.data as CocobodLicense[]) ?? []);
    setLoading(false);
  }, [coopId]);

  useEffect(() => { load(); }, [load]);

  async function delCert(id: string) {
    const { error } = await supabase.from('cooperative_compliance').delete().eq('id', id);
    if (error) { toast.error('Failed to delete certification', extractError(error, 'You may not have permission to delete this record.')); return; }
    toast.success('Certification removed'); load();
  }
  async function delFbo(id: string) {
    const { error } = await supabase.from('fbo_registrations').delete().eq('id', id);
    if (error) { toast.error('Failed to delete FBO registration', extractError(error, 'You may not have permission to delete this record.')); return; }
    toast.success('FBO registration removed'); load();
  }
  async function delLicense(id: string) {
    const { error } = await supabase.from('cocobod_licenses').delete().eq('id', id);
    if (error) { toast.error('Failed to delete license', extractError(error, 'You may not have permission to delete this record.')); return; }
    toast.success('License removed'); load();
  }

  return (
    <div className="space-y-5">
      {/* Certifications */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Certifications</h3>
          {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCertForm(true)}><Plus className="w-3 h-3" /> Add</Button>}
        </div>
        {loading ? <Skeleton className="h-20 w-full rounded-xl" /> : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No certifications recorded.</p>
        ) : (
          <div className="space-y-2">
            {items.map(c => {
              const badge = complianceBadge(c.status, c.expiry_date);
              return (
                <div key={c.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                    <Award className="w-3.5 h-3.5 text-cropguard-forest" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{CERTIFICATION_TYPES.find(t => t.value === c.certification_type)?.label ?? c.certification_type}</p>
                    {c.registration_number && <p className="text-xs text-gray-500">Reg: {c.registration_number}</p>}
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', badge.cls)}>{badge.label}</span>
                  {canEdit && <button onClick={() => delCert(c.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              );
            })}
          </div>
        )}
        {showCertForm && <CertForm coopId={coopId} orgId={orgId} onClose={() => setShowCertForm(false)} onSaved={() => { setShowCertForm(false); load(); }} />}
      </div>

      {/* FBO Registration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">FBO Registration</h3>
          {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowFboForm(true)}><Plus className="w-3 h-3" /> Add</Button>}
        </div>
        {showFboForm && <FboForm coopId={coopId} orgId={orgId} onClose={() => setShowFboForm(false)} onSaved={() => { setShowFboForm(false); load(); }} />}
        {fboRegs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No FBO registration recorded.</p>
        ) : (
          <div className="space-y-2">
            {fboRegs.map(f => (
              <div key={f.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                  <Landmark className="w-3.5 h-3.5 text-cropguard-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{f.registration_number ?? 'No reg number'}</p>
                  <p className="text-xs text-gray-500">Status: {f.status}{f.renewal_due_date ? ` · Renewal: ${f.renewal_due_date}` : ''}</p>
                </div>
                {canEdit && <button onClick={() => delFbo(f.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        )}
        {showFboForm && <FboForm coopId={coopId} orgId={orgId} onClose={() => setShowFboForm(false)} onSaved={() => { setShowFboForm(false); load(); }} />}
      </div>

      {/* COCOBOD / LBC Licenses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">COCOBOD / LBC Licenses</h3>
          {canEdit && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowLicenseForm(true)}><Plus className="w-3 h-3" /> Add</Button>}
        </div>
        {showLicenseForm && <LicenseForm coopId={coopId} orgId={orgId} onClose={() => setShowLicenseForm(false)} onSaved={() => { setShowLicenseForm(false); load(); }} />}
        {licenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No LBC license recorded.</p>
        ) : (
          <div className="space-y-2">
            {licenses.map(l => (
              <div key={l.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-cropguard-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{l.lbc_name}</p>
                  <p className="text-xs text-gray-500">
                    {l.license_number ?? 'No license #'}
                    {l.seasonal_producer_price != null && ` · Producer Price: GHS ${l.seasonal_producer_price}/ton`}
                    {l.premium_amount != null && ` · Premium: GHS ${l.premium_amount}`}
                  </p>
                </div>
                {canEdit && <button onClick={() => delLicense(l.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CertForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [certType, setCertType] = useState('fbo_registration');
  const [regNum, setRegNum] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'file';
    const path = `${coopId}/compliance/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('coop-documents').upload(path, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) { toast.error('Upload failed', extractError(error, 'The file could not be uploaded. It may be too large or in an unsupported format.')); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('coop-documents').getPublicUrl(data.path);
    setDocumentUrl(pub.publicUrl);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('cooperative_compliance').insert({
      cooperative_id: coopId, organisation_id: orgId,
      certification_type: certType, registration_number: regNum || null,
      issue_date: issueDate || null, expiry_date: expiryDate || null,
      status, notes: notes || null, document_url: documentUrl || null,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add certification', extractError(error, 'You may not have permission to add compliance records.')); return; }
    toast.success('Certification added'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add Certification</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={certType} onValueChange={setCertType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{CERTIFICATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Registration #</Label>
          <Input value={regNum} onChange={e => setRegNum(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Issue Date</Label>
          <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Expiry Date</Label>
          <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Upload Document</Label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-cropguard-forest/40 hover:text-cropguard-forest transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Choose file'}
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          {documentUrl && <span className="text-xs text-emerald-600 truncate">Uploaded</span>}
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" rows={2} />
      </div>
      <Button onClick={save} disabled={saving || uploading} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add Certification
      </Button>
    </div>
  );
}

function FboForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [regNum, setRegNum] = useState('');
  const [regDate, setRegDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [renewalDate, setRenewalDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('fbo_registrations').insert({
      cooperative_id: coopId, organisation_id: orgId,
      registration_number: regNum || null, registration_date: regDate || null,
      status, renewal_due_date: renewalDate || null, notes: notes || null,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add FBO registration', extractError(error, 'You may not have permission to add FBO records.')); return; }
    toast.success('FBO registration added'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add FBO Registration</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Registration #</Label>
          <Input value={regNum} onChange={e => setRegNum(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Registration Date</Label>
          <Input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="lapsed">Lapsed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Renewal Due</Label>
          <Input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" rows={2} />
      </div>
      <Button onClick={save} disabled={saving} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add FBO Registration
      </Button>
    </div>
  );
}

function LicenseForm({ coopId, orgId, onClose, onSaved }: { coopId: string; orgId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [lbcName, setLbcName] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [producerPrice, setProducerPrice] = useState('');
  const [premium, setPremium] = useState('');
  const [season, setSeason] = useState('');
  const [distNotes, setDistNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('cocobod_licenses').insert({
      cooperative_id: coopId, organisation_id: orgId,
      lbc_name: lbcName, license_number: licenseNum || null,
      agreement_start_date: startDate || null, agreement_end_date: endDate || null,
      seasonal_producer_price: producerPrice ? Number(producerPrice) : null,
      premium_amount: premium ? Number(premium) : null,
      season: season || null, premium_distribution_notes: distNotes || null,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add license', extractError(error, 'You may not have permission to add license records.')); return; }
    toast.success('License added'); onSaved();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Add LBC License</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">LBC Name</Label>
          <Input value={lbcName} onChange={e => setLbcName(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">License #</Label>
          <Input value={licenseNum} onChange={e => setLicenseNum(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Agreement Start</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Agreement End</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
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
          <Label className="text-xs">Season</Label>
          <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2025/2026" className="h-9 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Premium Distribution Notes</Label>
        <Textarea value={distNotes} onChange={e => setDistNotes(e.target.value)} className="text-sm" rows={2} />
      </div>
      <Button onClick={save} disabled={saving || !lbcName} className="w-full h-9 text-sm gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Add License
      </Button>
    </div>
  );
}

// ── Insights Tab (left-list + right-canvas) ────────────────────────────────────

interface InsightData {
  content: string;
  created_at: string;
  id: string;
}

function InsightsTab({
  cooperatives, loading, search, setSearch, selectedCoop, setSelectedCoop, orgId,
  regionFilter, setRegionFilter, communityFilter, setCommunityFilter, regions, communities,
  coopPage, setCoopPage, totalPages, totalCoops, canReorder, onMoveCoop, onReorderCoops,
}: SidebarProps & { orgId: string }) {
  const toast = useToast();
  const [savedInsights, setSavedInsights] = useState<InsightData[]>([]);
  const [activeInsight, setActiveInsight] = useState<InsightData | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [stats, setStats] = useState<{
    farmerCount: number; avgFri: number | null; verifiedCount: number;
    meetingCount: number; resolutionCount: number;
    fundBalance: number; complianceCount: number;
  } | null>(null);

  const loadStats = useCallback(async () => {
    if (!selectedCoop) return;
    const [farmers, meetings, resolutions, funds, compliance] = await Promise.all([
      supabase.from('farmers').select('id,is_verified,current_fri_score').eq('cooperative_id', selectedCoop.id),
      supabase.from('cooperative_meetings').select('id', { count: 'exact', head: true }).eq('cooperative_id', selectedCoop.id),
      supabase.from('cooperative_resolutions').select('id', { count: 'exact', head: true }).eq('cooperative_id', selectedCoop.id),
      supabase.from('cooperative_funds').select('amount,transaction_type').eq('cooperative_id', selectedCoop.id),
      supabase.from('cooperative_compliance').select('id', { count: 'exact', head: true }).eq('cooperative_id', selectedCoop.id),
    ]);

    const farmerList = (farmers.data ?? []) as { id: string; is_verified: boolean; current_fri_score: number | null }[];
    const friScores = farmerList.map(f => f.current_fri_score).filter((v): v is number => v != null);
    const balance = (funds.data ?? []).reduce((a: number, t: { amount: number; transaction_type: string }) => {
      if (t.transaction_type === 'contribution' || t.transaction_type === 'savings' || t.transaction_type === 'repayment') return a + Number(t.amount);
      return a - Number(t.amount);
    }, 0);

    setStats({
      farmerCount: farmerList.length,
      avgFri: friScores.length ? friScores.reduce((a, b) => a + b, 0) / friScores.length : null,
      verifiedCount: farmerList.filter(f => f.is_verified).length,
      meetingCount: meetings.count ?? 0,
      resolutionCount: resolutions.count ?? 0,
      fundBalance: balance,
      complianceCount: compliance.count ?? 0,
    });
  }, [selectedCoop]);

  const loadSavedInsights = useCallback(async () => {
    if (!selectedCoop) { setSavedInsights([]); return; }
    const { data } = await supabase
      .from('norvi_community_outputs')
      .select('id, content, created_at, title')
      .eq('scope', 'cooperative')
      .eq('scope_id', selectedCoop.id)
      .eq('output_type', 'insight')
      .order('created_at', { ascending: false })
      .limit(20);
    setSavedInsights((data as InsightData[]) ?? []);
  }, [selectedCoop]);

  useEffect(() => {
    if (selectedCoop) {
      loadStats();
      loadSavedInsights();
      setActiveInsight(null);
      setError(null);
    }
  }, [selectedCoop, loadStats, loadSavedInsights]);

  async function generateInsight(prompt?: string) {
    if (!selectedCoop) return;
    setGenLoading(true);
    setError(null);
    setShowPrompt(false);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_FUNCTION_URL ?? ''}/functions/v1/norvi-community-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          scope: 'cooperative', scope_id: selectedCoop.id, org_id: orgId,
          custom_prompt: prompt || undefined,
          output_type: 'insight',
        }),
      });
      if (!res.ok) {
      const msg = await extractFetchError(res, 'Failed to generate insight');
      throw new Error(msg);
    }
      const data = await res.json() as InsightData;
      setActiveInsight(data);
      loadSavedInsights();
      setCustomPrompt('');
    } catch (err) {
      const msg = extractError(err, 'An error occurred while generating the insight');
      setError(msg);
      toast.error('Failed to generate insight', msg);
    } finally {
      setGenLoading(false);
    }
  }

  const insightParagraphs = activeInsight?.content?.split('\n').filter(p => p.trim()) ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <CoopListSidebar
        cooperatives={cooperatives}
        loading={loading}
        search={search}
        setSearch={setSearch}
        selectedCoop={selectedCoop}
        setSelectedCoop={setSelectedCoop}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        communityFilter={communityFilter}
        setCommunityFilter={setCommunityFilter}
        regions={regions}
        communities={communities}
        coopPage={coopPage}
        setCoopPage={setCoopPage}
        totalPages={totalPages}
        totalCoops={totalCoops}
        canReorder={canReorder}
        onMoveCoop={onMoveCoop}
        onReorderCoops={onReorderCoops}
      />
      <div className="lg:col-span-2">
        {selectedCoop ? (
          <div className="space-y-5">
            {/* Cooperative name header */}
            <div className="bg-cropguard-forest rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold">Insights for {selectedCoop.name}</h2>
              </div>
              <p className="text-xs text-white/60 ml-10">
                {selectedCoop.community_name ? `${selectedCoop.community_name}` : ''}
                {selectedCoop.region ? ` · ${selectedCoop.region}` : ''}
                {selectedCoop.member_count ? ` · ${selectedCoop.member_count} members` : ''}
                {` · Created ${new Date(selectedCoop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
            </div>

            {/* Stats overview */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InsightStat icon={Users}       label="Linked Farmers" value={stats.farmerCount} />
                <InsightStat icon={TrendingUp}  label="Avg FRI Score"  value={stats.avgFri != null ? stats.avgFri.toFixed(1) : '—'} />
                <InsightStat icon={CheckCircle} label="Verified"       value={stats.verifiedCount} />
                <InsightStat icon={Calendar}    label="Meetings"       value={stats.meetingCount} />
                <InsightStat icon={Gavel}       label="Resolutions"    value={stats.resolutionCount} />
                <InsightStat icon={Wallet}      label="Fund Balance"   value={`GHS ${stats.fundBalance.toLocaleString('en-GH', { minimumFractionDigits: 0 })}`} />
                <InsightStat icon={ShieldCheck} label="Certifications" value={stats.complianceCount} />
                <InsightStat icon={Award}       label="Members"        value={stats.farmerCount} />
              </div>
            )}

            {/* AI Insight */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cropguard-mint to-cropguard-forest rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">AI-Generated Insights</h3>
                    <p className="text-xs text-gray-500">Descriptive analysis, key findings, trends & recommended actions</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowPrompt(s => !s)} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> Custom Prompt
                  </Button>
                  <Button onClick={() => generateInsight()} disabled={genLoading} size="sm" className="h-8 text-xs gap-1.5">
                    {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {activeInsight ? 'Regenerate' : 'Generate Insights'}
                  </Button>
                </div>
              </div>

              {/* Custom prompt input */}
              {showPrompt && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                  <Label className="text-xs">Custom Prompt</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Analyze governance risks and recommend interventions for this cooperative..."
                    className="text-sm"
                    rows={2}
                  />
                  <Button onClick={() => generateInsight(customPrompt)} disabled={genLoading || !customPrompt.trim()} size="sm" className="h-8 text-xs gap-1.5">
                    {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate with Custom Prompt
                  </Button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {activeInsight ? (
                <div className="space-y-4">
                  {insightParagraphs.map((para, i) => {
                    const labels = ['Overview', 'Assessment', 'Recommendations'];
                    const icons = [Target, TrendingUp, Lightbulb];
                    const Icon = icons[i] ?? ClipboardList;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-cropguard-forest" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{labels[i] ?? `Section ${i + 1}`}</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{para}</p>
                        </div>
                      </div>
                    );
                  })}
                  {activeInsight.created_at && (
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">
                      Generated on {new Date(activeInsight.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ) : !genLoading && !error ? (
                <div className="text-center py-10 text-gray-400">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Click "Generate Insights" to get AI-powered analysis of this cooperative</p>
                </div>
              ) : genLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
              ) : null}
            </div>

            {/* Saved insights list */}
            {savedInsights.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Saved Insights ({savedInsights.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedInsights.map(ins => (
                    <button
                      key={ins.id}
                      onClick={() => setActiveInsight(ins)}
                      className={cn(
                        'w-full bg-gray-50 rounded-xl border p-3 text-left transition-all',
                        activeInsight?.id === ins.id ? 'border-cropguard-mint shadow-md ring-1 ring-cropguard-mint/30' : 'border-gray-100 hover:shadow-md'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">{ins.title || 'Insight'}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(ins.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
            <Sparkles className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a cooperative from the list</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ── Reports Tab (left-list + right-canvas with saved reports per type) ─────────

interface AiReport {
  id: string;
  title: string;
  content: string;
  created_at: string;
  report_type: string;
  generated_by: string | null;
}

const REPORT_TYPES = [
  { key: 'member_demographics', label: 'Member Demographics', description: 'Farmer count, verification status, and crop distribution', icon: Users },
  { key: 'compliance_summary',  label: 'Compliance Summary',  description: 'All certifications, FBO registrations, and LBC licenses', icon: ShieldCheck },
  { key: 'fund_balance',       label: 'Fund Balance Sheet',  description: 'Contributions, savings, loans, and repayments', icon: Wallet },
  { key: 'resolution_tracker', label: 'Resolution Tracker',  description: 'Vote outcomes and implementation status', icon: Gavel },
  { key: 'meeting_attendance', label: 'Meeting Attendance',  description: 'Meeting history and attendance records', icon: Calendar },
  { key: 'governance_health',  label: 'Governance Health',   description: 'Leadership roster completeness and document status', icon: Landmark },
  { key: 'ai_custom',          label: 'AI On-The-Go Report', description: 'Generate a custom report on any topic', icon: Sparkles },
];

function ReportsTab({
  cooperatives, loading, search, setSearch, selectedCoop, setSelectedCoop, orgId, canEdit,
  regionFilter, setRegionFilter, communityFilter, setCommunityFilter, regions, communities,
  coopPage, setCoopPage, totalPages, totalCoops, canReorder, onMoveCoop, onReorderCoops,
}: SidebarProps & { orgId: string; canEdit: boolean }) {
  const { profile } = useAuthStore();
  const userName = profile?.full_name ?? 'Unknown';
  const [reportTab, setReportTab] = useState<string>('member_demographics');
  const [savedReports, setSavedReports] = useState<AiReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<AiReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportPrompt, setReportPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ReportConfig[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const loadSavedReports = useCallback(async () => {
    if (!selectedCoop) { setSavedReports([]); setReportsLoading(false); return; }
    setReportsLoading(true);
    const { data } = await supabase
      .from('norvi_community_outputs')
      .select('id, content, created_at, title, report_type, generated_by')
      .eq('scope', 'cooperative')
      .eq('scope_id', selectedCoop.id)
      .eq('output_type', 'report')
      .order('created_at', { ascending: false })
      .limit(50);
    setSavedReports((data as AiReport[]) ?? []);
    setReportsLoading(false);
  }, [selectedCoop]);

  const loadConfigs = useCallback(async () => {
    if (!selectedCoop) { setConfigs([]); return; }
    const { data } = await supabase
      .from('cooperative_report_configs')
      .select('id, cooperative_id, report_type, auto_generate, frequency, day_of_month, day_of_week, custom_prompt, last_generated_at')
      .eq('cooperative_id', selectedCoop.id);
    setConfigs((data as ReportConfig[]) ?? []);
  }, [selectedCoop]);

  useEffect(() => {
    if (selectedCoop) {
      loadSavedReports();
      loadConfigs();
      setActiveReport(null);
      setError(null);
    }
  }, [selectedCoop, loadSavedReports, loadConfigs]);

  function buildReportName(reportType: string, coopName: string): string {
    const typeLabel = REPORT_TYPES.find(r => r.key === reportType)?.label ?? reportType;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '');
    return `${typeLabel}_${coopName}_${dateStr}_${timeStr}_by ${userName}`;
  }

  async function generateReport(prompt?: string, reportType?: string) {
    if (!selectedCoop) return;
    setGenerating(true);
    setError(null);
    setShowPrompt(false);
    try {
      const actualType = reportType ?? reportTab;
      const reportName = buildReportName(actualType, selectedCoop.name);
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/norvi-community-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          scope: 'cooperative',
          scope_id: selectedCoop.id,
          org_id: orgId,
          custom_prompt: prompt || undefined,
          output_type: 'report',
          report_type: actualType,
          title: reportName,
          generated_by: userName,
        }),
      });
      if (!res.ok) {
      const msg = await extractFetchError(res, 'Failed to generate report');
      throw new Error(msg);
    }
      const data = await res.json() as { id: string; content: string; created_at: string; title?: string; generated_by?: string };
      const newReport: AiReport = {
        id: data.id,
        title: data.title || reportName,
        content: data.content,
        created_at: data.created_at,
        report_type: actualType,
        generated_by: data.generated_by ?? userName,
      };
      setSavedReports(prev => [newReport, ...prev]);
      setActiveReport(newReport);
      setReportPrompt('');
    } catch (err) {
      const msg = extractError(err, 'An error occurred while generating the insight');
      setError(msg);
      toast.error('Failed to generate insight', msg);
    } finally {
      setGenerating(false);
    }
  }

  async function saveTitle(report: AiReport, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === report.title) { setEditingTitleId(null); return; }
    const { error } = await supabase.from('norvi_community_outputs').update({ title: trimmed }).eq('id', report.id);
    if (error) { toast.error('Failed to rename report', extractError(error, 'You may not have permission to rename this report.')); setEditingTitleId(null); return; }
    setSavedReports(prev => prev.map(r => r.id === report.id ? { ...r, title: trimmed } : r));
    if (activeReport?.id === report.id) setActiveReport(prev => prev ? { ...prev, title: trimmed } : prev);
    setEditingTitleId(null);
  }

  async function saveConfig(config: ReportConfig) {
    const payload = {
      cooperative_id: selectedCoop!.id,
      organisation_id: orgId,
      report_type: config.report_type,
      auto_generate: config.auto_generate,
      frequency: config.frequency,
      day_of_month: config.day_of_month,
      day_of_week: config.day_of_week,
      custom_prompt: config.custom_prompt,
    };
    let result;
    if (config.id) {
      result = await supabase.from('cooperative_report_configs').update(payload).eq('id', config.id);
    } else {
      result = await supabase.from('cooperative_report_configs').insert(payload);
    }
    if (result.error) { toast.error('Failed to save report config', extractError(result.error, 'You may not have permission to configure reports.')); return; }
    toast.success('Report configuration saved');
    loadConfigs();
  }

  const reportsForType = savedReports.filter(r => r.report_type === reportTab);
  const selectedReportTypeObj = REPORT_TYPES.find(r => r.key === reportTab);
  const currentConfig = configs.find(c => c.report_type === reportTab);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <CoopListSidebar
        cooperatives={cooperatives}
        loading={loading}
        search={search}
        setSearch={setSearch}
        selectedCoop={selectedCoop}
        setSelectedCoop={setSelectedCoop}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        communityFilter={communityFilter}
        setCommunityFilter={setCommunityFilter}
        regions={regions}
        communities={communities}
        coopPage={coopPage}
        setCoopPage={setCoopPage}
        totalPages={totalPages}
        totalCoops={totalCoops}
        canReorder={canReorder}
        onMoveCoop={onMoveCoop}
        onReorderCoops={onReorderCoops}
      />
      <div className="lg:col-span-2">
        {selectedCoop ? (
          <div className="space-y-4">
            {/* Cooperative name + tab header */}
            <div className="bg-cropguard-forest rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold">Reports for {selectedCoop.name}</h2>
              </div>
              <p className="text-xs text-white/60 ml-10">
                {selectedCoop.community_name ? `${selectedCoop.community_name}` : ''}
                {selectedCoop.region ? ` · ${selectedCoop.region}` : ''}
                {selectedCoop.member_count ? ` · ${selectedCoop.member_count} members` : ''}
                {` · Created ${new Date(selectedCoop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
            </div>

            {/* Report type tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {REPORT_TYPES.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setReportTab(r.key); setActiveReport(null); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    reportTab === r.key
                      ? 'bg-cropguard-forest text-white shadow-md'
                      : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200 hover:shadow-sm'
                  )}
                >
                  <r.icon className="w-3.5 h-3.5" />
                  {r.label}
                </button>
              ))}
            </div>

            {/* Generate + config bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-cropguard-forest/10 rounded-lg flex items-center justify-center">
                    {selectedReportTypeObj && <selectedReportTypeObj.icon className="w-4 h-4 text-cropguard-forest" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedReportTypeObj?.label}</h3>
                    <p className="text-xs text-gray-500">{selectedReportTypeObj?.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button onClick={() => setShowConfig(s => !s)} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Auto-Gen
                    </Button>
                  )}
                  <Button onClick={() => setShowPrompt(s => !s)} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> Custom Prompt
                  </Button>
                  <Button onClick={() => generateReport()} disabled={generating} size="sm" className="h-8 text-xs gap-1.5">
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate
                  </Button>
                </div>
              </div>

              {/* Custom prompt */}
              {showPrompt && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <Label className="text-xs">Custom Prompt for {selectedReportTypeObj?.label}</Label>
                  <Textarea
                    value={reportPrompt}
                    onChange={e => setReportPrompt(e.target.value)}
                    placeholder="e.g. Focus on compliance gaps and upcoming renewal deadlines..."
                    className="text-sm"
                    rows={2}
                  />
                  <Button onClick={() => generateReport(reportPrompt)} disabled={generating || !reportPrompt.trim()} size="sm" className="h-8 text-xs gap-1.5">
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate with Custom Prompt
                  </Button>
                </div>
              )}

              {/* Auto-gen config */}
              {showConfig && canEdit && (
                <ReportConfigForm
                  reportType={reportTab}
                  reportLabel={selectedReportTypeObj?.label ?? reportTab}
                  existing={currentConfig}
                  onSave={saveConfig}
                  onClose={() => setShowConfig(false)}
                />
              )}

              {currentConfig?.auto_generate && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl p-2.5 text-xs">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Auto-generation: {currentConfig.frequency}
                  {currentConfig.last_generated_at && ` · Last: ${new Date(currentConfig.last_generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>

            {/* Saved reports for this type */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Saved Reports {reportsForType.length > 0 && `(${reportsForType.length})`}
              </h4>
              {reportsLoading ? (
                <Skeleton className="h-20 w-full rounded-xl" />
              ) : reportsForType.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No saved reports for this type yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reportsForType.map(r => (
                    <div
                      key={r.id}
                      className={cn(
                        'group w-full bg-gray-50 rounded-xl border p-3 text-left transition-all',
                        activeReport?.id === r.id ? 'border-cropguard-mint shadow-md ring-1 ring-cropguard-mint/30' : 'border-gray-100 hover:shadow-md'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          {editingTitleId === r.id ? (
                            <input
                              autoFocus
                              value={editingTitleValue}
                              onChange={e => setEditingTitleValue(e.target.value)}
                              onBlur={() => saveTitle(r, editingTitleValue)}
                              onKeyDown={e => { if (e.key === 'Enter') saveTitle(r, editingTitleValue); if (e.key === 'Escape') setEditingTitleId(null); }}
                              className="text-sm font-medium text-gray-900 bg-white border border-cropguard-mint rounded px-2 py-0.5 flex-1 outline-none"
                            />
                          ) : (
                            <button onClick={() => setActiveReport(r)} className="flex-1 min-w-0 text-left">
                              <span className="text-sm font-medium text-gray-900 truncate block">{r.title}</span>
                            </button>
                          )}
                          {editingTitleId !== r.id && canEdit && (
                            <button
n                              onClick={() => { setEditingTitleId(r.id); setEditingTitleValue(r.title); }}
                              className="p-1 text-gray-300 hover:text-cropguard-forest opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {r.generated_by && <p className="text-xs text-gray-400 mt-1 ml-6">by {r.generated_by}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active report viewer */}
            {activeReport && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {editingTitleId === activeReport.id ? (
                      <input
                        autoFocus
                        value={editingTitleValue}
                        onChange={e => setEditingTitleValue(e.target.value)}
                        onBlur={() => saveTitle(activeReport, editingTitleValue)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTitle(activeReport, editingTitleValue); if (e.key === 'Escape') setEditingTitleId(null); }}
                        className="text-sm font-semibold text-gray-900 bg-white border border-cropguard-mint rounded px-2 py-0.5 flex-1 outline-none"
                      />
                    ) : (
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{activeReport.title}</h3>
                    )}
                    {editingTitleId !== activeReport.id && canEdit && (
                      <button
                        onClick={() => { setEditingTitleId(activeReport.id); setEditingTitleValue(activeReport.title); }}
                        className="p-1 text-gray-300 hover:text-cropguard-forest shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => setActiveReport(null)} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  {activeReport.content.split('\n').filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
                  ))}
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-gray-50 mt-3">
                  <p className="text-xs text-gray-400">
                    Generated on {new Date(activeReport.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {activeReport.generated_by && <p className="text-xs text-gray-400">by {activeReport.generated_by}</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a cooperative from the list</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ReportConfig {
  id: string;
  cooperative_id: string;
  report_type: string;
  auto_generate: boolean;
  frequency: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
  custom_prompt: string | null;
  last_generated_at: string | null;
}

function ReportConfigForm({ reportType, reportLabel, existing, onSave, onClose }: {
  reportType: string;
  reportLabel: string;
  existing?: ReportConfig;
  onSave: (c: ReportConfig) => void;
  onClose: () => void;
}) {
  const [autoGenerate, setAutoGenerate] = useState(existing?.auto_generate ?? false);
  const [frequency, setFrequency] = useState(existing?.frequency ?? 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState(String(existing?.day_of_month ?? 1));
  const [dayOfWeek, setDayOfWeek] = useState(String(existing?.day_of_week ?? 1));
  const [customPrompt, setCustomPrompt] = useState(existing?.custom_prompt ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({
      id: existing?.id ?? '',
      cooperative_id: '',
      report_type: reportType,
      auto_generate: autoGenerate,
      frequency: autoGenerate ? frequency : null,
      day_of_month: autoGenerate && (frequency === 'monthly' || frequency === 'quarterly') ? Number(dayOfMonth) : null,
      day_of_week: autoGenerate && frequency === 'weekly' ? Number(dayOfWeek) : null,
      custom_prompt: customPrompt || null,
      last_generated_at: existing?.last_generated_at ?? null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Auto-Generate: {reportLabel}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="auto-gen" checked={autoGenerate} onChange={e => setAutoGenerate(e.target.checked)} className="rounded" />
        <Label htmlFor="auto-gen" className="text-xs cursor-pointer">Enable automatic generation</Label>
      </div>
      {autoGenerate && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency === 'monthly' || frequency === 'quarterly' ? (
            <div>
              <Label className="text-xs">Day of Month</Label>
              <Input type="number" min={1} max={31} value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} className="h-9 text-sm" />
            </div>
          ) : frequency === 'weekly' ? (
            <div>
              <Label className="text-xs">Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="col-span-2">
            <Label className="text-xs">Custom Prompt (optional)</Label>
            <Textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Override the default prompt for auto-generated reports..." className="text-sm" rows={2} />
          </div>
        </div>
      )}
      <Button onClick={save} disabled={saving} size="sm" className="h-9 text-sm gap-1.5 w-full">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
        Save Configuration
      </Button>
    </div>
  );
}

// ── Training Tab ──────────────────────────────────────────────────────────────

interface CoopTrainingSession {
  id: string;
  title: string;
  description: string;
  session_type: 'in_person' | 'online';
  crop_type: string | null;
  cohort_id: string | null;
  program_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  meeting_link: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

function TrainingTab({ coopId, orgId }: { coopId: string; orgId: string }) {
  const [sessions, setSessions] = useState<CoopTrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, title, description, session_type, crop_type, cohort_id, program_id, scheduled_date, start_time, end_time, location, meeting_link, status')
        .eq('cooperative_id', coopId)
        .order('scheduled_date', { ascending: false });
      if (error) { setSessions([]); setLoading(false); return; }
      setSessions((data ?? []) as CoopTrainingSession[]);
      setLoading(false);
    })();
  }, [coopId, orgId]);

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const past = sessions.filter(s => s.status !== 'scheduled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-cropguard-forest">Training Sessions</h3>
          <p className="text-xs text-gray-500 mt-0.5">Training sessions linked to this cooperative.</p>
        </div>
        <a href="/staff/training-config?section=sessions"
           className="flex items-center gap-1.5 text-xs font-semibold text-cropguard-forest hover:underline">
          <GraduationCap className="w-3.5 h-3.5" />
          Manage in Training Config
        </a>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10">
          <GraduationCap className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No training sessions linked to this cooperative yet.</p>
          <p className="text-xs text-gray-400 mt-1">Create a session in Training Config and select this cooperative.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Upcoming</p>
              {upcoming.map(s => <CoopSessionCard key={s.id} session={s} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Past & Completed</p>
              {past.map(s => <CoopSessionCard key={s.id} session={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CoopSessionCard({ session }: { session: CoopTrainingSession }) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const date = new Date(session.scheduled_date + 'T00:00:00');
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-cropguard-forest">{session.title}</p>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', statusColors[session.status])}>
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </span>
      </div>
      {session.description && <p className="text-xs text-gray-500 mb-2">{session.description}</p>}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
        {session.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.start_time}</span>}
        {session.session_type === 'online' ? (
          <span className="flex items-center gap-1"><Video className="w-3 h-3" />Online</span>
        ) : (
          session.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.location}</span>
        )}
        {session.crop_type && <span className="capitalize">{session.crop_type}</span>}
      </div>
    </div>
  );
}
