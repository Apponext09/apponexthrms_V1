const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME     || process.env.DB_DATABASE,
    port:     Number(process.env.DB_PORT) || 3306
  }
});

// ── Helper: Format YYYY-MM-DD in local time ──────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const formatDateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const getLastDay = (y, m) => new Date(y, m + 1, 0).getDate();

const now   = new Date();
const year  = now.getFullYear();
const month = now.getMonth(); // 0-indexed (e.g. 7 for Aug)
const lastDayNum = getLastDay(year, month);

// ── Weekly: find current Monday → Sunday ─────────────────────────────────
const todayDay = now.getDay(); // 0=Sun..6=Sat
const diffMon  = (todayDay === 0 ? 6 : todayDay - 1);
const monDate  = new Date(now);
monDate.setDate(now.getDate() - diffMon);
const sunDate  = new Date(monDate);
sunDate.setDate(monDate.getDate() + 6);

const wkStartStr  = formatDateStr(monDate.getFullYear(), monDate.getMonth(), monDate.getDate());
const wkEndStr    = formatDateStr(sunDate.getFullYear(), sunDate.getMonth(), sunDate.getDate());

const wkCutoff    = new Date(sunDate);
wkCutoff.setDate(sunDate.getDate() - 1);
const wkCutoffStr = formatDateStr(wkCutoff.getFullYear(), wkCutoff.getMonth(), wkCutoff.getDate());

// ── Bi-Weekly: current 14-day period starting from Monday ────────────────
const diffBi   = diffMon % 14;
const biMon    = new Date(now);
biMon.setDate(now.getDate() - diffBi);
const biSun    = new Date(biMon);
biSun.setDate(biMon.getDate() + 13);

const bwStartStr  = formatDateStr(biMon.getFullYear(), biMon.getMonth(), biMon.getDate());
const bwEndStr    = formatDateStr(biSun.getFullYear(), biSun.getMonth(), biSun.getDate());

const bwCutoff    = new Date(biSun);
bwCutoff.setDate(biSun.getDate() - 1);
const bwCutoffStr = formatDateStr(bwCutoff.getFullYear(), bwCutoff.getMonth(), bwCutoff.getDate());

// ── 5 Cycle Templates ─────────────────────────────────────────────────────
// Allowed enum values for cycle_type: 'monthly', 'biweekly', 'weekly', 'fortnightly'
const cycleTemplates = [
  {
    cycle_name:            'Monthly',
    cycle_code:            'PAY-MONTHLY',
    cycle_type:            'monthly',
    frequency:             'Monthly',
    cycle_start_date:      formatDateStr(year, month, 1),
    cycle_end_date:        formatDateStr(year, month, lastDayNum),
    payroll_run_date:      formatDateStr(year, month, 25),
    salary_credit_date:    formatDateStr(year, month, 28),
    start_date:            1,
    start_day:             null,
    cutoff_day:            25,
    disbursement_date:     28,
    total_days_calc:       '30',
    is_current_cycle:      true,
  },
  {
    cycle_name:            'Semi-Monthly (1st-15th)',
    cycle_code:            'PAY-SEMI-1',
    cycle_type:            'fortnightly',
    frequency:             'Semi-Monthly',
    cycle_start_date:      formatDateStr(year, month, 1),
    cycle_end_date:        formatDateStr(year, month, 15),
    payroll_run_date:      formatDateStr(year, month, 13),
    salary_credit_date:    formatDateStr(year, month, 15),
    start_date:            1,
    start_day:             null,
    cutoff_day:            13,
    disbursement_date:     15,
    total_days_calc:       '15',
    is_current_cycle:      false,
  },
  {
    cycle_name:            'Semi-Monthly (16th-Last)',
    cycle_code:            'PAY-SEMI-2',
    cycle_type:            'fortnightly',
    frequency:             'Semi-Monthly',
    cycle_start_date:      formatDateStr(year, month, 16),
    cycle_end_date:        formatDateStr(year, month, lastDayNum),
    payroll_run_date:      formatDateStr(year, month, 28),
    salary_credit_date:    formatDateStr(year, month, lastDayNum),
    start_date:            16,
    start_day:             null,
    cutoff_day:            28,
    disbursement_date:     lastDayNum,
    total_days_calc:       '15',
    is_current_cycle:      false,
  },
  {
    cycle_name:            'Weekly',
    cycle_code:            'PAY-WEEKLY',
    cycle_type:            'weekly',
    frequency:             'Weekly',
    cycle_start_date:      wkStartStr,
    cycle_end_date:        wkEndStr,
    payroll_run_date:      wkCutoffStr,
    salary_credit_date:    wkEndStr,
    start_date:            1,
    start_day:             'Monday',
    cutoff_day:            6,
    disbursement_date:     7,
    total_days_calc:       '7',
    is_current_cycle:      false,
  },
  {
    cycle_name:            'Bi-Weekly',
    cycle_code:            'PAY-BIWEEKLY',
    cycle_type:            'biweekly',
    frequency:             'Bi-Weekly',
    cycle_start_date:      bwStartStr,
    cycle_end_date:        bwEndStr,
    payroll_run_date:      bwCutoffStr,
    salary_credit_date:    bwEndStr,
    start_date:            1,
    start_day:             'Monday',
    cutoff_day:            13,
    disbursement_date:     14,
    total_days_calc:       '14',
    is_current_cycle:      false,
  }
];

