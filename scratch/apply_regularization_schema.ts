import { db } from '../server/src/db/knex';

async function main() {
  console.log('Checking attendance_regularizations columns...');
  const hasCompanyId = await db.schema.hasColumn('attendance_regularizations', 'company_id');
  if (!hasCompanyId) {
    await db.schema.alterTable('attendance_regularizations', (table) => {
      table.bigInteger('company_id').unsigned().nullable();
    });
    console.log('Added company_id column');
  }

  const hasIsDateRange = await db.schema.hasColumn('attendance_regularizations', 'is_date_range');
  if (!hasIsDateRange) {
    await db.schema.alterTable('attendance_regularizations', (table) => {
      table.boolean('is_date_range').defaultTo(false);
      table.date('end_date').nullable();
      table.string('requested_check_in_time', 50).nullable();
      table.string('requested_check_out_time', 50).nullable();
      table.string('actual_check_in_time', 50).nullable();
      table.string('actual_check_out_time', 50).nullable();
      table.string('reason', 255).nullable();
      table.string('day_type', 100).nullable();
      table.text('comment').nullable();
      table.bigInteger('manager_id').unsigned().nullable();
      table.bigInteger('manager_approved_by').unsigned().nullable();
      table.timestamp('manager_approved_at').nullable();
      table.text('manager_comments').nullable();
      table.bigInteger('hr_approved_by').unsigned().nullable();
      table.timestamp('hr_approved_at').nullable();
      table.text('hr_comments').nullable();
    });
    console.log('Added regularization flow columns');
  }

  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
