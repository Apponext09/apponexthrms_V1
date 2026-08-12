import { getKnex } from '../src/db/knex';

async function checkSchema() {
  const db = getKnex();
  const hasTable = await db.schema.hasTable('employee_onboarding_records');
  console.log('employee_onboarding_records exists:', hasTable);

  if (hasTable) {
    const columns = await db.raw('SHOW COLUMNS FROM employee_onboarding_records');
    console.log('\n--- COLUMNS IN employee_onboarding_records ---');
    columns[0].forEach((col: any) => {
      console.log(`${col.Field} (${col.Type}) - Null: ${col.Null}`);
    });
  } else {
    console.log('Table does not exist, checking migration schema...');
  }
  process.exit(0);
}

checkSchema().catch((err) => {
  console.error(err);
  process.exit(1);
});
