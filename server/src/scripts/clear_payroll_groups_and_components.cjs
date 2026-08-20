const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function clearAllPayrollGroupsAndComponents() {
  console.log('===========================================================');
  console.log('🧹 DELETING ALL DATA FROM GROUPS AND COMPONENTS TABLES');
  console.log('===========================================================\n');

  try {
    // Delete all records from payroll_components and payroll_component_groups
    const compCount = await db('payroll_components').del();
    const groupCount = await db('payroll_component_groups').del();

    console.log(`✅ Deleted ${compCount} rows from \`payroll_components\` table.`);
    console.log(`✅ Deleted ${groupCount} rows from \`payroll_component_groups\` table.`);

    console.log('\n===========================================================');
    console.log('✨ BOTH TABLES ARE NOW COMPLETELY EMPTY & READY FOR FRESH DATA ✨');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error clearing tables:', err);
  } finally {
    await db.destroy();
  }
}

clearAllPayrollGroupsAndComponents();
