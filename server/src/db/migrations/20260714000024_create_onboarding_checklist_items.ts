import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('onboarding_checklist_items');
  if (exists) return;

  await knex.schema.createTable('onboarding_checklist_items', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('checklist_id').unsigned().notNullable();

    table.string('item_name', 150).notNullable();
    table.text('item_description').nullable();
    table.integer('sequence_order').defaultTo(0);
    table.json('assigned_to_role').nullable(); // JSON array: ['hr_manager', 'department_head']
    table.integer('estimated_days').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('checklist_id').references('onboarding_checklists.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('checklist_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('onboarding_checklist_items');
}




