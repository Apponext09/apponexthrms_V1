/**
 * debug_register_api.cjs
 * Directly calls the PayrollRegisterController logic
 * to debug why it returns 0 employees
 */
const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function main() {
  const targetOrgId = 8;
  const month = '2026-08';
  const cycleId = 13;

  console.log('\n=== DEBUG: PayrollRegisterController Query ===\n');

  // Step 1: Raw employee query (same as controller)
  const rawEmployees = await db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId)
    .select('e.id', 'e.first_name', 'e.employment_type', 'e.status', 'e.company_id')
    .catch(e => { console.log('QUERY ERROR:', e.message); return []; });

  console.log(`Step 1 — Total raw employees returned: ${rawEmployees.length}`);

  // Dedup
  const seen = new Set();
  const employees = rawEmployees.filter(e => {
    if (!e.id || seen.has(e.id)) return false;
    seen.add(e.id); return true;
  });
  console.log(`Step 2 — After dedup: ${employees.length}`);

  // Show first 10
  employees.slice(0, 10).forEach(e =>
    console.log(`  ID:${e.id} ${e.first_name} | status:${e.status} | type:${e.employment_type} | company:${e.company_id}`)
  );

  // Step 2: Cycle info
  const cycleRow = await db('payroll_cycles').where('id', cycleId).first().catch(() => null);
  console.log(`\nStep 3 — Cycle: ${JSON.stringify(cycleRow)}`);

  const [tYear, tMon] = month.split('-').map(Number);
  const calendarDays = new Date(tYear, tMon, 0).getDate();
  const cycleStart = cycleRow?.start_date || cycleRow?.calculation_start_day || 1;
  const cycleCutoff = cycleRow?.cutoff_day || calendarDays;
  const monthStart = `${month}-${String(cycleStart).padStart(2, '0')}`;
  const monthEnd = `${month}-${String(cycleCutoff).padStart(2, '0')}`;
  console.log(`Month range: ${monthStart} to ${monthEnd} (${calendarDays} days)`);

  // Step 3: Salary structures check for first few employees
  console.log('\nStep 4 — Salary structure check for first 5 employees:');
  for (const emp of employees.slice(0, 5)) {
    const ss = await db('salary_structures')
      .where('employee_id', emp.id)
      .where('effective_from', '<=', monthEnd)
      .where(function() { this.whereNull('effective_to').orWhere('effective_to', '>=', monthStart); })
      .whereNull('deleted_at')
      .orderBy('effective_from', 'desc')
      .first().catch(() => null);
    console.log(`  Emp ${emp.id} (${emp.first_name}): SS=${ss ? `ID:${ss.id} CTC:${ss.annual_ctc}` : 'NONE'}`);
  }

  // Step 4: Slabs
  const slabs = await db('payroll_slabs').where('organization_id', targetOrgId).where('is_active', 1).whereNull('deleted_at').catch(() => []);
  console.log(`\nStep 5 — Active slabs: ${slabs.length} (IDs: ${slabs.map(s => s.id).join(', ')})`);

  console.log('\n=== CONCLUSION ===');
  if (employees.length > 0) {
    console.log(`✅ Controller WILL find ${employees.length} employees.`);
    console.log('   If register shows 0, the issue is likely:');
    console.log('   1. The API call is not reaching the server (check network tab)');
    console.log('   2. The cycleId or month is being sent differently');
    console.log('   3. A server error is occurring silently');
  } else {
    console.log('❌ Controller returns 0 employees — check the query above');
  }

  await db.destroy();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
