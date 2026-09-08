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
const OrgStructurePage = lazy(() => import('../features/org-structure/pages/OrgStructurePage').then(m => ({ default: m.OrgStructurePage })));
const HRDashboardPage = lazy(() => import('../features/HR/Dashboard/HRDashboardPage').then(m => ({ default: m.HRDashboardPage })));
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
const GratuityPolicyPage = lazy(() => import('../features/payroll/pages/GratuityPolicyPage').then(m => ({ default: m.GratuityPolicyPage })));
const AttendanceDashboard = lazy(() => import('../features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const AttendancePoliciesPage = lazy(() => import('../features/attendance/pages/AttendancePoliciesPage').then(m => ({ default: m.AttendancePoliciesPage })));
const HRAttendanceLocationPage = lazy(() => import('../features/HR/Attendance').then(m => ({ default: m.HRAttendanceLocationPage })));
const BreakLogsPage = lazy(() => import('../features/attendance/pages/BreakLogsPage').then(m => ({ default: m.BreakLogsPage })));
const ManagerHRRegularizationApprovals = lazy(() => import('../features/attendance/components/ManagerHRRegularizationApprovals').then(m => ({ default: m.ManagerHRRegularizationApprovals })));
const ApprovalInboxPage = lazy(() => import('../features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const HolidayCalendarsPage = lazy(() => import('../features/settings/pages/HolidayCalendarsPage').then(m => ({ default: m.HolidayCalendarsPage })));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
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
const PerformanceDashboard = lazy(() => import('../features/performance/pages/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const ReviewCyclesPage = lazy(() => import('../features/performance/pages/ReviewCyclesPage').then(m => ({ default: m.ReviewCyclesPage })));
const MasterBuilderPage = lazy(() => import('../features/master-builder/pages/MasterBuilderPage').then(m => ({ default: m.MasterBuilderPage })));
const MasterBuilderDetailPage = lazy(() => import('../features/master-builder/pages/MasterBuilderDetailPage').then(m => ({ default: m.MasterBuilderDetailPage })));
const MastersHubPage = lazy(() => import('../features/settings/pages/MastersHubPage').then(m => ({ default: m.MastersHubPage })));
const WorkflowListPage = lazy(() => import('../features/workflow/pages/WorkflowListPage').then(m => ({ default: m.WorkflowListPage })));
const WorkflowBuilderPage = lazy(() => import('../features/workflow/pages/WorkflowBuilderPage').then(m => ({ default: m.WorkflowBuilderPage })));
const WorkflowDetailPage = lazy(() => import('../features/workflow/pages/WorkflowDetailPage').then(m => ({ default: m.WorkflowDetailPage })));
const WorkflowSettingsPage = lazy(() => import('../features/workflow/pages/WorkflowSettingsPage').then(m => ({ default: m.WorkflowSettingsPage })));
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

// ── HR Manager Portal Routes (/hr/*) ─────────────────────────────────────────
export const hrRoutes = (
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
    <Route path="/hr/payroll/reports" element={<PayslipViewer />} />

    {/* Policies */}
    <Route path="/hr/policies/manage" element={<AdminPolicyDashboardPage />} />
    <Route path="/hr/policies/create" element={<CreatePolicyPage />} />
    <Route path="/hr/policies/edit/:id" element={<CreatePolicyPage />} />
    <Route path="/hr/policies/reports" element={<PolicyAcknowledgementReportPage />} />

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

    {/* HR Operations & Requests */}
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
  </Route>
);
