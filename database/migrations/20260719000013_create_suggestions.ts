import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('suggestions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable().unsigned();

    table.bigInteger('author_id').unsigned().nullable(); // Nullable if anonymous

    table.string('title', 500).notNullable();
    table.text('description').nullable();

    table.enum('category', [
      'process',
      'workplace',
      'product',
      'cost_saving',
      'innovation',
      'culture',
      'other',
    ]).notNullable();

    table.enum('submission_type', ['anonymous', 'public', 'private']).defaultTo('public');

    table.enum('status', [
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'implemented',
      'duplicate',
    ]).defaultTo('submitted');

    table.enum('visibility_level', ['private', 'department', 'all']).defaultTo('all');

    // Denormalized counts
    table.integer('upvote_count').unsigned().defaultTo(0);
    table.integer('downvote_count').unsigned().defaultTo(0);

    table.decimal('impact_score', 5, 2).nullable(); // Estimated by HR
    table.enum('implementation_priority', ['low', 'medium', 'high', 'critical']).nullable();

    table.bigInteger('assigned_to_user_id').unsigned().nullable(); // HR assignment
    table.text('hr_response').nullable();
    table.bigInteger('hr_responded_by').unsigned().nullable();
    table.datetime('hr_responded_at').nullable();
    table.datetime('status_updated_at').nullable();
    table.date('implementation_date').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('author_id').references('id').inTable('employees').onDelete('SET NULL');
    table.foreign('assigned_to_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('hr_responded_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'status', 'created_at'], 'idx_suggestions_org_status_date');
    table.index('author_id');
    table.index('implementation_priority');
    table.index(['upvote_count', 'created_at'], 'idx_suggestions_trending');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('suggestions');
}

