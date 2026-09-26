// ============================================================
// Livetracking access helpers — shared by the REST controller and the socket
// server/src/modules/Livetracking/utils/access.ts
//
// NOTE: getKnex() camelCases every result key, so rows must be read as
// `row.employeeId`, not `row.employee_id`.
// ============================================================
import { getKnex } from '../../../db/knex';

/**
 * Role codes that see the whole org's live tracking. Matched EXACTLY against the
 * normalized role code/name — a substring match used to hand org-wide access to
 * any role containing "admin"/"executive"/"director" (e.g. asset_admin,
 * "Field Executive").
 */
const HR_ADMIN_ROLES = new Set([
  'super_admin',
  'organization_admin',
  'org_admin',
  'admin',
  'hr_admin',
  'hr_manager',
  'hr',
  'ceo',
  'owner',
]);

/** Max depth walked up/down the reporting_manager_id tree (also guards cycles). */
const MAX_CHAIN_DEPTH = 10;

function normalizeRole(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isHrAdminRole(value: unknown): boolean {
  return HR_ADMIN_ROLES.has(normalizeRole(value));
}

/** HR/Admin check from JWT claims (if present) and the user_roles table. */
export async function checkIsHROrAdmin(organizationId: number, userId: number, claims?: any): Promise<boolean> {
  const claimRoles: unknown[] = Array.isArray(claims?.roles) ? [...claims.roles] : [];
  if (claims?.role) claimRoles.push(claims.role);
  if (claimRoles.some(isHrAdminRole)) return true;

  const rows = await getKnex()('user_roles as ur')
    .leftJoin('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', userId)
    .where('ur.organization_id', organizationId)
    .select('r.code', 'r.name')
    .catch(() => []);

  return rows.some((row: any) => isHrAdminRole(row?.code) || isHrAdminRole(row?.name));
}

/** Resolve the employee linked to a user; falls back to matching by email. */
export async function resolveEmployeeId(organizationId: number, userId: number): Promise<number | null> {
  if (!userId) return null;
  const db = getKnex();

  const user = await db('users')
    .where('id', userId)
    .where('organization_id', organizationId)
    .select('employee_id', 'email')
    .first()
    .catch(() => null);

  if (!user) return null;
  if (user.employeeId) return Number(user.employeeId);

  if (user.email) {
    const emp = await db('employees')
      .where('organization_id', organizationId)
      .whereRaw('LOWER(email) = ?', [String(user.email).toLowerCase()])
      .whereIn('status', ['active', 'probation', 'onboarding', 'notice'])
      .whereNull('deleted_at')
      .select('id')
      .first()
      .catch(() => null);

    if (emp?.id) {
      // Backfill so future lookups hit the direct link
      await db('users').where('id', userId).update({ employee_id: emp.id }).catch(() => {});
      return Number(emp.id);
    }
  }

  return null;
}

/** Managers above an employee (direct manager first), walking reporting_manager_id. */
export async function getManagerChain(organizationId: number, employeeId: number): Promise<number[]> {
  const db = getKnex();
  const chain: number[] = [];
  const seen = new Set<number>([employeeId]);
  let current = employeeId;

  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
    const row = await db('employees')
      .where('organization_id', organizationId)
      .where('id', current)
      .select('reporting_manager_id')
      .first()
      .catch(() => null);

    const managerId = row?.reportingManagerId ? Number(row.reportingManagerId) : 0;
    if (!managerId || seen.has(managerId)) break;
    chain.push(managerId);
    seen.add(managerId);
    current = managerId;
  }

  return chain;
}

/** Everyone below a manager in the reporting tree (direct + indirect reports). */
export async function getSubordinateIds(organizationId: number, managerEmployeeId: number): Promise<number[]> {
  const db = getKnex();
  const result: number[] = [];
  const seen = new Set<number>([managerEmployeeId]);
  let frontier = [managerEmployeeId];

  for (let depth = 0; depth < MAX_CHAIN_DEPTH && frontier.length > 0; depth++) {
    const rows = await db('employees')
      .where('organization_id', organizationId)
      .whereIn('reporting_manager_id', frontier)
      .whereNull('deleted_at')
      .select('id');

    frontier = [];
    for (const row of rows) {
      const id = Number(row.id);
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
        frontier.push(id);
      }
    }
  }

  return result;
}

/** Server-local calendar date (YYYY-MM-DD) — matches how recorded_at is stored. */
export function localDateStr(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
