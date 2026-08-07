require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

// Test login function logic directly
async function testFullAuthServiceLogin() {
  console.log('--- TESTING AUTH SERVICE LOGIN LOGIC ---');

  const { AuthService } = require('./server/src/modules/auth/auth.service');
  const { UserRepository } = require('./server/src/modules/auth/repositories/user.repository');
  const { SessionRepository } = require('./server/src/modules/auth/repositories/session.repository');
  const { AuditService } = require('./server/src/modules/audit/services/AuditService');

  const userRepo = new UserRepository();
  const sessionRepo = new SessionRepository();
  const auditService = new AuditService();
  const authService = new AuthService(userRepo, sessionRepo, auditService);

  try {
    const res1 = await authService.login('yash@kosqu.com', 'yash@kosqu.com');
    console.log('✓ Login with Email as Password succeeded:', res1.user.email, 'Roles:', res1.roles);
  } catch (err) {
    console.error('❌ Login with Email as Password failed:', err.message);
  }

  try {
    const res2 = await authService.login('yash@kosqu.com', 'password123');
    console.log('✓ Login with "password123" succeeded:', res2.user.email, 'Roles:', res2.roles);
  } catch (err) {
    console.error('❌ Login with "password123" failed:', err.message);
  }

  await k.destroy();
}

testFullAuthServiceLogin().catch(e => { console.error('Error:', e); k.destroy(); });
