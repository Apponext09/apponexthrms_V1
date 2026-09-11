import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppShellLayout } from '../layouts/AppShellLayout';
import { SettingsLayout } from '../features/settings/pages/SettingsLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ApprovalsDashboardPage = lazy(() => import('../features/leaves/pages/ApprovalsDashboardPage').then(m => ({ default: m.ApprovalsDashboardPage })));
const EmployeeListPage = lazy(() => import('../features/employee/pages/EmployeeListPage').then(m => ({ default: m.EmployeeListPage })));
const EmployeeProfilePage = lazy(() => import('../features/employee/pages/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const EmployeeEditPage = lazy(() => import('../features/employee/pages/EmployeeEditPage').then(m => ({ default: m.EmployeeEditPage })));
const OnboardingDashboardPage = lazy(() => import('../features/employee/pages/OnboardingDashboardPage').then(m => ({ default: m.OnboardingDashboardPage })));
const OrgStructurePage = lazy(() => import('../features/org-structure/pages/OrgStructurePage').then(m => ({ default: m.OrgStructurePage })));
const EmployeeLifecyclePage = lazy(() => import('../features/HR/EmployeeLifecycle/EmployeeLifecyclePage'));
const AttendanceDashboard = lazy(() => import('../features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const AttendancePoliciesPage = lazy(() => import('../features/attendance/pages/AttendancePoliciesPage').then(m => ({ default: m.AttendancePoliciesPage })));
const HRAttendanceLocationPage = lazy(() => import('../features/HR/Attendance').then(m => ({ default: m.HRAttendanceLocationPage })));
const ShiftManagementPage = lazy(() => import('../features/attendance/pages/ShiftManagementPage').then(m => ({ default: m.ShiftManagementPage })));
const BreakLogsPage = lazy(() => import('../features/attendance/pages/BreakLogsPage').then(m => ({ default: m.BreakLogsPage })));
const AdminRegularizationLogsPage = lazy(() => import('../features/attendance/pages/AdminRegularizationLogsPage'));
const CeoFacePunchPage = lazy(() => import('../features/attendance/pages/CeoFacePunchPage'));
const LiveTrackingDashboardPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.LiveTrackingDashboardPage })));
const TrackingHistoryPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.TrackingHistoryPage })));
const MyLeavesPage = lazy(() => import('../features/leaves/pages/MyLeavesPage').then(m => ({ default: m.MyLeavesPage })));
const ApplyLeavePage = lazy(() => import('../features/leaves/pages/ApplyLeavePage').then(m => ({ default: m.ApplyLeavePage })));
const LeaveBalancePage = lazy(() => import('../features/leaves/pages/LeaveBalancePage').then(m => ({ default: m.LeaveBalancePage })));
const LeaveEncashmentPage = lazy(() => import('../features/leaves/pages/LeaveEncashmentPage').then(m => ({ default: m.LeaveEncashmentPage })));
const ApprovalInboxPage = lazy(() => import('../features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const CustomReportBuilder = lazy(() => import('../features/leaves/pages/CustomReportBuilder').then(m => ({ default: m.CustomReportBuilder })));
const BurnoutRiskDashboard = lazy(() => import('../features/HR/pages/BurnoutRiskDashboard').then(m => ({ default: m.BurnoutRiskDashboard })));
const HolidayCalendarsPage = lazy(() => import('../features/settings/pages/HolidayCalendarsPage').then(m => ({ default: m.HolidayCalendarsPage })));
const PayrollDashboard = lazy(() => import('../features/payroll/pages/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const AdminPayrollPortal = lazy(() => import('../features/payroll/pages/AdminPayrollPortal').then(m => ({ default: m.AdminPayrollPortal })));
const ExpenseDashboardPage = lazy(() => import('../features/expenses/pages/ExpenseDashboardPage').then(m => ({ default: m.ExpenseDashboardPage })));
const MyExpensesPage = lazy(() => import('../features/expenses/pages/MyExpensesPage').then(m => ({ default: m.MyExpensesPage })));
const ExpenseApprovalsPage = lazy(() => import('../features/expenses/pages/ExpenseApprovalsPage').then(m => ({ default: m.ExpenseApprovalsPage })));
const FinanceVerificationPage = lazy(() => import('../features/expenses/pages/FinanceVerificationPage').then(m => ({ default: m.FinanceVerificationPage })));
const ReimbursementsPage = lazy(() => import('../features/expenses/pages/ReimbursementsPage').then(m => ({ default: m.ReimbursementsPage })));
const TravelRequestsPage = lazy(() => import('../features/expenses/pages/TravelRequestsPage').then(m => ({ default: m.TravelRequestsPage })));
const TravelAdvancesPage = lazy(() => import('../features/expenses/pages/TravelAdvancesPage').then(m => ({ default: m.TravelAdvancesPage })));
const MileageClaimsPage = lazy(() => import('../features/expenses/pages/MileageClaimsPage').then(m => ({ default: m.MileageClaimsPage })));
const ExpenseCategoriesPage = lazy(() => import('../features/expenses/pages/ExpenseCategoriesPage').then(m => ({ default: m.ExpenseCategoriesPage })));
const ExpensePoliciesPage = lazy(() => import('../features/expenses/pages/ExpensePoliciesPage').then(m => ({ default: m.ExpensePoliciesPage })));
const ExpenseReportsPage = lazy(() => import('../features/expenses/pages/ExpenseReportsPage').then(m => ({ default: m.ExpenseReportsPage })));
const ExpenseSettingsPage = lazy(() => import('../features/expenses/pages/ExpenseSettingsPage').then(m => ({ default: m.ExpenseSettingsPage })));
const AdminPolicyDashboardPage = lazy(() => import('../features/policies/pages/AdminPolicyDashboardPage').then(m => ({ default: m.AdminPolicyDashboardPage })));
const CreatePolicyPage = lazy(() => import('../features/policies/pages/CreatePolicyPage').then(m => ({ default: m.CreatePolicyPage })));
const PolicyAcknowledgementReportPage = lazy(() => import('../features/policies/pages/PolicyAcknowledgementReportPage').then(m => ({ default: m.PolicyAcknowledgementReportPage })));
const SalaryStructureManagement = lazy(() => import('../features/payroll/pages/SalaryStructureManagement').then(m => ({ default: m.SalaryStructureManagement })));
const PayrollSettingsPage = lazy(() => import('../features/payroll/pages/PayrollSettingsPage').then(m => ({ default: m.PayrollSettingsPage })));
const SalaryRevisionManagement = lazy(() => import('../features/payroll/pages/SalaryRevisionManagement').then(m => ({ default: m.SalaryRevisionManagement })));
const PayrollProcessing = lazy(() => import('../features/payroll/pages/PayrollProcessing').then(m => ({ default: m.PayrollProcessing })));
const PayrollReportsPage = lazy(() => import('../features/payroll/pages/PayrollReportsPage').then(m => ({ default: m.PayrollReportsPage })));
const LoanManagement = lazy(() => import('../features/payroll/pages/LoanManagement').then(m => ({ default: m.LoanManagement })));
const TaxDeclaration = lazy(() => import('../features/payroll/pages/TaxDeclaration').then(m => ({ default: m.TaxDeclaration })));
const FullFinalSettlement = lazy(() => import('../features/payroll/pages/FullFinalSettlement').then(m => ({ default: m.FullFinalSettlement })));
const GratuityPolicyPage = lazy(() => import('../features/payroll/pages/GratuityPolicyPage').then(m => ({ default: m.GratuityPolicyPage })));
const PayrollPoliciesPage = lazy(() => import('../features/payroll/pages/PayrollPoliciesPage').then(m => ({ default: m.PayrollPoliciesPage })));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const MassSalaryStructureUploadPage = lazy(() => import('../features/payroll/pages/MassSalaryStructureUploadPage').then(m => ({ default: m.MassSalaryStructureUploadPage })));
const RecruitmentDashboard = lazy(() => import('../features/recruitment/pages/RecruitmentDashboard').then(m => ({ default: m.RecruitmentDashboard })));
const MrfRequestPage = lazy(() => import('../features/recruitment/pages/MrfRequestPage').then(m => ({ default: m.MrfRequestPage })));
const JobManagement = lazy(() => import('../features/recruitment/pages/JobManagement').then(m => ({ default: m.JobManagement })));
const CandidateManagement = lazy(() => import('../features/recruitment/pages/CandidateManagement').then(m => ({ default: m.CandidateManagement })));
const CandidateReportPage = lazy(() => import('../features/recruitment/pages/CandidateReportPage').then(m => ({ default: m.CandidateReportPage })));
const ResumeBankPage = lazy(() => import('../features/recruitment/pages/ResumeBankPage').then(m => ({ default: m.ResumeBankPage })));
const ApplicantTrackerPage = lazy(() => import('../features/recruitment/pages/ApplicantTrackerPage').then(m => ({ default: m.ApplicantTrackerPage })));
const AssessmentManagementPage = lazy(() => import('../features/recruitment/pages/AssessmentManagementPage').then(m => ({ default: m.AssessmentManagementPage })));
const OfferManagementPage = lazy(() => import('../features/recruitment/pages/OfferManagementPage').then(m => ({ default: m.OfferManagementPage })));
const LetterManagementPage = lazy(() => import('../features/letters/pages/LetterManagementPage').then(m => ({ default: m.LetterManagementPage })));
const InterviewCalendarPage = lazy(() => import('../features/recruitment/pages/InterviewCalendarPage').then(m => ({ default: m.InterviewCalendarPage })));
const InterviewerRatingPage = lazy(() => import('../features/recruitment/pages/InterviewerRatingPage').then(m => ({ default: m.InterviewerRatingPage })));
const ReferralManagementPage = lazy(() => import('../features/recruitment/pages/ReferralManagementPage').then(m => ({ default: m.ReferralManagementPage })));
const CareerPortalCustomizationPage = lazy(() => import('../features/recruitment/pages/CareerPortalCustomizationPage').then(m => ({ default: m.CareerPortalCustomizationPage })));
const AssetDashboard = lazy(() => import('../features/asset/pages/AssetDashboard').then(m => ({ default: m.AssetDashboard })));
const AssetList = lazy(() => import('../features/asset/pages/AssetList').then(m => ({ default: m.AssetList })));
const AssetDetails = lazy(() => import('../features/asset/pages/AssetDetails').then(m => ({ default: m.AssetDetails })));
const AssignAsset = lazy(() => import('../features/asset/pages/AssignAsset').then(m => ({ default: m.AssignAsset })));
const TransferAsset = lazy(() => import('../features/asset/pages/TransferAsset').then(m => ({ default: m.TransferAsset })));
const ReturnAsset = lazy(() => import('../features/asset/pages/ReturnAsset').then(m => ({ default: m.ReturnAsset })));
const Maintenance = lazy(() => import('../features/asset/pages/Maintenance').then(m => ({ default: m.Maintenance })));
const Licenses = lazy(() => import('../features/asset/pages/Licenses').then(m => ({ default: m.Licenses })));
const Reports = lazy(() => import('../features/asset/pages/Reports').then(m => ({ default: m.Reports })));
const Analytics = lazy(() => import('../features/asset/pages/Analytics').then(m => ({ default: m.Analytics })));
const PerformanceDashboard = lazy(() => import('../features/performance/pages/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const GoalManagementPage = lazy(() => import('../features/performance/pages/GoalManagementPage').then(m => ({ default: m.GoalManagementPage })));
const OKRManagementPage = lazy(() => import('../features/performance/pages/OKRManagementPage').then(m => ({ default: m.OKRManagementPage })));
const ReviewCyclesPage = lazy(() => import('../features/performance/pages/ReviewCyclesPage').then(m => ({ default: m.ReviewCyclesPage })));
const PerformanceReviewPage = lazy(() => import('../features/performance/pages/PerformanceReviewPage').then(m => ({ default: m.PerformanceReviewPage })));
const CompetencyDashboardPage = lazy(() => import('../features/performance/pages/CompetencyDashboardPage').then(m => ({ default: m.CompetencyDashboardPage })));
const PIPDashboardPage = lazy(() => import('../features/performance/pages/PIPDashboardPage').then(m => ({ default: m.PIPDashboardPage })));
const SuccessionPlanningPage = lazy(() => import('../features/performance/pages/SuccessionPlanningPage').then(m => ({ default: m.SuccessionPlanningPage })));
const RecognitionDashboardPage = lazy(() => import('../features/performance/pages/RecognitionDashboardPage').then(m => ({ default: m.RecognitionDashboardPage })));
const PerformanceAnalyticsPage = lazy(() => import('../features/performance/pages/PerformanceAnalyticsPage').then(m => ({ default: m.PerformanceAnalyticsPage })));
const WorkflowListPage = lazy(() => import('../features/workflow/pages/WorkflowListPage').then(m => ({ default: m.WorkflowListPage })));
const WorkflowBuilderPage = lazy(() => import('../features/workflow/pages/WorkflowBuilderPage').then(m => ({ default: m.WorkflowBuilderPage })));
const WorkflowDetailPage = lazy(() => import('../features/workflow/pages/WorkflowDetailPage').then(m => ({ default: m.WorkflowDetailPage })));
const WorkflowSettingsPage = lazy(() => import('../features/workflow/pages/WorkflowSettingsPage').then(m => ({ default: m.WorkflowSettingsPage })));
const NotificationCenterPage = lazy(() => import('../features/notifications/pages/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })));
const NotificationPreferencesPage = lazy(() => import('../features/notifications/pages/NotificationPreferencesPage').then(m => ({ default: m.NotificationPreferencesPage })));
const EmployeeRequestsPage = lazy(() => import('../features/HR/requests/EmployeeRequestsPage').then(m => ({ default: m.EmployeeRequestsPage })));
const AdminConfigurationPage = lazy(() => import('../features/settings/pages/AdminConfigurationPage').then(m => ({ default: m.AdminConfigurationPage })));
const AttendanceReportsPage = lazy(() => import('../features/analytics/pages/AttendanceReportsPage').then(m => ({ default: m.AttendanceReportsPage })));
const TimelogReportPage = lazy(() => import('../features/analytics/pages/TimelogReportPage').then(m => ({ default: m.TimelogReportPage })));
const CeoAttendanceReportPage = lazy(() => import('../features/analytics/pages/CeoAttendanceReportPage').then(m => ({ default: m.CeoAttendanceReportPage })));
const ReportEnginePage = lazy(() => import('../features/analytics/pages/ReportEnginePage').then(m => ({ default: m.ReportEnginePage })));
const LmsDashboardPage = lazy(() => import('../features/lms/pages/LmsDashboardPage').then(m => ({ default: m.LmsDashboardPage })));
const CourseManagementPage = lazy(() => import('../features/lms/pages/CourseManagementPage').then(m => ({ default: m.CourseManagementPage })));
const CategoryManagerPage = lazy(() => import('../features/lms/pages/CategoryManagerPage').then(m => ({ default: m.CategoryManagerPage })));
const BatchManagementPage = lazy(() => import('../features/lms/pages/BatchManagementPage').then(m => ({ default: m.BatchManagementPage })));
const EnrollmentManagerPage = lazy(() => import('../features/lms/pages/EnrollmentManagerPage').then(m => ({ default: m.EnrollmentManagerPage })));
const ComplianceTrainingPage = lazy(() => import('../features/lms/pages/ComplianceTrainingPage').then(m => ({ default: m.ComplianceTrainingPage })));
const LmsReportsPage = lazy(() => import('../features/lms/pages/LmsReportsPage').then(m => ({ default: m.LmsReportsPage })));
const CourseCatalogPage = lazy(() => import('../features/lms/pages/CourseCatalogPage').then(m => ({ default: m.CourseCatalogPage })));
const CourseDetailPage = lazy(() => import('../features/lms/pages/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const MyEnrollmentsPage = lazy(() => import('../features/lms/pages/MyEnrollmentsPage').then(m => ({ default: m.MyEnrollmentsPage })));
const AssessmentPlayerPage = lazy(() => import('../features/lms/pages/AssessmentPlayerPage').then(m => ({ default: m.AssessmentPlayerPage })));
const MyCertificatesPage = lazy(() => import('../features/lms/pages/MyCertificatesPage').then(m => ({ default: m.MyCertificatesPage })));
const GeneralSettingsPage = lazy(() => import('../features/settings/pages/GeneralSettingsPage').then(m => ({ default: m.GeneralSettingsPage })));
const CompanyProfilePage = lazy(() => import('../features/settings/pages/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const BranchesPage = lazy(() => import('../features/settings/pages/BranchesPage').then(m => ({ default: m.BranchesPage })));
const DesignationsPage = lazy(() => import('../features/settings/pages/DesignationsPage').then(m => ({ default: m.DesignationsPage })));
const LocationsPage = lazy(() => import('../features/settings/pages/LocationsPage').then(m => ({ default: m.LocationsPage })));
const BrandingPage = lazy(() => import('../features/settings/pages/BrandingPage').then(m => ({ default: m.BrandingPage })));
const LeavePoliciesPage = lazy(() => import('../features/settings/pages/LeavePoliciesPage').then(m => ({ default: m.LeavePoliciesPage })));
const OrgLeaveSettings = lazy(() => import('../features/settings/pages/OrgLeaveSettings').then(m => ({ default: m.OrgLeaveSettings })));
const AttendanceModulePage = lazy(() => import('../features/settings/pages/AttendanceModulePage').then(m => ({ default: m.AttendanceModulePage })));
const MastersHubPage = lazy(() => import('../features/settings/pages/MastersHubPage').then(m => ({ default: m.MastersHubPage })));
const OperationalMastersHubPage = lazy(() => import('../features/settings/pages/OperationalMastersHubPage').then(m => ({ default: m.OperationalMastersHubPage })));
const MasterBuilderPage = lazy(() => import('../features/master-builder/pages/MasterBuilderPage').then(m => ({ default: m.MasterBuilderPage })));
const MasterBuilderDetailPage = lazy(() => import('../features/master-builder/pages/MasterBuilderDetailPage').then(m => ({ default: m.MasterBuilderDetailPage })));
const IdCardDesignerPage = lazy(() => import('../features/settings/pages/IdCardDesignerPage').then(m => ({ default: m.IdCardDesignerPage })));
const ModuleManagementPage = lazy(() => import('../features/modules/modules').then(m => ({ default: m.ModuleManagementPage })));
const TeamSettlementsPage = lazy(() => import('../features/payroll/pages/TeamSettlementsPage').then(m => ({ default: m.TeamSettlementsPage })));
const AppraisalDashboardPage = lazy(() => import('../features/performance/pages/AppraisalDashboardPage').then(m => ({ default: m.AppraisalDashboardPage })));
const MyAssetsPage = lazy(() => import('../features/asset/pages/MyAssetsPage').then(m => ({ default: m.MyAssetsPage })));
const AnnouncementManagementPage = lazy(() => import('../features/notifications/pages/AnnouncementManagementPage').then(m => ({ default: m.AnnouncementManagementPage })));
const AnnouncementFeedPage = lazy(() => import('../features/notifications/pages/AnnouncementFeedPage').then(m => ({ default: m.AnnouncementFeedPage })));

// ── Admin / CEO / HR Shell Routes (/dashboard, /payroll, /recruitment …) ─────
// Used by: organization_admin, ceo, hr, and shared roles
export const adminRoutes = (
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
          'intern',
          'consultant',
        ]}
      >
        <AppShellLayout />
      </ProtectedRoute>
    }
  >
    {/* Approvals */}
    <Route path="/approvals" element={<ApprovalInboxPage />} />
    <Route path="/approvals/dashboard" element={<ApprovalsDashboardPage />} />

    {/* Dashboard */}
    <Route path="/dashboard" element={<DashboardPage />} />

    {/* Employee Management */}
    <Route path="/employees" element={<EmployeeListPage />} />
    <Route path="/employees/:id" element={<EmployeeProfilePage />} />
    <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
    <Route path="/employees/onboarding" element={<OnboardingDashboardPage />} />
    <Route path="/org-structure" element={<OrgStructurePage />} />

    {/* Attendance Admin */}
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
    <Route path="/live-tracking/history" element={<TrackingHistoryPage />} />
    <Route path="/admin/live-tracking/history" element={<TrackingHistoryPage />} />
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
    <Route path="/payroll/admin-portal" element={<AdminPayrollPortal />} />
    <Route path="/admin/payroll-policies" element={<AdminPayrollPortal />} />
    <Route path="/admin/payroll-portal" element={<AdminPayrollPortal />} />

    {/* Expense Management */}
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

    {/* Expense Aliases */}
    <Route path="/payroll/expense-claims" element={<ExpenseApprovalsPage />} />
    <Route path="/payroll/travel-requests" element={<TravelRequestsPage />} />
    <Route path="/payroll/reimbursements" element={<ReimbursementsPage />} />
    <Route path="/expense-claims" element={<ExpenseApprovalsPage />} />
    <Route path="/travel-requests" element={<TravelRequestsPage />} />
    <Route path="/reimbursements" element={<ReimbursementsPage />} />

    {/* Policies */}
    <Route path="/policies/manage" element={<AdminPolicyDashboardPage />} />
    <Route path="/policies/create" element={<CreatePolicyPage />} />
    <Route path="/policies/edit/:id" element={<CreatePolicyPage />} />
    <Route path="/policies/reports" element={<PolicyAcknowledgementReportPage />} />

    {/* Payroll Details */}
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
    <Route path="/manager/settlements" element={<TeamSettlementsPage />} />
    <Route path="/team-lead/settlements" element={<TeamSettlementsPage />} />

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
    <Route path="/letters" element={<LetterManagementPage />} />
    <Route path="/employee-lifecycle/letters" element={<LetterManagementPage />} />
    <Route path="/recruitment/interview-schedule" element={<InterviewCalendarPage />} />
    <Route path="/recruitment/interviewer-rating" element={<InterviewerRatingPage />} />
    <Route path="/recruitment/referrals" element={<ReferralManagementPage />} />
    <Route path="/recruitment/career-customization" element={<CareerPortalCustomizationPage />} />

    {/* Asset Management */}
    <Route path="/assets" element={<AssetDashboard />} />
    <Route path="/assets/my-assets" element={<MyAssetsPage />} />
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
    <Route path="/performance/reviews" element={<ReviewCyclesPage />} />
    <Route path="/performance/okrs" element={<OKRManagementPage />} />
    <Route path="/performance/review-form" element={<PerformanceReviewPage />} />
    <Route path="/performance/appraisals" element={<AppraisalDashboardPage />} />
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
    <Route path="/announcements" element={<AnnouncementFeedPage />} />
    <Route path="/announcements/manage" element={<AnnouncementManagementPage />} />
    <Route path="/announcements/feed" element={<AnnouncementFeedPage />} />

    {/* HR Operations & Configuration */}
    <Route path="/hr-operations/requests" element={<EmployeeRequestsPage />} />
    <Route path="/requests" element={<EmployeeRequestsPage />} />
    <Route path="/configuration" element={<AdminConfigurationPage />} />
    <Route path="/hr-operations/configuration" element={<AdminConfigurationPage />} />
    <Route path="/hr-operations/announcements" element={<AnnouncementManagementPage />} />
    <Route path="/settings/configuration" element={<AdminConfigurationPage />} />
    <Route path="/admin/configuration" element={<AdminConfigurationPage />} />

    {/* Analytics & Reports */}
    <Route path="/analytics" element={<Navigate to="/analytics/attendance" replace />} />
    <Route path="/analytics/attendance" element={<AttendanceReportsPage />} />
    <Route path="/analytics/timelog" element={<TimelogReportPage />} />
    <Route path="/analytics/ceo-attendance" element={<CeoAttendanceReportPage />} />
    <Route path="/analytics/report-engine" element={<ReportEnginePage />} />

    {/* LMS (Learning Management System) */}
    <Route path="/lms" element={<Navigate to="/lms/dashboard" replace />} />
    <Route path="/lms/dashboard" element={<LmsDashboardPage />} />
    <Route path="/lms/courses" element={<CourseManagementPage />} />
    <Route path="/lms/categories" element={<CategoryManagerPage />} />
    <Route path="/lms/batches" element={<BatchManagementPage />} />
    <Route path="/lms/enrollments" element={<EnrollmentManagerPage />} />
    <Route path="/lms/compliance" element={<ComplianceTrainingPage />} />
    <Route path="/lms/reports" element={<LmsReportsPage />} />
    <Route path="/lms/catalog" element={<CourseCatalogPage />} />
    <Route path="/lms/catalog/:id" element={<CourseDetailPage />} />
    <Route path="/lms/courses/:id" element={<CourseDetailPage />} />
    <Route path="/lms/course/:id" element={<CourseDetailPage />} />
    <Route path="/lms/my-learning" element={<MyEnrollmentsPage />} />
    <Route path="/lms/my-courses" element={<MyEnrollmentsPage />} />
    <Route path="/lms/assessment/:id" element={<AssessmentPlayerPage />} />
    <Route path="/lms/certificates" element={<MyCertificatesPage />} />

    {/* Employee Lifecycle */}
    <Route path="/employee-lifecycle" element={<EmployeeLifecyclePage />} />
    <Route path="/employee-lifecycle/*" element={<EmployeeLifecyclePage />} />

    {/* Settings */}
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
    <Route path="/operational-masters" element={<OperationalMastersHubPage />} />
    <Route path="/operational-masters/*" element={<OperationalMastersHubPage />} />
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
);
