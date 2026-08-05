import { useState, Suspense, lazy } from 'react';
import { Landmark, Globe2, Truck, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const CommunityProfilingPage = lazy(() => import('@/pages/staff/CommunityProfilingPage'));
const CooperativeGovernancePage = lazy(() => import('@/pages/staff/CooperativeGovernancePage'));
const CocoaTraceabilityPage = lazy(() => import('@/pages/staff/CocoaTraceabilityPage'));
const GovernanceInsightsPage = lazy(() => import('@/pages/staff/GovernanceInsightsPage'));

type GovTab = 'community' | 'cooperative' | 'traceability' | 'insights';

const TABS: { key: GovTab; label: string; icon: React.ElementType }[] = [
  { key: 'community',    label: 'Profiles',     icon: Globe2 },
  { key: 'cooperative', label: 'Governance',    icon: Landmark },
  { key: 'traceability', label: 'Traceability', icon: Truck },
  { key: 'insights',    label: 'Insights',       icon: Sparkles },
];

export default function GovernancePage() {
  const [tab, setTab] = useState<GovTab>('community');

  return (
    <div>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cropguard-forest rounded-xl flex items-center justify-center">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Governance</h1>
            <p className="text-sm text-gray-500">Community profiles, cooperative governance, crop traceability & AI insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.key ? 'bg-white text-cropguard-forest shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cropguard-mid" /></div>}>
        {tab === 'community'    && <CommunityProfilingPage />}
        {tab === 'cooperative' && <CooperativeGovernancePage />}
        {tab === 'traceability' && <CocoaTraceabilityPage />}
        {tab === 'insights'    && <GovernanceInsightsPage />}
      </Suspense>
    </div>
  );
}
