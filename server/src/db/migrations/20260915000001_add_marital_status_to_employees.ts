import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasEmployees = await knex.schema.hasTable('employees');
  const hasMaritalStatus = hasEmployees && await knex.schema.hasColumn('employees', 'marital_status');

  if (hasEmployees && !hasMaritalStatus) {
    await knex.schema.alterTable('employees', (table) => {
      table.string('marital_status', 20).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasEmployees = await knex.schema.hasTable('employees');
  const hasMaritalStatus = hasEmployees && await knex.schema.hasColumn('employees', 'marital_status');

  if (hasEmployees && hasMaritalStatus) {
    await knex.schema.alterTable('employees', (table) => {
      table.dropColumn('marital_status');
    });
  }
}
