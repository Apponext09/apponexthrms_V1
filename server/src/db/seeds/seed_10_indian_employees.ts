/**
 * Seeds 4 departments, 4 linked designations, and 10 Indian employees
 * (5 male, 5 female) with linked user accounts into organization 14.
 * Email = firstname@gmail.com; login id and password are both the email.
 * Run: npx tsx ./src/db/seeds/seed_10_indian_employees.ts
 */
import { initializeKnex } from '../knex';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';

const db = initializeKnex();

const ORG_ID = 14;

const DEPARTMENTS = [
  { name: 'Marketing', code: 'MARKETING' },
  { name: 'Finance', code: 'FINANCE' },
  { name: 'Operations', code: 'OPERATIONS' },
  { name: 'Information Technology', code: 'INFO-TECH' },
];

const DESIGNATIONS = [
  { name: 'Marketing Executive', code: 'MARKETING-EXEC', deptCode: 'MARKETING' },
  { name: 'Finance Analyst', code: 'FINANCE-ANALYST', deptCode: 'FINANCE' },
  { name: 'Operations Manager', code: 'OPERATIONS-MGR', deptCode: 'OPERATIONS' },
  { name: 'Software Engineer', code: 'SOFTWARE-ENGINEER', deptCode: 'INFO-TECH' },
];

const EMPLOYEES = [
  { first: 'Rohan', last: 'Sharma', gender: 'male', deptCode: 'MARKETING', desigCode: 'MARKETING-EXEC' },
  { first: 'Karan', last: 'Verma', gender: 'male', deptCode: 'FINANCE', desigCode: 'FINANCE-ANALYST' },
  { first: 'Vikram', last: 'Singh', gender: 'male', deptCode: 'OPERATIONS', desigCode: 'OPERATIONS-MGR' },
  { first: 'Aditya', last: 'Rao', gender: 'male', deptCode: 'INFO-TECH', desigCode: 'SOFTWARE-ENGINEER' },
  { first: 'Nikhil', last: 'Joshi', gender: 'male', deptCode: 'INFO-TECH', desigCode: 'SOFTWARE-ENGINEER' },
  { first: 'Priya', last: 'Nair', gender: 'female', deptCode: 'MARKETING', desigCode: 'MARKETING-EXEC' },
  { first: 'Ananya', last: 'Iyer', gender: 'female', deptCode: 'FINANCE', desigCode: 'FINANCE-ANALYST' },
  { first: 'Kavya', last: 'Menon', gender: 'female', deptCode: 'OPERATIONS', desigCode: 'OPERATIONS-MGR' },
  { first: 'Sneha', last: 'Gupta', gender: 'female', deptCode: 'INFO-TECH', desigCode: 'SOFTWARE-ENGINEER' },
  { first: 'Riya', last: 'Desai', gender: 'female', deptCode: 'INFO-TECH', desigCode: 'SOFTWARE-ENGINEER' },
];

async function run() {
  try {
    const admin = await db('users').where({ organization_id: ORG_ID, email: 'shakya@gmail.com' }).first();
    if (!admin) throw new Error('Admin user shakya@gmail.com not found in org 14');
    const adminId = admin.id;

    const empRole = await db('roles').where({ organization_id: ORG_ID, code: 'employee' }).first();
    if (!empRole) throw new Error('employee role not found in org 14');

    console.log('== Creating departments ==');
    const deptIdByCode: Record<string, number> = {};
    for (const d of DEPARTMENTS) {
      const existing = await db('departments').where({ organization_id: ORG_ID, code: d.code }).first();
      if (existing) {
        deptIdByCode[d.code] = existing.id;
        console.log(`  = exists: ${d.name} [${existing.id}]`);
        continue;
      }
      const [id] = await db('departments').insert({
        uuid: uuidv4(),
        organization_id: ORG_ID,
        name: d.name,
        code: d.code,
        status: 'active',
        created_by: adminId,
        updated_by: adminId,
      });
      deptIdByCode[d.code] = id;
      console.log(`  + created: ${d.name} [${id}]`);
    }

    console.log('== Creating designations ==');
    const desigIdByCode: Record<string, number> = {};
    for (const g of DESIGNATIONS) {
      const existing = await db('designations').where({ organization_id: ORG_ID, code: g.code }).first();
      if (existing) {
        desigIdByCode[g.code] = existing.id;
        console.log(`  = exists: ${g.name} [${existing.id}]`);
        continue;
      }
      const [id] = await db('designations').insert({
        uuid: uuidv4(),
        organization_id: ORG_ID,
        name: g.name,
        code: g.code,
        department_id: deptIdByCode[g.deptCode],
        status: 'active',
        created_by: adminId,
        updated_by: adminId,
      });
      desigIdByCode[g.code] = id;
      console.log(`  + created: ${g.name} [${id}]`);
    }

    console.log('== Creating employees + users ==');
    let empCodeSeq = 301;
    const dateOfJoining = '2024-06-01';

    for (const e of EMPLOYEES) {
      const email = `${e.first.toLowerCase()}@gmail.com`;

      const existingEmp = await db('employees').where({ organization_id: ORG_ID, email }).first();
      if (existingEmp) {
        console.log(`  = employee exists: ${email}, skipping`);
        continue;
      }

      const employeeCode = `EMP${empCodeSeq++}`;
      const [empId] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: ORG_ID,
        employee_code: employeeCode,
        status: 'active',
        first_name: e.first,
        last_name: e.last,
        email,
        gender: e.gender,
        current_designation_id: desigIdByCode[e.desigCode],
        current_department_id: deptIdByCode[e.deptCode],
        date_of_joining: dateOfJoining,
        created_by: adminId,
        updated_by: adminId,
      });

      const passwordHash = await hash(email, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

      const [userId] = await db('users').insert({
        uuid: uuidv4(),
        organization_id: ORG_ID,
        employee_id: empId,
        email,
        password_hash: passwordHash,
        status: 'active',
        created_by: adminId,
      });

      await db('user_roles').insert({
        organization_id: ORG_ID,
        user_id: userId,
        role_id: empRole.id,
        assigned_by: adminId,
      });

      console.log(`  + ${e.first} ${e.last} (${e.gender}) | ${employeeCode} | ${email} | employee[${empId}] user[${userId}]`);
    }

    console.log('\nDone. All 10 users log in with their email as both the id and the password.');
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

run();
