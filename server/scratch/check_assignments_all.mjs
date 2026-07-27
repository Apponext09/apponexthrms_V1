import knex from 'knex';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

(async () => {
  try {
    console.log('Database Connected!');

    console.log('\n--- ALL EMPLOYEES IN ORG 3 ---');
    const emps = await db('employees')
      .select('id', 'first_name', 'last_name', 'organization_id')
      .where('organization_id', 3);
    console.table(emps);

    console.log('\n--- ALL ACTIVE SHIFT ASSIGNMENTS FOR ORG 3 ---');
    const assigns = await db('employee_shift_assignments as ea')
      .join('employees as e', 'ea.employee_id', 'e.id')
      .join('shift_templates as st', 'ea.shift_id', 'st.id')
      .select(
        'ea.id',
        'ea.employee_id',
        'e.first_name',
        'e.last_name',
        'ea.shift_id',
        'st.shift_name',
        'st.shift_code',
        'ea.assignment_start_date',
        'ea.assignment_end_date'
      )
      .where('ea.organization_id', 3);
    console.table(assigns);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.destroy();
  }
})();
