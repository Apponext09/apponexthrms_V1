import { initializeKnex, getKnex } from '../src/db/knex';
import { LeaveService } from '../src/modules/leaves/services/LeaveService';
import type { TenantContext } from '../src/db/types';

async function testCustomBreakdown() {
  initializeKnex();
  const db = getKnex();
  const leaveService = new LeaveService();

  try {
    const user = await db('users').where('employee_id', 62).first();
    if (!user) {
      console.log('❌ No user for ID 62.');
      return;
    }

    const employee = await db('employees').where('id', 62).first();
    if (!employee) {
      console.log('❌ No employee.');
      return;
    }

    const leaveType = await db('leave_types').where('id', 1).first();
    if (!leaveType) {
      console.log('❌ No leave type.');
      return;
    }

    const ctx: TenantContext = {
      organizationId: employee.organizationId || 3,
      userId: user.id,
      sessionUuid: 'diagnostic-session-custom'
    };

    console.log('🚀 Invoking LeaveService.applyLeave with breakdown...');
    await leaveService.applyLeave(ctx, {
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      startDate: '2026-07-27',
      endDate: '2026-07-29',
      reason: 'sdsdgdsdgds',
      isHalfDay: true,
      customDuration: 2.0,
      dayWiseBreakdown: [
        { date: '2026-07-27', dayType: 'FULL' },
        { date: '2026-07-28', dayType: 'SECOND_HALF' },
        { date: '2026-07-29', dayType: 'FIRST_HALF' }
      ]
    });

  } catch (err: any) {
    console.log('🎉 PRINTING BACKEND ERROR MESSAGE:');
    console.log(err.message);
  } finally {
    await db.destroy();
  }
}

testCustomBreakdown();
