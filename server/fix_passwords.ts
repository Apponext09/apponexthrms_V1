import { hash } from 'argon2';
import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

async function fixPasswords() {
  console.log('\n🔐 Hashing all passwords...\n');

  const superAdminHash = await hash('SuperAdmin@2026!Secure', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const mmHash = await hash('mm@gmail.com', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const ppHash = await hash('pp@gmail.com', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

  // Fix superadmin
  const saRow = await db('super_admins').whereRaw("LOWER(email) = 'superadmin@apponext.com'").first();
  if (saRow) {
    await db('super_admins').where('id', saRow.id).update({ password_hash: superAdminHash });
    console.log('✅ superadmin@apponext.com password set in super_admins table');
  } else {
    await db('super_admins').insert({
      email: 'superadmin@apponext.com',
      first_name: 'Super',
      last_name: 'Admin',
      password_hash: superAdminHash,
      created_at: new Date(),
      updated_at: new Date(),
    }).catch(async (e) => {
      console.log('Note:', e.message);
    });
    console.log('✅ superadmin@apponext.com created in super_admins table');
  }

  // Fix mm@gmail.com org
  const mmOrg = await db('organizations').whereRaw("LOWER(email) = 'mm@gmail.com'").first();
  if (mmOrg) {
    await db('organizations').where('id', mmOrg.id).update({ password_hash: mmHash });
    console.log('✅ mm@gmail.com org password set');
  }

  // Fix users passwords
  const usersToFix = [
    { email: 'mm@gmail.com', h: mmHash },
    { email: 'pp@gmail.com', h: ppHash },
    { email: 'superadmin@apponext.com', h: superAdminHash },
  ];

  for (const u of usersToFix) {
    const userRow = await db('users').whereRaw('LOWER(email) = ?', [u.email]).first();
    if (userRow) {
      await db('users').where('id', userRow.id).update({ password_hash: u.h, updated_at: new Date() });
      console.log(`✅ users.password_hash updated for ${u.email}`);
    } else {
      console.log(`ℹ️  No users row for ${u.email}`);
    }
  }

  console.log('\n✅ All passwords fixed!\n');
  process.exit(0);
}

fixPasswords().catch(e => { console.error(e); process.exit(1); });
