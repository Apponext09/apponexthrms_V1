const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkFKs() {
  const fks = await db.raw(`
    SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = 'health'
      AND REFERENCED_TABLE_NAME IN ('payroll_runs', 'payroll_run_employees');
  `);
  console.log('Foreign keys referencing payroll_runs and payroll_run_employees:');
  console.log(fks[0]);
  await db.destroy();
}

checkFKs().catch(console.error);
