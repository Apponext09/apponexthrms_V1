import type { Knex } from 'knex';
import { expandTabAccessIds } from '@apponexthrms/shared';

export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('role_menu_access')) return;
  const catalog = await knex('menu_items').where('is_active', true).select('id', 'portal', 'route', 'parent_id');
  const grants = await knex('role_menu_access').select('role_id', 'menu_id');
  const roles = new Map<number, number[]>();
  for (const grant of grants) {
    const roleId = Number(grant.roleId ?? grant.role_id);
    roles.set(roleId, [...(roles.get(roleId) ?? []), Number(grant.menuId ?? grant.menu_id)]);
  }
  for (const [roleId, ids] of roles) {
    const saved = new Set(ids);
    const added = expandTabAccessIds(ids, catalog).filter((id) => !saved.has(id));
    for (const id of [...added]) {
      const row = catalog.find((menu) => Number(menu.id) === id);
      const parent = Number(row?.parentId ?? row?.parent_id);
      if (parent > 0 && !saved.has(parent) && !added.includes(parent)) added.push(parent);
    }
    if (added.length) await knex('role_menu_access').insert(added.map((menuId) => ({ role_id: roleId, menu_id: menuId })))
      .onConflict(['role_id', 'menu_id']).ignore();
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Do not remove grants administrators may subsequently have edited.
}
