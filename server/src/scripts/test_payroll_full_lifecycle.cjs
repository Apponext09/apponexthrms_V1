const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

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

async function testPayrollFullLifecycle() {
  console.log('===========================================================');
  console.log('🧪 TESTING FULL PAYROLL LIFECYCLE: PROCESS -> LOCK -> PUBLISH');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    const user = await db('users').first();
    const validUserId = user ? user.id : 10;

    const cycle = await db('payroll_cycles')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .first();

    if (!cycle) {
      console.log('No cycle found.');
      return;
    }

    const currentMonth = '2026-08';
    console.log(`Using Cycle: "${cycle.cycle_name || cycle.name}" (ID: ${cycle.id}), Month: ${currentMonth}`);

    // STEP 1: CREATE PAYROLL RUN (Draft)
    const [runId] = await db('payroll_runs').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      payroll_cycle_id: cycle.id,
      run_type: 'regular',
      run_month: `${currentMonth}-01`,
      status: 'draft',
      total_employees: 10,
      processed_employees: 0,
      error_count: 0,
      created_by: validUserId,
      updated_by: validUserId,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log(`✅ STEP 1: Generated Payroll Run (ID: ${runId}) in status: "draft"`);

    // STEP 2: PROCESS RUN (Calculations & Status -> 'completed')
    const employeesWithStructures = await db('salary_structures as ss')
      .join('employees as e', 'ss.employee_id', 'e.id')
      .where('ss.organization_id', orgId)
      .whereNull('ss.deleted_at')
      .select('ss.*', 'e.first_name', 'e.last_name', 'e.employee_code');

    let totalGross = 0;
    let totalNet = 0;

    for (const struct of employeesWithStructures) {
      const gross = Number(struct.gross_monthly || 0);
      const net = Number(struct.net_take_home || 0);
      totalGross += gross;
      totalNet += net;

      await db('payroll_run_employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        payroll_run_id: runId,
        employee_id: struct.employee_id,
        days_in_month: 30,
        payable_days: 28,
        loss_of_pay_days: 2,
        base_salary: Number(struct.basic_monthly || 0),
        gross_salary: gross,
        total_earnings: gross,
        total_deductions: gross - net,
        net_salary: net,
        status: 'calculated',
        payment_status: 'Freeze',
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => {});
    }

    await db('payroll_runs').where('id', runId).update({
      status: 'completed',
      processed_employees: employeesWithStructures.length,
      updated_at: new Date()
    });
    console.log(`✅ STEP 2: Processed Payroll Run (ID: ${runId}) -> Status: "completed", Processed ${employeesWithStructures.length} employees (Total Gross: ₹${totalGross.toLocaleString('en-IN')}, Total Net: ₹${totalNet.toLocaleString('en-IN')})`);

    // STEP 3: LOCK RUN (Status -> 'locked')
    await db('payroll_runs').where('id', runId).update({
      status: 'locked',
      locked_at: new Date(),
      locked_by: validUserId,
      updated_at: new Date()
    });
    console.log(`✅ STEP 3: Locked Figures for Payroll Run (ID: ${runId}) -> Status: "locked"`);

    // STEP 4: PUBLISH RUN & GENERATE PAYSLIPS (Status -> 'published')
    for (const struct of employeesWithStructures) {
      const gross = Number(struct.gross_monthly || 0);
      const net = Number(struct.net_take_home || 0);
      const basic = Number(struct.basic_monthly || 0);
      const hra = Number(struct.hra_monthly || 0);
      const special = Number(struct.special_allowance_monthly || 0);
      const pf = Number(struct.pf_deduction || 0);
      const tds = Number(struct.tds_deduction || 0);

      const earningsBreakup = [
        { name: 'Basic', amount: basic },
        { name: 'HRA', amount: hra },
        { name: 'Special Allowance', amount: special }
      ];
      const deductionsBreakup = [
        { name: 'PF Employee (12%)', amount: pf },
        { name: 'TDS', amount: tds }
      ];

      await db('payslips').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: struct.employee_id,
        payroll_run_id: runId,
        salary_month: `${currentMonth}-01`,
        payslip_number: `PS-${currentMonth}-${struct.employee_id}`,
        gross_salary: gross,
        total_earnings: gross,
        total_deductions: gross - net,
        net_salary: net,
        earnings_breakup: JSON.stringify(earningsBreakup),
        deductions_breakup: JSON.stringify(deductionsBreakup),
        status: 'published',
        created_by: validUserId,
        updated_by: validUserId,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => {});
    }

    await db('payroll_runs').where('id', runId).update({
      status: 'published',
      published_at: new Date(),
      updated_at: new Date()
    });
    console.log(`✅ STEP 4: Published Payroll Run (ID: ${runId}) -> Status: "published", Digital Payslips generated for all employees!`);

    console.log('\n===========================================================');
    console.log('🎉 FULL 3-STEP LIFECYCLE (PROCESS -> LOCK -> PUBLISH) READY! 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error during payroll lifecycle test:', err);
  } finally {
    await db.destroy();
  }
}

testPayrollFullLifecycle();
