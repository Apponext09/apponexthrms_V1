import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

const randomUUID = () => uuidv4();

export async function seed(knex: Knex): Promise<void> {
  // Only seed in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // Check if user already exists
  const existing = await knex('users').where('email', 'aqil.jamadar@kosqu.com').first();
  if (existing) {
    return; // Already seeded
  }

  // Get the first organization (or create one)
  let org = await knex('organizations').first();

  if (!org) {
    // Create organization if none exists
    const [orgId] = await knex('organizations').insert({
      uuid: randomUUID(),
      name: 'Kosqu',
      slug: 'kosqu',
      industry: 'Technology',
      timezone: 'UTC',
      locale: 'en',
      status: 'active',
      plan_tier: 'professional',
    });
    org = await knex('organizations').where('id', orgId).first();
  }

  // Get or create admin role
  let adminRole = await knex('roles')
    .where('organization_id', org.id)
    .where('code', 'organization_admin')
    .first();

  if (!adminRole) {
    const [roleId] = await knex('roles').insert({
      organization_id: org.id,
      code: 'organization_admin',
      name: 'Organization Admin',
      description: 'Organization Administrator',
      created_at: new Date(),
      updated_at: new Date(),
    });
    adminRole = await knex('roles').where('id', roleId).first();
  }

  // Create Aqil user with the provided credentials
  const userId = await knex('users').insert({
    uuid: randomUUID(),
    organization_id: org.id,
    email: 'aqil.jamadar@kosqu.com',
    mobile: null,
    password_hash: '$argon2id$v=19$m=65536,t=3,p=4$mf8GVd/AmgfXO7Uxl3h6/w$uVYpGm5UXZVnwvb+0xYjihve7om7PE9gIjaQi7Isvuc',
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
      organization_id: org.id,
      user_id: userId,
      role_id: adminRole.id,
      assigned_by: userId,
      assigned_at: new Date(),
    });
  }
}
