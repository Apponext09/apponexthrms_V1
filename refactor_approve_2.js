const fs = require('fs');
const file = 'server/src/modules/leaves/services/LeaveApprovalService.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the old status: 'approved' assignments with the dynamic assignment
code = code.replace(
  /status: 'approved',\s*approved_by: approverId,\s*approval_date: new Date\(\),/g,
  \`status: 'approved',
            l2_approved_by: application.status === 'pending_hr' ? approverId : null,
            l2_approval_date: application.status === 'pending_hr' ? new Date() : null,
            approved_by: approverId,
            approval_date: new Date(),\`
);

// We need to insert the LOP record creation right after status update if application has lop_days
const lopLogic = \`
        if (application.lop_days && parseFloat(application.lop_days) > 0) {
          const lopDays = parseFloat(application.lop_days);
          const applyDate = new Date(application.application_start_date || application.applicationStartDate);
          await trx('leave_lop_records').insert({
            uuid: require('uuid').v4(),
            organization_id: ctx.organizationId,
            employee_id: employeeId,
            leave_application_id: applicationId,
            lop_days: lopDays,
            month: applyDate.getMonth() + 1,
            year: applyDate.getFullYear(),
            status: 'pending_payroll',
            created_at: new Date(),
            updated_at: new Date()
          });
        }
\`;

// Replace standard approval block
code = code.replace(
  /approval_date: new Date\(\),\n\s*\}\);\n\n\s*await trx\('leave_approvals'\)/g,
  \`approval_date: new Date(),
          });

          \${lopLogic}

          await trx('leave_approvals')\`
);

fs.writeFileSync(file, code);
console.log('Refactor 2 Success');
