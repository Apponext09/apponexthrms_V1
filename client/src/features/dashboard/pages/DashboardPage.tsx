import { OrgAdminDashboard } from './role-dashboards/OrgAdminDashboard';

/**
 * Admin Dashboard — No auto-redirects
 * CEO (organization_admin) and HR (hr_admin/hr/hr_manager) see the admin dashboard
 * Route protection is handled by ProtectedRoute in routes.tsx
 */
export function DashboardPage() {
  return <OrgAdminDashboard />;
}

