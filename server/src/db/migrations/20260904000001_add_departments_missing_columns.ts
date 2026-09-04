import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('departments');
  if (!hasTable) return;

  const hasEmail = await knex.schema.hasColumn('departments', 'email');
  const hasColour = await knex.schema.hasColumn('departments', 'colour');
  const hasColor = await knex.schema.hasColumn('departments', 'color');
  const hasCompanyId = await knex.schema.hasColumn('departments', 'company_id');
  const hasIsActive = await knex.schema.hasColumn('departments', 'is_active');
  const hasDescription = await knex.schema.hasColumn('departments', 'description');

  await knex.schema.alterTable('departments', (table) => {
    if (!hasEmail) {
      table.string('email', 255).nullable();
    }
    if (!hasColour) {
      table.string('colour', 50).nullable().defaultTo('#00b4d8');
    }
    if (!hasColor) {
      table.string('color', 50).nullable().defaultTo('#00b4d8');
    }
    if (!hasCompanyId) {
      table.bigInteger('company_id').unsigned().nullable();
    }
    if (!hasIsActive) {
      table.string('is_active', 10).nullable().defaultTo('Yes');
    }
    if (!hasDescription) {
      table.text('description').nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('departments');
  if (!hasTable) return;

  const hasEmail = await knex.schema.hasColumn('departments', 'email');
  const hasColour = await knex.schema.hasColumn('departments', 'colour');
  const hasColor = await knex.schema.hasColumn('departments', 'color');
  const hasIsActive = await knex.schema.hasColumn('departments', 'is_active');

  await knex.schema.alterTable('departments', (table) => {
    if (hasEmail) table.dropColumn('email');
    if (hasColour) table.dropColumn('colour');
    if (hasColor) table.dropColumn('color');
    if (hasIsActive) table.dropColumn('is_active');
  });
}
