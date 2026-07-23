import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShellLayout } from './layouts/AppShellLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';

// Employee Pages
import { EmployeeListPage } from './features/employee/pages/EmployeeListPage';
import { EmployeeProfilePage } from './features/employee/pages/EmployeeProfilePage';
import { EmployeeEditPage } from './features/employee/pages/EmployeeEditPage';
import { OnboardingDashboardPage } from './features/employee/pages/OnboardingDashboardPage';
import { EmployeeDashboardPage } from './features/employee/Dashboard/EmployeeDashboardPage';
import { EmployeeLayout } from './features/employee/layout/EmployeeLayout';
import { OrgStructurePage } from './features/org-structure/pages/OrgStructurePage';

// Attendance Pages
import { MyAttendance } from './features/attendance/pages/MyAttendance';
import { AttendanceDashboard } from './features/attendance/pages/AttendanceDashboard';

// Leaves Pages
import { MyLeavesPage } from './features/leaves/pages/MyLeavesPage';
import { ApplyLeavePage } from './features/leaves/pages/ApplyLeavePage';
import { LeaveBalancePage } from './features/leaves/pages/LeaveBalancePage';

// Payroll Pages
import { PayrollDashboard } from './features/payroll/pages/PayrollDashboard';
import { PayslipViewer } from './features/payroll/pages/PayslipViewer';
import { SalaryStructureManagement } from './features/payroll/pages/SalaryStructureManagement';
import { TaxDeclaration } from './features/payroll/pages/TaxDeclaration';
import { PayrollProcessing } from './features/payroll/pages/PayrollProcessing';
import { SalaryRevisionManagement } from './features/payroll/pages/SalaryRevisionManagement';
import { LoanManagement } from './features/payroll/pages/LoanManagement';
import { FullFinalSettlement } from './features/payroll/pages/FullFinalSettlement';
import { AdminDashboard } from './features/payroll/pages/AdminDashboard';

// Recruitment Pages
import { RecruitmentDashboard } from './features/recruitment/pages/RecruitmentDashboard';
import { JobManagement } from './features/recruitment/pages/JobManagement';
import { CandidateManagement } from './features/recruitment/pages/CandidateManagement';

// Asset Management Pages
import { AssetDashboard } from './features/asset/pages/AssetDashboard';
import { AssetList } from './features/asset/pages/AssetList';
import { AssetDetails } from './features/asset/pages/AssetDetails';
import { AssignAsset } from './features/asset/pages/AssignAsset';
import { TransferAsset } from './features/asset/pages/TransferAsset';
import { ReturnAsset } from './features/asset/pages/ReturnAsset';
import { Maintenance } from './features/asset/pages/Maintenance';
import { Licenses } from './features/asset/pages/Licenses';
import { Reports } from './features/asset/pages/Reports';
import { Analytics } from './features/asset/pages/Analytics';
import { MyAssetsPage } from './features/asset/pages/MyAssetsPage';

// Performance Pages
import { PerformanceDashboard } from './features/performance/pages/PerformanceDashboard';
import { GoalManagementPage } from './features/performance/pages/GoalManagementPage';
import { OKRManagementPage } from './features/performance/pages/OKRManagementPage';
import { ReviewCyclesPage } from './features/performance/pages/ReviewCyclesPage';
import { PerformanceReviewPage } from './features/performance/pages/PerformanceReviewPage';
import { AppraisalDashboardPage } from './features/performance/pages/AppraisalDashboardPage';
import { CompetencyDashboardPage } from './features/performance/pages/CompetencyDashboardPage';
import { PIPDashboardPage } from './features/performance/pages/PIPDashboardPage';
import { SuccessionPlanningPage } from './features/performance/pages/SuccessionPlanningPage';
import { RecognitionDashboardPage } from './features/performance/pages/RecognitionDashboardPage';
import { PerformanceAnalyticsPage } from './features/performance/pages/PerformanceAnalyticsPage';

// Workflow Pages
import { WorkflowListPage } from './features/workflow/pages/WorkflowListPage';
import { WorkflowBuilderPage } from './features/workflow/pages/WorkflowBuilderPage';
import { ApprovalInboxPage } from './features/workflow/pages/ApprovalInboxPage';

// Notifications Pages
import { NotificationCenterPage } from './features/notifications/pages/NotificationCenterPage';
import { NotificationPreferencesPage } from './features/notifications/pages/NotificationPreferencesPage';

// Settings Pages
import { SettingsLayout } from './features/settings/pages/SettingsLayout';
import { CompanyProfilePage } from './features/settings/pages/CompanyProfilePage';
import { BranchesPage } from './features/settings/pages/BranchesPage';
import { DepartmentsPage } from './features/settings/pages/DepartmentsPage';
import { LocationsPage } from './features/settings/pages/LocationsPage';
import { BrandingPage } from './features/settings/pages/BrandingPage';

