import dotenv from 'dotenv';
dotenv.config();
import { getKnex } from './db/knex';
import { normalizePositionKey } from '../../client/src/features/org-structure/utils/orgHierarchyEngine';

async function test() {
  const db = getKnex();
  const emps = await db('employees as e')
    .leftJoin('designations as d', 'e.current_designation_id', 'd.id')
    .leftJoin('departments as dept', 'e.current_department_id', 'dept.id')
    .select('e.*', 'd.name as designation_name', 'dept.name as department_name');

  console.log('--- ALL EMPLOYEES AND RESOLVED POSITION KEYS ---');
  for (const e of emps) {
    const user = await db('users').where('employee_id', e.id).first();
    const pos = normalizePositionKey(e.designation_name || e.job_title, e.access_role || user?.role);
    console.log(`ID: ${e.id} | Name: ${e.first_name} ${e.last_name} | Code: ${e.employee_code} | Dept: ${e.department_name} | Desig: ${e.designation_name} | JobTitle: ${e.job_title} | AccessRole: ${e.access_role || user?.role} | ResolvedPos: ${pos} | ManagerId: ${e.reporting_manager_id}`);
  }
  process.exit(0);
}
test();