const orgIds = [8, 68, 70];

async function run() {
  try {
    // Disable foreign key checks to safely replace cycles
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    // Step 1: Remove ALL existing payroll cycles for these orgs
    const deleted = await db('payroll_cycles').whereIn('organization_id', orgIds).delete();
    console.log('Deleted ' + deleted + ' existing cycle(s)');

    // Step 2: Insert 5 cycles per org
    let inserted = 0;
    for (const orgId of orgIds) {
      for (const tpl of cycleTemplates) {
        await db('payroll_cycles').insert({
          uuid:                              uuidv4(),
          organization_id:                   orgId,
          cycle_name:                        tpl.cycle_name,
          cycle_code:                        tpl.cycle_code + '-' + orgId,
          cycle_type:                        tpl.cycle_type,
          frequency:                         tpl.frequency,
          cycle_start_date:                  tpl.cycle_start_date,
          cycle_end_date:                    tpl.cycle_end_date,
          payroll_run_date:                  tpl.payroll_run_date,
          salary_credit_date:                tpl.salary_credit_date,
          start_date:                        tpl.start_date,
          start_day:                         tpl.start_day,
          cutoff_day:                        tpl.cutoff_day,
          disbursement_date:                 tpl.disbursement_date,
          total_days_calc:                   tpl.total_days_calc,
          month_offset:                      'Current',
          cap_amount:                        1000000,
          is_daily_wages:                    false,
          daily_wages_include_paid_holidays: false,
          daily_wages_include_week_off:      false,
          tolerance_enabled:                 false,
          tolerance_minutes:                 15,
          is_active:                         true,
          is_current_cycle:                  tpl.is_current_cycle,
          status:                            'open',
          created_by:                        1,
          updated_by:                        1,
        });
        inserted++;
      }
    }

    // Re-enable foreign key checks
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    // Step 3: Verify
    const result = await db('payroll_cycles')
      .whereIn('organization_id', orgIds)
      .select('id', 'organization_id', 'cycle_name', 'cycle_type', 'cycle_start_date', 'cycle_end_date', 'status')
      .orderBy('organization_id')
      .orderBy('id');

    console.log('\nCreated ' + inserted + ' cycles total:\n');
    result.forEach(function(c) {
      console.log(
        'Org ' + c.organization_id + ' | ' +
        c.cycle_name.padEnd(30) + ' | ' +
        c.cycle_type.padEnd(12) + ' | ' +
        c.cycle_start_date + ' to ' + c.cycle_end_date
      );
    });
    console.log('\nDone!');

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await db.destroy();
  }
}

run();
