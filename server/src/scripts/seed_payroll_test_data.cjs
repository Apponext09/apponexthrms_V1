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

async function seedPayrollTestData() {
  console.log('===========================================================');
  console.log('🌱 SEEDING COMPLETE PAYROLL DATA (SLABS, CTC & ATTENDANCE)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    const user = await db('users').first();
    const validUserId = user ? user.id : 10;

    // 1. Ensure Pay Cycle
    let cycle = await db('payroll_cycles').where({ organization_id: orgId }).whereNull('deleted_at').first();
    if (!cycle) {
      const [cycleId] = await db('payroll_cycles').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        cycle_name: 'Standard Monthly Cycle',
        cycle_code: 'PAY-MONTHLY-01',
        cycle_type: 'monthly',
        frequency: 'Monthly',
        start_date: 1,
        cutoff_day: 25,
        status: 'open',
        is_active: 1,
        created_by: validUserId,
        updated_by: validUserId,
        created_at: new Date(),
        updated_at: new Date()
      });
      cycle = await db('payroll_cycles').where('id', cycleId).first();
      console.log(`✅ Created Master Pay Cycle: "${cycle.cycle_name}" (ID: ${cycle.id})`);
    } else {
      await db('payroll_cycles').where({ id: cycle.id }).update({ status: 'open', is_active: 1 });
      console.log(`✅ Using Active Pay Cycle: "${cycle.cycle_name || cycle.name}" (ID: ${cycle.id})`);
    }

    // 2. Fetch Active Components
    const components = await db('payroll_components').where({ organization_id: orgId }).whereNull('deleted_at');
    const compIds = components.map(c => c.id);

    // 3. Ensure Realistic Pay Slabs
    const slabDefs = [
      {
        name: 'Junior Software Engineer Slab',
        min_ctc: 300000,
        max_ctc: 600000,
        pf_rate_pct: 12.00,
      },
      {
        name: 'Senior Lead & Specialist Slab',
        min_ctc: 600000,
        max_ctc: 1200000,
        pf_rate_pct: 12.00,
      },
      {
        name: 'Executive Management Slab',
        min_ctc: 1200000,
        max_ctc: 2500000,
        pf_rate_pct: 12.00,
      }
    ];

    const seededSlabs = [];
    for (const sd of slabDefs) {
      let existingSlab = await db('payroll_slabs')
        .where({ organization_id: orgId, name: sd.name })
        .whereNull('deleted_at')
        .first();

      if (!existingSlab) {
        const [slabId] = await db('payroll_slabs').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          name: sd.name,
          min_ctc: sd.min_ctc,
          max_ctc: sd.max_ctc,
          selected_component_ids: JSON.stringify(compIds),
          cycle_id: cycle.id,
          employment_type: 'Regular',
          pf_rate_pct: sd.pf_rate_pct,
          is_active: 1,
          created_by: validUserId,
          updated_by: validUserId,
          created_at: new Date(),
          updated_at: new Date()
        });
        existingSlab = await db('payroll_slabs').where('id', slabId).first();
      } else {
        await db('payroll_slabs').where('id', existingSlab.id).update({
          selected_component_ids: JSON.stringify(compIds),
          is_active: 1,
          updated_at: new Date()
        });
      }
      seededSlabs.push(existingSlab);
    }
    console.log(`✅ Configured ${seededSlabs.length} Active Pay Slabs.`);

    // 4. Fetch Employees and Assign Real Salary Structures
    const employees = await db('employees')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .limit(10);

    console.log(`\nAssigning salary structures & attendance to ${employees.length} employees...`);

    const ctcLevels = [
      { annualCtc: 360000, gross: 30000, slabIdx: 0 },
      { annualCtc: 480000, gross: 40000, slabIdx: 0 },
      { annualCtc: 720000, gross: 60000, slabIdx: 1 },
      { annualCtc: 960000, gross: 80000, slabIdx: 1 },
      { annualCtc: 1440000, gross: 120000, slabIdx: 2 },
    ];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const tier = ctcLevels[i % ctcLevels.length];
      const chosenSlab = seededSlabs[tier.slabIdx] || seededSlabs[0];

      const gross = tier.gross;
      const annualCtc = tier.annualCtc;
      const basic = Math.round(gross * 0.50); // 50% Basic
      const hra = Math.round(basic * 0.40); // 40% HRA of Basic
      const special = Math.max(0, gross - (basic + hra));
      const pf = Math.round(basic * 0.12);
      const pt = gross > 15000 ? 200 : 0;
      const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;
      const netTakeHome = Math.max(0, gross - (pf + pt + tds));

      // Check existing salary structure
      const existingStruct = await db('salary_structures')
        .where({ employee_id: emp.id, organization_id: orgId })
        .whereNull('deleted_at')
        .first();

      if (!existingStruct) {
        await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: emp.id,
          slab_id: chosenSlab.id,
          structure_name: chosenSlab.name,
          structure_code: `SLAB-${chosenSlab.id}-EMP-${emp.id}`,
          annual_ctc: annualCtc,
          gross_monthly: gross,
          basic_monthly: basic,
          hra_monthly: hra,
          special_allowance_monthly: special,
          pf_deduction: pf,
          tds_deduction: tds,
          net_take_home: netTakeHome,
          effective_from: '2026-08-01',
          status: 'active',
          created_by: validUserId,
          updated_by: validUserId,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`   👤 ${emp.first_name} ${emp.last_name || ''} (ID: ${emp.id}): Assigned Slab "${chosenSlab.name}", CTC=₹${annualCtc.toLocaleString('en-IN')}, Gross=₹${gross.toLocaleString('en-IN')}, Net=₹${netTakeHome.toLocaleString('en-IN')}`);
      } else {
        await db('salary_structures')
          .where({ id: existingStruct.id })
          .update({
            slab_id: chosenSlab.id,
            structure_name: chosenSlab.name,
            structure_code: `SLAB-${chosenSlab.id}-EMP-${emp.id}`,
            annual_ctc: annualCtc,
            gross_monthly: gross,
            basic_monthly: basic,
            hra_monthly: hra,
            special_allowance_monthly: special,
            pf_deduction: pf,
            tds_deduction: tds,
            net_take_home: netTakeHome,
            status: 'active',
            updated_at: new Date()
          });
        console.log(`   👤 ${emp.first_name} ${emp.last_name || ''} (ID: ${emp.id}): Synced Structure -> Slab "${chosenSlab.name}", CTC=₹${annualCtc.toLocaleString('en-IN')}`);
      }

      // 5. Seed Attendance Records for current month (August 2026: 28 Present Days)
      const currentYear = 2026;
      for (let day = 1; day <= 28; day++) {
        const punchDate = `${currentYear}-08-${String(day).padStart(2, '0')}`;
        const existingRecord = await db('attendance_records')
          .where({ employee_id: emp.id, organization_id: orgId, check_in_date: punchDate })
          .first();

        if (!existingRecord) {
          await db('attendance_records').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            employee_id: emp.id,
            check_in_date: punchDate,
            check_in_time: `${punchDate} 09:30:00`,
            check_out_time: `${punchDate} 18:30:00`,
            duration_minutes: 540,
            work_duration_minutes: 480,
            status: 'present',
            created_by: validUserId,
            updated_by: validUserId,
            created_at: new Date(),
            updated_at: new Date()
          }).catch(() => {});
        }
      }
    }

    console.log('\n===========================================================');
    console.log('🎉 REALISTIC PAYROLL SEED DATA READY FOR 1-CLICK PROCESSING 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error seeding payroll test data:', err);
  } finally {
    await db.destroy();
  }
}

seedPayrollTestData();
