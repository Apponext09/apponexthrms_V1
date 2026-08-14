import argon2 from 'argon2';
import { getKnex } from '../db/knex';

async function resetPassword() {
  const db = getKnex();
  const hash = await argon2.hash('password123');

  await db('users')
    .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
    .update({
      password_hash: hash,
      status: 'active',
      deleted_at: null,
      updated_at: new Date()
    });

  console.log("✅ Successfully updated password hash using Argon2 for 'ajay@gmail.com' to 'password123'!");
  process.exit(0);
}

resetPassword().catch(err => {
  console.error("Error resetting password:", err);
  process.exit(1);
});
