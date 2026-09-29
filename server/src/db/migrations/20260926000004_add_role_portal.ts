import type { Knex } from 'knex';

const portalCodes: Record<string, string[]> = {
  admin: ['organization_admin', 'org_admin', 'owner', 'admin', 'ceo', 'cto', 'cfo', 'coo', 'cxo', 'super_admin'],
  hr: ['hr', 'hr_admin', 'hr_manager', 'support'],
  manager: ['manager', 'department_head', 'dept_head', 'reporting_manager'],
  team_lead: ['team_lead', 'lead'],
  finance: ['finance', 'finance_manager'],
  intern: ['intern'],
  consultant: ['consultant'],
};

export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasColumn('roles', 'portal')) {
    await knex.schema.alterTable('roles', (table) => table.string('portal', 30).notNullable().defaultTo('employee'));
  }
  for (const [portal, codes] of Object.entries(portalCodes)) {
    await knex('roles').whereIn('code', codes).update({ portal });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Data-only rollback: keep assigned role portals and avoid changing live routing.
}
