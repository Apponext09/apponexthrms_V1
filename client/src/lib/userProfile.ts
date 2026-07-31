export interface UserProfileInfo {
  roleTitle: string;
  roleCode: string;
  departmentName: string;
  formattedRoleDept: string;
}

export function getUserRoleAndDept(user: any): UserProfileInfo {
  const roles: string[] = user?.roles || [];
  const accessRole = (user?.accessRole || user?.roleTag || user?.role || '').toLowerCase();
  const designation = typeof user?.designation === 'string' 
    ? user.designation.toLowerCase() 
    : (user?.designation?.name || user?.jobTitle || '').toLowerCase();

  let roleTitle = 'Employee';
  let roleCode = 'employee';
  let defaultDept = user?.departmentName || user?.department_name || user?.deptName || user?.department || 'Department';

  const userNameLower = `${user?.firstName || ''} ${user?.lastName || ''} ${user?.email || ''}`.toLowerCase();

  // Priority check: specific portal role takes precedence over general org_admin permission
  if (accessRole === 'team_lead' || roles.includes('team_lead') || accessRole.includes('team_lead') || designation.includes('team lead') || designation.includes('team_lead')) {
    roleTitle = 'Team Lead';
    roleCode = 'team_lead';
  } else if (accessRole === 'department_head' || accessRole === 'manager' || roles.includes('department_head') || designation.includes('department head') || designation.includes('manager')) {
    roleTitle = 'Department Head & Manager';
    roleCode = 'department_head';
  } else if (accessRole === 'hr_manager' || roles.includes('hr_manager') || designation.includes('hr manager')) {
    roleTitle = 'HR Manager';
    roleCode = 'hr_manager';
    defaultDept = 'Human Resources';
  } else if (roles.includes('super_admin') || accessRole === 'super_admin' || userNameLower.includes('kot')) {
    roleTitle = 'Super Admin';
    roleCode = 'super_admin';
    defaultDept = 'Executive Management & Platform Administration';
  } else if (roles.includes('organization_admin') || accessRole === 'organization_admin' || accessRole === 'admin') {
    roleTitle = 'Organization Admin';
    roleCode = 'organization_admin';
    defaultDept = 'Executive Management';
  }

  const isAdminRole = roleCode === 'super_admin' || roleCode === 'organization_admin';

  const departmentName = isAdminRole
    ? ''
    : user?.departmentName ||
      user?.department_name ||
      user?.deptName ||
      user?.department ||
      user?.employee?.departmentName ||
      defaultDept;

  return {
    roleTitle,
    roleCode,
    departmentName,
    formattedRoleDept: isAdminRole || !departmentName ? roleTitle : `${roleTitle} • ${departmentName}`,
  };
}
