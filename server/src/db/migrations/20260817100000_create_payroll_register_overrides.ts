import type { Knex } from 'knex';

// The Process Payroll register screen is advertised as "Directly Editable —
// Auto-recalculates & saves" and both saveProcessRegisterOverride (write)
// and getProcessRegister/PayrollService.processPayroll (read) already
// reference payroll_register_overrides — but the table was never created,
// so every save has been silently failing (500 on save; reads swallow the
// error and just act as if no override exists).
export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payroll_register_overrides');
  if (exists) return;

  await knex.schema.createTable('payroll_register_overrides', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('uuid', 36).nullable();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.string('month', 7).notNullable();
    table.bigInteger('cycle_id').unsigned().nullable();

    table.decimal('salary_days', 6, 2).defaultTo(30);
    table.decimal('paid_days', 6, 2).defaultTo(30);
    table.decimal('unpaid_days', 6, 2).defaultTo(0);

    table.decimal('basic', 14, 2).defaultTo(0);
    table.decimal('hra', 14, 2).defaultTo(0);
    table.decimal('standard_allowance', 14, 2).defaultTo(0);
    table.decimal('meal_allowance', 14, 2).defaultTo(0);
    table.decimal('communication_allowance', 14, 2).defaultTo(0);
    table.decimal('children_education_allowance', 14, 2).defaultTo(0);
    table.decimal('lta', 14, 2).defaultTo(0);
    table.decimal('gross', 14, 2).defaultTo(0);

    table.decimal('basic_earned', 14, 2).defaultTo(0);
    table.decimal('hra_earned', 14, 2).defaultTo(0);
    table.decimal('standard_allowance_earned', 14, 2).defaultTo(0);
    table.decimal('meal_allowance_earned', 14, 2).defaultTo(0);
    table.decimal('communication_allowance_earned', 14, 2).defaultTo(0);
    table.decimal('children_education_allowance_earned', 14, 2).defaultTo(0);
    table.decimal('lta_earned', 14, 2).defaultTo(0);
    table.decimal('gross_earned', 14, 2).defaultTo(0);
    table.decimal('total_gross_earned', 14, 2).defaultTo(0);

    table.decimal('adjustment', 14, 2).defaultTo(0);
    table.decimal('ot_hours', 6, 2).defaultTo(0);
    table.decimal('ot', 14, 2).defaultTo(0);

    table.decimal('pt', 14, 2).defaultTo(0);
    table.decimal('pf', 14, 2).defaultTo(0);
    table.decimal('tds', 14, 2).defaultTo(0);
    table.decimal('esic', 14, 2).defaultTo(0);
    table.decimal('esic_employer', 14, 2).defaultTo(0);
    table.decimal('total_deduction', 14, 2).defaultTo(0);

    table.decimal('net_salary', 14, 2).defaultTo(0);
    table.decimal('ctc', 14, 2).defaultTo(0);

    table.string('payment_status', 30).defaultTo('Freeze');
    table.text('notes').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['organization_id', 'employee_id', 'month'], { indexName: 'pro_org_emp_month_unique' });
    table.index(['organization_id', 'month'], 'pro_org_month_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_register_overrides');
}
