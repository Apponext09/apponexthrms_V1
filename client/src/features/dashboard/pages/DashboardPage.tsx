import { useRbac } from '@/lib/rbac';
import { OrgAdminDashboard } from './role-dashboards/OrgAdminDashboard';
import { HRManagerDashboard } from './role-dashboards/HRManagerDashboard';
import { ManagerDashboard } from './role-dashboards/ManagerDashboard';
import { EmployeeDashboard } from './role-dashboards/EmployeeDashboard';

/**
 * Dashboard dispatcher that renders role-appropriate dashboard variant
 */
export function DashboardPage() {
  const { hasRole } = useRbac();

  // Check roles in priority order
  if (hasRole('super_admin') || hasRole('organization_admin')) {
    return <OrgAdminDashboard />;
  }

  if (hasRole('hr_manager')) {
    return <HRManagerDashboard />;
  }

  if (hasRole('department_head')) {
    return <ManagerDashboard />;
  }

  // Default to employee dashboard
  return <EmployeeDashboard />;
}
