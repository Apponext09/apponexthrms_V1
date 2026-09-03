const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function testSettlementTables() {
  console.log("Checking Full & Final Settlement table setup...");

  const hasTable = await knex.schema.hasTable('full_final_settlements') || await knex.schema.hasTable('full_and_final_settlements');
  console.log("Settlement Table Exists:", hasTable);

  if (hasTable) {
    const tableName = await knex.schema.hasTable('full_final_settlements') ? 'full_final_settlements' : 'full_and_final_settlements';
    const rows = await knex(tableName).select('*').limit(5);
    console.log(`Found ${rows.length} settlement rows in DB table '${tableName}'.`);
    if (rows.length > 0) {
      console.log("Sample Settlement Row:", rows[0]);
    }
  }

  await knex.destroy();
}

testSettlementTables().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
