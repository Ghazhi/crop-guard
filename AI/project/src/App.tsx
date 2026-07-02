import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { AuthGate } from '@/components/AuthGate';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingScreen } from '@/components/LoadingScreen';

// ── Layouts ────────────────────────────────────────────────
const FarmerLayout      = lazy(() => import('@/components/layouts/FarmerLayout'));
const AgentLayout       = lazy(() => import('@/components/layouts/AgentLayout'));
const StaffLayout       = lazy(() => import('@/components/layouts/StaffLayout'));
const PartnerLayout     = lazy(() => import('@/components/layouts/PartnerLayout'));
const AgronomistLayout  = lazy(() => import('@/components/layouts/AgronomistLayout'));
const CreditsLayout     = lazy(() => import('@/components/layouts/CreditsLayout'));

// ── Auth ───────────────────────────────────────────────────
const LoginPage = lazy(() => import('@/pages/LoginPage'));

// ── Farmer portal ──────────────────────────────────────────
const FarmerHomePage  = lazy(() => import('@/pages/farmer/HomePage'));
const FarmerCheckin   = lazy(() => import('@/pages/farmer/CheckinPage'));
const FarmerScore     = lazy(() => import('@/pages/farmer/ScorePage'));
const FarmerOpps      = lazy(() => import('@/pages/farmer/OppsPage'));
const FarmerHelp      = lazy(() => import('@/pages/farmer/HelpPage'));

// ── Agent portal ───────────────────────────────────────────
const AgentHomePage          = lazy(() => import('@/pages/agent/HomePage'));
const AgentFarmersPage       = lazy(() => import('@/pages/agent/FarmersPage'));
const AgentCheckinsPage      = lazy(() => import('@/pages/agent/CheckinsPage'));
const AgentReportsPage       = lazy(() => import('@/pages/agent/ReportsPage'));
const AgentNorviPage         = lazy(() => import('@/pages/agent/NorviPage'));
const FarmerProfilePage      = lazy(() => import('@/pages/agent/FarmerProfilePage'));
const VerificationPage       = lazy(() => import('@/pages/agent/VerificationPage'));
const FarmerRegistrationPage = lazy(() => import('@/pages/agent/FarmerRegistrationPage'));
const FarmDetailsPage        = lazy(() => import('@/pages/agent/FarmDetailsPage'));
const BaselineAssessmentPage = lazy(() => import('@/components/BaselineAssessmentForm'));

// ── Staff portal ───────────────────────────────────────────
const StaffDashboardPage      = lazy(() => import('@/pages/staff/DashboardPage'));
const StaffProgramsPage       = lazy(() => import('@/pages/staff/ProgramsPage'));
const StaffFarmersPage        = lazy(() => import('@/pages/staff/FarmersPage'));
const StaffFarmerRegistryPage = lazy(() => import('@/pages/staff/FarmerRegistryPage'));
const StaffFarmerMgmtPage     = lazy(() => import('@/pages/staff/FarmerManagementPage'));
const StaffAgentAssignPage    = lazy(() => import('@/pages/staff/AgentAssignmentPage'));
const StaffReportsPage        = lazy(() => import('@/pages/staff/ReportsPage'));
const StaffInterventionsPage  = lazy(() => import('@/pages/staff/InterventionsPage'));
const StaffEnrollmentWorkflow = lazy(() => import('@/pages/staff/EnrollmentWorkflowPage'));
const StaffFRIDashboard       = lazy(() => import('@/pages/staff/FRIDashboardPage'));
const StaffCohortDashboard    = lazy(() => import('@/pages/staff/CohortDashboardPage'));
const StaffIntelligencePage   = lazy(() => import('@/pages/staff/RiskIntelligencePage'));
const StaffCheckinSettings    = lazy(() => import('@/pages/staff/CheckinSettingsPage'));
const StaffUserMgmtPage       = lazy(() => import('@/pages/staff/FarmerEnrollmentPage'));

const StaffCommunityPage    = lazy(() => import('@/pages/staff/CommunityProfilingPage'));

// ── Partner portal ─────────────────────────────────────────
const PartnerNorviPage = lazy(() => import('@/pages/partner/IntelligenceDashboard'));

// ── Agronomist portal ──────────────────────────────────────
const AgroDashboard     = lazy(() => import('@/pages/agronomist/DashboardPage'));
const AgroFarmers       = lazy(() => import('@/pages/agronomist/FarmersPage'));
const AgroCheckins      = lazy(() => import('@/pages/agronomist/CheckinsPage'));
const AgroInterventions = lazy(() => import('@/pages/agronomist/InterventionsPage'));
const AgroAdvisory      = lazy(() => import('@/pages/agronomist/AdvisoryPage'));
const AgroReports       = lazy(() => import('@/pages/agronomist/ReportsPage'));

// ── Credits portal ─────────────────────────────────────────
const CreditsDashboard    = lazy(() => import('@/pages/credits/DashboardPage'));
const CreditsApplications = lazy(() => import('@/pages/credits/ApplicationsPage'));
const CreditsFarmers      = lazy(() => import('@/pages/credits/FarmersPage'));
const CreditsScoring      = lazy(() => import('@/pages/credits/RiskScoringPage'));
const CreditsPortfolio    = lazy(() => import('@/pages/credits/PortfolioPage'));
const CreditsReports      = lazy(() => import('@/pages/credits/ReportsPage'));

const CreditsInterventions = lazy(() => import('@/pages/credits/InterventionsPage'));

