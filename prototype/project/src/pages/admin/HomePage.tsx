import { useNavigate } from 'react-router-dom';
import {
  Building2, Coins, Leaf, DollarSign, Shield,
  Users, TrendingUp, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface PortalCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  accent: string;
  iconBg: string;
}

const PORTALS: PortalCard[] = [
  {
    title: 'Program Manager',
    description: 'Farmer registry, programs, cohorts, agent assignment, FRI dashboard, check-in config, reports',
    icon: Building2,
    path: '/staff/dashboard',
    accent: 'from-emerald-50 to-green-50 border-emerald-200',
    iconBg: 'bg-emerald-500',
  },
  {
    title: 'Credit Officer',
    description: 'Opportunities, enrollments, risk scoring, portfolio management, disbursements, offtake agreements',
    icon: Coins,
    path: '/credits/dashboard',
    accent: 'from-blue-50 to-sky-50 border-blue-200',
    iconBg: 'bg-blue-500',
  },
  {
    title: 'Agronomist',
    description: 'FRI assessments, check-in config, agent management, trainings, advisory notes, production reports',
    icon: Leaf,
    path: '/agronomist/dashboard',
    accent: 'from-green-50 to-teal-50 border-green-200',
    iconBg: 'bg-green-600',
  },
  {
    title: 'Finance & Insurance',
    description: 'Budgets, fund requests, petty cash, loan portfolio, insurance policies, financial reports',
    icon: DollarSign,
    path: '/team/dashboard',
    accent: 'from-slate-50 to-gray-50 border-slate-300',
    iconBg: 'bg-slate-700',
  },
  {
    title: 'Partner / MERL',
    description: 'Donor dashboards, monitoring & evaluation, interventions overview, impact reports, cohort performance',
    icon: Shield,
    path: '/partner/norvi',
    accent: 'from-amber-50 to-yellow-50 border-amber-200',
    iconBg: 'bg-amber-500',
  },
];

export default function SuperAdminHome() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Overview</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {profile?.full_name || 'Administrator'}. You have access to all portals and features.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Portals', value: '5', icon: Building2 },
          { label: 'User Management', value: 'Active', icon: Users },
          { label: 'Risk Intelligence', value: 'Live', icon: TrendingUp },
          { label: 'Access Level', value: 'Full', icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Portal cards */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Portals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PORTALS.map(({ title, description, icon: Icon, path, accent, iconBg }) => (
          <button
            key={title}
            onClick={() => navigate(path)}
            className={cn(
              'group text-left rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-lg hover:-translate-y-0.5',
              accent,
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
