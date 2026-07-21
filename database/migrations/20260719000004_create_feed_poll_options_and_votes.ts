import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('feed_poll_options', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('poll_id').notNullable().unsigned();
    table.string('option_text', 500).notNullable();
    table.integer('sort_order').defaultTo(0);
    table.integer('vote_count').unsigned().defaultTo(0); // Denormalized

    // Foreign keys
    table.foreign('poll_id').references('id').inTable('feed_polls').onDelete('CASCADE');

    // Indexes
    table.index('poll_id');
  });

  await knex.schema.createTable('feed_poll_votes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('poll_id').notNullable().unsigned();
    table.bigInteger('option_id').notNullable().unsigned();
    table.bigInteger('employee_id').unsigned().nullable(); // Nullable if anonymous

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('poll_id').references('id').inTable('feed_polls').onDelete('CASCADE');
    table.foreign('option_id').references('id').inTable('feed_poll_options').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Unique constraint: one vote per employee per option (when not anonymous)
    table.unique(['poll_id', 'employee_id', 'option_id'], 'uq_poll_vote_employee_option');

    // Indexes
    table.index('poll_id');
    table.index('employee_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_poll_votes');
  await knex.schema.dropTableIfExists('feed_poll_options');
}

