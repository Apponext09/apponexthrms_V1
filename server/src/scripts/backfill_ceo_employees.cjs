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
    database: process.env.DB_NAME || 'apponexthrms',
  },
});

async function backfillCeoEmployees() {
  console.log('====================================================');
  console.log(' 👔 BACKFILLING CEO EMPLOYEE RECORDS FOR ORG ADMINS  ');
  console.log('====================================================\n');

  try {
    // 1. Find all organization admins
    const adminUsers = await db('users')
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('roles.code', 'organization_admin')
      .whereNotNull('users.organization_id')
      .select(
        'users.id as userId',
        'users.organization_id as orgId',
        'users.first_name as firstName',
        'users.last_name as lastName',
        'users.email as email',
        'users.employee_id as currentEmpId'
      );

    console.log(`Found ${adminUsers.length} Organization Admin user(s).\n`);

    let createdCount = 0;
    let updatedLinkCount = 0;
    let skippedCount = 0;

    for (const admin of adminUsers) {
      console.log(`----------------------------------------------------`);
      console.log(`Checking Admin User ID: ${admin.userId} | Email: ${admin.email} | Org ID: ${admin.orgId}`);

      // Check if CEO employee record already exists for this org
      let ceoEmp = await db('employees')
        .where({ organization_id: admin.orgId, is_ceo: true })
        .whereNull('deleted_at')
        .first();

      if (ceoEmp) {
        console.log(`  ✅ Existing CEO Employee Record found (ID: ${ceoEmp.id}, Code: ${ceoEmp.employee_code})`);

        // Ensure user record is linked to this CEO employee
        if (!admin.currentEmpId || admin.currentEmpId !== ceoEmp.id) {
          await db('users')
            .where({ id: admin.userId })
            .update({ employee_id: ceoEmp.id, updated_at: db.fn.now() });
          console.log(`  🔗 Updated User ${admin.userId} employee_id -> ${ceoEmp.id}`);
          updatedLinkCount++;
        } else {
          console.log(`  ✨ User ${admin.userId} is already linked to CEO employee.`);
          skippedCount++;
        }
      } else {
        // Create new CEO employee record
        const empCode = `CEO-${admin.orgId}-${admin.userId}`;
        const fName = admin.firstName || 'CEO';
        const lName = admin.lastName || '';
        const empEmail = admin.email || '';

        console.log(`  ⚡ Creating new CEO Employee Record (Code: ${empCode})...`);

        const [newEmpId] = await db('employees').insert({
          uuid: uuidv4(),
          organization_id: admin.orgId,
          employee_code: empCode,
          first_name: fName,
          last_name: lName,
          email: empEmail,
          status: 'active',
          is_ceo: true,
          is_ceo_profile_hidden: true,
          date_of_joining: new Date().toISOString().slice(0, 10),
          created_by: admin.userId || 1,
          updated_by: admin.userId || 1,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });

        // Link User to new CEO employee
        await db('users')
          .where({ id: admin.userId })
          .update({ employee_id: newEmpId, updated_at: db.fn.now() });

        console.log(`  🎉 Successfully created CEO Employee (ID: ${newEmpId}) and linked User ${admin.userId}`);
        createdCount++;
      }
    }

    console.log('\n====================================================');
    console.log(` 📊 SUMMARY:`);
    console.log(` - Created CEO Employee Records : ${createdCount}`);
    console.log(` - Linked Existing Records       : ${updatedLinkCount}`);
    console.log(` - Already Configured / Skipped   : ${skippedCount}`);
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Error during CEO employee backfill:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

backfillCeoEmployees();
