/**
 * diagnose_payroll_emp.cjs
 * For a given employee + month, shows EXACTLY what PayrollService will read:
 *  1. Salary Structure (CTC, gross, basic, slab)
 *  2. Slab → which components are selected
 *  3. Attendance for the month (present/absent/LOP days)
 *  4. Component-by-component calculation with pro-rating
 *  5. Final expected payslip vs what's in DB
 *
 * Usage: node diagnose_payroll_emp.cjs [employeeId] [YYYY-MM]
 * Default: first employee with salary structure, current month
 */

const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

// ── Mini formula evaluator ─────────────────────────────────────────────────
function normalizeKey(k) {
  return k.toLowerCase().trim().replace(/[()%$#@!]/g, '').replace(/[\s\-_]+/g, '_');
}
function evaluate(formula, ctx) {
  if (!formula || !formula.trim()) return 0;
  let expr = formula.trim();
  const ctc = Number(ctx.ctc || ctx.monthly_ctc || 0);
  const lookup = {
    ctc, monthly_ctc: ctc, gross: Number(ctx.gross || ctc),
    gross_salary: Number(ctx.gross || ctc),
    basic: Number(ctx.basic || ctx.basic_salary || 0),
    basic_salary: Number(ctx.basic || ctx.basic_salary || 0),
  };
  for (const [k, v] of Object.entries(ctx)) {
    if (typeof v === 'number' && !isNaN(v)) {
      lookup[normalizeKey(k)] = v;
      lookup[k.toLowerCase()] = v;
    }
  }
  expr = expr.replace(/\[\s*([^\]]+?)\s*\]/g, (m, inner) => {
    const norm = normalizeKey(inner);
    if (lookup[norm] !== undefined) return String(lookup[norm]);
    if (lookup[inner.toLowerCase().trim()] !== undefined) return String(lookup[inner.toLowerCase().trim()]);
    return inner;
  });
  expr = expr.replace(/\bof\b/gi, '*');
  expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1/100)');
  expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(').replace(/\bmax\s*\(/gi, 'Math.max(');
  const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (!key) continue;
    expr = expr.replace(new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), String(lookup[key]));
  }
  try { const r = eval(expr); return typeof r === 'number' && !isNaN(r) ? r : 0; } catch { return 0; }
}

function fmt(n) { return `₹${Math.round(n).toLocaleString('en-IN')}`; }
function pad(s, n) { return String(s || '').padEnd(n); }

