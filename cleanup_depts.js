const { getKnex } = require('./server/dist/db/knex');

async function clean() {
  try {
    const db = getKnex();
    // Delete auto-seeded default departments for new organizations (organization_id > 1)
    const deletedCount = await db('departments').where('organization_id', '>', 1).delete();
    console.log(`Successfully deleted ${deletedCount} default departments for new organizations.`);

    const remainingDepts = await db('departments').select('id', 'name', 'organization_id');
    console.log('Remaining departments in DB:', remainingDepts);
  } catch (err) {
    console.error('Error cleaning departments:', err);
  } finally {
    process.exit(0);
  }
}

clean();
