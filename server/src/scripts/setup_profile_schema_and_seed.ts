import { Knex } from 'knex';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../common/lib/logger';

/**
 * Ensures missing profile & credential columns exist directly in `organizations` table
 * and seeds Abhishek organization admin (`abhishek@gmail.com` / `abhishek@gmail.com`).
 */
export async function setupProfileSchemaAndSeed(db: Knex): Promise<void> {
  try {
    logger.info('Checking and upgrading database schema for organization-level admin credentials...');

    // 1. Ensure `organizations` table has all admin credential & profile columns
    const hasOrgTable = await db.schema.hasTable('organizations');
    if (hasOrgTable) {
      const orgColumns = [
        'email',
        'password_hash',
        'owner_name',
        'first_name',
        'last_name',
        'phone',
        'avatar_url',
        'bio',
        'designation',
        'website',
        'website_url',
        'address_line1',
        'location',
        'industry',
        'logo_url',
        'subscription_tier',
        'plan_tier',
      ];

      for (const col of orgColumns) {
        const exists = await db.schema.hasColumn('organizations', col);
        if (!exists) {
          logger.info(`Adding missing column '${col}' to 'organizations' table...`);
          await db.schema.alterTable('organizations', (table) => {
            if (col === 'address_line1' || col === 'logo_url' || col === 'avatar_url' || col === 'bio') {
              table.specificType(col, 'LONGTEXT').nullable();
            } else {
              table.string(col, 255).nullable();
            }
          });
        }
      }

      // Ensure existing avatar_url columns in MySQL support LONGTEXT
      try {
        await db.raw('ALTER TABLE organizations MODIFY COLUMN avatar_url LONGTEXT');
      } catch (e) {}
    }

    // 2. Ensure `users` table has profile columns
    const hasUsersTable = await db.schema.hasTable('users');
    if (hasUsersTable) {
      const userColumns = ['first_name', 'last_name', 'phone', 'avatar_url', 'bio', 'designation'];
      for (const col of userColumns) {
        const exists = await db.schema.hasColumn('users', col);
        if (!exists) {
          await db.schema.alterTable('users', (table) => {
            if (col === 'avatar_url' || col === 'bio') {
              table.specificType(col, 'LONGTEXT').nullable();
            } else {
              table.string(col, 255).nullable();
            }
          });
        }
      }

      try {
        await db.raw('ALTER TABLE users MODIFY COLUMN avatar_url LONGTEXT');
      } catch (e) {}
    }

    // 3. Ensure `employee_loans` table status column is VARCHAR(50) for approval workflow
    const hasLoansTable = await db.schema.hasTable('employee_loans');
    if (hasLoansTable) {
      try {
        await db.raw("ALTER TABLE employee_loans MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
      } catch (e) {}
    }

    // 4. Ensure `super_admins` table has profile columns
    const hasSuperAdminTable = await db.schema.hasTable('super_admins');
    if (hasSuperAdminTable) {
      const saColumns = ['first_name', 'last_name', 'phone', 'avatar_url', 'bio'];
      for (const col of saColumns) {
        const exists = await db.schema.hasColumn('super_admins', col);
        if (!exists) {
          await db.schema.alterTable('super_admins', (table) => {
            if (col === 'avatar_url' || col === 'bio') {
              table.text(col).nullable();
            } else {
              table.string(col, 255).nullable();
            }
          });
        }
      }
    }

    // 4. Seed Abhishek Organization Admin in `organizations` table
    logger.info('Seeding / updating Abhishek Organization Admin in organizations table...');

    const abhishekPassHash = await hash('abhishek@gmail.com', {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    let abhishekOrg = await db('organizations')
      .whereRaw('LOWER(email) = ?', ['abhishek@gmail.com'])
      .first();

    if (!abhishekOrg) {
      // Create Organization for Abhishek
      const orgUuid = uuidv4();
      const [insertedOrgId] = await db('organizations').insert({
        uuid: orgUuid,
        name: 'Apponext Technologies',
        slug: 'apponext-tech',
        code: 'ORG-APPONEXT',
        owner_name: 'Abhishek Sharma',
        first_name: 'Abhishek',
        last_name: 'Sharma',
        email: 'abhishek@gmail.com',
        password_hash: abhishekPassHash,
        phone: '+91 98123 45678',
        website: 'https://apponext.com',
        website_url: 'https://apponext.com',
        location: 'Mumbai, Maharashtra, India',
        address_line1: 'Mumbai, Maharashtra, India',
        industry: 'Technology & Enterprise Solutions',
        subscription_tier: 'Enterprise Suite',
        plan_tier: 'enterprise',
        status: 'active',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      logger.info(`Created Organization for Abhishek (ID: ${insertedOrgId})`);
    } else {
      // Update Abhishek Organization
      await db('organizations')
        .where('id', abhishekOrg.id)
        .update({
          owner_name: 'Abhishek Sharma',
          first_name: 'Abhishek',
          last_name: 'Sharma',
          email: 'abhishek@gmail.com',
          password_hash: abhishekPassHash,
          phone: '+91 98123 45678',
          website: 'https://apponext.com',
          website_url: 'https://apponext.com',
          location: 'Mumbai, Maharashtra, India',
          subscription_tier: 'Enterprise Suite',
          status: 'active',
          updated_at: db.fn.now(),
        });
    }

    // 5. Also Seed / Update default passwords for existing orgs (kosquadmin & admin@apponext)
    const kosquPassHash = await hash('kosquadmin@kosqu.com', {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const apponextPassHash = await hash('admin@apponext.com', {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const harshPassHash = await hash('harsh@gmail.com', {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Ensure all organizations have owner credentials stored directly
    await db('organizations')
      .whereRaw('LOWER(email) = ?', ['kosquadmin@kosqu.com'])
      .update({
        owner_name: 'Harsh Thakur',
        first_name: 'Harsh',
        last_name: 'Thakur',
        password_hash: kosquPassHash,
        phone: '+91 98765 43210',
        designation: 'Chief HR & Operations Administrator',
      });

    await db('organizations')
      .whereRaw('LOWER(email) = ?', ['admin@apponext.com'])
      .update({
        owner_name: 'Admin User',
        first_name: 'Admin',
        last_name: 'User',
        password_hash: apponextPassHash,
        phone: '+91 98123 45678',
        designation: 'Organization Administrator',
      });

    await db('organizations')
      .whereRaw('LOWER(email) = ?', ['harsh@gmail.com'])
      .update({
        owner_name: 'Harsh Sharma',
        first_name: 'Harsh',
        last_name: 'Sharma',
        password_hash: harshPassHash,
        phone: '+91 98765 43210',
        designation: 'Organization Administrator',
      });

    // Also populate default password_hash for any org where password_hash is null
    const orgsWithoutPass = await db('organizations').whereNull('password_hash').orWhere('password_hash', '');
    for (const org of orgsWithoutPass) {
      const defaultPass = org.email || 'admin@123';
      const defaultHash = await hash(defaultPass, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
      await db('organizations').where('id', org.id).update({
        password_hash: defaultHash,
        email: org.email || `admin${org.id}@organization.com`,
        first_name: org.first_name || (org.owner_name ? org.owner_name.split(' ')[0] : 'Admin'),
        last_name: org.last_name || (org.owner_name ? org.owner_name.split(' ').slice(1).join(' ') : 'Owner'),
      });
    }

    logger.info('Organization-level admin credentials and schema setup completed successfully.');
  } catch (error) {
    logger.error('Error in setupProfileSchemaAndSeed:', error);
  }
}
