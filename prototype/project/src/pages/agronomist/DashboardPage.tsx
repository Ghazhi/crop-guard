import { useState, useEffect } from 'react';
import {
  Users, ClipboardCheck, Zap, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Leaf,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Stats {
  totalFarmers:      number;
  checkinsThisWeek:  number;
  activeTrainings:   number;
  highRiskFarmers:   number;
}

interface RecentCheckin {
  id:          string;
  farmer_name: string;
  week_number: number;
  status:      string;
  is_verified: boolean;
  created_at:  string;
}

interface HighRiskFarmer {
  id:        string;
  full_name: string;
  zone:      string;
  crop_type: string;
  fri_score: number | null;
}

export default function AgronomistDashboard() {
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [riskFarmers,    setRiskFarmers]    = useState<HighRiskFarmer[]>([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

        const [farmersRes, checkinsRes, friRes, trainingsRes] = await Promise.all([
          supabase.from('farmers').select('id', { count: 'exact', head: true }),
          supabase.from('farmer_checkins')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', weekAgo),
          supabase.from('farmer_fri_scores')
            .select('farmer_id, total_score, zone, created_at')
            .order('created_at', { ascending: false })
            .limit(300),
          supabase.from('interventions_catalog')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'Training')
            .eq('status', 'Active'),
        ]);

        // Latest FRI per farmer — count high+critical
        const seen = new Set<string>();
        const latest: any[] = [];
        for (const r of (friRes.data ?? [])) {
          if (seen.has(r.farmer_id)) continue;
          seen.add(r.farmer_id);
          latest.push(r);
        }
        const highRisk = latest.filter(r => r.zone === 'high' || r.zone === 'critical').length;

        setStats({
          totalFarmers:     farmersRes.count ?? 0,
          checkinsThisWeek: checkinsRes.count ?? 0,
          activeTrainings:  trainingsRes.count ?? 0,
          highRiskFarmers:  highRisk,
        });

        // Recent check-ins — join farmer name
        const { data: cData } = await supabase
          .from('farmer_checkins')
          .select('id, week_number, status, is_verified, created_at, farmer:farmers(full_name)')
          .order('created_at', { ascending: false })
          .limit(6);

        setRecentCheckins((cData ?? []).map((c: any) => ({
          id:          c.id,
          farmer_name: c.farmer?.full_name ?? '—',
          week_number: c.week_number,
          status:      c.status,
          is_verified: c.is_verified ?? false,
          created_at:  c.created_at,
        })));

        // High-risk farmers using latest FRI
        const highIds = latest
          .filter(r => r.zone === 'high' || r.zone === 'critical')
          .slice(0, 5)
          .map(r => r.farmer_id);

        if (highIds.length > 0) {
          const { data: fData } = await supabase
            .from('farmers')
            .select('id, full_name, primary_crop')
            .in('id', highIds);

          const friByFarmer: Record<string, any> = {};
          latest.forEach(r => { friByFarmer[r.farmer_id] = r; });

          setRiskFarmers((fData ?? []).map((f: any) => ({
            id:        f.id,
            full_name: f.full_name,
            zone:      friByFarmer[f.id]?.zone ?? '—',
            crop_type: f.primary_crop ?? '—',
            fri_score: friByFarmer[f.id] ? Number(friByFarmer[f.id].total_score) : null,
          })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const ZONE_STYLE: Record<string, string> = {
    high:     'bg-red-100 text-red-700',
    critical: 'bg-red-200 text-red-900',
  };

  const statCards = [
    { label: 'Total Farmers',       value: stats?.totalFarmers,     icon: Users,          color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Check-ins This Week', value: stats?.checkinsThisWeek, icon: ClipboardCheck, color: 'bg-blue-50 text-blue-700'       },
    { label: 'Active Trainings',    value: stats?.activeTrainings,  icon: Zap,            color: 'bg-amber-50 text-amber-700'     },
    { label: 'High Risk Farmers',   value: stats?.highRiskFarmers,  icon: AlertTriangle,  color: 'bg-red-50 text-red-700'         },
  ];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agronomist Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor farmer health, check-ins, and field interventions.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', color)}>
              <Icon className="w-5 h-5" />
            </div>
            {loading
              ? <Skeleton className="h-7 w-16 mb-1" />
              : <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
            }
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              Recent Check-ins
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              : recentCheckins.length === 0
                ? <p className="p-6 text-sm text-gray-400 text-center">No check-ins found.</p>
                : recentCheckins.map(c => (
                    <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.farmer_name}</p>
                        <p className="text-xs text-gray-400">Week {c.week_number}</p>
                      </div>
                      <Badge
                        variant={c.is_verified ? 'default' : 'secondary'}
                        className="capitalize text-xs flex items-center gap-1"
                      >
                        {c.is_verified
                          ? <><CheckCircle className="w-3 h-3" /> Verified</>
                          : <><Clock className="w-3 h-3" /> {c.status}</>}
                      </Badge>
                    </div>
                  ))
            }
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              High Risk Farmers
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))
              : riskFarmers.length === 0
                ? (
                  <div className="p-8 text-center">
                    <Leaf className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No high-risk farmers — great work!</p>
                  </div>
                )
                : riskFarmers.map(f => (
                    <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{f.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{f.crop_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.fri_score != null && (
                          <span className="text-xs font-semibold text-gray-700">
                            <TrendingUp className="w-3 h-3 inline mr-0.5 text-gray-400" />
                            {f.fri_score.toFixed(1)}
                          </span>
                        )}
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', ZONE_STYLE[f.zone] ?? 'bg-gray-100 text-gray-500')}>
                          {f.zone}
                        </span>
                      </div>
                    </div>
                  ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
