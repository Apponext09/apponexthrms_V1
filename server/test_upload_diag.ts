/**
 * Test script to diagnose why resume bulk upload fails
 * Run: npx tsx test_upload_diag.ts
 */
import { initializeKnex } from './src/db/knex';

async function runTest() {
  const db = initializeKnex();
  const orgId = 14; // As shown in screenshot "Uploaded By: 14"

  console.log('\n========== RESUME UPLOAD FAILURE DIAGNOSTIC ==========');

  // 1. Check candidates table structure
  console.log('\n[1] Checking candidates table columns...');
  const candidateCols = await db('information_schema.columns')
    .where({ TABLE_SCHEMA: db.client.config.connection.database, TABLE_NAME: 'candidates' })
    .select('COLUMN_NAME', 'DATA_TYPE', 'IS_NULLABLE', 'COLUMN_DEFAULT', 'EXTRA')
    .catch((err: any) => { console.error('Error:', err.message); return []; });

  const requiredCols = ['uuid', 'first_name', 'last_name', 'email', 'status', 'organization_id', 'deleted_at'];
  for (const col of requiredCols) {
    const found = (candidateCols as any[]).find((c: any) => c.COLUMN_NAME === col);
    if (found) {
      const nullable = found.IS_NULLABLE === 'YES' ? '(nullable)' : `(NOT NULL default=${found.COLUMN_DEFAULT || 'NONE'})`;
      console.log(`  ✓ ${col}: ${found.DATA_TYPE} ${nullable}`);
    } else {
      console.log(`  ✗ MISSING: ${col}`);
    }
  }

  // 2. Check resume_upload_logs table structure
  console.log('\n[2] Checking resume_upload_logs table...');
  const hasLogTable = await db.schema.hasTable('resume_upload_logs').catch(() => false);
  if (hasLogTable) {
    const logCols = await db('information_schema.columns')
      .where({ TABLE_SCHEMA: db.client.config.connection.database, TABLE_NAME: 'resume_upload_logs' })
      .select('COLUMN_NAME', 'IS_NULLABLE')
      .catch(() => []);
    const logColNames = (logCols as any[]).map((c: any) => c.COLUMN_NAME);
    console.log('  Columns:', logColNames.join(', '));
    const hasDeleted = logColNames.includes('deleted_at');
    console.log('  deleted_at exists:', hasDeleted ? '✓ YES' : '✗ NO - THIS IS A BUG');
  } else {
    console.log('  ✗ TABLE MISSING: resume_upload_logs');
  }

  // 3. Try inserting test candidate directly
  console.log('\n[3] Testing direct candidate insert...');
  const testEmail = `test_diag_${Date.now()}@example.com`;
  try {
    const [insertId] = await db('candidates').insert({
      uuid: require('crypto').randomUUID(),
      first_name: 'Test',
      last_name: 'Diag',
      email: testEmail,
      organization_id: orgId,
      status: 'applied',
      source: 'bulk_import',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`  ✓ INSERT SUCCESS: id=${insertId}`);
    // cleanup
    await db('candidates').where('id', insertId).del();
    console.log(`  ✓ Cleanup done`);
  } catch (err: any) {
    console.error(`  ✗ INSERT FAILED: ${err.message}`);
    console.error(`  SQL Code: ${err.code}`);
    console.error(`  SQL Number: ${err.errno}`);
  }

  // 4. Try inserting test resume_upload_log directly
  console.log('\n[4] Testing direct resume_upload_log insert...');
  if (hasLogTable) {
    try {
      const [logId] = await db('resume_upload_logs').insert({
        uuid: require('crypto').randomUUID(),
        file_name: 'test_diag.pdf',
        total_records: 1,
        success_count: 0,
        failed_count: 0,
        status: 'Processing',
        organization_id: orgId,
        uploaded_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`  ✓ INSERT SUCCESS: id=${logId}`);
      await db('resume_upload_logs').where('id', logId).del();
      console.log(`  ✓ Cleanup done`);
    } catch (err: any) {
      console.error(`  ✗ INSERT FAILED: ${err.message}`);
      console.error(`  SQL Code: ${err.code}`);
    }
  }

  // 5. Check resume_bank table
  console.log('\n[5] Checking resume_bank table...');
  const rbCols = await db('information_schema.columns')
    .where({ TABLE_SCHEMA: db.client.config.connection.database, TABLE_NAME: 'resume_bank' })
    .select('COLUMN_NAME', 'IS_NULLABLE', 'COLUMN_DEFAULT')
    .catch(() => []);
  const rbColNames = (rbCols as any[]).map((c: any) => c.COLUMN_NAME);
  console.log('  Columns:', rbColNames.join(', '));

  const rbRequired = ['uuid', 'candidate_id', 'tracker_id', 'organization_id', 'deleted_at', 'resume_text', 'resume_file_url'];
  for (const col of rbRequired) {
    const found = (rbCols as any[]).find((c: any) => c.COLUMN_NAME === col);
    if (found) {
      const nullable = found.IS_NULLABLE === 'YES' ? '(nullable)' : `(NOT NULL default=${found.COLUMN_DEFAULT || 'NONE'})`;
      console.log(`  ✓ ${col}: ${nullable}`);
    } else {
      console.log(`  ✗ MISSING: ${col}`);
    }
  }

  console.log('\n======================================================');
  await db.destroy();
}

runTest().catch(console.error);
