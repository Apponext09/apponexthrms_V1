import type { Knex } from 'knex';

// Mass Salary Structure Upload's "Upload Log" tab was pure client-side
// useState — every entry vanished on refresh, with no server record of who
// uploaded what. This gives it real persistence.
export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payroll_mass_upload_logs');
  if (exists) return;

  await knex.schema.createTable('payroll_mass_upload_logs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.uuid('uuid').notNullable().defaultTo(knex.raw('(UUID())'));
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('file_name', 255).notNullable();
    table.string('slab_name', 255).nullable();
    table.integer('total_rows').unsigned().notNullable().defaultTo(0);
    table.integer('success_count').unsigned().notNullable().defaultTo(0);
    table.integer('fail_count').unsigned().notNullable().defaultTo(0);
    table.json('errors').nullable();
    table.bigInteger('uploaded_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['organization_id', 'created_at'], 'pmul_org_created_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_mass_upload_logs');
}
