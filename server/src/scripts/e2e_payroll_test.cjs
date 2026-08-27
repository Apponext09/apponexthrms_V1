/**
 * e2e_payroll_test_v2.cjs
 * Properly detects column names then runs full payroll verification
 */
const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

function normalizeKey(k) {
  return k.toLowerCase().trim().replace(/[()%$#@!]/g, '').replace(/[\s\-_]+/g, '_');
}
function evaluate(formula, ctx) {
  if (!formula || !formula.trim()) return 0;
  let expr = formula.trim();
  const monthly_ctc = Number(ctx.ctc || ctx.monthly_ctc || 0);
  const lookup = {
    ctc: monthly_ctc, monthly_ctc, gross: Number(ctx.gross || monthly_ctc),
    gross_salary: Number(ctx.gross || monthly_ctc),
    basic: Number(ctx.basic || ctx.basic_salary || 0),
    basic_salary: Number(ctx.basic || ctx.basic_salary || 0),
  };
  for (const [k, v] of Object.entries(ctx)) {
    if (typeof v === 'number' && !isNaN(v)) { lookup[normalizeKey(k)] = v; lookup[k.toLowerCase()] = v; }
  }
  expr = expr.replace(/\[\s*([^\]]+?)\s*\]/g, (m, inner) => {
    const norm = normalizeKey(inner);
    return lookup[norm] !== undefined ? String(lookup[norm]) : (lookup[inner.toLowerCase().trim()] !== undefined ? String(lookup[inner.toLowerCase().trim()]) : inner);
  });
  expr = expr.replace(/\bof\b/gi, '*');
  expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1/100)');
  expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(').replace(/\bmax\s*\(/gi, 'Math.max(');
  const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (!key) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expr = expr.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), String(lookup[key]));
  }
  try { const r = eval(expr); return typeof r === 'number' && !isNaN(r) ? r : 0; } catch { return 0; }
}

async function detectCols(table) {
  const [rows] = await db.raw(`DESCRIBE ${table}`);
  return rows.map(r => r.Field);
}

