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

async function seedLeaveTypes() {
  console.log('====================================================');
  console.log('  🏖️ SEEDING LEAVE CATEGORIES / LEAVE TYPES        ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const users = await db('users').select('id');
    const userId = users.length > 0 ? users[0].id : 47;

    const leaveTypesToInsert = [
      { leave_name: 'Casual Leave (CL)', leave_code: 'CL', annual_quota: 12 },
      { leave_name: 'Sick Leave (SL)', leave_code: 'SL', annual_quota: 10 },
      { leave_name: 'Privilege Leave / Earned Leave', leave_code: 'PL', annual_quota: 15 },
      { leave_name: 'Maternity Leave', leave_code: 'ML', annual_quota: 180 },
      { leave_name: 'Paternity Leave', leave_code: 'PTL', annual_quota: 7 },
      { leave_name: 'Unpaid Leave / LOP', leave_code: 'LOP', annual_quota: 0 },
    ];

    for (const lt of leaveTypesToInsert) {
      const existing = await db('leave_types')
        .where('organization_id', orgId)
        .where('leave_code', lt.leave_code)
        .first();

      if (!existing) {
        await db('leave_types').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          leave_name: lt.leave_name,
          leave_code: lt.leave_code,
          annual_quota: lt.annual_quota,
          status: 'active',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ Inserted leave category: "${lt.leave_name}" (${lt.leave_code})`);
      } else {
        await db('leave_types')
          .where('id', existing.id)
          .update({
            leave_name: lt.leave_name,
            status: 'active',
            updated_by: userId,
            updated_at: new Date()
          });
        console.log(`ℹ️ Updated leave category "${lt.leave_name}" (${lt.leave_code}).`);
      }
    }

    console.log('\n====================================================');
    console.log('  🎉 LEAVE CATEGORIES SEEDED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error seeding leave types:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedLeaveTypes();
