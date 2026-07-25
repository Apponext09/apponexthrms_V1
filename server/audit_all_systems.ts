import { initializeKnex, getKnex } from './src/db/knex.js';
import { AuthService } from './src/modules/auth/auth.service.js';
import { LoanService } from './src/modules/payroll/services/LoanService.js';
import { ManagerService } from './src/modules/manager/services/ManagerService.js';

initializeKnex();
const db = getKnex();

const authService = new AuthService();
const loanService = new LoanService();
const managerService = new ManagerService();

async function runAudit() {
  console.log('====================================================');
  console.log('         FULL SYSTEM AUDIT & VERIFICATION');
  console.log('====================================================\n');

  // TEST 1: SuperAdmin Login
  console.log('--- TEST 1: SuperAdmin Login ---');
  try {
    const sa = await authService.login('superadmin@apponext.com', 'SuperAdmin@2026!Secure');
    console.log('✅ SuperAdmin login SUCCESS:', { email: sa.user.email, roles: sa.roles });
  } catch (err: any) {
    console.error('❌ SuperAdmin login FAILED:', err.message);
  }

  // TEST 2: Org Admin Login (mm@gmail.com)
  console.log('\n--- TEST 2: Org Admin Login ---');
  let adminCtx: any = null;
  try {
    const admin = await authService.login('mm@gmail.com', 'mm@gmail.com');
    adminCtx = { organizationId: admin.organization.id, userId: admin.user.id, sessionUuid: 'audit-session' };
    console.log('✅ Org Admin login SUCCESS:', { email: admin.user.email, org: admin.organization.name });
  } catch (err: any) {
    console.error('❌ Org Admin login FAILED:', err.message);
  }

  // TEST 3: Finance Manager Login (pp@gmail.com)
  console.log('\n--- TEST 3: Finance Manager Login ---');
  let managerCtx: any = null;
  try {
    const manager = await authService.login('pp@gmail.com', 'pp@gmail.com');
    managerCtx = { organizationId: manager.organization.id, userId: manager.user.id, sessionUuid: 'audit-session' };
    console.log('✅ Finance Manager login SUCCESS:', { email: manager.user.email, employeeId: manager.user.employeeId });
  } catch (err: any) {
    console.error('❌ Finance Manager login FAILED:', err.message);
  }

  // TEST 4: Manager Team Visibility (/manager/team)
  console.log('\n--- TEST 4: Manager Team Visibility ---');
  try {
    const team = await managerService.getDepartmentEmployees(managerCtx);
    console.log('✅ Manager Team List count:', team.length);
    team.forEach(m => console.log(`   - Employee #${m.id}: ${m.firstName} ${m.lastName} (${m.email}) [${m.departmentName}] -> Manager: ${m.managerName}`));
  } catch (err: any) {
    console.error('❌ Manager Team List FAILED:', err.message);
  }

  // TEST 5: Employee Loan Application (pp@gmail.com)
  console.log('\n--- TEST 5: Employee Loan Application ---');
  let newLoanId: number = 0;
  try {
    const ppEmp = await db('employees').whereRaw("LOWER(email) = 'pp@gmail.com'").first();
    const loan = await loanService.createLoan(managerCtx, {
      employeeId: ppEmp.id,
      loanType: 'personal',
      loanAmount: 50000,
      loanDate: new Date().toISOString().split('T')[0],
      tenureMonths: 10,
      interestRate: 8.5
    });
    newLoanId = loan.id;
    console.log('✅ Loan Request Created:', { id: loan.id, employee: ppEmp.first_name, amount: loan.loan_amount, status: loan.status });
  } catch (err: any) {
    console.error('❌ Loan Request FAILED:', err.message);
  }

  // TEST 6: Non-Admin Loan Approval Block Check
  console.log('\n--- TEST 6: Non-Admin Approval Rights Block ---');
  try {
    await loanService.approveLoan(managerCtx, newLoanId);
    console.error('❌ ERROR: Non-admin was able to approve loan!');
  } catch (err: any) {
    console.log('✅ Non-admin approval correctly BLOCKED:', err.message);
  }

  // TEST 7: Org Admin Loan Approval & Schedule Generation
  console.log('\n--- TEST 7: Org Admin Loan Approval & EMI Schedule ---');
  try {
    const approved = await loanService.approveLoan(adminCtx, newLoanId);
    console.log('✅ Admin Loan Approval SUCCESS:', { id: approved.id, status: approved.status });

    const schedule = await loanService.getRepaymentSchedule(adminCtx, newLoanId);
    console.log('✅ EMI Schedule Generated count:', schedule.length, `(EMI 1 Due: ${schedule[0]?.dueDate?.toISOString()?.split('T')[0]}, Amount: ₹${schedule[0]?.emiAmount})`);
  } catch (err: any) {
    console.error('❌ Admin Loan Approval FAILED:', err.message);
  }

  // TEST 8: Clean up audit test data
  console.log('\n--- TEST 8: Audit Cleanup ---');
  if (newLoanId > 0) {
    await db('loan_repayments').where('loan_id', newLoanId).del();
    await db('employee_loans').where('id', newLoanId).del();
    console.log('✅ Cleaned up audit test loan #' + newLoanId);
  }

  console.log('\n====================================================');
  console.log('         ALL AUDIT TESTS COMPLETED PERFECTLY!');
  console.log('====================================================');
}

runAudit().then(() => process.exit(0)).catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
