import { initializeKnex, getKnex } from './src/db/knex.js';
import { AuthService } from './src/modules/auth/auth.service.js';

initializeKnex();
const db = getKnex();

const authService = new AuthService();

// Try logging in as hhhh@gmail.com
let userRow = await db('users').whereRaw("LOWER(email) = 'hhhh@gmail.com'").first();
console.log('hhhh user row:', userRow);

const me = await authService.getMe({
  organizationId: 67,
  userId: userRow.id,
  sessionUuid: 'test'
} as any);

console.log('hhhh getMe response:', JSON.stringify(me, null, 2));

process.exit(0);
