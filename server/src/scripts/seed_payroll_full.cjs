/**
 * seed_payroll_full.cjs
 * ─────────────────────
 * 1. Assigns salary slabs to all active employees
 * 2. Creates salary_structures (with dynamic component breakup via custom_components JSON)
 * 3. Seeds attendance_records for August 2026 (realistic: Present, Half Day, Weekly Off, Leave, Absent)
 *
 * Organization 68 uses slabs 27-30. Organization 70 currently has no slabs so we link to org 68 slabs.
 * Employees: 48-58 (org 68), 59-61, 96 (org 68), etc.
 */
'use strict';
const mysql = require('mysql2/promise');

const DB = { host: 'localhost', user: 'root', password: 'root123', database: 'apponexthrms' };

// Slab definitions (from actual DB: ids 27=Entry, 28=Mid, 29=Senior, 30=Executive for org 68)
const SLABS = {
  27: { name: 'Entry Level (₹2L-₹5L)', minCTC: 200000, maxCTC: 500000, annualCTC: 360000, grossMonthly: 30000 },
  28: { name: 'Mid Level (₹5L-₹10L)', minCTC: 500000, maxCTC: 1000000, annualCTC: 720000, grossMonthly: 60000 },
  29: { name: 'Senior Level (₹10L-₹25L)', minCTC: 1000000, maxCTC: 2500000, annualCTC: 1440000, grossMonthly: 120000 },
  30: { name: 'Executive (₹25L+)', minCTC: 2500000, maxCTC: 99999999, annualCTC: 3600000, grossMonthly: 300000 },
};

// Employee → slab assignments (realistic based on designation/seniority)
const EMP_SLAB_MAP = {
  // Org 68 employees
  48: 28, // amisha shinde - EMP001
  49: 27, // isha shinde - EMP002
  50: 27, // isha shinde - EMP0033
  51: 28, // man shinde - EMP00111
  52: 27, // jay shinde - EMP004
  53: 29, // Vikram Singh - Manager
  54: 28, // Rahul Sharma - EMP-102
  55: 27, // ajay User - EMP-47
  56: 28, // Priya Verma - HR
  57: 28, // Rohan Mehta - Manager
  58: 29, // Siddharth Rao - Dev Senior
  96: 28, // Cobra Dev
  // Org 70 employees - link to org 68 slabs (nearest match)
  59: 28, // Sakshi Shukla
  60: 28, // Rahul Sharma
  61: 28, // Siddharth Mehta
};

function buildCustomComponents(grossMonthly, slabId) {
  const basic = Math.round(grossMonthly * 0.50);
  const hra = Math.round(basic * 0.40);
  const conveyance = 1600;
  const medical = 1250;
  const special = Math.max(0, grossMonthly - basic - hra - conveyance - medical);
  const pfEmployee = Math.min(1800, Math.round(basic * 0.12));
  const pt = grossMonthly > 15000 ? 200 : 0;
  const esic = grossMonthly <= 21000 ? Math.ceil(grossMonthly * 0.0075) : 0;
  const performanceBonus = slabId >= 29 ? Math.round(grossMonthly * 0.10) : 0; // Senior/Exec get bonus

  return {
    'Basic Pay': basic,
    'House Rent Allowance (HRA)': hra,
    'Conveyance Allowance': conveyance,
    'Medical Allowance': medical,
    'Special Allowance': special,
    'Employee PF (12%)': pfEmployee,
    'Professional Tax (PT)': pt,
    'ESIC Contribution (0.75%)': esic,
    'Performance Bonus': performanceBonus,
  };
}

