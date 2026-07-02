import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, ChevronDown, CheckCircle, XCircle,
  AlertTriangle, Zap,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { NorviOutput } from '@/components/NorviOutput';
import {
  FRIScoreCard, PillarBar, WeekStatusChip, ScoreStatusBadge, ZoneBadge,
  RecommendationBadge, RiskBandBadge, RiskFlagBadge,
} from '@/components/intelligence/Badges';
import {
  enrichFarmer, deriveTrajectory,
  type PortfolioFarmer, type FriZone,
} from '@/components/intelligence/types';

interface FriWeekScore {
  id:            string;
  week_number:   number;
  total_score:   number;
  p1_score:      number;
  p2_score:      number;
  p3_score:      number;
  p4_score:      number;
  eci_score:     number;
  credit_score:  number | null;
  zone:          FriZone | null;
  score_status:  string;
  is_provisional: boolean;
  season_average: number | null;
  created_at:    string;
}

interface RiskFlag {
  id:          string;
  flag_type:   string;
  severity:    string;
  description: string;
  is_resolved: boolean;
  created_at:  string;
}

interface InterventionCatalog {
  id:                 string;
  name:               string;
  type:               string;
  description:        string | null;
  value_description:  string | null;
  min_fri:            number;
  eligibility_rules:  Array<{ field: string; operator: string; value: number; label: string }>;
  capacity:           number | null;
  partner_id:         string | null;
}

interface EligibilityResult {
  intervention_id:    string;
  eligible:           boolean;
  fri_gap:            number | null;
  failed_rules:       Array<{ label: string; current: number; required: number; operator: string }>;
}

const PILLAR_LABELS = ['Agronomy Readiness', 'CSA & Climate-Smart', 'Advisory & Commitment', 'Farm Enterprise'];
const PILLAR_MAX    = [30, 30, 20, 20];
const PILLAR_KEYS   = ['p1_score', 'p2_score', 'p3_score', 'p4_score'] as const;

type ViewMode = 'current' | 'baseline' | `week_${number}`;

