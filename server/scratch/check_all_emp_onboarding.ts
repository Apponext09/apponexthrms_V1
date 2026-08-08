import { getKnex } from '../src/db/knex';
import { LifecycleService } from '../src/modules/HR/lifecycle/LifecycleService';

async function checkAll() {
  const db = getKnex();
  const service = new LifecycleService();
  const employees = await db('employees').select('id', 'first_name', 'last_name', 'organization_id');

  console.log(`Checking onboarding dates for all ${employees.length} employees...`);

  for (const emp of employees) {
    try {
      const details = await service.getEmployeeLifecycleDetails({ organizationId: emp.organization_id || 8, companyId: 1 }, emp.id);
      console.log(`Emp ID ${emp.id} (${details.profile.name}): Joining = "${details.onboarding.joiningDate}", Interview = "${details.onboarding.interviewDate}", ProbationEnd = "${details.onboarding.probationEndDate}"`);
    } catch (e: any) {
      console.log(`Emp ID ${emp.id} error:`, e.message);
    }
  }

  process.exit(0);
}

checkAll();
