import { initializeKnex, getKnex } from './src/db/knex.js';
import { LoanService } from './src/modules/payroll/services/LoanService.js';

initializeKnex();

const loanService = new LoanService();
const ctx = { organizationId: 67, userId: 41, sessionUuid: 'test' };

const loans = await loanService.getEmployeeLoans(ctx as any);
console.log('Raw returned loans:', JSON.stringify(loans, null, 2));

process.exit(0);
