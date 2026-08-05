import { useState, useEffect, useCallback } from 'react';
import { Search, ClipboardCheck, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Pagination } from '../../components/ui/pagination';

interface Checkin {
  id:           string;
  farmer_name:  string;
  week_number:  number;
  status:       string;
  is_verified:  boolean;
  help_requested: boolean;
  challenge_notes: string | null;
  created_at:   string;
  checkin_template_id: string | null;
}

interface ResponseRow {
  activity_code:   string;
  label:           string;
  description:     string | null;
  pillar:          string;
  farmer_response: string | null;
  agent_response:  string | null;
  evidence_url:    string | null;
}

const STATUS_STYLES: Record<string, string> = {
  approved:  'bg-emerald-100 text-emerald-700',
  submitted: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
  verified:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved:  <CheckCircle className="w-3 h-3" />,
  submitted: <Clock className="w-3 h-3" />,
  verified:  <CheckCircle className="w-3 h-3" />,
  rejected:  <XCircle className="w-3 h-3" />,
};

const PILLAR_LABELS: Record<string, string> = {
  p1: 'P1 — Agronomy',
  p2: 'P2 — Climate-Smart',
  p3: 'P3 — Advisory',
  p4: 'P4 — Enterprise',
};

const BASE_PAGE_SIZE = 10;

function ResponseChip({ response }: { response: string | null }) {
  const style =
    response === 'yes'     ? 'bg-green-100 text-green-700' :
    response === 'partial' ? 'bg-amber-100 text-amber-700' :
    response === 'no'      ? 'bg-red-100 text-red-700'    :
    response === 'verified' ? 'bg-emerald-100 text-emerald-700' :
    response === 'not_verified' ? 'bg-red-100 text-red-700' :
    response === 'under_review' ? 'bg-amber-100 text-amber-700' :
                             'bg-gray-100 text-gray-500';
  return (
    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize', style)}>
      {response ?? '—'}
    </span>
  );
}

