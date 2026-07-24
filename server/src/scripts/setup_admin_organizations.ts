import { initializeKnex } from '../db/knex';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script to create and populate the admin_organizations table,
 * ensuring all client organizations have valid admin credentials & role mappings.
 */
export async function setupAdminOrganizations() {
  const db = initializeKnex();
  console.log('\n======================================================');
  console.log('🔧 STARTING SETUP: admin_organizations & admin users');
  console.log('======================================================\n');

  try {
    // 1. Ensure super_admins table exists
    const hasSuperAdmins = await db.schema.hasTable('super_admins');
    if (!hasSuperAdmins) {
      await db.schema.createTable('super_admins', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('user_id').unsigned().nullable();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('first_name', 100).defaultTo('Super');
        table.string('last_name', 100).defaultTo('Admin');
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
      console.log('✅ Created missing DB table: super_admins');
    }

    // 2. Ensure admin_organizations table exists
    const hasAdminOrgs = await db.schema.hasTable('admin_organizations');
    if (!hasAdminOrgs) {
      await db.schema.createTable('admin_organizations', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('super_admin_id').unsigned().nullable();
        table.bigInteger('user_id').unsigned().nullable();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('admin_role', 50).defaultTo('organization_admin');
        table.text('permissions').nullable();
        table.string('status', 20).defaultTo('active');
        table.bigInteger('assigned_by').unsigned().nullable();
        table.timestamps(true, true);

        table.index(['organization_id']);
        table.index(['user_id']);
        table.index(['super_admin_id']);
      });
      console.log('✅ Created missing DB table: admin_organizations');
    }

    // 3. Process all organizations and ensure admin accounts & link entries exist
    const orgs = await db('organizations').select('*');
    console.log(`📋 Found ${orgs.length} tenant organization(s) in database.\n`);

    for (const org of orgs) {
      const orgId = org.id;
      const orgName = org.name || 'Organization';
      const adminEmail = (org.email || `admin@org${orgId}.com`).trim().toLowerCase();
      const ownerName = org.owner_name || org.ownerName || 'Org Admin';

      const nameParts = ownerName.trim().split(' ');
      const firstName = nameParts[0] || 'Org';
      const lastName = nameParts.slice(1).join(' ') || 'Admin';

      // Default password hash for new/reset admin accounts if missing (Admin@123)
      const defaultPasswordHash = await hash('Admin@123', {
        type: 2, // argon2id
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      // Find or create user account for this organization admin
      let user = await db('users').whereRaw('LOWER(email) = ?', [adminEmail]).first();
      let userId: number;

      if (user) {
        userId = user.id;
        // Make sure user has active status and valid password_hash
        const userHash = user.password_hash || user.passwordHash;
        const updates: any = {
          organization_id: orgId,
          status: 'active',
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date(),
        };
        if (!userHash) {
          updates.password_hash = defaultPasswordHash;
        }
        await db('users').where({ id: userId }).update(updates);
        console.log(`  👤 User account verified for Org [${orgId}] "${orgName}": ${adminEmail} (User ID: ${userId})`);
      } else {
        const userUuid = uuidv4();
        const [insertedId] = await db('users').insert({
          uuid: userUuid,
          organization_id: orgId,
          email: adminEmail,
          password_hash: defaultPasswordHash,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        userId = insertedId;
        console.log(`  ✨ Created new admin user for Org [${orgId}] "${orgName}": ${adminEmail} (User ID: ${userId})`);
      }

      // Ensure organization_admin system role exists for this organization
      let adminRole = await db('roles')
        .where({ organization_id: orgId, code: 'organization_admin' })
        .first();

      if (!adminRole) {
        const roleUuid = uuidv4();
        const [roleId] = await db('roles').insert({
          uuid: roleUuid,
          organization_id: orgId,
          name: 'Organization Admin',
          code: 'organization_admin',
          description: 'Full administrative access for organization',
          is_system: true,
          is_platform_role: false,
          is_default: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
        adminRole = { id: roleId };
        console.log(`  🛡️ Created organization_admin role for Org [${orgId}] (Role ID: ${roleId})`);
      }

      // Ensure user_roles mapping exists
      const userRoleExists = await db('user_roles')
        .where({ user_id: userId, role_id: adminRole.id })
        .first();

      if (!userRoleExists) {
        await db('user_roles').insert({
          organization_id: orgId,
          user_id: userId,
          role_id: adminRole.id,
          assigned_by: userId,
          assigned_at: new Date(),
        });
        console.log(`  🔗 Assigned organization_admin role to User ID ${userId}`);
      }

      // Ensure admin_organizations table row exists
      const adminOrgExists = await db('admin_organizations')
        .where({ organization_id: orgId, user_id: userId })
        .first();

      if (!adminOrgExists) {
        await db('admin_organizations').insert({
          uuid: uuidv4(),
          user_id: userId,
          organization_id: orgId,
          admin_role: 'organization_admin',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  🏢 Connected User ID ${userId} to Org ID ${orgId} in admin_organizations table`);
      } else {
        console.log(`  ✅ admin_organizations mapping already exists for User ID ${userId} & Org ID ${orgId}`);
      }
    }

    console.log('\n======================================================');
    console.log('🎉 SETUP & REPAIR COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('❌ Error setting up admin_organizations:', err?.message || err);
  }
}

// Execute script
setupAdminOrganizations()
  .then(() => {
    console.log('Script execution finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script execution error:', err);
    process.exit(1);
  });
