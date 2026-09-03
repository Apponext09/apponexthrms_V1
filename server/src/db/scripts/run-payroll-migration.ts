import { db, initializeKnex } from '../knex';

async function runPayrollDbMigration() {
  console.log('================================================================');
  console.log('    🚀 PAYROLL DATABASE MIGRATION & SCHEMA UPDATER SCRIPT     ');
  console.log('================================================================\n');

  try {
    initializeKnex();

    // Helper to safely check table existence before checking columns
    const addColumnIfMissing = async (tableName: string, colName: string, builderCallback: (table: any) => void) => {
      const tableExists = await db.schema.hasTable(tableName);
      if (!tableExists) {
        console.log(`   ⚠️ Table "${tableName}" does not exist in database yet. Skipping column "${colName}".`);
        return;
      }
      const exists = await db.schema.hasColumn(tableName, colName);
      if (!exists) {
        await db.schema.alterTable(tableName, builderCallback);
        console.log(`   ✅ Added missing column "${colName}" to table "${tableName}".`);
      } else {
        console.log(`   ✓ Column "${colName}" already exists on table "${tableName}".`);
      }
    };

    // 1. Employees Table Statutory, Bank & Role Schema Sync
    console.log('📌 1. Checking "employees" table statutory columns...');
    await addColumnIfMissing('employees', 'bank_name', (t) => t.string('bank_name', 255).nullable());
    await addColumnIfMissing('employees', 'account_no', (t) => t.string('account_no', 100).nullable());
    await addColumnIfMissing('employees', 'ifsc_code', (t) => t.string('ifsc_code', 50).nullable());
    await addColumnIfMissing('employees', 'pan', (t) => t.string('pan', 20).nullable());
    await addColumnIfMissing('employees', 'uan_no', (t) => t.string('uan_no', 20).nullable());
    await addColumnIfMissing('employees', 'esic_no', (t) => t.string('esic_no', 30).nullable());
    await addColumnIfMissing('employees', 'pf_no', (t) => t.string('pf_no', 50).nullable());
    await addColumnIfMissing('employees', 'designation', (t) => t.string('designation', 255).nullable());

    // 2. Payslips Table Statutory Mirroring Schema Sync
    console.log('\n📌 2. Checking "payslips" table statutory columns...');
    await addColumnIfMissing('payslips', 'bank_name', (t) => t.string('bank_name', 255).nullable());
    await addColumnIfMissing('payslips', 'account_no', (t) => t.string('account_no', 100).nullable());
    await addColumnIfMissing('payslips', 'ifsc_code', (t) => t.string('ifsc_code', 50).nullable());
    await addColumnIfMissing('payslips', 'pan', (t) => t.string('pan', 20).nullable());
    await addColumnIfMissing('payslips', 'uan_no', (t) => t.string('uan_no', 20).nullable());
    await addColumnIfMissing('payslips', 'esic_no', (t) => t.string('esic_no', 30).nullable());
    await addColumnIfMissing('payslips', 'pf_no', (t) => t.string('pf_no', 50).nullable());

    // 3. Payroll Components Engine Schema Sync (Value / Derived / Module)
    console.log('\n📌 3. Checking "payroll_components" engine columns...');
    await addColumnIfMissing('payroll_components', 'calc_type', (t) => t.string('calc_type', 50).defaultTo('derived'));
    await addColumnIfMissing('payroll_components', 'formula', (t) => t.text('formula').nullable());
    await addColumnIfMissing('payroll_components', 'is_statutory', (t) => t.boolean('is_statutory').defaultTo(false));

    // 4. Payroll Slabs Table Target Scope Schema Sync
    console.log('\n📌 4. Checking "payroll_slabs" table schema...');
    await addColumnIfMissing('payroll_slabs', 'departments', (t) => t.text('departments').nullable());
    await addColumnIfMissing('payroll_slabs', 'grades', (t) => t.text('grades').nullable());
    await addColumnIfMissing('payroll_slabs', 'locations', (t) => t.text('locations').nullable());
    await addColumnIfMissing('payroll_slabs', 'selected_component_ids', (t) => t.text('selected_component_ids').nullable());

    // 5. Salary Structures Table CTC Breakup Schema Sync
    console.log('\n📌 5. Checking "salary_structures" table schema...');
    await addColumnIfMissing('salary_structures', 'hra_monthly', (t) => t.decimal('hra_monthly', 12, 2).defaultTo(0));
    await addColumnIfMissing('salary_structures', 'special_allowance_monthly', (t) => t.decimal('special_allowance_monthly', 12, 2).defaultTo(0));
    await addColumnIfMissing('salary_structures', 'pf_deduction', (t) => t.decimal('pf_deduction', 12, 2).defaultTo(0));
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
