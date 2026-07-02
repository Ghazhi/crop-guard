import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Brain, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCachedNorvi, triggerNorvi } from '@/lib/norvi';
import type { NorviOutputType, NorviResult } from '@/lib/norvi';

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
  // credit_brief — 3 paragraphs
  const paras = content.split('\n\n').filter(Boolean);
  return (
    <div className="space-y-3">
      {paras.map((p, i) => (
        <p key={i} className="text-sm text-gray-700 leading-relaxed">{p}</p>
      ))}
    </div>
  );
}

export function NorviOutput({ farmerId, weekNumber, friScoreId, outputType, autoFetch, compact }: NorviOutputProps) {
  const [result, setResult]   = useState<NorviResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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

  useEffect(() => {
    if (autoFetch) load();
  }, [autoFetch, load]);

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
            <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4">
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
      </div>
    </div>
  );
}
