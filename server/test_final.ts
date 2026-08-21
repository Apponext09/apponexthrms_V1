import { initializeKnex, getKnex } from './src/db/knex';
import { randomUUID } from 'crypto';

async function main() {
  initializeKnex();
  const db = getKnex();

  console.log('\n===== FINAL RESOLUTION TEST =====');

  // Simulate ctx
  const userId = 14;
  const orgIdFromJwt = 14;

  // Step 1: does org 14 exist?
  const orgCheck = await db.raw('SELECT id FROM organizations WHERE id = ? LIMIT 1', [orgIdFromJwt]);
  const orgExists = orgCheck[0].length > 0;
  console.log(`[1] org id=${orgIdFromJwt} exists: ${orgExists}`);

  // Step 2: find user id=14
  const userCheck = await db.raw('SELECT id, organization_id, email FROM users WHERE id = ? LIMIT 1', [userId]);
  const userRows = userCheck[0];
  console.log(`[2] user id=${userId}:`, JSON.stringify(userRows));

  let realOrgId = orgIdFromJwt;

  if (!orgExists) {
    if (userRows.length > 0 && userRows[0].organization_id) {
      realOrgId = userRows[0].organization_id;
      console.log(`[3] Resolved org from user: ${realOrgId}`);
    } else {
      // get first org
      const firstOrg = await db.raw('SELECT id FROM organizations ORDER BY id ASC LIMIT 1');
      realOrgId = firstOrg[0][0]?.id;
      console.log(`[3] Using first org: ${realOrgId}`);
    }
  } else {
    console.log(`[3] Org exists, using: ${realOrgId}`);
  }

  // Step 4: try insert with realOrgId
  console.log(`\n[4] Testing resume_upload_logs insert with org=${realOrgId}, user=${userId}...`);
  try {
    const ins = await db.raw(
      'INSERT INTO resume_upload_logs (uuid, file_name, total_records, success_count, failed_count, status, organization_id, uploaded_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())',
      [randomUUID(), 'test_final.pdf', 1, 0, 0, 'Processing', realOrgId, userId]
    );
    console.log(`  SUCCESS: insertId=${ins[0].insertId}`);
    await db.raw('DELETE FROM resume_upload_logs WHERE id=?', [ins[0].insertId]);
    console.log('  Cleanup done.');
  } catch (e: any) {
    console.error(`  FAILED: ${e.message}`);
  }

  // Step 5: try resume_bank insert
  console.log(`\n[5] Testing resume_bank insert with org=${realOrgId}...`);
  
  // first get a real candidate id
  const cand = await db.raw('SELECT id FROM candidates ORDER BY id DESC LIMIT 1');
  const candId = cand[0][0]?.id || 1;
  
  try {
    const ins2 = await db.raw(
      'INSERT INTO resume_bank (uuid, tracker_id, candidate_id, organization_id, source, position, status, uploaded_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())',
      [randomUUID(), `TRK-TEST-${Date.now()}`, candId, realOrgId, 'bulk_import', 'Test', 'Applied', userId]
    );
    console.log(`  SUCCESS: insertId=${ins2[0].insertId}`);
    await db.raw('DELETE FROM resume_bank WHERE id=?', [ins2[0].insertId]);
    console.log('  Cleanup done.');
  } catch (e: any) {
    console.error(`  FAILED: ${e.message}`);
  }

  console.log('\n===================================');
  await db.destroy();
}

main().catch(e => { console.error('UNHANDLED:', e.message); process.exit(1); });
