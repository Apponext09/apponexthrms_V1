import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('company');
  if (!hasTable) {
    await knex.schema.createTable('company', (table) => {
      table.increments('company_id').primary();
      table.string('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().nullable();
      table.string('code').notNullable();
      table.string('name').notNullable();
      table.string('employer_name').nullable();
      table.string('class_of_establishment').nullable();
      table.string('address_line_1').nullable();
      table.string('address_line_2').nullable();
      table.string('country').nullable();
      table.string('zip_code').nullable();
      table.string('state').nullable();
      table.string('city').nullable();
      table.string('pan_tin').nullable();
      table.string('contact_number').nullable();
      table.string('email').nullable();
      table.string('logo').nullable();
      table.string('company_stamp').nullable();
      table.string('signature').nullable();
      table.boolean('is_active_toggle').defaultTo(true);
      table.boolean('active_users_toggle').defaultTo(true);
      table.boolean('login_page_logo_toggle').defaultTo(false);
      table.text('description').nullable();
      table.string('status').defaultTo('Active');
      
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('company');
}
