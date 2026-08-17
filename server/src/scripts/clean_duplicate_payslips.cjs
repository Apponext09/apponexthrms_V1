const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function cleanDuplicates() {
  console.log("Cleaning duplicate payslip entries from database...");

  const activePayslips = await knex('payslips')
    .whereNull('deleted_at')
    .orderBy('id', 'desc');

  const seen = new Set();
  let deletedCount = 0;

  for (const row of activePayslips) {
    const monthStr = row.payslip_month ? new Date(row.payslip_month).toISOString().slice(0, 7) : 'unknown';
    const key = `${row.employee_id}_${monthStr}`;

    if (seen.has(key)) {
      // Duplicate entry found -> Soft delete this older record
      await knex('payslips')
        .where('id', row.id)
        .update({ deleted_at: new Date() });
      deletedCount++;
      console.log(`Soft deleted older duplicate payslip (ID: ${row.id}, Emp: ${row.employee_id}, Month: ${monthStr})`);
    } else {
      seen.add(key);
    }
  }

  console.log(`\nCleaned up ${deletedCount} duplicate payslip records.`);
  await knex.destroy();
}

cleanDuplicates().catch(err => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
