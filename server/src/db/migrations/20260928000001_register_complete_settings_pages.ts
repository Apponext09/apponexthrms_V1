import type { Knex } from 'knex';
import { moduleForRoute, SUBSCRIPTION_MODULES } from '../../modules/rbac/menu.catalog';

const settingsPages = [
  ['general', 'General Settings'], ['company-profile', 'Company Profile'], ['branches', 'Branches'],
  ['locations', 'Locations'], ['branding', 'Branding'], ['leave-policies', 'Leave Settings'],
  ['org-leave-settings', 'Organization Leave Settings'], ['career-customization', 'Career Portal Customization'],
  ['lms-integrations', 'Integration Settings'], ['workflows', 'Workflow Settings'],
  ['id-card-designer', 'ID Card Designer'], ['modules', 'Module Management'],
] as const;

export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items')) return;
  const pages = [
    ...settingsPages.map(([tab, label]) => ({ portal: 'admin', route: `/settings-group/${tab}`, label, alias: `/settings/${tab}` })),
    ...[['admin-config', 'Admin Configuration'], ['hr-config', 'HR Configuration'], ...settingsPages]
      .map(([tab, label]) => ({ portal: 'hr', route: `/hr/settings/${tab}`, label, alias: null })),
  ];
  let order = 13000;
  for (const page of pages) {
    const module = moduleForRoute(page.route);
    const parent = await knex('menu_items').where({ code: `module:${module}` }).first('id');
    if (!parent) throw new Error(`Missing page module ${module}`);
    const code = `page:${page.portal}:${page.route}`;
    await knex('menu_items').insert({
      code, label: page.label, portal: page.portal, route: page.route,
      parent_id: parent.id, subscription_module: SUBSCRIPTION_MODULES[module],
      sort_order: order++, is_active: true,
    }).onConflict('code').ignore();
    // Only a true alias inherits grants. New settings pages remain opt-in.
    if (page.alias && await knex.schema.hasTable('role_menu_access')) {
      const base = await knex('menu_items').where({ portal: page.portal, route: page.alias }).first('id');
      const item = await knex('menu_items').where({ code }).first('id');
      if (base && item) {
        const grants = await knex('role_menu_access').where('menu_id', base.id).distinct('role_id');
        if (grants.length) await knex('role_menu_access').insert(grants.map((grant) => ({ role_id: grant.roleId ?? grant.role_id, menu_id: item.id })))
          .onConflict(['role_id', 'menu_id']).ignore();
      }
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Preserve administrators' saved grants and the existing working-page catalog.
}
