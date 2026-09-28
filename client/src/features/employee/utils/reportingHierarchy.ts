export type RoleHierarchyCategory = 'ceo' | 'cxo' | 'manager' | 'team_lead' | 'employee' | 'intern';

/**
 * Determine the hierarchy role category of an employee
 */
export function getRoleHierarchyCategory(emp: any): RoleHierarchyCategory {
  if (!emp) return 'employee';
  const role = (emp.accessRole || emp.access_role || emp.role || (emp.user?.role?.code) || '').toLowerCase();
  const desig = (
    emp.designation?.name ||
    emp.designation ||
    emp.designationName ||
    emp.designation_name ||
    emp.jobTitle ||
    emp.job_title ||
    emp.positionTitle ||
    emp.position_title ||
    ''
  ).toLowerCase();
  const code = (emp.employeeCode || emp.employee_code || '');

  // 1. CEO / Root Org Leader
  if (
    role === 'ceo' ||
    role === 'organization_admin' ||
    code.startsWith('CEO-') ||
    Boolean(emp.isCeo || emp.is_ceo || emp.isCeo === 1 || emp.is_ceo === 1) ||
    desig.includes('chief executive') ||
    desig.includes('managing director')
  ) {
    return 'ceo';
  }

  // 2. CXO / C-Suite
  if (
    ['cto', 'cfo', 'coo', 'cxo', 'cmo', 'cio', 'cpo'].includes(role) ||
    desig.includes('chief technology') ||
    desig.includes('chief financial') ||
    desig.includes('chief operating') ||
    desig.includes('chief marketing') ||
    desig.includes('c-level') ||
    desig === 'cfo' ||
    desig === 'cto' ||
    desig === 'coo'
  ) {
    return 'cxo';
  }

  // 3. Department Head / Manager / Finance Manager / HR Manager
  if (
    ['department_head', 'hr_manager', 'manager', 'dept_head', 'finance_manager', 'finance_head', 'admin'].includes(role) ||
    desig.includes('department head') ||
    desig.includes('manager') ||
    desig.includes('director') ||
    desig.includes('head') ||
    desig.includes('vp') ||
    desig.includes('vice president') ||
    desig.includes('finance head') ||
    desig.includes('accounts head') ||
    desig.includes('finance manager') ||
    desig.includes('accounts manager')
  ) {
    return 'manager';
  }

  // 4. Team Lead
  if (
    role === 'team_lead' ||
    role === 'tech_lead' ||
    role === 'lead' ||
    desig.includes('team lead') ||
    desig.includes('team leader') ||
    desig.includes('tech lead') ||
    desig.includes('lead')
  ) {
    return 'team_lead';
  }

  // 5. Intern / Trainee
  if (
    role === 'intern' ||
    role === 'trainee' ||
    desig.includes('intern') ||
    desig.includes('trainee') ||
    desig.includes('apprentice')
  ) {
    return 'intern';
  }

  // 6. Regular Employee / Junior / Senior
  return 'employee';
}

/**
 * Get eligible reporting managers based on department and role hierarchy:
 * 1) Intern/Jr/Regular Employee -> Team Leads AND Managers of the SAME department (fallback: CEO/CXO).
 * 2) Team Lead -> Department Manager of the SAME department (fallback: CEO/CXO).
 * 3) Department Manager -> CEO / CXO / Organization Admin.
 */
