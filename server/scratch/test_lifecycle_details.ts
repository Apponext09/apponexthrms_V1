import { getKnex } from '../src/db/knex';
import { LifecycleService } from '../src/modules/HR/lifecycle/LifecycleService';

async function test() {
  const service = new LifecycleService();
  const ctx: any = { organizationId: 8, companyId: 1 };

  const details = await service.getEmployeeLifecycleDetails(ctx, 3);
  console.log('Returned onboarding object:', JSON.stringify(details.onboarding, null, 2));
  console.log('Returned profile joiningDate:', details.profile.joiningDate);
  process.exit(0);
}

test().catch(err => { console.error(err); process.exit(1); });
