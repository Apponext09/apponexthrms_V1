import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('leave_policy_assignments');
  if (tableExists) {
    await knex.schema.alterTable('leave_policy_assignments', (table) => {
      table.integer('max_team_members_on_leave_simultaneously').nullable().defaultTo(null);
      table.string('concurrent_leave_cap_mode', 50).defaultTo('hard_block');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('leave_policy_assignments');
  if (tableExists) {
    await knex.schema.alterTable('leave_policy_assignments', (table) => {
      table.dropColumn('max_team_members_on_leave_simultaneously');
      table.dropColumn('concurrent_leave_cap_mode');
    });
  }
}
