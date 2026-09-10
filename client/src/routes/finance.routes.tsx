import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { FinanceLayout } from '../layouts/FinanceLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const FinanceDashboardPage = lazy(() => import('../features/finance/pages/FinanceDashboardPage').then(m => ({ default: m.FinanceDashboardPage })));
const FinanceReportsPage = lazy(() => import('../features/finance/pages/FinanceReportsPage').then(m => ({ default: m.FinanceReportsPage })));
const FinanceApprovalsPage = lazy(() => import('../features/finance/pages/FinanceApprovalsPage').then(m => ({ default: m.FinanceApprovalsPage })));
const ProfilePage = lazy(() => import('../features/employee/portal-pages/ProfilePage'));
const AttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const FaceAttendancePage = lazy(() => import('../features/employee/portal-pages/FaceAttendancePage'));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const DocumentsPage = lazy(() => import('../features/employee/portal-pages/DocumentsPage'));
const HolidayCalendarPage = lazy(() => import('../features/employee/portal-pages/HolidayCalendarPage'));
const AnnouncementsPage = lazy(() => import('../features/employee/portal-pages/AnnouncementsPage'));
const OrgChartPage = lazy(() => import('../features/employee/portal-pages/OrgChartPage'));

// ── Finance Portal Routes (/finance/*) ───────────────────────────────────────
// STRICT ISOLATION: Only finance / finance_manager roles may access these routes.
// Finance users cannot navigate to any other portal.
export const financeRoutes = (
  <Route
    element={
      <ProtectedRoute allowedRoles={['finance']}>
        <FinanceLayout />
      </ProtectedRoute>
    }
  >
    <Route path="/finance" element={<Navigate to="/finance/reports" replace />} />
    <Route path="/finance/dashboard" element={<FinanceDashboardPage />} />
    <Route path="/finance/reports" element={<FinanceReportsPage />} />
    <Route path="/finance/approvals" element={<FinanceApprovalsPage />} />
    <Route path="/finance/profile" element={<ProfilePage />} />
    <Route path="/finance/attendance" element={<AttendancePage />} />
    <Route path="/finance/face-punch" element={<FaceAttendancePage />} />
    <Route path="/finance/leaves" element={<LeavePage />} />
    <Route path="/finance/payslips" element={<PayslipViewer />} />
    <Route path="/finance/documents" element={<DocumentsPage />} />
    <Route path="/finance/holiday-calendar" element={<HolidayCalendarPage />} />
    <Route path="/finance/announcements" element={<AnnouncementsPage />} />
    <Route path="/finance/org-chart" element={<OrgChartPage />} />
  </Route>
);
