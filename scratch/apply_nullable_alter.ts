import { db } from '../server/src/db/knex';

async function main() {
  console.log('Modifying created_by and updated_by columns on attendance_regularizations to be NULLABLE...');
  await db.raw('ALTER TABLE `attendance_regularizations` MODIFY COLUMN `created_by` BIGINT UNSIGNED NULL');
  await db.raw('ALTER TABLE `attendance_regularizations` MODIFY COLUMN `updated_by` BIGINT UNSIGNED NULL');
  console.log('Successfully altered created_by and updated_by columns to NULLABLE');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
