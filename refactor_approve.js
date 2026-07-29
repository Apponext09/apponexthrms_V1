const fs = require('fs');
const file = 'server/src/modules/leaves/services/LeaveApprovalService.ts';
let code = fs.readFileSync(file, 'utf8');

const targetCheck = `    if (application.status !== 'submitted') {
      throw new ValidationError('Only submitted applications can be approved');
    }`;

const newCheck = `    if (!['submitted', 'pending_manager', 'pending_hr'].includes(application.status)) {
      throw new ValidationError(\`Only submitted or pending applications can be approved. Current status: \${application.status}\`);
    }

    // Fetch org setting for approval levels
    const setting = await db('organization_settings')
      .where('organization_id', ctx.organizationId)
      .where('setting_key', 'LEAVE_APPROVAL_LEVELS')
      .whereNull('deleted_at')
      .first();
    const approvalLevels = setting && setting.setting_value ? parseInt(setting.setting_value, 10) : 2;

    let isFinalApproval = false;
    let nextStatus = application.status;

    if (approvalLevels === 1 || application.status === 'pending_hr' || application.status === 'submitted') {
      isFinalApproval = true;
      nextStatus = 'approved';
    } else if (application.status === 'pending_manager') {
      isFinalApproval = false;
      nextStatus = 'pending_hr';
    }

    if (!isFinalApproval) {
      // Just update status to pending_hr (Manager approval)
      await db.transaction(async (trx) => {
        await trx('leave_applications')
          .where('id', applicationId)
          .update({
            status: nextStatus,
            l1_approved_by: approverId,
            l1_approval_date: new Date(),
          });

        await trx('leave_approvals').insert({
          uuid: require('uuid').v4(),
          organization_id: ctx.organizationId,
          leave_application_id: applicationId,
          approval_level: 1,
          approver_id: approverId,
          status: 'approved',
          approval_date: new Date(),
          comments: comment || null,
        });
      });
      return;
    }
`;

code = code.replace(targetCheck, newCheck);
fs.writeFileSync(file, code);
console.log('Success');
