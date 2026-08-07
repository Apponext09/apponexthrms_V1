import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShellLayout } from './layouts/AppShellLayout';
import { HRLayout } from './layouts/HRLayout';
import { ManagerLayout } from './layouts/ManagerLayout';
import { TeamLeadLayout } from './layouts/TeamLeadLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ApprovalsDashboardPage } from './features/leaves/pages/ApprovalsDashboardPage';

// Employee Pages
import { EmployeeListPage } from './features/employee/pages/EmployeeListPage';
import { EmployeeProfilePage } from './features/employee/pages/EmployeeProfilePage';
import { EmployeeEditPage } from './features/employee/pages/EmployeeEditPage';
import { OnboardingDashboardPage } from './features/employee/pages/OnboardingDashboardPage';
import { EmployeeDashboardPage } from './features/employee/Dashboard/EmployeeDashboardPage';
import { EmployeeLayout } from './features/employee/layout/EmployeeLayout';
import { OrgStructurePage } from './features/org-structure/pages/OrgStructurePage';
import EmployeeLifecyclePage from './features/HR/EmployeeLifecycle/EmployeeLifecyclePage';

// Attendance Pages
import { MyAttendance } from './features/attendance/pages/MyAttendance';
import { AttendanceDashboard } from './features/attendance/pages/AttendanceDashboard';
import { AttendancePoliciesPage } from './features/attendance/pages/AttendancePoliciesPage';
import { LocationManagementPage } from './features/attendance/pages/LocationManagementPage';
import { HRAttendanceLocationPage } from './features/HR/Attendance';
import { ShiftManagementPage } from './features/attendance/pages/ShiftManagementPage';
import { BreakLogsPage } from './features/attendance/pages/BreakLogsPage';

// Live Tracking
import { LiveTrackingDashboardPage, TrackingHistoryPage } from './features/Livetracking';

// Leaves Pages
import { MyLeavesPage } from './features/leaves/pages/MyLeavesPage';
import { ApplyLeavePage } from './features/leaves/pages/ApplyLeavePage';
import { LeaveBalancePage } from './features/leaves/pages/LeaveBalancePage';
import { LeaveEncashmentPage } from './features/leaves/pages/LeaveEncashmentPage';
import { ApprovalInboxPage } from './features/leaves/pages/ApprovalInboxPage';
import { CompOffManagementPage } from './features/leaves/pages/CompOffManagementPage';
import { CustomReportBuilder } from './features/leaves/pages/CustomReportBuilder';
import { BurnoutRiskDashboard } from './features/HR/pages/BurnoutRiskDashboard';

// Payroll Pages
import { PayrollDashboard } from './features/payroll/pages/PayrollDashboard';
import { PayslipViewer } from './features/payroll/pages/PayslipViewer';
import { SalaryStructureManagement } from './features/payroll/pages/SalaryStructureManagement';
import { TaxDeclaration } from './features/payroll/pages/TaxDeclaration';
import { PayrollProcessing } from './features/payroll/pages/PayrollProcessing';
import { SalaryRevisionManagement } from './features/payroll/pages/SalaryRevisionManagement';
import { LoanManagement } from './features/payroll/pages/LoanManagement';
import { FullFinalSettlement } from './features/payroll/pages/FullFinalSettlement';
import { PayrollReportsPage } from './features/payroll/pages/PayrollReportsPage';
import { PayrollPoliciesPage } from './features/payroll/pages/PayrollPoliciesPage';
import { MySettlementPage } from './features/payroll/pages/MySettlementPage';
import { TeamSettlementsPage } from './features/payroll/pages/TeamSettlementsPage';
import { AdminDashboard } from './features/payroll/pages/AdminDashboard';
import { EmployeeLoanRequest } from './features/payroll/components/EmployeeLoanRequest';
import { AdminExpenseClaims } from './features/payroll/pages/AdminExpenseClaims';
import { AdminTravelRequests } from './features/payroll/pages/AdminTravelRequests';
import {
  EmployeePayrollPortal,
  TeamLeadPayrollPortal,
  ManagerPayrollPortal,
  HRPayrollPortal,
  AdminPayrollPortal
} from './features/payroll/pages';

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

