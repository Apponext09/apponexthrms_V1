import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('Database Connected Successfully!');

    const [employees] = await conn.execute('SELECT id FROM employees');
    console.log(`Found ${employees.length} employees to set up relationships.`);

    // Dept IDs: 6 (Engineering), 7 (HR), 8 (Sales), 9 (Finance), 10 (Operations)
    const deptIds = [6, 7, 8, 9, 10];
    // Desg IDs: 9 (Senior Manager), 10 (Manager), 11 (Senior Developer), 12 (Developer), 13 (HR Manager)
    const desgIds = [9, 10, 11, 12, 13];

    // Designate Employee #1 as Top Executive / Manager
    await conn.execute(
      'UPDATE employees SET current_department_id = ?, current_designation_id = ?, reporting_manager_id = NULL WHERE id = 1',
      [6, 9]
    );

    // Designate Employee #2 as HR Manager
    await conn.execute(
      'UPDATE employees SET current_department_id = ?, current_designation_id = ?, reporting_manager_id = 1 WHERE id = 2',
      [7, 13]
    );

    let updatedCount = 2;
    for (let i = 2; i < employees.length; i++) {
      const empId = employees[i].id;
      const deptId = deptIds[i % deptIds.length];
      const desgId = desgIds[i % desgIds.length];
      // Managers cycle between Employee #1 (Narendra Gaikwad), Employee #2 (John Doe), Employee #3
      const mgrId = i % 2 === 0 ? 1 : 2;

      await conn.execute(
        'UPDATE employees SET current_department_id = ?, current_designation_id = ?, reporting_manager_id = ? WHERE id = ?',
        [deptId, desgId, mgrId, empId]
      );
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} employees with real Reporting Manager, Department, and Designation relationships!`);

    await conn.end();
  } catch (err) {
    console.error('Error seeding employee relations:', err);
  }
})();
