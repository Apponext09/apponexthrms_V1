import { getKnex } from '../src/db/knex';

async function inspect() {
  const knex = getKnex();
  const [tablesResult] = await knex.raw('SHOW TABLES');
  const databaseName = process.env.DB_NAME || 'apponexthrms';
  const tableKey = `Tables_in_${databaseName}`;

  const allTables: string[] = tablesResult.map((row: any) => row[tableKey] || Object.values(row)[0]);

  console.log(`Total tables found: ${allTables.length}`);

  const tablesWithCompanyId: string[] = [];
  const tablesWithoutCompanyId: string[] = [];

  for (const table of allTables) {
    const hasColumn = await knex.schema.hasColumn(table, 'company_id');
    if (hasColumn) {
      tablesWithCompanyId.push(table);
    } else {
      tablesWithoutCompanyId.push(table);
    }
  }

  console.log('\n--- TABLES WITH company_id (' + tablesWithCompanyId.length + ') ---');
  console.log(tablesWithCompanyId.join(', '));

  console.log('\n--- TABLES WITHOUT company_id (' + tablesWithoutCompanyId.length + ') ---');
  console.log(tablesWithoutCompanyId.join('\n'));

  process.exit(0);
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
