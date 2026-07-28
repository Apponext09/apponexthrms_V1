import { initializeKnex, getKnex } from './src/db/knex.js';
import { ManagerService } from './src/modules/manager/services/ManagerService.js';

initializeKnex();
const db = getKnex();

const user = await db('users').whereRaw("LOWER(email) = 'pp@gmail.com'").first();
console.log('PP User:', user);

const ctx = {
  organizationId: user.organizationId || user.organization_id || 67,
  userId: user.id,
  sessionUuid: 'test',
};

console.log('CTX:', ctx);

const service = new ManagerService();
const emps = await service.getDepartmentEmployees(ctx as any);
console.log('ManagerService getDepartmentEmployees result:', JSON.stringify(emps, null, 2));

process.exit(0);
