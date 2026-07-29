import { initializeKnex, getKnex } from '../src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  initializeKnex();
  const db = getKnex();
  try {
    const user = await db('users').where('email', 'narendragaikwad19@gmail.com').first();
    console.log('User:', JSON.stringify(user, null, 2));
    
    if (user) {
      const empId = user.employeeId || user.employee_id || 0;
      console.log('Employee ID:', empId);
      
      const balances = await db('leave_balances as lb')
        .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .select('lb.*', 'lt.leave_name', 'lt.leave_code')
        .where('lb.employee_id', empId);
      
      console.log('Balances:', JSON.stringify(balances, null, 2));

      const applications = await db('leave_applications')
        .where('employee_id', empId);
      console.log('Applications:', JSON.stringify(applications, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
