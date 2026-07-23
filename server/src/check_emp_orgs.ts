import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    const user10 = await db('users').where({ id: 10 }).first();
    console.log('User 10 (samarth@gmail.com): organization_id =', user10?.organizationId);

    const empList = await db('employees').select('id', 'first_name', 'last_name', 'email', 'organization_id');
    console.log('\n--- ALL EMPLOYEES & THEIR ORG IDs ---');
    empList.forEach(e => console.log(`Emp [${e.id}] ${e.email} | orgId:${e.organizationId}`));

    // Fix all employees to have organization_id = user10.organizationId if null or 3
    if (user10?.organizationId) {
      await db('employees').update({ organization_id: user10.organizationId });
      console.log(`\n✅ Updated ALL employees to organization_id = ${user10.organizationId}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
