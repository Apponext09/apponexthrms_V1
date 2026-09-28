import { expandTabAccessIds } from '@apponexthrms/shared';
import { getKnex } from '../db/knex';

// Read-only check: all saved visible-tab grants must include their owned pages.
const db = getKnex();
try {
  const catalog = await db('menu_items').where('is_active', true).select('id', 'portal', 'route');
  const grants = await db('role_menu_access').select('role_id', 'menu_id');
  const roles = new Map<number, number[]>();
  for (const grant of grants) {
    const roleId = Number(grant.roleId ?? grant.role_id);
    roles.set(roleId, [...(roles.get(roleId) ?? []), Number(grant.menuId ?? grant.menu_id)]);
  }
  let missing = 0;
  for (const ids of roles.values()) missing += expandTabAccessIds(ids, catalog).filter((id) => !ids.includes(id)).length;
  console.log(JSON.stringify({ rolesChecked: roles.size, missingBundledGrants: missing }));
  if (missing) process.exitCode = 1;
} finally {
  await db.destroy();
}