async function main() {
  // Detect actual column names
  const empCols     = await detectCols('employees');
  const ssCols      = await detectCols('salary_structures');
  const runCols     = await detectCols('payroll_runs');
  const runEmpCols  = await detectCols('payroll_run_employees');
  const earningCols = await detectCols('payroll_earnings');
  const dedCols     = await detectCols('payroll_deductions');
  const payslipCols = await detectCols('payslips');

  // Find the right column names
  const fnameCol   = empCols.includes('first_name') ? 'first_name' : 'name';
  const lnameCol   = empCols.includes('last_name') ? 'last_name' : null;
  const genderCol  = empCols.includes('gender') ? 'gender' : null;
  const deptCol    = empCols.includes('current_department_id') ? 'current_department_id' : (empCols.includes('department_id') ? 'department_id' : null);
  const ssCtcCol   = ssCols.includes('annual_ctc') ? 'annual_ctc' : (ssCols.includes('ctc') ? 'ctc' : null);
  const ssGrossCol = ssCols.includes('gross_monthly') ? 'gross_monthly' : (ssCols.includes('gross') ? 'gross' : null);
  const ssBasicCol = ssCols.includes('basic_monthly') ? 'basic_monthly' : (ssCols.includes('basic') ? 'basic' : null);
  const runMonthCol= runCols.includes('run_month') ? 'run_month' : (runCols.includes('month') ? 'month' : runCols.find(c => c.includes('month')));

  console.log('\n🔍 Detected Columns:');
  console.log(`   employees: name=${fnameCol}, gender=${genderCol}, dept=${deptCol}`);
  console.log(`   salary_structures: ctc=${ssCtcCol}, gross=${ssGrossCol}, basic=${ssBasicCol}`);
  console.log(`   payroll_runs: month=${runMonthCol}`);
  console.log(`   payroll_earnings: ${earningCols.slice(0,8).join(', ')}`);
  console.log(`   payslips: ${payslipCols.slice(0,8).join(', ')}`);

  // ── PART A: Check the published payroll run (#27) ──────────────────────
  console.log(`\n${'═'.repeat(65)}`);
  console.log('  PART A — Checking Published Payroll Run #27');
  console.log(`${'═'.repeat(65)}`);

  const runRow = await db('payroll_runs').where('id', 27).first().catch(() => null);
  if (runRow) {
    console.log(`\n  Run #27: Status=${runRow.status} | Month=${runRow[runMonthCol] || 'N/A'}`);
    const runEmps = await db('payroll_run_employees').where('payroll_run_id', 27).select('*').catch(() => []);
    console.log(`  Employees in run: ${runEmps.length}`);

    for (const re of runEmps) {
      const empId = re.employee_id || re.employeeId;
      const empRow = await db('employees').where('id', empId).first().catch(() => null);
      const empName = empRow ? `${empRow[fnameCol] || ''} ${lnameCol ? empRow[lnameCol] || '' : ''}`.trim() : `EMP-${empId}`;
      
      console.log(`\n  👤 ${empName} (ID: ${empId})`);
      console.log(`     Working Days: ${re.working_days || re.workingDays || 'N/A'}`);
      console.log(`     Total Earnings: ₹${Number(re.total_earnings || re.totalEarnings || 0).toLocaleString()}`);
      console.log(`     Total Deductions: ₹${Number(re.total_deductions || re.totalDeductions || 0).toLocaleString()}`);
      console.log(`     Net Salary: ₹${Number(re.net_salary || re.netSalary || 0).toLocaleString()}`);
      console.log(`     Status: ${re.status} | Notes: ${(re.processing_notes || re.processingNotes || '').substring(0, 80)}`);

      // Earnings breakdown
      const earnings = await db('payroll_earnings').where('payroll_run_employee_id', re.id).catch(() => []);
      if (earnings.length > 0) {
        console.log('\n     💚 EARNINGS:');
        earnings.forEach(e => {
          const name = (e.component_name || e.componentName || '').padEnd(36);
          const val = Number(e.actual_value || e.actualValue || 0);
          console.log(`        ${name} ₹${val.toLocaleString().padStart(8)}`);
        });
      }

      // Deductions breakdown  
      const deds = await db('payroll_deductions').where('payroll_run_employee_id', re.id).catch(() => []);
      if (deds.length > 0) {
        console.log('\n     🔴 DEDUCTIONS:');
        deds.forEach(d => {
          const name = (d.component_name || d.componentName || '').padEnd(36);
          const val = Number(d.actual_value || d.actualValue || 0);
          console.log(`        ${name} ₹${val.toLocaleString().padStart(8)}`);
        });
      }

      // Payslip
      const payslip = await db('payslips').where('employee_id', empId).orderBy('id','desc').first().catch(() => null);
      if (payslip) {
        const psNet  = Number(payslip.net_salary || payslip.netSalary || 0);
        const psGross = Number(payslip.gross_salary || payslip.grossSalary || 0);
        const psDed  = Number(payslip.total_deductions || payslip.totalDeductions || 0);
        console.log('\n     📄 PAYSLIP IN DB:');
        console.log(`        Month:      ${payslip.payslip_month || payslip.payslipMonth}`);
        console.log(`        Gross:      ₹${psGross.toLocaleString()}`);
        console.log(`        Deductions: ₹${psDed.toLocaleString()}`);
        console.log(`        Net Pay:    ₹${psNet.toLocaleString()}`);

        // Verify: net = gross - deductions
        const calcNet = psGross - psDed;
        if (Math.abs(calcNet - psNet) <= 1) {
          console.log(`        ✅ Net Pay formula correct (Gross - Deductions = Net)`);
        } else {
          console.log(`        ⚠  Mismatch: ${psGross} - ${psDed} = ${calcNet}, but payslip says ${psNet}`);
        }
      } else {
        console.log('\n     📄 No payslip found in DB');
      }
    }
  }

  // ── PART B: Simulate for employees with actual CTC ──────────────────────
  console.log(`\n${'═'.repeat(65)}`);
  console.log('  PART B — Simulation for Employees with CTC > 0');
  console.log(`${'═'.repeat(65)}`);

  // Find employees that have CTC set
  const ssQuery = db('salary_structures as ss').whereNull('ss.deleted_at');
  if (ssCtcCol) ssQuery.where(db.raw(`COALESCE(ss.${ssCtcCol}, 0) > 0`));
  const empSS = await ssQuery
    .join('employees as e', 'ss.employee_id', 'e.id')
    .where('e.organization_id', 8)
    .orderBy('ss.id', 'desc')
    .select('ss.employee_id', `ss.${ssCtcCol} as ctc`, `ss.${ssGrossCol} as gross`, `ss.${ssBasicCol} as basic`,
            `e.${fnameCol} as fname`, ...(lnameCol ? [`e.${lnameCol} as lname`] : []),
            ...(genderCol ? [`e.${genderCol} as gender`] : []))
    .limit(3)
    .catch(() => []);

  if (empSS.length === 0) {
    // Try without CTC filter
    const allSS = await db('salary_structures as ss')
      .whereNull('ss.deleted_at')
      .join('employees as e', 'ss.employee_id', 'e.id')
      .where('e.organization_id', 8)
      .orderBy('ss.id', 'desc')
      .select('ss.*', `e.${fnameCol} as fname`, ...(lnameCol ? [`e.${lnameCol} as lname`] : []))
      .limit(3)
      .catch(() => []);
    console.log('\n  All salary structure rows:');
    allSS.forEach(r => console.log('  ', JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v]) => v !== null)))));
  } else {
    // Load components once
    const comps = await db('payroll_components as pc')
      .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
      .where('pc.organization_id', 8).where('pc.is_active', 1).whereNull('pc.deleted_at')
      .orderBy('pcg.display_order').orderBy('pc.id')
      .select('pc.*', 'pcg.name as group_name', 'pcg.category as group_category');

    for (const row of empSS) {
      const annualCtc = Number(row.ctc || 0);
      const monthly = row.gross ? Number(row.gross) : Math.round(annualCtc / 12);
      const basic = row.basic ? Number(row.basic) : Math.round(monthly * 0.5);
      const name = `${row.fname || ''} ${row.lname || ''}`.trim() || `EMP-${row.employee_id}`;

      console.log(`\n  👤 ${name} | Annual CTC: ₹${annualCtc.toLocaleString()} | Monthly: ₹${monthly.toLocaleString()}`);

      const ctx = { ctc: monthly, monthly_ctc: monthly, gross: monthly, basic, basic_salary: basic };
      const earnings = [], deductions = [];
      console.log('  💚 EARNINGS:');

      for (const comp of comps) {
        const type = comp.component_type || 'Value';
        let amt = 0;
        if (type === 'Value') amt = Number(comp.amount || 0);
        else if (type === 'Derived') amt = evaluate(comp.formula || '', ctx);
        amt = Math.max(0, Math.round(amt));

        const normName = normalizeKey(comp.name);
        ctx[normName] = amt;
        if ((comp.name || '').toLowerCase().includes('basic')) { ctx.basic = amt; ctx.basic_salary = amt; }

        const cat = (comp.group_category || '').toLowerCase();
        if (cat === 'earning' && amt > 0 && !comp.non_cashable) {
          earnings.push({ name: comp.name, amt });
          console.log(`     ${comp.name.padEnd(38)} ₹${amt.toLocaleString().padStart(8)}`);
        } else if (cat === 'deduction' && amt > 0) {
          deductions.push({ name: comp.name, amt });
        }
      }

      console.log('  🔴 DEDUCTIONS:');
      deductions.forEach(d => console.log(`     ${d.name.padEnd(38)} ₹${d.amt.toLocaleString().padStart(8)}`));

      const te = earnings.reduce((s, e) => s + e.amt, 0);
      const td = deductions.reduce((s, d) => s + d.amt, 0);
      console.log(`  ${'─'.repeat(48)}`);
      console.log(`  Total Earnings: ₹${te.toLocaleString()} | Deductions: ₹${td.toLocaleString()} | Net: ₹${(te-td).toLocaleString()}`);
      console.log(`  CTC Match: ${Math.abs(te - monthly) < 500 ? '✅' : '⚠ diff ₹' + Math.abs(te-monthly)}`);
    }
  }

  console.log(`\n${'═'.repeat(65)}`);
  console.log('  ✅ E2E TEST COMPLETE');
  console.log(`${'═'.repeat(65)}\n`);
  await db.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
