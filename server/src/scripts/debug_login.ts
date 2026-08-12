import { AuthService } from '../modules/auth/auth.service';
import { initializeKnex, getKnex } from '../db/knex';

async function debugLogin() {
  console.log('====================================================');
  console.log('  🔍 TESTING AUTH SERVICE LOGIN FOR ajay@gmail.com ');
  console.log('====================================================\n');

  try {
    initializeKnex();
    const service = new AuthService();
    const result = await service.login('ajay@gmail.com', 'ajay');
    console.log('✅ Login Succeeded! Result summary:', {
      userId: result.user.id,
      email: result.user.email,
      orgId: result.organization.id,
      roles: result.roles,
      hasToken: Boolean(result.accessToken)
    });
  } catch (err: any) {
    console.error('❌ LOGIN EXCEPTION CAPTURED:');
    console.error(err);
  } finally {
    process.exit(0);
  }
}

debugLogin();
