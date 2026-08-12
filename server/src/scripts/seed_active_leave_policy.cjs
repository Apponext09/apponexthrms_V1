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

async function seedActiveLeavePolicy() {
  console.log('====================================================');
  console.log('  🏖️ CREATING & ACTIVATING STANDARD LEAVE POLICY   ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const users = await db('users').select('id');
    const userId = users.length > 0 ? users[0].id : 47;

    // Insert or update active policy in leave_policies using real columns
    let policy = await db('leave_policies').where('organization_id', orgId).first();
    if (!policy) {
      const [newPolicyId] = await db('leave_policies').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'Standard Enterprise Leave Policy 2026',
        code: 'STD_POLICY_2026',
        is_default: 1,
        status: 'active',
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      policy = { id: newPolicyId };
      console.log(`✅ Inserted active leave policy: ID=${newPolicyId}`);
    } else {
      await db('leave_policies').where('id', policy.id).update({
        status: 'active',
        name: 'Standard Enterprise Leave Policy 2026',
        is_default: 1,
        updated_by: userId,
        updated_at: new Date()
      });
      console.log(`✅ Activated existing leave policy: ID=${policy.id}`);
    }

    // Link leave_types to this active leave_policy_id if column exists
    const hasPolicyIdCol = await db.schema.hasColumn('leave_types', 'leave_policy_id');
    if (hasPolicyIdCol && policy) {
      await db('leave_types').where('organization_id', orgId).update({
        leave_policy_id: policy.id
      });
      console.log(`✅ Linked all leave_types to leave_policy_id=${policy.id}`);
    }

    console.log('\n====================================================');
    console.log('  🎉 LEAVE POLICY CREATED & ACTIVATED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error creating leave policy:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedActiveLeavePolicy();
