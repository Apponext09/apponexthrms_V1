import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [tablesResult] = await knex.raw('SHOW TABLES');
  const databaseName = process.env.DB_NAME || 'apponexthrms';
  const tableKey = `Tables_in_${databaseName}`;

  const allTables: string[] = tablesResult.map((row: any) => row[tableKey] || Object.values(row)[0]);

  for (const tableName of allTables) {
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
      console.log(`[MIGRATION] Added company_id to ${tableName}`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Safe down migration
}
