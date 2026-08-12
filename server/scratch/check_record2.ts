import { getKnex } from '../src/db/knex';
import { LifecycleService } from '../src/modules/HR/lifecycle/LifecycleService';

async function checkRecord2() {
  const db = getKnex();
  const service = new LifecycleService();

  const record = await db('employee_onboarding_records').where('id', 2).first();
  console.log('Record ID #2 raw DB row:', record);

  if (record) {
    const empId = record.employeeId || record.employee_id;
    console.log(`Fetching lifecycle details for employee_id ${empId}...`);
    const details = await service.getEmployeeLifecycleDetails({ organizationId: record.organizationId || record.organization_id || 8, companyId: 1 }, empId);
    console.log('\n--- RETURNED ONBOARDING OBJECT ---');
    console.log(JSON.stringify(details.onboarding, null, 2));
    console.log('\n--- RETURNED PROFILE OBJECT ---');
    console.log(JSON.stringify(details.profile, null, 2));
  }

  process.exit(0);
}

checkRecord2().catch(err => {
  console.error(err);
  process.exit(1);
});
