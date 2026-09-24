/**
 * payroll.access.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Object-level authorization helpers for payroll resources.
 *
 * BaseRepository.getById() scopes every fetch to the caller's organization, so
 * cross-tenant access is already blocked. What it does NOT block is one employee
 * reading another employee's payslip / loan / revision / settlement inside the
 * same org simply by changing the :id in the URL (IDOR).
 *
 * These helpers add the missing object-level check: a caller may read payroll
 * data for an employee only if they are payroll-privileged OR that employee is
 * themselves.
 */

import { getKnex } from '../../../db/knex';
import { ForbiddenError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

const PRIVILEGED_ROLE_CODES = new Set([
  'super_admin', 'superadmin', 'organization_admin', 'org_admin', 'admin', 'owner',
  'hr', 'hr_admin', 'hr_manager',
  'finance', 'finance_manager', 'payroll_admin', 'payroll_manager',
]);

/**
 * Resolve the employee_id that belongs to the authenticated user, or null if the
 * user is not linked to an employee record.
 */
export async function resolveCallerEmployeeId(ctx: TenantContext): Promise<number | null> {
  const db = getKnex();
  const user = await db('users')
    .where('id', ctx.userId)
    .where('organization_id', ctx.organizationId)
    .first()
    .catch(() => null);
  if (!user) return null;
  // The global knex postProcessResponse hook camelCases result keys, so a row
  // may arrive as employeeId; raw queries keep employee_id. Accept both.
  const linkedEmpId = user.employee_id ?? user.employeeId;
  if (linkedEmpId) return Number(linkedEmpId);
  if (user.email) {
    const emp = await db('employees')
      .where('email', user.email)
      .where('organization_id', ctx.organizationId)
      .first()
      .catch(() => null);
    if (emp) return Number(emp.id);
  }
  return null;
}

/**
 * True when the caller holds a role that is allowed to see every employee's
 * payroll data. Checks JWT-derived roles first, then the user_roles table.
 */
export async function isPayrollPrivileged(ctx: TenantContext): Promise<boolean> {
  const jwtRoles = ([] as string[])
    .concat((ctx as any).roles || [])
    .concat((ctx as any).role ? [(ctx as any).role] : [])
    .map((r) => String(r).toLowerCase());
  if (jwtRoles.some((r) => PRIVILEGED_ROLE_CODES.has(r))) return true;

  const db = getKnex();
  const rows = await db('user_roles as ur')
    .join('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', ctx.userId)
    .where('ur.organization_id', ctx.organizationId)
    .select('r.code')
    .catch(() => [] as Array<{ code: string }>);
  return rows.some((r) => PRIVILEGED_ROLE_CODES.has(String(r.code || '').toLowerCase()));
}

/**
 * Resolve which employee_id a *list* query may be filtered by:
 *  - privileged caller  → the requested id as-is (undefined ⇒ whole org)
 *  - unprivileged caller → forced to their own employee_id, ignoring any
 *    requested id; throws if they are not linked to an employee record.
 *
 * Use this to stop an ordinary employee from listing another employee's — or
 * the entire org's — loans / settlements / payslips by tampering with a query
 * param (or omitting it).
 */
export async function scopeEmployeeIdForCaller(
  ctx: TenantContext,
  requestedEmployeeId?: number | null
): Promise<number | undefined> {
  if (await isPayrollPrivileged(ctx)) {
    return requestedEmployeeId != null && !Number.isNaN(Number(requestedEmployeeId))
      ? Number(requestedEmployeeId)
      : undefined;
  }
  const callerEmpId = await resolveCallerEmployeeId(ctx);
  if (!callerEmpId) {
    throw new ForbiddenError('You are not allowed to list payroll records.');
  }
  return callerEmpId;
}

/**
 * Throw ForbiddenError unless the caller may access payroll data for `employeeId`.
 * Privileged roles pass; otherwise the caller must be that employee.
 */
export async function assertCanAccessEmployeePayroll(
  ctx: TenantContext,
  employeeId: number | null | undefined
): Promise<void> {
  if (await isPayrollPrivileged(ctx)) return;
  const callerEmpId = await resolveCallerEmployeeId(ctx);
  if (callerEmpId && employeeId && Number(callerEmpId) === Number(employeeId)) return;
  throw new ForbiddenError('You are not allowed to access this payroll record.');
}
