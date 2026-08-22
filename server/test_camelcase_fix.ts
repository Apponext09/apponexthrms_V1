import { initializeKnex, getKnex } from './src/db/knex';
import { randomUUID } from 'crypto';

async function main() {
  initializeKnex();
  const db = getKnex();

  console.log('\n===== CAMELCASE FIX VERIFICATION =====');

  const userId = 14;
  const orgIdFromJwt = 14; // invalid org id from JWT

  // Simulate the FIXED resolveOrgId
  const orgResult = await db.raw('SELECT id FROM organizations WHERE id = ? LIMIT 1', [orgIdFromJwt]);
  const orgRows = orgResult[0];
  const orgExists = orgRows && orgRows.length > 0;
  console.log(`[1] org id=${orgIdFromJwt} exists: ${orgExists}`);

  let realOrgId = orgIdFromJwt;

  if (!orgExists) {
    const userResult = await db.raw('SELECT organization_id FROM users WHERE id = ? LIMIT 1', [userId]);
    const userRows = userResult[0];
    console.log(`[2] raw user row:`, JSON.stringify(userRows[0])); // Show actual keys

    if (userRows && userRows.length > 0) {
      // The FIXED logic - check BOTH camelCase and snake_case
      const resolved = userRows[0].organizationId ?? userRows[0].organization_id;
      console.log(`[3] organizationId (camelCase): ${userRows[0].organizationId}`);
      console.log(`[3] organization_id (snake_case): ${userRows[0].organization_id}`);
      console.log(`[3] Final resolved value: ${resolved}`);

      if (resolved) {
        realOrgId = Number(resolved);
        console.log(`[4] ✓ Correct realOrgId = ${realOrgId}`);
      }
    }
  }

  // Now test actual inserts with resolved org
  console.log(`\n[5] Testing resume_upload_logs with orgId=${realOrgId}...`);
  try {
    const ins = await db.raw(
      'INSERT INTO resume_upload_logs (uuid, file_name, total_records, success_count, failed_count, status, organization_id, uploaded_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())',
      [randomUUID(), 'VERIFY_TEST.pdf', 1, 0, 0, 'Processing', realOrgId, userId]
    );
    console.log(`  ✓ SUCCESS: id=${ins[0].insertId}`);
    await db.raw('DELETE FROM resume_upload_logs WHERE id=?', [ins[0].insertId]);
  } catch (e: any) {
    console.error(`  ✗ FAILED: ${e.message}`);
  }

  console.log('\n=====================================');
  await db.destroy();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
