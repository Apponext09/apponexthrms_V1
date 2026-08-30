import type { Knex } from 'knex';

const TABLES = ['expense_claims', 'travel_requests', 'travel_advances', 'mileage_claims'];

export async function up(knex: Knex): Promise<void> {
  for (const tableName of TABLES) {
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) continue;
    const hasSubmitter = await knex.schema.hasColumn(tableName, 'submitted_by_user_id');
    if (!hasSubmitter) {
      await knex.schema.alterTable(tableName, (table) => {
        table.bigInteger('submitted_by_user_id').unsigned().nullable();
      });
    }
    await knex.raw(`ALTER TABLE \`${tableName}\` MODIFY COLUMN employee_id BIGINT UNSIGNED NULL`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of TABLES) {
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) continue;
    const hasSubmitter = await knex.schema.hasColumn(tableName, 'submitted_by_user_id');
    if (hasSubmitter) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('submitted_by_user_id');
      });
    }
  }
}
