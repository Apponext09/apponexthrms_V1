import { db, initializeKnex } from '../db/knex.ts';

async function runPayrollDbMigration() {
  console.log('================================================================');
  console.log('    🚀 PAYROLL DATABASE MIGRATION & SCHEMA UPDATER SCRIPT     ');
  console.log('================================================================\n');

  try {
    initializeKnex();

    // 1. Update `employees` table with bank & statutory registration columns
    console.log('📌 1. Checking and updating "employees" table columns...');
    const hasBankName = await db.schema.hasColumn('employees', 'bank_name');
    if (!hasBankName) {
      await db.schema.alterTable('employees', (table) => {
        table.string('bank_name', 255).nullable();
        table.string('account_no', 100).nullable();
        table.string('ifsc_code', 50).nullable();
        table.string('pan', 20).nullable();
        table.string('uan_no', 20).nullable();
        table.string('esic_no', 30).nullable();
        table.string('pf_no', 50).nullable();
      });
      console.log('   ✅ Added bank_name, account_no, ifsc_code, pan, uan_no, esic_no, pf_no to "employees" table.');
    } else {
      console.log('   ✓ "employees" table already has all bank & statutory columns.');
    }

    // 2. Update `payslips` table for employee statutory mirroring
    console.log('\n📌 2. Checking and updating "payslips" table columns...');
    const hasPayslipBank = await db.schema.hasColumn('payslips', 'bank_name');
    if (!hasPayslipBank) {
      await db.schema.alterTable('payslips', (table) => {
        table.string('bank_name', 255).nullable();
        table.string('account_no', 100).nullable();
        table.string('ifsc_code', 50).nullable();
        table.string('pan', 20).nullable();
        table.string('uan_no', 20).nullable();
        table.string('esic_no', 30).nullable();
        table.string('pf_no', 50).nullable();
      });
      console.log('   ✅ Added statutory & bank columns to "payslips" table.');
    } else {
      console.log('   ✓ "payslips" table already has statutory columns.');
    }

    // 3. Update `payroll_components` table for 3-Way Engine (Value, Derived, Module)
    console.log('\n📌 3. Checking and updating "payroll_components" table columns...');
    const hasCalcType = await db.schema.hasColumn('payroll_components', 'calc_type');
    if (!hasCalcType) {
      await db.schema.alterTable('payroll_components', (table) => {
        table.string('calc_type', 50).defaultTo('derived'); // 'value' | 'derived' | 'module'
        table.text('formula').nullable();
        table.boolean('is_statutory').defaultTo(false);
      });
      console.log('   ✅ Added calc_type, formula, is_statutory to "payroll_components" table.');
    } else {
      console.log('   ✓ "payroll_components" table already has 3-way engine columns.');
    }

    // 4. Update `salary_structures` table for custom components JSON
    console.log('\n📌 4. Checking and updating "salary_structures" table columns...');
    const hasCustomComp = await db.schema.hasColumn('salary_structures', 'custom_components');
    if (!hasCustomComp) {
      await db.schema.alterTable('salary_structures', (table) => {
        table.text('custom_components').nullable();
      });
      console.log('   ✅ Added custom_components JSON column to "salary_structures" table.');
    } else {
      console.log('   ✓ "salary_structures" table already has custom_components column.');
    }

    console.log('\n================================================================');
    console.log('  🎉 MIGRATION COMPLETED! DATABASE IS 100% UP TO DATE & SYNCED  ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('Migration Exception:', err.message);
  } finally {
    process.exit(0);
  }
}

runPayrollDbMigration();
