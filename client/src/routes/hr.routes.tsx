import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { HRLayout } from '../layouts/HRLayout';
import { SettingsLayout } from '../features/settings/pages/SettingsLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const EmployeeListPage = lazy(() => import('../features/employee/pages/EmployeeListPage').then(m => ({ default: m.EmployeeListPage })));
const EmployeeProfilePage = lazy(() => import('../features/employee/pages/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const EmployeeEditPage = lazy(() => import('../features/employee/pages/EmployeeEditPage').then(m => ({ default: m.EmployeeEditPage })));
const EmployeeLifecyclePage = lazy(() => import('../features/HR/EmployeeLifecycle/EmployeeLifecyclePage'));
const MyLifecyclePage = lazy(() => import('../features/employee/pages/MyLifecyclePage').then(m => ({ default: m.MyLifecyclePage })));
const OrgStructurePage = lazy(() => import('../features/org-structure/pages/OrgStructurePage').then(m => ({ default: m.OrgStructurePage })));
const PayrollDashboard = lazy(() => import('../features/payroll/pages/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const PayrollSettingsPage = lazy(() => import('../features/payroll/pages/PayrollSettingsPage').then(m => ({ default: m.PayrollSettingsPage })));
const PayrollProcessing = lazy(() => import('../features/payroll/pages/PayrollProcessing').then(m => ({ default: m.PayrollProcessing })));
const LoanManagement = lazy(() => import('../features/payroll/pages/LoanManagement').then(m => ({ default: m.LoanManagement })));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const MassSalaryStructureUploadPage = lazy(() => import('../features/payroll/pages/MassSalaryStructureUploadPage').then(m => ({ default: m.MassSalaryStructureUploadPage })));
const SalaryStructureManagement = lazy(() => import('../features/payroll/pages/SalaryStructureManagement').then(m => ({ default: m.SalaryStructureManagement })));
const SalaryRevisionManagement = lazy(() => import('../features/payroll/pages/SalaryRevisionManagement').then(m => ({ default: m.SalaryRevisionManagement })));
const TaxDeclaration = lazy(() => import('../features/payroll/pages/TaxDeclaration').then(m => ({ default: m.TaxDeclaration })));
const FullFinalSettlement = lazy(() => import('../features/payroll/pages/FullFinalSettlement').then(m => ({ default: m.FullFinalSettlement })));
const AdminPayrollPortal = lazy(() => import('../features/payroll/pages/AdminPayrollPortal').then(m => ({ default: m.AdminPayrollPortal })));
const HRPayrollPortal = lazy(() => import('../features/payroll/pages/HRPayrollPortal').then(m => ({ default: m.HRPayrollPortal })));
const PayrollReportsPage = lazy(() => import('../features/payroll/pages/PayrollReportsPage').then(m => ({ default: m.PayrollReportsPage })));
const PayrollPoliciesPage = lazy(() => import('../features/payroll/pages/PayrollPoliciesPage').then(m => ({ default: m.PayrollPoliciesPage })));
const GratuityPolicyPage = lazy(() => import('../features/payroll/pages/GratuityPolicyPage').then(m => ({ default: m.GratuityPolicyPage })));
const TeamSettlementsPage = lazy(() => import('../features/payroll/pages/TeamSettlementsPage').then(m => ({ default: m.TeamSettlementsPage })));
const AttendanceDashboard = lazy(() => import('../features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const AttendancePoliciesPage = lazy(() => import('../features/attendance/pages/AttendancePoliciesPage').then(m => ({ default: m.AttendancePoliciesPage })));
const HRAttendanceLocationPage = lazy(() => import('../features/HR/Attendance').then(m => ({ default: m.HRAttendanceLocationPage })));
const ShiftManagementPage = lazy(() => import('../features/attendance/pages/ShiftManagementPage').then(m => ({ default: m.ShiftManagementPage })));
const BreakLogsPage = lazy(() => import('../features/attendance/pages/BreakLogsPage').then(m => ({ default: m.BreakLogsPage })));
const ManagerHRRegularizationApprovals = lazy(() => import('../features/attendance/components/ManagerHRRegularizationApprovals').then(m => ({ default: m.ManagerHRRegularizationApprovals })));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const LeaveBalancePage = lazy(() => import('../features/leaves/pages/LeaveBalancePage').then(m => ({ default: m.LeaveBalancePage })));
const LeaveEncashmentPage = lazy(() => import('../features/leaves/pages/LeaveEncashmentPage').then(m => ({ default: m.LeaveEncashmentPage })));
const ApprovalInboxPage = lazy(() => import('../features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const ApprovalsDashboardPage = lazy(() => import('../features/leaves/pages/ApprovalsDashboardPage').then(m => ({ default: m.ApprovalsDashboardPage })));
const HolidayCalendarsPage = lazy(() => import('../features/settings/pages/HolidayCalendarsPage').then(m => ({ default: m.HolidayCalendarsPage })));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
const MyAttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const MyAttendanceCorrectionPage = lazy(() => import('../features/employee/portal-pages/RegularizationPage'));
const MyShiftRosterPage = lazy(() => import('../features/employee/portal-pages/ShiftRosterPage'));
const LiveTrackingDashboardPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.LiveTrackingDashboardPage })));
const TrackingHistoryPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.TrackingHistoryPage })));
const EmployeeRequestsPage = lazy(() => import('../features/HR/requests/EmployeeRequestsPage').then(m => ({ default: m.EmployeeRequestsPage })));
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

