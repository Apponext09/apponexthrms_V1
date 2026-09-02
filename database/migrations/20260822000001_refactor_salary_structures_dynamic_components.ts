import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSalaryStructures = await knex.schema.hasTable('salary_structures');
  if (!hasSalaryStructures) return;

  // Drop foreign keys if they exist before dropping columns
  try {
    const [fks]: any = await knex.raw(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'salary_structures'
        AND COLUMN_NAME IN ('applicable_to_designation_id', 'applicable_to_location_id')
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (fks && fks.length > 0) {
      for (const row of fks) {
        try {
          await knex.raw(`ALTER TABLE \`salary_structures\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
        } catch (e) {}
      }
    }
  } catch (err) {}

  // 1. Check and drop obsolete columns safely
  const columnsToDrop = [
    'applicable_to_designation_id',
    'applicable_to_location_id',
    'grade_code',
    'description'
  ];

  for (const col of columnsToDrop) {
    const hasCol = await knex.schema.hasColumn('salary_structures', col);
    if (hasCol) {
      try {
        await knex.schema.alterTable('salary_structures', (table) => {
          table.dropColumn(col);
        });
      } catch (e) {
        console.warn(`Could not drop column ${col}:`, (e as any)?.message);
      }
    }
  }

  // 2. Add dynamic JSON component breakup and summary columns
  const hasTotalDeductions = await knex.schema.hasColumn('salary_structures', 'total_deductions');
  if (!hasTotalDeductions) {
    await knex.schema.alterTable('salary_structures', (table) => {
      table.decimal('total_deductions', 15, 2).defaultTo(0.00).after('gross_monthly');
    });
  }

  const hasEarningsBreakup = await knex.schema.hasColumn('salary_structures', 'earnings_breakup');
  if (!hasEarningsBreakup) {
    await knex.schema.alterTable('salary_structures', (table) => {
      table.json('earnings_breakup').nullable().after('net_take_home');
    });
  }

  const hasDeductionsBreakup = await knex.schema.hasColumn('salary_structures', 'deductions_breakup');
  if (!hasDeductionsBreakup) {
    await knex.schema.alterTable('salary_structures', (table) => {
      table.json('deductions_breakup').nullable().after('earnings_breakup');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSalaryStructures = await knex.schema.hasTable('salary_structures');
  if (!hasSalaryStructures) return;

  await knex.schema.alterTable('salary_structures', (table) => {
    table.dropColumn('earnings_breakup');
    table.dropColumn('deductions_breakup');
    table.dropColumn('total_deductions');
  });
}
