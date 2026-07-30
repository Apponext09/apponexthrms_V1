import { initializeKnex, getKnex } from '../src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  initializeKnex();
  const db = getKnex();
  try {
    const [tablesRes]: any = await db.raw("SHOW TABLES");
    const dbTables = tablesRes.map((r: any) => Object.values(r)[0] as string);

    console.log("=== ALL EXISTING DB TABLES ===");
    console.log(JSON.stringify(dbTables, null, 2));

    const leaveRelatedTables = [
      'leave_types',
      'leave_applications',
      'leave_application_days',
      'leave_balances',
      'leave_policy_assignments',
      'leave_policies',
      'leave_policy_mappings',
      'leave_approvals',
      'leave_ledger_entries',
      'leave_lop_records',
      'employee_leave_locks',
      'leave_cancellations',
      'leave_audit_logs',
      'leave_delegations',
      'leave_carry_forward',
      'comp_off_requests',
      'comp_off_balances',
      'leave_encashments',
      'leave_accruals',
      'optional_holiday_selections',
      'holidays',
      'holiday_calendars'
    ];

    const result: any = {};
    for (const table of leaveRelatedTables) {
      if (dbTables.includes(table)) {
        const [cols]: any = await db.raw(`DESCRIBE ${table}`);
        result[table] = {
          exists: true,
          columns: cols.map((c: any) => ({ name: c.Field, type: c.Type, null: c.Null, default: c.Default }))
        };
      } else {
        result[table] = {
          exists: false,
          columns: []
        };
      }
    }

    console.log("=== LEAVE MODULE TABLES & COLUMNS ANALYSIS ===");
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('Error during analysis:', err);
  } finally {
    process.exit(0);
  }
}

run();
