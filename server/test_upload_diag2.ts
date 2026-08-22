/**
 * Diagnostic: test a direct candidate + resume_bank insert
 * Run: npx tsx test_upload_diag2.ts
 */
import { initializeKnex } from './src/db/knex';
import { randomUUID } from 'crypto';

async function runTest() {
  const db = initializeKnex();
  const orgId = 14;

  console.log('\n========== INSERT DIAGNOSTIC ==========');

  // 1. Try inserting test candidate directly
  console.log('\n[1] Testing direct candidate insert...');
  const testEmail = `test_diag_${Date.now()}@example.com`;
  let insertedCandId: number | null = null;
  try {
    const result = await db('candidates').insert({
      uuid: randomUUID(),
      first_name: 'Test',
      last_name: 'Diag',
      email: testEmail,
      organization_id: orgId,
      status: 'applied',
      source: 'bulk_import',
      created_by: 1,
      updated_by: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    insertedCandId = result[0];
    console.log(`  ✓ INSERT SUCCESS: id=${insertedCandId}`);
  } catch (err: any) {
    console.error(`  ✗ INSERT FAILED: ${err.message}`);
    console.error(`  SQL Code: ${err.code}, errno: ${err.errno}`);
    // Check which columns exist
    const cols = await db.raw("SHOW COLUMNS FROM candidates").catch((e: any) => ({ rows: [] }));
    const colNames = (cols[0] as any[]).map((c: any) => c.Field);
    console.log('  Candidate columns:', colNames.join(', '));
  }

  // 2. Try inserting test resume_bank entry
  if (insertedCandId) {
    console.log('\n[2] Testing direct resume_bank insert...');
    try {
      const result2 = await db('resume_bank').insert({
        uuid: randomUUID(),
        tracker_id: `TRK-DIAG-${Date.now()}`,
        candidate_id: insertedCandId,
        organization_id: orgId,
        source: 'bulk_import',
        position: 'Test Engineer',
        status: 'Applied',
        uploaded_by: 1,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      console.log(`  ✓ resume_bank INSERT SUCCESS: id=${result2[0]}`);
      // cleanup
      await db('resume_bank').where('id', result2[0]).del();
    } catch (err: any) {
      console.error(`  ✗ resume_bank INSERT FAILED: ${err.message}`);
      console.error(`  SQL Code: ${err.code}, errno: ${err.errno}`);
    }
    // cleanup candidate
    await db('candidates').where('id', insertedCandId).del();
    console.log('\n  ✓ Cleanup done');
  }

  // 3. Check getByEmail query
  console.log('\n[3] Testing getByEmail query...');
  try {
    const existing = await db('candidates')
      .where('email', testEmail)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();
    console.log('  getByEmail result:', existing ? 'Found' : 'Not found (expected)');
  } catch (err: any) {
    console.error(`  ✗ getByEmail FAILED: ${err.message}`);
    // Is deleted_at column present?
    const hasDeleted = await db.schema.hasColumn('candidates', 'deleted_at');
    console.log(`  candidates.deleted_at exists: ${hasDeleted}`);
  }

  // 4. Check resume_upload_logs insert
  console.log('\n[4] Testing resume_upload_logs insert...');
  try {
    const result3 = await db('resume_upload_logs').insert({
      uuid: randomUUID(),
      file_name: 'test_diag.pdf',
      total_records: 1,
      success_count: 0,
      failed_count: 0,
      status: 'Processing',
      organization_id: orgId,
      uploaded_by: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    console.log(`  ✓ resume_upload_logs INSERT SUCCESS: id=${result3[0]}`);
    await db('resume_upload_logs').where('id', result3[0]).del();
  } catch (err: any) {
    console.error(`  ✗ resume_upload_logs INSERT FAILED: ${err.message}`);
    console.error(`  SQL Code: ${err.code}`);
    const cols3 = await db.raw("SHOW COLUMNS FROM resume_upload_logs").catch(() => ({ 0: [] }));
    const colNames3 = (cols3[0] as any[]).map((c: any) => `${c.Field}(${c.Null === 'NO' ? 'NOT NULL' : 'nullable'}${c.Default ? ' default=' + c.Default : ''})`);
    console.log('  resume_upload_logs columns:', colNames3.join(', '));
  }

  // 5. Test pdf-parse availability
  console.log('\n[5] Testing pdf-parse module...');
  try {
    const pdfParse = (await import('pdf-parse')).default;
    console.log('  ✓ pdf-parse module loaded OK');
  } catch (err: any) {
    console.error(`  ✗ pdf-parse FAILED: ${err.message}`);
  }

  console.log('\n=======================================');
  await db.destroy();
}

runTest().catch(console.error);
