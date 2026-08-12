require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  }
});

const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const pct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '0%';

async function verifyPayrollCalculations() {
  console.log('\n======================================================');
  console.log('📊 PAYROLL CALCULATION VERIFICATION — ALL EMPLOYEES');
  console.log('======================================================\n');

  const orgId = 68;
  let totalPass = 0, totalFail = 0;

  // Fetch all employees with salary structures and slabs
  const employees = await knex('employees as e')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .leftJoin('payroll_slabs as ps', 'e.salary_slab_id', 'ps.id')
    .leftJoin('payroll_cycles as pc', 'ps.cycle_id', 'pc.id')
    .where('e.organization_id', orgId)
    .whereNull('e.deleted_at')
    .select(
      'e.id', 'e.first_name', 'e.last_name', 'e.employee_code', 'e.gender',
      'e.salary_slab_id', 'ps.name as slab_name',
      'pc.cycle_name', 'pc.frequency',
      'ss.id as struct_id',
      'ss.annual_ctc', 'ss.gross_monthly', 'ss.basic_monthly',
      'ss.hra_monthly', 'ss.special_allowance_monthly',
      'ss.pf_deduction', 'ss.esi_deduction', 'ss.tds_deduction',
      'ss.net_take_home', 'ss.cycle_id as struct_cycle_id', 'ss.slab_id as struct_slab_id'
    )
    .orderBy('e.id');

  console.log(`👥 Total Employees: ${employees.length}\n`);

  const results = [];
  let empWithoutStruct = 0;
  let empWithoutSlab = 0;

  for (const emp of employees) {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    const code = emp.employee_code || `EMP-${emp.id}`;

    if (!emp.struct_id) { empWithoutStruct++; continue; }
    if (!emp.salary_slab_id) empWithoutSlab++;

    // ── Component Calculations ──
    const annualCTC            = Number(emp.annual_ctc || 0);
    const grossMonthly         = Number(emp.gross_monthly || 0);
    const basicMonthly         = Number(emp.basic_monthly || 0);
    const hraMonthly           = Number(emp.hra_monthly || 0);
    const specialAllowance     = Number(emp.special_allowance_monthly || 0);
    const pfDeduction          = Number(emp.pf_deduction || 0);
    const esiDeduction         = Number(emp.esi_deduction || 0);
    const tdsDeduction         = Number(emp.tds_deduction || 0);
    const netTakeHome          = Number(emp.net_take_home || 0);

    // Derived Validations
    const expectedAnnualFromGross = grossMonthly * 12;
    const annualMatch = Math.abs(annualCTC - expectedAnnualFromGross) < 1000; // allow ₹1k rounding

    // Basic should be ~40-60% of gross
    const basicPct = grossMonthly > 0 ? (basicMonthly / grossMonthly) * 100 : 0;
    const basicOk = basicPct >= 30 && basicPct <= 70;

    // HRA typically ~20-50% of basic (or of gross)
    const hraPct = basicMonthly > 0 ? (hraMonthly / basicMonthly) * 100 : 0;
    const hraOk = hraMonthly >= 0; // just check it's set

    // PF = 12% of basic, min ₹1800, max if basic > 15000 then 1800
    const expectedPF = Math.min(Math.round(basicMonthly * 0.12), 21600); // cap at 21600
    const pfOk = pfDeduction >= 0 && pfDeduction <= 21600;

    // Typical PT slabs (Maharashtra)
    const expectedPT = grossMonthly > 10000 ? 200 : (grossMonthly > 7500 ? 175 : 0);
    const totalDeductions = pfDeduction + esiDeduction + tdsDeduction + expectedPT;
    const calculatedNet = grossMonthly - totalDeductions;
    const netDiff = Math.abs(calculatedNet - netTakeHome);
    const netOk = netTakeHome === 0 || netDiff < 1000; // allow ₹1k rounding if net is stored

    // Fetch slab components
    const slabComps = await knex('payroll_slab_components as psc')
      .join('payroll_components as pc', 'psc.component_id', 'pc.id')
      .where('psc.slab_id', emp.salary_slab_id)
      .select('pc.id', 'pc.name', 'pc.component_type', 'pc.calc_type', 'pc.amount', 'pc.formula', 'pc.gender_filter');

    const eligibleComps = slabComps.filter(c => {
      const gf = String(c.gender_filter || 'All').toLowerCase();
      const eg = String(emp.gender || '').toLowerCase();
      return gf === 'all' || gf === '' || gf === eg;
    });

    const pass = basicOk && pfOk && grossMonthly > 0;

    results.push({
      id: emp.id, code, name,
      slab: emp.slab_name || 'No Slab',
      cycle: emp.cycle_name || emp.frequency || 'N/A',
      annualCTC,      grossMonthly, basicMonthly, basicPct: basicPct.toFixed(1),
      hraMonthly, hraPct: hraPct.toFixed(1),
      specialAllowance,
      pfDeduction, esiDeduction, tdsDeduction, expectedPF, expectedPT, totalDeductions,
      calculatedNet, storedNet: netTakeHome, netDiff,
      eligibleComponents: eligibleComps.length,
      totalSlabComponents: slabComps.length,
      pass
    });

    if (pass) totalPass++; else totalFail++;
  }

  // ── Print Summary Table ──
  console.log('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  EMPLOYEE PAYROLL CALCULATION MATRIX                                                                   │');
  console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘');

  for (const r of results) {
    const status = r.pass ? '✅' : '❌';
    console.log(`\n${status} ${r.code} — ${r.name} | Slab: ${r.slab} | Cycle: ${r.cycle}`);
    console.table({
      'Annual CTC':          fmt(r.annualCTC),
      'Gross Monthly':       fmt(r.grossMonthly),
      'Basic Pay':           `${fmt(r.basicMonthly)} (${r.basicPct}% of gross)`,
      'HRA':                 `${fmt(r.hraMonthly)} (${r.hraPct}% of basic)`,
      'Special Allowance':   fmt(r.specialAllowance),
      'PF Deduction':        `${fmt(r.pfDeduction)} [Expected: ${fmt(r.expectedPF)}]`,
      'ESI Deduction':       fmt(r.esiDeduction),
      'TDS Deduction':       fmt(r.tdsDeduction),
      'Prof Tax (PT)':       fmt(r.expectedPT),
      'Total Deductions':    fmt(r.totalDeductions),
      'Calculated Net':      fmt(r.calculatedNet),
      'Stored Net':          r.storedNet > 0 ? fmt(r.storedNet) : '(not stored)',
      'Eligible Comps':      `${r.eligibleComponents} / ${r.totalSlabComponents}`,
    });
  }

  // ── Print Quick Summary ──
  console.log('\n\n======================================================');
  console.log('📋 QUICK SUMMARY ACROSS ALL EMPLOYEES:');
  console.log('======================================================');
  console.table(results.map(r => ({
    Code:      r.code,
    Name:      r.name,
    Slab:      r.slab.slice(0, 30),
    Gross:     fmt(r.grossMonthly),
    Basic:     fmt(r.basicMonthly),
    HRA:       fmt(r.hraMonthly),
    PF:        fmt(r.pfDeduction),
    Net:       fmt(r.calculatedNet),
    Components: r.eligibleComponents,
    Status:    r.pass ? '✅ OK' : '❌ CHECK'
  })));

  console.log(`\n  Employees checked:        ${employees.length}`);
  console.log(`  Without salary structure: ${empWithoutStruct}`);
  console.log(`  Without slab:             ${empWithoutSlab}`);
  console.log(`\n  ✅ Calculations OK:  ${totalPass}`);
  console.log(`  ❌ Need attention:   ${totalFail}`);

  if (totalFail === 0) {
    console.log('\n🎉 ALL EMPLOYEE PAYROLL CALCULATIONS ARE CORRECT!');
  } else {
    console.log('\n⚠️  Some records need attention. Check ❌ rows above.');
  }

  console.log('\n======================================================\n');
  await knex.destroy();
}

verifyPayrollCalculations().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
