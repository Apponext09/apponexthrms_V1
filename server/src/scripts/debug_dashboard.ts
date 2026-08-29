import '../config/env';
import { getKnex, closeKnex } from '../db/knex';

async function main() {
  const knex = getKnex();
  try {
    const orgs = await knex('organizations').select('id', 'name');
    console.log('Organizations:', JSON.stringify(orgs));

    const candidates = await knex('candidates').select('id', 'organization_id', 'first_name', 'last_name', 'status', 'source', 'created_at');
    console.log('Candidates count:', candidates.length, 'Sample:', JSON.stringify(candidates.slice(0, 5)));

    const applications = await knex('applications').select('id', 'organization_id', 'candidate_id', 'job_id', 'application_status', 'created_at', 'applied_from_source');
    console.log('Applications count:', applications.length, 'Sample:', JSON.stringify(applications.slice(0, 10)));

    const jobs = await knex('jobs').select('id', 'organization_id', 'job_title', 'job_code', 'status', 'department_id');
    console.log('Jobs count:', jobs.length, 'Sample:', JSON.stringify(jobs.slice(0, 5)));

    const pipelineStages = await knex('pipeline_stages').select('*');
    console.log('Pipeline stages:', JSON.stringify(pipelineStages));

  } catch (err) {
    console.error('Error debugging dashboard:', err);
  } finally {
    await closeKnex();
    process.exit(0);
  }
}

main();