// Analytics & Reports Pages
import { AnalyticsDashboard } from './features/analytics/pages/AnalyticsDashboard';
import { AttendanceReportsPage } from './features/analytics/pages/AttendanceReportsPage';
import { TimelogReportPage } from './features/analytics/pages/TimelogReportPage';

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
import { ModuleManagementPage } from './features/modules/modules';
import { HolidayCalendarsPage } from './features/settings/pages/HolidayCalendarsPage';
import { LeavePoliciesPage } from './features/settings/pages/LeavePoliciesPage';
import { OrgLeaveSettings } from './features/settings/pages/OrgLeaveSettings';
import { AttendanceModulePage } from './features/settings/pages/AttendanceModulePage';
import { MastersHubPage } from './features/settings/pages/MastersHubPage';
// Employee Lifecycle Pages
import { OnboardingPage } from './features/employee-lifecycle/pages/OnboardingPage';
import { TransfersPage } from './features/employee-lifecycle/pages/TransfersPage';
import { OffboardingPage } from './features/employee-lifecycle/pages/OffboardingPage';

// Common Pages
import { NotFoundPage } from './features/common/pages/NotFoundPage';
import { UnauthorizedPage } from './features/common/pages/UnauthorizedPage';
import { useAuthStore } from './features/auth/store/authStore';

// Role-specific portal pages
import { TeamDashboard } from './features/team-lead/pages/TeamDashboard';
import { DepartmentDashboard } from './features/manager/pages/DepartmentDashboard';
import { HRDashboardPage } from './features/HR/Dashboard/HRDashboardPage';
import { ManagerDashboardPage } from './features/manager/pages/ManagerDashboardPage';
import { MyTeamPage } from './features/manager/pages/MyTeamPage';
import { TeamLeadDashboardPage } from './features/team-lead/pages/TeamLeadDashboardPage';
import { TeamMembersPage } from './features/team-lead/pages/TeamMembersPage';
import { TeamLeadProfilePage } from './features/team-lead/pages/TeamLeadProfilePage';

// SuperAdmin Pages & Layout
import { SuperAdminLayout } from './features/superadmin/sidebar/SuperAdminLayout';
import { SuperAdminDashboardPage } from './features/superadmin/Dashboard/SuperAdminDashboardPage';
import { SuperAdminOrganizationPage } from './features/superadmin/Organization/SuperAdminOrganizationPage';
import { SuperAdminSubscriptionPage } from './features/superadmin/Subcription/SuperAdminSubscriptionPage';
import { SuperAdminHelpDeskPage } from './features/superadmin/HelpDesk/SuperAdminHelpDeskPage';
import { SuperAdminProfilePage } from './features/superadmin/Profile/SuperAdminProfilePage';

