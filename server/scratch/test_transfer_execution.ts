import { getKnex } from '../src/db/knex';
import { LifecycleService } from '../src/modules/HR/lifecycle/LifecycleService';

async function testTransfer() {
  const service = new LifecycleService();
  const db = getKnex();

  const ctx: any = { organizationId: 8, companyId: 1, userId: 10 };
  const empId = 1; // John Doe

  console.log(`Executing transfer test for employee ${empId}...`);

  const result = await service.transferEmployee(ctx, {
    employeeId: empId,
    toDepartmentId: 14, // Development
    transferType: 'department_change',
    effectiveDate: '2026-08-01',
    transferReason: 'Assigned to Core Architecture Team for Q3 Delivery.',
    notes: 'Approved by VP of Engineering and HR Director.',
  });

  console.log('Transfer Execution Result:', result);

  const details = await service.getEmployeeLifecycleDetails(ctx, empId);
  console.log('\n--- VERIFIED TRANSFERS LIST FROM BACKEND ---');
  console.log(JSON.stringify(details.transfers, null, 2));

  process.exit(0);
}

testTransfer().catch(err => {
  console.error(err);
  process.exit(1);
});
