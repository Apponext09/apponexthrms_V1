const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function verifyOrganizedPayroll() {
  const emps = await db('employees').where('organization_id', 8).whereNull('deleted_at').limit(3);
  const comps = await db('payroll_components').where('organization_id', 8).where('is_active', 1);
  const groups = await db('payroll_component_groups').where('organization_id', 8).where('is_active', 1);

  console.log(`Loaded ${comps.length} active components across ${groups.length} groups.`);

  for (const emp of emps) {
    const struct = await db('salary_structures').where('employee_id', emp.id).first();
    const gross = struct ? Number(struct.gross_monthly) : 45000;
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = 1600;
    const medical = 1250;
    const special = Math.max(0, gross - (basic + hra + conveyance + medical));
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = 200;
    const net = gross - (pf + pt);

    console.log(`\nEmployee: ${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
    console.log(`  Gross Monthly: ₹${gross.toLocaleString('en-IN')}`);
    console.log(`  Basic (50%): ₹${basic.toLocaleString('en-IN')}`);
    console.log(`  HRA (40% Basic): ₹${hra.toLocaleString('en-IN')}`);
    console.log(`  Special Allowance: ₹${special.toLocaleString('en-IN')}`);
    console.log(`  PF (12% capped): ₹${pf.toLocaleString('en-IN')}`);
    console.log(`  PT: ₹${pt}`);
    console.log(`  Net Pay: ₹${net.toLocaleString('en-IN')}`);
  }

  await db.destroy();
}

verifyOrganizedPayroll().catch(console.error);
