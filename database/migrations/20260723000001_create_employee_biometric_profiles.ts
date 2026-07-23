import type { Knex } from 'knex';

const TABLE = 'employee_biometric_profiles';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable(TABLE);
  if (exists) return;

  await knex.schema.createTable(TABLE, (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.string('employee_code', 50).notNullable();
    table.string('employee_name', 255).notNullable();
    table.string('embedding_model', 64).notNullable();
    table.json('face_vector').notNullable();
    table.longText('profile_photo').nullable();
    table.decimal('quality_score', 5, 2).nullable();
    table.integer('sample_count').unsigned().notNullable().defaultTo(1);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('enrolled_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_verified_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['organization_id', 'employee_id'], {
      indexName: 'uq_biometric_profile_org_employee',
    });
    table.index(['organization_id', 'is_active'], 'idx_biometric_profile_org_active');
    table.foreign('organization_id').references('organizations.id').onDelete('CASCADE');
    table.foreign('employee_id').references('employees.id').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TABLE);
}

