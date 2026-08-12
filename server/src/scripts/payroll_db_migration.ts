import { db, initializeKnex } from '../db/knex.ts';

async function runPayrollDbMigration() {
  console.log('================================================================');
  console.log('    🚀 PAYROLL DATABASE MIGRATION & SCHEMA UPDATER SCRIPT     ');
  console.log('================================================================\n');

  try {
    initializeKnex();

    // Helper to safely add column if missing
    const addColumnIfMissing = async (tableName: string, colName: string, builderCallback: (table: any) => void) => {
      const exists = await db.schema.hasColumn(tableName, colName);
      if (!exists) {
        await db.schema.alterTable(tableName, builderCallback);
        console.log(`   ✅ Added "${colName}" to "${tableName}" table.`);
      } else {
        console.log(`   ✓ Column "${colName}" already exists on "${tableName}".`);
      }
    };

    // 1. Employees Table Statutory & Bank Columns
    console.log('📌 1. Checking "employees" table statutory columns...');
    await addColumnIfMissing('employees', 'bank_name', (t) => t.string('bank_name', 255).nullable());
    await addColumnIfMissing('employees', 'account_no', (t) => t.string('account_no', 100).nullable());
    await addColumnIfMissing('employees', 'ifsc_code', (t) => t.string('ifsc_code', 50).nullable());
    await addColumnIfMissing('employees', 'pan', (t) => t.string('pan', 20).nullable());
    await addColumnIfMissing('employees', 'uan_no', (t) => t.string('uan_no', 20).nullable());
    await addColumnIfMissing('employees', 'esic_no', (t) => t.string('esic_no', 30).nullable());
    await addColumnIfMissing('employees', 'pf_no', (t) => t.string('pf_no', 50).nullable());

    // 2. Payslips Table Statutory Columns
    console.log('\n📌 2. Checking "payslips" table statutory columns...');
    await addColumnIfMissing('payslips', 'bank_name', (t) => t.string('bank_name', 255).nullable());
    await addColumnIfMissing('payslips', 'account_no', (t) => t.string('account_no', 100).nullable());
    await addColumnIfMissing('payslips', 'ifsc_code', (t) => t.string('ifsc_code', 50).nullable());
    await addColumnIfMissing('payslips', 'pan', (t) => t.string('pan', 20).nullable());
    await addColumnIfMissing('payslips', 'uan_no', (t) => t.string('uan_no', 20).nullable());
    await addColumnIfMissing('payslips', 'esic_no', (t) => t.string('esic_no', 30).nullable());
    await addColumnIfMissing('payslips', 'pf_no', (t) => t.string('pf_no', 50).nullable());

    // 3. Payroll Components Engine Columns
    console.log('\n📌 3. Checking "payroll_components" engine columns...');
    await addColumnIfMissing('payroll_components', 'calc_type', (t) => t.string('calc_type', 50).defaultTo('derived'));
    await addColumnIfMissing('payroll_components', 'formula', (t) => t.text('formula').nullable());
    await addColumnIfMissing('payroll_components', 'is_statutory', (t) => t.boolean('is_statutory').defaultTo(false));

    // 4. Salary Structures Table Custom Components JSON Column
    console.log('\n📌 4. Checking "salary_structures" custom components column...');
    await addColumnIfMissing('salary_structures', 'custom_components', (t) => t.text('custom_components').nullable());

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
