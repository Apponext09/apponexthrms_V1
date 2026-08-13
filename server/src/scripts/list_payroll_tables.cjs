require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  }
});

async function main() {
  // Show all group-related tables
  const [groupTables] = await knex.raw('SHOW TABLES LIKE "%group%"');
  console.log('\n== GROUP TABLES ==');
  groupTables.forEach(r => console.log(' ', Object.values(r)[0]));

  // Show all slab-related tables
  const [slabTables] = await knex.raw('SHOW TABLES LIKE "%slab%"');
  console.log('\n== SLAB TABLES ==');
  slabTables.forEach(r => console.log(' ', Object.values(r)[0]));

  // Show all payroll-related tables
  const [payrollTables] = await knex.raw('SHOW TABLES LIKE "%payroll%"');
  console.log('\n== PAYROLL TABLES ==');
  payrollTables.forEach(r => console.log(' ', Object.values(r)[0]));

  // Show employee slab tables
  const [empSlabTables] = await knex.raw('SHOW TABLES LIKE "%employee%slab%"');
  console.log('\n== EMPLOYEE SLAB TABLES ==');
  empSlabTables.forEach(r => console.log(' ', Object.values(r)[0]));

  await knex.destroy();
}

main().catch(e => { console.error(e.message); process.exit(1); });
