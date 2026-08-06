import { initializeKnex, getKnex } from '../src/db/knex.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function main() {
  try {
    initializeKnex();
    const db = getKnex();
    
    // 1. List all tables
    console.log('--- TABLES IN DB ---');
    const tables = await db.raw('SHOW TABLES');
    console.log(JSON.stringify(tables[0], null, 2));

    // 2. Describe locations
    try {
      console.log('\n--- DESCRIBE locations ---');
      const descLoc = await db.raw('DESCRIBE locations');
      console.log(JSON.stringify(descLoc[0], null, 2));
    } catch (e: any) {
      console.error('Error describing locations:', e.message);
    }

    // 3. Describe grades
    try {
      console.log('\n--- DESCRIBE grades ---');
      const descGrades = await db.raw('DESCRIBE grades');
      console.log(JSON.stringify(descGrades[0], null, 2));
    } catch (e: any) {
      console.error('Error describing grades:', e.message);
    }

    // 4. Describe department_managers
    try {
      console.log('\n--- DESCRIBE department_managers ---');
      const descDeptMgrs = await db.raw('DESCRIBE department_managers');
      console.log(JSON.stringify(descDeptMgrs[0], null, 2));
    } catch (e: any) {
      console.error('Error describing department_managers:', e.message);
    }

    // 5. Test some queries
    console.log('\n--- TEST QUERIES ---');
    try {
      const locQuery = await db('locations').limit(1);
      console.log('locations query success:', locQuery.length);
    } catch (e: any) {
      console.error('locations query failed:', e.message, e);
    }

    try {
      const gradeQuery = await db('grades').limit(1);
      console.log('grades query success:', gradeQuery.length);
    } catch (e: any) {
      console.error('grades query failed:', e.message, e);
    }

    try {
      const deptMgrQuery = await db('department_managers').limit(1);
      console.log('department_managers query success:', deptMgrQuery.length);
    } catch (e: any) {
      console.error('department_managers query failed:', e.message, e);
    }

    try {
      // Find reimbursement table name by looking up table list
      const reimbs = await db('reimbursement_claims').limit(1);
      console.log('reimbursement_claims query success:', reimbs.length);
    } catch (e: any) {
      console.error('reimbursement_claims query failed:', e.message, e);
    }

    try {
      console.log('\n--- KNEX MIGRATIONS ---');
      const migrations = await db('knex_migrations').select('*');
      console.log(JSON.stringify(migrations, null, 2));
    } catch (e: any) {
      console.error('Failed to query knex_migrations:', e.message);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error in main:', error.message, error);
    process.exit(1);
  }
}

main();
