import { initializeKnex, getKnex } from './src/db/knex.js';
import { LoanService } from './src/modules/payroll/services/LoanService.js';
import { AuthService } from './src/modules/auth/auth.service.js';

initializeKnex();
const db = getKnex();

const authService = new AuthService();
const loanService = new LoanService();

// 1. PP login (Finance Manager in mm org - orgId 67)
const ppLogin = await authService.login('pp@gmail.com', 'pp@gmail.com');
const ppCtx = {
  organizationId: ppLogin.organization.id,
  userId: ppLogin.user.id,
  sessionUuid: 'test'
};

console.log('\n=== 1. PP (Finance Manager) applies for loan ===');
const ppEmpId = (ppLogin.user as any).employeeId || 44;
const createdLoan = await loanService.createLoan(ppCtx as any, {
  employeeId: ppEmpId,
  loanType: 'personal',
  loanAmount: 75000,
  loanDate: new Date().toISOString().split('T')[0],
  tenureMonths: 12,
  interestRate: 8.5,
  status: 'pending'
});

console.log('Created Loan:', { id: createdLoan.id, status: createdLoan.status, amount: createdLoan.loan_amount });

// 2. MM login (Org Admin in mm org - orgId 67)
const mmLogin = await authService.login('mm@gmail.com', 'mm@gmail.com');
const mmCtx = {
  organizationId: mmLogin.organization.id,
  userId: mmLogin.user.id,
  sessionUuid: 'test'
};

console.log('\n=== 2. MM (Org Admin) lists org loans ===');
const allLoans = await loanService.getEmployeeLoans(mmCtx as any);
console.log('Org Loans count:', allLoans.length);
const targetLoan = allLoans.find((l: any) => l.id === createdLoan.id);
console.log('Target Loan in Admin view:', { id: targetLoan?.id, status: targetLoan?.status, employee_name: targetLoan?.employee_name });

console.log('\n=== 3. MM (Org Admin) approves loan ===');
const approvedLoan = await loanService.approveLoan(mmCtx as any, createdLoan.id);
console.log('Approved Loan:', { id: approvedLoan.id, status: approvedLoan.status });

console.log('\n=== 4. Check EMI Schedule generated upon Admin approval ===');
const schedule = await loanService.getRepaymentSchedule(mmCtx as any, createdLoan.id);
console.log('EMI Schedule count:', schedule.length, 'First EMI:', schedule[0]);

process.exit(0);
