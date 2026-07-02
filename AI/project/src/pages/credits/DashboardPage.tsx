import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Coins, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Stats {
  totalFarmers:    number;
  enrolled:        number;
  scored:          number;
  highRisk:        number;
  lowRisk:         number;
  pendingBaseline: number;
}

interface RecentRow {
  farmer_id:    string;
  full_name:    string;
  primary_crop: string | null;
  total_score:  number;
  zone:         string | null;
  week_number:  number;
  enrolled:     boolean;
  scored_at:    string;
}

const ZONE_STYLE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

const ZONE_LABEL: Record<string, string> = {
  low:      'Low Risk',
  medium:   'Medium Risk',
  high:     'High Risk',
  critical: 'Critical',
};

const CREDIT_GRADE = (score: number) => {
  if (score >= 80) return { label: 'A', cls: 'bg-emerald-100 text-emerald-700' };
  if (score >= 65) return { label: 'B', cls: 'bg-blue-100 text-blue-700' };
  if (score >= 50) return { label: 'C', cls: 'bg-amber-100 text-amber-700' };
  return             { label: 'D', cls: 'bg-red-100 text-red-700' };
};

export default function CreditsDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [recent,  setRecent]  = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [farmersRes, friRes, enrollRes, baselineRes] = await Promise.all([
          supabase.from('farmers').select('id', { count: 'exact', head: true }),
          supabase.from('farmer_fri_scores')
            .select('farmer_id, total_score, zone, week_number, created_at')
            .order('created_at', { ascending: false })
            .limit(300),
          supabase.from('enrollments')
            .select('farmer_id, status')
            .eq('status', 'active'),
          supabase.from('baseline_assessments')
            .select('farmer_id')
            .eq('is_active', true),
        ]);

        const friData = friRes.data ?? [];

        // Deduplicate: latest score per farmer
        const seen = new Set<string>();
        const latest: typeof friData = [];
        for (const r of friData) {
          if (seen.has(r.farmer_id)) continue;
          seen.add(r.farmer_id);
          latest.push(r);
        }

        const enrolledIds = new Set((enrollRes.data ?? []).map((e: any) => e.farmer_id));
        const basedIds    = new Set((baselineRes.data ?? []).map((b: any) => b.farmer_id));

        setStats({
          totalFarmers:    farmersRes.count ?? 0,
          enrolled:        enrolledIds.size,
          scored:          latest.length,
          highRisk:        latest.filter(r => r.zone === 'high' || r.zone === 'critical').length,
          lowRisk:         latest.filter(r => r.zone === 'low').length,
          pendingBaseline: (farmersRes.count ?? 0) - basedIds.size,
        });

        // Fetch farmer names for the 10 most recent scored
        const top10 = latest.slice(0, 10);
        const ids = top10.map(r => r.farmer_id);
        const { data: farmerData } = await supabase
          .from('farmers')
          .select('id, full_name, primary_crop')
          .in('id', ids);

        const fmap: Record<string, any> = {};
        (farmerData ?? []).forEach((f: any) => { fmap[f.id] = f; });

        setRecent(top10.map(r => ({
          farmer_id:    r.farmer_id,
          full_name:    fmap[r.farmer_id]?.full_name ?? '—',
          primary_crop: fmap[r.farmer_id]?.primary_crop ?? null,
          total_score:  Number(r.total_score),
          zone:         r.zone,
          week_number:  r.week_number,
          enrolled:     enrolledIds.has(r.farmer_id),
          scored_at:    r.created_at,
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Farmers',      value: stats?.totalFarmers,    icon: Users,         color: 'bg-blue-50 text-blue-700'      },
    { label: 'Active Enrollments', value: stats?.enrolled,        icon: CheckCircle,   color: 'bg-emerald-50 text-emerald-700' },
    { label: 'FRI Scored',         value: stats?.scored,          icon: TrendingUp,    color: 'bg-indigo-50 text-indigo-700'  },
    { label: 'High / Critical Risk', value: stats?.highRisk,      icon: AlertTriangle, color: 'bg-red-50 text-red-700'        },
  ];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credits Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Farmer credit risk overview drawn from enrollment, baseline, and weekly FRI data.</p>
        </div>
        {!loading && stats && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Low-risk farmers</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.lowRisk}</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
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

      {/* Pending baseline callout */}
      {!loading && stats && stats.pendingBaseline > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{stats.pendingBaseline} farmers have no baseline assessment</p>
            <p className="text-xs text-amber-600 mt-0.5">These farmers cannot receive FRI scores until their agent completes a baseline.</p>
          </div>
          <button
            onClick={() => navigate('/credits/farmers')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 shrink-0"
          >
            View <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent assessments */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-blue-600" />
            Recent FRI Assessments
          </h2>
          <button
            onClick={() => navigate('/credits/scoring')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Farmer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Crop</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">FRI Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Risk Zone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Enrolled</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-8 rounded" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-12" /></td>
                      <td />
                    </tr>
                  ))
                : recent.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No FRI scores recorded yet.</p>
                      </td>
                    </tr>
                  )
                  : recent.map(r => {
                      const grade = CREDIT_GRADE(r.total_score);
                      return (
                        <tr
                          key={r.farmer_id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/dashboard/farmer/${r.farmer_id}`)}
                        >
                          <td className="px-5 py-3.5 font-medium text-gray-900">{r.full_name}</td>
                          <td className="px-4 py-3.5 text-gray-500 capitalize hidden md:table-cell">{r.primary_crop ?? '—'}</td>
                          <td className="px-4 py-3.5 font-semibold text-gray-800">{r.total_score.toFixed(1)}</td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs font-bold px-2 py-0.5 rounded', grade.cls)}>{grade.label}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                              ZONE_STYLE[r.zone ?? ''] ?? 'bg-gray-100 text-gray-500'
                            )}>
                              {ZONE_LABEL[r.zone ?? ''] ?? r.zone ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            {r.enrolled
                              ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Yes</span>
                              : <span className="text-xs text-gray-400">No</span>}
                          </td>
                          <td className="pr-4">
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </td>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
