import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'argon2';

interface DefaultUser {
  email: string;
  password: string;
  roleCode: string;
  name: string;
}

const DEFAULT_USERS: DefaultUser[] = [
  {
    email: 'superadmin@apponexthrms.com',
    password: 'Admin@123',
    roleCode: 'super_admin',
    name: 'Super Admin',
  },
  {
    email: 'admin@apponexthrms.com',
    password: 'Admin@123',
    roleCode: 'organization_admin',
    name: 'Company Admin',
  },
  {
    email: 'hr@apponexthrms.com',
    password: 'Admin@123',
    roleCode: 'hr_admin',
    name: 'HR Admin',
  },
  {
    email: 'employee@apponexthrms.com',
    password: 'Admin@123',
    roleCode: 'employee',
    name: 'Employee',
  },
];

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: 2, // argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function seed(knex: Knex): Promise<void> {
  // Get or create the default organization for these users
  let org = await knex('organizations')
    .where('slug', 'apponext')
    .first();

  if (!org) {
    const orgId = await knex('organizations').insert({
      uuid: uuidv4(),
      name: 'Apponext',
      slug: 'apponext',
      status: 'active',
      plan_tier: 'enterprise',
      timezone: 'UTC',
      locale: 'en',
      created_at: new Date(),
      updated_at: new Date(),
    }).then(result => (Array.isArray(result) ? result[0] : result));

    org = { id: orgId };
    console.log(`✓ Created organization: Apponext (ID: ${orgId})`);
  }

  const organizationId = org.id;

  // Create system roles for this organization if they don't exist
  const roleCodes = ['super_admin', 'organization_admin', 'hr_admin', 'employee'];
  const roleNames: Record<string, string> = {
    super_admin: 'Super Admin',
    organization_admin: 'Organization Admin',
    hr_admin: 'HR Admin',
    employee: 'Employee',
  };

  for (const roleCode of roleCodes) {
    const roleExists = await knex('roles')
      .where('organization_id', organizationId)
      .where('code', roleCode)
      .first();

    if (!roleExists) {
      await knex('roles').insert({
        uuid: uuidv4(),
        organization_id: organizationId,
        name: roleNames[roleCode],
        code: roleCode,
        is_system: true,
        is_platform_role: false,
        is_default: roleCode === 'employee',
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✓ Created role: ${roleCode}`);
    }
  }

  // Create password policy for org if not exists
  const policyExists = await knex('password_policies')
    .where('organization_id', organizationId)
    .first();

  if (!policyExists) {
    await knex('password_policies').insert({
      organization_id: organizationId,
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
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Process each default user
  for (const userConfig of DEFAULT_USERS) {
    // Check if user already exists
    const existingUser = await knex('users')
      .where('email', userConfig.email)
      .first();

    if (existingUser) {
      console.log(`✓ User ${userConfig.email} already exists. Skipping...`);
      continue;
    }

    // Hash the password
    const passwordHash = await hashPassword(userConfig.password);

    // Create the user
    const userId = await knex('users').insert({
      uuid: uuidv4(),
      organization_id: organizationId,
      email: userConfig.email,
      status: 'active',
      password_hash: passwordHash,
      email_verified_at: new Date(),
      mfa_enabled: false,
      failed_login_attempts: 0,
      must_change_password: false,
      created_at: new Date(),
      updated_at: new Date(),
    }).then(result => (Array.isArray(result) ? result[0] : result));

    // Get the role
    const role = await knex('roles')
      .where('organization_id', organizationId)
      .where('code', userConfig.roleCode)
      .first();

    if (!role) {
      console.warn(`⚠ Role '${userConfig.roleCode}' not found for user ${userConfig.email}`);
      continue;
    }

    // Assign role to user
    const roleAssignmentExists = await knex('user_roles')
      .where('user_id', userId)
      .where('role_id', role.id)
      .first();

    if (!roleAssignmentExists) {
      await knex('user_roles').insert({
        organization_id: organizationId,
        user_id: userId,
        role_id: role.id,
        assigned_by: userId, // Self-assign for first users
        assigned_at: new Date(),
      });
    }

    console.log(`✓ Created user: ${userConfig.email} with role: ${userConfig.roleCode}`);
  }

  console.log('✓ Default users seed completed successfully!');
}
