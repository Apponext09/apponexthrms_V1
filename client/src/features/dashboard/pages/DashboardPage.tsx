import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRbac } from '@/lib/rbac';
import { OrgAdminDashboard } from './role-dashboards/OrgAdminDashboard';

/**
 * Dashboard dispatcher — redirects each role to their dedicated portal on first load.
 * Org Admin stays on this page and sees the full admin dashboard.
 */
export function DashboardPage() {
  const { hasRole } = useRbac();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasRole('super_admin')) {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }
    // Redirect HR Manager to HR portal
    if (hasRole('hr_manager')) {
      navigate('/hr/dashboard', { replace: true });
      return;
    }
    // Organization Admin stays on this page
    if (hasRole('organization_admin')) {
      return;
    }
    if (hasRole('department_head')) {
      navigate('/manager/dashboard', { replace: true });
      return;
    }
    if (hasRole('team_lead')) {
      navigate('/team-lead/dashboard', { replace: true });
      return;
    }
    navigate('/employee/dashboard', { replace: true });
  }, []);

  // Only Org Admin and Super Admin see this page
  return <OrgAdminDashboard />;
}
