import type { Knex } from 'knex';
import { moduleForRoute, SUBSCRIPTION_MODULES } from '../../modules/rbac/menu.catalog';

/** Keep Shift Management independently selectable from Attendance for existing organizations. */
export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items') || !await knex.schema.hasTable('role_menu_access')) return;
  const code = 'module:shift_management';
  let parent = await knex('menu_items').where({ code }).first('id');
  if (!parent) {
    await knex('menu_items').insert({
      code,
      label: 'Shift Management',
      subscription_module: SUBSCRIPTION_MODULES.shift_management,
      sort_order: 3,
      is_active: true,
    }).onConflict('code').ignore();
    parent = await knex('menu_items').where({ code }).first('id');
  }
  if (!parent) throw new Error('Shift Management menu parent could not be created');
  const pages = await knex('menu_items').whereNotNull('route').select('id', 'route');
  const pageIds = pages.filter((page) => moduleForRoute(page.route) === 'shift_management').map((page) => Number(page.id));
  if (!pageIds.length) return;
  const assignedRoles = await knex('role_menu_access').whereIn('menu_id', pageIds).distinct('role_id');
  await knex('menu_items').whereIn('id', pageIds).update({ parent_id: parent.id });
  if (assignedRoles.length) {
    await knex('role_menu_access').insert(assignedRoles.map((row) => ({ role_id: row.roleId ?? row.role_id, menu_id: parent.id })))
      .onConflict(['role_id', 'menu_id']).ignore();
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Keep current grants and parent links on rollback; no access is revoked.
}
