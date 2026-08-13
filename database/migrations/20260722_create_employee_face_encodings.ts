import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('employee_face_encodings');
  if (!hasTable) {
    await knex.schema.createTable('employee_face_encodings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().index();
      table.uuid('employee_id').notNullable().unique().index();
      table.text('employee_name').nullable();
      table.jsonb('face_vector').notNullable(); // Stores 128-d float array
      table.boolean('is_active').defaultTo(true);
      table.timestamp('enrolled_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_face_encodings');
}