const PortfolioOverview   = lazy(() => import('@/pages/dashboard/PortfolioOverviewPage'));
const FarmerListPage      = lazy(() => import('@/pages/dashboard/FarmerIntelligenceListPage'));
const FarmerDetailPage    = lazy(() => import('@/pages/dashboard/FarmerDetailPage'));
const PortfolioAnalytics  = lazy(() => import('@/pages/dashboard/PortfolioAnalyticsPage'));

// ── Dashboard shell layout ────────────────────────────────
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function App() {
  const initialize = useAuthStore(s => s.initialize);
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Root → AuthGate redirects by role */}
          <Route path="/" element={<AuthGate />} />

          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Farmer portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
            <Route element={<FarmerLayout />}>
              <Route path="/farmer/home"    element={<FarmerHomePage />} />
              <Route path="/farmer/checkin" element={<FarmerCheckin />} />
              <Route path="/farmer/score"   element={<FarmerScore />} />
              <Route path="/farmer/opps"    element={<FarmerOpps />} />
              <Route path="/farmer/help"    element={<FarmerHelp />} />
            </Route>
          </Route>

          {/* ── Agent portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['agent']} />}>
            <Route element={<AgentLayout />}>
              <Route path="/agent/home"     element={<AgentHomePage />} />
              <Route path="/agent/farmers"  element={<AgentFarmersPage />} />
              <Route path="/agent/checkins" element={<AgentCheckinsPage />} />
              <Route path="/agent/reports"  element={<AgentReportsPage />} />
              <Route path="/agent/norvi"    element={<AgentNorviPage />} />
            </Route>
            <Route path="/agent/farmers/register"           element={<FarmerRegistrationPage />} />
            <Route path="/agent/farmers/:farmerId/profile"  element={<FarmerProfilePage />} />
            <Route path="/agent/farmers/:farmerId/farm"     element={<FarmDetailsPage />} />
            <Route path="/agent/farmers/:farmerId/baseline" element={<BaselineAssessmentPage />} />
            <Route path="/agent/verify/:checkinId"          element={<VerificationPage />} />
          </Route>

          {/* ── Staff / Admin / Agronomist / Credits portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin', 'agronomist', 'credits']} />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff/dashboard"                    element={<StaffDashboardPage />} />
              <Route path="/staff/community"                    element={<StaffCommunityPage />} />
              <Route path="/staff/programs"                     element={<StaffProgramsPage />} />
              <Route path="/staff/cohorts"                      element={<Navigate to="/staff/programs" replace />} />
              <Route path="/staff/cohorts/:cohortId/dashboard"  element={<StaffCohortDashboard />} />
              <Route path="/staff/farmer-management"            element={<StaffFarmerMgmtPage />} />
              <Route path="/staff/farmers"                      element={<StaffFarmersPage />} />
              <Route path="/staff/registry"                     element={<StaffFarmerRegistryPage />} />
              <Route path="/staff/enrollment"                   element={<Navigate to="/staff/farmers" replace />} />
              <Route path="/staff/agents"                       element={<StaffAgentAssignPage />} />
              <Route path="/staff/reports"                      element={<StaffReportsPage />} />
              <Route path="/staff/interventions"                element={<StaffInterventionsPage />} />
              <Route path="/staff/intelligence"                 element={<StaffIntelligencePage />} />
              <Route path="/staff/workflow"                     element={<StaffEnrollmentWorkflow />} />
              <Route path="/staff/fri"                          element={<StaffFRIDashboard />} />
              <Route path="/staff/checkin-settings"             element={<StaffCheckinSettings />} />
              <Route path="/staff/users"                        element={<StaffUserMgmtPage />} />
            </Route>
          </Route>

          {/* ── Partner portal sidebar ── */}
          <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
            <Route element={<PartnerLayout />}>
              <Route path="/partner/norvi"        element={<PartnerNorviPage />} />
              <Route path="/partner/intelligence" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* ── Intelligence & Opportunity Dashboard (/dashboard) ──
               Accessible to: partner, staff, admin
               Has its own DashboardLayout (sub-nav tabs) */}
          <Route element={<ProtectedRoute allowedRoles={['partner', 'staff', 'admin', 'agronomist', 'credits']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"              element={<PortfolioOverview />} />
              <Route path="/dashboard/farmers"      element={<FarmerListPage />} />
              <Route path="/dashboard/analytics"    element={<PortfolioAnalytics />} />
            </Route>
            {/* Farmer detail — full page, no sub-nav needed */}
            <Route path="/dashboard/farmer/:farmerId" element={<FarmerDetailPage />} />
          </Route>

          {/* ── Agronomist portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['agronomist']} />}>
            <Route element={<AgronomistLayout />}>
              <Route path="/agronomist/dashboard"     element={<AgroDashboard />} />
              <Route path="/agronomist/farmers"       element={<AgroFarmers />} />
              <Route path="/agronomist/checkins"      element={<AgroCheckins />} />
              <Route path="/agronomist/interventions" element={<AgroInterventions />} />
              <Route path="/agronomist/advisory"      element={<AgroAdvisory />} />
              <Route path="/agronomist/reports"       element={<AgroReports />} />
            </Route>
          </Route>

          {/* ── Credits portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['credits']} />}>
            <Route element={<CreditsLayout />}>
              <Route path="/credits/dashboard"    element={<CreditsDashboard />} />
              <Route path="/credits/applications" element={<CreditsApplications />} />
              <Route path="/credits/farmers"      element={<CreditsFarmers />} />
              <Route path="/credits/scoring"      element={<CreditsScoring />} />
              <Route path="/credits/interventions" element={<CreditsInterventions />} />
              <Route path="/credits/portfolio"    element={<CreditsPortfolio />} />
              <Route path="/credits/reports"      element={<CreditsReports />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
