import { Knex } from 'knex';

// payroll_components has drifted badly from the migration that supposedly
// creates it (20260807_create_enterprise_payroll_tables.ts): that migration
// defines amount_value/formula_expression/min_limit/max_limit/effective_from
// /effective_to, but PayrollController and PayrollService's condition-based
// override system (matchesComponentCondition/resolveComponentOverrides) read
// and write amount/formula/min_amount/max_amount/effective_from_date/
// effective_to_date, plus condition_on/condition_operator/condition_value1/2/
// months/gender_filter/grades/departments/locations/employees — none of
// which the original migration creates at all. The live database only works
// today because these columns were added out-of-band by direct DB writes.
// A fresh `knex migrate:latest` on a new environment would hit "Unknown
// column" SQL errors on every component create/update, and the condition
// matching would silently see undefined for every condition field.
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_components');
  if (!hasTable) return; // created by 20260807_create_enterprise_payroll_tables.ts first

  const rename = async (from: string, to: string) => {
    const hasFrom = await knex.schema.hasColumn('payroll_components', from);
    const hasTo = await knex.schema.hasColumn('payroll_components', to);
    if (hasFrom && !hasTo) {
      await knex.schema.alterTable('payroll_components', (table) => table.renameColumn(from, to));
    }
  };

  await rename('amount_value', 'amount');
  await rename('formula_expression', 'formula');
  await rename('min_limit', 'min_amount');
  await rename('max_limit', 'max_amount');
  await rename('effective_from', 'effective_from_date');
  await rename('effective_to', 'effective_to_date');

  await knex.schema.alterTable('payroll_components', async (table) => {
    if (!(await knex.schema.hasColumn('payroll_components', 'amount'))) {
      table.decimal('amount', 14, 2).defaultTo(0.00);
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'formula'))) {
      table.text('formula').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'min_amount'))) {
      table.decimal('min_amount', 14, 2).defaultTo(0.00);
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'max_amount'))) {
      table.decimal('max_amount', 14, 2).defaultTo(0.00);
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'effective_from_date'))) {
      table.date('effective_from_date').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'effective_to_date'))) {
      table.date('effective_to_date').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'condition_on'))) {
      table.string('condition_on', 50).nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'condition_operator'))) {
      table.string('condition_operator', 50).nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'condition_value1'))) {
      table.string('condition_value1', 100).nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'condition_value2'))) {
      table.string('condition_value2', 100).nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'months'))) {
      table.json('months').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'gender_filter'))) {
      table.string('gender_filter', 20).defaultTo('All');
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'grades'))) {
      table.json('grades').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'departments'))) {
      table.json('departments').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'locations'))) {
      table.json('locations').nullable();
    }
    if (!(await knex.schema.hasColumn('payroll_components', 'employees'))) {
      table.json('employees').nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  // Additive/renaming-only migration bringing the schema in line with what
  // the application code actually reads and writes — not safely reversible
  // without risking data loss on a live table, so this is a no-op.
}
