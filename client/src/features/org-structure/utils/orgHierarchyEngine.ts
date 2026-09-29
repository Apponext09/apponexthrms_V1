import type { HierarchyRule, ValidationResult } from '../types/orgHierarchy';

// Default Configurable Hierarchy Rules
export const DEFAULT_HIERARCHY_RULES: HierarchyRule[] = [
  {
    id: 'rule-ceo',
    designationOrRole: 'CEO',
    allowedParentDesignations: [],
    hierarchyLevel: 1,
  },
  {
    id: 'rule-cxo',
    designationOrRole: 'CXO', // COO, CTO, CFO
    allowedParentDesignations: ['CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 2,
  },
  {
    id: 'rule-coo',
    designationOrRole: 'COO',
    allowedParentDesignations: ['CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 2,
  },
  {
    id: 'rule-cto',
    designationOrRole: 'CTO',
    allowedParentDesignations: ['CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 2,
  },
  {
    id: 'rule-cfo',
    designationOrRole: 'CFO',
    allowedParentDesignations: ['CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 2,
  },
  {
    id: 'rule-it-head',
    designationOrRole: 'IT Head',
    allowedParentDesignations: ['CTO', 'CEO', 'COO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
  {
    id: 'rule-pm',
    designationOrRole: 'Project Manager',
    allowedParentDesignations: ['IT Head', 'Department Manager', 'Department Head', 'HR Manager', 'Finance Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 4,
  },
  {
    id: 'rule-tl',
    designationOrRole: 'Team Leader',
    allowedParentDesignations: ['Project Manager', 'Department Manager', 'IT Head', 'Department Head', 'Manager', 'HR Manager', 'Finance Manager', 'Organization Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 5,
  },
  {
    id: 'rule-employee',
    designationOrRole: 'Employee',
    allowedParentDesignations: ['Team Leader'],
    hierarchyLevel: 6,
  },
  {
    id: 'rule-intern',
    designationOrRole: 'Intern',
    allowedParentDesignations: ['Employee', 'HR Executive', 'Accountant'],
    hierarchyLevel: 7,
  },
  {
    id: 'rule-dept-head',
    designationOrRole: 'Department Head',
    allowedParentDesignations: ['CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
  {
    id: 'rule-dept-mgr',
    designationOrRole: 'Department Manager',
    allowedParentDesignations: ['Department Head', 'IT Head', 'HR Manager', 'Finance Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
  {
    id: 'rule-mgr',
    designationOrRole: 'Manager',
    allowedParentDesignations: ['Department Head', 'IT Head', 'HR Manager', 'Finance Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
  {
    id: 'rule-hr-mgr',
    designationOrRole: 'HR Manager',
    allowedParentDesignations: ['CEO', 'COO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
  {
    id: 'rule-hr-exec',
    designationOrRole: 'HR Executive',
    allowedParentDesignations: ['HR Manager', 'Department Manager', 'Department Head', 'COO', 'CEO'],
    hierarchyLevel: 4,
  },
  {
    id: 'rule-fin-mgr',
    designationOrRole: 'Finance Manager',
    allowedParentDesignations: ['CFO', 'CEO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
  {
    id: 'rule-accountant',
    designationOrRole: 'Accountant',
    allowedParentDesignations: ['Finance Manager', 'Department Manager', 'Department Head', 'CFO', 'CEO'],
    hierarchyLevel: 4,
  },
  {
    id: 'rule-org-mgr',
    designationOrRole: 'Organization Manager',
    allowedParentDesignations: ['CEO', 'COO', 'ORGANIZATION ADMIN'],
    hierarchyLevel: 3,
  },
];

export function normalizeDeptName(name?: string): string {
  if (!name) return '';
  let norm = name.toLowerCase().trim();
  norm = norm.replace(/\s+department$/i, '').trim();
  if (norm === 'it' || norm === 'information technology' || norm === 'tech') return 'it';
  if (norm === 'hr' || norm === 'human resources' || norm === 'human resource') return 'hr';
  if (norm === 'finance' || norm === 'accounts' || norm === 'accounting') return 'finance';
  return norm;
}

/**
 * Normalizes title / designation / accessRole to standard key
 */
export function normalizePositionKey(designation?: string, accessRole?: string): string {
  const role = (accessRole || '').toLowerCase().trim();
  const desig = (designation || '').toLowerCase().trim();

  if (role === 'coo' || desig.includes('coo') || desig.includes('chief operating officer')) return 'COO';
  if (role === 'cto' || desig.includes('cto') || desig.includes('chief technology officer')) return 'CTO';
  if (role === 'cfo' || desig.includes('cfo') || desig.includes('chief financial officer')) return 'CFO';
  if (role === 'cxo' || role === 'ceo' || desig.includes('ceo') || desig.includes('chief executive')) return 'CEO';

  if (desig.includes('it head') || desig.includes('head of it') || (role === 'department_head' && desig.includes('it'))) return 'IT Head';
  if (desig.includes('hr manager') || (role === 'hr_manager' && !desig.includes('executive'))) return 'HR Manager';
  if (desig.includes('hr executive')) return 'HR Executive';
  if (desig.includes('finance manager')) return 'Finance Manager';
  if (desig.includes('accountant') || desig.includes('account')) return 'Accountant';
  if (desig.includes('organization manager') || desig.includes('org manager')) return 'Organization Manager';

  if (desig.includes('dept head') || desig.includes('department head') || desig.includes('head of department') || desig.includes('vp') || desig.includes('vice president') || desig.includes('director')) return 'Department Head';
  if (desig.includes('project manager') || desig.includes('product manager') || desig.includes('engineering manager') || desig.includes('pm')) return 'Project Manager';
  if (role === 'department_head' || desig.includes('manager') || desig.includes('head')) return 'Department Manager';

  if (role === 'team_lead' || desig.includes('team lead') || desig.includes('team leader') || desig.includes('tech lead') || desig.includes('lead engineer') || desig.includes('module lead')) return 'Team Leader';
  if (role === 'intern' || desig.includes('intern') || desig.includes('trainee') || desig.includes('apprentice')) return 'Intern';

  return 'Employee';
}

/**
 * Check if target node is a descendant of source node (prevents circular reporting)
 */
export function isDescendantNode(sourceEmpId: number | string, targetEmpId: number | string, allEmployees: any[]): boolean {
  const srcId = Number(sourceEmpId);
  const tgtId = Number(targetEmpId);
  if (srcId === tgtId) return true;

  const empMap = new Map<number, any>();
  allEmployees.forEach((e) => {
    if (e.id) empMap.set(Number(e.id), e);
  });

  let curr = empMap.get(tgtId);
  const visited = new Set<number>();

  while (curr) {
    const parentId = curr.reportingManagerId !== undefined ? curr.reportingManagerId : curr.reporting_manager_id;
    if (!parentId) break;

    const numParentId = Number(parentId);
    if (numParentId === srcId) {
      return true;
    }
    if (visited.has(numParentId)) break;
    visited.add(numParentId);
    curr = empMap.get(numParentId);
  }

  return false;
}

/**
 * Validate drag and drop move attempt
 */
export function validateDragAndDrop(
  sourceEmp: any,
  targetNode: any, // Target employee or Department node
  customRules: HierarchyRule[] = DEFAULT_HIERARCHY_RULES,
  allEmployees: any[] = []
): ValidationResult {
  if (!sourceEmp) {
    return { isValid: false, errorTitle: 'Invalid Move', errorMessage: 'Source employee selection is invalid.' };
  }

  const sourcePos = normalizePositionKey(sourceEmp.designation || sourceEmp.jobTitle, sourceEmp.accessRole);

  // 1. Department Node Restriction
  if (targetNode?.isDepartmentNode || targetNode?.nodeType === 'department') {
    if (sourcePos === 'Employee') {
      return {
        isValid: false,
        errorTitle: 'Invalid Reporting Structure',
        errorMessage: 'This Employee cannot be assigned to the selected position. Employees can only report directly to a Team Leader.',
      };
    }
    if (sourcePos === 'Intern') {
      return {
        isValid: false,
        errorTitle: 'Invalid Reporting Structure',
        errorMessage: 'This Intern cannot be assigned to the selected position. Interns can only report directly to an Employee.',
      };
    }
    return {
      isValid: false,
      errorTitle: 'Invalid Assignment',
      errorMessage:
        'Employees cannot be assigned directly to a Department. Please select the appropriate reporting position according to the configured organization hierarchy.',
    };
  }

  const targetEmp = targetNode?.originalEmp || targetNode?.emp || targetNode;
  const targetIsAdmin = Boolean(targetNode?.isAdmin || targetEmp?.id === 999999);

  // 2. Self Assignment
  if (sourceEmp.id && targetEmp?.id && Number(sourceEmp.id) === Number(targetEmp.id)) {
    return {
      isValid: false,
      errorTitle: 'Invalid Move',
      errorMessage: 'An employee cannot be assigned as their own reporting manager.',
    };
  }

  // 3. Circular Dependency / Descendant Check
  if (sourceEmp.id && targetEmp?.id && isDescendantNode(sourceEmp.id, targetEmp.id, allEmployees)) {
    return {
      isValid: false,
      errorTitle: 'Circular Hierarchy Error',
      errorMessage: `Cannot assign ${sourceEmp.firstName || 'employee'} ${sourceEmp.lastName || ''} under ${targetEmp.firstName || 'manager'} ${targetEmp.lastName || ''} because ${targetEmp.firstName || 'manager'} is a sub-report of ${sourceEmp.firstName || 'employee'}.`,
    };
  }

  // 4. Target is Organization Admin / CEO
  if (targetIsAdmin) {
    if (sourcePos === 'CEO') {
      return { isValid: true };
    }
    const rule = customRules.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase()) ||
      DEFAULT_HIERARCHY_RULES.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase());
    const allowsAdmin = rule?.allowedParentDesignations.some((parent) =>
      ['ceo', 'organization admin'].includes(parent.toLowerCase()),
    );
    if (allowsAdmin) return { isValid: true };
    return {
      isValid: false,
      errorTitle: 'Invalid Reporting Structure',
      errorMessage: `${sourcePos}s cannot report directly to Organization Admin. According to the organization hierarchy, please select the appropriate manager level.`,
    };
  }

  const targetPos = normalizePositionKey(targetEmp?.designation || targetEmp?.jobTitle, targetEmp?.accessRole);

  // 5. Department Boundary Validation (Same Department Reporting Only for non-executives)
  const isExecutiveRole = (pos: string) => ['CEO', 'COO', 'CTO', 'CFO', 'ORGANIZATION ADMIN'].includes(pos.toUpperCase());

  if (!isExecutiveRole(sourcePos) && !isExecutiveRole(targetPos) && targetEmp) {
    const srcDeptId = sourceEmp.currentDepartmentId || sourceEmp.departmentId || (sourceEmp as any).current_department_id || (sourceEmp as any).department_id;
    const tgtDeptId = targetEmp.currentDepartmentId || targetEmp.departmentId || (targetEmp as any).current_department_id || (targetEmp as any).department_id;
    const srcDeptName = (sourceEmp.department || (sourceEmp as any).departmentName || (sourceEmp as any).department_name || '').toLowerCase().trim();
    const tgtDeptName = (targetEmp.department || (targetEmp as any).departmentName || (targetEmp as any).department_name || '').toLowerCase().trim();

    let hasDeptMismatch = false;

    if (srcDeptId && tgtDeptId) {
      hasDeptMismatch = String(srcDeptId) !== String(tgtDeptId);
    } else if (srcDeptName && tgtDeptName) {
      const normSrc = normalizeDeptName(srcDeptName);
      const normTgt = normalizeDeptName(tgtDeptName);
      if (normSrc && normTgt) {
        hasDeptMismatch = normSrc !== normTgt;
      }
    }

    if (hasDeptMismatch) {
      const srcDeptDisp = sourceEmp.department || 'their department';
      const tgtDeptDisp = targetEmp.department || 'another department';
      return {
        isValid: false,
        errorTitle: 'Department Mismatch Error',
        errorMessage: `Cannot assign ${sourceEmp.firstName || 'Employee'} (${srcDeptDisp}) under ${targetEmp.firstName || 'Manager'} (${tgtDeptDisp}). Drag-and-drop reporting is allowed only within the same department.`,
      };
    }
  }

  // 6. Find Rule for Other Source Positions
  const rule = customRules.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase()) ||
    DEFAULT_HIERARCHY_RULES.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase());

  const allowedParents = rule?.allowedParentDesignations || [];
  const isMatch = allowedParents.some((p) => p.toLowerCase() === targetPos.toLowerCase());

  if (!isMatch) {
    const expectedStr = allowedParents.join(' or ') || 'its immediate manager';
    return {
      isValid: false,
      errorTitle: 'Invalid Reporting Structure',
      errorMessage: `${sourcePos}s can report only to ${expectedStr}. Assigned position (${targetPos}) is not valid under the configured hierarchy.`,
    };
  }

  return { isValid: true };
}
