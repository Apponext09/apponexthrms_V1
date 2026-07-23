import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function run() {
  try {
    const hasColumn = await db.schema.hasColumn('employees', 'custom_id_card');
    if (!hasColumn) {
      await db.schema.table('employees', (table) => {
        table.text('custom_id_card').nullable();
      });
      console.log('SUCCESS: Added custom_id_card column to employees table!');
    } else {
      console.log('SUCCESS: Column custom_id_card already exists!');
    }
  } catch (err: any) {
    console.error('ERROR adding column:', err.message);
  } finally {
    await db.destroy();
  }
}

run();
