import type { Knex } from 'knex';

/**
 * Payroll calculation-engine hardening:
 *  - payroll_components: explicit statutory classification + deterministic
 *    evaluation order, replacing scattered name-substring heuristics.
 *  - payroll_settings: organization-level money rounding policy.
 *
 * Existing rows are heuristically back-filled so behaviour is unchanged for
 * data that predates the columns.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('payroll_components')) {
    const add: Array<[string, (t: Knex.AlterTableBuilder) => void]> = [
      ['statutory_code', (t) => t.string('statutory_code', 20).nullable().comment('epf|eps|vpf|esi|pt|tds|lwf|gratuity')],
      ['is_statutory', (t) => t.boolean('is_statutory').notNullable().defaultTo(false)],
      ['calculation_order', (t) => t.integer('calculation_order').nullable()],
    ];
    for (const [col, builder] of add) {
      if (!(await knex.schema.hasColumn('payroll_components', col))) {
        await knex.schema.alterTable('payroll_components', builder);
      }
    }

    // Heuristic back-fill (mirrors utils/payroll.classify.ts fallback rules).
    // `code` values are hard-coded literals below — safe to inline; avoids
    // knex treating '?' inside REGEXP literals as a bind placeholder.
    const like = (frag: string) => `LOWER(name) LIKE '%${frag}%'`;
    const rx = (pat: string) => `LOWER(name) REGEXP '${pat}'`;
    const setCode = (code: string, whereSql: string) =>
      knex.raw(
        `UPDATE payroll_components SET statutory_code = '${code}', is_statutory = 1
         WHERE statutory_code IS NULL AND (${whereSql})`
      );
    await setCode('tds', `${like('tds')} OR ${like('income tax')} OR ${like('tax deducted')}`);
    await setCode('esi', `${rx('(^|[^a-z])esic?([^a-z]|$)')} OR ${like('employee state insurance')}`);
    await setCode('pt', `${like('professional tax')} OR ${like('prof tax')} OR ${rx('(^|[^a-z])p[.]?t[.]?([^a-z]|$)')}`);
    await setCode('lwf', `${like('lwf')} OR ${like('labour welfare')} OR ${like('labor welfare')}`);
    await setCode('vpf', `${like('vpf')} OR ${like('voluntary provident')}`);
    await setCode('eps', `${like('pension scheme')} OR ${rx('(^|[^a-z])eps([^a-z]|$)')}`);
    await setCode('epf', `${like('provident fund')} OR ${like('epf')} OR ${rx('(^|[^a-z])pf([^a-z]|$)')}`);
    await setCode('gratuity', like('gratuity'));
  }

  if (await knex.schema.hasTable('payroll_settings')) {
    if (!(await knex.schema.hasColumn('payroll_settings', 'rounding_mode'))) {
      await knex.schema.alterTable('payroll_settings', (t) => {
        t.string('rounding_mode', 20).notNullable().defaultTo('half_up').comment('half_up|half_even|ceil|floor|none');
      });
    }
    if (!(await knex.schema.hasColumn('payroll_settings', 'rounding_nearest'))) {
      await knex.schema.alterTable('payroll_settings', (t) => {
        t.decimal('rounding_nearest', 8, 2).notNullable().defaultTo(0).comment('round to nearest N rupees; 0 = keep paise');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const col of ['statutory_code', 'is_statutory', 'calculation_order']) {
    if (await knex.schema.hasColumn('payroll_components', col)) {
      await knex.schema.alterTable('payroll_components', (t) => t.dropColumn(col));
    }
  }
  for (const col of ['rounding_mode', 'rounding_nearest']) {
    if (await knex.schema.hasColumn('payroll_settings', col)) {
      await knex.schema.alterTable('payroll_settings', (t) => t.dropColumn(col));
    }
  }
}
