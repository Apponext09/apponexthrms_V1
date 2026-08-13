import argon2 from 'argon2';
import { getKnex } from '../db/knex';

async function syncHashes() {
  const db = getKnex();
  const newHash = await argon2.hash('password123');

  console.log("Generated new Argon2 hash for 'password123':", newHash);

  // Update organizations table
  const orgUpdated = await db('organizations')
    .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
    .update({ password_hash: newHash });

  // Update users table
  const userUpdated = await db('users')
    .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
    .update({ password_hash: newHash, status: 'active', deleted_at: null });

  console.log(`Updated ${orgUpdated} rows in 'organizations' and ${userUpdated} rows in 'users'.`);
  console.log("✅ Both 'organizations' and 'users' password hashes are now 100% synchronized for 'ajay@gmail.com'!");

  process.exit(0);
}

syncHashes().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
