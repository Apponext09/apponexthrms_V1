import { initializeKnex, getKnex } from '../src/db/knex';
import { LeaveApprovalService } from '../src/modules/leaves/services/LeaveApprovalService';
import type { TenantContext } from '../src/db/types';

async function testApprove() {
  initializeKnex();
  const db = getKnex();
  const approvalService = new LeaveApprovalService();

  try {
    console.log('🔍 Fetching the most recently submitted leave application...');
    const application = await db('leave_applications').orderBy('id', 'desc').first();
    if (!application) {
      console.log('❌ No leave applications found.');
      return;
    }

    console.log(`✅ Found Application: ID=${application.id}, Status=${application.status}, EmpID=${application.employeeId}, OrgID=${application.organizationId}`);

    const approverUserId = 14; // नरेंद्र का एडमिन यूज़र
    console.log(`✅ Using Approver User ID=${approverUserId}`);

    const ctx: TenantContext = {
      organizationId: application.organizationId || 3,
      userId: approverUserId,
      sessionUuid: 'diagnostic-session-approver'
    };

    console.log(`🚀 Invoking LeaveApprovalService.approveLeave for AppID=${application.id}...`);
    await approvalService.approveLeave(ctx, application.id, approverUserId, 'Approved via diagnostic script');
    console.log('🎉 SUCCESS: Leave approved successfully!');

  } catch (err: any) {
    console.error('❌ FAILURE - Error thrown by server:');
    console.error(err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await db.destroy();
  }
}

testApprove();
