import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'hrms'
    });

    console.log(`Connected to database '${process.env.DB_NAME || 'hrms'}' as '${process.env.DB_USER || 'root'}'`);

    // Disable foreign key checks temporarily
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    const [assignments] = await conn.execute('DELETE FROM employee_shift_assignments');
    console.log(`Deleted ${assignments.affectedRows} records from employee_shift_assignments`);

    const [swaps] = await conn.execute('DELETE FROM shift_swap_requests');
    console.log(`Deleted ${swaps.affectedRows} records from shift_swap_requests`);

    const [rotations] = await conn.execute('DELETE FROM shift_rotations');
    console.log(`Deleted ${rotations.affectedRows} records from shift_rotations`);

    const [shifts] = await conn.execute('DELETE FROM shift_templates');
    console.log(`Deleted ${shifts.affectedRows} records from shift_templates`);

    // Re-enable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('All shift template data and related shift records deleted successfully!');

    await conn.end();
  } catch (err) {
    console.error('Error deleting shift data:', err);
    process.exit(1);
  }
})();
