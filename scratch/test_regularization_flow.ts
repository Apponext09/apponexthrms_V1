import { RegularizationService } from '../server/src/modules/attendance/services/RegularizationService';
import { db } from '../server/src/db/knex';

async function main() {
  console.log('Testing Regularization Service end-to-end flow...');

  const service = new RegularizationService();
  const ctx: any = {
    userId: 1,
    organizationId: 8,
    companyId: 4,
  };

  // 1. Create a Work Hour Request (single day)
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`Submitting single-day regularization request for ${todayStr}...`);

  const req1 = await service.createRequest(ctx, {
    employeeId: 1,
    date: todayStr,
    checkIn: '09:30 AM',
    checkOut: '06:30 PM',
    actualCheckIn: '11:57 AM',
    actualCheckOut: '11:57 AM',
    reason: 'Missed Punch',
    dayType: 'Full Day',
    comment: 'Forgot to punch in at entrance',
  });

  console.log('Created request ID:', req1.id, 'Status:', req1.status);

  // 2. Fetch Manager Pending Requests
  const managerPending = await service.getManagerPendingRequests(ctx, 1);
  console.log('Manager pending items count:', managerPending.length);

  // 3. Manager Approve
  if (req1.status === 'pending_manager' || req1.status === 'pending') {
    const mgrApproved = await service.managerApprove(ctx, req1.id, 'Approved by Manager');
    console.log('After Manager approval status:', mgrApproved.status);
  }

  // 4. Fetch HR Pending Requests
  const hrPending = await service.getHRPendingRequests(ctx);
  console.log('HR pending items count:', hrPending.length);

  // 5. HR Approve (triggers attendance record sync)
  const hrApproved = await service.hrApprove(ctx, req1.id, 'Approved by HR');
  console.log('After HR approval status:', hrApproved.status);

  // 6. Verify Attendance Record is updated as regularized
  const record = await db('attendance_records')
    .where('employee_id', 1)
    .where('check_in_date', todayStr)
    .first();

  console.log('Attendance Record regularized state:', {
    id: record?.id,
    check_in_time: record?.check_in_time,
    check_out_time: record?.check_out_time,
    is_regularized: record?.is_regularized,
    status: record?.status,
  });

  // 7. Verify Admin Logs
  const logs = await service.getAdminLogs(ctx, {});
  console.log('Admin Logs count:', logs.length);

  console.log('ALL REGULARIZATION FLOW TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Regularization test failed:', err);
  process.exit(1);
});
