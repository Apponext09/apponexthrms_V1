import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('exit_requests'))) return;
  const add = async (name: string, callback: (table: Knex.TableBuilder) => void) => {
    if (!(await knex.schema.hasColumn('exit_requests', name))) {
      await knex.schema.alterTable('exit_requests', callback);
    }
  };
  await add('subject', (table) => table.string('subject', 255).nullable().after('last_working_day'));
  await add('description', (table) => table.text('description').nullable().after('subject'));
  await add('review_comment', (table) => table.text('review_comment').nullable().after('approval_date'));
  await add('reviewed_at', (table) => table.timestamp('reviewed_at').nullable().after('review_comment'));
  await add('rejected_by', (table) => table.bigInteger('rejected_by').unsigned().nullable().after('reviewed_at'));
}

export async function down(knex: Knex): Promise<void> {
  // Retain resignation history during rollback.
}
