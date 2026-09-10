import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ConsultantLayout } from '../layouts/ConsultantLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const ConsultantDashboardPage = lazy(() => import('../features/consultant/pages/ConsultantDashboardPage').then(m => ({ default: m.ConsultantDashboardPage })));
const ProfilePage = lazy(() => import('../features/employee/portal-pages/ProfilePage'));
const AttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const MyExpensesPage = lazy(() => import('../features/expenses/pages/MyExpensesPage').then(m => ({ default: m.MyExpensesPage })));
const TravelPage = lazy(() => import('../features/employee/portal-pages/TravelPage'));
const DocumentsPage = lazy(() => import('../features/employee/portal-pages/DocumentsPage'));
const HolidayCalendarPage = lazy(() => import('../features/employee/portal-pages/HolidayCalendarPage'));
const AnnouncementsPage = lazy(() => import('../features/employee/portal-pages/AnnouncementsPage'));
const IDCardPage = lazy(() => import('../features/employee/portal-pages/IDCardPage'));
const OrgChartPage = lazy(() => import('../features/employee/portal-pages/OrgChartPage'));

// ── Consultant Portal Routes (/consultant/*) ──────────────────────────────────
export const consultantRoutes = (
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
);
