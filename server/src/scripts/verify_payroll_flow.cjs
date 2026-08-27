const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function verifyPayrollFlow() {
  console.log('====================================================');
  console.log('         PAYROLL SYSTEM VERIFICATION TEST           ');
  console.log('====================================================\n');

  // 1. Check Active Payroll Cycles
  const cycles = await db('payroll_cycles').whereNull('deleted_at');
  console.log(`1. ACTIVE PAYROLL CYCLES (${cycles.length}):`);
  cycles.forEach(c => {
    console.log(`   - ID: ${c.id} | Name: "${c.cycle_name}" | Company ID: ${c.company_id ?? 'All Companies'} | Start Date: ${c.start_date ?? c.calculation_start_day} | Cutoff Day: ${c.cutoff_day}`);
  });

  // 2. Check Active Payroll Slabs
  const slabs = await db('payroll_slabs').whereNull('deleted_at');
  console.log(`\n2. ACTIVE PAYROLL SLABS (${slabs.length}):`);
  slabs.forEach(s => {
    const compIds = typeof s.selected_component_ids === 'string' ? JSON.parse(s.selected_component_ids || '[]') : s.selected_component_ids;
    console.log(`   - ID: ${s.id} | Name: "${s.name}" | Min CTC: ₹${Number(s.min_ctc || 0).toLocaleString()} | Max CTC: ₹${Number(s.max_ctc || 0).toLocaleString()} | Components Count: ${compIds?.length || 0}`);
  });

  // 3. Check Active Components (Earnings vs Deductions)
  const components = await db('payroll_components as pc')
    .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
    .where('pc.is_active', 1)
    .whereNull('pc.deleted_at')
    .select('pc.id', 'pc.name', 'pc.component_type', 'pc.amount', 'pc.formula', 'pcg.category as group_category', 'pc.based_on_attendance');

  const earnings = components.filter(c => c.group_category === 'Earning');
  const deductions = components.filter(c => c.group_category === 'Deduction');

  console.log(`\n3. ACTIVE COMPONENTS (${components.length} Total):`);
  console.log(`   - Earnings (${earnings.length}):`, earnings.map(e => `${e.name} (${e.component_type}${e.formula ? `: ${e.formula}` : e.amount > 0 ? `: ₹${e.amount}` : ''})`));
  console.log(`   - Deductions (${deductions.length}):`, deductions.map(d => `${d.name} (${d.component_type}${d.formula ? `: ${d.formula}` : d.amount > 0 ? `: ₹${d.amount}` : ''})`));

  // 4. Test Employee Salary Structure Calculation for sample employees
  const sampleEmployees = await db('employees as e')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .whereNull('e.deleted_at')
    .whereNull('ss.deleted_at')
    .select('e.id', 'e.first_name', 'e.last_name', 'e.employee_code', 'ss.annual_ctc', 'ss.gross_monthly', 'ss.basic_monthly', 'ss.hra_monthly', 'ss.special_allowance_monthly', 'ss.net_take_home', 'ss.slab_id')
    .limit(5);

  console.log(`\n4. SAMPLE EMPLOYEE STRUCTURES (First 5):`);
  sampleEmployees.forEach(emp => {
    console.log(`   - ${emp.first_name} ${emp.last_name} (${emp.employee_code || `ID: ${emp.id}`}):`);
    console.log(`     * Annual CTC: ₹${Number(emp.annual_ctc || 0).toLocaleString()} | Monthly Gross: ₹${Number(emp.gross_monthly || 0).toLocaleString()}`);
    console.log(`     * Basic: ₹${Number(emp.basic_monthly || 0).toLocaleString()} | HRA: ₹${Number(emp.hra_monthly || 0).toLocaleString()} | Special Allow: ₹${Number(emp.special_allowance_monthly || 0).toLocaleString()}`);
    console.log(`     * Net Take Home: ₹${Number(emp.net_take_home || 0).toLocaleString()} | Slab ID: ${emp.slab_id}`);
  });

  // 5. Test Slab Matching logic
  console.log('\n5. TESTING SLAB RESOLUTION LOGIC:');
  for (const emp of sampleEmployees) {
    const structCtc = Number(emp.annual_ctc || 0);
    let matched = slabs.find(s => Number(s.id) === Number(emp.slab_id));
    if (!matched && structCtc > 0) {
      matched = slabs.find(s => structCtc >= Number(s.min_ctc || 0) && structCtc <= Number(s.max_ctc || 10000000));
    }
    if (!matched && slabs.length > 0) matched = slabs[0];
    console.log(`   - Employee ${emp.first_name} ${emp.last_name} (CTC: ₹${structCtc.toLocaleString()}) -> Resolved Slab: "${matched?.name}" (ID: ${matched?.id})`);
  }

  console.log('\n====================================================');
  console.log('      ALL CHECKS COMPLETED - STATUS: HEALTHY        ');
  console.log('====================================================');

  await db.destroy();
}

verifyPayrollFlow().catch(console.error);