async function assignSlabsAndStructures(conn) {
  console.log('\n=== STEP 1: Assigning slabs and salary structures ===');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const effectiveFrom = '2026-01-01';

  for (const [empIdStr, slabId] of Object.entries(EMP_SLAB_MAP)) {
    const empId = Number(empIdStr);
    const slab = SLABS[slabId];
    if (!slab) continue;

    // 1. Update employee salary_slab_id
    await conn.query('UPDATE employees SET salary_slab_id = ? WHERE id = ?', [slabId, empId]);

    // 2. Get employee org
    const [[emp]] = await conn.query('SELECT organization_id FROM employees WHERE id = ?', [empId]);
    if (!emp) continue;
    const orgId = emp.organization_id;

    const gross = slab.grossMonthly;
    const basic = Math.round(gross * 0.50);
    const hra = Math.round(basic * 0.40);
    const special = Math.max(0, gross - basic - hra - 1600 - 1250);
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = gross > 15000 ? 200 : 0;
    const esic = gross <= 21000 ? Math.ceil(gross * 0.0075) : 0;
    const netTakeHome = gross - pf - pt - esic;
    const customComps = buildCustomComponents(gross, slabId);

    // 3. Check if salary_structure already exists for this employee
    const [[existing]] = await conn.query(
      'SELECT id FROM salary_structures WHERE employee_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1',
      [empId]
    );

    if (existing) {
      await conn.query(
        `UPDATE salary_structures SET
          slab_id = ?, annual_ctc = ?, basic_monthly = ?, hra_monthly = ?,
          special_allowance_monthly = ?, gross_monthly = ?, pf_deduction = ?,
          esi_deduction = ?, tds_deduction = 0, net_take_home = ?,
          custom_components = ?, structure_name = ?, status = 'active',
          effective_from = ?, updated_at = NOW()
        WHERE id = ?`,
        [
          slabId, slab.annualCTC, basic, hra, special, gross,
          pf, esic, netTakeHome,
          JSON.stringify(customComps),
          `${slab.name} Structure`,
          effectiveFrom,
          existing.id
        ]
      );
      console.log(`  ✅ Updated salary_structure for emp ${empId} → slab ${slabId} (${slab.name})`);
    } else {
      const uuid = require('crypto').randomUUID();
      await conn.query(
        `INSERT INTO salary_structures
          (uuid, organization_id, company_id, employee_id, structure_name, structure_code,
           slab_id, annual_ctc, basic_monthly, hra_monthly, special_allowance_monthly,
           gross_monthly, pf_deduction, esi_deduction, tds_deduction, net_take_home,
           custom_components, effective_from, status, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', 47, 47, NOW(), NOW())`,
        [
          uuid, orgId, empId,
          `${slab.name} Structure`,
          `SS-EMP${empId}`,
          slabId, slab.annualCTC, basic, hra, special, gross,
          pf, esic, netTakeHome,
          JSON.stringify(customComps),
          effectiveFrom
        ]
      );
      // Link in employee_salary_structures
      const [[ssRow]] = await conn.query(
        'SELECT id FROM salary_structures WHERE employee_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1',
        [empId]
      );
      if (ssRow) {
        const essuuid = require('crypto').randomUUID();
        // Mark others as not current
        await conn.query(
          'UPDATE employee_salary_structures SET is_current = 0 WHERE employee_id = ?', [empId]
        );
        await conn.query(
          `INSERT INTO employee_salary_structures
            (uuid, organization_id, employee_id, salary_structure_id, slab_id, is_current,
             effective_from, created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, 47, 47, NOW(), NOW())`,
          [essuuid, orgId, empId, ssRow.id, slabId, effectiveFrom]
        );
      }
      console.log(`  ✅ Created salary_structure for emp ${empId} → slab ${slabId} (${slab.name})`);
    }
  }
}

