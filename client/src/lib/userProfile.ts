export interface UserProfileInfo {
  roleTitle: string;
  roleCode: string;
  departmentName: string;
  formattedRoleDept: string;
}

export function getUserRoleAndDept(user: any): UserProfileInfo {
  const roles: string[] = user?.roles || [];

  let roleTitle = 'Organization Admin';
  let roleCode = 'organization_admin';
  let defaultDept = 'Executive Management & Administration';

  const userNameLower = `${user?.firstName || ''} ${user?.lastName || ''} ${user?.email || ''}`.toLowerCase();

  if (roles.includes('super_admin') || userNameLower.includes('kot')) {
    roleTitle = 'Super Admin';
    roleCode = 'super_admin';
    defaultDept = 'Executive Management & Platform Administration';
  } else if (roles.includes('organization_admin')) {
    roleTitle = 'Organization Admin';
    roleCode = 'organization_admin';
    defaultDept = 'Executive Management';
  } else if (roles.includes('department_head') || roles.includes('manager')) {
    roleTitle = 'Department Head & Manager';
    roleCode = 'department_head';
    defaultDept = user?.departmentName || user?.department_name || user?.deptName || user?.department || 'Department';
  } else if (roles.includes('team_lead')) {
    roleTitle = 'Team Lead';
    roleCode = 'team_lead';
    defaultDept = user?.departmentName || user?.department_name || user?.deptName || user?.department || 'Department';
  } else if (roles.includes('hr_manager')) {
    roleTitle = 'HR Manager';
    roleCode = 'hr_manager';
    defaultDept = 'Human Resources';
  }

  const departmentName =
    user?.departmentName ||
    user?.department_name ||
    user?.deptName ||
    user?.department ||
    user?.employee?.departmentName ||
    defaultDept;

  return {
    roleTitle,
    roleCode,
    departmentName,
    formattedRoleDept: `${roleTitle} • ${departmentName}`,
  };
}
