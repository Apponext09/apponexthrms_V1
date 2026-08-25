import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRbac } from '@/lib/rbac';
import { OrgAdminDashboard } from './role-dashboards/OrgAdminDashboard';

/**
 * Dashboard dispatcher — redirects each role to their dedicated portal on first load.
 * CEO (organization_admin) and HR (hr_admin/hr) both stay on this page and see the full admin dashboard.
 * Support (hr_manager) gets redirected to /hr/dashboard.
 */
export function DashboardPage() {
  const { hasRole, roles } = useRbac();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasRole('super_admin')) {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }
    // Support persona — redirect to the /hr/* portal
    if (roles.includes('support')) {
      navigate('/hr/dashboard', { replace: true });
      return;
    }
    // CEO (organization_admin, ceo) and HR (hr_manager/hr_admin/hr) all stay on this page
    if (
      hasRole('organization_admin') ||
      roles.includes('ceo') ||
      hasRole('hr_manager') ||
      roles.includes('hr_admin') ||
      roles.includes('hr')
    ) {
      return;
    }
    if (hasRole('department_head') || hasRole('manager' as any)) {
      navigate('/manager/dashboard', { replace: true });
      return;
    }
    if (hasRole('team_lead')) {
      navigate('/team-lead/dashboard', { replace: true });
      return;
    }
    if (hasRole('intern') || roles.includes('intern')) {
      navigate('/intern/dashboard', { replace: true });
      return;
    }
    if (hasRole('consultant') || roles.includes('consultant')) {
      navigate('/consultant/dashboard', { replace: true });
      return;
    }
    navigate('/employee/dashboard', { replace: true });
  }, []);

  // CEO and HR both see the full Admin dashboard
  return <OrgAdminDashboard />;
}

