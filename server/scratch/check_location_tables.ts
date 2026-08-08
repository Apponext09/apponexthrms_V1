import { getKnex } from '../src/db/knex';

async function checkLocations() {
  const db = getKnex();

  const hasLocations = await db.schema.hasTable('locations');
  const hasAttLocations = await db.schema.hasTable('attendance_locations');

  console.log('hasTable locations:', hasLocations);
  console.log('hasTable attendance_locations:', hasAttLocations);

  if (hasLocations) {
    const locs = await db('locations').select('*');
    console.log('Rows in `locations` table:', locs);
  }

  if (hasAttLocations) {
    const attLocs = await db('attendance_locations').select('*');
    console.log('Rows in `attendance_locations` table:', attLocs);
  }

  process.exit(0);
}

checkLocations().catch(err => {
  console.error(err);
  process.exit(1);
});
