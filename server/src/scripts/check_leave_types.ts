import { getKnex } from '../db/knex';

async function checkLeaveTypes() {
  const db = getKnex();
  try {
    const types = await db('leave_types').select('*');
    console.log("Found leave types:", types.length);
    if (types.length > 0) {
      console.log("Keys available:", Object.keys(types[0]));
      console.log("Sample type:", JSON.stringify(types[0], null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkLeaveTypes();
