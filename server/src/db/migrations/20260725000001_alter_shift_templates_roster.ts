import type { Knex } from 'knex';

/**
 * Migration: Alter shift_templates to support 'roster' shift type
 * - Remove 'rotational' and 'split' enum values
 * - Add 'roster' enum value
 * - Add 'roster_pattern' JSON column for weekly day assignments
 */

export async function up(knex: Knex): Promise<void> {
  // MySQL requires full MODIFY to change ENUM
  await knex.raw(`
    ALTER TABLE \`shift_templates\`
      MODIFY COLUMN \`shift_type\`
        ENUM('fixed', 'flexible', 'night', 'roster')
        COLLATE utf8mb4_unicode_ci
        DEFAULT 'fixed'
  `);

  // Add roster_pattern JSON column (stores weekly day assignments from the drag-and-drop builder)
  const hasCol = await knex.schema.hasColumn('shift_templates', 'roster_pattern');
  if (!hasCol) {
    await knex.schema.alterTable('shift_templates', (table) => {
      table.json('roster_pattern').nullable().after('description');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Restore original enum (no data will be lost for fixed/flexible/night)
  await knex.raw(`
    ALTER TABLE \`shift_templates\`
      MODIFY COLUMN \`shift_type\`
        ENUM('fixed', 'flexible', 'rotational', 'night', 'split')
        COLLATE utf8mb4_unicode_ci
        DEFAULT 'fixed'
  `);

  const hasCol = await knex.schema.hasColumn('shift_templates', 'roster_pattern');
  if (hasCol) {
    await knex.schema.alterTable('shift_templates', (table) => {
      table.dropColumn('roster_pattern');
    });
  }
}
