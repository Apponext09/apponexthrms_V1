import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }
});

async function run() {
  try {
    const grades = await db('grades').select('*');
    console.log("Grades Count:", grades.length);
    console.log("Grades:", JSON.stringify(grades, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await db.destroy();
  }
}
run();
