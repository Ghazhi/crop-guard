import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { AuthGate } from '@/components/AuthGate';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ToastProvider } from '@/components/ui/toast';

// ── Layouts ────────────────────────────────────────────────
const FarmerLayout      = lazy(() => import('@/components/layouts/FarmerLayout'));
const AgentLayout       = lazy(() => import('@/components/layouts/AgentLayout'));
const StaffLayout       = lazy(() => import('@/components/layouts/StaffLayout'));
const PartnerLayout     = lazy(() => import('@/components/layouts/PartnerLayout'));
const AgronomistLayout  = lazy(() => import('@/components/layouts/AgronomistLayout'));
const CreditsLayout     = lazy(() => import('@/components/layouts/CreditsLayout'));
const TeamLayout        = lazy(() => import('@/components/layouts/TeamLayout'));
const SuperAdminLayout  = lazy(() => import('@/components/layouts/SuperAdminLayout'));

// ── Auth ───────────────────────────────────────────────────
const LoginPage = lazy(() => import('@/pages/LoginPage'));

// ── Super Admin portal ─────────────────────────────────────
const SuperAdminHome = lazy(() => import('@/pages/admin/HomePage'));

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
const AgentProfilePage       = lazy(() => import('@/pages/agent/ProfilePage'));
const FarmerSelfProfilePage  = lazy(() => import('@/pages/farmer/ProfilePage'));
const VerificationPage       = lazy(() => import('@/pages/agent/VerificationPage'));
const FarmerRegistrationPage = lazy(() => import('@/pages/agent/FarmerRegistrationPage'));
const FarmDetailsPage        = lazy(() => import('@/pages/agent/FarmDetailsPage'));
const BaselineAssessmentPage = lazy(() => import('@/components/BaselineAssessmentForm'));

// ── Staff portal ───────────────────────────────────────────
const StaffDashboardPage      = lazy(() => import('@/pages/staff/DashboardPage'));
const StaffProgramsPage       = lazy(() => import('@/pages/staff/ProgramsPage'));
const StaffFarmerRegistryPage = lazy(() => import('@/pages/staff/FarmerManagementPage'));
const StaffInterventionsPage  = lazy(() => import('@/pages/staff/InterventionsPage'));
const StaffEnrollmentWorkflow = lazy(() => import('@/pages/staff/EnrollmentWorkflowPage'));
const StaffCohortDashboard    = lazy(() => import('@/pages/staff/CohortDashboardPage'));
const StaffIntelligencePage   = lazy(() => import('@/pages/staff/IntelligencePage'));
const StaffConfigurationPage  = lazy(() => import('@/pages/staff/ConfigurationPage'));

const StaffGovernancePage    = lazy(() => import('@/pages/staff/GovernancePage'));
const StaffCoopGovPage      = lazy(() => import('@/pages/staff/CooperativeGovernancePage'));

// ── Partner portal ─────────────────────────────────────────
const PartnerNorviPage = lazy(() => import('@/pages/partner/IntelligenceDashboard'));
const PartnerMerlPage   = lazy(() => import('@/pages/partner/MerlDashboardPage'));
const PartnerInterventionsPage = lazy(() => import('@/pages/partner/PartnerInterventionsPage'));
const PartnerCohortsPage  = lazy(() => import('@/pages/partner/CohortPerformancePage'));
const PartnerReportsPage  = lazy(() => import('@/pages/partner/PartnerReportsPage'));

// ── Agronomist portal ──────────────────────────────────────
const AgroDashboard     = lazy(() => import('@/pages/agronomist/DashboardPage'));
const AgroFarmers       = lazy(() => import('@/pages/agronomist/FarmersPage'));
const AgroCheckins      = lazy(() => import('@/pages/agronomist/CheckinsPage'));
const AgroInterventions = lazy(() => import('@/pages/agronomist/InterventionsPage'));
const AgroAdvisory      = lazy(() => import('@/pages/agronomist/AdvisoryPage'));
const AgroReports       = lazy(() => import('@/pages/agronomist/ReportsPage'));
const AgroFRIDashboard   = lazy(() => import('@/pages/staff/FRIDashboardPage'));
const AgroCheckinConfig  = lazy(() => import('@/pages/staff/CheckinSettingsPage'));const AgroAgentMgmt      = lazy(() => import('@/pages/staff/AgentAssignmentPage'));
const FarmerScoresView   = lazy(() => import('@/components/intelligence/FarmerScoresView'));

