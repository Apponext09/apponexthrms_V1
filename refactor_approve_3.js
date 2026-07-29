const fs = require('fs');
const file = 'server/src/modules/leaves/services/LeaveApprovalService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /if \(currentBal\) \{/g,
  'if (isFinalApproval && currentBal) {'
);

code = code.replace(
  /const adminNotes = await this\.processNegativeBalancePolicy\(ctx, trx, application, leaveType, excessDays\);/g,
  \`let adminNotes = '';
        if (isFinalApproval) {
          adminNotes = await this.processNegativeBalancePolicy(ctx, trx, application, leaveType, excessDays);
        }\`
);

fs.writeFileSync(file, code);
console.log('Balance wrapped');
