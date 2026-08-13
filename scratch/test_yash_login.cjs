require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });
const { verify } = require('argon2');

async function testYashLogin() {
  console.log('--- TESTING LOGIN FOR yash@kosqu.com ---');
  
  const user = await k('users').where('email', 'yash@kosqu.com').first();
  console.log('User found in DB:', user ? { id: user.id, email: user.email, status: user.status } : 'NOT FOUND');

  if (user && user.password_hash) {
    const isYashAsPassword = await verify(user.password_hash, 'yash@kosqu.com').catch(() => false);
    const isPassword123 = await verify(user.password_hash, 'password123').catch(() => false);

    console.log(`Password 'yash@kosqu.com' valid? -> ${isYashAsPassword}`);
    console.log(`Password 'password123' valid? -> ${isPassword123}`);
  }

  await k.destroy();
}

testYashLogin().catch(e => { console.error(e); k.destroy(); });
