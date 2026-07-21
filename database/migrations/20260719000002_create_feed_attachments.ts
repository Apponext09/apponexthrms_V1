import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('feed_attachments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('feed_post_id').notNullable().unsigned();
    table.enum('attachment_type', ['image', 'video', 'document', 'poll']).notNullable();

    table.string('file_url', 500).notNullable();
    table.bigInteger('file_size').unsigned(); // In bytes
    table.string('mime_type', 100);
    table.string('thumbnail_url', 500).nullable();
    table.integer('duration_seconds').unsigned().nullable(); // For videos

    table.json('metadata_json').nullable(); // Custom metadata (dimensions, video codec, etc.)

    table.bigInteger('uploaded_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('uploaded_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('feed_post_id');
    table.index('attachment_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_attachments');
}

