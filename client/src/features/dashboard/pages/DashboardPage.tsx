import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { OrgAdminDashboard } from './role-dashboards/OrgAdminDashboard';

/**
 * Admin Dashboard — CEO (organization_admin) and HR (hr_admin/hr/hr_manager) see the admin dashboard.
 * Non-admin roles are safely redirected to their respective portal dashboards.
 */
export function DashboardPage() {
  const { user } = useAuthStore();
  const roles = (user?.roles || []).map((r) => String(r).toLowerCase());
  const accessRole = String(user?.accessRole || user?.role || '').toLowerCase();

  const isAdmin =
    roles.includes('organization_admin') ||
    roles.includes('ceo') ||
    roles.includes('hr_admin') ||
    roles.includes('hr_manager') ||
    roles.includes('hr') ||
    roles.includes('super_admin') ||
    ['organization_admin', 'ceo', 'hr_admin', 'hr_manager', 'hr', 'super_admin'].includes(accessRole);

  if (!isAdmin) {
    if (roles.includes('finance') || roles.includes('finance_manager') || ['finance', 'finance_manager'].includes(accessRole)) {
      return <Navigate to="/finance/dashboard" replace />;
    }
    if (roles.includes('manager') || roles.includes('department_head') || ['manager', 'department_head'].includes(accessRole)) {
      return <Navigate to="/manager/dashboard" replace />;
    }
    if (roles.includes('team_lead') || accessRole === 'team_lead') {
      return <Navigate to="/team-lead/dashboard" replace />;
    }
    if (roles.includes('support') || accessRole === 'support') {
      return <Navigate to="/hr/dashboard" replace />;
    }
    if (roles.includes('intern') || accessRole === 'intern') {
      return <Navigate to="/intern/dashboard" replace />;
    }
    if (roles.includes('consultant') || accessRole === 'consultant') {
      return <Navigate to="/consultant/dashboard" replace />;
    }
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <OrgAdminDashboard />;
}

