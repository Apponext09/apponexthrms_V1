import type { Knex } from 'knex';
import { expandTabAccessIds } from '@apponexthrms/shared';

/**
 * Reconcile existing roles after the shared parent/child flow catalog grows.
 * New role updates are expanded by RbacService; this migration protects roles
 * that were saved before a newly discovered child route was bundled.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('role_menu_access')) || !(await knex.schema.hasTable('menu_items'))) return;

  const catalog = await knex('menu_items')
    .where('is_active', true)
    .select('id', 'portal', 'route', 'parent_id');
  const grants = await knex('role_menu_access').select('role_id', 'menu_id');
  const grantsByRole = new Map<number, number[]>();

  for (const grant of grants) {
    const roleId = Number(grant.roleId ?? grant.role_id);
    grantsByRole.set(roleId, [...(grantsByRole.get(roleId) ?? []), Number(grant.menuId ?? grant.menu_id)]);
  }

  for (const [roleId, ids] of grantsByRole) {
    const saved = new Set(ids);
    const additions = expandTabAccessIds(ids, catalog).filter((id) => !saved.has(id));

    for (const id of [...additions]) {
      const page = catalog.find((menu) => Number(menu.id) === id);
      const parentId = Number(page?.parentId ?? page?.parent_id);
      if (parentId > 0 && !saved.has(parentId) && !additions.includes(parentId)) additions.push(parentId);
    }

    if (additions.length) {
      await knex('role_menu_access')
        .insert(additions.map((menuId) => ({ role_id: roleId, menu_id: menuId })))
        .onConflict(['role_id', 'menu_id'])
        .ignore();
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Access may have been intentionally changed after rollout; never revoke it.
}
