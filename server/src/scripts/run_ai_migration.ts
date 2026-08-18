import * as dotenv from 'dotenv';
import * as path from 'path';
import { getKnex } from '../db/knex';
import * as aiMigration from '../db/migrations/20260817000001_create_recruitment_ai_ats_tables';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function run() {
  const knex = getKnex();
  try {
    console.log('Running Recruitment AI & ATS tables migration...');
    await aiMigration.up(knex);
    console.log('✅ Recruitment AI & ATS tables migration completed successfully!');
    
    // Verify created tables
    const tables = ['skills', 'skill_aliases', 'job_ai_settings', 'resume_ats_scores', 'candidate_job_matches', 'candidate_job_actions'];
    for (const t of tables) {
      const exists = await knex.schema.hasTable(t);
      console.log(`- Table ${t}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
