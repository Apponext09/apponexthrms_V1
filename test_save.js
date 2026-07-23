import { initializeKnex } from './server/src/db/knex';
import { EmployeeService } from './server/src/modules/employee/services/EmployeeService';
import { validate } from './server/src/common/middleware/validate';
import { employeeUpdateSchema } from '@apponexthrms/shared';

// Initialize env
const dotenv = require('dotenv');
dotenv.config({ path: 'server/.env' });

const db = initializeKnex();
const service = new EmployeeService();

async function run() {
  try {
    const ctx = {
      organizationId: 3,
      userId: 12, // User ID of Mah Hello
    };

    const rawPayload = {
      firstName: "Mah",
      lastName: "Hello",
      middleName: null,
      email: "m@gmail.com",
      mobile: null,
      dateOfBirth: null,
      gender: null,
      nationality: null,
      bloodGroup: null,
      dateOfJoining: "2026-07-20",
      employmentType: "full_time",
      departmentId: null,
      employeeCode: "EMP27",
      reportingManagerId: null,
      avatarUrl: null,
      status: "active",
      jobTitle: "",
      accessRole: "department_head",
    };

    console.log('--- VALIDATING PAYLOAD ---');
    const validated = validate(rawPayload, employeeUpdateSchema);
    console.log('Validated payload:', validated);

    console.log('--- SAVING PAYLOAD ---');
    const result = await service.updateEmployee(ctx, 27, validated);
    console.log('Save result:', result);
  } catch (err) {
    console.error('CRASHED WITH ERROR:', err);
  } finally {
    await db.destroy();
  }
}

run();