async function main() {
  const empId = parseInt(process.argv[2]) || 126; // default: Rahul Sharma
  const runMonth = process.argv[3] || '2026-08'; // YYYY-MM

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  PAYROLL DIAGNOSIS — Employee ID: ${empId} | Month: ${runMonth}`);
  console.log(`${'═'.repeat(70)}`);

  // ── 1. Employee Profile ──────────────────────────────────────────────────
  const emp = await db('employees').where('id', empId).first().catch(() => null);
  if (!emp) { console.log('\n❌ Employee not found'); await db.destroy(); return; }

  console.log(`\n📋 EMPLOYEE PROFILE`);
  console.log(`   Name:          ${emp.first_name} ${emp.last_name || ''}`);
  console.log(`   Gender:        ${emp.gender || 'N/A'}`);
  console.log(`   Department ID: ${emp.current_department_id || 'N/A'}`);
  console.log(`   Employment:    ${emp.employment_type || 'N/A'}`);
  console.log(`   Joining Date:  ${emp.date_of_joining || 'N/A'}`);

  // ── 2. Salary Structure ──────────────────────────────────────────────────
  const periodEnd = `${runMonth}-31`;
  const periodStart = `${runMonth}-01`;
  const struct = await db('salary_structures')
    .where('employee_id', empId)
    .where('effective_from', '<=', periodEnd)
    .where(function() { this.whereNull('effective_to').orWhere('effective_to', '>=', periodStart); })
    .whereNull('deleted_at')
    .orderBy('effective_from', 'desc')
    .first()
    .catch(() => null)
    || await db('salary_structures').where('employee_id', empId).whereNull('deleted_at').orderBy('id', 'desc').first().catch(() => null);

  if (!struct) {
    console.log('\n❌ No salary structure found for this employee!');
    await db.destroy(); return;
  }

  const resolvedGross = Number(struct.gross_monthly || 0) || Math.round(Number(struct.annual_ctc || 0) / 12);
  const resolvedAnnual = Number(struct.annual_ctc || 0) || resolvedGross * 12;
  const resolvedBasic = Number(struct.basic_monthly || 0) || Math.round(resolvedGross * 0.5);

  console.log(`\n💼 SALARY STRUCTURE (ID: ${struct.id})`);
  console.log(`   Annual CTC:     ${fmt(resolvedAnnual)}`);
  console.log(`   Monthly Gross:  ${fmt(resolvedGross)}`);
  console.log(`   Basic Monthly:  ${fmt(resolvedBasic)}`);
  console.log(`   HRA Monthly:    ${fmt(struct.hra_monthly || 0)}`);
  console.log(`   Slab ID:        ${struct.slab_id || 'NOT SET ⚠'}`);
  console.log(`   Effective From: ${struct.effective_from}`);
  console.log(`   TDS Deduction:  ${fmt(struct.tds_deduction || 0)}`);

  if (resolvedGross === 0) {
    console.log('\n❌ Gross Monthly = 0 → Payroll will produce ₹0 for this employee!');
    console.log('   Fix: Set annual_ctc and gross_monthly in salary structure.');
    await db.destroy(); return;
  }

  // ── 3. Slab & Component Selection ───────────────────────────────────────
  const slabId = struct.slab_id;
  let slabRow = null;
  let selectedIds = [];

  if (slabId) {
    slabRow = await db('payroll_slabs').where('id', slabId).first().catch(() => null);
  }
  if (!slabRow) {
    slabRow = await db('payroll_slabs')
      .where('organization_id', emp.organization_id)
      .orderBy('id', 'asc').first().catch(() => null);
  }

  console.log(`\n📊 SLAB: ${slabRow ? `"${slabRow.name}" (ID: ${slabRow.id})` : 'NOT FOUND — using ALL org components'}`);

  if (slabRow?.selected_component_ids) {
    try {
      const raw = typeof slabRow.selected_component_ids === 'string'
        ? JSON.parse(slabRow.selected_component_ids) : slabRow.selected_component_ids;
      if (Array.isArray(raw)) selectedIds = raw.map(String);
    } catch {}
  }

  let components = [];
  if (selectedIds.length > 0) {
    console.log(`   Selected Component IDs: [${selectedIds.join(', ')}]`);
    components = await db('payroll_components as pc')
      .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
      .whereIn('pc.id', selectedIds)
      .where('pc.is_active', 1).whereNull('pc.deleted_at')
      .orderBy('pcg.display_order').orderBy('pc.id')
      .select('pc.*', 'pcg.name as group_name', 'pcg.category as group_category')
      .catch(() => []);
  } else {
    console.log(`   No selected_component_ids → FALLBACK to all active org components`);
    components = await db('payroll_components as pc')
      .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
      .where('pc.organization_id', emp.organization_id)
      .where('pc.is_active', 1).whereNull('pc.deleted_at')
      .orderBy('pcg.display_order').orderBy('pc.id')
      .select('pc.*', 'pcg.name as group_name', 'pcg.category as group_category')
      .catch(() => []);
  }
  console.log(`   Components Loaded: ${components.length}`);

  // ── 4. Attendance for the month ──────────────────────────────────────────
  const [runYear, runMon] = runMonth.split('-').map(Number);
  const totalCycleDays = new Date(runYear, runMon, 0).getDate();

  // Check attendance records
  const attRows = await db('attendance_records')
    .where('employee_id', empId)
    .whereRaw("DATE_FORMAT(date, '%Y-%m') = ?", [runMonth])
    .select('date', 'status', 'is_late', 'overtime_hours')
    .catch(() => []);

  // Check approved unpaid leaves for the month
  const leaveRows = await db('leave_applications as la')
    .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
    .where('la.employee_id', empId)
    .whereIn('la.status', ['approved', 'processed'])
    .where('la.application_start_date', '>=', periodStart)
    .where('la.application_end_date', '<=', `${runMonth}-31`)
    .where(function() {
      this.where('lt.paid_type', 'unpaid')
        .orWhere('lt.leave_classification', 'unpaid')
        .orWhereRaw("UPPER(lt.leave_code) = 'LOP'")
        .orWhereRaw("UPPER(lt.leave_code) = 'UL'");
    })
    .sum('la.total_days as lopDays').first().catch(() => null);

  const attendanceLop = attRows.filter(r => ['Absent', 'absent', 'LOP', 'lop'].includes(r.status)).length;
  const leaveLop = Number(leaveRows?.lopDays || 0);
  const lopDays = Math.max(attendanceLop, leaveLop);
  const presentDays = Math.max(0, totalCycleDays - lopDays);
  const lopRatio = totalCycleDays > 0 ? (totalCycleDays - lopDays) / totalCycleDays : 1;
  const otHours = attRows.reduce((s, r) => s + Number(r.overtime_hours || 0), 0);
  const lateCount = attRows.filter(r => r.is_late).length;

  console.log(`\n📅 ATTENDANCE — ${runMonth} (${totalCycleDays} total days)`);
  console.log(`   Attendance Records Found: ${attRows.length} days`);
  console.log(`   Absent (LOP from att.):   ${attendanceLop} days`);
  console.log(`   Unpaid Leave (LOP):        ${leaveLop} days`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   LOP Days Used:             ${lopDays} days`);
  console.log(`   Paid/Present Days:         ${presentDays} days`);
  console.log(`   LOP Ratio:                 ${(lopRatio * 100).toFixed(1)}%`);
  console.log(`   Overtime Hours:            ${otHours} hrs`);
  console.log(`   Late Days:                 ${lateCount}`);

  if (lopDays === 0 && attRows.length === 0) {
    console.log(`   ⚠ No attendance records found — using full month (no deduction)`);
  }

  // ── 5. Component-by-component calculation ────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  COMPONENT CALCULATION (Gross: ${fmt(resolvedGross)} | Basic: ${fmt(resolvedBasic)} | LOP: ${lopDays}d)`);
  console.log(`${'─'.repeat(70)}`);

  const ctx = {
    ctc: resolvedGross, monthly_ctc: resolvedGross,
    gross: resolvedGross, gross_salary: resolvedGross,
    basic: resolvedBasic, basic_salary: resolvedBasic,
    lop_days: lopDays, present_days: presentDays,
    total_days: totalCycleDays, attendance_factor: lopRatio,
    paid_days: presentDays,
  };

  const earnings = [], deductions = [];
  let currentGroup = '';
  let specialIdx = -1;
  const today = new Date();

  for (const comp of components) {
    const type = comp.component_type || 'Value';
    const cat = (comp.group_category || '').toLowerCase();
    const compNameLower = (comp.name || '').toLowerCase();

    // GATE 1: Effective date
    let skipReason = null;
    if (comp.effective_from_date) {
      const fd = new Date(comp.effective_from_date);
      if (!isNaN(fd.getTime()) && fd > today) skipReason = `Not yet effective (from ${comp.effective_from_date})`;
    }
    if (comp.effective_to_date && !skipReason) {
      const td = new Date(comp.effective_to_date);
      if (!isNaN(td.getTime()) && td < today) skipReason = `Expired (ended ${comp.effective_to_date})`;
    }

    // GATE 2: Gender filter
    if (!skipReason && comp.gender_filter && comp.gender_filter !== 'All') {
      if ((emp.gender || '').toLowerCase() !== comp.gender_filter.toLowerCase()) {
        skipReason = `Gender filter: ${comp.gender_filter} (emp is ${emp.gender || 'N/A'})`;
      }
    }

    // GATE 3: Intern
    const isIntern = /^intern/i.test(emp.employment_type || '');
    if (!skipReason && isIntern && (compNameLower.includes('provident') || compNameLower.includes('esic') || compNameLower.includes('professional tax'))) {
      skipReason = 'Intern exempt from statutory';
    }

    // GATE 4: Calculate base amount
    let baseAmount = 0;
    if (!skipReason) {
      if (type === 'Value') {
        baseAmount = Number(comp.amount || 0);
      } else if (type === 'Derived') {
        baseAmount = evaluate(comp.formula || '', ctx);
      } else if (type === 'Module') {
        const src = (comp.module_source || '').toLowerCase();
        if (src.includes('lop')) baseAmount = lopDays > 0 ? Math.round((resolvedGross / totalCycleDays) * lopDays) : 0;
        else if (src.includes('loan')) baseAmount = 0; // would fetch from employee_loans
        else if (src.includes('overtime')) baseAmount = otHours > 0 ? Math.round((resolvedGross / totalCycleDays / 8) * otHours * 2) : 0;
        else baseAmount = Number(comp.amount || 0);
      }
    }

    baseAmount = Math.max(0, Math.round(baseAmount));

    // GATE 5: Boundary
    if (comp.boundary_type === 'Max' && comp.max_amount) baseAmount = Math.min(baseAmount, Number(comp.max_amount));
    if (comp.boundary_type === 'Min' && comp.min_amount) baseAmount = Math.max(baseAmount, Number(comp.min_amount));

    // GATE 6: Pro-rate by attendance
    const proRated = comp.based_on_attendance && lopDays > 0;
    const earnedAmount = (proRated && !skipReason) ? Math.round(baseAmount * lopRatio) : baseAmount;

    // Update cascading context
    if (!skipReason) {
      const normName = normalizeKey(comp.name);
      ctx[normName] = earnedAmount;
      ctx[comp.name.toLowerCase()] = earnedAmount;
      if (compNameLower.includes('basic')) { ctx.basic = earnedAmount; ctx.basic_salary = earnedAmount; }
    }

    // Print grouped header
    if (currentGroup !== comp.group_name) {
      currentGroup = comp.group_name;
      const groupLabel = cat === 'earning' ? '💚 EARNING' : '🔴 DEDUCTION';
      console.log(`\n  ${groupLabel} — ${comp.group_name}`);
      console.log(`  ${'─'.repeat(67)}`);
      console.log(`  ${'COMPONENT'.padEnd(36)} ${'BASE AMT'.padStart(10)} ${'EARNED'.padStart(10)}  FLAGS`);
    }

    const typeIcon = type === 'Derived' ? '⚙' : type === 'Module' ? '🔌' : '💰';
    if (skipReason) {
      console.log(`  ${typeIcon} ${pad(comp.name, 35)} ${'SKIPPED'.padStart(21)}  ← ${skipReason}`);
    } else {
      const flags = [
        comp.non_cashable ? '[NonCash]' : '',
        proRated ? `[ProRated×${(lopRatio * 100).toFixed(0)}%]` : '',
        type === 'Derived' ? `[${comp.formula || ''}`.substring(0, 30) + ']' : '',
      ].filter(Boolean).join(' ');
      console.log(`  ${typeIcon} ${pad(comp.name, 35)} ${fmt(baseAmount).padStart(10)} ${fmt(earnedAmount).padStart(10)}  ${flags}`);

      const isSpecial = compNameLower.includes('special') || compNameLower.includes('residual');
      if (cat === 'earning') {
        earnings.push({ name: comp.name, base: baseAmount, earned: isSpecial ? -1 : earnedAmount, nonCash: !!comp.non_cashable });
        if (isSpecial) specialIdx = earnings.length - 1;
      } else if (cat === 'deduction') {
        deductions.push({ name: comp.name, amount: earnedAmount });
      }
    }
  }

  // Special Allowance residual
  if (specialIdx >= 0) {
    const otherEarnings = earnings.filter((_, i) => i !== specialIdx).reduce((s, e) => s + (e.earned === -1 ? 0 : e.earned), 0);
    const residual = Math.max(0, Math.round(resolvedGross * lopRatio - otherEarnings));
    earnings[specialIdx].earned = residual;
    earnings[specialIdx].base = residual;
    ctx.special_allowance = residual;
  }

  // ── 6. Totals ────────────────────────────────────────────────────────────
  const cashableEarnings = earnings.filter(e => !e.nonCash);
  const totalEarnings = cashableEarnings.reduce((s, e) => s + e.earned, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  FINAL SUMMARY`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`\n  💚 EARNINGS BREAKDOWN:`);
  cashableEarnings.filter(e => e.earned > 0).forEach(e => {
    console.log(`     ${pad(e.name, 38)} ${fmt(e.earned).padStart(10)}`);
  });
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  💚 Total Gross Earnings:          ${fmt(totalEarnings).padStart(10)}`);

  console.log(`\n  🔴 DEDUCTIONS BREAKDOWN:`);
  deductions.filter(d => d.amount > 0).forEach(d => {
    console.log(`     ${pad(d.name, 38)} ${fmt(d.amount).padStart(10)}`);
  });
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  🔴 Total Deductions:               ${fmt(totalDeductions).padStart(10)}`);

  console.log(`\n  💵 NET PAY:                        ${fmt(netPay).padStart(10)}`);
  console.log(`  📅 Paid Days:                      ${presentDays}/${totalCycleDays}`);
  if (lopDays > 0) {
    const lopAmt = Math.round((resolvedGross / totalCycleDays) * lopDays);
    console.log(`  ⚠  LOP Deduction (informational):  ${fmt(lopAmt).padStart(10)} (already factored in pro-rating)`);
  }

  // CTC match check
  const expectedMonthly = resolvedGross;
  const grossDiff = Math.abs(totalEarnings - Math.round(expectedMonthly * lopRatio));
  console.log(`\n  📊 CTC Verification:`);
  console.log(`     Expected Gross (post-LOP): ${fmt(Math.round(expectedMonthly * lopRatio))}`);
  console.log(`     Actual Earnings:           ${fmt(totalEarnings)}`);
  console.log(`     Difference:                ${fmt(grossDiff)} ${grossDiff < 500 ? '✅ MATCH' : '⚠ CHECK COMPONENTS'}`);

  // ── 7. Check DB payslip ──────────────────────────────────────────────────
  const existingPayslip = await db('payslips')
    .where('employee_id', empId)
    .where('payslip_month', `${runMonth}-01`)
    .first().catch(() => null);

  if (existingPayslip) {
    const dbGross = Number(existingPayslip.gross_salary || 0);
    const dbDed = Number(existingPayslip.total_deductions || 0);
    const dbNet = Number(existingPayslip.net_salary || 0);
    console.log(`\n  📄 EXISTING PAYSLIP IN DB (${runMonth}):`);
    console.log(`     Gross:       ${fmt(dbGross)}  ${Math.abs(dbGross - totalEarnings) < 500 ? '✅' : `⚠ expected ${fmt(totalEarnings)}`}`);
    console.log(`     Deductions:  ${fmt(dbDed)}  ${Math.abs(dbDed - totalDeductions) < 200 ? '✅' : `⚠ expected ${fmt(totalDeductions)}`}`);
    console.log(`     Net Pay:     ${fmt(dbNet)}  ${Math.abs(dbNet - netPay) < 500 ? '✅' : `⚠ expected ${fmt(netPay)}`}`);
  } else {
    console.log(`\n  📄 No payslip in DB for ${runMonth} yet.`);
    console.log(`     → Run payroll processing to generate it.`);
  }

  console.log(`\n${'═'.repeat(70)}\n`);
  await db.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
