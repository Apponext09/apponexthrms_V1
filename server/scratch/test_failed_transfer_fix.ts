import { getKnex } from '../src/db/knex';
import { LifecycleService } from '../src/modules/HR/lifecycle/LifecycleService';

async function testFailedFix() {
  const service = new LifecycleService();
  const db = getKnex();

  const ctx: any = { organizationId: 8, companyId: 4, userId: 10 };
  const empId = 50; // jay shinde

  console.log(`Testing transfer execution for Employee #${empId} with Location ID 15...`);

  const result = await service.transferEmployee(ctx, {
    employeeId: empId,
    toDepartmentId: 15,
    toDesignationId: 18,
    toLocationId: 15,
    toReportingManagerId: 32,
    effectiveDate: '2026-08-08',
    transferType: 'department_change',
    transferReason: 'Testing foreign key location resolution fix.',
    notes: 'Location ID 15 resolved to master locations table.',
  });

  console.log('Transfer Execution Result:', result);

  // Read back employee & transfers table
  const updatedEmp = await db('employees').where('id', empId).first();
  console.log('\n--- UPDATED EMPLOYEE ROW ---');
  console.log('ID                    :', updatedEmp.id);
  console.log('Department ID         :', updatedEmp.current_department_id || updatedEmp.currentDepartmentId);
  console.log('Designation ID        :', updatedEmp.current_designation_id || updatedEmp.currentDesignationId);
  console.log('Current Location ID   :', updatedEmp.current_location_id || updatedEmp.currentLocationId);
  console.log('Reporting Manager ID  :', updatedEmp.reporting_manager_id || updatedEmp.reportingManagerId);

  const transferRows = await db('employee_transfers').where('employee_id', empId).orderBy('id', 'desc').limit(1);
  console.log('\n--- LATEST ROW IN employee_transfers DB TABLE ---');
  console.log(JSON.stringify(transferRows[0], null, 2));

  process.exit(0);
}

testFailedFix().catch(err => {
  console.error(err);
  process.exit(1);
});
