/**
 * Moves the 4 departments, 4 designations, 10 employees, 10 users, and their
 * user_roles created by seed_10_indian_employees.ts from organization 14
 * ("sonex1") into organization 16 ("Sammy") — the org the target login
 * actually belongs to.
 * Run: npx tsx ./src/db/seeds/move_10_employees_to_org16.ts
 */
import { initializeKnex } from '../knex';
import { v4 as uuidv4 } from 'uuid';

const db = initializeKnex();

const FROM_ORG = 14;
const TO_ORG = 16;

const DEPT_IDS = [38, 39, 40, 41];
const DESIG_IDS = [49, 50, 51, 52];
const EMP_IDS = [230, 231, 232, 233, 234, 235, 236, 237, 238, 239];
const USER_IDS = [72, 73, 74, 75, 76, 77, 78, 79, 80, 81];

async function run() {
  try {
    const newAdmin = await db('users').where({ organization_id: TO_ORG, email: 'sammy@gmail.com' }).first();
    if (!newAdmin) throw new Error('sammy@gmail.com user not found in org 16');
    const adminId = newAdmin.id;

    let empRole = await db('roles').where({ organization_id: TO_ORG, code: 'employee' }).first();
    if (!empRole) {
      const [roleId] = await db('roles').insert({
        uuid: uuidv4(),
        organization_id: TO_ORG,
        name: 'EMPLOYEE',
        code: 'employee',
        description: 'Default employee role',
        is_system: 1,
        is_default: 1,
      });
      empRole = { id: roleId };
      console.log(`  + created employee role [${roleId}] for org ${TO_ORG}`);
    }

    const deptUpdated = await db('departments')
      .whereIn('id', DEPT_IDS)
      .andWhere({ organization_id: FROM_ORG })
      .update({ organization_id: TO_ORG, created_by: adminId, updated_by: adminId });
    console.log(`departments moved: ${deptUpdated}`);

    const desigUpdated = await db('designations')
      .whereIn('id', DESIG_IDS)
      .andWhere({ organization_id: FROM_ORG })
      .update({ organization_id: TO_ORG, created_by: adminId, updated_by: adminId });
    console.log(`designations moved: ${desigUpdated}`);

    const empUpdated = await db('employees')
      .whereIn('id', EMP_IDS)
      .andWhere({ organization_id: FROM_ORG })
      .update({ organization_id: TO_ORG, created_by: adminId, updated_by: adminId });
    console.log(`employees moved: ${empUpdated}`);

    const userUpdated = await db('users')
      .whereIn('id', USER_IDS)
      .andWhere({ organization_id: FROM_ORG })
      .update({ organization_id: TO_ORG, created_by: adminId });
    console.log(`users moved: ${userUpdated}`);

    const roleRowsUpdated = await db('user_roles')
      .whereIn('user_id', USER_IDS)
      .andWhere({ organization_id: FROM_ORG })
      .update({ organization_id: TO_ORG, role_id: empRole.id, assigned_by: adminId });
    console.log(`user_roles moved: ${roleRowsUpdated}`);

    const check = await db('employees').whereIn('id', EMP_IDS).select('id', 'first_name', 'last_name', 'email', 'organization_id');
    console.log('\nFinal check:');
    for (const r of check) {
      console.log(`  [${r.id}] ${r.first_name} ${r.last_name} | ${r.email} | org ${r.organization_id}`);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

run();
