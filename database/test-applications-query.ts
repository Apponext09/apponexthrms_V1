import knex from 'knex';
import config from './knexfile';

const db = knex(config.development);

async function run() {
  console.log('🔄 Running applications query diagnostic...');
  try {
    const query = db('applications')
      .where('applications.organization_id', 1)
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .leftJoin('mrf_requests', 'jobs.mrf_request_id', 'mrf_requests.id')
      .leftJoin('departments', 'jobs.department_id', 'departments.id')
      .select([
        'applications.*',
        db.raw("TRIM(CONCAT(candidates.first_name, ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
        'candidates.email as candidate_email',
        'candidates.phone as candidate_phone',
        db.raw("(SELECT GROUP_CONCAT(skill_name SEPARATOR ', ') FROM candidate_skills WHERE candidate_skills.candidate_id = candidates.id) as candidate_skills"),
        'candidates.status as candidate_status',
        'jobs.job_title as position_title',
        'departments.name as department_name'
      ]);

    const countQuery = query.clone().clearSelect().count('applications.id as count').first();
    const countResult = await countQuery;
    console.log('Count Result:', countResult);

    const items = await query.limit(10).offset(0);
    console.log('Items Count:', items.length);
  } catch (err: any) {
    console.error('❌ SQL Error:', err.message);
    console.error(err.stack);
  }
}

run().finally(() => db.destroy());
