import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_policies');
  if (exists) return;

  await knex.schema.createTable('attendance_policies', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('code', 50).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.decimal('working_hours_per_day', 4, 2).defaultTo(8.5);
    table.integer('grace_period_minutes').defaultTo(15);
    table.boolean('overtime_enabled').defaultTo(false);
    table.json('overtime_rules').nullable();
    table.json('shift_policies').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'code']);
    table.index('organization_id');
    table.index('is_default');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_policies');
}




