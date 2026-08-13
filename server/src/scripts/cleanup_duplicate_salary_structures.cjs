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

async function cleanupDuplicateStructures() {
  console.log("================================================================================");
  console.log("             CLEANING UP DUPLICATE SALARY STRUCTURES IN DB                      ");
  console.log("================================================================================\n");

  // Check tables: salary_structures / employee_salary_structures
  const tables = ['salary_structures', 'employee_compensation'];

  for (const tableName of tables) {
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) continue;

    console.log(`Inspecting table: ${tableName}`);
    const rows = await knex(tableName).whereNull('deleted_at').orderBy('id', 'desc');
    console.log(`Found ${rows.length} total rows in ${tableName}.`);

    // Group by employee_id
    const empGroups = {};
    for (const r of rows) {
      const empId = r.employee_id || r.emp_id;
      if (!empId) continue;
      if (!empGroups[empId]) empGroups[empId] = [];
      empGroups[empId].push(r);
    }

    let deletedCount = 0;
    for (const empId in empGroups) {
      const list = empGroups[empId];
      if (list.length > 1) {
        // Keep the latest 1 row (list[0]), mark the rest as deleted or remove them
        const keepId = list[0].id;
        const removeIds = list.slice(1).map(x => x.id);
        
        console.log(`Employee ID ${empId}: Keeping latest ID ${keepId}, removing ${removeIds.length} duplicate row(s).`);

        // Check if soft delete column exists
        const hasDeletedAt = await knex.schema.hasColumn(tableName, 'deleted_at');
        if (hasDeletedAt) {
          await knex(tableName).whereIn('id', removeIds).update({ deleted_at: new Date() });
        } else {
          await knex(tableName).whereIn('id', removeIds).del();
        }
        deletedCount += removeIds.length;
      }
    }
    console.log(`Finished cleaning ${tableName}: ${deletedCount} duplicate row(s) cleaned.\n`);
  }

  console.log("================================================================================");
  console.log("                   DUPLICATE DATA CLEANUP COMPLETE                              ");
  console.log("================================================================================\n");

  await knex.destroy();
}

cleanupDuplicateStructures().catch(err => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
