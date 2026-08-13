/**
 * Standalone migration script for: 20260810_make_notifications_flexible
 *
 * Applies the ALTER TABLE statements directly via mysql2 since the Knex migrate
 * command fails on a pre-existing TypeScript error in 20260719_create_marketplace_tables.ts.
 *
 * Usage: node run_notification_migration.js
 */

const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ROOT',
    database: process.env.DB_NAME || 'hrms',
    multipleStatements: true,
  });

  console.log('Connected to MySQL. Running notification migration...\n');

  try {
    // Check if notifications table exists
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'`
    );
    if (!tables.length) {
      console.log('ERROR: notifications table does not exist — nothing to do.');
      return;
    }
    console.log('✅ notifications table exists.');

    // Check if template_id is already nullable
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
       AND COLUMN_NAME IN ('template_id', 'event_code', 'notification_type')`
    );

    const colMap = {};
    for (const col of cols) {
      colMap[col.COLUMN_NAME] = col;
    }

    // 1. Make template_id nullable
    if (colMap.template_id) {
      if (colMap.template_id.IS_NULLABLE === 'YES') {
        console.log('ℹ️  template_id is already nullable — skipping.');
      } else {
        await conn.query(
          `ALTER TABLE notifications MODIFY COLUMN template_id BIGINT UNSIGNED NULL`
        );
        console.log('✅ Made template_id nullable.');
      }
    } else {
      console.log('⚠️  template_id column not found — skipping.');
    }

    // 2. Make event_code nullable
    if (colMap.event_code) {
      if (colMap.event_code.IS_NULLABLE === 'YES') {
        console.log('ℹ️  event_code is already nullable — skipping.');
      } else {
        await conn.query(
          `ALTER TABLE notifications MODIFY COLUMN event_code VARCHAR(100) NULL`
        );
        console.log('✅ Made event_code nullable.');
      }
    } else {
      console.log('⚠️  event_code column not found — skipping.');
    }

    // 3. Add notification_type column if not exists
    if (colMap.notification_type) {
      console.log('ℹ️  notification_type column already exists — skipping.');
    } else {
      await conn.query(
        `ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(100) NULL AFTER event_code`
      );
      console.log('✅ Added notification_type column.');
    }

    // Record in knex_migrations table so Knex knows this migration ran
    const migrationName = '20260810_make_notifications_flexible.ts';
    const [migRows] = await conn.query(
      `SELECT id FROM knex_migrations WHERE name = ? LIMIT 1`, [migrationName]
    );
    if (!migRows.length) {
      const [batchRow] = await conn.query(`SELECT COALESCE(MAX(batch), 0) + 1 AS next_batch FROM knex_migrations`);
      await conn.query(
        `INSERT INTO knex_migrations (name, batch, migration_time) VALUES (?, ?, NOW())`,
        [migrationName, batchRow[0].next_batch]
      );
      console.log(`✅ Recorded migration "${migrationName}" in knex_migrations.`);
    } else {
      console.log(`ℹ️  Migration already recorded in knex_migrations — skipping.`);
    }

    console.log('\n✅ Migration complete!');

    // Verify final state
    const [finalCols] = await conn.query(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
       AND COLUMN_NAME IN ('template_id', 'event_code', 'notification_type')
       ORDER BY ORDINAL_POSITION`
    );
    console.log('\nFinal column state:');
    for (const col of finalCols) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE})`);
    }

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
