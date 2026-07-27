import { initializeKnex, getKnex } from './src/db/knex.js';
import { AuthService } from './src/modules/auth/auth.service.js';

initializeKnex();
const db = getKnex();

const authService = new AuthService();
const loginRes = await authService.login('pp@gmail.com', 'pp@gmail.com');
console.log('Login Response User:', JSON.stringify(loginRes.user, null, 2));

const meRes = await authService.getMe({
  organizationId: loginRes.user.organizationId,
  userId: loginRes.user.id,
  sessionUuid: 'test'
} as any);
console.log('GetMe Response User:', JSON.stringify(meRes.user, null, 2));

process.exit(0);
