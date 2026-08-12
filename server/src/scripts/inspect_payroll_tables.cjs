const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function inspectPayrollTables() {
  const cCols = await db.raw('DESCRIBE payroll_cycles').catch(() => null);
  if (cCols) console.log('payroll_cycles columns:', cCols[0].map(c => c.Field));

  const compCols = await db.raw('DESCRIBE payroll_components').catch(() => null);
  if (compCols) console.log('payroll_components columns:', compCols[0].map(c => c.Field));

  const sCols = await db.raw('DESCRIBE payroll_slabs').catch(() => null);
  if (sCols) console.log('payroll_slabs columns:', sCols[0].map(c => c.Field));

  await db.destroy();
  process.exit(0);
}

inspectPayrollTables();
