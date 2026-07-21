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

async function addDeletedAt() {
  try {
    console.log('Adding deleted_at columns to tables that need them...\n');

    const tables = ['user_roles', 'auth_sessions'];

    for (const tableName of tables) {
      console.log(`Processing ${tableName}...`);

      // Check if column exists
      const columns = await db.raw(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = 'deleted_at'
        AND TABLE_SCHEMA = DATABASE()
      `);

      if (columns[0].length === 0) {
        console.log(`  Adding deleted_at column...`);
        await db.raw(`
          ALTER TABLE ${tableName}
          ADD COLUMN deleted_at TIMESTAMP NULL
        `);
        console.log(`  ✓ deleted_at column added`);
      } else {
        console.log(`  ✓ deleted_at column already exists`);
      }
    }

    console.log('\n✓ All columns added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

addDeletedAt();
