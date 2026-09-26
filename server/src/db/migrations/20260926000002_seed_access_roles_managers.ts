import type { Knex } from 'knex';

/** Ensure the Access Roles master is reachable from both organization portals. */
export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items') || !await knex.schema.hasTable('role_menu_access')) return;
  await knex('menu_items').where('route', 'like', '%operational-masters%').update({ subscription_module: null });

  const targets = [
    { codes: ['organization_admin', 'ceo'], portal: 'admin', route: '/operational-masters' },
    { codes: ['hr', 'hr_admin', 'hr_manager'], portal: 'hr', route: '/hr/operational-masters' },
  ];

  for (const target of targets) {
    const page = await knex('menu_items').where({ portal: target.portal, route: target.route, is_active: true }).first('id', 'parent_id');
    if (!page) continue;
    const roleIds = (await knex('roles').whereIn('code', target.codes).whereNull('deleted_at')
      .where('is_platform_role', false).select('id')).map((role) => Number(role.id));
    const menuIds = [Number(page.id), Number(page.parentId ?? page.parent_id)].filter((id) => Number.isSafeInteger(id) && id > 0);
    const grants = roleIds.flatMap((roleId) => menuIds.map((menuId) => ({ role_id: roleId, menu_id: menuId })));
    if (grants.length) await knex('role_menu_access').insert(grants).onConflict(['role_id', 'menu_id']).ignore();
  }
}

// Data-only migration: do not revoke grants that an administrator may have changed later.
export async function down(_knex: Knex): Promise<void> {}
