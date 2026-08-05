import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex } from '../knex';

/**
 * Seed Super Admin data into super_admins & admin_organizations tables.
 *
 * Behaviour:
 *  - If super_admins table does NOT exist → creates it first, then inserts.
 *  - If super_admins table exists AND seed row already exists → skips insert (idempotent).
 *  - If super_admins table exists but seed row is missing → inserts the row.
 *
 * Run with:  npm run seed:superadmin-tables
 */
async function seedSuperAdminTables() {
  console.log('\n======================================================');
  console.log('🔧 MIGRATE & SEED: super_admins + admin_organizations');
  console.log('======================================================\n');

  try {
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    // ── 1. Ensure super_admins table exists ────────────────────────
    const hasSuperAdmins = await db.schema.hasTable('super_admins');
    if (!hasSuperAdmins) {
      await db.schema.createTable('super_admins', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('user_id').unsigned().nullable();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('first_name', 100).notNullable().defaultTo('Super');
        table.string('last_name', 100).notNullable().defaultTo('Admin');
        table.string('phone', 20).nullable();
        table.text('avatar_url').nullable();
        table.string('access_level', 50).defaultTo('superadmin');
        table.string('status', 20).defaultTo('active');
        table.timestamp('last_login_at').nullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        table.index(['email']);
        table.index(['status']);
      });
      console.log('✅ Created table: super_admins');
    } else {
      console.log('ℹ️  Table super_admins already exists — skipping creation');
    }

    // ── 2. Ensure admin_organizations table exists ─────────────────
    const hasAdminOrgs = await db.schema.hasTable('admin_organizations');
    if (!hasAdminOrgs) {
      await db.schema.createTable('admin_organizations', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('super_admin_id').unsigned().nullable();
        table.bigInteger('user_id').unsigned().nullable();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('admin_role', 50).defaultTo('organization_admin');
        table.json('permissions').nullable();
        table.string('status', 20).defaultTo('active');
        table.bigInteger('assigned_by').unsigned().nullable();
        table.timestamps(true, true);

        table.index(['super_admin_id']);
        table.index(['organization_id']);
        table.index(['user_id']);
      });
      console.log('✅ Created table: admin_organizations');
    } else {
      console.log(
        'ℹ️  Table admin_organizations already exists — skipping creation'
      );
    }

    // ── 3. Seed Super Admin credentials ────────────────────────────
    const superAdminEmail = 'superadmin@apponext.com';
    const superAdminPassword = 'SuperAdmin@2026!Secure';

    // Hash with Argon2 (same config used across the project)
    console.log('\n🔐 Hashing password with Argon2...');
    const passwordHash = await hash(superAdminPassword, {
      memoryCost: 12288,
      timeCost: 3,
      parallelism: 1,
      type: 1, // Argon2i
    });
    console.log('✅ Password hashed\n');

    // Resolve optional user_id from users table
    const existingUser = await db('users')
      .whereRaw('LOWER(email) = ?', [superAdminEmail.toLowerCase()])
      .first();
    const userId = existingUser?.id ?? null;

    // Check if super_admin row already exists
    const existingSA = await db('super_admins')
      .where('email', superAdminEmail)
      .first();

    let superAdminId: number;

    if (!existingSA) {
      const [insertedId] = await db('super_admins').insert({
        uuid: uuidv4(),
        user_id: userId,
        email: superAdminEmail,
        password_hash: passwordHash,
        first_name: 'Super',
        last_name: 'Admin',
        access_level: 'owner',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });
      superAdminId = insertedId;
      console.log(
        `✅ Inserted Super Admin into super_admins (ID: ${superAdminId})`
      );
    } else {
      superAdminId = existingSA.id;
      // Update password hash & user_id linkage in case they changed
      await db('super_admins').where({ id: superAdminId }).update({
        password_hash: passwordHash,
        user_id: userId,
        updated_at: new Date(),
      });
      console.log(
        `ℹ️  Super Admin already exists (ID: ${superAdminId}) — updated credentials`
      );
    }

    // ── 4. Seed admin_organizations linkage ─────────────────────────
    const org = await db('organizations').orderBy('id', 'asc').first();
    if (!org) {
      console.log(
        '⚠️  No organizations found — skipping admin_organizations linkage'
      );
    } else {
      const orgId = org.id;

      const existingLink = await db('admin_organizations')
        .where({ super_admin_id: superAdminId, organization_id: orgId })
        .first();

      if (!existingLink) {
        await db('admin_organizations').insert({
          uuid: uuidv4(),
          super_admin_id: superAdminId,
          user_id: userId,
          organization_id: orgId,
          admin_role: 'super_admin',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(
          `✅ Linked Super Admin (ID: ${superAdminId}) → Organization (ID: ${orgId})`
        );
      } else {
        console.log(
          `ℹ️  admin_organizations link already exists (Super Admin ${superAdminId} → Org ${orgId})`
        );
      }
    }

    // ── 5. Ensure users table also has the superadmin row ──────────
    if (!existingUser) {
      const organizationId = org?.id ?? null;
      const userUuid = uuidv4();
      const now = new Date();

      await db('users').insert({
        uuid: userUuid,
        email: superAdminEmail,
        first_name: 'Super',
        last_name: 'Admin',
        password_hash: passwordHash,
        organization_id: organizationId,
        role: 'superadmin',
        status: 'active',
        email_verified: true,
        created_at: now,
        updated_at: now,
      });
      console.log(`✅ Created superadmin user in users table`);

      // Re-link user_id in super_admins
      const newUser = await db('users')
        .where('email', superAdminEmail)
        .first();
      if (newUser) {
        await db('super_admins')
          .where({ id: superAdminId })
          .update({ user_id: newUser.id, updated_at: new Date() });
        console.log(
          `✅ Linked super_admins.user_id → users.id (${newUser.id})`
        );
      }
    }

    // ── Summary ────────────────────────────────────────────────────
    console.log('\n======================================================');
    console.log('🎉 MIGRATION & SEED COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`
📧 Email:    ${superAdminEmail}
🔑 Password: ${superAdminPassword}
🏢 Org ID:   ${org?.id ?? 'N/A'}
👤 SA ID:    ${superAdminId}
`);

    await db.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err?.message || err);
    console.error(err);
    process.exit(1);
  }
}

// Run immediately
seedSuperAdminTables();
