import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_documents');
  if (!hasTable) return;

  const hasGender = await knex.schema.hasColumn('policy_documents', 'applicable_gender');
  if (!hasGender) {
    await knex.schema.alterTable('policy_documents', (table) => {
      table.string('applicable_gender', 20).defaultTo('all').notNullable();
      table.text('applicable_department_ids').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_documents');
  if (!hasTable) return;

  const hasGender = await knex.schema.hasColumn('policy_documents', 'applicable_gender');
  if (hasGender) {
    await knex.schema.alterTable('policy_documents', (table) => {
      table.dropColumn('applicable_gender');
      table.dropColumn('applicable_department_ids');
    });
  }
}