// ── Credits portal ─────────────────────────────────────────
const CreditsDashboard    = lazy(() => import('@/pages/credits/DashboardPage'));
const CreditsApplications = lazy(() => import('@/pages/credits/ApplicationsPage'));
const CreditsFarmers      = lazy(() => import('@/pages/credits/FarmersPage'));
const CreditsScoring      = lazy(() => import('@/pages/credits/RiskScoringPage'));
const CreditsPortfolio    = lazy(() => import('@/pages/credits/PortfolioPage'));
const CreditsOfftake       = lazy(() => import('@/pages/credits/OfftakeAgreementsPage'));
const CreditsDisbursements = lazy(() => import('@/pages/credits/DisbursementLedgerPage'));
const CreditsReports      = lazy(() => import('@/pages/credits/ReportsPage'));

const CreditsInterventions = lazy(() => import('@/pages/credits/InterventionsPage'));
const CreditsEnrollments  = lazy(() => import('@/pages/credits/OpportunityEnrollmentsPage'));

// ── Team portal ────────────────────────────────────────────
const TeamDashboard    = lazy(() => import('@/pages/team/DashboardPage'));
const TeamPettyCash    = lazy(() => import('@/pages/team/PettyCashPage'));
const TeamRequests     = lazy(() => import('@/pages/team/FundRequestsPage'));
const TeamReports      = lazy(() => import('@/pages/team/FinancialReportsPage'));
const TeamLoans         = lazy(() => import('@/pages/team/LoanPortfolioPage'));
const TeamInsurance     = lazy(() => import('@/pages/team/InsurancePoliciesPage'));

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
    <ToastProvider>
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
              <Route path="/farmer/profile" element={<FarmerSelfProfilePage />} />
            </Route>
          </Route>

          {/* ── Agent portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['agent']} />}>
            <Route element={<AgentLayout />}>
              <Route path="/agent/home"     element={<AgentHomePage />} />
              <Route path="/agent/farmers"  element={<AgentFarmersPage />} />
              <Route path="/agent/checkins" element={<AgentCheckinsPage />} />
              <Route path="/agent/reports"  element={<AgentReportsPage />} />
              <Route path="/agent/scores"   element={<FarmerScoresView role="agent" />} />
              <Route path="/agent/norvi"    element={<AgentNorviPage />} />
            </Route>
            <Route path="/agent/farmers/register"           element={<FarmerRegistrationPage />} />
            <Route path="/agent/farmers/:farmerId/profile"  element={<FarmerProfilePage />} />
            <Route path="/agent/farmers/:farmerId/farm"     element={<FarmDetailsPage />} />
            <Route path="/agent/farmers/:farmerId/baseline" element={<BaselineAssessmentPage />} />
            <Route path="/agent/profile"                    element={<AgentProfilePage />} />
            <Route path="/agent/verify/farmer/:farmerId"    element={<VerificationPage />} />
            <Route path="/agent/verify/:checkinId"          element={<VerificationPage />} />
          </Route>

          {/* ── Super Admin portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route element={<SuperAdminLayout />}>
              <Route path="/admin/home" element={<SuperAdminHome />} />
              <Route path="/admin/configuration" element={<StaffConfigurationPage />} />
            </Route>
          </Route>

          {/* ── Staff / Admin / Agronomist / Credits portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin', 'agronomist', 'credits', 'super_admin']} />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff/dashboard"                    element={<StaffDashboardPage />} />
              <Route path="/staff/governance"                    element={<StaffGovernancePage />} />
              <Route path="/staff/community"                    element={<Navigate to="/staff/governance" replace />} />
              <Route path="/staff/cooperatives"                   element={<Navigate to="/staff/governance" replace />} />
              <Route path="/staff/cocoa-traceability"             element={<Navigate to="/staff/governance" replace />} />
              <Route path="/staff/programs"                     element={<StaffProgramsPage />} />
              <Route path="/staff/cohorts"                      element={<Navigate to="/staff/programs" replace />} />
              <Route path="/staff/cohorts/:cohortId/dashboard"  element={<StaffCohortDashboard />} />
              <Route path="/staff/farmer-management"            element={<Navigate to="/staff/registry" replace />} />
              <Route path="/staff/farmers"                      element={<Navigate to="/staff/registry" replace />} />
              <Route path="/staff/registry"                     element={<StaffFarmerRegistryPage />} />
              <Route path="/staff/enrollment"                   element={<Navigate to="/staff/registry" replace />} />
              <Route path="/staff/agents"                       element={<Navigate to="/staff/programs" replace />} />
              <Route path="/staff/reports"                      element={<Navigate to="/staff/insights" replace />} />
              <Route path="/staff/interventions"                element={<StaffInterventionsPage />} />
              <Route path="/staff/intelligence"                 element={<Navigate to="/staff/insights" replace />} />
              <Route path="/staff/insights"                     element={<StaffIntelligencePage />} />
              <Route path="/staff/workflow"                     element={<StaffEnrollmentWorkflow />} />
              <Route path="/staff/fri"                          element={<Navigate to="/staff/insights" replace />} />
              <Route path="/staff/checkin-settings"             element={<Navigate to="/staff/configuration?tab=checkin" replace />} />
              <Route path="/staff/configuration"                element={<StaffConfigurationPage />} />
              <Route path="/staff/users"                        element={<Navigate to="/staff/configuration?tab=users" replace />} />
            </Route>
          </Route>

          {/* ── Partner portal sidebar ── */}
          <Route element={<ProtectedRoute allowedRoles={['partner', 'super_admin']} />}>
            <Route element={<PartnerLayout />}>
              <Route path="/partner/norvi"        element={<PartnerNorviPage />} />
              <Route path="/partner/merl"          element={<PartnerMerlPage />} />
              <Route path="/partner/interventions" element={<PartnerInterventionsPage />} />
              <Route path="/partner/cohorts"        element={<PartnerCohortsPage />} />
              <Route path="/partner/cooperatives"   element={<StaffCoopGovPage />} />
              <Route path="/partner/reports"        element={<PartnerReportsPage />} />
              <Route path="/partner/configuration" element={<StaffConfigurationPage />} />
              <Route path="/partner/intelligence" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* ── Intelligence & Opportunity Dashboard (/dashboard) ──
               Accessible to: partner, staff, admin
               Has its own DashboardLayout (sub-nav tabs) */}
          <Route element={<ProtectedRoute allowedRoles={['partner', 'staff', 'admin', 'agronomist', 'credits', 'super_admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"              element={<PortfolioOverview />} />
              <Route path="/dashboard/farmers"      element={<FarmerListPage />} />
              <Route path="/dashboard/analytics"    element={<PortfolioAnalytics />} />
            </Route>
            {/* Farmer detail — full page, no sub-nav needed */}
            <Route path="/dashboard/farmer/:farmerId" element={<FarmerDetailPage />} />
          </Route>

          {/* ── Agronomist portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['agronomist', 'super_admin']} />}>
            <Route element={<AgronomistLayout />}>
              <Route path="/agronomist/dashboard"     element={<AgroDashboard />} />
              <Route path="/agronomist/farmers"       element={<AgroFarmers />} />
              <Route path="/agronomist/checkins"      element={<AgroCheckins />} />
              <Route path="/agronomist/interventions" element={<AgroInterventions />} />
              <Route path="/agronomist/advisory"      element={<AgroAdvisory />} />
              <Route path="/agronomist/cooperatives" element={<StaffCoopGovPage />} />
              <Route path="/agronomist/reports"       element={<AgroReports />} />
              <Route path="/agronomist/fri"           element={<AgroFRIDashboard />} />
              <Route path="/agronomist/scores"          element={<FarmerScoresView role="agronomist" />} />
              <Route path="/agronomist/checkin-config" element={<AgroCheckinConfig />} />
              <Route path="/agronomist/agents"        element={<AgroAgentMgmt />} />
              <Route path="/agronomist/configuration" element={<StaffConfigurationPage />} />
            </Route>
          </Route>

          {/* ── Credits portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['credits', 'super_admin']} />}>
            <Route element={<CreditsLayout />}>
              <Route path="/credits/dashboard"    element={<CreditsDashboard />} />
              <Route path="/credits/applications" element={<CreditsApplications />} />
              <Route path="/credits/farmers"      element={<CreditsFarmers />} />
              <Route path="/credits/scoring"      element={<CreditsScoring />} />
              <Route path="/credits/scores"      element={<FarmerScoresView role="credits" />} />
              <Route path="/credits/interventions"   element={<CreditsInterventions />} />
              <Route path="/credits/enrollments"    element={<CreditsEnrollments />} />
              <Route path="/credits/portfolio"    element={<CreditsPortfolio />} />
              <Route path="/credits/offtake"       element={<CreditsOfftake />} />
              <Route path="/credits/disbursements" element={<CreditsDisbursements />} />
              <Route path="/credits/reports"      element={<CreditsReports />} />
              <Route path="/credits/configuration" element={<StaffConfigurationPage />} />
            </Route>
          </Route>

          {/* ── Team portal ── */}
          <Route element={<ProtectedRoute allowedRoles={['team', 'super_admin']} />}>
            <Route element={<TeamLayout />}>
              <Route path="/team/dashboard"  element={<TeamDashboard />} />
              <Route path="/team/petty-cash" element={<TeamPettyCash />} />
              <Route path="/team/requests"   element={<TeamRequests />} />
              <Route path="/team/reports"    element={<TeamReports />} />
              <Route path="/team/scores"    element={<FarmerScoresView role="team" />} />
              <Route path="/team/loans"      element={<TeamLoans />} />
              <Route path="/team/insurance" element={<TeamInsurance />} />
              <Route path="/team/configuration" element={<StaffConfigurationPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
