import { getKnex } from '../src/db/knex';
import { LifecycleService } from '../src/modules/HR/lifecycle/LifecycleService';

async function testSaveOffboarding() {
  const service = new LifecycleService();
  const db = getKnex();

  const ctx: any = { organizationId: 8, companyId: 4, userId: 10 };
  const empId = 50; // Jay Shinde

  console.log(`Saving offboarding details for employee ${empId}...`);

  const saveResult = await service.saveOffboardingDetails(ctx, {
    employeeId: empId,
    exitType: 'resignation',
    resignationDate: '2026-08-05',
    noticePeriodDays: 30,
    relievingDate: '2026-09-04',
    lastWorkingDay: '2026-09-04',
    exitInterviewerName: 'Harsh Gawali (HR Manager)',
    exitReason: 'Pursuing higher studies & international career opportunities.',
    exitNotes: 'All hardware (MacBook Pro & Access Badge) handed over. F&F settlement in progress.',
    assetsReturned: true,
    fnfStatus: 'processing',
    updateEmployeeStatus: 'notice',
  });

  console.log('Save Result:', saveResult);

  // Read back directly from employee_offboarding_records table
  const record = await db('employee_offboarding_records').where('employee_id', empId).first();
  console.log('\n--- VERIFIED DB RECORD IN employee_offboarding_records TABLE ---');
  console.log('ID                    :', record.id || record.ID);
  console.log('UUID                  :', record.uuid || record.UUID);
  console.log('Org ID                :', record.organization_id || record.organizationId);
  console.log('Company ID            :', record.company_id || record.companyId);
  console.log('Employee ID           :', record.employee_id || record.employeeId);
  console.log('Exit Type             :', record.exit_type || record.exitType);
  console.log('Resignation Date      :', record.resignation_date || record.resignationDate);
  console.log('Notice Period Days    :', record.notice_period_days || record.noticePeriodDays);
  console.log('Relieving Date        :', record.relieving_date || record.relievingDate);
  console.log('Last Working Day      :', record.last_working_day || record.lastWorkingDay);
  console.log('Exit Interviewer Name :', record.exit_interviewer_name || record.exitInterviewerName);
  console.log('Exit Reason           :', record.exit_reason || record.exitReason);
  console.log('Exit Notes            :', record.exit_notes || record.exitNotes);
  console.log('Assets Returned       :', record.assets_returned || record.assetsReturned);
  console.log('F&F Status            :', record.fnf_status || record.fnfStatus);
  console.log('Created At            :', record.created_at || record.createdAt);
  console.log('Updated At            :', record.updated_at || record.updatedAt);

  const details = await service.getEmployeeLifecycleDetails(ctx, empId);
  console.log('\n--- RETURNED OFFBOARDING OBJECT FROM BACKEND ---');
  console.log(JSON.stringify(details.offboarding, null, 2));

  process.exit(0);
}

testSaveOffboarding().catch(err => {
  console.error(err);
  process.exit(1);
});
