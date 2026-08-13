import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasLopDays = await knex.schema.hasColumn('leave_applications', 'lop_days');
  const hasPoolId = await knex.schema.hasColumn('leave_applications', 'pool_leave_type_id');

  await knex.schema.alterTable('leave_applications', (table) => {
    if (!hasLopDays) {
      table.decimal('lop_days', 5, 2).defaultTo(0);
    }
    if (!hasPoolId) {
      table.bigInteger('pool_leave_type_id').unsigned().nullable();
    }
    table.string('status', 50).defaultTo('submitted').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_applications', (table) => {
    table.dropColumn('lop_days');
    table.dropColumn('pool_leave_type_id');
  });
}
