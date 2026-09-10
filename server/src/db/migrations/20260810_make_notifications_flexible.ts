import type { Knex } from 'knex';

/**
 * Make the notifications table flexible for direct inserts
 * that bypass the notification_templates / notification_events system.
 *
 * Background: The late-mark notification feature inserts rows directly into
 * `notifications` using a LateMarkNotificationService rather than going through
 * the full sendNotification() → event lookup → template render pipeline, because
 * no event/template records exist in the DB yet. Making these columns nullable
 * allows direct inserts while keeping the FK constraint for existing template-based rows.
 *
 * Changes:
 *  1. template_id  → nullable  (was NOT NULL)
 *  2. event_code   → nullable  (was NOT NULL)
 *  3. ADD notification_type VARCHAR(100) — simple label used by direct inserts
 *     (e.g. 'late_mark', 'check_in', 'check_out')
 */
export async function up(knex: Knex): Promise<void> {
  // Guard: only apply if notifications table exists
  const hasTable = await knex.schema.hasTable('notifications');
  if (!hasTable) return;

  // Check and alter nullable columns only if needed
  await knex.schema.alterTable('notifications', (table) => {
    // Make template_id nullable — FK constraint is preserved
    table.bigInteger('template_id').unsigned().nullable().alter();
    // Make event_code nullable
    table.string('event_code', 100).nullable().alter();
  });

  // Add notification_type only if it doesn't already exist
  const hasNotifType = await knex.schema.hasColumn('notifications', 'notification_type');
  if (!hasNotifType) {
    await knex.schema.alterTable('notifications', (table) => {
      table.string('notification_type', 100).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('notifications');
  if (!hasTable) return;

  await knex.schema.alterTable('notifications', (table) => {
    table.string('notification_type', 100).nullable();
  });

  // Note: reversing nullable→NOT NULL on template_id / event_code would require
  // all existing rows to have values, so we leave them nullable on rollback.
}
