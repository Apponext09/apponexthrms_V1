import { initializeKnex, getKnex } from './src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugKnex() {
  try {
    console.log('Initializing database connection...');
    initializeKnex();

    const db = getKnex();

    console.log('\n1. Full user select (no field selection):');
    const user1 = await db('users').where('email', 'admin@apponexthrms.com').first();
    console.log('Keys in result:', Object.keys(user1));
    console.log('Has passwordHash:', 'passwordHash' in user1);
    console.log('Has password_hash:', 'password_hash' in user1);
    if (user1.passwordHash) {
      console.log('passwordHash value (first 50):', user1.passwordHash.substring(0, 50));
    }

    console.log('\n2. User select with password_hash field:');
    const user2 = await db('users')
      .where('email', 'admin@apponexthrms.com')
      .select('password_hash', 'id', 'email')
      .first();
    console.log('Keys in result:', Object.keys(user2));
    console.log('Has passwordHash:', 'passwordHash' in user2);
    console.log('Has password_hash:', 'password_hash' in user2);
    if (user2.passwordHash) {
      console.log('passwordHash value (first 50):', user2.passwordHash.substring(0, 50));
    }
    if (user2.password_hash) {
      console.log('password_hash value (first 50):', user2.password_hash.substring(0, 50));
    }

    console.log('\n3. Raw query:');
    const user3 = await db.raw('SELECT id, email, password_hash FROM users WHERE email = ?', [
      'admin@apponexthrms.com',
    ]);
    console.log('Result:', user3[0][0]);

    process.exit(0);
  } catch (error) {
    console.error('Debug error:', error);
    process.exit(1);
  }
}

debugKnex();
