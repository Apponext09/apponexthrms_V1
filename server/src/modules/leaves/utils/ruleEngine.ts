/**
 * Rule Engine for Leave Module Condition Evaluation
 * Evaluates dynamic condition trees (ALL/ANY, Facts, Operators, Value Types, Nested Groups)
 * against employee facts and database context.
 */

export interface ConditionItem {
  id?: string;
  fact?: string;
  field?: string;
  operator?: string;
  valueType?: 'static' | 'another_fact' | 'duration' | string;
  value?: any;
  durationUnit?: 'days' | 'months' | 'years' | string;
}

export interface ConditionGroup {
  id?: string;
  conjunction?: 'AND' | 'OR' | 'ALL' | 'ANY';
  conditions?: (ConditionItem | ConditionGroup)[];
  rules?: (ConditionItem | ConditionGroup)[];
}

export interface EmployeeFactContext {
  id?: number;
  gender?: string;
  marital_status?: string;
  maritalStatus?: string;
  date_of_joining?: string | Date;
  dateOfJoining?: string | Date;
  date_of_birth?: string | Date;
  dateOfBirth?: string | Date;
  date_of_confirmation?: string | Date;
  dateOfConfirmation?: string | Date;
  confirmation_date?: string | Date;
  confirmationDate?: string | Date;
  resignation_date?: string | Date;
  resignationDate?: string | Date;
  last_working_date?: string | Date;
  lastWorkingDate?: string | Date;
  current_department_id?: number;
  currentDepartmentId?: number;
  department_id?: number;
  departmentId?: number;
  current_location_id?: number;
  currentLocationId?: number;
  location_id?: number;
  locationId?: number;
  branch_id?: number;
  branchId?: number;
  current_grade_id?: number | string;
  currentGradeId?: number | string;
  grade_id?: number | string;
  gradeId?: number | string;
  grade?: string | number;
  current_designation_id?: number;
  currentDesignationId?: number;
  designation_id?: number;
  designationId?: number;
  employment_type?: string;
  employmentType?: string;
  status?: string;
  company_id?: number;
  companyId?: number;
  organization_id?: number;
  organizationId?: number;
  [key: string]: any;
}

/**
 * Extracts a normalized fact value from the employee context
 */
