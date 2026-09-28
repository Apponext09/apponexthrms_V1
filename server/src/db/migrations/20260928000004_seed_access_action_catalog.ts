import type { Knex } from 'knex';
import { ATTENDANCE_PERMISSION_CODES, PERFORMANCE_PERMISSION_CODES } from '@apponexthrms/shared';
import { assetPermissions } from '../../modules/asset/asset.permissions';
import { leavePermissions } from '../../modules/leaves/leave.permissions';
import { pageAllowsPermission } from '../../modules/rbac/menu.catalog';

const EMPLOYEE = [
  'employee.profile.read', 'employee.profile.create', 'employee.profile.update', 'employee.profile.delete',
  'employee.profile.export', 'employee.org_hierarchy.update',
];
const RECRUITMENT = ['mrf', 'job', 'candidate', 'application', 'interview', 'assessment', 'offer']
  .flatMap((resource) => [`recruitment.${resource}.read`, `recruitment.${resource}.write`]);
const WORKFLOW = ['read', 'create', 'update', 'delete', 'publish', 'execute', 'approve', 'delegate', 'escalate', 'manage_templates']
  .map((action) => `workflow:${action}`);
const PAYROLL = [
  'payroll:view', 'payroll:generate', 'payroll:process', 'payroll:lock', 'payroll:unlock', 'payroll:approve', 'payroll:publish',
  'structure:view', 'structure:create', 'structure:edit', 'structure:assign', 'payslip:send', 'payslip:lock',
  'revision:view', 'revision:request', 'revision:submit', 'revision:approve',
  'loan:view', 'loan:create', 'settlement:view', 'settlement:create', 'settlement:calculate', 'settlement:submit',
  'settlement:approve', 'settlement:process',
];
const LMS = ['course', 'category', 'module', 'batch', 'enrollment', 'assessment', 'compliance', 'integration']
  .flatMap((resource) => [`lms.${resource}.view`, `lms.${resource}.create`, `lms.${resource}.update`, `lms.${resource}.delete`]);
const EXPENSE = {
  category: ['view', 'create', 'update', 'delete'], policy: ['view', 'create', 'update', 'delete'],
  travel: ['view', 'create', 'update', 'approve'], advance: ['view', 'create', 'approve'],
  mileage: ['view', 'create', 'approve'], report: ['view', 'export'], settings: ['view', 'update'],
  workflow: ['view', 'create', 'update', 'delete'], claim: ['view', 'create', 'update', 'approve', 'verify', 'reimburse'],
} as const;
const EXPENSE_CODES = Object.entries(EXPENSE).flatMap(([resource, actions]) => actions.map((action) => `expense.${resource}.${action}`));

const actionSuffixes = ['manage_templates', 'approve', 'publish', 'process', 'calculate', 'complete', 'delegate', 'escalate',
  'generate', 'execute', 'submit', 'request', 'assign', 'redeem', 'create', 'update', 'delete', 'write', 'read', 'view',
  'edit', 'manage', 'admin', 'export', 'import', 'send', 'lock', 'unlock', 'apply', 'verify'];

function definition(code: string) {
  const delimiter = code.includes(':') ? ':' : '.';
  const parts = code.split(delimiter);
  let action = actionSuffixes.find((candidate) => code.endsWith(`${delimiter}${candidate}`) || code.endsWith(`_${candidate}`)) ?? parts.at(-1)!;
  let resource = parts.length > 2 ? parts[1] : parts[0];
  let module = parts[0];
  if (delimiter === ':') {
    resource = parts[0];
    module = ['structure', 'payslip', 'revision', 'loan', 'settlement'].includes(resource) ? 'payroll' : resource;
  }
  if (module === 'performance' && parts[1]) resource = parts[1].replace(new RegExp(`_${action}$`), '');
  return { code, module, resource, action, description: `${action.replace(/_/g, ' ')} ${resource.replace(/_/g, ' ')}`, is_system: true };
}

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('permissions'))) return;
  const detailed = [...assetPermissions, ...leavePermissions].map((permission) => ({
    code: permission.code,
    module: permission.module,
    resource: permission.resource,
    action: permission.action,
    description: permission.description,
    is_system: true,
  }));
  const codes = [...new Set([
    ...EMPLOYEE, ...ATTENDANCE_PERMISSION_CODES, ...PERFORMANCE_PERMISSION_CODES,
    ...RECRUITMENT, ...WORKFLOW, ...PAYROLL, ...LMS, ...EXPENSE_CODES,
  ])];
  const byCode = new Map([...codes.map((code) => definition(code)), ...detailed].map((row) => [row.code, row]));
  const rows = [...byCode.values()];
  for (let index = 0; index < rows.length; index += 100) {
    await knex('permissions').insert(rows.slice(index, index + 100)).onConflict('code').ignore();
  }

  // Preserve existing behavior during rollout: a role that already owns a
  // feature receives that feature's mapped actions once. Future changes are
  // explicit through Manage Access and page grants never bypass middleware.
  if (await knex.schema.hasTable('role_menu_access')) {
    const [grants, mappedPermissions] = await Promise.all([
      knex('role_menu_access as rma').join('menu_items as menu', 'menu.id', 'rma.menu_id')
        .whereNotNull('menu.route').select('rma.role_id', 'menu.route'),
      knex('permissions').select('id', 'code'),
    ]);
    const backfill = new Map<string, { role_id: number; permission_id: number }>();
    for (const grant of grants) for (const permission of mappedPermissions) {
      if (!pageAllowsPermission(permission.code, grant.route)) continue;
      const row = { role_id: Number(grant.roleId ?? grant.role_id), permission_id: Number(permission.id) };
      backfill.set(`${row.role_id}:${row.permission_id}`, row);
    }
    const backfillRows = [...backfill.values()];
    for (let index = 0; index < backfillRows.length; index += 100) {
      await knex('role_permissions').insert(backfillRows.slice(index, index + 100))
        .onConflict(['role_id', 'permission_id']).ignore();
    }
  }
}

// Permission rows may pre-date this migration and may already be assigned to roles.
// A destructive rollback would remove legitimate tenant authorization data.
export async function down(): Promise<void> {}
