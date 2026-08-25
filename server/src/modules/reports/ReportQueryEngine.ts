import { getKnex } from '../../db/knex';
import { FIELD_REGISTRY, getFieldByKey, type ModuleType, type FieldDef } from './fieldRegistry';

export interface CustomCondition {
  fieldKey: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'starts_with'
    | 'greater_than'
    | 'less_than'
    | 'greater_than_or_equal'
    | 'less_than_or_equal'
    | 'is_empty'
    | 'is_not_empty';
  value?: any;
}

export interface RunReportParams {
  module: ModuleType;
  fields: string[];        // field keys from registry
  filters: {
    fromDate?: string;
    toDate?: string;
    departments?: (string | number)[];
    employees?: (string | number)[];
    companies?: (string | number)[];
    companyId?: string | number;
    locations?: (string | number)[];
    leaveTypes?: (string | number)[];
    status?: string;
    minSalary?: number | string;
    maxSalary?: number | string;
    employmentType?: string;
    gender?: string;
    customConditions?: CustomCondition[];
    [key: string]: any;
  };
  limit?: number;
  organizationId: number;
  companyId?: number | null;
}

/**
 * Determines which JOINs are needed based on selected fields and filters.
 */
function buildJoins(db: any, baseTable: string, requiredJoins: Set<string>) {
  const alias = baseTable.includes(' as ') ? baseTable.split(' as ')[1].trim() : baseTable.trim();
  let q = db(baseTable);

  const joinsApplied = new Set<string>();
  joinsApplied.add(alias);

  if (alias === 'e') {
    joinsApplied.add('employees');
  }

  // Ensure employees table is joined if base table is not employees
  if ((requiredJoins.has('employees') || requiredJoins.has('departments') || requiredJoins.has('designations')) && !joinsApplied.has('employees') && alias !== 'e') {
    q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
    joinsApplied.add('employees');
  }

  if (requiredJoins.has('departments') && !joinsApplied.has('departments')) {
    q = q.leftJoin('departments as d', 'd.id', 'e.current_department_id');
    joinsApplied.add('departments');
  }

  if (requiredJoins.has('designations') && !joinsApplied.has('designations')) {
    q = q.leftJoin('designations as des', 'des.id', 'e.current_designation_id');
    joinsApplied.add('designations');
  }

  if (requiredJoins.has('company') && !joinsApplied.has('company')) {
    q = q.leftJoin('company as mc', 'mc.company_id', 'e.company_id');
    joinsApplied.add('company');
  }

  if (requiredJoins.has('locations') && !joinsApplied.has('locations')) {
    q = q.leftJoin('locations as loc', 'loc.id', 'e.current_location_id');
    joinsApplied.add('locations');
  }

  if (requiredJoins.has('location_in') && !joinsApplied.has('location_in')) {
    q = q.leftJoin('locations as loc_in', 'loc_in.id', `${alias}.check_in_location_id`);
    joinsApplied.add('location_in');
  }

  if (requiredJoins.has('location_out') && !joinsApplied.has('location_out')) {
    q = q.leftJoin('locations as loc_out', 'loc_out.id', `${alias}.check_out_location_id`);
    joinsApplied.add('location_out');
  }

  if (requiredJoins.has('attendance_records') && !joinsApplied.has('attendance_records') && alias !== 'ar') {
    q = q.leftJoin('attendance_records as ar', 'ar.employee_id', 'e.id');
    joinsApplied.add('attendance_records');
  }

  if (requiredJoins.has('attendance_regularizations') && !joinsApplied.has('attendance_regularizations') && alias !== 'areg') {
    q = q.leftJoin('attendance_regularizations as areg', 'areg.employee_id', 'e.id');
    joinsApplied.add('attendance_regularizations');
  }

  if (requiredJoins.has('attendance_breaks') && !joinsApplied.has('attendance_breaks') && alias !== 'ab') {
    if (!joinsApplied.has('attendance_records') && alias !== 'ar') {
      q = q.leftJoin('attendance_records as ar', 'ar.employee_id', 'e.id');
      joinsApplied.add('attendance_records');
    }
    q = q.leftJoin('attendance_breaks as ab', 'ab.attendance_record_id', 'ar.id');
    joinsApplied.add('attendance_breaks');
  }

  if (requiredJoins.has('leave_applications') && !joinsApplied.has('leave_applications') && alias !== 'la') {
    q = q.leftJoin('leave_applications as la', 'la.employee_id', 'e.id');
    joinsApplied.add('leave_applications');
  }

  if (requiredJoins.has('leave_types') && !joinsApplied.has('leave_types')) {
    q = q.leftJoin('leave_types as lt', 'lt.id', 'la.leave_type_id');
    joinsApplied.add('leave_types');
  }

  if (requiredJoins.has('leave_balances') && !joinsApplied.has('leave_balances') && alias !== 'lb') {
    q = q.leftJoin('leave_balances as lb', 'lb.employee_id', 'e.id');
    joinsApplied.add('leave_balances');
  }

  if (requiredJoins.has('leave_encashments') && !joinsApplied.has('leave_encashments') && alias !== 'le') {
    q = q.leftJoin('leave_encashments as le', 'le.employee_id', 'e.id');
    joinsApplied.add('leave_encashments');
  }

  if (requiredJoins.has('payslips') && !joinsApplied.has('payslips') && alias !== 'pp') {
    q = q.leftJoin('payslips as pp', 'pp.employee_id', 'e.id');
    joinsApplied.add('payslips');
  }

  if (requiredJoins.has('employee_loans') && !joinsApplied.has('employee_loans') && alias !== 'el') {
    q = q.leftJoin('employee_loans as el', 'el.employee_id', 'e.id');
    joinsApplied.add('employee_loans');
  }

  if (requiredJoins.has('assets') && !joinsApplied.has('assets') && alias !== 'ast') {
    if (!joinsApplied.has('asset_assignments')) {
      q = q.leftJoin('asset_assignments as aa', 'aa.employee_id', 'e.id');
      joinsApplied.add('asset_assignments');
    }
    q = q.leftJoin('assets as ast', 'ast.id', 'aa.asset_id');
    joinsApplied.add('assets');
  }

  if (requiredJoins.has('comp_off_balances') && !joinsApplied.has('comp_off_balances') && alias !== 'cob') {
    q = q.leftJoin('comp_off_balances as cob', 'cob.employee_id', 'e.id');
    joinsApplied.add('comp_off_balances');
  }

  return { query: q, joinsApplied, alias };
}

