const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function migrate() {
  console.log('Checking payroll_cycles table...');

  // Show current columns
  const [cols] = await db.raw('DESCRIBE payroll_cycles').catch(() => [null]);
  if (!cols) { console.error('Table payroll_cycles not found!'); await db.destroy(); process.exit(1); }

  const existingCols = cols.map(c => c.Field);
  console.log('Current columns:', existingCols);

  // Fields to add
  const toAdd = [
    { name: 'frequency',                          sql: "ADD COLUMN frequency VARCHAR(50) DEFAULT 'Monthly' AFTER cycle_type" },
    { name: 'start_date',                         sql: "ADD COLUMN start_date INT DEFAULT 1 AFTER frequency" },
    { name: 'start_date_2',                       sql: "ADD COLUMN start_date_2 INT NULL AFTER start_date" },
    { name: 'start_day',                          sql: "ADD COLUMN start_day VARCHAR(20) NULL AFTER start_date_2" },
    { name: 'cutoff_day',                         sql: "ADD COLUMN cutoff_day INT DEFAULT 25 AFTER start_day" },
    { name: 'cutoff_day_name',                    sql: "ADD COLUMN cutoff_day_name VARCHAR(20) NULL AFTER cutoff_day" },
    { name: 'month_offset',                       sql: "ADD COLUMN month_offset VARCHAR(20) DEFAULT 'Current' AFTER cutoff_day_name" },
    { name: 'total_days_calc',                    sql: "ADD COLUMN total_days_calc VARCHAR(50) DEFAULT '30' AFTER month_offset" },
    { name: 'cap_amount',                         sql: "ADD COLUMN cap_amount DECIMAL(14,2) DEFAULT 1000000 AFTER total_days_calc" },
    { name: 'is_daily_wages',                     sql: "ADD COLUMN is_daily_wages TINYINT(1) DEFAULT 0 AFTER cap_amount" },
    { name: 'daily_wages_include_paid_holidays',  sql: "ADD COLUMN daily_wages_include_paid_holidays TINYINT(1) DEFAULT 0 AFTER is_daily_wages" },
    { name: 'daily_wages_include_week_off',       sql: "ADD COLUMN daily_wages_include_week_off TINYINT(1) DEFAULT 0 AFTER daily_wages_include_paid_holidays" },
    { name: 'tolerance_enabled',                  sql: "ADD COLUMN tolerance_enabled TINYINT(1) DEFAULT 0 AFTER daily_wages_include_week_off" },
    { name: 'tolerance_minutes',                  sql: "ADD COLUMN tolerance_minutes INT DEFAULT 15 AFTER tolerance_enabled" },
    { name: 'is_active',                          sql: "ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER tolerance_minutes" },
    { name: 'disbursement_date',                  sql: "ADD COLUMN disbursement_date INT DEFAULT 27 AFTER is_active" },
  ];

  for (const col of toAdd) {
    if (existingCols.includes(col.name)) {
      console.log(`  ✓ Already exists: ${col.name}`);
    } else {
      await db.raw(`ALTER TABLE payroll_cycles ${col.sql}`);
      console.log(`  ✅ Added: ${col.name}`);
    }
  }

  // Verify
  const [newCols] = await db.raw('DESCRIBE payroll_cycles');
  console.log('\n✅ Final payroll_cycles columns:', newCols.map(c => c.Field));

  // Also check payroll_components columns
  const [compCols] = await db.raw('DESCRIBE payroll_components').catch(() => [[]]);
  console.log('\npayroll_components columns:', compCols.map(c => c.Field));

  // Also check payroll_component_groups columns
  const [grpCols] = await db.raw('DESCRIBE payroll_component_groups').catch(() => [[]]);
  console.log('\npayroll_component_groups columns:', grpCols.map(c => c.Field));

  await db.destroy();
  process.exit(0);
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
