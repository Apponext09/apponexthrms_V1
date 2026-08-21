import { initializeKnex } from './src/db/knex';

async function runTest() {
  const db = initializeKnex();

  console.log('\n========== ORG ID DIAGNOSTIC ==========');

  // 1. What orgs exist?
  const orgs = await db('organizations').select('id', 'name').limit(10).catch(() => []);
  console.log('\n[1] Organizations:', JSON.stringify(orgs));

  // 2. What companies exist?
  const companies = await db('companies').select('id', 'name').limit(10).catch(() => []);
  console.log('\n[2] Companies:', JSON.stringify(companies));

  // 3. What is organization_id in candidates table for existing records?
  const candSample = await db('candidates').select('id', 'organization_id', 'first_name', 'email').orderBy('id', 'desc').limit(5).catch(() => []);
  console.log('\n[3] Recent candidates:', JSON.stringify(candSample));

  // 4. What is organization_id in resume_bank for existing records?
  const rbSample = await db('resume_bank').select('id', 'organization_id', 'tracker_id').orderBy('id', 'desc').limit(5).catch(() => []);
  console.log('\n[4] Recent resume_bank:', JSON.stringify(rbSample));

  // 5. What is organization_id in resume_upload_logs for existing records?
  const logSample = await db('resume_upload_logs').select('id', 'organization_id', 'file_name').orderBy('id', 'desc').limit(5).catch(() => []);
  console.log('\n[5] Recent upload logs:', JSON.stringify(logSample));

  // 6. Try insert with org_id from actual orgs
  if (orgs.length > 0) {
    const realOrgId = (orgs[0] as any).id;
    console.log(`\n[6] Testing insert with real orgId=${realOrgId}...`);
    try {
      const result = await db('resume_upload_logs').insert({
        uuid: '11111111-1111-1111-1111-111111111111',
        file_name: 'test_diag.pdf',
        total_records: 1,
        success_count: 0,
        failed_count: 0,
        status: 'Processing',
        organization_id: realOrgId,
        uploaded_by: 1,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      console.log(`  ✓ INSERT SUCCESS with orgId=${realOrgId}: id=${result[0]}`);
      await db('resume_upload_logs').where('id', result[0]).del();
    } catch (err: any) {
      console.error(`  ✗ INSERT FAILED: ${err.message}`);
    }
  }

  // 7. Check resolveTenant - what does it produce?
  console.log('\n[7] Auth / resolveTenant check...');
  const tokens = await db('personal_access_tokens').select('tokenable_id', 'tokenable_type').limit(3).catch(() => []);
  console.log('  Access tokens sample:', JSON.stringify(tokens));

  const users = await db('users').select('id', 'organization_id', 'email').limit(5).catch(() => []);
  console.log('  Users sample:', JSON.stringify(users));

  console.log('\n=======================================');
  await db.destroy();
}

runTest().catch(console.error);