// Common Pages
import { NotFoundPage } from './features/common/pages/NotFoundPage';
import { TeamDashboard } from './features/team-lead/pages/TeamDashboard';
import { DepartmentDashboard } from './features/manager/pages/DepartmentDashboard';

// SuperAdmin Pages & Layout
import { SuperAdminLayout } from './features/superadmin/sidebar/SuperAdminLayout';
import { SuperAdminDashboardPage } from './features/superadmin/Dashboard/SuperAdminDashboardPage';
import { SuperAdminOrganizationPage } from './features/superadmin/Organization/SuperAdminOrganizationPage';
import { SuperAdminSubscriptionPage } from './features/superadmin/Subcription/SuperAdminSubscriptionPage';
import { SuperAdminHelpDeskPage } from './features/superadmin/HelpDesk/SuperAdminHelpDeskPage';
import { SuperAdminProfilePage } from './features/superadmin/Profile/SuperAdminProfilePage';

// Employee Portal Pages
import ProfilePage from './features/employee/portal-pages/ProfilePage';
import AttendancePage from './features/employee/portal-pages/AttendancePage';
import LeavePage from './features/employee/portal-pages/LeavePage';
import RegularizationPage from './features/employee/portal-pages/RegularizationPage';
import ShiftRosterPage from './features/employee/portal-pages/ShiftRosterPage';
import HolidayCalendarPage from './features/employee/portal-pages/HolidayCalendarPage';
import TimesheetPage from './features/employee/portal-pages/TimesheetPage';
import PayrollPage from './features/employee/portal-pages/PayrollPage';
import TaxDeclarationPage from './features/employee/portal-pages/TaxDeclarationPage';
import ExpensePage from './features/employee/portal-pages/ExpensePage';
import TravelPage from './features/employee/portal-pages/TravelPage';
import AssetPage from './features/employee/portal-pages/AssetPage';
import DocumentsPage from './features/employee/portal-pages/DocumentsPage';
import IDCardPage from './features/employee/portal-pages/IDCardPage';
import OrgChartPage from './features/employee/portal-pages/OrgChartPage';
import TeamDirectoryPage from './features/employee/portal-pages/TeamDirectoryPage';
import PerformancePage from './features/employee/portal-pages/PerformancePage';
import GoalsPage from './features/employee/portal-pages/GoalsPage';
import FeedbackPage from './features/employee/portal-pages/FeedbackPage';
import LearningPage from './features/employee/portal-pages/LearningPage';
import TrainingPage from './features/employee/portal-pages/TrainingPage';
import PoliciesPage from './features/employee/portal-pages/PoliciesPage';
import AnnouncementsPage from './features/employee/portal-pages/AnnouncementsPage';
import SurveysPage from './features/employee/portal-pages/SurveysPage';
import HelpdeskPage from './features/employee/portal-pages/HelpdeskPage';
import ReferralPage from './features/employee/portal-pages/ReferralPage';
import JobOpeningsPage from './features/employee/portal-pages/JobOpeningsPage';
import HealthWellnessPage from './features/employee/portal-pages/HealthWellnessPage';
import LoanRequestPage from './features/employee/portal-pages/LoanRequestPage';
import AIAssistantPage from './features/employee/portal-pages/AIAssistantPage';
import NotificationsPage from './features/employee/portal-pages/NotificationsPage';
import ApprovalsPage from './features/employee/portal-pages/ApprovalsPage';
import SettingsSecurityPage from './features/employee/portal-pages/SettingsSecurityPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected Administrative Routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['organization_admin', 'hr_manager', 'department_head']}>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/manager/dashboard" element={<DepartmentDashboard />} />

        {/* Employee Management */}
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
        <Route path="/employees/onboarding" element={<OnboardingDashboardPage />} />
        <Route path="/org-structure" element={<OrgStructurePage />} />

        {/* Attendance Admin */}
        <Route path="/attendance" element={<AttendanceDashboard />} />

        {/* Leaves Admin */}
        <Route path="/leaves/approvals" element={<ApprovalInboxPage />} />

        {/* Payroll Admin */}
        <Route path="/payroll" element={<PayrollDashboard />} />
        <Route path="/payroll/salary-structure" element={<SalaryStructureManagement />} />
        <Route path="/payroll/processing" element={<PayrollProcessing />} />
        <Route path="/payroll/revisions" element={<SalaryRevisionManagement />} />
        <Route path="/payroll/loans" element={<LoanManagement />} />
        <Route path="/payroll/settlements" element={<FullFinalSettlement />} />
        <Route path="/payroll/admin-dashboard" element={<AdminDashboard />} />

        {/* Recruitment */}
        <Route path="/recruitment" element={<RecruitmentDashboard />} />
        <Route path="/recruitment/jobs" element={<JobManagement />} />
        <Route path="/recruitment/candidates" element={<CandidateManagement />} />

        {/* Asset Management Admin */}
        <Route path="/assets" element={<AssetDashboard />} />
        <Route path="/assets/list" element={<AssetList />} />
        <Route path="/assets/:id" element={<AssetDetails />} />
        <Route path="/assets/assign" element={<AssignAsset />} />
        <Route path="/assets/transfer" element={<TransferAsset />} />
        <Route path="/assets/return" element={<ReturnAsset />} />
        <Route path="/assets/maintenance" element={<Maintenance />} />
        <Route path="/assets/licenses" element={<Licenses />} />
        <Route path="/assets/reports" element={<Reports />} />
        <Route path="/assets/analytics" element={<Analytics />} />

        {/* Performance Admin */}
        <Route path="/performance" element={<PerformanceDashboard />} />
        <Route path="/performance/okrs" element={<OKRManagementPage />} />
        <Route path="/performance/review-form" element={<PerformanceReviewPage />} />
        <Route path="/performance/competencies" element={<CompetencyDashboardPage />} />
        <Route path="/performance/pips" element={<PIPDashboardPage />} />
        <Route path="/performance/succession" element={<SuccessionPlanningPage />} />
        <Route path="/performance/recognition" element={<RecognitionDashboardPage />} />
        <Route path="/performance/analytics" element={<PerformanceAnalyticsPage />} />

        {/* Workflow */}
        <Route path="/workflow" element={<WorkflowListPage />} />
        <Route path="/workflow/builder" element={<WorkflowBuilderPage />} />
        <Route path="/workflow/approvals" element={<ApprovalInboxPage />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationCenterPage />} />
        <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsLayout />} />
        <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
        <Route path="/settings/branches" element={<BranchesPage />} />
        <Route path="/settings/departments" element={<DepartmentsPage />} />
        <Route path="/settings/locations" element={<LocationsPage />} />
        <Route path="/settings/branding" element={<BrandingPage />} />
      </Route>

      {/* SuperAdmin Routes */}
      <Route
        element={
          <ProtectedRoute>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="/superadmin/organization" element={<SuperAdminOrganizationPage />} />
        <Route path="/superadmin/subscription" element={<SuperAdminSubscriptionPage />} />
        <Route path="/superadmin/helpdesk" element={<SuperAdminHelpDeskPage />} />
        <Route path="/superadmin/profile" element={<SuperAdminProfilePage />} />
      </Route>

      {/* Dedicated Employee Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
        <Route path="/team-lead/dashboard" element={<TeamDashboard />} />
        <Route path="/employee/profile" element={<ProfilePage />} />
        <Route path="/employee/attendance" element={<AttendancePage />} />
        <Route path="/employee/leaves" element={<LeavePage />} />
        <Route path="/employee/attendance-regularization" element={<RegularizationPage />} />
        <Route path="/employee/shift-roster" element={<ShiftRosterPage />} />
        <Route path="/employee/holiday-calendar" element={<HolidayCalendarPage />} />
        <Route path="/employee/timesheet" element={<TimesheetPage />} />
        <Route path="/employee/payroll" element={<PayrollPage />} />
        <Route path="/employee/tax-declaration" element={<TaxDeclarationPage />} />
        <Route path="/employee/expenses" element={<ExpensePage />} />
        <Route path="/employee/travel" element={<TravelPage />} />
        <Route path="/employee/assets" element={<AssetPage />} />
        <Route path="/employee/documents" element={<DocumentsPage />} />
        <Route path="/employee/id-card" element={<IDCardPage />} />
        <Route path="/employee/org-chart" element={<OrgChartPage />} />
        <Route path="/employee/team-directory" element={<TeamDirectoryPage />} />
        <Route path="/employee/performance" element={<PerformancePage />} />
        <Route path="/employee/goals" element={<GoalsPage />} />
        <Route path="/employee/feedback" element={<FeedbackPage />} />
        <Route path="/employee/learning" element={<LearningPage />} />
        <Route path="/employee/training" element={<TrainingPage />} />
        <Route path="/employee/policies" element={<PoliciesPage />} />
        <Route path="/employee/announcements" element={<AnnouncementsPage />} />
        <Route path="/employee/surveys" element={<SurveysPage />} />
        <Route path="/employee/helpdesk" element={<HelpdeskPage />} />
        <Route path="/employee/referrals" element={<ReferralPage />} />
        <Route path="/employee/job-openings" element={<JobOpeningsPage />} />
        <Route path="/employee/health-wellness" element={<HealthWellnessPage />} />
        <Route path="/employee/loans" element={<LoanRequestPage />} />
        <Route path="/employee/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/employee/notifications" element={<NotificationsPage />} />
        <Route path="/employee/approvals" element={<ApprovalsPage />} />
        <Route path="/employee/settings" element={<SettingsSecurityPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

