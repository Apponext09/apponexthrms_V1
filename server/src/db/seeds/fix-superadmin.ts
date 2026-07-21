import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex } from '../knex';

async function fixSuperAdmin() {
  try {
    console.log('🚀 Initializing database connection...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    const superAdminEmail = 'superadmin@apponext.com';
    const superAdminPassword = 'SuperAdmin@2026!Secure';
    const organizationName = 'ApponextHRMS Platform';
    const organizationSlug = 'apponext-platform';

    console.log('🔍 Checking for existing superadmin...');
    const existingUser = await db('users').where('email', superAdminEmail).first();

    if (existingUser) {
      console.log(`❌ Found existing user, deleting...`);
      await db('users').where('email', superAdminEmail).delete();
      console.log('✅ Deleted\n');
    }

    // Hash password with Argon2
    console.log('🔐 Hashing password with Argon2...');
    const hashedPassword = await hash(superAdminPassword, {
      memoryCost: 12288,
      timeCost: 3,
      parallelism: 1,
      type: 1,
    });
    console.log('✅ Password hashed\n');

    // Check/create organization
    console.log('📦 Checking for platform organization...');
    let organization = await db('organizations').where('slug', organizationSlug).first();
    let organizationId: string;

    if (!organization) {
      organizationId = uuidv4();
      const now = new Date();

      await db('organizations').insert({
        id: organizationId,
        name: organizationName,
        slug: organizationSlug,
        status: 'active',
        plan_tier: 'enterprise',
        timezone: 'UTC',
        locale: 'en',
        created_at: now,
        updated_at: now,
      });

      console.log(`✅ Organization created: ${organizationName}\n`);
    } else {
      organizationId = organization.id;
      console.log(`✅ Using existing organization: ${organization.name}\n`);
    }

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const userId = uuidv4();
    const now = new Date();

    await db('users').insert({
      id: userId,
      email: superAdminEmail,
      first_name: 'Super',
      last_name: 'Admin',
      password_hash: hashedPassword,
      organization_id: organizationId,
      role: 'superadmin',
      status: 'active',
      email_verified: true,
      created_at: now,
      updated_at: now,
    });

    console.log('✅ Superadmin user created\n');

    // Verify user was created
    console.log('✅ Verifying user in database...');
    const verifyUser = await db('users').where('email', superAdminEmail).first();
    if (verifyUser) {
      console.log(`✅ User verified:
  - Email: ${verifyUser.email}
  - ID: ${verifyUser.id}
  - Organization: ${verifyUser.organization_id}
  - Status: ${verifyUser.status}
  - Role: ${verifyUser.role}\n`);
    }

    // Display credentials
    const credentials = `
╔════════════════════════════════════════════════════════════╗
║           SUPERADMIN LOGIN CREDENTIALS                     ║
╚════════════════════════════════════════════════════════════╝

✅ SUPERADMIN ACCOUNT CREATED & VERIFIED!

📧 Email:    ${superAdminEmail}
🔑 Password: ${superAdminPassword}

════════════════════════════════════════════════════════════

🌐 LOGIN:

1. Open: http://localhost:3000/login
2. Email: ${superAdminEmail}
3. Password: ${superAdminPassword}
4. Click: Sign In

════════════════════════════════════════════════════════════

⚠️  If login still fails:

1. Check backend is running: npm run dev
2. Check for error logs in console
3. Clear browser cookies and try again
4. Try in incognito/private mode

════════════════════════════════════════════════════════════
`;

    console.log(credentials);
    console.log('✅ Setup complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

fixSuperAdmin();
