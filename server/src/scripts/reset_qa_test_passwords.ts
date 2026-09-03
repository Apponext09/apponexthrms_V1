import argon2 from 'argon2';
import { getKnex } from '../db/knex';

async function resetPasswords() {
  const db = getKnex();
  const hash = await argon2.hash('QaTest@1234');

  const emails = ['shakya@gmail.com', 'emp5@gmail.com', 'emp9@gmail.com', 'radhika1@gmail.com'];

  for (const email of emails) {
    await db('users')
      .whereRaw('LOWER(email) = ?', [email])
      .update({
        password_hash: hash,
        status: 'active',
        deleted_at: null,
        updated_at: new Date()
      });
    console.log(`Updated password for ${email}`);
  }

  process.exit(0);
}

resetPasswords().catch(err => {
  console.error('Error resetting passwords:', err);
  process.exit(1);
});
