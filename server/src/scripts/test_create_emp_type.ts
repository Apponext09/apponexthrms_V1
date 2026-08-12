import { EmployeeTypeService } from '../modules/settings/services/EmployeeTypeService';
import { initializeKnex } from '../db/knex';

async function testCreateEmpType() {
  console.log('====================================================');
  console.log('  🧪 TESTING CREATE EMPLOYEE TYPE IN MASTER SETTINGS ');
  console.log('====================================================\n');

  try {
    initializeKnex();
    const service = new EmployeeTypeService();
    const mockCtx: any = {
      organizationId: 68,
      userId: 47,
    };

    const res = await service.createEmployeeType(mockCtx, {
      name: `Test Type ${Date.now()}`,
      status: 'active'
    });

    console.log('✅ Success! Created Employee Type:', res);
  } catch (err: any) {
    console.error('❌ EXCEPTION CAPTURED:');
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testCreateEmpType();
