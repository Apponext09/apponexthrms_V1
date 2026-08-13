require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

async function checkLoanBank() {
  console.log('\n====== LOAN TABLES ======');
  const [loanTables] = await knex.raw('SHOW TABLES LIKE "%loan%"').catch(() => [[]]);
  console.log(loanTables.map(r => Object.values(r)[0]));

  const [bankTables] = await knex.raw('SHOW TABLES LIKE "%bank%"').catch(() => [[]]);
  console.log('\n====== BANK TABLES ======');
  console.log(bankTables.map(r => Object.values(r)[0]));

  console.log('\n====== employee_loans COLUMNS ======');
  const [loanCols] = await knex.raw('DESCRIBE employee_loans').catch(() => [[]]);
  if (loanCols.length) console.log(loanCols.map(c => `${c.Field} (${c.Type})`));
  else console.log('Table not found!');

  console.log('\n====== loan_repayments COLUMNS ======');
  const [repCols] = await knex.raw('DESCRIBE loan_repayments').catch(() => [[]]);
  if (repCols.length) console.log(repCols.map(c => `${c.Field} (${c.Type})`));
  else console.log('Table not found!');

  console.log('\n====== employees BANK COLUMNS ======');
  const [empCols] = await knex.raw('DESCRIBE employees').catch(() => [[]]);
  if (empCols.length) {
    const bankCols = empCols.filter(c => c.Field.includes('bank') || c.Field.includes('account') || c.Field.includes('ifsc') || c.Field.includes('payment'));
    console.log(bankCols.map(c => `${c.Field} (${c.Type})`));
  }

  console.log('\n====== SAMPLE LOAN DATA ======');
  const loans = await knex('employee_loans').select('*').limit(3).catch(() => []);
  console.log(loans.length > 0 ? loans : 'No data in employee_loans');

  await knex.destroy();
}
checkLoanBank().catch(e => { console.error(e.message); process.exit(1); });
