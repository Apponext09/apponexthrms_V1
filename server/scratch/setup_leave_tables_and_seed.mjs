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

    console.log('Database Connected Successfully!');

    // Fetch active organizations
    const [orgs] = await conn.execute('SELECT id FROM organizations');
    const defaultOrgId = orgs.length > 0 ? orgs[0].id : 3;

    // Get all leave types for defaultOrgId
    const [leaveTypes] = await conn.execute('SELECT * FROM leave_types WHERE organization_id = ?', [defaultOrgId]);

    // Fetch employees
    const [employees] = await conn.execute('SELECT id, organization_id FROM employees');
    console.log(`Found ${employees.length} employees to allocate leave balances.`);

    const fyStart = '2026-04-01';

    let seededBalances = 0;
    for (const emp of employees) {
      const empOrg = emp.organization_id || defaultOrgId;
      for (const lt of leaveTypes) {
        const allocated = parseFloat(lt.default_allowance_days || 10);
        const consumed = lt.leave_code === 'CL' ? 2 : lt.leave_code === 'SL' ? 1 : 0;
        const available = Math.max(0, allocated - consumed);

        const [existingBal] = await conn.execute(
          'SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND financial_year_start = ?',
          [emp.id, lt.id, fyStart]
        );

        if (existingBal.length === 0) {
          await conn.execute(
            `INSERT INTO leave_balances (uuid, organization_id, employee_id, leave_type_id, financial_year_start, allocated_balance, consumed_balance, pending_approval_balance, available_balance)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), empOrg, emp.id, lt.id, fyStart, allocated, consumed, 0, available]
          );
          seededBalances++;
        }
      }
    }
    console.log(`Seeded ${seededBalances} leave balance records!`);

    // Seed sample leave applications for history
    if (employees.length > 0) {
      for (const emp of employees.slice(0, 5)) {
        const sampleOrg = emp.organization_id || defaultOrgId;
        const clType = leaveTypes.find(t => t.leave_code === 'CL') || leaveTypes[0];
        const slType = leaveTypes.find(t => t.leave_code === 'SL') || leaveTypes[0];
        const elType = leaveTypes.find(t => t.leave_code === 'EL') || leaveTypes[0];

        const sampleApps = [
          {
            typeId: clType.id,
            fromDate: '2026-07-10',
            toDate: '2026-07-11',
            days: 2,
            reason: 'Family urgent function & personal travel',
            status: 'approved'
          },
          {
            typeId: slType.id,
            fromDate: '2026-07-18',
            toDate: '2026-07-18',
            days: 1,
            reason: 'Fever and doctor consultation',
            status: 'approved'
          },
          {
            typeId: elType.id,
            fromDate: '2026-08-01',
            toDate: '2026-08-03',
            days: 3,
            reason: 'Annual family vacation trip',
            status: 'pending'
          }
        ];

        for (const app of sampleApps) {
          const [existingApp] = await conn.execute(
            `SELECT id FROM leave_applications WHERE employee_id = ? AND from_date = ? AND leave_type_id = ?`,
            [emp.id, app.fromDate, app.typeId]
          );

          if (existingApp.length === 0) {
            await conn.execute(
              `INSERT INTO leave_applications (
                uuid, organization_id, employee_id, leave_type_id, from_date, to_date,
                duration_days, reason, status, created_by, updated_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(), sampleOrg, emp.id, app.typeId, app.fromDate, app.toDate,
                app.days, app.reason, app.status, 1, 1
              ]
            );
          }
        }
      }
      console.log('Seeded sample leave applications for history successfully!');
    }

    await conn.end();
    console.log('Leave Database Setup & Seeding 100% Complete!');
  } catch (err) {
    console.error('Error in Leave DB Setup:', err);
  }
})();
