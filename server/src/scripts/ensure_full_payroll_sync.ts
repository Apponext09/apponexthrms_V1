import { db, initializeKnex } from '../db/knex.ts';

async function ensureFullPayrollSync() {
  console.log('================================================================');
  console.log('   🛠️ FULL PAYROLL UI <-> DB AUTO-ALIGNMENT & REPAIR SCRIPT     ');
  console.log('================================================================\n');

  try {
    initializeKnex();

    const checkAndAdd = async (table: string, col: string, cb: (t: any) => void) => {
      const exists = await db.schema.hasColumn(table, col);
      if (!exists) {
        await db.schema.alterTable(table, cb);
        console.log(`   ✅ Added missing column "${col}" to table "${table}".`);
      } else {
        console.log(`   ✓ Table "${table}" column "${col}" exists and is aligned.`);
      }
    };

    // 1. Employees Table
    console.log('📌 1. Synchronizing "employees" table schema...');
    await checkAndAdd('employees', 'bank_name', (t) => t.string('bank_name', 255).nullable());
    await checkAndAdd('employees', 'account_no', (t) => t.string('account_no', 100).nullable());
    await checkAndAdd('employees', 'ifsc_code', (t) => t.string('ifsc_code', 50).nullable());
    await checkAndAdd('employees', 'pan', (t) => t.string('pan', 20).nullable());
    await checkAndAdd('employees', 'uan_no', (t) => t.string('uan_no', 20).nullable());
    await checkAndAdd('employees', 'esic_no', (t) => t.string('esic_no', 30).nullable());
    await checkAndAdd('employees', 'pf_no', (t) => t.string('pf_no', 50).nullable());
    await checkAndAdd('employees', 'designation', (t) => t.string('designation', 255).nullable());

    // 2. Payroll Components Table
    console.log('\n📌 2. Synchronizing "payroll_components" table schema...');
    await checkAndAdd('payroll_components', 'calc_type', (t) => t.string('calc_type', 50).defaultTo('derived'));
    await checkAndAdd('payroll_components', 'formula', (t) => t.text('formula').nullable());
    await checkAndAdd('payroll_components', 'is_statutory', (t) => t.boolean('is_statutory').defaultTo(false));

    // 3. Payroll Slabs Table
    console.log('\n📌 3. Synchronizing "payroll_slabs" table schema...');
    await checkAndAdd('payroll_slabs', 'departments', (t) => t.text('departments').nullable());
    await checkAndAdd('payroll_slabs', 'grades', (t) => t.text('grades').nullable());
    await checkAndAdd('payroll_slabs', 'locations', (t) => t.text('locations').nullable());
    await checkAndAdd('payroll_slabs', 'selected_component_ids', (t) => t.text('selected_component_ids').nullable());

    // 4. Salary Structures Table
    console.log('\n📌 4. Synchronizing "salary_structures" table schema...');
    await checkAndAdd('salary_structures', 'hra_monthly', (t) => t.decimal('hra_monthly', 12, 2).defaultTo(0));
    await checkAndAdd('salary_structures', 'special_allowance_monthly', (t) => t.decimal('special_allowance_monthly', 12, 2).defaultTo(0));
    await checkAndAdd('salary_structures', 'pf_deduction', (t) => t.decimal('pf_deduction', 12, 2).defaultTo(0));
    await checkAndAdd('salary_structures', 'custom_components', (t) => t.text('custom_components').nullable());

    // 5. Payslips Table
    console.log('\n📌 5. Synchronizing "payslips" table schema...');
    await checkAndAdd('payslips', 'bank_name', (t) => t.string('bank_name', 255).nullable());
    await checkAndAdd('payslips', 'account_no', (t) => t.string('account_no', 100).nullable());
    await checkAndAdd('payslips', 'ifsc_code', (t) => t.string('ifsc_code', 50).nullable());
    await checkAndAdd('payslips', 'pan', (t) => t.string('pan', 20).nullable());
    await checkAndAdd('payslips', 'uan_no', (t) => t.string('uan_no', 20).nullable());
    await checkAndAdd('payslips', 'esic_no', (t) => t.string('esic_no', 30).nullable());
    await checkAndAdd('payslips', 'pf_no', (t) => t.string('pf_no', 50).nullable());

    console.log('\n================================================================');
    console.log('  🎉 100% PERFECT UI <-> DB SYNC & REPAIR COMPLETE!             ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('Sync Exception:', err.message);
  } finally {
    process.exit(0);
  }
}

ensureFullPayrollSync();
