import type { Knex } from 'knex';
import { moduleForRoute, SUBSCRIPTION_MODULES } from '../../modules/rbac/menu.catalog';

/** Give the two existing master sections independent parent grants. */
export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items') || !await knex.schema.hasTable('role_menu_access')) return;
  const pages = await knex('menu_items').whereNotNull('route').select('id', 'route');
  for (const [module, label] of [['masters', 'Masters'], ['master_operations', 'Master Operations']] as const) {
    const code = `module:${module}`;
    let parent = await knex('menu_items').where({ code }).first('id');
    if (!parent) {
      await knex('menu_items').insert({ code, label, subscription_module: SUBSCRIPTION_MODULES[module], sort_order: module === 'masters' ? 11 : 12, is_active: true })
        .onConflict('code').ignore();
      parent = await knex('menu_items').where({ code }).first('id');
    }
    if (!parent) throw new Error(`${label} menu parent could not be created`);
    const ids = pages.filter((page) => moduleForRoute(page.route) === module).map((page) => Number(page.id));
    if (!ids.length) continue;
    const assignedRoles = await knex('role_menu_access').whereIn('menu_id', ids).distinct('role_id');
    await knex('menu_items').whereIn('id', ids).update({ parent_id: parent.id });
    if (assignedRoles.length) {
      await knex('role_menu_access').insert(assignedRoles.map((row) => ({ role_id: row.roleId ?? row.role_id, menu_id: parent.id })))
        .onConflict(['role_id', 'menu_id']).ignore();
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Preserve grants and module links rather than revoking access on rollback.
}
