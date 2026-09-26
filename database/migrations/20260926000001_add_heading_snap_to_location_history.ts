import type { Knex } from 'knex';

// ---------------------------------------------------------------------------
// employee_location_history: keep the raw GPS breadcrumb and the optional
// road-snapped point side by side. latitude/longitude now always hold the
// device's actual position; snapped_* is filled asynchronously when a routing
// engine is reachable, so live tracking never depends on it.
// ---------------------------------------------------------------------------
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('employee_location_history'))) return;

  const columns: Array<[string, (t: Knex.AlterTableBuilder) => void]> = [
    ['heading', (t) => t.decimal('heading', 6, 2).nullable()],
    ['snapped_latitude', (t) => t.decimal('snapped_latitude', 10, 7).nullable()],
    ['snapped_longitude', (t) => t.decimal('snapped_longitude', 10, 7).nullable()],
    ['source', (t) => t.string('source', 16).nullable().comment('socket | http | replay')],
  ];

  for (const [name, add] of columns) {
    if (!(await knex.schema.hasColumn('employee_location_history', name))) {
      await knex.schema.alterTable('employee_location_history', add);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('employee_location_history'))) return;
  for (const name of ['source', 'snapped_longitude', 'snapped_latitude', 'heading']) {
    if (await knex.schema.hasColumn('employee_location_history', name)) {
      await knex.schema.alterTable('employee_location_history', (t) => t.dropColumn(name));
    }
  }
}
