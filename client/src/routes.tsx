import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShellLayout } from './layouts/AppShellLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';

// Employee Pages
import { EmployeeListPage } from './features/employee/pages/EmployeeListPage';
import { EmployeeProfilePage } from './features/employee/pages/EmployeeProfilePage';
import { OnboardingDashboardPage } from './features/employee/pages/OnboardingDashboardPage';
import { OrgStructurePage } from './features/org-structure/pages/OrgStructurePage';

// Attendance Pages
import { MyAttendance } from './features/attendance/pages/MyAttendance';
import { AttendanceDashboard } from './features/attendance/pages/AttendanceDashboard';

// Leaves Pages
import { MyLeavesPage } from './features/leaves/pages/MyLeavesPage';
import { ApplyLeavePage } from './features/leaves/pages/ApplyLeavePage';
import { LeaveBalancePage } from './features/leaves/pages/LeaveBalancePage';
import { ApprovalInboxPage } from './features/leaves/pages/ApprovalInboxPage';
import { CompOffManagementPage } from './features/leaves/pages/CompOffManagementPage';

// Payroll Pages
import { PayrollDashboard } from './features/payroll/pages/PayrollDashboard';
import { PayslipViewer } from './features/payroll/pages/PayslipViewer';
import { SalaryStructureManagement } from './features/payroll/pages/SalaryStructureManagement';
import { TaxDeclaration } from './features/payroll/pages/TaxDeclaration';

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
// import { ApprovalInboxPage } from './features/workflow/pages/ApprovalInboxPage';

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

// SuperAdmin Pages & Layout
import { SuperAdminLayout } from './features/superadmin/sidebar/SuperAdminLayout';
import { SuperAdminDashboardPage } from './features/superadmin/Dashboard/SuperAdminDashboardPage';
import { SuperAdminOrganizationPage } from './features/superadmin/Organization/SuperAdminOrganizationPage';
import { SuperAdminSubscriptionPage } from './features/superadmin/Subcription/SuperAdminSubscriptionPage';
import { SuperAdminHelpDeskPage } from './features/superadmin/HelpDesk/SuperAdminHelpDeskPage';
import { SuperAdminProfilePage } from './features/superadmin/Profile/SuperAdminProfilePage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Employee Management */}
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/employees/onboarding" element={<OnboardingDashboardPage />} />
        <Route path="/org-structure" element={<OrgStructurePage />} />

        {/* Attendance */}
        <Route path="/attendance" element={<AttendanceDashboard />} />
        <Route path="/attendance/my-attendance" element={<MyAttendance />} />

        {/* Leaves */}
        <Route path="/leaves" element={<MyLeavesPage />} />
        <Route path="/leaves/my-leaves" element={<MyLeavesPage />} />
        <Route path="/leaves/history" element={<MyLeavesPage />} />
        <Route path="/leaves/apply" element={<ApplyLeavePage />} />
        <Route path="/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/leaves/approval" element={<ApprovalInboxPage />} />
        <Route path="/leaves/balance" element={<LeaveBalancePage />} />
        <Route path="/leaves/balances" element={<LeaveBalancePage />} />
        <Route path="/leaves/comp-off" element={<CompOffManagementPage />} />

        {/* Payroll */}
        <Route path="/payroll" element={<PayrollDashboard />} />
        <Route path="/payroll/payslips" element={<PayslipViewer />} />
        <Route path="/payroll/salary-structure" element={<SalaryStructureManagement />} />
        <Route path="/payroll/tax-declaration" element={<TaxDeclaration />} />

        {/* Recruitment */}
        <Route path="/recruitment" element={<RecruitmentDashboard />} />
        <Route path="/recruitment/jobs" element={<JobManagement />} />
        <Route path="/recruitment/candidates" element={<CandidateManagement />} />

        {/* Asset Management */}
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

        {/* Performance */}
        <Route path="/performance" element={<PerformanceDashboard />} />
        <Route path="/performance/goals" element={<GoalManagementPage />} />
        <Route path="/performance/okrs" element={<OKRManagementPage />} />
        <Route path="/performance/reviews" element={<ReviewCyclesPage />} />
        <Route path="/performance/review-form" element={<PerformanceReviewPage />} />
        <Route path="/performance/appraisals" element={<AppraisalDashboardPage />} />
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

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

