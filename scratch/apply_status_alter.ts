import { db } from '../server/src/db/knex';

async function main() {
  console.log('Modifying status column on attendance_regularizations to VARCHAR(50)...');
  await db.raw('ALTER TABLE `attendance_regularizations` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT "pending_manager"');
  console.log('Successfully altered status column to VARCHAR(50)');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
