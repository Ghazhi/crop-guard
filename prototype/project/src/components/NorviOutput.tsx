import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Brain, AlertCircle, CheckCircle, Clock, Sparkles, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getCachedNorvi, triggerNorvi, getSavedNorviReports, deleteSavedNorviReport } from '@/lib/norvi';
import type { NorviOutputType, NorviResult, SavedNorviReport } from '@/lib/norvi';
import { cn } from '@/lib/utils';

interface NorviOutputProps {
  farmerId:    string;
  weekNumber:  number;
  friScoreId:  string;
  outputType:  NorviOutputType;
  autoFetch?:  boolean;
  compact?:    boolean;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 bg-gray-200 rounded w-4/5" />
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

function ProvBadge({ provisional }: { provisional: boolean }) {
  return provisional ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock className="w-2.5 h-2.5" /> Provisional
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cropguard-mint text-cropguard-forest">
      <CheckCircle className="w-2.5 h-2.5" /> Final
    </span>
  );
}

function renderContent(content: string, type: NorviOutputType) {
  if (type === 'farmer_summary') {
    return <p className="text-sm text-cropguard-forest leading-relaxed">{content}</p>;
  }
  if (type === 'agent_report') {
    const lines = content.split('\n').filter(Boolean);
    return (
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cropguard-green shrink-0" />
            <span className="leading-relaxed">{line.replace(/^[-•*]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  // credit_brief or custom — render paragraphs
  const paras = content.split('\n\n').filter(Boolean);
  if (paras.length <= 1) {
    const lines = content.split('\n').filter(Boolean);
    return (
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cropguard-green shrink-0" />
            <span className="leading-relaxed">{line.replace(/^[-•*]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-3">
      {paras.map((p, i) => (
        <p key={i} className="text-sm text-gray-700 leading-relaxed">{p}</p>
      ))}
    </div>
  );
}

export function NorviOutput({ farmerId, weekNumber, friScoreId, outputType, autoFetch, compact }: NorviOutputProps) {
  const [result, setResult]           = useState<NorviResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedNorviReport[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [reportsOpen, setReportsOpen]   = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      if (!forceRefresh) {
        const cached = await getCachedNorvi({ farmer_id: farmerId, week_number: weekNumber, output_type: outputType });
        if (cached) { setResult(cached); setLoading(false); return; }
      }
      const fresh = await triggerNorvi({ farmer_id: farmerId, week_number: weekNumber, fri_score_id: friScoreId, output_type: outputType });
      if (fresh) { setResult(fresh); } else { setError('Unable to generate interpretation. Please try again.'); }
    } catch {
      setError('Network error. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [farmerId, weekNumber, friScoreId, outputType]);

  const loadSavedReports = useCallback(async () => {
    const reports = await getSavedNorviReports(farmerId);
    setSavedReports(reports);
  }, [farmerId]);

  useEffect(() => {
    if (autoFetch) load();
  }, [autoFetch, load]);

  useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]);

  const handleGenerateCustom = async () => {
    const trimmed = customPrompt.trim();
    if (!trimmed) return;
    setGeneratingCustom(true);
    setError('');
    try {
      const fresh = await triggerNorvi({
        farmer_id:     farmerId,
        week_number:   weekNumber,
        fri_score_id:  friScoreId,
        output_type:   outputType,
        custom_prompt: trimmed,
      });
      if (fresh) {
        setResult(fresh);
        setCustomPrompt('');
        await loadSavedReports();
      } else {
        setError('Unable to generate report. Please try again.');
      }
    } catch {
      setError('Network error. Check your connection and retry.');
    } finally {
      setGeneratingCustom(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const ok = await deleteSavedNorviReport(reportId);
    if (ok) {
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
    }
  };

  const toggleReport = (id: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const outputLabels: Record<NorviOutputType, string> = {
    farmer_summary: 'Farm Summary',
    agent_report:   'Field Report',
    credit_brief:   'Credit Brief',
    opportunity:    'Opportunity',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
      <div className="bg-cropguard-forest px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cropguard-mint rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-cropguard-forest" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Norvi AI · {outputLabels[outputType]}</p>
            <p className="text-[10px] text-white/50">Week {weekNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && <ProvBadge provisional={result.is_provisional} />}
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-white', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Standard report */}
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-600">{error}</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => load(true)}>
                Retry
              </Button>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-3">
            {renderContent(result.content, outputType)}
            <p className="text-[10px] text-gray-400 text-right">
              {new Date(result.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-3">No interpretation generated yet.</p>
            <Button size="sm" onClick={() => load()} disabled={loading} className="gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Generate
            </Button>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Custom prompt section */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cropguard-forest" />
            <p className="text-xs font-semibold text-gray-700">Custom Prompt</p>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Write your own instructions for the AI. The farmer's FRI score data will be appended automatically.
          </p>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Analyse this farmer's risk factors and suggest 3 specific interventions to improve their creditworthiness..."
            className="text-xs min-h-[80px] resize-y"
            disabled={generatingCustom}
          />
          <Button
            size="sm"
            onClick={handleGenerateCustom}
            disabled={generatingCustom || !customPrompt.trim()}
            className="gap-1.5 w-full"
          >
            {generatingCustom ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Generate Custom Report
              </>
            )}
          </Button>
        </div>

        {/* Saved reports */}
        {savedReports.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setReportsOpen(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Saved Custom Reports ({savedReports.length})
              </span>
              {reportsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {reportsOpen && (
              <div className="mt-2 space-y-2">
                {savedReports.map((report) => {
                  const expanded = expandedReports.has(report.id);
                  return (
                    <div key={report.id} className="rounded-lg border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50">
                        <button
                          onClick={() => toggleReport(report.id)}
                          className="flex items-center gap-1.5 text-left flex-1 min-w-0"
                        >
                          {expanded
                            ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                            : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
                          <span className="text-[11px] font-medium text-gray-600 truncate">
                            {report.custom_prompt?.slice(0, 60) ?? 'Untitled'}...
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] text-gray-400">
                            {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50 transition-colors"
                            title="Delete report"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="px-3 py-2 space-y-2">
                          <div className="text-[10px] text-gray-400 bg-amber-50 rounded px-2 py-1.5 leading-relaxed">
                            <span className="font-semibold">Prompt: </span>
                            {report.custom_prompt}
                          </div>
                          <div className="text-xs text-gray-700 leading-relaxed">
                            {renderContent(report.content, report.output_type)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