// Employee Portal Pages
import ProfilePage from './features/employee/pages/EmployeeProfilePage';
import AttendancePage from './features/employee/portal-pages/AttendancePage';
import LeavePage from './features/employee/portal-pages/LeavePage';
import RegularizationPage from './features/employee/portal-pages/RegularizationPage';
import FaceAttendancePage from './features/employee/portal-pages/FaceAttendancePage';
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

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roles = user?.roles || [];

  if (roles.includes('super_admin')) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }
  if (roles.includes('hr_manager')) {
    return <Navigate to="/hr/dashboard" replace />;
  }
  if (roles.includes('department_head') || roles.includes('manager')) {
    return <Navigate to="/manager/dashboard" replace />;
  }
  if (roles.includes('team_lead')) {
    return <Navigate to="/team-lead/dashboard" replace />;
  }
  if (roles.includes('organization_admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* ─────────────────────────────────────────────────
          HR MANAGER PORTAL  (/hr/*)
          Rose-accented sidebar — full HR tool access
      ───────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['hr_manager', 'organization_admin', 'super_admin', 'department_head', 'manager']}>
            <HRLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
        <Route path="/hr/dashboard" element={<HRDashboardPage />} />
        <Route path="/hr/profile" element={<EmployeeProfilePage />} />
        <Route path="/hr/my-profile" element={<EmployeeProfilePage />} />

        {/* People & Employee Lifecycle */}
        <Route path="/hr/employees" element={<EmployeeListPage />} />
        <Route path="/hr/employee-lifecycle" element={<EmployeeLifecyclePage />} />
        <Route path="/hr/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/hr/employees/:id/edit" element={<EmployeeEditPage />} />
        <Route path="/hr/departments" element={<DepartmentsPage />} />
        <Route path="/hr/employees/onboarding" element={<EmployeeLifecyclePage />} />
        <Route path="/hr/org-structure" element={<OrgStructurePage />} />

        {/* Payroll */}
        <Route path="/hr/payroll" element={<PayrollDashboard />} />
        <Route path="/hr/payroll-processing" element={<PayrollProcessing />} />
        <Route path="/hr/expense-claims" element={<AdminExpenseClaims />} />
        <Route path="/hr/travel-requests" element={<AdminTravelRequests />} />
        <Route path="/hr/loans" element={<LoanManagement />} />
        <Route path="/hr/loan-types" element={<LoanManagement />} />
        <Route path="/hr/payslips" element={<PayslipViewer />} />
        <Route path="/hr/salary-structure" element={<SalaryStructureManagement />} />
        <Route path="/hr/salary-structures" element={<SalaryStructureManagement />} />
        <Route path="/hr/salary-revision" element={<SalaryRevisionManagement />} />
        <Route path="/hr/salary-revisions" element={<SalaryRevisionManagement />} />
        <Route path="/hr/tax-declaration" element={<TaxDeclaration />} />
        <Route path="/hr/settlements" element={<FullFinalSettlement />} />

        {/* Leave & Time */}
        <Route path="/hr/attendance" element={<AttendanceDashboard />} />
        <Route path="/HR/attendance" element={<AttendanceDashboard />} />
        <Route path="/hr/attendance-policies" element={<AttendancePoliciesPage />} />
        <Route path="/hr/attendance/policies" element={<AttendancePoliciesPage />} />
        <Route path="/hr/face-attendance" element={<FaceAttendancePage />} />
        <Route path="/HR/face-attendance" element={<FaceAttendancePage />} />
        <Route path="/hr/attendance/locations" element={<HRAttendanceLocationPage />} />
        <Route path="/HR/attendance/locations" element={<HRAttendanceLocationPage />} />
        <Route path="/hr/attendance-locations" element={<HRAttendanceLocationPage />} />
        <Route path="/HR/attendance-locations" element={<HRAttendanceLocationPage />} />
        <Route path="/hr/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/hr/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/HR/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/hr/holidays" element={<HolidayCalendarsPage />} />

        {/* Recruitment */}
        <Route path="/hr/recruitment" element={<RecruitmentDashboard />} />
        <Route path="/hr/recruitment/jobs" element={<JobManagement />} />

        {/* Performance */}
        <Route path="/hr/performance" element={<PerformanceDashboard />} />
        <Route path="/hr/performance/reviews" element={<ReviewCyclesPage />} />

        {/* Operations */}
        <Route path="/hr/masters" element={<MastersHubPage />} />
        <Route path="/hr/workflow" element={<WorkflowListPage />} />
        <Route path="/hr/settings/*" element={<SettingsLayout />} />
        <Route path="/hr/settings" element={<SettingsLayout />} />
        <Route path="/hr/live-tracking" element={<LiveTrackingDashboardPage />} />
        <Route path="/hr/live-tracking/history" element={<TrackingHistoryPage />} />
        <Route path="/admin/live-tracking/history" element={<TrackingHistoryPage />} />
      </Route>

      {/* ─────────────────────────────────────────────────
          MANAGER / DEPT HEAD PORTAL  (/manager/*)
          Violet-accented sidebar — department management
      ───────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin']}>
            <ManagerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
        <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
        <Route path="/manager/team" element={<MyTeamPage />} />
        <Route path="/manager/attendance" element={<AttendanceDashboard />} />
        <Route path="/manager/face-attendance" element={<FaceAttendancePage />} />
        <Route path="/manager/leave-approvals" element={<ApprovalInboxPage />} />
        <Route path="/manager/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/manager/hiring" element={<DepartmentDashboard />} />
        <Route path="/manager/payroll" element={<EmployeePayrollPortal />} />
        <Route path="/manager/loans" element={<EmployeeLoanRequest />} />
        <Route path="/manager/expenses" element={<ExpensePage />} />
        <Route path="/manager/travel" element={<TravelPage />} />
        <Route path="/manager/payslips" element={<PayslipViewer />} />
        <Route path="/manager/salary-revisions" element={<SalaryRevisionManagement />} />
        <Route path="/manager/salary-revision" element={<SalaryRevisionManagement />} />
        <Route path="/manager/performance" element={<PerformanceDashboard />} />
        <Route path="/manager/performance/reviews" element={<ReviewCyclesPage />} />
        <Route path="/manager/performance/goals" element={<GoalManagementPage />} />
        <Route path="/manager/approvals" element={<ApprovalsPage />} />
        <Route path="/manager/profile" element={<EmployeeProfilePage />} />
        <Route path="/manager/leaves" element={<LeavePage />} />
        <Route path="/manager/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/manager/live-tracking" element={<LiveTrackingDashboardPage />} />
      </Route>

      {/* ─────────────────────────────────────────────────
          TEAM LEAD PORTAL  (/team-lead/*)
          Emerald-accented sidebar — team management
      ───────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['team_lead', 'department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin']}>
            <TeamLeadLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/team-lead" element={<Navigate to="/team-lead/dashboard" replace />} />
        <Route path="/team-lead/dashboard" element={<TeamLeadDashboardPage />} />
        <Route path="/team-lead/members" element={<TeamMembersPage />} />
        <Route path="/team-lead/attendance" element={<AttendanceDashboard />} />
        <Route path="/team-lead/face-attendance" element={<FaceAttendancePage />} />
        <Route path="/team-lead/payroll" element={<EmployeePayrollPortal />} />
        <Route path="/team-lead/loans" element={<EmployeeLoanRequest />} />
        <Route path="/team-lead/expenses" element={<ExpensePage />} />
        <Route path="/team-lead/travel" element={<TravelPage />} />
        <Route path="/team-lead/payslips" element={<PayslipViewer />} />
        <Route path="/team-lead/salary-revisions" element={<SalaryRevisionManagement />} />
        <Route path="/team-lead/salary-revision" element={<SalaryRevisionManagement />} />
        <Route path="/team-lead/profile" element={<TeamLeadProfilePage />} />
        <Route path="/team-lead/leaves" element={<LeavePage />} />
        <Route path="/team-lead/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/team-lead/live-tracking" element={<LiveTrackingDashboardPage />} />
      </Route>

      {/* ─────────────────────────────────────────────────
          ADMIN PANEL  (existing AppShellLayout)
          Full admin access
      ───────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['organization_admin', 'hr_manager', 'department_head', 'team_lead', 'super_admin']}>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        {/* Approvals generic shortcut */}
        <Route path="/approvals" element={<ApprovalInboxPage />} />
        <Route path="/approvals/dashboard" element={<ApprovalsDashboardPage />} />

        {/* Dashboard — smart redirects by role */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Employee Management */}
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
        <Route path="/employees/onboarding" element={<OnboardingDashboardPage />} />
        <Route path="/org-structure" element={<OrgStructurePage />} />

        {/* Attendance Admin & Self-Service */}
        <Route path="/attendance" element={<AttendanceDashboard />} />
        <Route path="/attendance/policies" element={<AttendancePoliciesPage />} />
        <Route path="/attendance/my-attendance" element={<MyAttendance />} />
        <Route path="/attendance/locations" element={<LocationManagementPage />} />
        <Route path="/attendance/employee-locations" element={<HRAttendanceLocationPage />} />
        <Route path="/attendance/shifts" element={<ShiftManagementPage pageType="general" />} />
        <Route path="/attendance/roster-shifts" element={<ShiftManagementPage pageType="roster" />} />
        <Route path="/attendance/reports" element={<BreakLogsPage />} />
        <Route path="/attendance/break-report" element={<BreakLogsPage />} />
        <Route path="/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/manager/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/team-lead/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/attendance/live-tracking" element={<LiveTrackingDashboardPage />} />
        <Route path="/live-tracking" element={<LiveTrackingDashboardPage />} />

        {/* Leaves */}
        <Route path="/leaves" element={<MyLeavesPage />} />
        <Route path="/leaves/my-leaves" element={<MyLeavesPage />} />
        <Route path="/leaves/history" element={<MyLeavesPage />} />
        <Route path="/leaves/apply" element={<ApplyLeavePage />} />
        <Route path="/leaves/approvals" element={<ApprovalInboxPage />} />
        <Route path="/leaves/approval" element={<ApprovalInboxPage />} />
        <Route path="/leaves/balance" element={<LeaveBalancePage />} />
        <Route path="/leaves/balances" element={<LeaveBalancePage />} />
        <Route path="/leaves/encashment" element={<LeaveEncashmentPage />} />
        <Route path="/leaves/comp-off" element={<CompOffManagementPage />} />
        <Route path="/leaves/reports/builder" element={<CustomReportBuilder />} />
        <Route path="/leaves/reports/burnout-risk" element={<BurnoutRiskDashboard />} />
        <Route path="/holidays" element={<HolidayCalendarsPage />} />

        {/* Payroll Admin */}
        <Route path="/payroll" element={<PayrollDashboard />} />
        <Route path="/payroll/admin-dashboard" element={<PayrollDashboard />} />
        <Route path="/admin/payroll-policies" element={<AdminPayrollPortal />} />
        <Route path="/payroll/expense-claims" element={<AdminExpenseClaims />} />
        <Route path="/payroll/travel-requests" element={<AdminTravelRequests />} />
        <Route path="/payroll/reimbursements" element={<AdminExpenseClaims />} />
        <Route path="/expense-claims" element={<AdminExpenseClaims />} />
        <Route path="/travel-requests" element={<AdminTravelRequests />} />
        <Route path="/reimbursements" element={<AdminExpenseClaims />} />
        <Route path="/payroll/salary-structure" element={<SalaryStructureManagement />} />
        <Route path="/payroll/salary-revision" element={<SalaryRevisionManagement />} />
        <Route path="/payroll/salary-revisions" element={<SalaryRevisionManagement />} />
        <Route path="/payroll/processing" element={<PayrollProcessing />} />
        <Route path="/payroll/reports" element={<PayrollReportsPage />} />
        <Route path="/hr/payroll/reports" element={<PayrollReportsPage />} />
        <Route path="/payroll/loans" element={<LoanManagement />} />
        <Route path="/payroll/loan-types" element={<LoanManagement />} />
        <Route path="/payroll/tax-declaration" element={<TaxDeclaration />} />
        <Route path="/payroll/settlements" element={<FullFinalSettlement />} />
        <Route path="/payroll/settlement" element={<FullFinalSettlement />} />
        <Route path="/payroll/policies" element={<PayrollPoliciesPage />} />
        <Route path="/manager/settlements" element={<TeamSettlementsPage />} />
        <Route path="/team-lead/settlements" element={<TeamSettlementsPage />} />
        <Route path="/payroll/payslips" element={<PayslipViewer />} />
        <Route path="/payroll/payslip-requests" element={<PayslipViewer />} />

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
        <Route path="/performance/goals" element={<GoalManagementPage />} />
        <Route path="/performance/reviews" element={<ReviewCyclesPage />} />
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

        {/* Reports & Analytics */}
        <Route path="/analytics" element={<Navigate to="/analytics/attendance" replace />} />
        <Route path="/analytics/attendance" element={<AttendanceReportsPage />} />
        <Route path="/analytics/timelog" element={<TimelogReportPage />} />

        {/* Employee Lifecycle */}
        <Route path="/employee-lifecycle" element={<EmployeeLifecyclePage />} />
        <Route path="/employee-lifecycle/*" element={<EmployeeLifecyclePage />} />
        <Route path="/employees" element={<EmployeeLifecyclePage />} />

        {/* Settings & Profile */}
        <Route path="/profile" element={<CompanyProfilePage />} />
        <Route path="/settings" element={<SettingsLayout />} />
        <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
        <Route path="/settings/branches" element={<BranchesPage />} />
        <Route path="/settings/departments" element={<DepartmentsPage />} />
        <Route path="/settings/locations" element={<LocationsPage />} />
        <Route path="/settings/branding" element={<BrandingPage />} />
        <Route path="/settings/leave-policies" element={<LeavePoliciesPage />} />
        <Route path="/settings/org-leave-settings" element={<OrgLeaveSettings />} />
        <Route path="/settings/attendance-module" element={<AttendanceModulePage />} />
        <Route path="/settings/modules" element={<ModuleManagementPage />} />
        <Route path="/masters" element={<MastersHubPage />} />
        <Route path="/modules" element={<ModuleManagementPage />} />
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="company-profile" replace />} />
          <Route path="company-profile" element={<CompanyProfilePage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="leave-policies" element={<LeavePoliciesPage />} />
          <Route path="org-leave-settings" element={<OrgLeaveSettings />} />
          <Route path="attendance-module" element={<AttendanceModulePage />} />
        </Route>
      </Route>

      {/* ─────────────────────────────────────────────────
          SUPERADMIN ROUTES
      ───────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
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

      {/* ─────────────────────────────────────────────────
          EMPLOYEE + SHARED PORTAL ROUTES
          (EmployeeLayout — used by all roles for self-service)
      ───────────────────────────────────────────────── */}
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
        <Route path="/employee/face-attendance" element={<FaceAttendancePage />} />
        <Route path="/employee/leaves" element={<LeavePage />} />
        <Route path="/employee/attendance-regularization" element={<RegularizationPage />} />
        <Route path="/employee/shift-roster" element={<ShiftRosterPage />} />
        <Route path="/employee/holiday-calendar" element={<HolidayCalendarPage />} />
        <Route path="/employee/timesheet" element={<TimesheetPage />} />
        <Route path="/employee/payroll" element={<EmployeePayrollPortal />} />
        <Route path="/employee/my-settlement" element={<MySettlementPage />} />
        <Route path="/employee/settlement" element={<MySettlementPage />} />
        <Route path="/employee/payslips" element={<PayslipViewer />} />
        <Route path="/employee/salary-revisions" element={<PayrollPage />} />
        <Route path="/employee/salary-revision" element={<PayrollPage />} />
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
        <Route path="/employee/notifications" element={<NotificationCenterPage />} />
        <Route path="/employee/approvals" element={<ApprovalsPage />} />
        <Route path="/employee/settings" element={<SettingsSecurityPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
