import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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

    console.log('Database Connected!');

    // Get all employees
    const [employees] = await conn.execute('SELECT id, organization_id FROM employees');
    console.log(`Found ${employees.length} employees to seed attendance for.`);

    const sampleDates = [
      { date: '2026-07-01', in: '09:02:00', out: '18:05:00', status: 'present', dur: 543, late: 0, early: 0 },
      { date: '2026-07-02', in: '08:55:00', out: '18:15:00', status: 'present', dur: 560, late: 0, early: 0 },
      { date: '2026-07-03', in: '09:10:00', out: '18:00:00', status: 'present', dur: 530, late: 0, early: 0 },
      { date: '2026-07-06', in: '09:00:00', out: '18:30:00', status: 'present', dur: 570, late: 0, early: 0 },
      { date: '2026-07-07', in: '09:15:00', out: '18:10:00', status: 'present', dur: 535, late: 1, early: 0 },
      { date: '2026-07-08', in: '08:58:00', out: '18:00:00', status: 'present', dur: 542, late: 0, early: 0 },
      { date: '2026-07-09', in: '09:05:00', out: '18:20:00', status: 'present', dur: 555, late: 0, early: 0 },
      { date: '2026-07-10', in: '09:12:00', out: '17:50:00', status: 'present', dur: 518, late: 0, early: 1 },
      { date: '2026-07-13', in: '08:50:00', out: '18:15:00', status: 'present', dur: 565, late: 0, early: 0 },
      { date: '2026-07-14', in: '09:00:00', out: '18:00:00', status: 'present', dur: 540, late: 0, early: 0 },
      { date: '2026-07-15', in: '09:25:00', out: '18:35:00', status: 'present', dur: 550, late: 1, early: 0 },
      { date: '2026-07-16', in: '08:58:00', out: '18:10:00', status: 'present', dur: 552, late: 0, early: 0 },
      { date: '2026-07-17', in: '09:05:00', out: '18:00:00', status: 'present', dur: 535, late: 0, early: 0 },
      { date: '2026-07-20', in: '08:52:00', out: '18:25:00', status: 'present', dur: 573, late: 0, early: 0 },
      { date: '2026-07-21', in: '09:01:00', out: '18:05:00', status: 'present', dur: 544, late: 0, early: 0 },
      { date: '2026-07-22', in: '08:59:00', out: '18:15:00', status: 'present', dur: 556, late: 0, early: 0 },
      { date: '2026-07-23', in: '09:10:00', out: '18:00:00', status: 'present', dur: 530, late: 0, early: 0 },
    ];

    let count = 0;
    for (const emp of employees) {
      const empId = emp.id;
      const orgId = emp.organization_id || 3;

      for (const item of sampleDates) {
        const inTimeStr = `${item.date} ${item.in}`;
        const outTimeStr = `${item.date} ${item.out}`;

        // Check if record exists
        const [existing] = await conn.execute(
          'SELECT id FROM attendance_records WHERE employee_id = ? AND (check_in_date = ? OR DATE(check_in_time) = ?)',
          [empId, item.date, item.date]
        );

        if (existing.length === 0) {
          await conn.execute(
            `INSERT INTO attendance_records (
              uuid, organization_id, employee_id, check_in_date, check_in_time, check_out_time,
              check_in_method, check_out_method, duration_minutes, work_duration_minutes, status, is_late, is_early_out,
              created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(), orgId, empId, item.date, inTimeStr, outTimeStr,
              'web_portal', 'web_portal', item.dur, item.dur, item.status,
              item.late, item.early,
              1, 1
            ]
          );
          count++;
        }
      }
    }

    console.log(`SUCCESS! Seeded ${count} attendance records into database.`);
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
