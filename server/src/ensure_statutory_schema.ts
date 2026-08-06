import { initializeKnex } from './db/knex.js';

const db = initializeKnex();

async function run() {
  try {
    console.log('--- CHECKING & ALTERING STATUTORY COLUMNS IN DATABASE ---');

    // 1. Employees Table
    const hasEmpBank = await db.schema.hasColumn('employees', 'bank_name');
    const hasEmpAcc = await db.schema.hasColumn('employees', 'account_no');
    const hasEmpIfsc = await db.schema.hasColumn('employees', 'ifsc_code');
    const hasEmpPf = await db.schema.hasColumn('employees', 'pf_no');
    const hasEmpUan = await db.schema.hasColumn('employees', 'uan_no');
    const hasEmpEsic = await db.schema.hasColumn('employees', 'esic_no');
    const hasEmpPan = await db.schema.hasColumn('employees', 'pan');

    await db.schema.alterTable('employees', (table) => {
      if (!hasEmpBank) table.string('bank_name', 100).nullable();
      if (!hasEmpAcc) table.string('account_no', 50).nullable();
      if (!hasEmpIfsc) table.string('ifsc_code', 30).nullable();
      if (!hasEmpPf) table.string('pf_no', 50).nullable();
      if (!hasEmpUan) table.string('uan_no', 20).nullable();
      if (!hasEmpEsic) table.string('esic_no', 30).nullable();
      if (!hasEmpPan) table.string('pan', 20).nullable();
    });

    console.log('✅ Employees table updated with Bank, IFSC, UAN, ESIC, PAN, PF fields!');

    // 2. Payslips Table (if present)
    const hasPayslips = await db.schema.hasTable('payslips');
    if (hasPayslips) {
      const hasPsBank = await db.schema.hasColumn('payslips', 'bank_name');
      const hasPsAcc = await db.schema.hasColumn('payslips', 'account_no');
      const hasPsIfsc = await db.schema.hasColumn('payslips', 'ifsc_code');
      const hasPsPf = await db.schema.hasColumn('payslips', 'pf_no');
      const hasPsUan = await db.schema.hasColumn('payslips', 'uan_no');
      const hasPsEsic = await db.schema.hasColumn('payslips', 'esic_no');
      const hasPsPan = await db.schema.hasColumn('payslips', 'pan');

      await db.schema.alterTable('payslips', (table) => {
        if (!hasPsBank) table.string('bank_name', 100).nullable();
        if (!hasPsAcc) table.string('account_no', 50).nullable();
        if (!hasPsIfsc) table.string('ifsc_code', 30).nullable();
        if (!hasPsPf) table.string('pf_no', 50).nullable();
        if (!hasPsUan) table.string('uan_no', 20).nullable();
        if (!hasPsEsic) table.string('esic_no', 30).nullable();
        if (!hasPsPan) table.string('pan', 20).nullable();
      });
      console.log('✅ Payslips table updated with Bank, IFSC, UAN, ESIC, PAN, PF fields!');
    }

  } catch (err) {
    console.error('Error ensuring statutory schema:', err);
  } finally {
    await db.destroy();
  }
}

run();
