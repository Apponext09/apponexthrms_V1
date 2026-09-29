import type { Knex } from 'knex';
import { PORTAL_ROUTES, moduleForRoute, SUBSCRIPTION_MODULES } from '../../modules/rbac/menu.catalog';

const moduleLabel = (code: string) => code.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const pageLabel = (path: string) => {
  const segment = path.split('/').filter(Boolean).pop() || 'Dashboard';
  if (segment === '*') {
    const parts = path.split('/').filter(Boolean);
    return `${moduleLabel(parts[parts.length - 2] || 'Page')} Subpages`;
  }
  if (segment.startsWith(':')) {
    const parts = path.split('/').filter(Boolean);
    return `${moduleLabel(parts[parts.length - 2] || 'Page')} Details`;
  }
  if (segment === 'attendance' && /\/(employee|intern|consultant)\//.test(path)) return 'My Attendance';
  if (['face-attendance', 'face-punch'].includes(segment)) return 'Face Punch';
  if (segment === 'live-tracking') return 'Live Tracking';
  return moduleLabel(segment);
};

function portalsForRole(code: string): string[] {
  if (['organization_admin', 'org_admin', 'owner', 'admin', 'ceo', 'cto', 'cfo', 'coo', 'cxo'].includes(code)) return ['admin', 'manager', 'finance'];
  if (['hr', 'hr_admin', 'hr_manager'].includes(code)) return ['hr', 'finance'];
  if (['manager', 'department_head', 'dept_head', 'reporting_manager'].includes(code)) return ['manager'];
  if (['team_lead', 'lead'].includes(code)) return ['team_lead'];
  if (['finance', 'finance_manager'].includes(code)) return ['finance'];
  if (code === 'intern') return ['intern', 'employee'];
  if (code === 'consultant') return ['consultant', 'employee'];
  return ['employee'];
}

const legacyCodes = new Set(['organization_admin', 'org_admin', 'owner', 'admin', 'ceo', 'cto', 'cfo', 'coo', 'cxo', 'hr', 'hr_admin', 'hr_manager', 'manager', 'department_head', 'dept_head', 'reporting_manager', 'team_lead', 'lead', 'finance', 'finance_manager', 'intern', 'consultant', 'employee', 'support']);

export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasColumn('roles', 'menu_access_initialized')) {
    await knex.schema.alterTable('roles', (table) => table.boolean('menu_access_initialized').notNullable().defaultTo(false));
  }
  if (!await knex.schema.hasTable('menu_items')) {
    await knex.schema.createTable('menu_items', (table) => {
      table.bigIncrements('id').primary();
      table.string('code', 255).notNullable().unique();
      table.string('label', 120).notNullable();
      table.string('portal', 30).nullable();
      table.string('subscription_module', 100).nullable();
      table.string('route', 255).nullable();
      table.bigInteger('parent_id').unsigned().nullable();
      table.integer('sort_order').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.foreign('parent_id').references('id').inTable('menu_items').onDelete('CASCADE');
      table.index(['portal', 'route']);
    });
  }
  if (!await knex.schema.hasTable('role_menu_access')) {
    await knex.schema.createTable('role_menu_access', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('role_id').unsigned().notNullable();
      table.bigInteger('menu_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
      table.foreign('menu_id').references('id').inTable('menu_items').onDelete('CASCADE');
      table.unique(['role_id', 'menu_id']);
      table.index('menu_id');
    });
  }

  // Catalog is deployed with the application. Admins assign existing working pages, not arbitrary URLs.
  const moduleIds = new Map<string, number>();
  for (const portal of Object.keys(PORTAL_ROUTES)) {
    for (const route of PORTAL_ROUTES[portal]) {
      const module = moduleForRoute(route);
      if (moduleIds.has(module)) continue;
      const code = `module:${module}`;
      const existing = await knex('menu_items').where({ code }).first('id');
      const id = existing?.id ?? (await knex('menu_items').insert({ code, label: moduleLabel(module), subscription_module: SUBSCRIPTION_MODULES[module], sort_order: moduleIds.size }))[0];
      moduleIds.set(module, Number(id));
    }
  }

  const pageRows: Array<Record<string, unknown>> = [];
  let order = 0;
  for (const [portal, routes] of Object.entries(PORTAL_ROUTES)) {
    for (const route of routes) {
      const portalCode = portal === 'teamlead' ? 'team_lead' : portal;
      const code = `page:${portalCode}:${route}`;
      pageRows.push({ code, label: pageLabel(route), portal: portalCode, route, subscription_module: route.includes('operational-masters') ? null : SUBSCRIPTION_MODULES[moduleForRoute(route)], parent_id: moduleIds.get(moduleForRoute(route)), sort_order: order++ });
    }
  }
  for (let index = 0; index < pageRows.length; index += 100) {
    const batch = pageRows.slice(index, index + 100);
    await knex('menu_items').insert(batch).onConflict('code').ignore();
  }

  // Preserve existing system-role behavior during the cutover. New custom roles have no grants.
  const roles = await knex('roles').whereNull('deleted_at').where('is_platform_role', false).whereNot('code', 'super_admin').select('id', 'code', 'is_system');
  const menus = await knex('menu_items').select('id', 'portal', 'parent_id');
  for (const role of roles) {
    if (!legacyCodes.has(role.code) && !role.isSystem && !role.is_system) continue;
    const portals = portalsForRole(role.code);
    const pageIds = menus.filter((menu) => portals.includes(menu.portal)).map((menu) => Number(menu.id));
    const parentIds = [...new Set(menus.filter((menu) => portals.includes(menu.portal)).map((menu) => Number(menu.parentId ?? menu.parent_id)))];
    const values = [...new Set([...pageIds, ...parentIds])].filter((id) => Number.isFinite(id));
    for (let index = 0; index < values.length; index += 100) {
      await knex('role_menu_access').insert(values.slice(index, index + 100).map((menuId) => ({ role_id: role.id, menu_id: menuId }))).onConflict(['role_id', 'menu_id']).ignore();
    }
    await knex('roles').where('id', role.id).update({ menu_access_initialized: true });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_menu_access');
  await knex.schema.dropTableIfExists('menu_items');
  if (await knex.schema.hasColumn('roles', 'menu_access_initialized')) {
    await knex.schema.alterTable('roles', (table) => table.dropColumn('menu_access_initialized'));
  }
}
