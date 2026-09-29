import type { Knex } from 'knex';

const moduleTabs = [
  ['ceo', 'CEO / Admin'], ['hr', 'HR'], ['manager', 'Manager'],
  ['team-lead', 'Team Lead'], ['employee', 'Employee'],
  ['intern', 'Intern'], ['consultant', 'Consultant'],
] as const;
const hrSettings = [
  ['/hr/settings/leave-policies', 'Leave Settings'],
  ['/hr/settings/general', 'General Settings'],
  ['/hr/settings/id-card-designer', 'ID Card Designer'],
  ['/hr/settings/career-customization', 'Career Portal Customization'],
] as const;

/** Register existing sidebar tabs that were absent from the initial route catalog. */
export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items') || !await knex.schema.hasTable('role_menu_access')) return;
  const pages = [
    ...moduleTabs.flatMap(([tab, label]) => [
      { portal: 'admin', route: `/modules?module=${tab}`, label, baseRoute: '/modules' },
      { portal: 'hr', route: `/hr/modules?module=${tab}`, label, baseRoute: '/hr/modules' },
    ]),
    ...hrSettings.map(([route, label]) => ({ portal: 'hr', route, label, baseRoute: '/hr/settings' })),
  ];
  let sortOrder = 12000;
  for (const page of pages) {
    const base = await knex('menu_items').where({ portal: page.portal, route: page.baseRoute }).first('id', 'parent_id', 'subscription_module');
    if (!base) throw new Error(`Missing navigation hub ${page.baseRoute}`);
    const code = `page:${page.portal}:${page.route}`;
    await knex('menu_items').insert({
      code, label: page.label, portal: page.portal, route: page.route,
      parent_id: base.parentId ?? base.parent_id,
      subscription_module: base.subscriptionModule ?? base.subscription_module,
      sort_order: sortOrder++, is_active: true,
    }).onConflict('code').ignore();
    const item = await knex('menu_items').where({ code }).first('id');
    if (!item) throw new Error(`Could not register ${code}`);
    const roles = await knex('role_menu_access').where('menu_id', base.id).distinct('role_id');
    if (roles.length) {
      await knex('role_menu_access').insert(roles.map((row) => ({ role_id: row.roleId ?? row.role_id, menu_id: item.id })))
        .onConflict(['role_id', 'menu_id']).ignore();
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Do not revoke existing role grants on rollback.
}