export function getEligibleReportingManagers({
  targetEmployee,
  selectedDepartmentId,
  selectedDepartmentName,
  allDepartments,
  allEmployees,
}: {
  targetEmployee?: any;
  selectedDepartmentId?: number | string | null;
  selectedDepartmentName?: string | null;
  allDepartments?: any[];
  allEmployees: any[];
}): any[] {
  if (!allEmployees || allEmployees.length === 0) return [];

  const targetId = targetEmployee?.id ? Number(targetEmployee.id) : null;
  const targetRoleCat = getRoleHierarchyCategory(targetEmployee);
  
  const rawDeptId =
    selectedDepartmentId !== undefined && selectedDepartmentId !== null && selectedDepartmentId !== ''
      ? selectedDepartmentId
      : targetEmployee?.currentDepartmentId ??
        targetEmployee?.current_department_id ??
        targetEmployee?.departmentId ??
        targetEmployee?.department_id;
  
  const targetDeptId = rawDeptId ? Number(rawDeptId) : null;

  // Resolve target department name
  let targetDeptName = (
    selectedDepartmentName ||
    targetEmployee?.department ||
    targetEmployee?.departmentName ||
    targetEmployee?.department_name ||
    ''
  ).toLowerCase().trim();

  if (!targetDeptName && targetDeptId && allDepartments && Array.isArray(allDepartments)) {
    const found = allDepartments.find((d: any) => Number(d.id) === targetDeptId);
    if (found?.name) targetDeptName = String(found.name).toLowerCase().trim();
  }

  // Filter out the target employee themselves
  const pool = allEmployees.filter((e: any) => {
    if (targetId && Number(e.id) === targetId) return false;
    return true;
  });

  const getCandDeptId = (e: any): number | null => {
    const val =
      e.currentDepartmentId ??
      e.current_department_id ??
      e.departmentId ??
      e.department_id ??
      (e.department && typeof e.department === 'object' ? e.department.id : null);
    return val !== null && val !== undefined && val !== '' ? Number(val) : null;
  };

  const getCandDeptName = (e: any): string => {
    if (typeof e.department === 'string') return e.department.toLowerCase().trim();
    if (e.department && typeof e.department === 'object' && e.department.name) return e.department.name.toLowerCase().trim();
    if (e.departmentName) return String(e.departmentName).toLowerCase().trim();
    if (e.department_name) return String(e.department_name).toLowerCase().trim();
    if (allDepartments && Array.isArray(allDepartments)) {
      const dId = getCandDeptId(e);
      if (dId) {
        const found = allDepartments.find((d: any) => Number(d.id) === dId);
        if (found?.name) return String(found.name).toLowerCase().trim();
      }
    }
    return '';
  };

  const isSameDept = (e: any): boolean => {
    if (!targetDeptId && !targetDeptName) return true;
    const cId = getCandDeptId(e);
    const cName = getCandDeptName(e);
    if (targetDeptId && cId && targetDeptId === cId) return true;
    if (targetDeptName && cName && (targetDeptName === cName || cName.includes(targetDeptName) || targetDeptName.includes(cName))) return true;
    return false;
  };

  // Find CEOs & CXOs across org
  const ceosAndCxos = pool.filter((e: any) => {
    const cat = getRoleHierarchyCategory(e);
    return cat === 'ceo' || cat === 'cxo';
  });

  // Case 1: Target is CEO -> None
  if (targetRoleCat === 'ceo') {
    return [];
  }

  // Case 2: Target is CXO -> Reports to CEO
  if (targetRoleCat === 'cxo') {
    const ceos = pool.filter((e: any) => getRoleHierarchyCategory(e) === 'ceo');
    return ceos.length > 0 ? ceos : ceosAndCxos;
  }

  // Case 3: Target is Department Manager / Head -> Reports to CXO / CEO
  if (targetRoleCat === 'manager') {
    return ceosAndCxos.length > 0 ? ceosAndCxos : pool.filter((e: any) => getRoleHierarchyCategory(e) === 'ceo');
  }

  // Case 4: Target is Team Lead
  // Must report to Manager / Head of the SAME department
  if (targetRoleCat === 'team_lead') {
    const sameDeptManagers = pool.filter((e: any) => {
      const cat = getRoleHierarchyCategory(e);
      return (cat === 'manager' || cat === 'cxo') && isSameDept(e);
    });

    if (sameDeptManagers.length > 0) {
      return sameDeptManagers;
    }
    // Fallback if no department manager exists yet: CEO / CXO
    return ceosAndCxos;
  }

  // Case 5: Target is Intern, Junior Employee, or regular Employee
  // Show ALL Team Leads AND Department Managers of the SAME department!
  const sameDeptLeaders = pool.filter((e: any) => {
    const cat = getRoleHierarchyCategory(e);
    return (cat === 'team_lead' || cat === 'manager' || cat === 'cxo') && isSameDept(e);
  });

  if (sameDeptLeaders.length > 0) {
    return sameDeptLeaders;
  }

  // Ultimate fallback: CEO / CXO
  return ceosAndCxos;
}

/**
 * Cleanly format the display string for candidate in dropdown
 */
export function formatCandidateLabel(emp: any): string {
  const cat = getRoleHierarchyCategory(emp);
  const title = emp.jobTitle || emp.job_title || emp.designation?.name || emp.designation || emp.designationName || emp.designation_name;

  const catLabel =
    cat === 'ceo'
      ? 'CEO'
      : title
      ? title
      : cat === 'cxo'
      ? 'CXO'
      : cat === 'manager'
      ? 'Department Manager'
      : cat === 'team_lead'
      ? 'Team Lead'
      : 'Member';

  const name = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() || 'Employee';
  const code = emp.employeeCode || emp.employee_code || '';
  const codeStr = code ? ` (${code} - ${catLabel})` : ` - ${catLabel}`;

  return `${name}${codeStr}`;
}
