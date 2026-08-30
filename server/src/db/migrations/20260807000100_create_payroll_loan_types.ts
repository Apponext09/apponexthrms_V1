import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payroll_loan_types');
  if (exists) return;

  await knex.schema.createTable('payroll_loan_types', (table) => {
    table.string('id', 100).primary();
    table.string('name', 255).notNullable();
    table.string('category', 50).defaultTo('loan');
    table.integer('min_service_months').defaultTo(0);
    table.string('interest_type', 50).defaultTo('Fixed');
    table.decimal('interest_rate', 5, 2).defaultTo(8.5);
    table.integer('min_term_months').defaultTo(1);
    table.integer('max_term_months').defaultTo(12);
    table.string('gender', 20).defaultTo('All');
    table.decimal('min_amount', 15, 2).defaultTo(5000);
    table.decimal('max_amount', 15, 2).defaultTo(100000);
    table.integer('max_applications_per_year').defaultTo(2);
    table.integer('gap_months').defaultTo(3);
    table.string('restrict_concurrent', 50).defaultTo('1');
    table.text('description').nullable();
    table.boolean('foreclosure_allowed').defaultTo(false);
    table.string('max_eligibility', 50).defaultTo('Salary');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Seed default loan types into MySQL DB
  await knex('payroll_loan_types').insert([
    { id: 'lt_1', name: 'Advance', category: 'advance', interest_type: 'Interest Free', interest_rate: 0, min_term_months: 1, max_term_months: 6, is_active: true },
    { id: 'lt_2', name: 'Personal loan', category: 'loan', interest_type: 'Fixed', interest_rate: 8.5, min_term_months: 6, max_term_months: 36, is_active: true }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_loan_types');
}
