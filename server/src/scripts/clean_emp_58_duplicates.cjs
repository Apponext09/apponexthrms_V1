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

async function cleanEmp58() {
  console.log("Cleaning duplicate salary structure rows for Employee 58...");
  
  const rows = await knex('salary_structures')
    .where('employee_id', 58)
    .whereNull('deleted_at')
    .orderBy('id', 'desc');

  console.log(`Found ${rows.length} rows for Employee 58.`);

  if (rows.length > 1) {
    // Keep latest 1 row (rows[0].id)
    const keepId = rows[0].id;
    const deleteIds = rows.slice(1).map(r => r.id);

    console.log(`Keeping ID ${keepId}, deleting ${deleteIds.length} duplicate IDs:`, deleteIds);

    await knex('salary_structures')
      .whereIn('id', deleteIds)
      .del(); // Or soft delete

    console.log("Successfully removed duplicate rows for Employee 58!");
  } else {
    console.log("Employee 58 already has only 1 clean record.");
  }

  // Also clean any other employees with duplicate rows
  const allRows = await knex('salary_structures').whereNull('deleted_at').orderBy('id', 'desc');
  const seenEmp = new Set();
  const duplicateIdsAll = [];

  for (const r of allRows) {
    if (seenEmp.has(r.employee_id)) {
      duplicateIdsAll.push(r.id);
    } else {
      seenEmp.add(r.employee_id);
    }
  }

  if (duplicateIdsAll.length > 0) {
    console.log(`Cleaning ${duplicateIdsAll.length} remaining duplicate rows across all employees...`);
    await knex('salary_structures').whereIn('id', duplicateIdsAll).del();
    console.log("All duplicate salary structure rows cleaned!");
  }

  await knex.destroy();
}

cleanEmp58().catch(err => {
  console.error("Clean failed:", err);
  process.exit(1);
});
