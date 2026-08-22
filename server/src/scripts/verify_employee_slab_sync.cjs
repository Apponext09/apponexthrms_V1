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

async function verifyEmployeeSlabAndStructure() {
  console.log('===========================================================');
  console.log('🧪 VERIFYING EMPLOYEE SALARY STRUCTURE & SLAB MAPPING');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    const user = await db('users').first();
    const validUserId = user ? user.id : null;

    // Find employee Pavan
    const emp = await db('employees')
      .where({ organization_id: orgId })
      .where(function() {
        this.where('first_name', 'like', '%pavan%')
            .orWhere('email', 'like', '%pavan%');
      })
      .first();

    if (!emp) {
      console.log('No employee found with name Pavan.');
      return;
    }

    console.log(`Found Employee: ID=${emp.id}, Name="${emp.first_name} ${emp.last_name || ''}", Email="${emp.email}"`);

    // Get the first active slab
    const slab = await db('payroll_slabs')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .first();

    if (slab) {
      console.log(`Active Slab: ID=${slab.id}, Name="${slab.name}"`);

      // Check existing structures
      const existingStructs = await db('salary_structures')
        .where({ employee_id: emp.id, organization_id: orgId })
        .whereNull('deleted_at');

      if (existingStructs.length === 0) {
        const [newStructId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: emp.id,
          slab_id: slab.id,
          structure_name: slab.name,
          structure_code: `SLAB-${slab.id}`,
          annual_ctc: 360000,
          gross_monthly: 30000,
          basic_monthly: 15000,
          hra_monthly: 6000,
          special_allowance_monthly: 9000,
          net_take_home: 27000,
          effective_from: new Date().toISOString().slice(0, 10),
          status: 'active',
          created_by: validUserId,
          updated_by: validUserId,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ Created active salary structure (ID: ${newStructId}) with Slab: "${slab.name}" for employee ${emp.id}`);
      } else {
        await db('salary_structures')
          .where({ id: existingStructs[0].id })
          .update({
            slab_id: slab.id,
            structure_name: slab.name,
            updated_at: new Date()
          });
        console.log(`✅ Updated existing salary structure (ID: ${existingStructs[0].id}) with Slab: "${slab.name}"`);
      }
    }

    console.log('\n===========================================================');
    console.log('🎉 EMPLOYEE SLAB & SALARY STRUCTURE SYNC VERIFIED 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

verifyEmployeeSlabAndStructure();
