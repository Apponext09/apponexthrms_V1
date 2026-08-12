import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../knex';

/**
 * Create superadmin user and organization
 * Run with: npm run seed:superadmin
 */
export async function createSuperAdmin() {
  const db = getKnex();

  console.log('🚀 Creating superadmin user...\n');

  const superAdminEmail = 'superadmin@apponext.com';
  const superAdminPassword = 'SuperAdmin@2026!Secure';
  const organizationName = 'ApponextHRMS Platform';
  const organizationSlug = 'apponext-platform';

  try {
    // Check if superadmin already exists
    const existingUser = await db('users').where('email', superAdminEmail).first();
    if (existingUser) {
      console.log('❌ Superadmin user already exists!');
      console.log(`Email: ${superAdminEmail}`);
      console.log('Password: (already set)\n');
      return {
        success: false,
        message: 'Superadmin already exists',
        email: superAdminEmail,
      };
    }

    // Hash password with Argon2
    console.log('🔐 Hashing password with Argon2...');
    const hashedPassword = await hash(superAdminPassword, {
      memoryCost: 12288, // 12 MB
      timeCost: 3,
      parallelism: 1,
      type: 1, // Argon2i
    });
    console.log('✅ Password hashed\n');

    // Check if organization exists
    let organization = await db('organizations')
      .where('slug', organizationSlug)
      .first();

    let organizationId: string;

    if (!organization) {
      // Create organization for superadmin
      console.log('📦 Creating platform organization...');
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
      console.log(
        `✅ Using existing organization: ${organization.name}\n`
      );
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
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    });

    console.log(`✅ Superadmin user created\n`);

    // Assign superadmin role if using RBAC
    try {
      const superAdminRoleId = uuidv4();
      await db('roles').insert({
        id: superAdminRoleId,
        name: 'SuperAdmin',
        description: 'Platform superadministrator with full access',
        organization_id: organizationId,
        is_system_role: true,
        permissions: JSON.stringify([
          'all:all', // Full access to everything
        ]),
        created_at: now,
        updated_at: now,
      });

      // Assign role to user
      await db('user_roles').insert({
        id: uuidv4(),
        user_id: userId,
        role_id: superAdminRoleId,
        organization_id: organizationId,
        created_at: now,
        updated_at: now,
      });

      console.log('✅ SuperAdmin role assigned\n');
    } catch (roleError) {
      // Role table might not exist yet, that's okay
      console.log('ℹ️  Skipping role assignment (RBAC not ready)\n');
    }

    // Create credentials file
    const credentials = `
╔════════════════════════════════════════════════════════════╗
║           SUPERADMIN LOGIN CREDENTIALS                     ║
╚════════════════════════════════════════════════════════════╝

✅ SUPERADMIN ACCOUNT CREATED SUCCESSFULLY!

📧 Email:    ${superAdminEmail}
🔑 Password: ${superAdminPassword}

🏢 Organization:  ${organizationName}
📋 Organization ID: ${organizationId}

👤 User ID: ${userId}
📍 Role: SUPERADMIN (Full Platform Access)

════════════════════════════════════════════════════════════

🚀 LOGIN INSTRUCTIONS:

1. Navigate to: http://localhost:3000/login
2. Enter email: ${superAdminEmail}
3. Enter password: ${superAdminPassword}
4. Click "Sign In"

════════════════════════════════════════════════════════════

⚠️  IMPORTANT SECURITY NOTES:

1. CHANGE THIS PASSWORD IMMEDIATELY after first login!
2. Store credentials in a secure password manager
3. Never commit this file to version control
4. Use strong, unique passwords in production
5. Enable MFA (Multi-Factor Authentication) if available

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

    return {
      success: true,
      message: 'Superadmin created successfully',
      email: superAdminEmail,
      password: superAdminPassword,
      organizationId,
      userId,
    };
  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSuperAdmin()
    .then((result) => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}

export default createSuperAdmin;
