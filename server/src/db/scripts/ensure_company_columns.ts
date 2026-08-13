import { getKnex } from '../knex';

async function run() {
  const knex = getKnex();

  console.log('Fetching all database tables from MySQL...');
  const [tablesResult] = await knex.raw('SHOW TABLES');
  const databaseName = process.env.DB_NAME || 'apponexthrms';
  const tableKey = `Tables_in_${databaseName}`;

  const allTables: string[] = tablesResult.map((row: any) => row[tableKey] || Object.values(row)[0]);

  console.log(`Found total ${allTables.length} tables in database.`);
  console.log('Ensuring company_id column exists on ALL tables...');

  let addedCount = 0;
  let alreadyExistedCount = 0;
  let errorCount = 0;

  for (const tableName of allTables) {
    try {
      const hasColumn = await knex.schema.hasColumn(tableName, 'company_id');
      if (!hasColumn) {
        const hasOrgId = await knex.schema.hasColumn(tableName, 'organization_id');
        const hasId = await knex.schema.hasColumn(tableName, 'id');

        await knex.schema.table(tableName, (table) => {
          let col = table.bigInteger('company_id').unsigned().nullable();
          if (hasOrgId) {
            col.after('organization_id');
          } else if (hasId) {
            col.after('id');
          }
        });
        console.log(`[ADDED] company_id column added to table: ${tableName}`);
        addedCount++;
      } else {
        console.log(`[EXISTS] company_id already exists on table: ${tableName}`);
        alreadyExistedCount++;
      }
    } catch (err: any) {
      console.error(`[ERROR] Failed to alter table ${tableName}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n--- MIGRATION SUMMARY ---');
  console.log(`Total Tables Processed : ${allTables.length}`);
  console.log(`Newly Added company_id : ${addedCount}`);
  console.log(`Already Had company_id : ${alreadyExistedCount}`);
  console.log(`Errors Encountered     : ${errorCount}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration execution error:', err);
  process.exit(1);
});