async function seedAttendance(conn) {
  console.log('\n=== STEP 2: Seeding attendance for August 2026 ===');
  const year = 2026, month = 8;
  const daysInMonth = 31; // August has 31 days
  const orgId = 68;

  const empIds = Object.keys(EMP_SLAB_MAP).map(Number);

  // Define weekly off pattern: Saturday (6) and Sunday (0)
  const isWeeklyOff = (day) => {
    const d = new Date(year, month - 1, day);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  // Per-employee variation seeds
  const empPatterns = {
    48: { absentDays: [5, 18], halfDays: [12] },
    49: { absentDays: [], halfDays: [7] },
    50: { absentDays: [22], halfDays: [] },
    51: { absentDays: [], halfDays: [14, 25] },
    52: { absentDays: [3], halfDays: [] },
    53: { absentDays: [], halfDays: [] },
    54: { absentDays: [11], halfDays: [19] },
    55: { absentDays: [8, 20], halfDays: [] },
    56: { absentDays: [], halfDays: [6] },
    57: { absentDays: [], halfDays: [] },
    58: { absentDays: [27], halfDays: [13] },
    96: { absentDays: [16], halfDays: [] },
    59: { absentDays: [], halfDays: [21] },
    60: { absentDays: [4], halfDays: [] },
    61: { absentDays: [], halfDays: [] },
  };

  for (const empId of empIds) {
    // Delete existing Aug 2026 attendance for this emp (cascade through sessions first)
    const [existingRecs] = await conn.query(
      "SELECT id FROM attendance_records WHERE employee_id = ? AND YEAR(check_in_date) = ? AND MONTH(check_in_date) = ?",
      [empId, year, month]
    );
    const existingIds = existingRecs.map(r => r.id);
    if (existingIds.length > 0) {
      await conn.query('DELETE FROM attendance_sessions WHERE attendance_record_id IN (?)', [existingIds]);
      await conn.query('DELETE FROM attendance_breaks WHERE attendance_record_id IN (?)', [existingIds]);
      await conn.query(
        "DELETE FROM attendance_records WHERE id IN (?)",
        [existingIds]
      );
    }

    const pattern = empPatterns[empId] || { absentDays: [], halfDays: [] };

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const uuid = require('crypto').randomUUID();

      if (isWeeklyOff(day)) {
        // Weekly Off - insert record
        await conn.query(
          `INSERT INTO attendance_records
            (uuid, organization_id, employee_id, check_in_date, status,
             duration_minutes, work_duration_minutes, break_time_minutes,
             created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'weekly_off', 0, 0, 0, 47, 47, NOW(), NOW())`,
          [uuid, orgId, empId, dateStr]
        );
      } else if (pattern.absentDays.includes(day)) {
        // Absent
        await conn.query(
          `INSERT INTO attendance_records
            (uuid, organization_id, employee_id, check_in_date, status,
             duration_minutes, work_duration_minutes, break_time_minutes,
             created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'absent', 0, 0, 0, 47, 47, NOW(), NOW())`,
          [uuid, orgId, empId, dateStr]
        );
      } else if (pattern.halfDays.includes(day)) {
        // Half Day - 4 hours
        const checkIn = `${dateStr} 09:00:00`;
        const checkOut = `${dateStr} 13:00:00`;
        await conn.query(
          `INSERT INTO attendance_records
            (uuid, organization_id, employee_id, check_in_date,
             check_in_time, check_out_time,
             status, duration_minutes, work_duration_minutes, break_time_minutes,
             created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'half_day', 240, 240, 0, 47, 47, NOW(), NOW())`,
          [uuid, orgId, empId, dateStr, checkIn, checkOut]
        );
      } else {
        // Full Present - 8-9 hours
        const checkIn = `${dateStr} 09:00:00`;
        const checkOut = `${dateStr} 18:00:00`;
        await conn.query(
          `INSERT INTO attendance_records
            (uuid, organization_id, employee_id, check_in_date,
             check_in_time, check_out_time,
             status, duration_minutes, work_duration_minutes, break_time_minutes,
             is_late, created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'present', 540, 480, 60, 0, 47, 47, NOW(), NOW())`,
          [uuid, orgId, empId, dateStr, checkIn, checkOut]
        );
      }
    }
    console.log(`  ✅ Attendance seeded for emp ${empId} (Aug 2026)`);
  }
}

async function main() {
  const conn = await mysql.createConnection(DB);
  try {
    await assignSlabsAndStructures(conn);
    await seedAttendance(conn);
    console.log('\n🎉 All done! Slabs assigned, structures created, attendance seeded for Aug 2026.');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await conn.end();
  }
}

main();
