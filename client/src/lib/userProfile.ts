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

  if (accessRole === 'intern' || roles.includes('intern')) {
    roleTitle = 'Intern';
    roleCode = 'intern';
  } else if (accessRole === 'consultant' || roles.includes('consultant')) {
    roleTitle = 'Consultant';
    roleCode = 'consultant';
  } else if (accessRole === 'finance' || roles.includes('finance')) {
    roleTitle = 'Finance';
    roleCode = 'finance';
    defaultDept = 'Finance & Accounts';
  } else if (accessRole === 'team_lead' || roles.includes('team_lead') || accessRole.includes('team_lead') || designation.includes('team lead') || designation.includes('team_lead')) {
    roleTitle = 'Team Lead';
    roleCode = 'team_lead';
  } else if (
    ['cto', 'cfo', 'coo', 'cxo'].includes(accessRole) ||
    roles.some(r => ['cto', 'cfo', 'coo', 'cxo'].includes(r)) ||
    designation.includes('cto') || designation.includes('cfo') || designation.includes('coo') || designation.includes('chief')
  ) {
    roleTitle = designation.includes('cto') || accessRole === 'cto' ? 'CTO' :
                designation.includes('cfo') || accessRole === 'cfo' ? 'CFO' :
                designation.includes('coo') || accessRole === 'coo' ? 'COO' : 'CXO';
    roleCode = ['cto', 'cfo', 'coo', 'cxo'].includes(accessRole) ? accessRole : 'cxo';
    defaultDept = 'Executive Leadership';
  } else if (accessRole === 'department_head' || accessRole === 'manager' || roles.includes('department_head') || designation.includes('department head') || designation.includes('manager')) {
    roleTitle = 'Manager';
    roleCode = 'department_head';
  } else if (accessRole === 'support' || roles.includes('support')) {
    // Support persona — uses /hr/* portal
    roleTitle = 'Support';
    roleCode = 'support';
    defaultDept = 'Support Operations';
  } else if (accessRole === 'hr_admin' || roles.includes('hr_admin') || accessRole === 'hr' || roles.includes('hr')) {
    // HR persona — shares Admin portal with CEO
    roleTitle = 'HR';
    roleCode = 'hr_admin';
    defaultDept = 'Human Resources';
  } else if (accessRole === 'hr_manager' || roles.includes('hr_manager') || designation.includes('hr manager')) {
    // HR Manager — shows as HR on the Admin portal
    roleTitle = 'HR';
    roleCode = 'hr_manager';
    defaultDept = 'Human Resources';
  } else if (roles.includes('super_admin') || accessRole === 'super_admin' || userNameLower.includes('kot')) {
    roleTitle = 'Super Admin';
    roleCode = 'super_admin';
    defaultDept = 'Executive Management & Platform Administration';
  } else if (
    roles.includes('organization_admin') ||
    roles.includes('ceo') ||
    accessRole === 'organization_admin' ||
    accessRole === 'ceo' ||
    accessRole === 'admin'
  ) {
    roleTitle = 'CEO';
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
