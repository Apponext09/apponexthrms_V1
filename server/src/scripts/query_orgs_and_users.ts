import { initializeKnex } from '../db/knex.js';
import * as fs from 'fs';
import * as path from 'path';

async function queryRecruitmentData() {
  const db = initializeKnex();
  try {
    const candidates = await db('candidates').select('id', 'organization_id', 'first_name', 'last_name', 'email');
    const applications = await db('applications').select('id', 'organization_id', 'candidate_id', 'job_id', 'application_status', 'applied_at');
    const jobs = await db('jobs').select('id', 'organization_id', 'job_title', 'job_code');
    const dump = {
      candidates,
      applications,
      jobs,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.resolve(process.cwd(), 'recruitment_dump.log'), JSON.stringify(dump, null, 2));
    console.log('✅ Dumped recruitment data to recruitment_dump.log');
  } catch (error: any) {
    console.error('Error querying DB:', error);
  }
}

queryRecruitmentData();
