import type { Knex } from 'knex';

const masters = [
  ['company', 'Company'], ['location', 'Location'], ['department', 'Department'],
  ['designation', 'Designation'], ['grade', 'Grade'], ['employee-status', 'Employee Status'],
  ['emp-type', 'Emp. Type'],
] as const;
const operational = [
  ['ot-rule', 'OT Rule'], ['break', 'Break'], ['holiday', 'Holiday'],
  ['events', 'Events'], ['notification-templates', 'Notification Templates'],
  ['notification-merge-codes', 'Notification Merge Codes'], ['offer-templates', 'Letter & Offer Master'],
  ['access-roles', 'Access Roles'], ['kra', 'KRA Form'], ['resource-plan', 'Resource Plan'],
] as const;

/** Query tabs on the admin hubs and their HR routes are independently assignable pages. */
export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('menu_items') || !await knex.schema.hasTable('role_menu_access')) return;
  let order = 10000;
  for (const [base, tabs] of [['masters', masters], ['operational-masters', operational]] as const) {
    for (const portal of ['admin', 'hr'] as const) {
      const baseRoute = portal === 'admin' ? `/${base}` : `/hr/${base}`;
      const basePage = await knex('menu_items').where({ portal, route: baseRoute }).first('id', 'parent_id');
      const wildcard = await knex('menu_items').where({ portal, route: `${baseRoute}/*` }).first('id', 'parent_id');
      const parentId = basePage?.parent_id ?? wildcard?.parent_id;
      if (!parentId) throw new Error(`Missing ${portal} ${base} module in menu catalog`);
      const sourceIds = [basePage?.id, wildcard?.id].filter(Boolean);
      const sourceRoles = sourceIds.length ? await knex('role_menu_access').whereIn('menu_id', sourceIds).distinct('role_id') : [];
      for (const [tab, label] of tabs) {
        const route = portal === 'admin' ? `${baseRoute}?tab=${tab}` : `${baseRoute}/${tab}`;
        const code = `page:${portal}:${route}`;
        await knex('menu_items').insert({ code, label, portal, route, parent_id: parentId, subscription_module: null, sort_order: order++, is_active: true })
          .onConflict('code').ignore();
        const page = await knex('menu_items').where({ code }).first('id');
        if (!page) throw new Error(`Could not create ${code}`);
        let roleIds = sourceRoles.map((row) => Number(row.role_id));
        if (tab === 'access-roles') {
          const managers = await knex('roles').whereIn('code', ['organization_admin', 'ceo', 'hr', 'hr_admin', 'hr_manager']).whereNull('deleted_at').select('id');
          const managerIds = new Set(managers.map((row) => Number(row.id)));
          roleIds = roleIds.filter((id) => managerIds.has(id));
        }
        if (roleIds.length) await knex('role_menu_access').insert(roleIds.map((roleId) => ({ role_id: roleId, menu_id: page.id })))
          .onConflict(['role_id', 'menu_id']).ignore();
      }
    }
  }
}

// Do not revoke administrator-edited grants on rollback.
export async function down(_knex: Knex): Promise<void> {}
