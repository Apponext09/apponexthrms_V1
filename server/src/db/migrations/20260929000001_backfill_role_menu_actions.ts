import type { Knex } from 'knex';
import { pageAllowsPermission } from '../../modules/rbac/menu.catalog';

/**
 * Roles saved by the original Access Roles editor received only read/view
 * permissions. Backfill every action that belongs to an already granted page
 * so create/edit/delete/approve controls work for existing role assignments.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('role_menu_access')) || !(await knex.schema.hasTable('role_permissions'))) return;

  // The recruitment dashboard endpoints use this module-level permission,
  // which was missing from the original action catalog.
  await knex('permissions').insert({
    code: 'recruitment.read',
    module: 'recruitment',
    resource: 'recruitment',
    action: 'read',
    description: 'read recruitment dashboard',
    is_system: true,
  }).onConflict('code').ignore();

  const [grants, permissions] = await Promise.all([
    knex('role_menu_access as access')
      .join('menu_items as menu', 'menu.id', 'access.menu_id')
      .where('menu.is_active', true)
      .whereNotNull('menu.route')
      .select('access.role_id', 'menu.route'),
    knex('permissions').select('id', 'code'),
  ]);

  const rows = new Map<string, { role_id: number; permission_id: number }>();
  for (const grant of grants) {
    for (const permission of permissions) {
      if (!pageAllowsPermission(permission.code, grant.route)) continue;
      const row = { role_id: Number(grant.roleId ?? grant.role_id), permission_id: Number(permission.id) };
      rows.set(`${row.role_id}:${row.permission_id}`, row);
    }
  }

  const values = [...rows.values()];
  for (let index = 0; index < values.length; index += 100) {
    await knex('role_permissions').insert(values.slice(index, index + 100))
      .onConflict(['role_id', 'permission_id']).ignore();
  }
}

// Permission grants may be changed after migration; rollback must not remove them.
export async function down(): Promise<void> {}
