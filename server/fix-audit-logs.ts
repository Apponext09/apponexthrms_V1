import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    charset: 'utf8mb4',
  },
});

async function fixAuditLogs() {
  try {
    console.log('Checking audit_logs table...');

    // Check if column exists
    const columns = await db.raw(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'updated_at'
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns[0].length === 0) {
      console.log('Adding updated_at column to audit_logs table...');
      await db.raw(`
        ALTER TABLE audit_logs
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✓ updated_at column added to audit_logs');
    } else {
      console.log('✓ updated_at column already exists in audit_logs');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

fixAuditLogs();
