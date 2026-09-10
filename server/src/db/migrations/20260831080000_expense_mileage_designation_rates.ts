import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('expense_mileage_designation_rates');
  if (hasTable) return;
  await knex.schema.createTable('expense_mileage_designation_rates', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('designation_id').unsigned().notNullable();
    table.decimal('rate_car', 10, 2).notNullable().defaultTo(12.0);
    table.decimal('rate_bike', 10, 2).notNullable().defaultTo(6.0);
    table.timestamps(true, true);
    table.unique(['organization_id', 'designation_id'], 'exp_mileage_desig_org_desig_unq');
    table.index(['organization_id']);
    table.index(['designation_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expense_mileage_designation_rates');
}
