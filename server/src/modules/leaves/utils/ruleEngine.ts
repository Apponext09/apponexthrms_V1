/**
 * Rule Engine for Leave Module Condition Evaluation
 * Evaluates dynamic condition trees (ALL/ANY, Facts, Operators, Value Types, Nested Groups)
 * against employee facts and database context.
 */

export interface ConditionItem {
  id?: string;
  fact?: string;
  operator?: string;
  valueType?: 'static' | 'another_fact' | 'duration' | string;
  value?: any;
  durationUnit?: 'days' | 'months' | 'years' | string;
}

export interface ConditionGroup {
  id?: string;
  conjunction?: 'AND' | 'OR' | 'ALL' | 'ANY';
  conditions?: (ConditionItem | ConditionGroup)[];
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
  confirmation_date?: string | Date;
  confirmationDate?: string | Date;
  resignation_date?: string | Date;
  resignationDate?: string | Date;
  last_working_date?: string | Date;
  lastWorkingDate?: string | Date;
  current_department_id?: number;
  currentDepartmentId?: number;
  current_location_id?: number;
  currentLocationId?: number;
  current_grade_id?: number | string;
  currentGradeId?: number | string;
  employment_type?: string;
  employmentType?: string;
  status?: string;
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
      return (employee.marital_status || employee.maritalStatus || '').toLowerCase();
    case 'dateofjoining':
    case 'doj':
    case 'joiningdate':
      return employee.date_of_joining || employee.dateOfJoining || null;
    case 'dateofbirth':
    case 'dob':
    case 'birthdate':
      return employee.date_of_birth || employee.dateOfBirth || null;
    case 'confirmationdate':
      return employee.confirmation_date || employee.confirmationDate || null;
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
      return employee.current_department_id || employee.currentDepartmentId || null;
    case 'location':
    case 'locationid':
      return employee.current_location_id || employee.currentLocationId || null;
    case 'grade':
    case 'gradeid':
      return employee.current_grade_id || employee.currentGradeId || null;
    case 'employeetype':
    case 'employmenttype':
      return (employee.employment_type || employee.employmentType || '').toLowerCase();
    case 'status':
      return (employee.status || '').toLowerCase();
    default:
      return employee[fact] ?? null;
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
  if (operator === 'is_empty' || operator === 'is_null') {
    return actual === null || actual === undefined || actual === '';
  }
  if (operator === 'is_not_empty' || operator === 'is_not_null') {
    return actual !== null && actual !== undefined && actual !== '';
  }

  // Handle duration comparisons for date facts (e.g. Tenure > 2 years, or DOJ > 1 year)
  if (valueType === 'duration' && actual) {
    const num = parseFloat(target);
    if (isNaN(num)) return true;

    let actualDuration = 0;
    if (typeof actual === 'number') {
      actualDuration = actual; // Already tenure in years or months
    } else {
      // It's a date string/Date
      const d = new Date(actual);
      const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (durationUnit === 'days') actualDuration = diffDays;
      else if (durationUnit === 'months') actualDuration = diffDays / 30.44;
      else actualDuration = diffDays / 365.25; // default years
    }

    switch (operator) {
      case 'equals':
      case 'equal':
      case '=':
      case '==':
        return Math.abs(actualDuration - num) < 0.1;
      case 'not_equals':
      case '!=':
        return Math.abs(actualDuration - num) >= 0.1;
      case 'greater_than':
      case '>':
        return actualDuration > num;
      case 'greater_than_or_equal':
      case '>=':
        return actualDuration >= num;
      case 'less_than':
      case '<':
        return actualDuration < num;
      case 'less_than_or_equal':
      case '<=':
        return actualDuration <= num;
      default:
        return true;
    }
  }

  // Handle date comparisons
  if (actual instanceof Date || (typeof actual === 'string' && !isNaN(Date.parse(actual)) && actual.includes('-'))) {
    const actualTime = new Date(actual).setHours(0, 0, 0, 0);
    const targetTime = target instanceof Date || (typeof target === 'string' && !isNaN(Date.parse(target)))
      ? new Date(target).setHours(0, 0, 0, 0)
      : null;

    if (targetTime !== null) {
      switch (operator) {
        case 'equals':
        case '=':
        case '==':
          return actualTime === targetTime;
        case 'not_equals':
        case '!=':
          return actualTime !== targetTime;
        case 'greater_than':
        case 'after':
        case '>':
          return actualTime > targetTime;
        case 'greater_than_or_equal':
        case '>=':
          return actualTime >= targetTime;
        case 'less_than':
        case 'before':
        case '<':
          return actualTime < targetTime;
        case 'less_than_or_equal':
        case '<=':
          return actualTime <= targetTime;
      }
    }
  }

  // Numeric comparisons
  const actualNum = parseFloat(actual);
  const targetNum = parseFloat(target);
  if (!isNaN(actualNum) && !isNaN(targetNum)) {
    switch (operator) {
      case 'equals':
      case '=':
      case '==':
        return actualNum === targetNum;
      case 'not_equals':
      case '!=':
        return actualNum !== targetNum;
      case 'greater_than':
      case '>':
        return actualNum > targetNum;
      case 'greater_than_or_equal':
      case '>=':
        return actualNum >= targetNum;
      case 'less_than':
      case '<':
        return actualNum < targetNum;
      case 'less_than_or_equal':
      case '<=':
        return actualNum <= targetNum;
    }
  }

  // String / List comparisons
  const actStr = String(actual ?? '').trim().toLowerCase();
  const tgtStr = String(target ?? '').trim().toLowerCase();

  switch (operator) {
    case 'equals':
    case '=':
    case '==':
      return actStr === tgtStr;
    case 'not_equals':
    case '!=':
      return actStr !== tgtStr;
    case 'contains':
      return actStr.includes(tgtStr);
    case 'not_contains':
      return !actStr.includes(tgtStr);
    case 'starts_with':
      return actStr.startsWith(tgtStr);
    case 'ends_with':
      return actStr.endsWith(tgtStr);
    case 'in_list':
    case 'in': {
      if (Array.isArray(target)) {
        return target.map((t) => String(t).trim().toLowerCase()).includes(actStr);
      }
      const list = tgtStr.split(',').map((s) => s.trim());
      return list.includes(actStr);
    }
    case 'not_in_list':
    case 'not_in': {
      if (Array.isArray(target)) {
        return !target.map((t) => String(t).trim().toLowerCase()).includes(actStr);
      }
      const list = tgtStr.split(',').map((s) => s.trim());
      return !list.includes(actStr);
    }
    default:
      return true;
  }
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
  if ('conjunction' in item || 'conditions' in item) {
    const group = item as ConditionGroup;
    return evaluateConditionGroup(group, employee);
  }

  const cond = item as ConditionItem;
  if (!cond.fact || !cond.operator) {
    return true; // Incomplete condition row is ignored / treated as pass
  }

  const actualValue = extractFactValue(cond.fact, employee);

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
  if (!group || !group.conditions || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return true; // Empty rule engine means "Always Applies"
  }

  const conj = (group.conjunction || 'AND').toUpperCase();
  const isOr = conj === 'OR' || conj === 'ANY';

  // Filter out completely blank conditions
  const validConditions = group.conditions.filter((c: any) => {
    if ('conjunction' in c || 'conditions' in c) return true;
    return c.fact && c.operator;
  });

  if (validConditions.length === 0) return true;

  if (isOr) {
    return validConditions.some((c) => evaluateCondition(c, employee));
  } else {
    return validConditions.every((c) => evaluateCondition(c, employee));
  }
}
