import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tax_investments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('tax_declaration_id').unsigned().notNullable();
    table.enum('investment_type', ['80c', '80d', '80tta', 'other']).notNullable();
    table.decimal('investment_amount', 15, 2).notNullable();
    table.string('investment_proof_url', 500).nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('tax_declaration_id').references('tax_declarations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('tax_declaration_id');
    table.index('investment_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tax_investments');
}




