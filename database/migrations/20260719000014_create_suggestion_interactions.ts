import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Suggestion votes
  await knex.schema.createTable('suggestion_votes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('suggestion_id').notNullable().unsigned();
    table.bigInteger('employee_id').notNullable().unsigned();
    table.enum('vote_type', ['upvote', 'downvote']).notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('suggestion_id').references('id').inTable('suggestions').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Unique constraint: one vote per employee per suggestion
    table.unique(['suggestion_id', 'employee_id'], 'uq_suggestion_vote_employee');

    // Indexes
    table.index('suggestion_id');
    table.index('employee_id');
  });

  // Suggestion comments/discussion
  await knex.schema.createTable('suggestion_comments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('suggestion_id').notNullable().unsigned();

    table.bigInteger('author_id').notNullable().unsigned();
    table.text('comment_text').notNullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('suggestion_id').references('id').inTable('suggestions').onDelete('CASCADE');
    table.foreign('author_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('suggestion_id');
    table.index('author_id');
  });

  // Suggestion attachments
  await knex.schema.createTable('suggestion_attachments', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('suggestion_id').notNullable().unsigned();

    table.string('file_url', 500).notNullable();
    table.string('file_name', 255).notNullable();
    table.bigInteger('file_size').unsigned();
    table.string('mime_type', 100);

    table.bigInteger('uploaded_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('suggestion_id').references('id').inTable('suggestions').onDelete('CASCADE');
    table.foreign('uploaded_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('suggestion_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('suggestion_attachments');
  await knex.schema.dropTableIfExists('suggestion_comments');
  await knex.schema.dropTableIfExists('suggestion_votes');
}

