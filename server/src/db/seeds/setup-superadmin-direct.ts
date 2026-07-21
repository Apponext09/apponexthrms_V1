import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex } from '../knex';

async function setupSuperAdmin() {
  try {
    console.log('🚀 Initializing database connection...');

    // Initialize database connection
    initializeKnex();
    const db = getKnex();

    console.log('✅ Database connected\n');
    console.log('🚀 Creating superadmin user...\n');

    const superAdminEmail = 'superadmin@apponext.com';
    const superAdminPassword = 'SuperAdmin@2026!Secure';
    const organizationName = 'ApponextHRMS Platform';
    const organizationSlug = 'apponext-platform';

    // Check if superadmin already exists
    console.log('🔍 Checking if superadmin already exists...');
    const existingUser = await db('users')
      .where('email', superAdminEmail)
      .first();

    if (existingUser) {
      console.log('❌ Superadmin user already exists!');
      console.log(`\n📧 Email: ${superAdminEmail}`);
      console.log('🔑 Password: (already set)\n');
      console.log('ℹ️  If you forgot the password, delete the user and run this script again.\n');
      process.exit(0);
    }

    console.log('✅ Not found (good, proceeding)\n');

    // Hash password
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
    let organization = await db('organizations')
      .where('slug', organizationSlug)
      .first();

    let organizationId: string;

    if (!organization) {
      console.log('ℹ️  Organization not found, creating...');
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

    // Display credentials
    const credentials = `
╔════════════════════════════════════════════════════════════╗
║           SUPERADMIN LOGIN CREDENTIALS                     ║
╚════════════════════════════════════════════════════════════╝

✅ SUPERADMIN ACCOUNT CREATED SUCCESSFULLY!

📧 Email:    ${superAdminEmail}
🔑 Password: ${superAdminPassword}

🏢 Organization: ${organizationName}
👤 User ID: ${userId}

════════════════════════════════════════════════════════════

🚀 NEXT STEPS:

1. Start the backend server:
   npm run dev

2. In a new terminal, start the frontend:
   cd ../client && npm run dev

3. Open browser and go to:
   http://localhost:3000/login

4. Login with:
   Email: ${superAdminEmail}
   Password: ${superAdminPassword}

5. After login, IMMEDIATELY change your password!
   Settings → Change Password

════════════════════════════════════════════════════════════

⚠️  IMPORTANT SECURITY NOTES:

1. ⚡ Change password immediately after login!
2. 🔒 Enable Two-Factor Authentication (recommended)
3. 💾 Store credentials in a password manager
4. 🔐 Never share these credentials
5. 📝 Save backup codes after enabling 2FA

════════════════════════════════════════════════════════════

✨ Features Available:

✅ Platform Administration
✅ Organization Management
✅ User Management
✅ Marketplace Administration
✅ Licensing Control
✅ Billing & Invoicing
✅ Audit Logs
✅ System Settings
✅ All HRMS Modules

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

// Run immediately
setupSuperAdmin();
