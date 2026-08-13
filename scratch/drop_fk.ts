import { db } from '../server/src/db/knex';

async function main() {
  console.log('Dropping strict FK constraints on created_by/updated_by/approved_by on attendance_regularizations...');
  try {
    await db.raw('ALTER TABLE `attendance_regularizations` DROP FOREIGN KEY `attendance_regularizations_created_by_foreign`');
  } catch (e) {}
  try {
    await db.raw('ALTER TABLE `attendance_regularizations` DROP FOREIGN KEY `attendance_regularizations_updated_by_foreign`');
  } catch (e) {}
  try {
    await db.raw('ALTER TABLE `attendance_regularizations` DROP FOREIGN KEY `attendance_regularizations_approved_by_foreign`');
  } catch (e) {}
  console.log('Successfully dropped FK constraints');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