export function extractFactValue(fact: string, employee: EmployeeFactContext): any {
  if (!fact || !employee) return null;
  const f = fact.toLowerCase().replace(/[\s_-]+/g, '');

  switch (f) {
    case 'gender':
      return (employee.gender || '').toLowerCase();
    case 'maritalstatus':
    case 'marital':
      return (employee.marital_status || employee.maritalStatus || employee.marital || '').toLowerCase();
    case 'dateofjoining':
    case 'doj':
    case 'joiningdate':
      return employee.date_of_joining || employee.dateOfJoining || null;
    case 'dateofbirth':
    case 'dob':
    case 'birthdate':
      return employee.date_of_birth || employee.dateOfBirth || null;
    case 'confirmationdate':
    case 'dateofconfirmation':
      return employee.date_of_confirmation || employee.dateOfConfirmation || employee.confirmation_date || employee.confirmationDate || null;
    case 'lastworkingdate':
    case 'lwd':
      return employee.last_working_date || employee.lastWorkingDate || null;
    case 'resignationdate':
      return employee.resignation_date || employee.resignationDate || null;
    case 'tenure':
    case 'tenureyears': {
      const doj = employee.date_of_joining || employee.dateOfJoining;
      if (!doj) return 0;
      const joinDate = new Date(doj);
      const diffMs = Date.now() - joinDate.getTime();
      return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
    }
    case 'tenuremonths': {
      const doj = employee.date_of_joining || employee.dateOfJoining;
      if (!doj) return 0;
      const joinDate = new Date(doj);
      const now = new Date();
      return (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    }
    case 'department':
    case 'departmentid':
      return employee.current_department_id || employee.currentDepartmentId || employee.department_id || employee.departmentId || null;
    case 'location':
    case 'locationid':
      return employee.current_location_id || employee.currentLocationId || employee.location_id || employee.locationId || employee.branch_id || employee.branchId || null;
    case 'grade':
    case 'gradeid':
      return employee.current_grade_id || employee.currentGradeId || employee.grade_id || employee.gradeId || employee.grade || null;
    case 'designation':
    case 'designationid':
      return employee.current_designation_id || employee.currentDesignationId || employee.designation_id || employee.designationId || null;
    case 'employeetype':
    case 'employmenttype':
      return (employee.employment_type || employee.employmentType || '').toLowerCase().replace(/[\s_-]+/g, '');
    case 'status':
      return (employee.status || '').toLowerCase().replace(/[\s_-]+/g, '');
    default:
      return employee[fact] ?? (employee as any)[fact.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] ?? null;
  }
}

/**
 * Compare two values based on the operator
 */
export function compareValues(
  actual: any,
  operator: string,
  target: any,
  valueType: string = 'static',
  durationUnit?: string
): boolean {
  const normOp = (operator || '=').toLowerCase().trim();

  if (['is_empty', 'is_null', 'empty', 'null'].includes(normOp)) {
    return actual === null || actual === undefined || actual === '';
  }
  if (['is_not_empty', 'is_not_null', 'not_empty', 'not_null'].includes(normOp)) {
    return actual !== null && actual !== undefined && actual !== '';
  }

  // Handle duration comparisons for date facts (e.g. Tenure > 2 years, or DOJ > 1 year)
  if (valueType === 'duration' && actual) {
    const num = parseFloat(target);
    if (isNaN(num)) return true;

    let actualDuration = 0;
    if (typeof actual === 'number') {
      actualDuration = actual;
    } else {
      const d = new Date(actual);
      const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (durationUnit === 'days') actualDuration = diffDays;
      else if (durationUnit === 'months') actualDuration = diffDays / 30.44;
      else actualDuration = diffDays / 365.25;
    }

    if (['equals', 'equal', '=', '==', '===', 'is equal to (=)', 'is_equal_to'].includes(normOp)) {
      return Math.abs(actualDuration - num) < 0.1;
    }
    if (['not_equals', 'not_equal', '!=', '!==', 'is not equal to (!=)', 'is_not_equal_to'].includes(normOp)) {
      return Math.abs(actualDuration - num) >= 0.1;
    }
    if (['greater_than', '>', 'is greater than (>)', 'gt'].includes(normOp)) {
      return actualDuration > num;
    }
    if (['greater_than_or_equal', '>=', 'is greater than or equal to (>=)', 'gte'].includes(normOp)) {
      return actualDuration >= num;
    }
    if (['less_than', '<', 'is less than (<)', 'lt'].includes(normOp)) {
      return actualDuration < num;
    }
    if (['less_than_or_equal', '<=', 'is less than or equal to (<=)', 'lte'].includes(normOp)) {
      return actualDuration <= num;
    }
    return true;
  }

  // Handle date comparisons
  if (actual instanceof Date || (typeof actual === 'string' && !isNaN(Date.parse(actual)) && actual.includes('-') && !/^\d+$/.test(actual))) {
    const actualTime = new Date(actual).setHours(0, 0, 0, 0);
    const targetTime = target instanceof Date || (typeof target === 'string' && !isNaN(Date.parse(target)))
      ? new Date(target).setHours(0, 0, 0, 0)
      : null;

    if (targetTime !== null && !isNaN(targetTime)) {
      if (['equals', '=', '==', '===', 'is equal to (=)', 'is_equal_to'].includes(normOp)) return actualTime === targetTime;
      if (['not_equals', '!=', '!==', 'is not equal to (!=)', 'is_not_equal_to'].includes(normOp)) return actualTime !== targetTime;
      if (['greater_than', 'after', '>', 'is greater than (>)', 'gt'].includes(normOp)) return actualTime > targetTime;
      if (['greater_than_or_equal', '>=', 'is greater than or equal to (>=)', 'gte'].includes(normOp)) return actualTime >= targetTime;
      if (['less_than', 'before', '<', 'is less than (<)', 'lt'].includes(normOp)) return actualTime < targetTime;
      if (['less_than_or_equal', '<=', 'is less than or equal to (<=)', 'lte'].includes(normOp)) return actualTime <= targetTime;
    }
  }

  // Numeric comparisons
  const actualNum = parseFloat(actual);
  const targetNum = parseFloat(target);
  if (!isNaN(actualNum) && !isNaN(targetNum) && typeof actual !== 'boolean' && typeof target !== 'boolean') {
    if (['equals', '=', '==', '===', 'is equal to (=)', 'is_equal_to'].includes(normOp)) return actualNum === targetNum;
    if (['not_equals', '!=', '!==', 'is not equal to (!=)', 'is_not_equal_to'].includes(normOp)) return actualNum !== targetNum;
    if (['greater_than', '>', 'is greater than (>)', 'gt'].includes(normOp)) return actualNum > targetNum;
    if (['greater_than_or_equal', '>=', 'is greater than or equal to (>=)', 'gte'].includes(normOp)) return actualNum >= targetNum;
    if (['less_than', '<', 'is less than (<)', 'lt'].includes(normOp)) return actualNum < targetNum;
    if (['less_than_or_equal', '<=', 'is less than or equal to (<=)', 'lte'].includes(normOp)) return actualNum <= targetNum;
  }

  // String / List comparisons (normalized)
  const rawActStr = String(actual ?? '').trim().toLowerCase();
  const rawTgtStr = String(target ?? '').trim().toLowerCase();
  const cleanActStr = rawActStr.replace(/[\s_-]+/g, '');
  const cleanTgtStr = rawTgtStr.replace(/[\s_-]+/g, '');

  if (['equals', '=', '==', '===', 'is equal to (=)', 'is_equal_to'].includes(normOp)) {
    return rawActStr === rawTgtStr || cleanActStr === cleanTgtStr;
  }
  if (['not_equals', '!=', '!==', 'is not equal to (!=)', 'is_not_equal_to'].includes(normOp)) {
    return rawActStr !== rawTgtStr && cleanActStr !== cleanTgtStr;
  }
  if (['contains'].includes(normOp)) {
    return rawActStr.includes(rawTgtStr) || cleanActStr.includes(cleanTgtStr);
  }
  if (['not_contains'].includes(normOp)) {
    return !rawActStr.includes(rawTgtStr) && !cleanActStr.includes(cleanTgtStr);
  }
  if (['starts_with'].includes(normOp)) {
    return rawActStr.startsWith(rawTgtStr) || cleanActStr.startsWith(cleanTgtStr);
  }
  if (['ends_with'].includes(normOp)) {
    return rawActStr.endsWith(rawTgtStr) || cleanActStr.endsWith(cleanTgtStr);
  }
  if (['in_list', 'in', 'in list (comma separated)'].includes(normOp)) {
    if (Array.isArray(target)) {
      return target.map((t) => String(t).trim().toLowerCase().replace(/[\s_-]+/g, '')).includes(cleanActStr);
    }
    const list = rawTgtStr.split(',').map((s) => s.trim().replace(/[\s_-]+/g, ''));
    return list.includes(cleanActStr);
  }
  if (['not_in_list', 'not_in'].includes(normOp)) {
    if (Array.isArray(target)) {
      return !target.map((t) => String(t).trim().toLowerCase().replace(/[\s_-]+/g, '')).includes(cleanActStr);
    }
    const list = rawTgtStr.split(',').map((s) => s.trim().replace(/[\s_-]+/g, ''));
    return !list.includes(cleanActStr);
  }

  return true;
}

/**
 * Recursively evaluate a condition item or nested condition group
 */
export function evaluateCondition(
  item: ConditionItem | ConditionGroup,
  employee: EmployeeFactContext
): boolean {
  if (!item) return true;

  // Check if it's a nested group
  if ('conjunction' in item || 'conditions' in item || 'rules' in item) {
    const group = item as ConditionGroup;
    return evaluateConditionGroup(group, employee);
  }

  const cond = item as ConditionItem;
  const factName = cond.fact || cond.field;
  if (!factName || !cond.operator) {
    return true; // Incomplete condition row is ignored / treated as pass
  }

  const actualValue = extractFactValue(factName, employee);

  let targetValue = cond.value;
  if (cond.valueType === 'another_fact' && typeof cond.value === 'string') {
    targetValue = extractFactValue(cond.value, employee);
  }

  return compareValues(actualValue, cond.operator, targetValue, cond.valueType, cond.durationUnit);
}

/**
 * Evaluate an entire Condition Group (Root or Nested)
 */
export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  employee: EmployeeFactContext
): boolean {
  if (!group) return true;

  const rawConditions = group.conditions || group.rules;
  if (!rawConditions || !Array.isArray(rawConditions) || rawConditions.length === 0) {
    return true; // Empty rule engine means "Always Applies"
  }

  const conj = (group.conjunction || 'AND').toUpperCase();
  const isOr = conj === 'OR' || conj === 'ANY';

  // Filter out completely blank conditions
  const validConditions = rawConditions.filter((c: any) => {
    if ('conjunction' in c || 'conditions' in c || 'rules' in c) return true;
    return (c.fact || c.field) && c.operator;
  });

  if (validConditions.length === 0) return true;

  if (isOr) {
    return validConditions.some((c) => evaluateCondition(c, employee));
  } else {
    return validConditions.every((c) => evaluateCondition(c, employee));
  }
}

