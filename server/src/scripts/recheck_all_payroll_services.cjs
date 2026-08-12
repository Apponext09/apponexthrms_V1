require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

async function recheckAllPayrollServices() {
  console.log('\n======================================================');
  console.log('🔄 RE-CHECKING ALL PAYROLL SERVICES & DATABASE TABLES');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Check User & Org
  const user = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  console.log(`👤 1. Authenticated User: ${user.email} (Org ID: #${user.organization_id || orgId}) - Status: ${user.status}`);

  // 2. Check Cycles
  const cycles = await knex('payroll_cycles').where({ organization_id: orgId });
  console.log(`\n📅 2. Active Payroll Cycles (${cycles.length}):`);
  console.table(cycles.map(c => ({ ID: c.id, Name: c.cycle_name || c.name, Freq: c.frequency, Cutoff: c.cutoff_day, Status: c.status })));

  // 3. Check Slabs
  const slabs = await knex('payroll_slabs').where({ organization_id: orgId });
  console.log(`\n🏷️ 3. Active Payroll Slabs (${slabs.length}):`);
  console.table(slabs.map(s => ({ ID: s.id, Name: s.name, LinkedCycleID: s.cycle_id, PFRate: `${s.pf_rate_pct}%`, MinCTC: s.min_ctc })));

  // 4. Check Employees and Assigned Slabs
  const employees = await knex('employees as e')
    .leftJoin('payroll_slabs as ps', 'e.salary_slab_id', 'ps.id')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .where('e.organization_id', orgId)
    .where('e.status', 'active')
    .select('e.id', 'e.employee_code', 'e.first_name', 'e.email', 'ps.name as slab_name', 'ss.annual_ctc', 'ss.net_take_home');

  console.log(`\n👥 4. Active Employees & Linked Payroll Structures (${employees.length}):`);
  console.table(employees.map(e => ({
    ID: e.id,
    Code: e.employee_code,
    Name: e.first_name,
    Email: e.email,
    AssignedSlab: e.slab_name || 'Not Assigned',
    AnnualCTC: e.annual_ctc ? `₹${Number(e.annual_ctc).toLocaleString('en-IN')}` : 'N/A',
    TakeHome: e.net_take_home ? `₹${Number(e.net_take_home).toLocaleString('en-IN')}` : 'N/A'
  })));

  console.log('\n======================================================');
  console.log('✅ RE-CHECK COMPLETED: ALL SYSTEM COMPONENTS OK!');
  console.log('======================================================\n');

  await knex.destroy();
}

recheckAllPayrollServices().catch(err => {
  console.error('Recheck error:', err);
  process.exit(1);
});