export default function AgronomistCheckinsPage() {
  const [checkins,     setCheckins]     = useState<Checkin[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [responses,    setResponses]    = useState<Record<string, ResponseRow[]>>({});
  const [loadingResps, setLoadingResps] = useState<string | null>(null);
  const [page,         setPage]         = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('farmer_checkins')
        .select('id, week_number, status, is_verified, help_requested, challenge_notes, created_at, checkin_template_id, farmer:farmers(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);

      const { data } = await q;
      let rows: Checkin[] = (data ?? []).map((c: any) => ({
        id:              c.id,
        farmer_name:     (c.farmer as any)?.full_name ?? '—',
        week_number:     c.week_number,
        status:          c.status,
        is_verified:     c.is_verified ?? false,
        help_requested:  c.help_requested ?? false,
        challenge_notes: c.challenge_notes ?? null,
        created_at:      c.created_at,
        checkin_template_id: c.checkin_template_id ?? null,
      }));

      if (query.trim()) {
        const q2 = query.toLowerCase();
        rows = rows.filter(r => r.farmer_name.toLowerCase().includes(q2));
      }

      setCheckins(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const [loadAll, setLoadAll] = useState(false);
  const pageSize = loadAll ? checkins.length : BASE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(checkins.length / pageSize));
  const pagedCheckins = checkins.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [query, statusFilter]);

  const loadResponses = useCallback(async (checkinId: string, templateId: string | null, weekNumber: number) => {
    setLoadingResps(checkinId);
    try {
      const { data: rawResps } = await (supabase.from('farmer_checkin_responses') as any)
        .select('activity_code, pillar, farmer_response, agent_response, evidence_url')
        .eq('checkin_id', checkinId);

      let labelMap: Record<string, { label: string; description: string | null; pillar: string }> = {};

      if (templateId) {
        const { data: tplItems } = await supabase
          .from('checkin_template_items')
          .select('activity_code, label, description, component, week_number')
          .eq('checkin_template_id', templateId)
          .eq('is_active', true)
          .eq('week_number', weekNumber);

        const componentToPillar: Record<string, string> = {
          agronomy: 'p1', climate_smart: 'p2', advisory_commitment: 'p3', farm_enterprise: 'p4',
        };
        (tplItems ?? []).forEach((it: any) => {
          labelMap[it.activity_code || it.id] = {
            label: it.label,
            description: it.description,
            pillar: componentToPillar[it.component] ?? 'p1',
          };
        });
      }

      const rows: ResponseRow[] = (rawResps ?? []).map((r: any) => {
        const meta = labelMap[r.activity_code];
        return {
          activity_code:   r.activity_code,
          label:           meta?.label ?? r.activity_code,
          description:     meta?.description ?? null,
          pillar:          meta?.pillar ?? r.pillar ?? 'p1',
          farmer_response: r.farmer_response,
          agent_response:  r.agent_response,
          evidence_url:    r.evidence_url,
        };
      });

      setResponses(prev => ({ ...prev, [checkinId]: rows }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingResps(null);
    }
  }, []);

  const handleExpand = (checkin: Checkin, templateId: string | null) => {
    if (expanded === checkin.id) {
      setExpanded(null);
    } else {
      setExpanded(checkin.id);
      if (!responses[checkin.id]) {
        loadResponses(checkin.id, templateId, checkin.week_number);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check-ins</h1>
        <p className="text-sm text-gray-500 mt-1">Review weekly farmer check-in submissions.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search farmers…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-50 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          : checkins.length === 0
            ? (
              <div className="py-16 text-center">
                <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No check-ins found.</p>
              </div>
            )
            : checkins.map(c => {
              const ciResponses = responses[c.id];
              const isLoadingThis = loadingResps === c.id;
              const grouped = (ciResponses ?? []).reduce<Record<string, ResponseRow[]>>((acc, r) => {
                const key = r.pillar ?? 'p1';
                (acc[key] = acc[key] ?? []).push(r);
                return acc;
              }, {});

              return (
                <div key={c.id} className="border-b border-gray-50 last:border-0">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => handleExpand(c, c.checkin_template_id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-emerald-700 text-xs font-bold">{c.farmer_name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.farmer_name}</p>
                        <p className="text-xs text-gray-400">
                          Week {c.week_number}
                          {c.help_requested && <span className="ml-2 text-amber-600 font-semibold">· Help Requested</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.is_verified && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      <span className={cn(
                        'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
                        STATUS_STYLES[c.status] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {STATUS_ICON[c.status]}
                        {c.status}
                      </span>
                      {expanded === c.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {expanded === c.id && (
                    <div className="px-5 pb-5 bg-gray-50/50">
                      {isLoadingThis ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : ciResponses && ciResponses.length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(grouped).map(([pillar, items]) => (
                            <div key={pillar} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                  {PILLAR_LABELS[pillar] ?? pillar}
                                </p>
                              </div>
                              <div className="divide-y divide-gray-50">
                                {items.map(r => (
                                  <div key={r.activity_code} className="px-3 py-2.5 flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-800">{r.label}</p>
                                      {r.description && <p className="text-[10px] text-gray-400 mt-0.5">{r.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <ResponseChip response={r.farmer_response} />
                                      {r.agent_response && r.agent_response !== r.farmer_response && (
                                        <ResponseChip response={r.agent_response} />
                                      )}
                                      {r.evidence_url && (
                                        <img src={r.evidence_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {c.challenge_notes && (
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="text-xs font-semibold text-gray-400 mb-1">Challenge Notes</p>
                              <p className="text-sm text-gray-700">{c.challenge_notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">No response data available.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>
      {checkins.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={checkins.length} pageSize={pageSize} onLoadAll={() => { setLoadAll(true); setPage(1); }} onResetPaging={() => { setLoadAll(false); setPage(1); }} />
      )}
    </div>
  );
}
