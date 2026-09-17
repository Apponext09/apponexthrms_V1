import knex from 'knex';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(root, 'server/.env'), quiet: true });
dotenv.config({ path: path.join(root, '.env'), quiet: true });
const db = knex({ client: 'mysql2', connection: {
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
}, migrations: { directory: path.join(root, 'server/src/db/migrations'), loadExtensions: ['.ts'], disableMigrationsListValidation: true } });
try {
  const result = await db.migrate.up({ name: '20260913000001_expense_workflow_execution.ts' });
  console.log('Expense workflow migration:', result);
} catch (e: any) { console.error('Expense workflow migration failed:', e.message); process.exitCode = 1; }
finally { await db.destroy(); }
