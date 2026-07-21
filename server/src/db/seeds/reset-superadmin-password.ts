import { hash } from 'argon2';
import { initializeKnex, getKnex } from '../knex';

async function resetPassword() {
  try {
    console.log('🚀 Initializing database connection...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    const superAdminEmail = 'superadmin@apponext.com';
    const superAdminPassword = 'SuperAdmin@2026!Secure';

    console.log('🔍 Finding superadmin user...');
    const user = await db('users').where('email', superAdminEmail).first();

    if (!user) {
      console.log('❌ Superadmin user not found! Creating new one...\n');

      // Create new user
      const { v4: uuidv4 } = await import('uuid');

      // Get or create organization
      let org = await db('organizations').where('slug', 'apponext-platform').first();
      if (!org) {
        const orgId = uuidv4();
        await db('organizations').insert({
          id: orgId,
          name: 'ApponextHRMS Platform',
          slug: 'apponext-platform',
          status: 'active',
          plan_tier: 'enterprise',
          timezone: 'UTC',
          locale: 'en',
          created_at: new Date(),
          updated_at: new Date(),
        });
        org = { id: orgId };
      }

      // Hash password
      console.log('🔐 Hashing password...');
      const hashedPassword = await hash(superAdminPassword, {
        memoryCost: 12288,
        timeCost: 3,
        parallelism: 1,
        type: 1,
      });

      // Create user
      const userId = uuidv4();
      await db('users').insert({
        id: userId,
        email: superAdminEmail,
        first_name: 'Super',
        last_name: 'Admin',
        password_hash: hashedPassword,
        organization_id: org.id,
        role: 'superadmin',
        status: 'active',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log('✅ Superadmin user created\n');
    } else {
      console.log(`✅ Found superadmin user: ${user.email}\n`);
      console.log('🔐 Hashing new password...');
      const hashedPassword = await hash(superAdminPassword, {
        memoryCost: 12288,
        timeCost: 3,
        parallelism: 1,
        type: 1,
      });

      console.log('🔄 Updating password...');
      await db('users')
        .where('email', superAdminEmail)
        .update({
          password_hash: hashedPassword,
          updated_at: new Date(),
        });

      console.log('✅ Password updated\n');
    }

    // Display credentials
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           SUPERADMIN LOGIN CREDENTIALS                     ║
╚════════════════════════════════════════════════════════════╝

✅ SUPERADMIN ACCOUNT READY!

📧 Email:    ${superAdminEmail}
🔑 Password: ${superAdminPassword}

════════════════════════════════════════════════════════════

🌐 LOGIN:

1. Open browser: http://localhost:3000/login
2. Email: ${superAdminEmail}
3. Password: ${superAdminPassword}
4. Click: Sign In

════════════════════════════════════════════════════════════

⚠️  If login fails:

1. ✓ Backend running? npm run dev (in server dir)
2. ✓ Frontend running? npm run dev (in client dir)
3. ✓ Clear browser cookies (Ctrl+Shift+Delete)
4. ✓ Try in incognito/private mode
5. ✓ Check terminal for error messages

════════════════════════════════════════════════════════════
`);

    console.log('✅ Done!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetPassword();