// Assets
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

// Performance
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

// Analytics & Reports
const AttendanceReportsPage = lazy(() => import('../features/analytics/pages/AttendanceReportsPage').then(m => ({ default: m.AttendanceReportsPage })));
const TimelogReportPage = lazy(() => import('../features/analytics/pages/TimelogReportPage').then(m => ({ default: m.TimelogReportPage })));

const ReportEnginePage = lazy(() => import('../features/analytics/pages/ReportEnginePage').then(m => ({ default: m.ReportEnginePage })));
const BurnoutRiskDashboard = lazy(() => import('../features/HR/pages/BurnoutRiskDashboard').then(m => ({ default: m.BurnoutRiskDashboard })));
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
const LmsIntegrationSettingsPage = lazy(() => import('../features/lms/pages/LmsIntegrationSettingsPage').then(m => ({ default: m.LmsIntegrationSettingsPage })));

// Settings & Masters
const GeneralSettingsPage = lazy(() => import('../features/settings/pages/GeneralSettingsPage').then(m => ({ default: m.GeneralSettingsPage })));
const HRConfigurationPage = lazy(() => import('../features/settings/pages/HRConfigurationPage').then(m => ({ default: m.HRConfigurationPage })));
const AdminConfigurationPage = lazy(() => import('../features/settings/pages/AdminConfigurationPage').then(m => ({ default: m.AdminConfigurationPage })));
const IdCardDesignerPage = lazy(() => import('../features/settings/pages/IdCardDesignerPage').then(m => ({ default: m.IdCardDesignerPage })));
const MasterBuilderPage = lazy(() => import('../features/master-builder/pages/MasterBuilderPage').then(m => ({ default: m.MasterBuilderPage })));
const MasterBuilderDetailPage = lazy(() => import('../features/master-builder/pages/MasterBuilderDetailPage').then(m => ({ default: m.MasterBuilderDetailPage })));
const MastersHubPage = lazy(() => import('../features/settings/pages/MastersHubPage').then(m => ({ default: m.MastersHubPage })));
const OperationalMastersHubPage = lazy(() => import('../features/settings/pages/OperationalMastersHubPage').then(m => ({ default: m.OperationalMastersHubPage })));
const WorkflowListPage = lazy(() => import('../features/workflow/pages/WorkflowListPage').then(m => ({ default: m.WorkflowListPage })));
const WorkflowBuilderPage = lazy(() => import('../features/workflow/pages/WorkflowBuilderPage').then(m => ({ default: m.WorkflowBuilderPage })));
const WorkflowDetailPage = lazy(() => import('../features/workflow/pages/WorkflowDetailPage').then(m => ({ default: m.WorkflowDetailPage })));
const WorkflowSettingsPage = lazy(() => import('../features/workflow/pages/WorkflowSettingsPage').then(m => ({ default: m.WorkflowSettingsPage })));
const WorkHourWorkflowPage = lazy(() => import('../features/attendance/pages/WorkHourWorkflowPage'));
const AnnouncementsPage = lazy(() => import('../features/employee/portal-pages/AnnouncementsPage'));
const CompanyProfilePage = lazy(() => import('../features/settings/pages/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const BranchesPage = lazy(() => import('../features/settings/pages/BranchesPage').then(m => ({ default: m.BranchesPage })));
const LocationsPage = lazy(() => import('../features/settings/pages/LocationsPage').then(m => ({ default: m.LocationsPage })));
const BrandingPage = lazy(() => import('../features/settings/pages/BrandingPage').then(m => ({ default: m.BrandingPage })));
const LeavePoliciesPage = lazy(() => import('../features/settings/pages/LeavePoliciesPage').then(m => ({ default: m.LeavePoliciesPage })));
const OrgLeaveSettings = lazy(() => import('../features/settings/pages/OrgLeaveSettings').then(m => ({ default: m.OrgLeaveSettings })));
const AttendanceModulePage = lazy(() => import('../features/settings/pages/AttendanceModulePage').then(m => ({ default: m.AttendanceModulePage })));
const ModuleManagementPage = lazy(() => import('../features/modules/modules').then(m => ({ default: m.ModuleManagementPage })));
const AdminPolicyDashboardPage = lazy(() => import('../features/policies/pages/AdminPolicyDashboardPage').then(m => ({ default: m.AdminPolicyDashboardPage })));
const CreatePolicyPage = lazy(() => import('../features/policies/pages/CreatePolicyPage').then(m => ({ default: m.CreatePolicyPage })));
const PolicyAcknowledgementReportPage = lazy(() => import('../features/policies/pages/PolicyAcknowledgementReportPage').then(m => ({ default: m.PolicyAcknowledgementReportPage })));

// Expense Management
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

// ── HR Manager Portal Routes (/hr/*) ─────────────────────────────────────────
export const hrRoutes = (
  <Route
    element={
      <ProtectedRoute allowedRoles={['hr', 'hr_admin', 'hr_manager']}>
        <HRLayout />
      </ProtectedRoute>
    }
  >
    <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
    {/* HR and Admin share one dashboard. Keep this legacy HR URL as an alias
        so existing bookmarks land on the same admin experience. */}
    <Route path="/hr/dashboard" element={<Navigate to="/dashboard" replace />} />
    <Route path="/hr/profile" element={<EmployeeProfilePage />} />
    <Route path="/hr/my-profile" element={<EmployeeProfilePage />} />
    <Route path="/hr/lifecycle" element={<MyLifecyclePage />} />
    <Route path="/hr/lifecycle/*" element={<MyLifecyclePage />} />

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
    <Route path="/hr/payroll/dashboard" element={<PayrollDashboard />} />
    <Route path="/hr/payroll/admin-dashboard" element={<PayrollDashboard />} />
    <Route path="/hr/payroll/admin-portal" element={<AdminPayrollPortal />} />
    <Route path="/hr/payroll/hr-portal" element={<HRPayrollPortal />} />
    <Route path="/hr/payroll/settings" element={<PayrollSettingsPage />} />
    <Route path="/hr/payroll/master-settings" element={<PayrollSettingsPage />} />
    <Route path="/hr/payroll-settings" element={<PayrollSettingsPage />} />
    <Route path="/hr/payroll/policies" element={<PayrollPoliciesPage />} />
    <Route path="/hr/payroll/salary-structure" element={<SalaryStructureManagement />} />
    <Route path="/hr/payroll/salary-structures" element={<SalaryStructureManagement />} />
    <Route path="/hr/salary-structure" element={<SalaryStructureManagement />} />
    <Route path="/hr/salary-structures" element={<SalaryStructureManagement />} />
    <Route path="/hr/payroll/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />
    <Route path="/hr/mass-salary-upload" element={<MassSalaryStructureUploadPage />} />
    <Route path="/hr/payroll/salary-revision" element={<SalaryRevisionManagement />} />
    <Route path="/hr/payroll/salary-revisions" element={<SalaryRevisionManagement />} />
    <Route path="/hr/salary-revision" element={<SalaryRevisionManagement />} />
    <Route path="/hr/salary-revisions" element={<SalaryRevisionManagement />} />
    <Route path="/hr/payroll/processing" element={<PayrollProcessing />} />
    <Route path="/hr/payroll-processing" element={<PayrollProcessing />} />
    <Route path="/hr/payroll/payslips" element={<PayslipViewer />} />
    <Route path="/hr/payroll/payslip-requests" element={<PayslipViewer />} />
    <Route path="/hr/payslips" element={<PayslipViewer />} />
    <Route path="/hr/payroll/tax-declaration" element={<TaxDeclaration />} />
    <Route path="/hr/tax-declaration" element={<TaxDeclaration />} />
    <Route path="/hr/payroll/reports" element={<PayrollReportsPage />} />
    <Route path="/hr/payroll/loans" element={<LoanManagement />} />
    <Route path="/hr/payroll/loan-types" element={<LoanManagement />} />
    <Route path="/hr/loans" element={<LoanManagement />} />
    <Route path="/hr/loan-types" element={<LoanManagement />} />
    <Route path="/hr/payroll/settlements" element={<FullFinalSettlement />} />
    <Route path="/hr/payroll/settlement" element={<FullFinalSettlement />} />
    <Route path="/hr/settlements" element={<FullFinalSettlement />} />
    <Route path="/hr/payroll/gratuity" element={<GratuityPolicyPage />} />
    <Route path="/hr/gratuity" element={<GratuityPolicyPage />} />
    <Route path="/hr/payroll/team-settlements" element={<TeamSettlementsPage />} />

    {/* Expense Management */}
    <Route path="/hr/expenses/dashboard" element={<ExpenseDashboardPage />} />
    <Route path="/hr/expenses/my-expenses" element={<MyExpensesPage />} />
    <Route
      path="/hr/expenses/approvals"
      element={
        <ExpenseApprovalsPage
          defaultStatusFilter="pending_level_3"
          allowedStatuses={['pending_level_3', 'pending_finance', 'pending_approvals', 'returned', 'rejected']}
          portalLabel="Approve expense claims — Level 3 (HR Admin) queue"
        />
      }
    />
    <Route path="/hr/expenses/finance-verification" element={<FinanceVerificationPage />} />
    <Route path="/hr/expenses/reimbursements" element={<ReimbursementsPage />} />
    <Route path="/hr/expenses/travel-requests" element={<TravelRequestsPage />} />
    <Route path="/hr/expenses/travel-advances" element={<TravelAdvancesPage />} />
    <Route path="/hr/expenses/mileage-claims" element={<MileageClaimsPage />} />
    <Route path="/hr/expenses/categories" element={<ExpenseCategoriesPage />} />
    <Route path="/hr/expenses/policies" element={<ExpensePoliciesPage />} />
    <Route path="/hr/expenses/reports" element={<ExpenseReportsPage />} />
    <Route path="/hr/expenses/settings" element={<ExpenseSettingsPage />} />

    {/* Policies */}
    <Route path="/hr/policies/manage" element={<AdminPolicyDashboardPage />} />
    <Route path="/hr/policies/create" element={<CreatePolicyPage />} />
    <Route path="/hr/policies/edit/:id" element={<CreatePolicyPage />} />
    <Route path="/hr/policies/reports" element={<PolicyAcknowledgementReportPage />} />

    {/* Leave & Time & Shifts */}
    <Route path="/hr/attendance" element={<AttendanceDashboard />} />
    <Route path="/HR/attendance" element={<AttendanceDashboard />} />
    <Route path="/hr/attendance/shifts" element={<ShiftManagementPage pageType="general" />} />
    <Route path="/hr/attendance/roster-shifts" element={<ShiftManagementPage pageType="roster" />} />
    <Route path="/hr/attendance-policies" element={<AttendancePoliciesPage />} />
    <Route path="/hr/attendance/policies" element={<AttendancePoliciesPage />} />
    <Route path="/hr/attendance/workflow-settings" element={<WorkHourWorkflowPage />} />
    <Route path="/hr/face-attendance" element={<FaceAttendancePage />} />
    <Route path="/HR/face-attendance" element={<FaceAttendancePage />} />
    {/* HR remains an employee for self-service attendance. */}
    <Route path="/hr/my-attendance" element={<MyAttendancePage />} />
    <Route path="/hr/my-attendance-correction" element={<MyAttendanceCorrectionPage />} />
    <Route path="/hr/my-shifts" element={<MyShiftRosterPage />} />
    <Route path="/hr/attendance/locations" element={<HRAttendanceLocationPage />} />
    <Route path="/HR/attendance/locations" element={<HRAttendanceLocationPage />} />
    <Route path="/hr/attendance-locations" element={<HRAttendanceLocationPage />} />
    <Route path="/HR/attendance-locations" element={<HRAttendanceLocationPage />} />
    <Route path="/hr/attendance/break-logs" element={<BreakLogsPage />} />
    <Route path="/hr/attendance-regularization" element={<ManagerHRRegularizationApprovals role="hr" />} />
    <Route path="/hr/regularization" element={<ManagerHRRegularizationApprovals role="hr" />} />
    <Route path="/hr/leaves" element={<LeavePage />} />
    <Route path="/hr/leaves/my-leaves" element={<LeavePage />} />
    <Route path="/hr/leaves/apply" element={<LeavePage />} />
    <Route path="/hr/leaves/balance" element={<LeaveBalancePage />} />
    <Route path="/hr/leaves/encashment" element={<LeaveEncashmentPage />} />
    <Route path="/hr/leaves/approvals" element={<ApprovalInboxPage />} />
    <Route path="/HR/leaves/approvals" element={<ApprovalInboxPage />} />
    <Route path="/hr/approvals/dashboard" element={<ApprovalsDashboardPage />} />
    <Route path="/hr/holidays" element={<HolidayCalendarsPage />} />

    {/* HR Operations & Requests */}
    <Route path="/hr/requests" element={<EmployeeRequestsPage />} />
    <Route path="/hr/announcements" element={<AnnouncementsPage />} />

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

    {/* Asset Management */}
    <Route path="/hr/assets" element={<AssetDashboard />} />
    <Route path="/hr/assets/dashboard" element={<AssetDashboard />} />
    <Route path="/hr/assets/list" element={<AssetList />} />
    <Route path="/hr/assets/details/:id" element={<AssetDetails />} />
    <Route path="/hr/assets/assign" element={<AssignAsset />} />
    <Route path="/hr/assets/transfers" element={<TransferAsset />} />
    <Route path="/hr/assets/return" element={<ReturnAsset />} />
    <Route path="/hr/assets/maintenance" element={<Maintenance />} />
    <Route path="/hr/assets/licenses" element={<Licenses />} />
    <Route path="/hr/assets/reports" element={<Reports />} />
    <Route path="/hr/assets/analytics" element={<Analytics />} />

    {/* Performance (PMS) */}
    <Route path="/hr/performance" element={<PerformanceDashboard />} />
    <Route path="/hr/performance/goals" element={<GoalManagementPage />} />
    <Route path="/hr/performance/okrs" element={<OKRManagementPage />} />
    <Route path="/hr/performance/reviews" element={<ReviewCyclesPage />} />
    <Route path="/hr/performance/appraisals" element={<PerformanceReviewPage />} />
    <Route path="/hr/performance/competencies" element={<CompetencyDashboardPage />} />
    <Route path="/hr/performance/pip" element={<PIPDashboardPage />} />
    <Route path="/hr/performance/succession" element={<SuccessionPlanningPage />} />
    <Route path="/hr/performance/recognition" element={<RecognitionDashboardPage />} />
    <Route path="/hr/performance/analytics" element={<PerformanceAnalyticsPage />} />

    {/* Reports & Analytics */}
    <Route path="/hr/analytics/attendance" element={<AttendanceReportsPage />} />
    <Route path="/hr/analytics/timelog" element={<TimelogReportPage />} />
    <Route path="/hr/analytics/report-engine" element={<ReportEnginePage />} />
    <Route path="/hr/analytics/burnout-risk" element={<BurnoutRiskDashboard />} />

    {/* Module Management */}
    <Route path="/hr/modules" element={<ModuleManagementPage />} />

    {/* LMS (Learning Management System) */}
    <Route path="/hr/lms" element={<Navigate to="/hr/lms/dashboard" replace />} />
    <Route path="/hr/lms/dashboard" element={<LmsDashboardPage />} />
    <Route path="/hr/lms/courses" element={<CourseManagementPage />} />
    <Route path="/hr/lms/categories" element={<CategoryManagerPage />} />
    <Route path="/hr/lms/batches" element={<BatchManagementPage />} />
    <Route path="/hr/lms/enrollments" element={<EnrollmentManagerPage />} />
    <Route path="/hr/lms/compliance" element={<ComplianceTrainingPage />} />
    <Route path="/hr/lms/reports" element={<LmsReportsPage />} />
    <Route path="/hr/lms/catalog" element={<CourseCatalogPage />} />
    <Route path="/hr/lms/catalog/:id" element={<CourseDetailPage />} />
    <Route path="/hr/lms/courses/:id" element={<CourseDetailPage />} />
    <Route path="/hr/lms/course/:id" element={<CourseDetailPage />} />
    <Route path="/hr/lms/my-learning" element={<MyEnrollmentsPage />} />
    <Route path="/hr/lms/my-courses" element={<MyEnrollmentsPage />} />
    <Route path="/hr/lms/assessment/:id" element={<AssessmentPlayerPage />} />
    <Route path="/hr/lms/certificates" element={<MyCertificatesPage />} />
    <Route path="/hr/lms/settings/integrations" element={<LmsIntegrationSettingsPage />} />

    {/* Operations */}
    <Route path="/hr/masters/builder" element={<MasterBuilderPage />} />
    <Route path="/hr/masters/builder/:id" element={<MasterBuilderDetailPage />} />
    <Route path="/hr/masters" element={<MastersHubPage />} />
    <Route path="/hr/masters/*" element={<MastersHubPage />} />
    <Route path="/hr/operational-masters" element={<OperationalMastersHubPage />} />
    <Route path="/hr/operational-masters/*" element={<OperationalMastersHubPage />} />
    <Route path="/hr/workflow" element={<WorkflowListPage />} />
    <Route path="/hr/workflows" element={<WorkflowListPage />} />
    <Route path="/hr-operations/workflows" element={<WorkflowListPage />} />
    <Route path="/hr-operations/announcements" element={<AnnouncementsPage />} />
    <Route path="/hr-operations/holidays" element={<HolidayCalendarsPage />} />
    <Route path="/hr/workflow/builder" element={<WorkflowBuilderPage />} />
    <Route path="/hr/workflow/approvals" element={<ApprovalInboxPage />} />
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
    <Route path="/hr/settings/lms-integrations" element={<LmsIntegrationSettingsPage />} />
    <Route path="/hr/settings" element={<SettingsLayout />}>
      <Route index element={<Navigate to="company-profile" replace />} />
      <Route path="general" element={<GeneralSettingsPage />} />
      <Route path="admin-config" element={<AdminConfigurationPage />} />
      <Route path="hr-config" element={<HRConfigurationPage />} />
      <Route path="company-profile" element={<CompanyProfilePage />} />
      <Route path="branches" element={<BranchesPage />} />
      <Route path="locations" element={<LocationsPage />} />
      <Route path="branding" element={<BrandingPage />} />
      <Route path="leave-policies" element={<LeavePoliciesPage />} />
      <Route path="org-leave-settings" element={<OrgLeaveSettings />} />
      <Route path="attendance-module" element={<AttendanceModulePage />} />
      <Route path="id-card-designer" element={<IdCardDesignerPage />} />
      <Route path="career-customization" element={<CareerPortalCustomizationPage />} />
      <Route path="lms-integrations" element={<LmsIntegrationSettingsPage />} />
      <Route path="workflows" element={<WorkflowSettingsPage />} />
      <Route path="modules" element={<ModuleManagementPage />} />
      <Route path="*" element={<Navigate to="company-profile" replace />} />
    </Route>
    <Route path="/hr/live-tracking" element={<LiveTrackingDashboardPage />} />
    <Route path="/hr/live-tracking/history" element={<TrackingHistoryPage />} />
  </Route>
);
