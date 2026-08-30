import type { Knex } from 'knex';

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

  const columnsToAdd: [string, (table: Knex.AlterTableBuilder) => void][] = [
    ['amount', (table) => table.decimal('amount', 14, 2).defaultTo(0.00)],
    ['formula', (table) => table.text('formula').nullable()],
    ['min_amount', (table) => table.decimal('min_amount', 14, 2).defaultTo(0.00)],
    ['max_amount', (table) => table.decimal('max_amount', 14, 2).defaultTo(0.00)],
    ['effective_from_date', (table) => table.date('effective_from_date').nullable()],
    ['effective_to_date', (table) => table.date('effective_to_date').nullable()],
    ['condition_on', (table) => table.string('condition_on', 50).nullable()],
    ['condition_operator', (table) => table.string('condition_operator', 50).nullable()],
    ['condition_value1', (table) => table.string('condition_value1', 100).nullable()],
    ['condition_value2', (table) => table.string('condition_value2', 100).nullable()],
    ['months', (table) => table.json('months').nullable()],
    ['gender_filter', (table) => table.string('gender_filter', 20).defaultTo('All')],
    ['grades', (table) => table.json('grades').nullable()],
    ['departments', (table) => table.json('departments').nullable()],
    ['locations', (table) => table.json('locations').nullable()],
    ['employees', (table) => table.json('employees').nullable()],
  ];

  const missing: typeof columnsToAdd = [];
  for (const entry of columnsToAdd) {
    const [column] = entry;
    if (!(await knex.schema.hasColumn('payroll_components', column))) {
      missing.push(entry);
    }
  }

  if (missing.length > 0) {
    await knex.schema.alterTable('payroll_components', (table) => {
      for (const [, addColumn] of missing) {
        addColumn(table);
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Additive/renaming-only migration bringing the schema in line with what
  // the application code actually reads and writes — not safely reversible
  // without risking data loss on a live table, so this is a no-op.
}
