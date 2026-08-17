import { getKnex } from './db/knex';

async function testQuery() {
  const db = getKnex();
  try {
    const struct = await db('employee_salary_structures as ess')
      .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .where('ess.employee_id', 32)
      .where('ess.is_current', 1)
      .whereNull('ess.deleted_at')
      .select('ss.*')
      .first();
    console.log('ESS Join query success:', struct);
  } catch (e: any) {
    console.error('ESS Join query error:', e.message);
  }
  process.exit(0);
}

testQuery();
