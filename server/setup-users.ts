import knex from 'knex';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface UserSetup {
  email: string;
  password: string;
  role: 'organization_admin' | 'hr_manager' | 'employee';
}

const users: UserSetup[] = [
  {
    email: 'admin@apponexthrms.com',
    password: 'Admin@123',
    role: 'organization_admin',
  },
  {
    email: 'hr@apponexthrms.com',
    password: 'Hr@123',
    role: 'hr_manager',
  },
  {
    email: 'employee@apponexthrms.com',
    password: 'Employee@123',
    role: 'employee',
  },
];

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
});

async function setupUsers() {
  try {
    console.log('Connecting to database...');
    await db.raw('SELECT 1');
    console.log('✓ Database connected');

    // Get or create organization
    console.log('\nChecking organizations...');
    let org = await db('organizations').first();

    if (!org) {
      console.log('No organization found. Creating default organization...');
      const [orgId] = await db('organizations').insert({
        uuid: uuidv4(),
        name: 'ApponextHRMS',
        slug: 'apponext-hrms',
        industry: 'Technology',
        timezone: 'UTC',
        locale: 'en',
        status: 'active',
        plan_tier: 'professional',
        created_at: new Date(),
        updated_at: new Date(),
      });
      org = await db('organizations').where('id', orgId).first();
      console.log(`✓ Organization created: ${org.name}`);
    } else {
      console.log(`✓ Using existing organization: ${org.name}`);
    }

    // Ensure roles exist
    console.log('\nEnsuring roles exist...');
    const roleMap: Record<string, number> = {};

    for (const roleCode of ['organization_admin', 'hr_manager', 'employee']) {
      let role = await db('roles')
        .where('organization_id', org.id)
        .where('code', roleCode)
        .first();

      if (!role) {
        const [roleId] = await db('roles').insert({
          organization_id: org.id,
          code: roleCode,
          name: roleCode.replace(/_/g, ' ').toUpperCase(),
          description: `${roleCode.replace(/_/g, ' ')} role`,
          created_at: new Date(),
          updated_at: new Date(),
        });
        role = await db('roles').where('id', roleId).first();
        console.log(`✓ Created role: ${roleCode}`);
      } else {
        console.log(`✓ Role exists: ${roleCode}`);
      }
      roleMap[roleCode] = role.id;
    }

    // Setup users
    console.log('\nSetting up users...');
    console.log('Password hashing parameters:');
    console.log('  - Algorithm: argon2id (type 2)');
    console.log('  - Memory: 19456 KiB');
    console.log('  - Time: 2');
    console.log('  - Parallelism: 1');

    for (const user of users) {
      console.log(`\nProcessing ${user.email}...`);

      // Check if user exists
      const existing = await db('users').where('email', user.email).first();

      const passwordHash = await hash(user.password, {
        type: 2, // argon2id
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      if (existing) {
        console.log(`  Updating existing user...`);
        await db('users').where('id', existing.id).update({
          password_hash: passwordHash,
          status: 'active',
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date(),
        });
        console.log(`  ✓ User updated: ${user.email}`);
      } else {
        console.log(`  Creating new user...`);
        const [userId] = await db('users').insert({
          uuid: uuidv4(),
          organization_id: org.id,
          email: user.email,
          password_hash: passwordHash,
          status: 'active',
          email_verified_at: new Date(),
          failed_login_attempts: 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✓ User created: ${user.email}`);

        // Assign role
        const roleId = roleMap[user.role];
        if (roleId) {
          // Remove existing roles
          await db('user_roles')
            .where('user_id', userId)
            .where('organization_id', org.id)
            .del();

          // Assign new role
          await db('user_roles').insert({
            organization_id: org.id,
            user_id: userId,
            role_id: roleId,
            assigned_by: userId,
            assigned_at: new Date(),
          });
          console.log(`  ✓ Role assigned: ${user.role}`);
        }
      }
    }

    console.log('\n✓ All users set up successfully!');
    console.log('\nTest Credentials:');
    console.log('─'.repeat(50));
    for (const user of users) {
      console.log(`Email:    ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role:     ${user.role}`);
      console.log('─'.repeat(50));
    }

    console.log('\nLogin API Endpoint: http://localhost:5000/api/v1/auth/login');
    console.log('Request Method: POST');

    process.exit(0);
  } catch (error) {
    console.error('Error setting up users:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

setupUsers();
