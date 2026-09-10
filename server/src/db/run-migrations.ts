/**
 * Run knex migrations programmatically using the server's DB config.
 * Usage: tsx ./src/db/run-migrations.ts
 */
import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
    loadExtensions: ['.ts'],
    tableName: 'knex_migrations_server',
  },
});

try {
  console.log('Running migrations...');
  const [batch, migrations] = await db.migrate.latest();
  if (migrations.length === 0) {
    console.log('✓ Already up to date. No new migrations to run.');
  } else {
    console.log(`✓ Batch ${batch} ran ${migrations.length} migration(s):`);
    for (const m of migrations) {
      console.log(`  - ${path.basename(m)}`);
    }
  }
} catch (err) {
  console.error('✗ Migration failed:', err);
  process.exit(1);
} finally {
  await db.destroy();
}
