import { getKnex } from '../db/knex';

async function main() {
  const db = getKnex();
  const jobs = await db('jobs').select('id', 'job_code', 'job_title', 'organization_id', 'status', 'expiry_date', 'deleted_at');
  console.log('ALL JOBS:', JSON.stringify(jobs, null, 2));

  const mrfs = await db('mrf_requests').select('id', 'mr_number', 'position_title', 'organization_id', 'status', 'stage', 'deleted_at');
  console.log('ALL MRFS:', JSON.stringify(mrfs, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
