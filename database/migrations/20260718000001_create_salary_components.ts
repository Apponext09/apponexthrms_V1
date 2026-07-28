import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('salary_components');
  if (exists) return;

  await knex.schema.createTable('salary_components', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('component_code', 50).notNullable();
    table.string('component_name', 100).notNullable();
    table.enum('component_type', ['earnings', 'deductions']).notNullable();
    table.enum('earnings_type', ['basic', 'hra', 'allowance', 'bonus', 'variable', 'overtime', 'lta']).nullable();
    table.enum('deduction_type', ['pf', 'esi', 'pt', 'tds', 'lwf', 'loan', 'advance', 'other']).nullable();
    table.boolean('is_taxable').defaultTo(false);
    table.boolean('is_recurring').defaultTo(true);
    table.boolean('is_monthly').defaultTo(true);
    table.decimal('percentage_of_basic', 5, 2).nullable();
    table.enum('calculation_method', ['fixed', 'percentage', 'formula', 'formula_based']).notNullable().defaultTo('fixed');
    table.text('calculation_formula').nullable();
    table.decimal('min_limit', 12, 2).nullable();
    table.decimal('max_limit', 12, 2).nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'component_code']);
    table.index('organization_id');
    table.index('component_type');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_components');
}




