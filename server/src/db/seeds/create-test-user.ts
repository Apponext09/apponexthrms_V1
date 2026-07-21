import { hash } from 'argon2';
import { initializeKnex, getKnex } from '../knex';

async function createTestUser() {
  try {
    console.log('🚀 Initializing database connection...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    const superAdminEmail = 'superadmin@apponext.com';
    const superAdminPassword = 'SuperAdmin@2026!Secure';

    console.log('🔍 Checking if superadmin already exists...');
    const existingUser = await db('users').where('email', superAdminEmail).first();

    if (existingUser) {
      console.log('✅ Superadmin already exists!');
      console.log(`📧 Email: ${superAdminEmail}`);
      console.log(`🔑 Password: ${superAdminPassword}\n`);
      process.exit(0);
    }

    console.log('✅ Not found, proceeding to create\n');

    // Check or create organization
    console.log('📦 Checking for platform organization...');
    let org = await db('organizations').where('slug', 'apponext-platform').first();

    if (!org) {
      console.log('ℹ️  Organization not found, creating...');
      const { v4: uuidv4 } = await import('uuid');
      const orgUuid = uuidv4();

      await db('organizations').insert({
        uuid: orgUuid,
        name: 'ApponextHRMS Platform',
        slug: 'apponext-platform',
        status: 'active',
        plan_tier: 'enterprise',
        timezone: 'UTC',
        locale: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      });
      org = await db('organizations').where('slug', 'apponext-platform').first();
      console.log(`✅ Organization created (ID: ${org.id})\n`);
    } else {
      console.log(`✅ Using existing organization (ID: ${org.id})\n`);
    }

    // Hash password
    console.log('🔐 Hashing password with Argon2...');
    const hashedPassword = await hash(superAdminPassword, {
      memoryCost: 12288,
      timeCost: 3,
      parallelism: 1,
      type: 1,
    });
    console.log('✅ Password hashed\n');

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const { v4: uuidv4 } = await import('uuid');
    const userUuid = uuidv4();

    await db('users').insert({
      uuid: userUuid,
      email: superAdminEmail,
      password_hash: hashedPassword,
      organization_id: org.id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('✅ Superadmin user created!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ' + superAdminEmail);
    console.log('🔑 Password: ' + superAdminPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

createTestUser();
