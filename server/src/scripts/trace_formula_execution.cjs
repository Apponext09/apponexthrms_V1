/**
 * trace_formula_execution.cjs
 * Simulates the exact PayrollRegisterController component loop for one employee
 * to detect any formula override issues.
 * Uses: ARH001 (empId=115, gross=95000)
 */
const mysql = require('mysql2/promise');

function normalizeKey(key) {
  return key.toLowerCase().trim()
    .replace(/[\(\)\%\$\#\@\!]/g, '')
    .replace(/[\s\-_]+/g, '_');
}

function positiveNum(v, fallback = 0) {
  const n = Number(v);
  return (isFinite(n) && n >= 0) ? n : fallback;
}

function evaluate(formula, context) {
  if (!formula) return 0;
  let expr = formula.trim().replace(/;+\s*$/, '').trim();

  const lookup = {};
  const grossMonthly = Number(context.gross ?? 0);
  const basicMonthly = Number(context.basic ?? 0);
  
  lookup['ctc'] = grossMonthly;
  lookup['monthly_ctc'] = grossMonthly;
  lookup['annual_ctc'] = Number(context.annual_ctc ?? 0);
  lookup['gross'] = grossMonthly;
  lookup['salary_input'] = grossMonthly;
  lookup['gross_salary'] = grossMonthly;
  lookup['basic'] = basicMonthly;
  lookup['basic_salary'] = basicMonthly;
  lookup['basic_earned'] = Number(context.basic_earned ?? 0);
  lookup['present_days'] = Number(context.present_days ?? 30);
  lookup['total_days'] = Number(context.total_days ?? 30);
  lookup['lop_days'] = Number(context.lop_days ?? 0);
  lookup['paid_days'] = Number(context.paid_days ?? 30);
  lookup['attendance_factor'] = Number(context.attendance_factor ?? 1);

  for (const [k, v] of Object.entries(context)) {
    if (typeof v === 'number' && !isNaN(v)) {
      lookup[normalizeKey(k)] = v;
      lookup[k.toLowerCase()] = v;
    }
  }

  // Replace [TOKEN] references
  expr = expr.replace(/\[\s*([^\]]+?)\s*\]/g, (match, innerKey) => {
    const normInner = normalizeKey(innerKey);
    if (lookup[normInner] !== undefined) return String(lookup[normInner]);
    if (lookup[innerKey.toLowerCase().trim()] !== undefined) return String(lookup[innerKey.toLowerCase().trim()]);
    return '0'; // unresolved token = 0
  });

  expr = expr.replace(/\bof\b/gi, '*');
  expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1 / 100)');

  const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
    expr = expr.replace(regex, String(lookup[key]));
  }

  expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(')
    .replace(/\bmax\s*\(/gi, 'Math.max(')
    .replace(/\bround\s*\(/gi, 'Math.round(')
    .replace(/\bceil\s*\(/gi, 'Math.ceil(')
    .replace(/\bfloor\s*\(/gi, 'Math.floor(')
    .replace(/\babs\s*\(/gi, 'Math.abs(');

  try {
    const fn = new Function('Math', `"use strict"; return (${expr});`);
    const result = fn(Math);
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return 0;
  } catch { return 0; }
}

async function trace() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'health'
  });
  const orgId = 8;

  // Load all components with their groups
  const [comps] = await conn.query(
    `SELECT pc.id, pc.name, pc.component_type, pc.formula, pc.amount, pc.based_on_attendance,
            pc.group_id, pg.category as group_category, pg.display_order as group_display_order
     FROM payroll_components pc
     JOIN payroll_component_groups pg ON pg.id = pc.group_id
     WHERE pc.organization_id = ? AND pc.is_active = 1 AND pc.deleted_at IS NULL
     ORDER BY pg.display_order ASC, pc.id ASC`,
    [orgId]
  );

  // Load slab component IDs
  const [slab] = await conn.query('SELECT selected_component_ids FROM payroll_slabs WHERE id = 2');
  const slabIds = new Set(JSON.parse(slab[0].selected_component_ids || '[]').map(Number));

  // Simulate for ARH001: gross=95000, ratio=1.0 (full month)
  const gross = 95000;
  const annualCTC = 1140000;
  const ratio = 1.0;
  const totalDays = 31;
  const paidDays = 31;

  // Current sort logic (only by formula type — same as PayrollRegisterController)
  const oldSorted = [...comps].sort((a, b) => {
    const aF = ['formula','percent'].some(k => (a.component_type||'').toLowerCase().includes(k));
    const bF = ['formula','percent'].some(k => (b.component_type||'').toLowerCase().includes(k));
    if (aF && !bF) return 1;
    if (!aF && bF) return -1;
    return 0;
  });

  const ctx = {
    ctc: gross, monthly_ctc: gross, annual_ctc: annualCTC,
    gross: gross, gross_salary: gross, salary_input: gross,
    gross_earned: Math.round(gross * ratio),
    basic: 0, basic_salary: 0, basic_earned: 0,
    present_days: paidDays, total_days: totalDays,
    lop_days: totalDays - paidDays, paid_days: paidDays,
    attendance_factor: ratio,
    system_calc_days: totalDays, system_extra_paid_days: 0,
    epf_eps_wages: 0, eps_wages: 0, esi_wages: 0,
    pf_employee: 0, eps_component: 0, edli_wages: 0,
  };

  console.log('\n=== FORMULA EXECUTION TRACE (ARH001 gross=₹95,000, full month) ===\n');
  console.log('COMPONENT EVALUATION ORDER & RESULTS:');
  console.log('─'.repeat(90));

  const overrideWarnings = [];
  const seen = {}; // track which ctx keys get set and from which component

  let totalEarnings = 0;
  let totalDeductions = 0;

  for (const comp of oldSorted) {
    if (!slabIds.has(comp.id)) continue;
    const cName = comp.name.toLowerCase();
    
    // Skip special allowance (residual)
    if (cName.includes('special') && cName.includes('allowance')) {
      console.log(`  [SKIP-RESIDUAL] ${comp.name}`);
      continue;
    }

    const isDeduction = comp.group_category === 'Deduction' ||
      ['pf','provident','esic','esi','tax','tds','pt','professional'].some(k => cName.includes(k));

    let val = 0;
    const formula = comp.formula || '';
    const calcType = comp.component_type || '';

    if (formula) {
      val = evaluate(formula, ctx);
    } else if (calcType.toLowerCase() === 'value') {
      val = positiveNum(comp.amount, 0);
    } else {
      val = positiveNum(comp.amount, 0);
    }

    const earnedVal = isDeduction ? val : Math.round(val * ratio);

    // Detect formula override — track what ctx keys this comp will set
    const normKey = normalizeKey(comp.name);

    // Update ctx
    if (cName.includes('basic') && !cName.includes('earned') && !cName.includes('eps') && !cName.includes('epf')) {
      const prevBasic = ctx.basic;
      if (prevBasic !== 0 && prevBasic !== val) {
        overrideWarnings.push(`⚠️  OVERRIDE: [BASIC] was ${prevBasic}, now overwritten to ${val} by "${comp.name}"`);
      }
      ctx.basic = val;
      ctx.basic_salary = val;
      ctx.basic_earned = Math.round(val * ratio);
    }
    if (cName.includes('epf') && cName.includes('eps') && cName.includes('wages')) {
      ctx.epf_eps_wages = val;
    }
    if (cName.includes('eps') && cName.includes('component')) ctx.eps_component = val;
    if (cName.includes('eps') && cName.includes('wages') && !cName.includes('epf')) ctx.eps_wages = val;
    if (cName.includes('esi') && cName.includes('wages') && !cName.includes('esic')) ctx.esi_wages = val;
    if ((cName.includes('esic') || cName.includes('esi')) && !cName.includes('wages') && !cName.includes('employer')) {
      ctx.pf_employee = val; // tracker
    }

    const prevCtxVal = ctx[normKey];
    if (prevCtxVal !== undefined && prevCtxVal !== 0 && prevCtxVal !== val) {
      overrideWarnings.push(`⚠️  KEY COLLISION: ctx["${normKey}"] was ${prevCtxVal}, now ${val} — set by "${comp.name}"`);
    }
    ctx[normKey] = val;

    if (!isDeduction) totalEarnings += earnedVal;
    else totalDeductions += earnedVal;

    const flag = isDeduction ? '[DED]' : '[EAR]';
    const formulaStr = formula ? `  formula: ${formula}` : `  fixed: ₹${comp.amount}`;
    console.log(`  ${flag} ID:${String(comp.id).padStart(3)} | grp_order:${comp.group_display_order} | ${comp.name.padEnd(32)} = ₹${String(val).padStart(8)} | earned:₹${String(earnedVal).padStart(8)}${formulaStr}`);
  }

  const specialAllow = Math.max(0, gross - totalEarnings);
  
  console.log('\n─'.repeat(90));
  console.log(`  [RESIDUAL]     Special Allowance                    = ₹${String(specialAllow).padStart(8)}`);
  console.log('\n─'.repeat(90));
  console.log(`  TOTAL EARNINGS:    ₹${totalEarnings + specialAllow}`);
  console.log(`  TOTAL DEDUCTIONS:  ₹${totalDeductions}`);
  console.log(`  NET SALARY:        ₹${Math.max(0, (totalEarnings + specialAllow) - totalDeductions)}`);

  console.log('\n=== OVERRIDE / COLLISION WARNINGS ===');
  if (overrideWarnings.length === 0) {
    console.log('  ✅ No overrides or key collisions detected');
  } else {
    overrideWarnings.forEach(w => console.log(' ', w));
  }

  // Check for "Earned" components that duplicate base component values
  console.log('\n=== EARNED vs BASE COMPONENT ANALYSIS ===');
  const earnedComps = comps.filter(c => c.name.toLowerCase().includes('earned') && slabIds.has(c.id));
  for (const ec of earnedComps) {
    console.log(`  "${ec.name}" formula="${ec.formula}" — references base value`);
    const refName = ec.formula?.replace(/[\[\]]/g, '').trim() || '';
    console.log(`    -> references: "${refName}" in ctx = ${ctx[normalizeKey(refName)] ?? 'UNRESOLVED'}`);
  }

  await conn.end();
  process.exit(0);
}

trace().catch(e => { console.error(e.message); process.exit(1); });
