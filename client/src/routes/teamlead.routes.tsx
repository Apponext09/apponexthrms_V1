import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TeamLeadLayout } from '../layouts/TeamLeadLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const TeamLeadDashboardPage = lazy(() => import('../features/team-lead/pages/TeamLeadDashboardPage').then(m => ({ default: m.TeamLeadDashboardPage })));
const TeamMembersPage = lazy(() => import('../features/team-lead/pages/TeamMembersPage').then(m => ({ default: m.TeamMembersPage })));
const TeamLeadProfilePage = lazy(() => import('../features/team-lead/pages/TeamLeadProfilePage').then(m => ({ default: m.TeamLeadProfilePage })));
const AttendanceDashboard = lazy(() => import('../features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
const EmployeePayrollPortal = lazy(() => import('../features/payroll/pages/EmployeePayrollPortal').then(m => ({ default: m.EmployeePayrollPortal })));
const EmployeeLoanRequest = lazy(() => import('../features/payroll/components/EmployeeLoanRequest').then(m => ({ default: m.EmployeeLoanRequest })));
const ExpenseApprovalsPage = lazy(() => import('../features/expenses/pages/ExpenseApprovalsPage').then(m => ({ default: m.ExpenseApprovalsPage })));
const MyExpensesPage = lazy(() => import('../features/expenses/pages/MyExpensesPage').then(m => ({ default: m.MyExpensesPage })));
const TravelRequestsPage = lazy(() => import('../features/expenses/pages/TravelRequestsPage').then(m => ({ default: m.TravelRequestsPage })));
const TravelAdvancesPage = lazy(() => import('../features/expenses/pages/TravelAdvancesPage').then(m => ({ default: m.TravelAdvancesPage })));
const MileageClaimsPage = lazy(() => import('../features/expenses/pages/MileageClaimsPage').then(m => ({ default: m.MileageClaimsPage })));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const SalaryRevisionManagement = lazy(() => import('../features/payroll/pages/SalaryRevisionManagement').then(m => ({ default: m.SalaryRevisionManagement })));
const ApprovalInboxPage = lazy(() => import('../features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const InterviewCalendarPage = lazy(() => import('../features/recruitment/pages/InterviewCalendarPage').then(m => ({ default: m.InterviewCalendarPage })));
const InterviewerRatingPage = lazy(() => import('../features/recruitment/pages/InterviewerRatingPage').then(m => ({ default: m.InterviewerRatingPage })));
const MrfRequestPage = lazy(() => import('../features/recruitment/pages/MrfRequestPage').then(m => ({ default: m.MrfRequestPage })));
const LiveTrackingDashboardPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.LiveTrackingDashboardPage })));
const TrackingHistoryPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.TrackingHistoryPage })));
const TeamSettlementsPage = lazy(() => import('../features/payroll/pages/TeamSettlementsPage').then(m => ({ default: m.TeamSettlementsPage })));
const TeamLeadLmsPage = lazy(() => import('../features/lms/pages/TeamLeadLmsPage').then(m => ({ default: m.TeamLeadLmsPage })));

// ── Team Lead Portal Routes (/team-lead/*) ────────────────────────────────────
export const teamLeadRoutes = (
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
    <Route
      path="/team-lead/expenses"
      element={
        <ExpenseApprovalsPage
          defaultStatusFilter="pending_level_1"
          allowedStatuses={['pending_level_1', 'pending_approvals', 'returned', 'rejected', 'all']}
          portalLabel="Approve your team's expense claims — Level 1 (Team Lead) queue"
        />
      }
    />
    <Route
      path="/team-lead/expenses/approvals"
      element={
        <ExpenseApprovalsPage
          defaultStatusFilter="pending_level_1"
          allowedStatuses={['pending_level_1', 'pending_approvals', 'returned', 'rejected', 'all']}
          portalLabel="Approve your team's expense claims — Level 1 (Team Lead) queue"
        />
      }
    />
    <Route path="/team-lead/expenses/my-expenses" element={<MyExpensesPage />} />
    <Route path="/team-lead/expenses/travel-requests" element={<TravelRequestsPage />} />
    <Route path="/team-lead/expenses/travel-advances" element={<TravelAdvancesPage />} />
    <Route path="/team-lead/expenses/mileage-claims" element={<MileageClaimsPage />} />
    <Route path="/team-lead/travel" element={<TravelRequestsPage />} />
    <Route path="/team-lead/payslips" element={<PayslipViewer />} />
    <Route path="/team-lead/salary-revisions" element={<SalaryRevisionManagement />} />
    <Route path="/team-lead/salary-revision" element={<SalaryRevisionManagement />} />
    <Route path="/team-lead/profile" element={<TeamLeadProfilePage />} />
    <Route path="/team-lead/leaves" element={<LeavePage />} />
    <Route path="/team-lead/leaves/approvals" element={<ApprovalInboxPage />} />
    <Route path="/team-lead/interview-schedule" element={<InterviewCalendarPage />} />
    <Route path="/team-lead/interviewer-rating" element={<InterviewerRatingPage />} />
    <Route path="/team-lead/mrf-request" element={<MrfRequestPage />} />
    <Route path="/team-lead/mrf" element={<MrfRequestPage />} />
    <Route path="/team-lead/live-tracking" element={<LiveTrackingDashboardPage />} />
    <Route path="/team-lead/settlements" element={<TeamSettlementsPage />} />
    <Route path="/team-lead/lms" element={<TeamLeadLmsPage />} />
    <Route path="/team-lead/learning" element={<TeamLeadLmsPage />} />
    <Route path="/team-lead/live-tracking/history" element={<TrackingHistoryPage />} />
  </Route>
);
