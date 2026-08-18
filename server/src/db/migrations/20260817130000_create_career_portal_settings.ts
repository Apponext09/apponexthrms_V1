import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('career_portal_settings');
  if (!exists) {
    await knex.schema.createTable('career_portal_settings', (table) => {
      table.increments('id').primary();
      table.integer('organization_id').unsigned().notNullable().unique();
      table.string('portal_title', 255).defaultTo('Career Portal');
      table.text('portal_tagline').nullable();
      table.text('banner_description').nullable();
      table.text('company_logo_url').nullable();
      table.string('primary_color', 50).defaultTo('#4f46e5');
      table.boolean('show_account_info').defaultTo(false);
      table.boolean('show_back_to_hrms').defaultTo(true);
      table.text('copyright_text').nullable();
      table.json('form_fields_config').nullable();
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('career_portal_settings');
}
