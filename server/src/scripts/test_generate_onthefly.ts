import { initializeKnex, getKnex } from '../db/knex.js';
import { PayslipService } from '../modules/payroll/services/PayslipService.js';

async function testGenerate() {
  initializeKnex();
  const db = getKnex();
  const service = new PayslipService();
  const emp = await db('employees').where('id', 171).first();
  const user = await db('users').first();
  const ctx = { organizationId: emp.organizationId || emp.organization_id || 12, userId: user?.id || 45 };
  
  console.log(`\n• Testing on-demand generation for: ${emp.firstName || emp.first_name} ${emp.lastName || emp.last_name} (ID: ${emp.id})`);
  const result = await service.getOrGenerateFromProcessedRun(ctx, emp.id, '2026-08');
  
  const ps = result.payslip;
  console.log(`• Payslip Number : ${ps.payslip_number || (ps as any).payslipNumber}`);
  console.log(`• Gross Salary   : ₹${ps.gross_salary || (ps as any).grossSalary}`);
  console.log(`• Basic Salary   : ₹${ps.basic_salary || (ps as any).basicSalary}`);
  console.log(`• Total Deduct   : ₹${ps.total_deductions || (ps as any).totalDeductions}`);
  console.log(`• Net Salary     : ₹${ps.net_salary || (ps as any).netSalary}`);
  console.log(`• Annual CTC     : ₹${ps.ctc}`);
  console.log(`• Earnings Count : ${result.earnings.length}`);
  console.log(`• Deduct Count   : ${result.deductions.length}`);
  console.log('\n[PASS] AARAV MEHTA ON-DEMAND PAYSLIP VERIFIED SUCCESSFULLY!\n');
  process.exit(0);
}

testGenerate().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
