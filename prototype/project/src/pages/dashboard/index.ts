import { useState } from 'react';
import { Routes, Route, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import PortfolioOverviewPage    from './PortfolioOverviewPage';
import FarmerIntelligenceListPage from './FarmerIntelligenceListPage';
import FarmerDetailPage          from './FarmerDetailPage';
import PortfolioAnalyticsPage    from './PortfolioAnalyticsPage';

const TABS = [
  { path: '',          label: 'Portfolio Overview', icon: LayoutDashboard  },
  { path: 'farmers',   label: 'Farmer List',        icon: Users            },
  { path: 'analytics', label: 'Analytics',          icon: BarChart2        },
];

function DashboardShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard sub-nav */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-1 max-w-7xl mx-auto">
          {TABS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={path === '' ? '/dashboard' : `/dashboard/${path}`}
              end={path === ''}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

export { DashboardShell };
export { PortfolioOverviewPage, FarmerIntelligenceListPage, FarmerDetailPage, PortfolioAnalyticsPage };
