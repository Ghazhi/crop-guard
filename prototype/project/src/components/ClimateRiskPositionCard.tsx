import { CloudRain, AlertTriangle, ShieldCheck, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FarmerClimateRisk } from '@/lib/exposure-data';
import { EXPOSURE_HIGH_THRESHOLD, FRI_HIGH_THRESHOLD } from '@/lib/exposure';

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  High:     { bg: 'bg-red-100',     text: 'text-red-700',     label: 'High Exposure' },
  Moderate: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Moderate Exposure' },
  Low:      { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Low Exposure' },
};

/**
 * Compact climate-risk position card. Shows the farmer's exposure tier,
 * quadrant label, and a plain-language recommendation — no scatter chart.
 *
 * `showComponents` reveals the E1–E4 breakdown (useful for agents).
 */
export function ClimateRiskPositionCard({
  risk,
  showComponents = false,
}: {
  risk: FarmerClimateRisk;
  showComponents?: boolean;
}) {
  const tier = TIER_STYLES[risk.exposureTier] ?? TIER_STYLES.Low;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${risk.quadrantColor}15` }}>
          <CloudRain className="w-3.5 h-3.5" style={{ color: risk.quadrantColor }} />
        </div>
        <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">
          Climate Risk Position
        </p>
      </div>

      {/* Displayed label — the single primary label */}
      <div className="rounded-xl p-3" style={{ backgroundColor: '#0E2419' }}>
        <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: risk.quadrantColor }}>
          {risk.cohortName}
        </p>
        <p className="font-serif text-base text-white leading-snug">
          {risk.displayedLabel}
        </p>
      </div>

      {/* Score chips */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">FRI Score</p>
          <p className="font-serif text-xl font-bold mt-0.5" style={{ color: '#3E7D5A' }}>{risk.friScore}</p>
          <p className="text-[10px] text-gray-500">{risk.friZone}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Exposure</p>
          <p className="font-serif text-xl font-bold mt-0.5" style={{ color: '#B04A2E' }}>{risk.exposureScore}</p>
          <span className={cn('inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5', tier.bg, tier.text)}>
            {tier.label}
          </span>
        </div>
      </div>

      {/* Quadrant label chip */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: risk.quadrantColor }} />
        <span className="text-xs font-semibold" style={{ color: risk.quadrantColor }}>
          {risk.quadrantLabel}
        </span>
      </div>

      {/* Thresholds note */}
      <p className="text-[10px] text-gray-400 leading-relaxed">
        Capacity threshold FRI ≥ {FRI_HIGH_THRESHOLD} &nbsp;·&nbsp; Exposure threshold ≥ {EXPOSURE_HIGH_THRESHOLD}
      </p>

      {/* E1–E4 breakdown (agent view) */}
      {showComponents && (
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-2">Exposure Components</p>
          {risk.exposureComponents.map(c => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-600">{c.key} — {c.label}</span>
                <span className="text-[10px] font-semibold text-gray-700">{c.raw} → {c.weighted.toFixed(1)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.raw}%`, backgroundColor: '#B04A2E' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="flex gap-2 items-start rounded-xl p-3" style={{ backgroundColor: `${risk.quadrantColor}08`, border: `1px solid ${risk.quadrantColor}25` }}>
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: risk.quadrantColor }} />
        <p className="text-[11px] text-gray-700 leading-relaxed">{risk.recommendation}</p>
      </div>

      {/* Norvi AI explanation */}
      <div className="flex gap-2 items-start bg-cropguard-mint border border-cropguard-pale rounded-xl p-3">
        <div className="w-6 h-6 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="w-3 h-3 text-cropguard-light" />
        </div>
        <p className="text-[11px] text-cropguard-forest leading-relaxed">{risk.explanation}</p>
      </div>
    </div>
  );
}

/**
 * Lightweight placeholder shown when no exposure data is available for the
 * farmer's cohort.
 */
export function ClimateRiskPlaceholder() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">
          Climate Risk Position
        </p>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        Climate exposure data for your cohort is not available yet. Once your
        cohort's hazard and rainfall information is configured, your risk
        position will appear here.
      </p>
    </div>
  );
}
