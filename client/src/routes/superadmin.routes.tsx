import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Portal shell is lazy-loaded so it is not part of the pre-login bundle
const SuperAdminLayout = lazy(() => import('../features/superadmin/sidebar/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })));

// ── Lazy Imports ──────────────────────────────────────────────────────────────
const SuperAdminDashboardPage = lazy(() => import('../features/superadmin/Dashboard/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const SuperAdminOrganizationPage = lazy(() => import('../features/superadmin/Organization/SuperAdminOrganizationPage').then(m => ({ default: m.SuperAdminOrganizationPage })));
const SuperAdminSubscriptionPage = lazy(() => import('../features/superadmin/Subcription/SuperAdminSubscriptionPage').then(m => ({ default: m.SuperAdminSubscriptionPage })));
const SuperAdminHelpDeskPage = lazy(() => import('../features/superadmin/HelpDesk/SuperAdminHelpDeskPage').then(m => ({ default: m.SuperAdminHelpDeskPage })));
const SuperAdminProfilePage = lazy(() => import('../features/superadmin/Profile/SuperAdminProfilePage').then(m => ({ default: m.SuperAdminProfilePage })));

// ── SuperAdmin Portal Routes (/superadmin/*) ──────────────────────────────────
export const superAdminRoutes = (
  <Route
    element={
      <ProtectedRoute allowedRoles={['super_admin']}>
        <SuperAdminLayout />
      </ProtectedRoute>
    }
  >
    <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />
    <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
    <Route path="/superadmin/organization" element={<SuperAdminOrganizationPage />} />
    <Route path="/superadmin/subscription" element={<SuperAdminSubscriptionPage />} />
    <Route path="/superadmin/helpdesk" element={<SuperAdminHelpDeskPage />} />
    <Route path="/superadmin/profile" element={<SuperAdminProfilePage />} />
  </Route>
);
