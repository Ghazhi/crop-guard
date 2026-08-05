import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings2, User, Users, ClipboardCheck, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import MyProfileSection from './MyProfileSection';
import UserManagementPage from './UserManagementPage';
import CheckinConfigPage from './CheckinSettingsPage';
import TrainingConfigPage from './TrainingConfigPage';

type Tab = 'profile' | 'checkin' | 'training' | 'users';

const TABS: { key: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'profile',  label: 'My Profile',        icon: User,           desc: 'View and edit your personal details' },
  { key: 'checkin',  label: 'Check-in Config',   icon: ClipboardCheck, desc: 'Baseline templates, weekly check-ins, schedules' },
  { key: 'training', label: 'Training Materials', icon: GraduationCap, desc: 'Weekly training content, schedules, and sessions' },
  { key: 'users',    label: 'User Management',   icon: Users,          desc: 'Manage users, roles, and permissions' },
];

export default function ConfigurationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'super_admin';

  const tabParam = (searchParams.get('tab') as Tab) || 'profile';
  const [activeTab, setActiveTab] = useState<Tab>(
    ['profile', 'checkin', 'training', 'users'].includes(tabParam) ? tabParam : 'profile'
  );

  useEffect(() => {
    const t = (searchParams.get('tab') as Tab) || 'profile';
    if (['profile', 'checkin', 'training', 'users'].includes(t)) setActiveTab(t);
  }, [searchParams]);

  // Hide user management tab for non-admins
  const visibleTabs = TABS.filter(t => t.key !== 'users' || isAdmin);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

  const active = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cropguard-mint flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-cropguard-forest" />
          </div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Configuration</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 ml-10">
          Manage your profile, check-in settings, and platform users
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.key
                ? 'border-cropguard-forest text-cropguard-forest'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile'  && <MyProfileSection />}
        {activeTab === 'checkin'  && <CheckinConfigPage />}
        {activeTab === 'training' && <TrainingConfigPage />}
        {activeTab === 'users'    && isAdmin && <UserManagementPage />}
      </div>
    </div>
  );
}
