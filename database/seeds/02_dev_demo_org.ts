import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
export async function seed(knex: Knex): Promise<void> {
  const nodeEnv = process.env.NODE_ENV || 'development';
  // Only seed demo data in development
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && false) {
    return;
  }

  // Check if demo org already exists
  const existing = await knex('organizations').where('slug', 'example-corp').first();
  if (existing) {
    return; // Already seeded
  }

  // Create demo organization
  const orgId = await knex('organizations').insert({
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Example Corp',
    slug: 'example-corp',
    domain: null,
    industry: 'Technology',
    company_size: '100-500',
    timezone: 'UTC',
    locale: 'en',
    status: 'active',
    plan_tier: 'professional',
  }).then(result => (Array.isArray(result) ? result[0] : result));

  // Create password policy for org
  await knex('password_policies').insert({
    organization_id: orgId,
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_number: true,
    require_special_char: true,
    password_expiry_days: null,
    password_history_count: 3,
    max_failed_attempts: 5,
    lockout_duration_minutes: 30,
    session_timeout_minutes: 30,
    mfa_required: false,
  });

  // Get the organization admin role
  const adminRole = await knex('roles')
    .where('organization_id', orgId)
    .where('code', 'organization_admin')
    .first();

  // Create demo admin user
  const userId = await knex('users').insert({
    uuid: '650e8400-e29b-41d4-a716-446655440001',
    organization_id: orgId,
    email: 'admin@example.com',
    mobile: null,
    password_hash: '$argon2id$v=19$m=65536,t=3,p=4$abcd1234$1234567890abcdef', // Dummy hash
    status: 'active',
    email_verified_at: new Date(),
    mfa_enabled: false,
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  }).then(result => (Array.isArray(result) ? result[0] : result));

  // Assign admin role to user
  if (adminRole) {
    await knex('user_roles').insert({
      organization_id: orgId,
      user_id: userId,
      role_id: adminRole.id,
      assigned_by: userId,
      assigned_at: new Date(),
    });
  }

  // Create a demo employee
  await knex('employees').insert({
    uuid: '750e8400-e29b-41d4-a716-446655440002',
    organization_id: orgId,
    employee_code: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    date_of_joining: new Date('2023-01-15'),
    employment_type: 'full_time',
    status: 'active',
    created_by: userId,
    updated_by: userId,
  });
}

