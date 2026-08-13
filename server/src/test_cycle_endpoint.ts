import { PayrollController } from './modules/payroll/controllers/PayrollController';

async function testCreateCycle() {
  const ctrl = new PayrollController();
  const req: any = {
    ctx: { organizationId: 8, userId: 10 },
    body: {
      name: 'Standard Monthly Cycle',
      frequency: 'Monthly',
      startDay: 1,
      endDay: 30,
      cutoffDay: 25,
      payoutDay: 1
    },
    params: {},
    query: {}
  };

  const res: any = {
    statusCode: 200,
    status: function(s: number) { this.statusCode = s; return this; },
    json: function(d: any) { this.responseData = d; return this; }
  };

  await ctrl.createCycle(req, res);
  console.log('API Response Status:', res.statusCode);
  console.log('API Response Data:', JSON.stringify(res.responseData, null, 2));

  process.exit(0);
}

testCreateCycle();
