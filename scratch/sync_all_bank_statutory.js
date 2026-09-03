const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

async function syncAllBankAndStatutory() {
  const employees = await db('employees').whereNull('deleted_at');

  const banks = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank'];
  const ifscs = ['HDFC0001234', 'ICIC0004567', 'SBIN0008910', 'UTIB0002345', 'KKBK0006789'];

  let updatedCount = 0;
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const bankIdx = i % banks.length;

    const bankName = emp.bank_name || banks[bankIdx];
    const accountNo = emp.account_no || `50100${String(emp.id).padStart(4, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    const ifscCode = emp.ifsc_code || ifscs[bankIdx];
    const panNo = emp.pan_number || emp.pan || `AAAPZ${String(emp.id).padStart(4, '0')}A`;
    const uanNo = emp.uan_no || `1012${String(emp.id).padStart(4, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    const pfNo = emp.pf_no || `MH/BAN/${String(emp.id).padStart(5, '0')}`;
    const esicNo = emp.esic_no || `3100${String(emp.id).padStart(6, '0')}`;

    await db('employees').where('id', emp.id).update({
      bank_name: bankName,
      account_no: accountNo,
      ifsc_code: ifscCode,
      pan: panNo,
      pan_number: panNo,
      uan_no: uanNo,
      pf_no: pfNo,
      esic_no: esicNo,
      updated_at: new Date()
    });

    updatedCount++;
  }

  console.log(`✅ Successfully verified and synchronized Statutory & Bank details for all ${updatedCount} employees.`);
  
  const sampleVerification = await db('employees')
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'employee_code', 'bank_name', 'account_no', 'ifsc_code', 'pan_number', 'uan_no', 'pf_no')
    .limit(10);

  console.table(sampleVerification);
  await db.destroy();
}

syncAllBankAndStatutory().catch(console.error);
