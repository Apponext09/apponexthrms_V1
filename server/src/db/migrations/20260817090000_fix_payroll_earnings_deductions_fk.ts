import { Knex } from 'knex';

// payroll_earnings/payroll_deductions.component_id was a NOT NULL FK pointing
// at `salary_components` — a table that has zero rows in every organization
// (superseded long ago by `payroll_components`, which is what the rest of the
// payroll module actually uses). Every insert into these two tables has been
// failing its FK/NOT NULL check silently ever since, so no payslip has ever
// had a real itemized earnings/deductions breakdown. Repoint the FK at
// `payroll_components` and make the column nullable, since not every
// generated line item (e.g. an LOP or ad-hoc adjustment row) will have a
// matching catalog component.
export async function up(knex: Knex): Promise<void> {
  const hasEarningsFk = await knex.raw(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_earnings'
     AND CONSTRAINT_NAME = 'payroll_earnings_component_id_foreign'`
  );
  if ((hasEarningsFk[0] as any[]).length > 0) {
    await knex.raw('ALTER TABLE payroll_earnings DROP FOREIGN KEY payroll_earnings_component_id_foreign');
  }
  await knex.raw('ALTER TABLE payroll_earnings MODIFY COLUMN component_id BIGINT UNSIGNED NULL');
  await knex.raw(
    `ALTER TABLE payroll_earnings
     ADD CONSTRAINT payroll_earnings_component_id_foreign
     FOREIGN KEY (component_id) REFERENCES payroll_components(id) ON DELETE SET NULL`
  );

  const hasDeductionsFk = await knex.raw(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_deductions'
     AND CONSTRAINT_NAME = 'payroll_deductions_component_id_foreign'`
  );
  if ((hasDeductionsFk[0] as any[]).length > 0) {
    await knex.raw('ALTER TABLE payroll_deductions DROP FOREIGN KEY payroll_deductions_component_id_foreign');
  }
  await knex.raw('ALTER TABLE payroll_deductions MODIFY COLUMN component_id BIGINT UNSIGNED NULL');
  await knex.raw(
    `ALTER TABLE payroll_deductions
     ADD CONSTRAINT payroll_deductions_component_id_foreign
     FOREIGN KEY (component_id) REFERENCES payroll_components(id) ON DELETE SET NULL`
  );

  const hasLabel = await knex.schema.hasColumn('payroll_deductions', 'component_name');
  if (!hasLabel) {
    await knex.schema.alterTable('payroll_deductions', (table) => {
      table.string('component_name', 255).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasLabel = await knex.schema.hasColumn('payroll_deductions', 'component_name');
  if (hasLabel) {
    await knex.schema.alterTable('payroll_deductions', (table) => {
      table.dropColumn('component_name');
    });
  }
}
