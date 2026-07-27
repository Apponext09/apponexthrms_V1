import { initializeKnex, getKnex } from './src/db/knex.js';
import { LoanService } from './src/modules/payroll/services/LoanService.js';
import { AuthService } from './src/modules/auth/auth.service.js';

initializeKnex();
const db = getKnex();

const authService = new AuthService();
const loanService = new LoanService();

// 1. PP login (Finance Manager - non-admin)
const ppLogin = await authService.login('pp@gmail.com', 'pp@gmail.com');
const ppCtx = { organizationId: ppLogin.organization.id, userId: ppLogin.user.id, sessionUuid: 'test' };

console.log('\n=== 1. Non-Admin (pp) attempts to issue loan to employee #45 ===');
const ppCreated = await loanService.createLoan(ppCtx as any, {
  employeeId: 45, // Tried to issue loan for employee 45
  loanType: 'personal',
  loanAmount: 12000,
  loanDate: new Date().toISOString().split('T')[0],
  tenureMonths: 6,
  status: 'active' // Tried to force status active
});
console.log('PP Result (Locked to PP self & pending):', {
  id: ppCreated.id,
  employeeId: ppCreated.employee_id, // should be 44 (PP's own ID)
  status: ppCreated.status // should be 'pending'
});

console.log('\n=== 2. Non-Admin (pp) attempts to approve loan ===');
try {
  await loanService.approveLoan(ppCtx as any, ppCreated.id);
  console.log('ERROR: PP should not have been allowed to approve!');
} catch (err: any) {
  console.log('✅ Correctly blocked Non-Admin approval:', err.message);
}

// 3. MM login (Org Admin)
const mmLogin = await authService.login('mm@gmail.com', 'mm@gmail.com');
const mmCtx = { organizationId: mmLogin.organization.id, userId: mmLogin.user.id, sessionUuid: 'test' };

console.log('\n=== 3. Org Admin (mm) approves loan ===');
const approved = await loanService.approveLoan(mmCtx as any, ppCreated.id);
console.log('✅ Org Admin successfully approved loan:', { id: approved.id, status: approved.status });

// Cleanup test loan
await db('loan_repayments').where('loan_id', ppCreated.id).del();
await db('employee_loans').where('id', ppCreated.id).del();

process.exit(0);
