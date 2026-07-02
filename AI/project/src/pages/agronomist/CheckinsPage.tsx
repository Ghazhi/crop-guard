import { useState, useEffect, useCallback } from 'react';
import { Search, ClipboardCheck, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Checkin {
  id:           string;
  farmer_name:  string;
  week_number:  number;
  status:       string;
  is_verified:  boolean;
  help_requested: boolean;
  challenge_notes: string | null;
  created_at:   string;
}

const STATUS_STYLES: Record<string, string> = {
  approved:  'bg-emerald-100 text-emerald-700',
  submitted: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
  rejected:  'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved:  <CheckCircle className="w-3 h-3" />,
  submitted: <Clock className="w-3 h-3" />,
  rejected:  <XCircle className="w-3 h-3" />,
};

export default function AgronomistCheckinsPage() {
  const [checkins,     setCheckins]     = useState<Checkin[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded,     setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('farmer_checkins')
        .select('id, week_number, status, is_verified, help_requested, challenge_notes, created_at, farmer:farmers(full_name)')
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
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
            : checkins.map(c => (
                <div key={c.id} className="border-b border-gray-50 last:border-0">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => setExpanded(p => p === c.id ? null : c.id)}
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
                      {c.challenge_notes ? (
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-400 mb-1">Challenge Notes</p>
                          <p className="text-sm text-gray-700">{c.challenge_notes}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No challenge notes recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              ))
        }
      </div>
    </div>
  );
}
