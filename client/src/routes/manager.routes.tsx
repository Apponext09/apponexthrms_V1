import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ManagerLayout } from '../layouts/ManagerLayout';
import type { Role } from '@/config/roles';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const ManagerDashboardPage = lazy(() => import('../features/manager/pages/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const MyTeamPage = lazy(() => import('../features/manager/pages/MyTeamPage').then(m => ({ default: m.MyTeamPage })));
const DepartmentDashboard = lazy(() => import('../features/manager/pages/DepartmentDashboard').then(m => ({ default: m.DepartmentDashboard })));
const AttendanceDashboard = lazy(() => import('../features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const ManagerHRRegularizationApprovals = lazy(() => import('../features/attendance/components/ManagerHRRegularizationApprovals').then(m => ({ default: m.ManagerHRRegularizationApprovals })));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
const AttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const ShiftRosterPage = lazy(() => import('../features/employee/portal-pages/ShiftRosterPage'));
const ApprovalInboxPage = lazy(() => import('../features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const ApprovalsDashboardPage = lazy(() => import('../features/leaves/pages/ApprovalsDashboardPage').then(m => ({ default: m.ApprovalsDashboardPage })));
const MrfRequestPage = lazy(() => import('../features/recruitment/pages/MrfRequestPage').then(m => ({ default: m.MrfRequestPage })));
const InterviewCalendarPage = lazy(() => import('../features/recruitment/pages/InterviewCalendarPage').then(m => ({ default: m.InterviewCalendarPage })));
const InterviewerRatingPage = lazy(() => import('../features/recruitment/pages/InterviewerRatingPage').then(m => ({ default: m.InterviewerRatingPage })));
const EmployeePayrollPortal = lazy(() => import('../features/payroll/pages/EmployeePayrollPortal').then(m => ({ default: m.EmployeePayrollPortal })));
const EmployeeLoanRequest = lazy(() => import('../features/payroll/components/EmployeeLoanRequest').then(m => ({ default: m.EmployeeLoanRequest })));
const ExpenseApprovalsPage = lazy(() => import('../features/expenses/pages/ExpenseApprovalsPage').then(m => ({ default: m.ExpenseApprovalsPage })));
const MyExpensesPage = lazy(() => import('../features/expenses/pages/MyExpensesPage').then(m => ({ default: m.MyExpensesPage })));
const TravelRequestsPage = lazy(() => import('../features/expenses/pages/TravelRequestsPage').then(m => ({ default: m.TravelRequestsPage })));
const TravelAdvancesPage = lazy(() => import('../features/expenses/pages/TravelAdvancesPage').then(m => ({ default: m.TravelAdvancesPage })));
const MileageClaimsPage = lazy(() => import('../features/expenses/pages/MileageClaimsPage').then(m => ({ default: m.MileageClaimsPage })));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const SalaryRevisionManagement = lazy(() => import('../features/payroll/pages/SalaryRevisionManagement').then(m => ({ default: m.SalaryRevisionManagement })));
const PerformanceDashboard = lazy(() => import('../features/performance/pages/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const ReviewCyclesPage = lazy(() => import('../features/performance/pages/ReviewCyclesPage').then(m => ({ default: m.ReviewCyclesPage })));
const GoalManagementPage = lazy(() => import('../features/performance/pages/GoalManagementPage').then(m => ({ default: m.GoalManagementPage })));
const ApprovalsPage = lazy(() => import('../features/employee/portal-pages/ApprovalsPage'));
// Managers use the same self-service profile and HR approval flow as employees.
const ProfilePage = lazy(() => import('../features/employee/portal-pages/ProfilePage'));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const LiveTrackingDashboardPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.LiveTrackingDashboardPage })));
const TrackingHistoryPage = lazy(() => import('../features/Livetracking').then(m => ({ default: m.TrackingHistoryPage })));
const TeamSettlementsPage = lazy(() => import('../features/payroll/pages/TeamSettlementsPage').then(m => ({ default: m.TeamSettlementsPage })));
const PoliciesPage = lazy(() => import('../features/employee/portal-pages/PoliciesPage'));
const ManagerIjpApprovalsPage = lazy(() => import('../features/manager/pages/ManagerIjpApprovalsPage'));
const ManagerLmsPage = lazy(() => import('../features/lms/pages/ManagerLmsPage').then(m => ({ default: m.ManagerLmsPage })));

const MANAGER_ALLOWED_ROLES: Role[] = [
  'department_head',
  'manager',
  'organization_admin',
  'ceo',
  'super_admin',
];

// ── Manager / Department Head Portal Routes (/manager/*) ─────────────────────
export const managerRoutes = (
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
    <Route path="/manager/attendance-correction" element={<ManagerHRRegularizationApprovals role="manager" />} />
    <Route path="/manager/face-attendance" element={<FaceAttendancePage />} />
    <Route path="/manager/attendance-log" element={<AttendancePage />} />
    <Route path="/manager/my-shift" element={<ShiftRosterPage />} />
    <Route path="/manager/leave-approvals" element={<ApprovalInboxPage />} />
    <Route path="/manager/leaves/approvals" element={<ApprovalInboxPage />} />
    <Route path="/manager/leaves/approvals-dashboard" element={<ApprovalsDashboardPage />} />
    <Route path="/manager/hiring" element={<DepartmentDashboard />} />
    <Route path="/manager/mrf-request" element={<MrfRequestPage />} />
    <Route path="/manager/ijp-approvals" element={<ManagerIjpApprovalsPage />} />
    <Route path="/manager/interview-schedule" element={<InterviewCalendarPage />} />
    <Route path="/manager/interviewer-rating" element={<InterviewerRatingPage />} />
    <Route path="/manager/payroll" element={<EmployeePayrollPortal />} />
    <Route path="/manager/loans" element={<EmployeeLoanRequest />} />
    <Route
      path="/manager/expenses"
      element={
        <ExpenseApprovalsPage
          defaultStatusFilter="pending_level_2"
          allowedStatuses={['pending_level_2', 'pending_manager', 'pending_approvals', 'returned', 'rejected', 'all']}
          portalLabel="Approve your team's expense claims — Level 2 (Manager) queue"
        />
      }
    />
    <Route
      path="/manager/expenses/approvals"
      element={
        <ExpenseApprovalsPage
          defaultStatusFilter="pending_level_2"
          allowedStatuses={['pending_level_2', 'pending_manager', 'pending_approvals', 'returned', 'rejected', 'all']}
          portalLabel="Approve your team's expense claims — Level 2 (Manager) queue"
        />
      }
    />
    <Route path="/manager/expenses/my-expenses" element={<MyExpensesPage />} />
    <Route path="/manager/expenses/travel-requests" element={<TravelRequestsPage />} />
    <Route path="/manager/expenses/travel-advances" element={<TravelAdvancesPage />} />
    <Route path="/manager/expenses/mileage-claims" element={<MileageClaimsPage />} />
    <Route path="/manager/travel" element={<TravelRequestsPage />} />
    <Route path="/manager/payslips" element={<PayslipViewer />} />
    <Route path="/manager/salary-revisions" element={<SalaryRevisionManagement />} />
    <Route path="/manager/salary-revision" element={<SalaryRevisionManagement />} />
    <Route path="/manager/performance" element={<PerformanceDashboard />} />
    <Route path="/manager/performance/reviews" element={<ReviewCyclesPage />} />
    <Route path="/manager/performance/goals" element={<GoalManagementPage />} />
    <Route path="/manager/approvals" element={<ApprovalsPage />} />
    <Route path="/manager/profile" element={<ProfilePage />} />
    <Route path="/manager/leaves" element={<LeavePage />} />
    <Route path="/manager/live-tracking" element={<LiveTrackingDashboardPage />} />
    <Route path="/manager/settlements" element={<TeamSettlementsPage />} />
    <Route path="/manager/policies" element={<PoliciesPage />} />
    <Route path="/manager/lms" element={<ManagerLmsPage />} />
    <Route path="/manager/learning" element={<ManagerLmsPage />} />
    <Route path="/manager/live-tracking/history" element={<TrackingHistoryPage />} />
  </Route>
);
