const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root@123',
    database: process.env.DB_NAME || 'apponext'
  }
});

async function ensureTables() {
  console.log('--- Ensuring payroll_component_groups table ---');
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS \`payroll_component_groups\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`organization_id\` INT DEFAULT 1,
      \`name\` VARCHAR(100) NOT NULL,
      \`category\` ENUM('Earning', 'Deduction') DEFAULT 'Earning',
      \`round_format\` VARCHAR(50) DEFAULT 'Round',
      \`group_function\` VARCHAR(50) DEFAULT 'Sum',
      \`configure_on_profile\` TINYINT(1) DEFAULT 0,
      \`display_on_profile\` TINYINT(1) DEFAULT 1,
      \`is_editable\` TINYINT(1) DEFAULT 1,
      \`contributed_by\` VARCHAR(50) DEFAULT 'Employee',
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`recalculate_on_change\` TINYINT(1) DEFAULT 0,
      \`group_for_payslip\` VARCHAR(100) DEFAULT 'Choose',
      \`display_order\` INT DEFAULT 10,
      \`disable_arrear\` TINYINT(1) DEFAULT 0,
      \`display_total_on_process\` TINYINT(1) DEFAULT 0,
      \`tds_same_month\` TINYINT(1) DEFAULT 0,
      \`is_taxable\` TINYINT(1) DEFAULT 1,
      \`deleted_at\` TIMESTAMP NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ payroll_component_groups table ensured.');

  console.log('--- Ensuring payroll_components table ---');
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS \`payroll_components\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NULL,
      \`organization_id\` INT DEFAULT 1,
      \`name\` VARCHAR(100) NOT NULL,
      \`component_type\` ENUM('Value', 'Derived', 'Module') DEFAULT 'Value',
      \`non_cashable\` TINYINT(1) DEFAULT 0,
      \`based_on_attendance\` TINYINT(1) DEFAULT 1,
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`amount\` DECIMAL(12,2) DEFAULT 0.00,
      \`formula\` TEXT NULL,
      \`boundary_type\` VARCHAR(50) DEFAULT 'Choose',
      \`min_amount\` DECIMAL(12,2) DEFAULT 0.00,
      \`max_amount\` DECIMAL(12,2) DEFAULT 0.00,
      \`effective_from_date\` DATE NULL,
      \`effective_to_date\` DATE NULL,
      \`condition_on\` VARCHAR(50) DEFAULT 'Choose',
      \`condition_operator\` VARCHAR(20) DEFAULT 'Choose',
      \`condition_value1\` VARCHAR(100) DEFAULT '',
      \`condition_value2\` VARCHAR(100) DEFAULT '',
      \`gender_filter\` VARCHAR(20) DEFAULT 'All',
      \`grades\` JSON NULL,
      \`departments\` JSON NULL,
      \`locations\` JSON NULL,
      \`employees\` JSON NULL,
      \`deleted_at\` TIMESTAMP NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ payroll_components table ensured.');

  console.log('--- Ensuring payroll_slabs table ---');
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS \`payroll_slabs\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`organization_id\` INT DEFAULT 1,
      \`slab_name\` VARCHAR(100) NOT NULL,
      \`min_ctc\` DECIMAL(12,2) DEFAULT 0.00,
      \`max_ctc\` DECIMAL(12,2) DEFAULT 10000000.00,
      \`cycle_id\` VARCHAR(64) DEFAULT '',
      \`employment_type\` VARCHAR(50) DEFAULT 'Regular',
      \`departments\` JSON NULL,
      \`grades\` JSON NULL,
      \`locations\` JSON NULL,
      \`selected_component_ids\` JSON NULL,
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`deleted_at\` TIMESTAMP NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✓ payroll_slabs table ensured.');

  // Safe columns addition for payroll_earnings
  const [earnCols] = await knex.raw('DESCRIBE payroll_earnings');
  const earnFieldNames = earnCols.map(c => c.Field);
  if (!earnFieldNames.includes('component_name')) {
    await knex.raw('ALTER TABLE payroll_earnings ADD COLUMN component_name VARCHAR(100) NULL AFTER payroll_run_employee_id');
    console.log('✓ Added component_name to payroll_earnings');
  }
  if (!earnFieldNames.includes('component_type')) {
    await knex.raw('ALTER TABLE payroll_earnings ADD COLUMN component_type VARCHAR(50) DEFAULT "Earning" AFTER component_name');
    console.log('✓ Added component_type to payroll_earnings');
  }
  if (!earnFieldNames.includes('updated_at')) {
    await knex.raw('ALTER TABLE payroll_earnings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✓ Added updated_at to payroll_earnings');
  }

  // Safe columns addition for payroll_deductions
  const [dedCols] = await knex.raw('DESCRIBE payroll_deductions');
  const dedFieldNames = dedCols.map(c => c.Field);
  if (!dedFieldNames.includes('component_name')) {
    await knex.raw('ALTER TABLE payroll_deductions ADD COLUMN component_name VARCHAR(100) NULL AFTER payroll_run_employee_id');
    console.log('✓ Added component_name to payroll_deductions');
  }
  if (!dedFieldNames.includes('component_type')) {
    await knex.raw('ALTER TABLE payroll_deductions ADD COLUMN component_type VARCHAR(50) DEFAULT "Deduction" AFTER component_name');
    console.log('✓ Added component_type to payroll_deductions');
  }
  if (!dedFieldNames.includes('updated_at')) {
    await knex.raw('ALTER TABLE payroll_deductions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('✓ Added updated_at to payroll_deductions');
  }

  console.log('--- ALL TABLES AND COLUMNS VERIFIED SUCCESSFULLY ---');
  process.exit(0);
}

ensureTables().catch(err => {
  console.error('Error ensuring tables:', err);
  process.exit(1);
});
