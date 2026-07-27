import { initializeKnex, getKnex } from './src/db/knex.js';
import { LoanService } from './src/modules/payroll/services/LoanService.js';
import { AuthService } from './src/modules/auth/auth.service.js';

initializeKnex();
const db = getKnex();

const authService = new AuthService();
const loanService = new LoanService();

// 1. Employee login (hhhh@gmail.com)
const empUser = await db('users').whereRaw("LOWER(email) = 'hhhh@gmail.com'").first();
const empCtx = { organizationId: 67, userId: empUser.id, sessionUuid: 'test' };

console.log('\n=== 1. Hrrr Employee applies for loan ===');
const createdLoan = await loanService.createLoan(empCtx as any, {
  employeeId: empUser.employeeId || 45,
  loanType: 'personal',
  loanAmount: 30000,
  loanDate: new Date().toISOString().split('T')[0],
  tenureMonths: 6,
  interestRate: 8.5,
  status: 'pending'
});

console.log('Employee Created Loan:', {
  id: createdLoan.id,
  employeeId: createdLoan.employee_id,
  amount: createdLoan.loan_amount,
  status: createdLoan.status
});

console.log('\n=== 2. Employee views their loans ===');
const empLoans = await loanService.getEmployeeLoans(empCtx as any, empUser.employeeId || 45);
console.log('Employee loans list count:', empLoans.length, empLoans.map(l => ({ id: l.id, name: l.employee_name, amount: l.loan_amount, status: l.status })));

console.log('\n=== 3. Org Admin (mm@gmail.com) lists all org loans ===');
const adminUser = await db('users').whereRaw("LOWER(email) = 'mm@gmail.com'").first();
const adminCtx = { organizationId: 67, userId: adminUser.id, sessionUuid: 'test' };

const adminLoans = await loanService.getEmployeeLoans(adminCtx as any);
const pendingForAdmin = adminLoans.filter(l => l.status === 'pending');
console.log('Admin sees pending loans:', pendingForAdmin.length, pendingForAdmin.map(l => ({ id: l.id, name: l.employee_name, amount: l.loan_amount, status: l.status })));

console.log('\n=== 4. Admin approves Employee loan ===');
const approvedLoan = await loanService.approveLoan(adminCtx as any, createdLoan.id);
console.log('Approved Loan Result:', { id: approvedLoan.id, status: approvedLoan.status });

console.log('\n=== 5. Check EMI Schedule for Employee ===');
const schedule = await loanService.getRepaymentSchedule(empCtx as any, createdLoan.id);
console.log('Employee EMI Schedule count:', schedule.length, 'First EMI amount:', schedule[0]?.emiAmount);

process.exit(0);
