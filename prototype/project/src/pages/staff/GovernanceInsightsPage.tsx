import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, AlertCircle, Target, TrendingUp, Lightbulb,
  ClipboardList, Landmark, Users, Calendar, Gavel, Wallet, ShieldCheck,
  Truck, FileText, CheckCircle, Clock, Download, Search, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { useToast, extractError, extractFetchError } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InsightData {
  id: string;
  content: string;
  created_at: string;
  title: string | null;
  generated_by: string | null;
  output_type: string | null;
  scope: string;
  scope_id: string;
}

interface CoopLite {
  id: string;
  name: string;
}

export default function GovernanceInsightsPage() {
  const { profile } = useAuthStore();
  const toast = useToast();
  const orgId = profile?.organisation_id ?? '';
  const userName = profile?.full_name ?? 'Unknown';

  const [coops, setCoops] = useState<CoopLite[]>([]);
  const [selectedCoopId, setSelectedCoopId] = useState<string>('all');
  const [savedInsights, setSavedInsights] = useState<InsightData[]>([]);
  const [activeInsight, setActiveInsight] = useState<InsightData | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [statsOpen, setStatsOpen] = useState(() => localStorage.getItem('insights_stats_open') === 'true');
  const toggleStats = () => setStatsOpen(o => { const n = !o; localStorage.setItem('insights_stats_open', String(n)); return n; });
  const [loadingList, setLoadingList] = useState(true);
  const [stats, setStats] = useState<{
    coopCount: number; totalMembers: number; totalFarmers: number;
    meetingCount: number; resolutionCount: number; complianceCount: number;
    traceBatches: number; traceWeight: number;
  } | null>(null);

  const loadCoops = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from('cooperatives')
      .select('id, name')
      .eq('organisation_id', orgId)
      .order('name');
    setCoops((data as CoopLite[]) ?? []);
  }, [orgId]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    const [
      { count: coopCount },
      { data: coopData },
      { count: totalFarmers },
      { count: meetingCount },
      { count: resolutionCount },
      { count: complianceCount },
      { count: traceBatches },
      { data: traceData },
    ] = await Promise.all([
      supabase.from('cooperatives').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cooperatives').select('member_count').eq('organisation_id', orgId),
      supabase.from('farmers').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cooperative_meetings').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cooperative_resolutions').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cooperative_compliance').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cocoa_traceability_records').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('cocoa_traceability_records').select('batch_weight_kg').eq('organisation_id', orgId),
    ]);

    const totalMembers = (coopData ?? []).reduce((a: number, c: { member_count: number }) => a + (c.member_count ?? 0), 0);
    const traceWeight = (traceData ?? []).reduce((a: number, t: { batch_weight_kg: number }) => a + Number(t.batch_weight_kg), 0);

    setStats({
      coopCount: coopCount ?? 0,
      totalMembers,
      totalFarmers: totalFarmers ?? 0,
      meetingCount: meetingCount ?? 0,
      resolutionCount: resolutionCount ?? 0,
      complianceCount: complianceCount ?? 0,
      traceBatches: traceBatches ?? 0,
      traceWeight,
    });
  }, [orgId]);

  const loadInsights = useCallback(async () => {
    if (!orgId) { setSavedInsights([]); setLoadingList(false); return; }
    setLoadingList(true);
    let q = supabase
      .from('norvi_community_outputs')
      .select('id, content, created_at, title, generated_by, output_type, scope, scope_id')
      .eq('output_type', 'insight')
      .order('created_at', { ascending: false })
      .limit(50);

    if (selectedCoopId === 'all') {
      q = q.eq('scope', 'organisation').eq('scope_id', orgId);
    } else {
      q = q.eq('scope', 'cooperative').eq('scope_id', selectedCoopId);
    }

    const { data } = await q;
    setSavedInsights((data as InsightData[]) ?? []);
    setLoadingList(false);
  }, [orgId, selectedCoopId]);

  useEffect(() => { loadCoops(); loadStats(); }, [loadCoops, loadStats]);
  useEffect(() => { loadInsights(); setActiveInsight(null); }, [loadInsights]);

  async function generateInsight(prompt?: string) {
    setGenLoading(true);
    setError(null);
    setShowPrompt(false);
    try {
      const scope = selectedCoopId === 'all' ? 'organisation' : 'cooperative';
      const scopeId = selectedCoopId === 'all' ? orgId : selectedCoopId;
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/norvi-community-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          scope,
          scope_id: scopeId,
          org_id: orgId,
          custom_prompt: prompt || undefined,
          output_type: 'insight',
          generated_by: userName,
        }),
      });
      if (!res.ok) {
        const msg = await extractFetchError(res, 'Failed to generate insight');
        throw new Error(msg);
      }
      const data = await res.json() as InsightData;
      setActiveInsight(data);
      loadInsights();
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Stats overview */}
      {stats && (
        <div>
          <button
            onClick={toggleStats}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 hover:text-gray-700 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${statsOpen ? '' : '-rotate-90'}`} />
            Statistics
          </button>
          {statsOpen && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GovStatCard icon={Landmark} label="Cooperatives" value={stats.coopCount} />
              <GovStatCard icon={Users} label="Total Members" value={stats.totalMembers} />
              <GovStatCard icon={CheckCircle} label="Linked Farmers" value={stats.totalFarmers} />
              <GovStatCard icon={Calendar} label="Meetings" value={stats.meetingCount} />
              <GovStatCard icon={Gavel} label="Resolutions" value={stats.resolutionCount} />
              <GovStatCard icon={ShieldCheck} label="Certifications" value={stats.complianceCount} />
              <GovStatCard icon={Truck} label="Traceability Batches" value={stats.traceBatches} />
              <GovStatCard icon={Download} label="Total Batch Weight (kg)" value={stats.traceWeight.toLocaleString('en-GH')} />
            </div>
          )}
        </div>
      )}

      {/* Scope selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">Scope:</Label>
          <Select value={selectedCoopId} onValueChange={setSelectedCoopId}>
            <SelectTrigger className="h-9 text-sm w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cooperatives (Org-wide)</SelectItem>
              {coops.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Insight generator */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cropguard-mint to-cropguard-forest rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI-Generated Governance Insights</h3>
              <p className="text-xs text-gray-500">Analysis of governance health, compliance, traceability & recommended actions</p>
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

        {showPrompt && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
            <Label className="text-xs">Custom Prompt</Label>
            <Textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="e.g. Analyze governance risks, compliance gaps, and traceability coverage across cooperatives..."
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
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
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
            <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
              {activeInsight.created_at && (
                <p className="text-xs text-gray-400">
                  Generated on {new Date(activeInsight.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {activeInsight.generated_by && (
                <p className="text-xs text-gray-400">by {activeInsight.generated_by}</p>
              )}
            </div>
          </div>
        ) : !genLoading && !error ? (
          <div className="text-center py-10 text-gray-400">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Click "Generate Insights" to get AI-powered governance analysis</p>
          </div>
        ) : genLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : null}
      </div>

      {/* Saved insights list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Saved Insights {savedInsights.length > 0 && `(${savedInsights.length})`}
        </h4>
        {loadingList ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : savedInsights.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No saved insights yet.</p>
        ) : (
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
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {ins.generated_by && <span className="text-xs text-gray-400">by {ins.generated_by}</span>}
                    <span className="text-xs text-gray-400">{new Date(ins.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GovStatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
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
