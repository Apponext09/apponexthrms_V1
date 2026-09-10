import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employees');
  if (exists) {
    const hasCol = await knex.schema.hasColumn('employees', 'document_policy_accepted');
    if (!hasCol) {
      await knex.schema.alterTable('employees', (table) => {
        table.boolean('document_policy_accepted').defaultTo(false);
        table.timestamp('document_policy_accepted_at').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employees');
  if (exists) {
    const hasCol = await knex.schema.hasColumn('employees', 'document_policy_accepted');
    if (hasCol) {
      await knex.schema.alterTable('employees', (table) => {
        table.dropColumn('document_policy_accepted');
        table.dropColumn('document_policy_accepted_at');
      });
    }
  }
}
