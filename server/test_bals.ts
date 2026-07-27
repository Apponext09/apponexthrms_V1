import { getKnex } from './src/db/knex';
async function test() {
  const db = getKnex();
  const balances = await db('leave_balances as lb')
    .join('leave_types as lt', 'lt.id', 'lb.leave_type_id')
    .select('lb.*', 'lt.leave_name', 'lt.leave_code');
  console.log('Balances:', balances);
  process.exit(0);
}
test();
