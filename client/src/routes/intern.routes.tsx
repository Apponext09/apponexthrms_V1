import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { InternLayout } from '../layouts/InternLayout';

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const InternDashboardPage = lazy(() => import('../features/intern/pages/InternDashboardPage').then(m => ({ default: m.InternDashboardPage })));
const ProfilePage = lazy(() => import('../features/employee/portal-pages/ProfilePage'));
const AttendancePage = lazy(() => import('../features/employee/portal-pages/AttendancePage'));
const LeavePage = lazy(() => import('../features/employee/portal-pages/LeavePage'));
const PayslipViewer = lazy(() => import('../features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const DocumentsPage = lazy(() => import('../features/employee/portal-pages/DocumentsPage'));
const HolidayCalendarPage = lazy(() => import('../features/employee/portal-pages/HolidayCalendarPage'));
const AnnouncementsPage = lazy(() => import('../features/employee/portal-pages/AnnouncementsPage'));
const IDCardPage = lazy(() => import('../features/employee/portal-pages/IDCardPage'));
const OrgChartPage = lazy(() => import('../features/employee/portal-pages/OrgChartPage'));
const MyLifecyclePage = lazy(() => import('../features/employee/pages/MyLifecyclePage').then(m => ({ default: m.MyLifecyclePage })));

// ── Intern Portal Routes (/intern/*) ─────────────────────────────────────────
export const internRoutes = (
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
    <Route path="/intern/lifecycle" element={<MyLifecyclePage />} />
    <Route path="/intern/lifecycle/*" element={<MyLifecyclePage />} />
    <Route path="/intern/attendance" element={<AttendancePage />} />
    <Route path="/intern/leaves" element={<LeavePage />} />
    <Route path="/intern/payslips" element={<PayslipViewer />} />
    <Route path="/intern/documents" element={<DocumentsPage />} />
    <Route path="/intern/holiday-calendar" element={<HolidayCalendarPage />} />
    <Route path="/intern/announcements" element={<AnnouncementsPage />} />
    <Route path="/intern/id-card" element={<IDCardPage />} />
    <Route path="/intern/org-chart" element={<OrgChartPage />} />
  </Route>
);
