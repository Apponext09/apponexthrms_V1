import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Portal shell is lazy-loaded so it is not part of the pre-login bundle
const EmployeeLayout = lazy(() => import('../features/employee/layout/EmployeeLayout').then(m => ({ default: m.EmployeeLayout })));

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const EmployeeDashboardPage = lazy(() => import('../features/employee/Dashboard/EmployeeDashboardPage').then(m => ({ default: m.EmployeeDashboardPage })));
const ProfilePage = lazy(() => import('../features/employee/portal-pages/ProfilePage'));
const MyLifecyclePage = lazy(() => import('../features/employee/pages/MyLifecyclePage').then(m => ({ default: m.MyLifecyclePage })));
const AttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const RegularizationPage = lazy(() => import('../features/employee/portal-pages/RegularizationPage'));
const ShiftRosterPage = lazy(() => import('../features/employee/portal-pages/ShiftRosterPage'));
const HolidayCalendarPage = lazy(() => import('../features/employee/portal-pages/HolidayCalendarPage'));
const TimesheetPage = lazy(() => import('../features/employee/portal-pages/TimesheetPage'));
const EmployeePayrollPortal = lazy(() => import('../features/payroll/pages/EmployeePayrollPortal').then(m => ({ default: m.EmployeePayrollPortal })));
const MySettlementPage = lazy(() => import('../features/payroll/pages/MySettlementPage').then(m => ({ default: m.MySettlementPage })));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const PayrollPage = lazy(() => import('../features/employee/portal-pages/PayrollPage'));
const TaxDeclarationPage = lazy(() => import('../features/employee/portal-pages/TaxDeclarationPage'));
const MyExpensesPage = lazy(() => import('../features/expenses/pages/MyExpensesPage').then(m => ({ default: m.MyExpensesPage })));
const TravelRequestsPage = lazy(() => import('../features/expenses/pages/TravelRequestsPage').then(m => ({ default: m.TravelRequestsPage })));
const TravelAdvancesPage = lazy(() => import('../features/expenses/pages/TravelAdvancesPage').then(m => ({ default: m.TravelAdvancesPage })));
const MileageClaimsPage = lazy(() => import('../features/expenses/pages/MileageClaimsPage').then(m => ({ default: m.MileageClaimsPage })));
const AssetPage = lazy(() => import('../features/employee/portal-pages/AssetPage'));
const DocumentsPage = lazy(() => import('../features/employee/portal-pages/DocumentsPage'));
const IDCardPage = lazy(() => import('../features/employee/portal-pages/IDCardPage'));
const OrgChartPage = lazy(() => import('../features/employee/portal-pages/OrgChartPage'));
const TeamDirectoryPage = lazy(() => import('../features/employee/portal-pages/TeamDirectoryPage'));
const PerformancePage = lazy(() => import('../features/employee/portal-pages/PerformancePage'));
const GoalsPage = lazy(() => import('../features/employee/portal-pages/GoalsPage'));
const FeedbackPage = lazy(() => import('../features/employee/portal-pages/FeedbackPage'));
const LearningPage = lazy(() => import('../features/employee/portal-pages/LearningPage'));
const TrainingPage = lazy(() => import('../features/employee/portal-pages/TrainingPage'));
const PoliciesPage = lazy(() => import('../features/employee/portal-pages/PoliciesPage'));
const AnnouncementsPage = lazy(() => import('../features/employee/portal-pages/AnnouncementsPage'));
const SurveysPage = lazy(() => import('../features/employee/portal-pages/SurveysPage'));
const HelpdeskPage = lazy(() => import('../features/employee/portal-pages/HelpdeskPage'));
const ReferralPage = lazy(() => import('../features/employee/portal-pages/ReferralPage'));
const JobOpeningsPage = lazy(() => import('../features/employee/portal-pages/JobOpeningsPage'));
const InterviewCalendarPage = lazy(() => import('../features/recruitment/pages/InterviewCalendarPage').then(m => ({ default: m.InterviewCalendarPage })));
const InterviewerRatingPage = lazy(() => import('../features/recruitment/pages/InterviewerRatingPage').then(m => ({ default: m.InterviewerRatingPage })));
const HealthWellnessPage = lazy(() => import('../features/employee/portal-pages/HealthWellnessPage'));
const LoanRequestPage = lazy(() => import('../features/employee/portal-pages/LoanRequestPage'));
const AIAssistantPage = lazy(() => import('../features/employee/portal-pages/AIAssistantPage'));
const NotificationCenterPage = lazy(() => import('../features/notifications/pages/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })));
const ApprovalsPage = lazy(() => import('../features/employee/portal-pages/ApprovalsPage'));
const SettingsSecurityPage = lazy(() => import('../features/employee/portal-pages/SettingsSecurityPage'));
const EmployeeTrackingPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.EmployeeTrackingPage })));

// ── Employee Self-Service Portal Routes (/employee/*) ─────────────────────────
// Excludes: organization_admin, ceo, hr_admin, hr, hr_manager
export const employeePortalRoutes = (
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
    <Route path="/employee/live-tracking" element={<EmployeeTrackingPage />} />
  </Route>
);
