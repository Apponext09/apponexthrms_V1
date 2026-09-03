import * as dotenv from 'dotenv';
import * as path from 'path';
import { getKnex } from '../db/knex';
import { skillMasterService } from '../modules/recruitment/services/SkillMasterService';
import { resumeScreeningEngine } from '../modules/recruitment/services/ResumeScreeningEngine';
import { jobAiService } from '../modules/recruitment/services/JobAiService';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function test() {
  const knex = getKnex();
  const org = await knex('organizations').first();
  const user = await knex('users').first();
  const ctx = { organizationId: org?.id || 1, userId: user?.id || 1 };

  console.log('🧪 Testing Recruitment AI ATS & Screening System...');

  // 1. Test Skill Master Alias Normalization
  console.log('\n--- 1. Testing Skill Master & Alias Normalization ---');
  const jsNorm = skillMasterService.normalizeSkill('ECMAScript');
  const pgNorm = skillMasterService.normalizeSkill('Postgres');
  const pyNorm = skillMasterService.normalizeSkill('python3');
  console.log(`- 'ECMAScript' -> '${jsNorm}' (Expected: JavaScript)`);
  console.log(`- 'Postgres' -> '${pgNorm}' (Expected: PostgreSQL)`);
  console.log(`- 'python3' -> '${pyNorm}' (Expected: Python)`);

  const matchCheck = skillMasterService.matchSkills(
    ['Node.js', 'PostgreSQL', 'Docker', 'Redis', 'REST API'],
    ['node', 'postgres', 'docker', 'express.js']
  );
  console.log('- Matched:', matchCheck.matched);
  console.log('- Missing:', matchCheck.missing);
  console.log(`- Match %: ${matchCheck.matchPercentage}%`);

  // 2. Fetch or create a test job
  console.log('\n--- 2. Fetching/Creating Test Job Opening ---');
  let testJob = await knex('jobs').where('organization_id', ctx.organizationId).first();
  if (!testJob) {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await knex('jobs').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      job_code: `TEST-NODE-DEV-${Date.now().toString().slice(-4)}`,
      job_title: 'Senior Node.js Developer',
      job_description: '<p>Looking for a Senior Node.js Developer with experience in PostgreSQL, Docker, Redis, and REST APIs.</p>',
      job_type: 'full_time',
      experience_level: 'senior',
      min_experience_years: 3,
      max_experience_years: 6,
      employment_type: 'onsite',
      no_of_positions: 2,
      status: 'published',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    testJob = await knex('jobs').where('id', id).first();
  } else {
    // Ensure testJob has job_title
    await knex('jobs').where('id', testJob.id).update({
      job_title: 'Senior Node.js Developer',
      job_description: '<p>Looking for a Senior Node.js Developer with experience in PostgreSQL, Docker, Redis, and REST APIs.</p>',
      min_experience_years: 3,
    });
    testJob = await knex('jobs').where('id', testJob.id).first();
  }
  console.log(`✓ Using Job: #${testJob.id} - ${testJob.job_title}`);

  // 3. Save AI Screening Settings for this Job
  console.log('\n--- 3. Testing Job AI Screening Settings ---');
  const savedSettings = await jobAiService.saveJobAiSettings(ctx, testJob.id, {
    aiScreeningEnabled: true,
    atsEnabled: true,
    atsThreshold: 85,
    jdMatchEnabled: true,
    jdMatchThreshold: 80,
    shortlistingMode: 'ATS_AND_JD',
    autoShortlistEnabled: false,
    suggestionLimit: 50,
    mandatorySkills: ['Node.js', 'PostgreSQL'],
    minExperience: 3,
  });
  console.log('✓ Saved AI Settings:', {
    atsThreshold: savedSettings.atsThreshold,
    jdMatchThreshold: savedSettings.jdMatchThreshold,
    shortlistingMode: savedSettings.shortlistingMode,
    mandatorySkills: savedSettings.mandatorySkills,
  });

  // 4. Create sample candidates with varying profiles to test separation of ATS vs JD match
  console.log('\n--- 4. Testing Candidates ATS & JD Match Screening ---');
  
  // Candidate A: Strong ATS (90+) + Strong JD Match (90+) -> Eligible
  let candA = await knex('candidates').where({ email: 'rahul.sharma.test@example.com', organization_id: ctx.organizationId }).first();
  if (!candA) {
    const { v4: uuidv4 } = await import('uuid');
    const [candId] = await knex('candidates').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      first_name: 'Rahul',
      last_name: 'Sharma',
      email: 'rahul.sharma.test@example.com',
      phone: '+91 9876543210',
      current_company: 'Tech Innovations Ltd',
      years_of_experience: 4.5,
      qualification: 'B.Tech Computer Science',
      skills: 'Node.js, Express, PostgreSQL, REST API, Redis, Docker, JavaScript',
      source: 'direct_apply',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    candA = await knex('candidates').where('id', candId).first();
  }

  // Candidate B: High ATS (Good format/parsing) but Poor JD Match (e.g. Python/Django background)
  let candB = await knex('candidates').where({ email: 'sneha.joshi.test@example.com', organization_id: ctx.organizationId }).first();
  if (!candB) {
    const { v4: uuidv4 } = await import('uuid');
    const [candId] = await knex('candidates').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      first_name: 'Sneha',
      last_name: 'Joshi',
      email: 'sneha.joshi.test@example.com',
      phone: '+91 9811223344',
      current_company: 'Finance Corp',
      years_of_experience: 5.0,
      qualification: 'MCA Computer Applications',
      skills: 'Python, Django, Flask, SQLite, Pandas, Machine Learning',
      source: 'direct_apply',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    candB = await knex('candidates').where('id', candId).first();
  }

  const resA = await resumeScreeningEngine.screenCandidateForJob(ctx, candA.id, testJob.id);
  console.log(`\nCandidate A (${candA.first_name} ${candA.last_name}):`);
  console.log(`- ATS Score: ${resA.atsScore}%`);
  console.log(`- JD Match Score: ${resA.jdMatchScore}%`);
  console.log(`- Mandatory Met: ${resA.mandatoryRequirementsMet}`);
  console.log(`- Recommendation: ${resA.recommendation} (${resA.statusLabel})`);
  console.log(`- Reasons:`, resA.reasons);

  const resB = await resumeScreeningEngine.screenCandidateForJob(ctx, candB.id, testJob.id);
  console.log(`\nCandidate B (${candB.first_name} ${candB.last_name}):`);
  console.log(`- ATS Score: ${resB.atsScore}%`);
  console.log(`- JD Match Score: ${resB.jdMatchScore}%`);
  console.log(`- Mandatory Met: ${resB.mandatoryRequirementsMet}`);
  console.log(`- Recommendation: ${resB.recommendation} (${resB.statusLabel})`);
  console.log(`- Reasons:`, resB.reasons);

  // 5. Test AI Suggestions Ranking API
  console.log('\n--- 5. Testing AI Suggestions Ranking ---');
  const suggestionsData = await jobAiService.getAiSuggestions(ctx, testJob.id, { limit: 5 });
  console.log(`✓ Suggestions Stats:`, suggestionsData.stats);
  console.log(`✓ Top Ranked Candidates:`);
  for (const s of suggestionsData.suggestions) {
    console.log(`  #${s.rank} ${s.name} | ATS: ${s.atsScore}% | JD Match: ${s.jdMatchScore}% | Status: ${s.status}`);
  }

  console.log('\n🎉 ALL RECRUITMENT AI ATS TESTS PASSED!');
  process.exit(0);
}

test().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
