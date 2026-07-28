import { getKnex } from './server/src/db/knex';

async function clean() {
  try {
    const db = getKnex();
    // Disable FK checks to safely clean default seeded tables for new organizations
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    const deletedDesignations = await db('designations').where('organization_id', '>', 1).delete();
    const deletedDepts = await db('departments').where('organization_id', '>', 1).delete();

    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`Successfully deleted ${deletedDepts} default departments and ${deletedDesignations} default designations for new organizations.`);

    const remainingDepts = await db('departments').select('id', 'name', 'organization_id');
    console.log('Remaining departments in DB:', remainingDepts);
  } catch (err) {
    console.error('Error cleaning departments:', err);
  }
  process.exit(0);
}

clean();
