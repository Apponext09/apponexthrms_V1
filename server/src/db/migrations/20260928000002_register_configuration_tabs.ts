import type { Knex } from 'knex';
import { SETTINGS_CONFIGURATION_ROUTES, SETTINGS_CONFIGURATION_TABS } from '@apponexthrms/shared';

export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items')) return;
  const parent = await knex('menu_items').where({ code: 'module:settings' }).first('id');
  if (!parent) throw new Error('Settings access module missing');
  let order = 14000;
  for (const [portal, routes] of Object.entries(SETTINGS_CONFIGURATION_ROUTES)) {
    for (const baseRoute of routes) {
      const base = await knex('menu_items').where({ portal, route: baseRoute }).first('id');
      for (const tab of SETTINGS_CONFIGURATION_TABS) {
        const route = `${baseRoute}?tab=${tab.id}`;
        const code = `page:${portal}:${route}`;
        await knex('menu_items').insert({ code, label: tab.label, portal, route, parent_id: parent.id,
          subscription_module: 'Settings & RBAC', sort_order: order++, is_active: true }).onConflict('code').ignore();
        // Preserve existing access to the full configuration page; new roles remain opt-in.
        if (base && await knex.schema.hasTable('role_menu_access')) {
          const item = await knex('menu_items').where({ code }).first('id');
          const grants = await knex('role_menu_access').where('menu_id', base.id).distinct('role_id');
          if (grants.length) await knex('role_menu_access').insert(grants.map((grant) => ({ role_id: grant.roleId ?? grant.role_id, menu_id: item.id })))
            .onConflict(['role_id', 'menu_id']).ignore();
        }
      }
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Keep saved grants; these are existing application tabs, not temporary data.
}
