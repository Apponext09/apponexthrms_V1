import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import type { Role } from '@/config/roles';
import { AppShellLayout } from './layouts/AppShellLayout';
import { HRLayout } from './layouts/HRLayout';
import { ManagerLayout } from './layouts/ManagerLayout';
import { TeamLeadLayout } from './layouts/TeamLeadLayout';
import { InternLayout } from './layouts/InternLayout';
import { ConsultantLayout } from './layouts/ConsultantLayout';
import { EmployeeLayout } from './features/employee/layout/EmployeeLayout';
import { SettingsLayout } from './features/settings/pages/SettingsLayout';
import { SuperAdminLayout } from './features/superadmin/sidebar/SuperAdminLayout';
import { useAuthStore, useAuthHydrated, hasStoredAccessToken } from './features/auth/store/authStore';

// ── Lazy Loaded Page Components ──────────────────────────────────────────
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ApprovalsDashboardPage = lazy(() => import('./features/leaves/pages/ApprovalsDashboardPage').then(m => ({ default: m.ApprovalsDashboardPage })));
const EmployeeListPage = lazy(() => import('./features/employee/pages/EmployeeListPage').then(m => ({ default: m.EmployeeListPage })));
const EmployeeProfilePage = lazy(() => import('./features/employee/pages/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const EmployeeEditPage = lazy(() => import('./features/employee/pages/EmployeeEditPage').then(m => ({ default: m.EmployeeEditPage })));
const OnboardingDashboardPage = lazy(() => import('./features/employee/pages/OnboardingDashboardPage').then(m => ({ default: m.OnboardingDashboardPage })));
const EmployeeDashboardPage = lazy(() => import('./features/employee/Dashboard/EmployeeDashboardPage').then(m => ({ default: m.EmployeeDashboardPage })));
const OrgStructurePage = lazy(() => import('./features/org-structure/pages/OrgStructurePage').then(m => ({ default: m.OrgStructurePage })));
const EmployeeLifecyclePage = lazy(() => import('./features/HR/EmployeeLifecycle/EmployeeLifecyclePage'));
const MyLifecyclePage = lazy(() => import('./features/employee/pages/MyLifecyclePage').then(m => ({ default: m.MyLifecyclePage })));
const AttendanceDashboard = lazy(() => import('./features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const AttendancePoliciesPage = lazy(() => import('./features/attendance/pages/AttendancePoliciesPage').then(m => ({ default: m.AttendancePoliciesPage })));
const LocationManagementPage = lazy(() => import('./features/attendance/pages/LocationManagementPage').then(m => ({ default: m.LocationManagementPage })));
const HRAttendanceLocationPage = lazy(() => import('./features/HR/Attendance').then(m => ({ default: m.HRAttendanceLocationPage })));
const ShiftManagementPage = lazy(() => import('./features/attendance/pages/ShiftManagementPage').then(m => ({ default: m.ShiftManagementPage })));
const BreakLogsPage = lazy(() => import('./features/attendance/pages/BreakLogsPage').then(m => ({ default: m.BreakLogsPage })));
const ManagerHRRegularizationApprovals = lazy(() => import('./features/attendance/components/ManagerHRRegularizationApprovals').then(m => ({ default: m.ManagerHRRegularizationApprovals })));
const AdminRegularizationLogsPage = lazy(() => import('./features/attendance/pages/AdminRegularizationLogsPage'));
const CeoFacePunchPage = lazy(() => import('./features/attendance/pages/CeoFacePunchPage'));
const LiveTrackingDashboardPage = lazy(() => import('./features/Livetracking').then(m => ({ default: m.LiveTrackingDashboardPage })));
const TrackingHistoryPage = lazy(() => import('./features/Livetracking').then(m => ({ default: m.TrackingHistoryPage })));
const MyLeavesPage = lazy(() => import('./features/leaves/pages/MyLeavesPage').then(m => ({ default: m.MyLeavesPage })));
const ApplyLeavePage = lazy(() => import('./features/leaves/pages/ApplyLeavePage').then(m => ({ default: m.ApplyLeavePage })));
const LeaveBalancePage = lazy(() => import('./features/leaves/pages/LeaveBalancePage').then(m => ({ default: m.LeaveBalancePage })));
const LeaveEncashmentPage = lazy(() => import('./features/leaves/pages/LeaveEncashmentPage').then(m => ({ default: m.LeaveEncashmentPage })));
const ApprovalInboxPage = lazy(() => import('./features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const CustomReportBuilder = lazy(() => import('./features/leaves/pages/CustomReportBuilder').then(m => ({ default: m.CustomReportBuilder })));
const BurnoutRiskDashboard = lazy(() => import('./features/HR/pages/BurnoutRiskDashboard').then(m => ({ default: m.BurnoutRiskDashboard })));
const EmployeeRequestsPage = lazy(() => import('./features/HR/requests/EmployeeRequestsPage').then(m => ({ default: m.EmployeeRequestsPage })));
const PayrollDashboard = lazy(() => import('./features/payroll/pages/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const PayslipViewer = lazy(() => import('./features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const SalaryStructureManagement = lazy(() => import('./features/payroll/pages/SalaryStructureManagement').then(m => ({ default: m.SalaryStructureManagement })));
const PayrollSettingsPage = lazy(() => import('./features/payroll/pages/PayrollSettingsPage').then(m => ({ default: m.PayrollSettingsPage })));
const TaxDeclaration = lazy(() => import('./features/payroll/pages/TaxDeclaration').then(m => ({ default: m.TaxDeclaration })));
const PayrollProcessing = lazy(() => import('./features/payroll/pages/PayrollProcessing').then(m => ({ default: m.PayrollProcessing })));
const SalaryRevisionManagement = lazy(() => import('./features/payroll/pages/SalaryRevisionManagement').then(m => ({ default: m.SalaryRevisionManagement })));
const LoanManagement = lazy(() => import('./features/payroll/pages/LoanManagement').then(m => ({ default: m.LoanManagement })));
const FullFinalSettlement = lazy(() => import('./features/payroll/pages/FullFinalSettlement').then(m => ({ default: m.FullFinalSettlement })));
const GratuityPolicyPage = lazy(() => import('./features/payroll/pages/GratuityPolicyPage').then(m => ({ default: m.GratuityPolicyPage })));
const PayrollReportsPage = lazy(() => import('./features/payroll/pages/PayrollReportsPage').then(m => ({ default: m.PayrollReportsPage })));
const PayrollPoliciesPage = lazy(() => import('./features/payroll/pages/PayrollPoliciesPage').then(m => ({ default: m.PayrollPoliciesPage })));
const MySettlementPage = lazy(() => import('./features/payroll/pages/MySettlementPage').then(m => ({ default: m.MySettlementPage })));
const TeamSettlementsPage = lazy(() => import('./features/payroll/pages/TeamSettlementsPage').then(m => ({ default: m.TeamSettlementsPage })));
const AdminDashboard = lazy(() => import('./features/payroll/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MassSalaryStructureUploadPage = lazy(() => import('./features/payroll/pages/MassSalaryStructureUploadPage').then(m => ({ default: m.MassSalaryStructureUploadPage })));
const EmployeeLoanRequest = lazy(() => import('./features/payroll/components/EmployeeLoanRequest').then(m => ({ default: m.EmployeeLoanRequest })));
const EmployeePayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.EmployeePayrollPortal })));
const TeamLeadPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.TeamLeadPayrollPortal })));
const ManagerPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.ManagerPayrollPortal })));
const HRPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.HRPayrollPortal })));
const AdminPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.AdminPayrollPortal })));
const RecruitmentDashboard = lazy(() => import('./features/recruitment/pages/RecruitmentDashboard').then(m => ({ default: m.RecruitmentDashboard })));
const MrfRequestPage = lazy(() => import('./features/recruitment/pages/MrfRequestPage').then(m => ({ default: m.MrfRequestPage })));
const CandidateReportPage = lazy(() => import('./features/recruitment/pages/CandidateReportPage').then(m => ({ default: m.CandidateReportPage })));
const JobReferencePage = lazy(() => import('./features/recruitment/pages/JobReferencePage').then(m => ({ default: m.JobReferencePage })));
const PublicOfferPage = lazy(() => import('./features/recruitment/pages/PublicOfferPage').then(m => ({ default: m.PublicOfferPage })));
const TakeAssessmentPage = lazy(() => import('./features/recruitment/pages/TakeAssessmentPage').then(m => ({ default: m.TakeAssessmentPage })));
const ResumeBankPage = lazy(() => import('./features/recruitment/pages/ResumeBankPage').then(m => ({ default: m.ResumeBankPage })));
const CareerPortalCustomizationPage = lazy(() => import('./features/recruitment/pages/CareerPortalCustomizationPage').then(m => ({ default: m.CareerPortalCustomizationPage })));
const ApplicantTrackerPage = lazy(() => import('./features/recruitment/pages/ApplicantTrackerPage').then(m => ({ default: m.ApplicantTrackerPage })));
const InterviewerRatingPage = lazy(() => import('./features/recruitment/pages/InterviewerRatingPage').then(m => ({ default: m.InterviewerRatingPage })));
const JobManagement = lazy(() => import('./features/recruitment/pages/JobManagement').then(m => ({ default: m.JobManagement })));
const CandidateManagement = lazy(() => import('./features/recruitment/pages/CandidateManagement').then(m => ({ default: m.CandidateManagement })));
const AssessmentManagementPage = lazy(() => import('./features/recruitment/pages/AssessmentManagementPage').then(m => ({ default: m.AssessmentManagementPage })));
const OfferManagementPage = lazy(() => import('./features/recruitment/pages/OfferManagementPage').then(m => ({ default: m.OfferManagementPage })));
const LetterManagementPage = lazy(() => import('./features/letters/pages/LetterManagementPage').then(m => ({ default: m.LetterManagementPage })));
const InterviewCalendarPage = lazy(() => import('./features/recruitment/pages/InterviewCalendarPage').then(m => ({ default: m.InterviewCalendarPage })));
const ReferralManagementPage = lazy(() => import('./features/recruitment/pages/ReferralManagementPage').then(m => ({ default: m.ReferralManagementPage })));
const CareersPortalPage = lazy(() => import('./features/recruitment/pages/CareersPortalPage').then(m => ({ default: m.CareersPortalPage })));
const AssetDashboard = lazy(() => import('./features/asset/pages/AssetDashboard').then(m => ({ default: m.AssetDashboard })));
const AssetList = lazy(() => import('./features/asset/pages/AssetList').then(m => ({ default: m.AssetList })));
const AssetDetails = lazy(() => import('./features/asset/pages/AssetDetails').then(m => ({ default: m.AssetDetails })));
const AssignAsset = lazy(() => import('./features/asset/pages/AssignAsset').then(m => ({ default: m.AssignAsset })));
const TransferAsset = lazy(() => import('./features/asset/pages/TransferAsset').then(m => ({ default: m.TransferAsset })));
const ReturnAsset = lazy(() => import('./features/asset/pages/ReturnAsset').then(m => ({ default: m.ReturnAsset })));
const Maintenance = lazy(() => import('./features/asset/pages/Maintenance').then(m => ({ default: m.Maintenance })));
const Licenses = lazy(() => import('./features/asset/pages/Licenses').then(m => ({ default: m.Licenses })));
const Reports = lazy(() => import('./features/asset/pages/Reports').then(m => ({ default: m.Reports })));
const Analytics = lazy(() => import('./features/asset/pages/Analytics').then(m => ({ default: m.Analytics })));
const MyAssetsPage = lazy(() => import('./features/asset/pages/MyAssetsPage').then(m => ({ default: m.MyAssetsPage })));
const AnalyticsDashboard = lazy(() => import('./features/analytics/pages/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const AttendanceReportsPage = lazy(() => import('./features/analytics/pages/AttendanceReportsPage').then(m => ({ default: m.AttendanceReportsPage })));
const TimelogReportPage = lazy(() => import('./features/analytics/pages/TimelogReportPage').then(m => ({ default: m.TimelogReportPage })));
const CeoAttendanceReportPage = lazy(() => import('./features/analytics/pages/CeoAttendanceReportPage').then(m => ({ default: m.CeoAttendanceReportPage })));
const ReportEnginePage = lazy(() => import('./features/analytics/pages/ReportEnginePage').then(m => ({ default: m.ReportEnginePage })));
const PerformanceDashboard = lazy(() => import('./features/performance/pages/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const GoalManagementPage = lazy(() => import('./features/performance/pages/GoalManagementPage').then(m => ({ default: m.GoalManagementPage })));
const OKRManagementPage = lazy(() => import('./features/performance/pages/OKRManagementPage').then(m => ({ default: m.OKRManagementPage })));
const ReviewCyclesPage = lazy(() => import('./features/performance/pages/ReviewCyclesPage').then(m => ({ default: m.ReviewCyclesPage })));
const PerformanceReviewPage = lazy(() => import('./features/performance/pages/PerformanceReviewPage').then(m => ({ default: m.PerformanceReviewPage })));
const AppraisalDashboardPage = lazy(() => import('./features/performance/pages/AppraisalDashboardPage').then(m => ({ default: m.AppraisalDashboardPage })));
const CompetencyDashboardPage = lazy(() => import('./features/performance/pages/CompetencyDashboardPage').then(m => ({ default: m.CompetencyDashboardPage })));
const PIPDashboardPage = lazy(() => import('./features/performance/pages/PIPDashboardPage').then(m => ({ default: m.PIPDashboardPage })));
const SuccessionPlanningPage = lazy(() => import('./features/performance/pages/SuccessionPlanningPage').then(m => ({ default: m.SuccessionPlanningPage })));
const RecognitionDashboardPage = lazy(() => import('./features/performance/pages/RecognitionDashboardPage').then(m => ({ default: m.RecognitionDashboardPage })));
const PerformanceAnalyticsPage = lazy(() => import('./features/performance/pages/PerformanceAnalyticsPage').then(m => ({ default: m.PerformanceAnalyticsPage })));
const WorkflowListPage = lazy(() => import('./features/workflow/pages/WorkflowListPage').then(m => ({ default: m.WorkflowListPage })));
const WorkflowBuilderPage = lazy(() => import('./features/workflow/pages/WorkflowBuilderPage').then(m => ({ default: m.WorkflowBuilderPage })));
const WorkflowDetailPage = lazy(() => import('./features/workflow/pages/WorkflowDetailPage').then(m => ({ default: m.WorkflowDetailPage })));
const WorkflowSettingsPage = lazy(() => import('./features/workflow/pages/WorkflowSettingsPage').then(m => ({ default: m.WorkflowSettingsPage })));
const NotificationCenterPage = lazy(() => import('./features/notifications/pages/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })));
const NotificationPreferencesPage = lazy(() => import('./features/notifications/pages/NotificationPreferencesPage').then(m => ({ default: m.NotificationPreferencesPage })));
const GeneralSettingsPage = lazy(() => import('./features/settings/pages/GeneralSettingsPage').then(m => ({ default: m.GeneralSettingsPage })));
const CompanyProfilePage = lazy(() => import('./features/settings/pages/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const BranchesPage = lazy(() => import('./features/settings/pages/BranchesPage').then(m => ({ default: m.BranchesPage })));
const DepartmentsPage = lazy(() => import('./features/settings/pages/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })));
const DesignationsPage = lazy(() => import('./features/settings/pages/DesignationsPage').then(m => ({ default: m.DesignationsPage })));
const LocationsPage = lazy(() => import('./features/settings/pages/LocationsPage').then(m => ({ default: m.LocationsPage })));
const BrandingPage = lazy(() => import('./features/settings/pages/BrandingPage').then(m => ({ default: m.BrandingPage })));
const ModuleManagementPage = lazy(() => import('./features/modules/modules').then(m => ({ default: m.ModuleManagementPage })));
const HolidayCalendarsPage = lazy(() => import('./features/settings/pages/HolidayCalendarsPage').then(m => ({ default: m.HolidayCalendarsPage })));
const LeavePoliciesPage = lazy(() => import('./features/settings/pages/LeavePoliciesPage').then(m => ({ default: m.LeavePoliciesPage })));
const OrgLeaveSettings = lazy(() => import('./features/settings/pages/OrgLeaveSettings').then(m => ({ default: m.OrgLeaveSettings })));
const AttendanceModulePage = lazy(() => import('./features/settings/pages/AttendanceModulePage').then(m => ({ default: m.AttendanceModulePage })));
const MastersHubPage = lazy(() => import('./features/settings/pages/MastersHubPage').then(m => ({ default: m.MastersHubPage })));
const MasterBuilderPage = lazy(() => import('./features/master-builder/pages/MasterBuilderPage').then(m => ({ default: m.MasterBuilderPage })));
const MasterBuilderDetailPage = lazy(() => import('./features/master-builder/pages/MasterBuilderDetailPage').then(m => ({ default: m.MasterBuilderDetailPage })));
const IdCardDesignerPage = lazy(() => import('./features/settings/pages/IdCardDesignerPage').then(m => ({ default: m.IdCardDesignerPage })));
const AdminConfigurationPage = lazy(() => import('./features/settings/pages/AdminConfigurationPage').then(m => ({ default: m.AdminConfigurationPage })));
const OnboardingPage = lazy(() => import('./features/employee-lifecycle/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const TransfersPage = lazy(() => import('./features/employee-lifecycle/pages/TransfersPage').then(m => ({ default: m.TransfersPage })));
const OffboardingPage = lazy(() => import('./features/employee-lifecycle/pages/OffboardingPage').then(m => ({ default: m.OffboardingPage })));
const NotFoundPage = lazy(() => import('./features/common/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const UnauthorizedPage = lazy(() => import('./features/common/pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const TeamDashboard = lazy(() => import('./features/team-lead/pages/TeamDashboard').then(m => ({ default: m.TeamDashboard })));
const DepartmentDashboard = lazy(() => import('./features/manager/pages/DepartmentDashboard').then(m => ({ default: m.DepartmentDashboard })));
const HRDashboardPage = lazy(() => import('./features/HR/Dashboard/HRDashboardPage').then(m => ({ default: m.HRDashboardPage })));
const ManagerDashboardPage = lazy(() => import('./features/manager/pages/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const MyTeamPage = lazy(() => import('./features/manager/pages/MyTeamPage').then(m => ({ default: m.MyTeamPage })));
const TeamLeadDashboardPage = lazy(() => import('./features/team-lead/pages/TeamLeadDashboardPage').then(m => ({ default: m.TeamLeadDashboardPage })));
const TeamMembersPage = lazy(() => import('./features/team-lead/pages/TeamMembersPage').then(m => ({ default: m.TeamMembersPage })));
const TeamLeadProfilePage = lazy(() => import('./features/team-lead/pages/TeamLeadProfilePage').then(m => ({ default: m.TeamLeadProfilePage })));
const SuperAdminDashboardPage = lazy(() => import('./features/superadmin/Dashboard/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const SuperAdminOrganizationPage = lazy(() => import('./features/superadmin/Organization/SuperAdminOrganizationPage').then(m => ({ default: m.SuperAdminOrganizationPage })));
const SuperAdminSubscriptionPage = lazy(() => import('./features/superadmin/Subcription/SuperAdminSubscriptionPage').then(m => ({ default: m.SuperAdminSubscriptionPage })));
const SuperAdminHelpDeskPage = lazy(() => import('./features/superadmin/HelpDesk/SuperAdminHelpDeskPage').then(m => ({ default: m.SuperAdminHelpDeskPage })));
const SuperAdminProfilePage = lazy(() => import('./features/superadmin/Profile/SuperAdminProfilePage').then(m => ({ default: m.SuperAdminProfilePage })));
const ProfilePage = lazy(() => import('./features/employee/portal-pages/ProfilePage'));
const AttendancePage = lazy(() => import('./features/employee/portal-pages/AttendancePage'));
const LeavePage = lazy(() => import('./features/employee/portal-pages/LeavePage'));
const RegularizationPage = lazy(() => import('./features/employee/portal-pages/RegularizationPage'));
const FaceAttendancePage = lazy(() => import('./features/employee/portal-pages/FaceAttendancePage'));
const ShiftRosterPage = lazy(() => import('./features/employee/portal-pages/ShiftRosterPage'));
const HolidayCalendarPage = lazy(() => import('./features/employee/portal-pages/HolidayCalendarPage'));
const TimesheetPage = lazy(() => import('./features/employee/portal-pages/TimesheetPage'));
const PayrollPage = lazy(() => import('./features/employee/portal-pages/PayrollPage'));
const TaxDeclarationPage = lazy(() => import('./features/employee/portal-pages/TaxDeclarationPage'));
const TravelPage = lazy(() => import('./features/employee/portal-pages/TravelPage'));
const AssetPage = lazy(() => import('./features/employee/portal-pages/AssetPage'));
const DocumentsPage = lazy(() => import('./features/employee/portal-pages/DocumentsPage'));
const IDCardPage = lazy(() => import('./features/employee/portal-pages/IDCardPage'));
const OrgChartPage = lazy(() => import('./features/employee/portal-pages/OrgChartPage'));
const TeamDirectoryPage = lazy(() => import('./features/employee/portal-pages/TeamDirectoryPage'));
const PerformancePage = lazy(() => import('./features/employee/portal-pages/PerformancePage'));
const GoalsPage = lazy(() => import('./features/employee/portal-pages/GoalsPage'));
const FeedbackPage = lazy(() => import('./features/employee/portal-pages/FeedbackPage'));
const LearningPage = lazy(() => import('./features/employee/portal-pages/LearningPage'));
const TrainingPage = lazy(() => import('./features/employee/portal-pages/TrainingPage'));
const PoliciesPage = lazy(() => import('./features/employee/portal-pages/PoliciesPage'));
const AnnouncementsPage = lazy(() => import('./features/employee/portal-pages/AnnouncementsPage'));
const SurveysPage = lazy(() => import('./features/employee/portal-pages/SurveysPage'));
const HelpdeskPage = lazy(() => import('./features/employee/portal-pages/HelpdeskPage'));
const ReferralPage = lazy(() => import('./features/employee/portal-pages/ReferralPage'));
const JobOpeningsPage = lazy(() => import('./features/employee/portal-pages/JobOpeningsPage'));
const HealthWellnessPage = lazy(() => import('./features/employee/portal-pages/HealthWellnessPage'));
const LoanRequestPage = lazy(() => import('./features/employee/portal-pages/LoanRequestPage'));
const AIAssistantPage = lazy(() => import('./features/employee/portal-pages/AIAssistantPage'));
const NotificationsPage = lazy(() => import('./features/employee/portal-pages/NotificationsPage'));
const ApprovalsPage = lazy(() => import('./features/employee/portal-pages/ApprovalsPage'));
const SettingsSecurityPage = lazy(() => import('./features/employee/portal-pages/SettingsSecurityPage'));
const InternDashboardPage = lazy(() => import('./features/intern/pages/InternDashboardPage').then(m => ({ default: m.InternDashboardPage })));
const ConsultantDashboardPage = lazy(() => import('./features/consultant/pages/ConsultantDashboardPage').then(m => ({ default: m.ConsultantDashboardPage })));

// ── Expense Management Module Pages ─────────────────────────────────────────
import { ExpenseDashboardPage } from './features/expenses/pages/ExpenseDashboardPage';
import { MyExpensesPage } from './features/expenses/pages/MyExpensesPage';
import { ExpenseApprovalsPage } from './features/expenses/pages/ExpenseApprovalsPage';
import { FinanceVerificationPage } from './features/expenses/pages/FinanceVerificationPage';
import { ReimbursementsPage } from './features/expenses/pages/ReimbursementsPage';
import { TravelRequestsPage } from './features/expenses/pages/TravelRequestsPage';
import { TravelAdvancesPage } from './features/expenses/pages/TravelAdvancesPage';
import { MileageClaimsPage } from './features/expenses/pages/MileageClaimsPage';
import { ExpenseCategoriesPage } from './features/expenses/pages/ExpenseCategoriesPage';
import { ExpensePoliciesPage } from './features/expenses/pages/ExpensePoliciesPage';
import { ExpenseReportsPage } from './features/expenses/pages/ExpenseReportsPage';
import { ExpenseSettingsPage } from './features/expenses/pages/ExpenseSettingsPage';
import { AdminPolicyDashboardPage } from './features/policies/pages/AdminPolicyDashboardPage';
import { CreatePolicyPage } from './features/policies/pages/CreatePolicyPage';
import { PolicyAcknowledgementReportPage } from './features/policies/pages/PolicyAcknowledgementReportPage';

// ── Page Loading Fallback Spinner ──────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-400">Loading module...</p>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  const authHydrated = useAuthHydrated();

  if (!authHydrated) {
    return <PageLoader />;
  }

  if (!isAuthenticated && !hasStoredAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <PageLoader />;
  }

  const roles = user?.roles || [];

  if (roles.includes('super_admin')) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }
  // CEO and HR (organization_admin, ceo, hr_manager, hr_admin, hr) — all go to Admin portal
  if (
    roles.includes('organization_admin') ||
    roles.includes('ceo') ||
    roles.includes('hr_manager') ||
    roles.includes('hr_admin') ||
    roles.includes('hr')
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  // Support persona — uses the dedicated /hr/* portal
  if (roles.includes('support')) {
    return <Navigate to="/hr/dashboard" replace />;
  }
  if (roles.includes('department_head') || roles.includes('manager')) {
    return <Navigate to="/manager/dashboard" replace />;
  }
  if (roles.includes('team_lead')) {
    return <Navigate to="/team-lead/dashboard" replace />;
  }
  if (roles.includes('intern')) {
    return <Navigate to="/intern/dashboard" replace />;
  }
  if (roles.includes('consultant')) {
    return <Navigate to="/consultant/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
}

const MANAGER_ALLOWED_ROLES: Role[] = [
  'department_head',
  'manager',
  'organization_admin',
  'ceo',
  'super_admin',
];

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/liberation/103/:requestId/aHc9PQ" element={<JobReferencePage />} />
        <Route path="/liberation/:portalId/:requestId/:token" element={<JobReferencePage />} />
        <Route path="/liberation/:portalId/:requestId" element={<JobReferencePage />} />
        <Route path="/liberation/:requestId" element={<JobReferencePage />} />
        <Route path="/public/job-reference/:requestId" element={<JobReferencePage />} />
        <Route path="/job-reference/:requestId" element={<JobReferencePage />} />
        <Route path="/public/offers/review/:uuid" element={<PublicOfferPage />} />
        <Route path="/public/assessments/take/:uuid" element={<TakeAssessmentPage />} />
        <Route path="/careers" element={<JobReferencePage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* ─────────────────────────────────────────────────
          HR MANAGER PORTAL  (/hr/*)
          Rose-accented sidebar — full HR tool access
      ───────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['hr_manager']}>
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
          <Route path="/hr/employee-lifecycle/*" element={<EmployeeLifecyclePage />} />
          <Route path="/hr/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/hr/employees/:id/edit" element={<EmployeeEditPage />} />
          <Route path="/hr/employees/onboarding" element={<EmployeeLifecyclePage />} />
          <Route path="/hr/org-structure" element={<OrgStructurePage />} />

          {/* Payroll */}
          <Route path="/hr/payroll" element={<PayrollDashboard />} />
          <Route path="/hr/payroll/settings" element={<PayrollSettingsPage />} />
          <Route path="/hr/payroll-settings" element={<PayrollSettingsPage />} />
          <Route path="/hr/payroll-processing" element={<PayrollProcessing />} />
          <Route path="/hr/payroll/processing" element={<PayrollProcessing />} />
          <Route path="/hr/expense-claims" element={<Navigate to="/expenses/approvals" replace />} />
          <Route path="/hr/travel-requests" element={<Navigate to="/expenses/travel-requests" replace />} />
          <Route path="/hr/loans" element={<LoanManagement />} />
          <Route path="/hr/loan-types" element={<LoanManagement />} />
          <Route path="/hr/payslips" element={<PayslipViewer />} />
          <Route path="/hr/payroll/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />
          <Route path="/hr/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />
          <Route path="/hr/salary-structure" element={<SalaryStructureManagement />} />
          <Route path="/hr/salary-structures" element={<SalaryStructureManagement />} />
          <Route path="/hr/salary-revision" element={<SalaryRevisionManagement />} />
          <Route path="/hr/salary-revisions" element={<SalaryRevisionManagement />} />
          <Route path="/hr/tax-declaration" element={<TaxDeclaration />} />
          <Route path="/hr/settlements" element={<FullFinalSettlement />} />
          <Route path="/hr/gratuity" element={<GratuityPolicyPage />} />
          <Route path="/hr/payroll/gratuity" element={<GratuityPolicyPage />} />

          <Route path="/policies/manage" element={<AdminPolicyDashboardPage />} />
          <Route path="/policies/create" element={<CreatePolicyPage />} />
          <Route path="/policies/edit/:id" element={<CreatePolicyPage />} />
          <Route path="/policies/reports" element={<PolicyAcknowledgementReportPage />} />

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
          <Route path="/hr/attendance-regularization" element={<ManagerHRRegularizationApprovals role="hr" />} />
          <Route path="/hr/regularization" element={<ManagerHRRegularizationApprovals role="hr" />} />
          <Route path="/hr/leaves/approvals" element={<ApprovalInboxPage />} />
          <Route path="/HR/leaves/approvals" element={<ApprovalInboxPage />} />
          <Route path="/hr/holidays" element={<HolidayCalendarsPage />} />

          {/* HR Operations & Requests (HR Panel view) */}
          <Route path="/hr/requests" element={<EmployeeRequestsPage />} />

        {/* Recruitment */}
        <Route path="/hr/recruitment" element={<Navigate to="/hr/recruitment/dashboard" replace />} />
        <Route path="/hr/recruitment/dashboard" element={<RecruitmentDashboard />} />
        <Route path="/hr/recruitment/mrf-request" element={<MrfRequestPage />} />
        <Route path="/hr/recruitment/jobs" element={<JobManagement />} />
        <Route path="/hr/recruitment/candidates" element={<CandidateManagement />} />
        <Route path="/hr/recruitment/candidate-report" element={<CandidateReportPage />} />
        <Route path="/hr/recruitment/resume-bank" element={<ResumeBankPage />} />
        <Route path="/hr/recruitment/applicant-tracker" element={<ApplicantTrackerPage />} />
        <Route path="/hr/recruitment/assessments" element={<AssessmentManagementPage />} />
        <Route path="/hr/recruitment/offers" element={<OfferManagementPage />} />
        <Route path="/hr/letters" element={<LetterManagementPage />} />
        <Route path="/hr/recruitment/interview-schedule" element={<InterviewCalendarPage />} />
        <Route path="/hr/recruitment/interviewer-rating" element={<InterviewerRatingPage />} />
        <Route path="/hr/recruitment/referrals" element={<ReferralManagementPage />} />
        <Route path="/hr/recruitment/career-customization" element={<CareerPortalCustomizationPage />} />

          {/* Performance */}
          <Route path="/hr/performance" element={<PerformanceDashboard />} />
          <Route path="/hr/performance/reviews" element={<ReviewCyclesPage />} />

          {/* Operations */}
          <Route path="/hr/masters/builder" element={<MasterBuilderPage />} />
          <Route path="/hr/masters/builder/:id" element={<MasterBuilderDetailPage />} />
          <Route path="/hr/masters" element={<MastersHubPage />} />
          <Route path="/hr/masters/*" element={<MastersHubPage />} />
          <Route path="/hr/workflow" element={<WorkflowListPage />} />
          <Route path="/hr/workflows" element={<WorkflowListPage />} />
          <Route path="/hr-operations/workflows" element={<WorkflowListPage />} />
          <Route path="/hr-operations/announcements" element={<AnnouncementsPage />} />
          <Route path="/hr-operations/holidays" element={<HolidayCalendarsPage />} />
          <Route path="/hr/workflow/builder" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflow/approvals" element={<ApprovalInboxPage />} />
          <Route path="/hr/workflows" element={<WorkflowSettingsPage />} />
          <Route path="/hr/workflows/list" element={<WorkflowListPage />} />
          <Route path="/hr/workflows/create" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflows/new" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflows/builder" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflows/:id" element={<WorkflowDetailPage />} />
          <Route path="/hr/workflows/:id/edit" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflows/:id/builder" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflow/create" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflow/new" element={<WorkflowBuilderPage />} />
          <Route path="/hr/workflow/:id/edit" element={<WorkflowBuilderPage />} />
          <Route path="/hr/settings/workflows" element={<WorkflowSettingsPage />} />
          <Route path="/hr/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="company-profile" replace />} />
            <Route path="company-profile" element={<CompanyProfilePage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="leave-policies" element={<LeavePoliciesPage />} />
            <Route path="org-leave-settings" element={<OrgLeaveSettings />} />
            <Route path="attendance-module" element={<AttendanceModulePage />} />
            <Route path="career-customization" element={<CareerPortalCustomizationPage />} />
            <Route path="workflows" element={<WorkflowSettingsPage />} />
            <Route path="modules" element={<ModuleManagementPage />} />
            <Route path="*" element={<Navigate to="company-profile" replace />} />
          </Route>
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
            <ProtectedRoute allowedRoles={MANAGER_ALLOWED_ROLES}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
          <Route path="/manager/team" element={<MyTeamPage />} />
          <Route path="/manager/attendance" element={<AttendanceDashboard />} />
          <Route path="/manager/attendance-regularization" element={<ManagerHRRegularizationApprovals role="manager" />} />
          <Route path="/manager/regularization" element={<ManagerHRRegularizationApprovals role="manager" />} />
          <Route path="/manager/face-attendance" element={<FaceAttendancePage />} />
          <Route path="/manager/leave-approvals" element={<ApprovalInboxPage />} />
          <Route path="/manager/leaves/approvals" element={<ApprovalInboxPage />} />
          <Route path="/manager/hiring" element={<DepartmentDashboard />} />
          <Route path="/manager/mrf-request" element={<MrfRequestPage />} />
          <Route path="/manager/interview-schedule" element={<InterviewCalendarPage />} />
          <Route path="/manager/interviewer-rating" element={<InterviewerRatingPage />} />
          <Route path="/manager/payroll" element={<EmployeePayrollPortal />} />
          <Route path="/manager/loans" element={<EmployeeLoanRequest />} />
          <Route path="/manager/expenses" element={<ExpenseApprovalsPage />} />
          <Route path="/manager/expenses/approvals" element={<ExpenseApprovalsPage />} />
          <Route path="/manager/expenses/my-expenses" element={<MyExpensesPage />} />
          <Route path="/manager/expenses/travel-requests" element={<TravelRequestsPage />} />
          <Route path="/manager/expenses/travel-advances" element={<TravelAdvancesPage />} />
          <Route path="/manager/expenses/mileage-claims" element={<MileageClaimsPage />} />
          <Route path="/manager/travel" element={<TravelRequestsPage />} />
          <Route path="/manager/payslips" element={<PayslipViewer />} />
          <Route path="/manager/salary-revisions" element={<Navigate to="/manager/payslips" replace />} />
          <Route path="/manager/salary-revision" element={<Navigate to="/manager/payslips" replace />} />
          <Route path="/manager/performance" element={<PerformanceDashboard />} />
          <Route path="/manager/performance/reviews" element={<ReviewCyclesPage />} />
          <Route path="/manager/performance/goals" element={<GoalManagementPage />} />
          <Route path="/manager/approvals" element={<ApprovalsPage />} />
          <Route path="/manager/profile" element={<EmployeeProfilePage />} />
          <Route path="/manager/leaves" element={<LeavePage />} />
          <Route path="/manager/leaves/approvals" element={<ApprovalInboxPage />} />
          <Route path="/manager/live-tracking" element={<LiveTrackingDashboardPage />} />
          <Route path="/manager/settlements" element={<TeamSettlementsPage />} />
          <Route path="/manager/policies" element={<PoliciesPage />} />
        </Route>

        {/* ─────────────────────────────────────────────────
          TEAM LEAD PORTAL  (/team-lead/*)
          Emerald-accented sidebar — team management
      ───────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['team_lead']}>
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
          <Route path="/team-lead/expenses" element={<ExpenseApprovalsPage />} />
          <Route path="/team-lead/expenses/approvals" element={<ExpenseApprovalsPage />} />
          <Route path="/team-lead/expenses/my-expenses" element={<MyExpensesPage />} />
          <Route path="/team-lead/expenses/travel-requests" element={<TravelRequestsPage />} />
          <Route path="/team-lead/expenses/travel-advances" element={<TravelAdvancesPage />} />
          <Route path="/team-lead/expenses/mileage-claims" element={<MileageClaimsPage />} />
          <Route path="/team-lead/travel" element={<TravelRequestsPage />} />
          <Route path="/team-lead/payslips" element={<PayslipViewer />} />
          <Route path="/team-lead/salary-revisions" element={<Navigate to="/team-lead/payslips" replace />} />
          <Route path="/team-lead/salary-revision" element={<Navigate to="/team-lead/payslips" replace />} />
          <Route path="/team-lead/profile" element={<TeamLeadProfilePage />} />
          <Route path="/team-lead/leaves" element={<LeavePage />} />
          <Route path="/team-lead/leaves/approvals" element={<ApprovalInboxPage />} />
          <Route path="/team-lead/interview-schedule" element={<InterviewCalendarPage />} />
          <Route path="/team-lead/interviewer-rating" element={<InterviewerRatingPage />} />
          <Route path="/team-lead/mrf-request" element={<MrfRequestPage />} />
          <Route path="/team-lead/mrf" element={<MrfRequestPage />} />
          <Route path="/team-lead/live-tracking" element={<LiveTrackingDashboardPage />} />
          <Route path="/team-lead/settlements" element={<TeamSettlementsPage />} />
        </Route>

        {/* ─────────────────────────────────────────────────
          ADMIN PANEL  (AppShellLayout)
          Used by: CEO (organization_admin) + HR (hr_admin/hr)
          Full admin access — both personas share this portal
      ───────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                'employee',
                'manager',
                'department_head',
                'team_lead',
                'hr',
                'hr_admin',
                'hr_manager',
                'organization_admin',
                'ceo',
                'super_admin',
                'support',
                'intern',
                'consultant'
              ]}
            >
              <AppShellLayout />
            </ProtectedRoute>
          }
        >
          {/* Approvals generic shortcut - Admin only */}
          <Route path="/approvals" element={<ApprovalInboxPage />} />
          <Route path="/approvals/dashboard" element={<ApprovalsDashboardPage />} />

          {/* Dashboard — ADMIN ONLY */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Employee Management — ADMIN ONLY */}
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
          <Route path="/employees/onboarding" element={<OnboardingDashboardPage />} />
          <Route path="/org-structure" element={<OrgStructurePage />} />

          {/* Attendance Admin — ADMIN ONLY */}
          <Route path="/attendance" element={<AttendanceDashboard />} />
          <Route path="/attendance/policies" element={<AttendancePoliciesPage />} />
          <Route path="/attendance/locations" element={<HRAttendanceLocationPage />} />
          <Route path="/attendance/employee-locations" element={<HRAttendanceLocationPage />} />
          <Route path="/attendance/location-mapping" element={<HRAttendanceLocationPage />} />
          <Route path="/attendance/shifts" element={<ShiftManagementPage pageType="general" />} />
          <Route path="/attendance/roster-shifts" element={<ShiftManagementPage pageType="roster" />} />
          <Route path="/attendance/reports" element={<BreakLogsPage />} />
          <Route path="/attendance/break-report" element={<BreakLogsPage />} />
          <Route path="/attendance/break-logs" element={<BreakLogsPage />} />
          <Route path="/attendance/regularization-logs" element={<AdminRegularizationLogsPage />} />
          <Route path="/admin/regularization-logs" element={<AdminRegularizationLogsPage />} />
          <Route path="/attendance/live-tracking" element={<LiveTrackingDashboardPage />} />
          <Route path="/live-tracking" element={<LiveTrackingDashboardPage />} />
          {/* CEO Face Punch Terminal */}
          <Route path="/attendance/face-punch" element={<CeoFacePunchPage />} />

          {/* Leaves Self-Service */}
          <Route path="/leaves" element={<MyLeavesPage />} />
          <Route path="/leaves/my-leaves" element={<MyLeavesPage />} />
          <Route path="/leaves/history" element={<MyLeavesPage />} />
          <Route path="/leaves/apply" element={<ApplyLeavePage />} />
          <Route path="/leaves/approvals" element={<ApprovalInboxPage />} />
          <Route path="/leaves/approval" element={<ApprovalInboxPage />} />
          <Route path="/leaves/balance" element={<LeaveBalancePage />} />
          <Route path="/leaves/balances" element={<LeaveBalancePage />} />
          <Route path="/leaves/encashment" element={<LeaveEncashmentPage />} />

          {/* Leave Admin Reports — ADMIN ONLY */}
          <Route path="/leaves/reports/builder" element={<CustomReportBuilder />} />
          <Route path="/leaves/reports/burnout-risk" element={<BurnoutRiskDashboard />} />
          <Route path="/holidays" element={<HolidayCalendarsPage />} />

          {/* Payroll Admin — ADMIN ONLY */}
          <Route path="/payroll" element={<PayrollDashboard />} />
          <Route path="/payroll/admin-dashboard" element={<PayrollDashboard />} />
          <Route path="/admin/payroll-policies" element={<AdminPayrollPortal />} />
          {/* Expense Management Module */}
          <Route path="/expenses" element={<Navigate to="/expenses/dashboard" replace />} />
          <Route path="/expenses/dashboard" element={<ExpenseDashboardPage />} />
          <Route path="/expenses/my-expenses" element={<MyExpensesPage />} />
          <Route path="/expenses/approvals" element={<ExpenseApprovalsPage />} />
          <Route path="/expenses/finance-verification" element={<FinanceVerificationPage />} />
          <Route path="/expenses/reimbursements" element={<ReimbursementsPage />} />
          <Route path="/expenses/travel-requests" element={<TravelRequestsPage />} />
          <Route path="/expenses/travel-advances" element={<TravelAdvancesPage />} />
          <Route path="/expenses/mileage-claims" element={<MileageClaimsPage />} />
          <Route path="/expenses/categories" element={<ExpenseCategoriesPage />} />
          <Route path="/expenses/policies" element={<ExpensePoliciesPage />} />
          <Route path="/expenses/reports" element={<ExpenseReportsPage />} />
          <Route path="/expenses/settings" element={<ExpenseSettingsPage />} />

          <Route path="/policies/manage" element={<AdminPolicyDashboardPage />} />
          <Route path="/policies/create" element={<CreatePolicyPage />} />
          <Route path="/policies/edit/:id" element={<CreatePolicyPage />} />
          <Route path="/policies/reports" element={<PolicyAcknowledgementReportPage />} />

          {/* Expense Aliases for HR & Employee Portals */}
          <Route path="/payroll/expense-claims" element={<ExpenseApprovalsPage />} />
          <Route path="/payroll/travel-requests" element={<TravelRequestsPage />} />
          <Route path="/payroll/reimbursements" element={<ReimbursementsPage />} />
          <Route path="/expense-claims" element={<ExpenseApprovalsPage />} />
          <Route path="/travel-requests" element={<TravelRequestsPage />} />
          <Route path="/reimbursements" element={<ReimbursementsPage />} />
          <Route path="/payroll/salary-structure" element={<SalaryStructureManagement />} />
          <Route path="/payroll/settings" element={<PayrollSettingsPage />} />
          <Route path="/payroll/master-settings" element={<PayrollSettingsPage />} />
          <Route path="/payroll/salary-revision" element={<SalaryRevisionManagement />} />
          <Route path="/payroll/salary-revisions" element={<SalaryRevisionManagement />} />
          <Route path="/payroll/processing" element={<PayrollProcessing />} />
          <Route path="/payroll-processing" element={<PayrollProcessing />} />
          <Route path="/payroll/reports" element={<PayrollReportsPage />} />
          <Route path="/payroll/loans" element={<LoanManagement />} />
          <Route path="/payroll/loan-types" element={<LoanManagement />} />
          <Route path="/payroll/tax-declaration" element={<TaxDeclaration />} />
          <Route path="/payroll/settlements" element={<FullFinalSettlement />} />
          <Route path="/payroll/settlement" element={<FullFinalSettlement />} />
          <Route path="/payroll/gratuity" element={<GratuityPolicyPage />} />
          <Route path="/gratuity" element={<GratuityPolicyPage />} />
          <Route path="/payroll/policies" element={<PayrollPoliciesPage />} />
          <Route path="/payroll/payslips" element={<PayslipViewer />} />
          <Route path="/payroll/payslip-requests" element={<PayslipViewer />} />
          <Route path="/payroll/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />
          <Route path="/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />

          {/* Recruitment Admin — ADMIN ONLY */}
          <Route path="/recruitment" element={<Navigate to="/recruitment/dashboard" replace />} />
          <Route path="/recruitment/dashboard" element={<RecruitmentDashboard />} />
          <Route path="/recruitment/mrf-request" element={<MrfRequestPage />} />
          <Route path="/recruitment/jobs" element={<JobManagement />} />
          <Route path="/recruitment/candidates" element={<CandidateManagement />} />
          <Route path="/recruitment/candidate-report" element={<CandidateReportPage />} />
          <Route path="/recruitment/resume-bank" element={<ResumeBankPage />} />
          <Route path="/recruitment/applicant-tracker" element={<ApplicantTrackerPage />} />
          <Route path="/recruitment/assessments" element={<AssessmentManagementPage />} />
          <Route path="/recruitment/offers" element={<OfferManagementPage />} />
          <Route path="/letters" element={<LetterManagementPage />} />
          <Route path="/employee-lifecycle/letters" element={<LetterManagementPage />} />
          <Route path="/recruitment/interview-schedule" element={<InterviewCalendarPage />} />
          <Route path="/recruitment/interviewer-rating" element={<InterviewerRatingPage />} />
          <Route path="/recruitment/referrals" element={<ReferralManagementPage />} />
          <Route path="/recruitment/career-customization" element={<CareerPortalCustomizationPage />} />

          {/* Asset Management Admin — ADMIN ONLY */}
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

          {/* Performance Admin — ADMIN ONLY */}
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

          {/* Workflow Admin — ADMIN ONLY */}
          <Route path="/workflow" element={<WorkflowSettingsPage />} />
          <Route path="/workflows" element={<WorkflowSettingsPage />} />
          <Route path="/workflows/list" element={<WorkflowListPage />} />
          <Route path="/workflows/create" element={<WorkflowBuilderPage />} />
          <Route path="/workflows/new" element={<WorkflowBuilderPage />} />
          <Route path="/workflows/builder" element={<WorkflowBuilderPage />} />
          <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
          <Route path="/workflows/:id/edit" element={<WorkflowBuilderPage />} />
          <Route path="/workflows/:id/builder" element={<WorkflowBuilderPage />} />
          <Route path="/workflow/create" element={<WorkflowBuilderPage />} />
          <Route path="/workflow/new" element={<WorkflowBuilderPage />} />
          <Route path="/workflow/builder" element={<WorkflowBuilderPage />} />
          <Route path="/workflow/approvals" element={<ApprovalInboxPage />} />

          {/* Notifications code*/}
          <Route path="/notifications" element={<NotificationCenterPage />} />
          <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />

          {/* HR Operations & Configuration — ADMIN ONLY */}
          <Route path="/hr-operations/requests" element={<EmployeeRequestsPage />} />
          <Route path="/requests" element={<EmployeeRequestsPage />} />
          <Route path="/configuration" element={<AdminConfigurationPage />} />
          <Route path="/hr-operations/configuration" element={<AdminConfigurationPage />} />
          <Route path="/settings/configuration" element={<AdminConfigurationPage />} />
          <Route path="/admin/configuration" element={<AdminConfigurationPage />} />

          {/* Reports & Analytics — ADMIN ONLY */}
          <Route path="/analytics" element={<Navigate to="/analytics/attendance" replace />} />
          <Route path="/analytics/attendance" element={<AttendanceReportsPage />} />
          <Route path="/analytics/timelog" element={<TimelogReportPage />} />
          <Route path="/analytics/ceo-attendance" element={<CeoAttendanceReportPage />} />
          <Route path="/analytics/report-engine" element={<ReportEnginePage />} />

          {/* Employee Lifecycle */}
          <Route path="/employee-lifecycle" element={<EmployeeLifecyclePage />} />
          <Route path="/employee-lifecycle/*" element={<EmployeeLifecyclePage />} />

          {/* Settings & Configuration — ADMIN ONLY */}
          <Route path="/profile" element={<CompanyProfilePage />} />
          <Route path="/settings" element={<GeneralSettingsPage />} />
          <Route path="/settings/general" element={<GeneralSettingsPage />} />
          <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
          <Route path="/settings/branches" element={<BranchesPage />} />
          <Route path="/settings/locations" element={<LocationsPage />} />
          <Route path="/settings/branding" element={<BrandingPage />} />
          <Route path="/settings/leave-policies" element={<LeavePoliciesPage />} />
          <Route path="/settings/org-leave-settings" element={<OrgLeaveSettings />} />
          <Route path="/settings/attendance-module" element={<AttendanceModulePage />} />
          <Route path="/settings/id-card-designer" element={<IdCardDesignerPage />} />
          <Route path="/settings/id-card-templates" element={<IdCardDesignerPage />} />
          <Route path="/settings/career-customization" element={<CareerPortalCustomizationPage />} />
          <Route path="/settings/workflows" element={<WorkflowSettingsPage />} />
          <Route path="/settings/modules" element={<ModuleManagementPage />} />
          <Route path="/settings/master-builder" element={<MasterBuilderPage />} />
          <Route path="/settings/master-builder/:id" element={<MasterBuilderDetailPage />} />
          <Route path="/masters/builder" element={<MasterBuilderPage />} />
          <Route path="/masters/builder/:id" element={<MasterBuilderDetailPage />} />
          <Route path="/masters" element={<MastersHubPage />} />
          <Route path="/masters/*" element={<MastersHubPage />} />
          <Route path="/modules" element={<ModuleManagementPage />} />
          <Route path="/settings-group" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/general" replace />} />
            <Route path="general" element={<GeneralSettingsPage />} />
            <Route path="company-profile" element={<CompanyProfilePage />} />
            
            <Route path="branches" element={<BranchesPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="leave-policies" element={<LeavePoliciesPage />} />
            <Route path="org-leave-settings" element={<OrgLeaveSettings />} />
            <Route path="attendance-module" element={<AttendanceModulePage />} />
            <Route path="workflows" element={<WorkflowSettingsPage />} />
            <Route path="id-card-designer" element={<IdCardDesignerPage />} />
            <Route path="modules" element={<ModuleManagementPage />} />
            <Route path="*" element={<Navigate to="company-profile" replace />} />
          </Route>
        </Route>

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
        <Route path="/attendance/locations" element={<HRAttendanceLocationPage />} />
        <Route path="/attendance/employee-locations" element={<HRAttendanceLocationPage />} />
        <Route path="/attendance/location-mapping" element={<HRAttendanceLocationPage />} />
        <Route path="/attendance/shifts" element={<ShiftManagementPage pageType="general" />} />
        <Route path="/attendance/roster-shifts" element={<ShiftManagementPage pageType="roster" />} />
        <Route path="/attendance/reports" element={<BreakLogsPage />} />
        <Route path="/attendance/break-report" element={<BreakLogsPage />} />
        <Route path="/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/attendance/regularization-logs" element={<AdminRegularizationLogsPage />} />
        <Route path="/admin/regularization-logs" element={<AdminRegularizationLogsPage />} />
        <Route path="/manager/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/team-lead/attendance/break-logs" element={<BreakLogsPage />} />
        <Route path="/attendance/live-tracking" element={<LiveTrackingDashboardPage />} />
        <Route path="/live-tracking" element={<LiveTrackingDashboardPage />} />
        {/* CEO Face Punch Terminal */}
        <Route path="/attendance/face-punch" element={<CeoFacePunchPage />} />

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

        <Route path="/leaves/reports/builder" element={<CustomReportBuilder />} />
        <Route path="/leaves/reports/burnout-risk" element={<BurnoutRiskDashboard />} />
        <Route path="/holidays" element={<HolidayCalendarsPage />} />

        {/* Payroll Admin */}
        <Route path="/payroll" element={<PayrollDashboard />} />
        <Route path="/payroll/admin-dashboard" element={<PayrollDashboard />} />
        <Route path="/admin/payroll-policies" element={<AdminPayrollPortal />} />
        <Route path="/payroll/expense-claims" element={<Navigate to="/expenses/approvals" replace />} />
        <Route path="/payroll/travel-requests" element={<Navigate to="/expenses/travel-requests" replace />} />
        <Route path="/payroll/reimbursements" element={<Navigate to="/expenses/reimbursements" replace />} />
        <Route path="/expense-claims" element={<Navigate to="/expenses/approvals" replace />} />
        <Route path="/travel-requests" element={<Navigate to="/expenses/travel-requests" replace />} />
        <Route path="/reimbursements" element={<Navigate to="/expenses/reimbursements" replace />} />
        <Route path="/payroll/salary-structure" element={<SalaryStructureManagement />} />
        <Route path="/payroll/settings" element={<PayrollSettingsPage />} />
        <Route path="/payroll/master-settings" element={<PayrollSettingsPage />} />
        <Route path="/payroll/salary-revision" element={<SalaryRevisionManagement />} />
        <Route path="/payroll/salary-revisions" element={<SalaryRevisionManagement />} />
        <Route path="/payroll/processing" element={<PayrollProcessing />} />
        <Route path="/payroll-processing" element={<PayrollProcessing />} />
        <Route path="/payroll/reports" element={<PayrollReportsPage />} />
        <Route path="/hr/payroll/reports" element={<PayrollReportsPage />} />
        <Route path="/payroll/loans" element={<LoanManagement />} />
        <Route path="/payroll/loan-types" element={<LoanManagement />} />
        <Route path="/payroll/tax-declaration" element={<TaxDeclaration />} />
        <Route path="/payroll/settlements" element={<FullFinalSettlement />} />
        <Route path="/payroll/settlement" element={<FullFinalSettlement />} />
        <Route path="/payroll/gratuity" element={<GratuityPolicyPage />} />
        <Route path="/gratuity" element={<GratuityPolicyPage />} />
        <Route path="/payroll/policies" element={<PayrollPoliciesPage />} />
        <Route path="/manager/settlements" element={<TeamSettlementsPage />} />
        <Route path="/team-lead/settlements" element={<TeamSettlementsPage />} />
        <Route path="/payroll/payslips" element={<PayslipViewer />} />
        <Route path="/payroll/payslip-requests" element={<PayslipViewer />} />
        <Route path="/payroll/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />
        <Route path="/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />

        {/* Recruitment */}
        <Route path="/recruitment" element={<Navigate to="/recruitment/dashboard" replace />} />
        <Route path="/recruitment/dashboard" element={<RecruitmentDashboard />} />
        <Route path="/recruitment/mrf-request" element={<MrfRequestPage />} />
        <Route path="/recruitment/jobs" element={<JobManagement />} />
        <Route path="/recruitment/candidates" element={<CandidateManagement />} />
        <Route path="/recruitment/candidate-report" element={<CandidateReportPage />} />
        <Route path="/recruitment/resume-bank" element={<ResumeBankPage />} />
        <Route path="/recruitment/applicant-tracker" element={<ApplicantTrackerPage />} />
        <Route path="/recruitment/assessments" element={<AssessmentManagementPage />} />
        <Route path="/recruitment/offers" element={<OfferManagementPage />} />
        <Route path="/recruitment/interview-schedule" element={<InterviewCalendarPage />} />
        <Route path="/recruitment/interviewer-rating" element={<InterviewerRatingPage />} />
        <Route path="/recruitment/referrals" element={<ReferralManagementPage />} />
        <Route path="/recruitment/career-customization" element={<CareerPortalCustomizationPage />} />

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
        <Route path="/workflow" element={<WorkflowSettingsPage />} />
        <Route path="/workflows" element={<WorkflowSettingsPage />} />
        <Route path="/workflows/list" element={<WorkflowListPage />} />
        <Route path="/workflows/create" element={<WorkflowBuilderPage />} />
        <Route path="/workflows/new" element={<WorkflowBuilderPage />} />
        <Route path="/workflows/builder" element={<WorkflowBuilderPage />} />
        <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
        <Route path="/workflows/:id/edit" element={<WorkflowBuilderPage />} />
        <Route path="/workflows/:id/builder" element={<WorkflowBuilderPage />} />
        <Route path="/workflow/create" element={<WorkflowBuilderPage />} />
        <Route path="/workflow/new" element={<WorkflowBuilderPage />} />
        <Route path="/workflow/builder" element={<WorkflowBuilderPage />} />
        <Route path="/workflow/approvals" element={<ApprovalInboxPage />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationCenterPage />} />
        <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />

        {/* HR Operations — Requests & Configuration (stays within CEO/HR admin shell) */}
        <Route path="/hr-operations/requests" element={<EmployeeRequestsPage />} />
        <Route path="/requests" element={<EmployeeRequestsPage />} />
        <Route path="/configuration" element={<AdminConfigurationPage />} />
        <Route path="/hr-operations/configuration" element={<AdminConfigurationPage />} />
        <Route path="/settings/configuration" element={<AdminConfigurationPage />} />
        <Route path="/admin/configuration" element={<AdminConfigurationPage />} />

        {/* Reports & Analytics */}
        <Route path="/analytics" element={<Navigate to="/analytics/attendance" replace />} />
        <Route path="/analytics/attendance" element={<AttendanceReportsPage />} />
        <Route path="/analytics/timelog" element={<TimelogReportPage />} />
        <Route path="/analytics/ceo-attendance" element={<CeoAttendanceReportPage />} />
        <Route path="/analytics/report-engine" element={<ReportEnginePage />} />

        {/* Employee Lifecycle */}
        <Route path="/employee-lifecycle" element={<EmployeeLifecyclePage />} />
        <Route path="/employee-lifecycle/*" element={<EmployeeLifecyclePage />} />

        {/* Settings & Profile */}
        <Route path="/profile" element={<CompanyProfilePage />} />
        <Route path="/settings" element={<GeneralSettingsPage />} />
        <Route path="/settings/general" element={<GeneralSettingsPage />} />
        <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
        <Route path="/settings/branches" element={<BranchesPage />} />
        <Route path="/settings/locations" element={<LocationsPage />} />
        <Route path="/settings/branding" element={<BrandingPage />} />
        <Route path="/settings/leave-policies" element={<LeavePoliciesPage />} />
        <Route path="/settings/org-leave-settings" element={<OrgLeaveSettings />} />
        <Route path="/settings/attendance-module" element={<AttendanceModulePage />} />
        <Route path="/settings/id-card-designer" element={<IdCardDesignerPage />} />
        <Route path="/settings/id-card-templates" element={<IdCardDesignerPage />} />
        <Route path="/settings/career-customization" element={<CareerPortalCustomizationPage />} />
        <Route path="/settings/workflows" element={<WorkflowSettingsPage />} />
        <Route path="/settings/modules" element={<ModuleManagementPage />} />
        <Route
          element={
            <ProtectedRoute allowedRoles={['organization_admin', 'hr_manager', 'super_admin', 'hr', 'hr_admin']}>
              <AppShellLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/masters" element={<MastersHubPage />} />
          <Route path="/masters/*" element={<MastersHubPage />} />
        </Route>
        <Route path="/modules" element={<ModuleManagementPage />} />
        <Route path="/settings-group" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/general" replace />} />
          <Route path="general" element={<GeneralSettingsPage />} />
          <Route path="company-profile" element={<CompanyProfilePage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="leave-policies" element={<LeavePoliciesPage />} />
          <Route path="org-leave-settings" element={<OrgLeaveSettings />} />
          <Route path="attendance-module" element={<AttendanceModulePage />} />
          <Route path="workflows" element={<WorkflowSettingsPage />} />
          <Route path="id-card-designer" element={<IdCardDesignerPage />} />
          <Route path="modules" element={<ModuleManagementPage />} />
          <Route path="*" element={<Navigate to="company-profile" replace />} />
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
          EMPLOYEE PORTAL ROUTES
          (EmployeeLayout — self-service for employees only)
          Excludes: organization_admin, ceo, hr_admin, hr, hr_manager
      ───────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['employee', 'intern', 'consultant']}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
          <Route path="/employee/profile" element={<ProfilePage />} />
          <Route path="/employee/lifecycle" element={<MyLifecyclePage />} />
          <Route path="/employee/lifecycle/*" element={<MyLifecyclePage />} />
          <Route path="/employee/attendance" element={<AttendancePage />} />
          <Route path="/employee/face-attendance" element={<FaceAttendancePage />} />
          <Route path="/employee/leaves" element={<LeavePage />} />
          <Route path="/employee/attendance-regularization" element={<RegularizationPage />} />
          <Route path="/employee/regularization" element={<RegularizationPage />} />
          <Route path="/employee/work-hour-request" element={<RegularizationPage />} />
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
          <Route path="/employee/expenses" element={<MyExpensesPage />} />
          <Route path="/employee/my-expenses" element={<MyExpensesPage />} />
          <Route path="/employee/travel-requests" element={<TravelRequestsPage />} />
          <Route path="/employee/travel-advances" element={<TravelAdvancesPage />} />
          <Route path="/employee/travel" element={<TravelRequestsPage />} />
          <Route path="/employee/mileage-claims" element={<MileageClaimsPage />} />
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
          <Route path="/employee/interview-schedule" element={<InterviewCalendarPage />} />
          <Route path="/employee/interviewer-rating" element={<InterviewerRatingPage />} />
          <Route path="/employee/health-wellness" element={<HealthWellnessPage />} />
          <Route path="/employee/loans" element={<LoanRequestPage />} />
          <Route path="/employee/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/employee/notifications" element={<NotificationCenterPage />} />
          <Route path="/employee/approvals" element={<ApprovalsPage />} />
          <Route path="/employee/settings" element={<SettingsSecurityPage />} />
        </Route>

        {/* ─────────────────────────────────────────────────
          INTERN PORTAL  (/intern/*)
          Amber-accented sidebar — internship self-service
      ───────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['intern']}>
              <InternLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/intern" element={<Navigate to="/intern/dashboard" replace />} />
          <Route path="/intern/dashboard" element={<InternDashboardPage />} />
          <Route path="/intern/profile" element={<ProfilePage />} />
          <Route path="/intern/attendance" element={<AttendancePage />} />
          <Route path="/intern/leaves" element={<LeavePage />} />
          <Route path="/intern/payslips" element={<PayslipViewer />} />
          <Route path="/intern/documents" element={<DocumentsPage />} />
          <Route path="/intern/holiday-calendar" element={<HolidayCalendarPage />} />
          <Route path="/intern/announcements" element={<AnnouncementsPage />} />
          <Route path="/intern/id-card" element={<IDCardPage />} />
          <Route path="/intern/org-chart" element={<OrgChartPage />} />
        </Route>

        {/* ─────────────────────────────────────────────────
          CONSULTANT PORTAL  (/consultant/*)
          Violet-accented sidebar — consultant self-service
      ───────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['consultant']}>
              <ConsultantLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/consultant" element={<Navigate to="/consultant/dashboard" replace />} />
          <Route path="/consultant/dashboard" element={<ConsultantDashboardPage />} />
          <Route path="/consultant/profile" element={<ProfilePage />} />
          <Route path="/consultant/attendance" element={<AttendancePage />} />
          <Route path="/consultant/leaves" element={<LeavePage />} />
          <Route path="/consultant/payslips" element={<PayslipViewer />} />
          <Route path="/consultant/expenses" element={<MyExpensesPage />} />
          <Route path="/consultant/travel" element={<TravelPage />} />
          <Route path="/consultant/documents" element={<DocumentsPage />} />
          <Route path="/consultant/holiday-calendar" element={<HolidayCalendarPage />} />
          <Route path="/consultant/announcements" element={<AnnouncementsPage />} />
          <Route path="/consultant/id-card" element={<IDCardPage />} />
          <Route path="/consultant/org-chart" element={<OrgChartPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
