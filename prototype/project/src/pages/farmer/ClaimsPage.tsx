import { useEffect, useState } from 'react';
import { ShieldCheck, FileText, Loader2, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Policy {
  id: string;
  policy_number: string | null;
  crop: string | null;
  coverage_amount: number | null;
  premium_amount: number | null;
  premium_paid: boolean;
  start_date: string | null;
  end_date: string | null;
  status: string;
  provider_name: string | null;
}

interface Claim {
  id: string;
  claim_date: string | null;
  incident_date: string | null;
  claim_amount: number | null;
  status: string;
  payout_amount: number | null;
  description: string | null;
}

const STATUS_STYLE: Record<string, { icon: typeof Clock; color: string }> = {
  active:      { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  approved:    { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  pending:     { icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  submitted:   { icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  under_review:{ icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  declined:    { icon: XCircle,      color: 'text-red-600 bg-red-50' },
  expired:     { icon: XCircle,      color: 'text-gray-500 bg-gray-100' },
  lapsed:      { icon: XCircle,      color: 'text-gray-500 bg-gray-100' },
};

export default function FarmerClaimsPage() {
  const profile = useAuthStore(s => s.profile);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('farmers').select('id').eq('user_id', profile.id).maybeSingle()
      .then(({ data: f }) => {
        if (!f) { setLoading(false); return; }
        Promise.all([
          (supabase.from('insurance_policies') as any)
            .select('id, policy_number, crop, coverage_amount, premium_amount, premium_paid, start_date, end_date, status, provider_name')
            .eq('farmer_id', (f as any).id)
            .order('created_at', { ascending: false }),
          (supabase.from('insurance_claims') as any)
            .select('id, claim_date, incident_date, claim_amount, status, payout_amount, description')
            .eq('farmer_id', (f as any).id)
            .order('created_at', { ascending: false }),
        ]).then(([pRes, cRes]) => {
          setPolicies((pRes.data as Policy[]) ?? []);
          setClaims((cRes.data as Claim[]) ?? []);
          setLoading(false);
        });
      });
  }, [profile]);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cropguard-mid animate-spin" />
      </div>
    );
  }

  if (policies.length === 0 && claims.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-cropguard-mint rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-cropguard-dark" />
          </div>
          <h2 className="text-xl font-semibold text-cropguard-forest">No Insurance</h2>
          <p className="text-sm text-cropguard-slate max-w-[260px]">
            You don't have any active insurance policies yet. Check the "For Me" page to see if you qualify for crop insurance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">Insurance & Claims</h2>
        <p className="text-sm text-cropguard-slate">Your policies and claim history</p>
      </div>

      {/* Policies */}
      {policies.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Policies</p>
          {policies.map(p => {
            const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
            const StatusIcon = style.icon;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-cropguard-forest">
                      {p.policy_number ?? 'Policy'}
                    </p>
                    {p.provider_name && (
                      <p className="text-[10px] text-cropguard-slate">{p.provider_name}</p>
                    )}
                  </div>
                  <span className={cn('flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full capitalize', style.color)}>
                    <StatusIcon className="w-3 h-3" /> {p.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.crop && (
                    <span className="text-[10px] text-gray-600 bg-cropguard-mint px-2 py-1 rounded-lg capitalize">{p.crop}</span>
                  )}
                  {p.coverage_amount != null && (
                    <span className="text-[10px] text-gray-600 bg-blue-50 px-2 py-1 rounded-lg">
                      Coverage: GHS {Number(p.coverage_amount).toLocaleString()}
                    </span>
                  )}
                  {p.premium_amount != null && (
                    <span className={cn('text-[10px] px-2 py-1 rounded-lg', p.premium_paid ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50')}>
                      Premium: GHS {Number(p.premium_amount).toLocaleString()} {p.premium_paid ? '(Paid)' : '(Unpaid)'}
                    </span>
                  )}
                </div>
                {(p.start_date || p.end_date) && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {p.start_date && new Date(p.start_date).toLocaleDateString()}
                    {p.start_date && p.end_date && ' — '}
                    {p.end_date && new Date(p.end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Claims */}
      {claims.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Claims</p>
          {claims.map(c => {
            const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending;
            const StatusIcon = style.icon;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cropguard-mid" />
                    <p className="text-sm font-semibold text-cropguard-forest">
                      {c.claim_date ? new Date(c.claim_date).toLocaleDateString() : 'Claim'}
                    </p>
                  </div>
                  <span className={cn('flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full capitalize', style.color)}>
                    <StatusIcon className="w-3 h-3" /> {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-gray-600 leading-relaxed">{c.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {c.claim_amount != null && (
                    <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                      Claimed: GHS {Number(c.claim_amount).toLocaleString()}
                    </span>
                  )}
                  {c.payout_amount != null && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      Payout: GHS {Number(c.payout_amount).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
