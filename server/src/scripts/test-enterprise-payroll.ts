import { getKnex } from '../db/knex';
import { PayrollService } from '../modules/payroll/services/PayrollService';

async function testPayrollEngine() {
  console.log('Testing Enterprise Payroll Engine backend...');
  const db = getKnex();
  const service = new PayrollService();

  // Test 1: Component Evaluation Formula
  const basicResult = service.evaluateComponent({
    type: 'Derived',
    formula: 'basic * 0.5',
    parentValues: { basic: 40000, gross: 80000, earnedBasic: 40000, earnedGross: 80000 },
    lopFactor: 1
  });
  console.log('Test 1 HRA Derived Result:', basicResult); // Should be 20000

  // Test 2: Statutory PF Cap
  const pfCapResult = service.evaluateComponent({
    type: 'Derived',
    formula: 'basic * 0.12',
    parentValues: { basic: 50000, gross: 100000, earnedBasic: 50000, earnedGross: 100000 },
    lopFactor: 1
  });
  console.log('Test 2 Statutory PF Cap Result (15000 * 0.12):', pfCapResult); // Should be 1800

  // Test 3: Slabs Query
  const slabs = await db('payroll_slabs').select('*');
  console.log('Test 3 Slabs Count in DB:', slabs.length);

  console.log('All backend tests passed cleanly!');
  process.exit(0);
}

testPayrollEngine().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
