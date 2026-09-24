// Read-only schema preflight; never prints connection credentials or request data.
const dotenv = require('dotenv');
dotenv.config({ path: 'server/.env', quiet: true });
dotenv.config({ path: '.env', quiet: true });
const db = require('knex')({ client: 'mysql2', connection: {
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
}, pool: { min: 0, max: 1, acquireTimeoutMillis: 3000 } });
db.raw('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?,?,?,?)',
  ['workflows', 'workflow_steps', 'expense_claims', 'travel_requests', 'travel_advances', 'mileage_claims', 'expense_mileage_designation_rates'])
  .then(async r => {
    const grouped = {}; for (const c of r[0]) (grouped[c.TABLE_NAME] ||= []).push(`${c.COLUMN_NAME}:${c.COLUMN_TYPE}`); console.log(JSON.stringify(grouped, null, 2));
    console.log('Foreign keys', JSON.stringify((await db.raw("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('expense_claims','travel_requests','travel_advances','mileage_claims') AND REFERENCED_TABLE_NAME IS NOT NULL"))[0]));
    console.log('Workflow definitions', JSON.stringify(await db('workflows').whereIn('type', ['expense_claim','travel_request','travel_advance','mileage_claim']).select('id','type','status','approval_pattern','applicability_filters')));
    console.log('Legacy workflow definitions', JSON.stringify(await db('expense_workflows').select('*')));
    console.log('Legacy step definitions', JSON.stringify(await db('expense_workflow_levels').select('*')));
    console.log('Required fixture columns', JSON.stringify((await db.raw("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','employees','departments','expense_categories','roles','user_roles','leave_applications') AND IS_NULLABLE='NO' AND COLUMN_DEFAULT IS NULL AND EXTRA NOT LIKE '%auto_increment%'"))[0]));
  })
  .catch(e => { console.error(e.code || 'Database schema check failed'); process.exitCode = 1; })
  .finally(() => db.destroy());