/**
 * Main Report Query Engine.
 */
export async function runDynamicReport(params: RunReportParams): Promise<{
  columns: Array<{ key: string; label: string; type: string; isSensitive?: boolean }>;
  rows: Record<string, any>[];
  total: number;
}> {
  const db = getKnex();
  const limit = Math.min(params.limit ?? 1000, 5000);

  // ── Resolve field definitions ─────────────────────────────────────────────
  const fieldDefs: FieldDef[] = params.fields
    .map(getFieldByKey)
    .filter(Boolean) as FieldDef[];

  if (fieldDefs.length === 0) {
    return { columns: [], rows: [], total: 0 };
  }

  // ── Collect required JOINs from fields & custom conditions ───────────────
  const requiredJoins = new Set<string>();
  for (const f of fieldDefs) {
    f.requiredJoins.forEach((j) => requiredJoins.add(j));
  }

  const filters = params.filters || {};
  if (filters.departments && filters.departments.length > 0) requiredJoins.add('departments');
  if (filters.locations && filters.locations.length > 0) requiredJoins.add('locations');
  if (filters.leaveTypes && filters.leaveTypes.length > 0) requiredJoins.add('leave_types');
  if (filters.gender || filters.employmentType) requiredJoins.add('employees');

  if (filters.customConditions && Array.isArray(filters.customConditions)) {
    for (const cond of filters.customConditions) {
      const fDef = getFieldByKey(cond.fieldKey);
      if (fDef) {
        fDef.requiredJoins.forEach((j) => requiredJoins.add(j));
      }
    }
  }

  // ── Determine base table by module ────────────────────────────────────────
  const moduleBaseTable: Record<ModuleType, string> = {
    all:         'employees as e',
    attendance:  'attendance_records as ar',
    leave:       'leave_applications as la',
    payroll:     'payslips as pp',
    employee:    'employees as e',
    recruitment: 'candidates as mc',
  };

  const baseTable = moduleBaseTable[params.module] || 'employees as e';

  // ── Build query ───────────────────────────────────────────────────────────
  let { query: q, joinsApplied, alias } = buildJoins(db, baseTable, requiredJoins);

  // ── Build SELECT columns ──────────────────────────────────────────────────
  const selectClauses = fieldDefs.map((f) => `${f.sqlExpr} as \`${f.key}\``);
  q = q.select(db.raw(selectClauses.join(', ')));

  // ── Apply organization isolation ──────────────────────────────────────────
  if (alias === 'ar') {
    q = q.where('ar.organization_id', params.organizationId);
  } else if (alias === 'la') {
    q = q.where('la.organization_id', params.organizationId);
    q = q.whereNull('la.deleted_at');
  } else if (alias === 'pp') {
    q = q.where('pp.organization_id', params.organizationId);
  } else {
    q = q.where('e.organization_id', params.organizationId);
    q = q.whereNull('e.deleted_at');
  }

  // ── Apply explicit company filter if requested ────────────────────────────
  const explicitCompany = filters.companyId || (filters.companies && filters.companies.length > 0 ? filters.companies[0] : null);

  if (explicitCompany) {
    if (alias === 'ar') {
      q = q.where('ar.company_id', explicitCompany);
    } else {
      if (!joinsApplied.has('employees') && alias !== 'e') {
        q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
        joinsApplied.add('employees');
      }
      q = q.where('e.company_id', explicitCompany);
    }
  }

  // ── Apply standard filters ────────────────────────────────────────────────
  const { fromDate, toDate, departments, employees, locations, leaveTypes, status, minSalary, maxSalary, gender, employmentType } = filters;

  // Determine dynamic date column based on selected joins & module
  let dateCol: string | null = null;
  if (params.module === 'attendance' || requiredJoins.has('attendance_records')) {
    dateCol = 'ar.check_in_date';
  } else if (params.module === 'leave' || requiredJoins.has('leave_applications')) {
    dateCol = 'la.application_start_date';
  } else if (params.module === 'payroll' || requiredJoins.has('payslips')) {
    dateCol = 'pp.payslip_month';
  } else if (requiredJoins.has('attendance_regularizations')) {
    dateCol = 'areg.request_date';
  } else {
    dateCol = 'e.date_of_joining';
  }

  // Date range filters
  if (fromDate && dateCol) {
    q = q.where(db.raw(dateCol), '>=', fromDate);
  }

  if (toDate && dateCol) {
    q = q.where(db.raw(dateCol), '<=', toDate);
  }

  // Department filter
  if (departments && Array.isArray(departments) && departments.length > 0) {
    if (!joinsApplied.has('employees') && alias !== 'e') {
      q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
      joinsApplied.add('employees');
    }
    q = q.whereIn('e.current_department_id', departments);
  }

  // Employee filter
  if (employees && Array.isArray(employees) && employees.length > 0) {
    const empCol = alias === 'e' ? 'e.id' : `${alias}.employee_id`;
    q = q.whereIn(empCol, employees);
  }

  // Location filter
  if (locations && Array.isArray(locations) && locations.length > 0) {
    if (!joinsApplied.has('employees') && alias !== 'e') {
      q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
      joinsApplied.add('employees');
    }
    q = q.whereIn('e.current_location_id', locations);
  }

  // Leave types filter
  if (leaveTypes && Array.isArray(leaveTypes) && leaveTypes.length > 0) {
    if (!joinsApplied.has('leave_applications') && alias !== 'la') {
      q = q.leftJoin('leave_applications as la', 'la.employee_id', 'e.id');
      joinsApplied.add('leave_applications');
    }
    q = q.whereIn('la.leave_type_id', leaveTypes);
  }

  // Status filter
  if (status && status !== 'both' && status !== 'choose' && status !== '' && status !== 'all') {
    if (['present', 'absent', 'half_day', 'week_off'].includes(status)) {
      if (!joinsApplied.has('attendance_records') && alias !== 'ar') {
        q = q.leftJoin('attendance_records as ar', 'ar.employee_id', 'e.id');
        joinsApplied.add('attendance_records');
      }
      q = q.where('ar.status', status);
    } else if (['approved', 'pending', 'rejected'].includes(status)) {
      if (!joinsApplied.has('leave_applications') && alias !== 'la') {
        q = q.leftJoin('leave_applications as la', 'la.employee_id', 'e.id');
        joinsApplied.add('leave_applications');
      }
      q = q.where('la.status', status);
    } else if (['active', 'inactive'].includes(status)) {
      if (!joinsApplied.has('employees') && alias !== 'e') {
        q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
        joinsApplied.add('employees');
      }
      q = q.where('e.status', status);
    } else if (['processed', 'draft', 'paid', 'locked'].includes(status)) {
      if (!joinsApplied.has('payslips') && alias !== 'pp') {
        q = q.leftJoin('payslips as pp', 'pp.employee_id', 'e.id');
        joinsApplied.add('payslips');
      }
      q = q.where('pp.is_locked', status === 'locked' || status === 'processed' ? 1 : 0);
    }
  }

  // Min / Max salary filter (payroll)
  if (minSalary !== undefined && minSalary !== '') {
    if (!joinsApplied.has('payslips') && alias !== 'pp') {
      q = q.leftJoin('payslips as pp', 'pp.employee_id', 'e.id');
      joinsApplied.add('payslips');
    }
    q = q.where('pp.net_salary', '>=', Number(minSalary));
  }
  if (maxSalary !== undefined && maxSalary !== '') {
    if (!joinsApplied.has('payslips') && alias !== 'pp') {
      q = q.leftJoin('payslips as pp', 'pp.employee_id', 'e.id');
      joinsApplied.add('payslips');
    }
    q = q.where('pp.net_salary', '<=', Number(maxSalary));
  }

  // Gender filter
  if (gender && gender !== 'all') {
    if (!joinsApplied.has('employees') && alias !== 'e') {
      q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
      joinsApplied.add('employees');
    }
    q = q.where('e.gender', gender);
  }

  // Employment type filter
  if (employmentType && employmentType !== 'all') {
    if (!joinsApplied.has('employees') && alias !== 'e') {
      q = q.leftJoin('employees as e', 'e.id', `${alias}.employee_id`);
      joinsApplied.add('employees');
    }
    q = q.where('e.employment_type', employmentType);
  }

  // ── Apply custom conditions ───────────────────────────────────────────────
  if (filters.customConditions && Array.isArray(filters.customConditions)) {
    for (const cond of filters.customConditions) {
      if (!cond.fieldKey || !cond.operator) continue;
      const fDef = getFieldByKey(cond.fieldKey);
      if (!fDef) continue;

      const expr = db.raw(fDef.sqlExpr);
      const val = cond.value;

      switch (cond.operator) {
        case 'equals':
          q = q.where(expr, val);
          break;
        case 'not_equals':
          q = q.where(expr, '!=', val);
          break;
        case 'contains':
          q = q.where(expr, 'like', `%${val}%`);
          break;
        case 'starts_with':
          q = q.where(expr, 'like', `${val}%`);
          break;
        case 'greater_than':
          q = q.where(expr, '>', val);
          break;
        case 'less_than':
          q = q.where(expr, '<', val);
          break;
        case 'greater_than_or_equal':
          q = q.where(expr, '>=', val);
          break;
        case 'less_than_or_equal':
          q = q.where(expr, '<=', val);
          break;
        case 'is_empty':
          q = q.whereNull(expr);
          break;
        case 'is_not_empty':
          q = q.whereNotNull(expr);
          break;
      }
    }
  }

  // ── Execute query ─────────────────────────────────────────────────────────
  const rawRows = await q.limit(limit);
  const total = rawRows.length;

  // ── Normalize row keys for snake_case / camelCase matching ───────────────
  const rows = rawRows.map((row: Record<string, any>) => {
    const normalized: Record<string, any> = { ...row };
    for (const f of fieldDefs) {
      const camelKey = f.key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (normalized[f.key] === undefined && normalized[camelKey] !== undefined) {
        normalized[f.key] = normalized[camelKey];
      }
      if (normalized[camelKey] === undefined && normalized[f.key] !== undefined) {
        normalized[camelKey] = normalized[f.key];
      }
    }
    return normalized;
  });

  const columns = fieldDefs.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    isSensitive: f.isSensitive || false,
  }));

  return { columns, rows, total };
}