export default function FarmerDetailPage() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();

  const [farmer,        setFarmer]        = useState<PortfolioFarmer | null>(null);
  const [weekScores,    setWeekScores]    = useState<FriWeekScore[]>([]);
  const [baseline,      setBaseline]      = useState<FriWeekScore | null>(null);
  const [riskFlags,     setRiskFlags]     = useState<RiskFlag[]>([]);
  const [interventions, setInterventions] = useState<InterventionCatalog[]>([]);
  const [eligibility,   setEligibility]   = useState<EligibilityResult[]>([]);
  const [viewMode,      setViewMode]      = useState<ViewMode>('current');
  const [activeWeek,    setActiveWeek]    = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [expandedOpp,   setExpandedOpp]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!farmerId) return;
    setLoading(true);
    const [farmerRes, scoresRes, baselineRes, flagsRes] = await Promise.all([
      supabase.rpc('get_portfolio_farmers', { p_program_id: null, p_cohort_id: null } as never),
      (supabase as any).from('farmer_fri_scores')
        .select('*').eq('farmer_id', farmerId).gt('week_number', 0).order('week_number'),
      (supabase as any).from('farmer_fri_scores')
        .select('*').eq('farmer_id', farmerId).eq('week_number', 0).maybeSingle(),
      (supabase as any).from('risk_flags')
        .select('*').eq('farmer_id', farmerId).eq('is_resolved', false),
    ]);

    const farmerRow = ((farmerRes.data ?? []) as PortfolioFarmer[]).find(f => f.farmer_id === farmerId);
    if (farmerRow) setFarmer(enrichFarmer(farmerRow));
    setWeekScores((scoresRes.data ?? []) as FriWeekScore[]);
    setBaseline(baselineRes.data as FriWeekScore | null);
    setRiskFlags((flagsRes.data ?? []) as RiskFlag[]);

    // Load interventions for the farmer's program
    if (farmerRow?.program_id) {
      const { data: intData } = await (supabase as any)
        .from('interventions_catalog')
        .select('*')
        .eq('program_id', farmerRow.program_id)
        .eq('status', 'Active');
      setInterventions((intData ?? []) as InterventionCatalog[]);

      // Check eligibility via edge function
      const { data: eligData } = await (supabase as any).functions.invoke('check-eligibility', {
        body: { farmer_id: farmerId, program_id: farmerRow.program_id },
      });
      if (eligData?.results) setEligibility(eligData.results as EligibilityResult[]);
    }

    setLoading(false);
  }, [farmerId]);

  useEffect(() => { load(); }, [load]);

  // Derived: which score to display
  const displayScore: FriWeekScore | null = (() => {
    if (viewMode === 'baseline') return baseline;
    if (viewMode === 'current') {
      return weekScores.length > 0 ? weekScores[weekScores.length - 1] : null;
    }
    const wn = parseInt(viewMode.replace('week_', ''));
    return weekScores.find(s => s.week_number === wn) ?? null;
  })();

  const sparklineData = Array.from({ length: 12 }, (_, i) => {
    const wn = i + 1;
    const w = weekScores.find(s => s.week_number === wn);
    return {
      week: `W${wn}`,
      score: w?.total_score ?? null,
      status: w ? (w.is_provisional ? 'provisional' : 'final') : 'pending',
    };
  });

  const activeHighFlags = riskFlags.filter(f => f.severity === 'high').length;

  // Eligibility helper
  function getEligibility(intId: string): EligibilityResult | undefined {
    return eligibility.find(e => e.intervention_id === intId);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Farmer not found or access denied.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 hover:underline text-sm">Go back</button>
      </div>
    );
  }

  const trajectory = deriveTrajectory(farmer);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to list
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar / photo */}
          <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-2xl font-bold text-emerald-700">
            {farmer.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{farmer.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{farmer.asinyo_id} · {farmer.community}, {farmer.district}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <ZoneBadge zone={farmer.zone} />
              <RecommendationBadge recommendation={farmer.recommendation ?? null} />
              <RiskBandBadge band={farmer.risk_band ?? null} />
              <RiskFlagBadge activeCount={farmer.active_flag_count} highCount={farmer.high_flag_count} />
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-gray-400">Program</p>
            <p className="text-sm font-semibold text-gray-800">{farmer.program_name}</p>
            <p className="text-xs text-gray-400">{farmer.cohort_name ?? '—'}</p>
          </div>
        </div>

        {/* Score cards row */}
        <div className="grid md:grid-cols-3 gap-4 mt-5">
          <FRIScoreCard
            score={farmer.total_score}
            zone={farmer.zone}
            trajectory={trajectory}
            isProvisional={farmer.is_provisional}
            baseline={farmer.baseline_score}
          />
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit Score</p>
            <p className="text-3xl font-black text-gray-900">{farmer.credit_score ?? '—'}</p>
            <div className="flex gap-2 flex-wrap">
              <RiskBandBadge band={farmer.risk_band ?? null} />
              <RecommendationBadge recommendation={farmer.recommendation ?? null} />
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ECI Score</p>
            <p className="text-3xl font-black text-gray-900">
              {farmer.eci_score?.toFixed(0) ?? '—'}<span className="text-base font-normal text-gray-400">/40</span>
            </p>
            <ScoreStatusBadge status={farmer.is_provisional ? 'provisional' : 'final'} />
            <p className="text-xs text-gray-500">
              Weeks: <b>{farmer.weeks_final}</b> Final + <b>{farmer.weeks_provisional}</b> Prov.
            </p>
          </div>
        </div>
      </div>

      {/* FRI View Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">View:</p>
        {([
          { key: 'current',  label: 'Current Season' },
          { key: 'baseline', label: 'Baseline' },
          ...weekScores.map(s => ({ key: `week_${s.week_number}` as ViewMode, label: `Week ${s.week_number}` })),
        ] as { key: ViewMode; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setViewMode(key); if (key.startsWith('week_')) setActiveWeek(parseInt(key.replace('week_', ''))); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              viewMode === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pillar Scores */}
      {displayScore && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pillar Scores — {viewMode === 'current' ? 'Current Season' : viewMode === 'baseline' ? 'Baseline' : `Week ${displayScore.week_number}`}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {PILLAR_KEYS.map((k, i) => (
              <PillarBar
                key={k}
                label={`P${i + 1} · ${PILLAR_LABELS[i]}`}
                value={displayScore[k] ?? 0}
                max={PILLAR_MAX[i]}
                pillarIndex={i}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Season Sparkline + Week Strip */}
      <Card>
        <CardHeader><CardTitle className="text-base">Season Progress (Weeks 1–12)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sparklineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number | null) => v != null ? [`${v.toFixed(1)}`, 'FRI'] : ['—', 'FRI']} />
              {baseline && (
                <ReferenceLine y={baseline.total_score} stroke="#9ca3af" strokeDasharray="6 3"
                  label={{ value: `Baseline ${baseline.total_score?.toFixed(0)}`, position: 'insideTopLeft', fontSize: 10, fill: '#9ca3af' }}
                />
              )}
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 2" />
              <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="4 2" />
              <Line
                type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5}
                dot={(props) => {
                  const d = sparklineData[props.index];
                  const c = d.status === 'final' ? '#10b981' : d.status === 'provisional' ? '#f59e0b' : '#d1d5db';
                  return <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={c} stroke="white" strokeWidth={1.5} />;
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Week strip */}
          <div className="flex gap-1.5 flex-wrap">
            {sparklineData.map((w, i) => {
              const ws = weekScores.find(s => s.week_number === i + 1);
              return (
                <WeekStatusChip
                  key={i}
                  weekNum={i + 1}
                  score={ws?.total_score ?? null}
                  status={w.status}
                  active={activeWeek === i + 1}
                  onClick={() => {
                    setActiveWeek(i + 1);
                    setViewMode(`week_${i + 1}`);
                  }}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Norvi AI Credit Output */}
      {farmer.latest_score_id && (
        <NorviOutput
          farmerId={farmerId!}
          weekNumber={activeWeek ?? farmer.week_number}
          friScoreId={farmer.latest_score_id}
          outputType="credit_brief"
          autoFetch
        />
      )}

      {/* Active Risk Flags */}
      {riskFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Active Risk Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Flag Type', 'Severity', 'Description', 'Triggered'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskFlags.map(f => (
                    <tr key={f.id} className={cn('border-b border-gray-50', f.severity === 'high' ? 'bg-red-50/50' : 'bg-amber-50/30')}>
                      <td className="px-4 py-3 font-medium text-gray-800">{f.flag_type}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                          f.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{f.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunity Eligibility Panel */}
      {interventions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            Opportunity Eligibility
          </h2>

          {/* FRI threshold bar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">FRI Threshold Comparison</p>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="bg-red-200"    style={{ width: '40%' }} />
                  <div className="bg-amber-200"  style={{ width: '20%' }} />
                  <div className="bg-blue-200"   style={{ width: '20%' }} />
                  <div className="bg-emerald-200" style={{ flex: 1 }} />
                </div>
                {/* Threshold ticks */}
                {interventions.map(int => (
                  <div
                    key={int.id}
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-600"
                    style={{ left: `${int.min_fri}%` }}
                    title={`${int.name}: FRI ${int.min_fri}`}
                  >
                    <div className="absolute -bottom-5 text-[9px] text-gray-600 whitespace-nowrap transform -translate-x-1/2">
                      {int.min_fri}
                    </div>
                  </div>
                ))}
                {/* Farmer marker */}
                <div
                  className={cn(
                    'absolute top-1 bottom-1 w-3 rounded-full border-2 border-white shadow-md transform -translate-x-1/2',
                    farmer.total_score >= 60 ? 'bg-emerald-500' : farmer.total_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ left: `${Math.min(100, farmer.total_score)}%` }}
                  title={`Farmer FRI: ${farmer.total_score}`}
                />
              </div>
              <p className="text-xs text-gray-400 mt-6">Farmer FRI: <b className="text-gray-800">{farmer.total_score?.toFixed(0)}</b></p>
            </CardContent>
          </Card>

          {/* Opportunity cards sorted: eligible first */}
          {[...interventions].sort((a, b) => {
            const ae = getEligibility(a.id)?.eligible;
            const be = getEligibility(b.id)?.eligible;
            if (ae && !be) return -1;
            if (!ae && be) return 1;
            return (a.min_fri - b.min_fri);
          }).map(int => {
            const elig = getEligibility(int.id);
            const eligible = elig?.eligible ?? (farmer.total_score >= int.min_fri);
            const gap = elig?.fri_gap;
            const failedRules = elig?.failed_rules ?? [];
            const expanded = expandedOpp === int.id;

            const typeColors: Record<string, string> = {
              'Input Loan':      'bg-blue-100 text-blue-800',
              'Grant':           'bg-emerald-100 text-emerald-800',
              'Insurance':       'bg-slate-100 text-slate-800',
              'Market Linkage':  'bg-teal-100 text-teal-800',
              'Advisory':        'bg-orange-100 text-orange-800',
              'Training':        'bg-cyan-100 text-cyan-800',
              'Recovery':        'bg-red-100 text-red-800',
            };

            return (
              <div
                key={int.id}
                className={cn(
                  'bg-white rounded-xl border-2 overflow-hidden transition-all',
                  eligible ? 'border-emerald-200' : 'border-gray-200'
                )}
              >
                {/* Summary row */}
                <button
                  onClick={() => setExpandedOpp(expanded ? null : int.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <span className={cn('inline-flex text-xs font-semibold px-2 py-0.5 rounded-full shrink-0', typeColors[int.type] ?? 'bg-gray-100 text-gray-600')}>
                    {int.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{int.name}</p>
                    {int.value_description && <p className="text-xs text-gray-500">{int.value_description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {eligible
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Eligible
                        </span>
                      : <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Not Eligible
                        </span>
                    }
                    {int.capacity && <span className="text-xs text-gray-400">{int.capacity} spots</span>}
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} />
                  </div>
                </button>

                {/* Expanded rules */}
                {expanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">{int.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {(int.eligibility_rules ?? []).map((rule, ri) => {
                        const failed = failedRules.some(fr => fr.label === rule.label);
                        return (
                          <span
                            key={ri}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border',
                              failed
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {failed ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {rule.label}
                            {failed && failedRules.find(fr => fr.label === rule.label) && (
                              <span className="ml-1 opacity-70">
                                {failedRules.find(fr => fr.label === rule.label)?.current?.toFixed(0)}
                                {' '}/{' '}
                                {rule.operator} {rule.value}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                    {!eligible && gap != null && (
                      <div className="bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 font-medium">
                          {gap.toFixed(0)} FRI points needed to qualify
                        </p>
                      </div>
                    )}
                    {/* Norvi eligibility insight for ineligible */}
                    {!eligible && farmer.latest_score_id && (
                      <NorviOutput
                        farmerId={farmerId!}
                        weekNumber={farmer.week_number}
                        friScoreId={farmer.latest_score_id}
                        outputType="opportunity"
                        compact
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
