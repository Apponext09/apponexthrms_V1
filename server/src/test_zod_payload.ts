/**
 * Tests the exact payload the client sends when updating employee basic info
 * Run: npx tsx src/test_zod_payload.ts
 */
import { initializeKnex } from './db/knex';
// Test the Zod schema validation directly
import { employeeUpdateSchema, employeeCreateSchema } from '@apponexthrms/shared';

function testSchema(name: string, schema: any, payload: any) {
  const result = schema.safeParse(payload);
  if (result.success) {
    console.log(`✅ ${name} → VALID`);
    // Show any transformations
    const orig = JSON.stringify(payload).length;
    const parsed = JSON.stringify(result.data).length;
    if (orig !== parsed) {
      console.log(`   Transformed keys:`, Object.keys(result.data).filter(k => result.data[k] !== payload[k]));
    }
  } else {
    console.error(`❌ ${name} → INVALID`);
    result.error.issues.forEach((issue: any) => {
      console.error(`   [${issue.path.join('.')}] ${issue.message}`);
    });
  }
}

// This is what EmployeeBasicInfo.tsx sends when editing
const typicalUpdatePayload = {
  firstName: 'Test',
  lastName: 'User',
  middleName: null,
  email: 'test@apponext.com',
  mobile: null,
  dateOfBirth: null,
  gender: null,
  nationality: null,
  bloodGroup: null,
  dateOfJoining: '2024-01-15', // valid ISO date
  employmentType: 'full_time',
  departmentId: null,
  employeeCode: 'EMP001',
  reportingManagerId: null,
  avatarUrl: null,
  status: 'active',
  jobTitle: null,
  accessRole: 'employee',
};

// Simulate what happens when dateOfJoining comes back from DB as "2024-01-15T00:00:00.000Z"
const payloadWithISODateTime = {
  ...typicalUpdatePayload,
  dateOfJoining: '2024-01-15T00:00:00.000Z', // ISO datetime (not just date)
};

// Simulate empty string date
const payloadWithEmptyDate = {
  ...typicalUpdatePayload,
  dateOfJoining: '',
};

// Simulate what happens when dateOfBirth has a timestamp
const payloadWithTimestampDob = {
  ...typicalUpdatePayload,
  dateOfBirth: '2000-01-01T00:00:00.000Z',
};

// Create schema test (what EmployeeCreateModal sends)
const createPayload = {
  employeeCode: 'EMP999',
  firstName: 'New',
  lastName: 'Employee',
  email: 'newtest@apponext.com',
  dateOfJoining: '2024-06-01',
  employmentType: 'full_time',
  password: 'Admin@123',
  accessRole: 'employee',
};

const createWithISODate = {
  ...createPayload,
  dateOfJoining: '2024-06-01T00:00:00.000Z',
};

console.log('\n========== ZOD SCHEMA TESTS ==========\n');

testSchema('UPDATE: typical payload', employeeUpdateSchema, typicalUpdatePayload);
testSchema('UPDATE: dateOfJoining as ISO datetime', employeeUpdateSchema, payloadWithISODateTime);
testSchema('UPDATE: dateOfJoining as empty string', employeeUpdateSchema, payloadWithEmptyDate);
testSchema('UPDATE: dateOfBirth as ISO datetime', employeeUpdateSchema, payloadWithTimestampDob);
testSchema('CREATE: valid payload', employeeCreateSchema, createPayload);
testSchema('CREATE: dateOfJoining as ISO datetime', employeeCreateSchema, createWithISODate);

console.log('\n========== DONE ==========\n');
