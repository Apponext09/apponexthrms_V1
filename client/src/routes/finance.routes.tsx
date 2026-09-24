import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { FinanceLayout } from '../layouts/FinanceLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const FinanceDashboardPage = lazy(() => import('../features/finance/pages/FinanceDashboardPage').then(m => ({ default: m.FinanceDashboardPage })));
const MyLifecyclePage = lazy(() => import('../features/employee/pages/MyLifecyclePage').then(m => ({ default: m.MyLifecyclePage })));
const FinanceReportsPage = lazy(() => import('../features/finance/pages/FinanceReportsPage').then(m => ({ default: m.FinanceReportsPage })));
const FinanceApprovalsPage = lazy(() => import('../features/finance/pages/FinanceApprovalsPage').then(m => ({ default: m.FinanceApprovalsPage })));
const ProfilePage = lazy(() => import('../features/employee/portal-pages/ProfilePage'));
const AttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
const RegularizationPage = lazy(() => import('../features/employee/portal-pages/RegularizationPage'));
const ShiftRosterPage = lazy(() => import('../features/employee/portal-pages/ShiftRosterPage'));
const IDCardPage = lazy(() => import('../features/employee/portal-pages/IDCardPage'));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const DocumentsPage = lazy(() => import('../features/employee/portal-pages/DocumentsPage'));
const HolidayCalendarPage = lazy(() => import('../features/employee/portal-pages/HolidayCalendarPage'));
const AnnouncementsPage = lazy(() => import('../features/employee/portal-pages/AnnouncementsPage'));
const OrgChartPage = lazy(() => import('../features/org-structure/pages/OrgStructurePage').then(m => ({ default: m.OrgStructurePage })));

// ── Lazy Imports: Expense & Disbursal Module Pages ──────────────────────────────
const FinanceVerificationPage = lazy(() => import('../features/expenses/pages/FinanceVerificationPage').then(m => ({ default: m.FinanceVerificationPage })));
const ReimbursementsPage = lazy(() => import('../features/expenses/pages/ReimbursementsPage').then(m => ({ default: m.ReimbursementsPage })));
const TravelAdvancesPage = lazy(() => import('../features/expenses/pages/TravelAdvancesPage').then(m => ({ default: m.TravelAdvancesPage })));
const ExpenseApprovalsPage = lazy(() => import('../features/expenses/pages/ExpenseApprovalsPage'));
const ExpenseReportsPage = lazy(() => import('../features/expenses/pages/ExpenseReportsPage').then(m => ({ default: m.ExpenseReportsPage })));
const ExpenseDashboardPage = lazy(() => import('../features/expenses/pages/ExpenseDashboardPage').then(m => ({ default: m.ExpenseDashboardPage })));
const MyExpensesPage = lazy(() => import('../features/expenses/pages/MyExpensesPage'));
const TravelRequestsPage = lazy(() => import('../features/expenses/pages/TravelRequestsPage').then(m => ({ default: m.TravelRequestsPage })));
const MileageClaimsPage = lazy(() => import('../features/expenses/pages/MileageClaimsPage').then(m => ({ default: m.MileageClaimsPage })));
const ExpenseCategoriesPage = lazy(() => import('../features/expenses/pages/ExpenseCategoriesPage').then(m => ({ default: m.ExpenseCategoriesPage })));
const ExpensePoliciesPage = lazy(() => import('../features/expenses/pages/ExpensePoliciesPage').then(m => ({ default: m.ExpensePoliciesPage })));
const ExpenseSettingsPage = lazy(() => import('../features/expenses/pages/ExpenseSettingsPage').then(m => ({ default: m.ExpenseSettingsPage })));

// ── Finance Portal Routes (/finance/*) ───────────────────────────────────────
// Allowed for Finance, Finance Manager, Admin, HR, and Executive roles
export const financeRoutes = (
  <Route
    element={
      <ProtectedRoute allowedRoles={['finance', 'organization_admin', 'super_admin', 'hr_admin', 'hr', 'hr_manager', 'ceo']}>
        <FinanceLayout />
      </ProtectedRoute>
    }
  >
    <Route path="/finance" element={<Navigate to="/finance/dashboard" replace />} />
    <Route path="/finance/dashboard" element={<FinanceDashboardPage />} />
    <Route path="/finance/reports" element={<FinanceReportsPage />} />
    <Route path="/finance/approvals" element={<FinanceApprovalsPage />} />
    
    {/* Expense & Disbursal Module Routes */}
    <Route
      path="/finance/expenses/verification"
      element={<FinanceVerificationPage portalLabel="Finance Verification" portalDescription="Review the finance-assigned workflow step, including eligible amount adjustments, before payment processing." />}
    />
    <Route
      path="/finance/expenses/finance-verification"
      element={<FinanceVerificationPage portalLabel="Finance Verification" portalDescription="Review the finance-assigned workflow step, including eligible amount adjustments, before payment processing." />}
    />
    <Route path="/finance/expenses/reimbursements" element={<ReimbursementsPage />} />
    <Route path="/finance/expenses/travel-advances" element={<TravelAdvancesPage />} />
    <Route
      path="/finance/expenses/approvals"
      element={
        <ExpenseApprovalsPage
          defaultStatusFilter="pending_finance"
          allowedStatuses={['pending_finance', 'pending_approvals', 'returned', 'rejected']}
          portalLabel="Finance Payout & Verification Queue"
          portalDescription="Review finance-assigned workflow steps before payout processing."
        />
      }
    />
    <Route path="/finance/expenses/reports" element={<ExpenseReportsPage />} />
    <Route path="/finance/expenses/dashboard" element={<ExpenseDashboardPage />} />
    <Route path="/finance/expenses/my-expenses" element={<MyExpensesPage />} />
    <Route path="/finance/expenses/travel-requests" element={<TravelRequestsPage />} />
    <Route path="/finance/expenses/mileage-claims" element={<MileageClaimsPage />} />
    <Route path="/finance/expenses/categories" element={<ExpenseCategoriesPage />} />
    <Route path="/finance/expenses/policies" element={<ExpensePoliciesPage />} />
    <Route path="/finance/expenses/settings" element={<ExpenseSettingsPage />} />

    {/* Self-Service & Employee Portal Pages */}
    <Route path="/finance/profile" element={<ProfilePage />} />
    <Route path="/finance/lifecycle" element={<MyLifecyclePage />} />
    <Route path="/finance/attendance" element={<AttendancePage />} />
    <Route path="/finance/face-punch" element={<FaceAttendancePage />} />
    <Route path="/finance/attendance-regularization" element={<RegularizationPage />} />
    <Route path="/finance/shift-roster" element={<ShiftRosterPage />} />
    <Route path="/finance/leaves" element={<LeavePage />} />
    <Route path="/finance/payslips" element={<PayslipViewer />} />
    <Route path="/finance/documents" element={<DocumentsPage />} />
    <Route path="/finance/holiday-calendar" element={<HolidayCalendarPage />} />
    <Route path="/finance/announcements" element={<AnnouncementsPage />} />
    <Route path="/finance/org-chart" element={<OrgChartPage />} />
    <Route path="/finance/id-card" element={<IDCardPage />} />
  </Route>
);
