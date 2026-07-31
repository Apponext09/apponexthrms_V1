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

    // 3. Ensure `attendance_locations` has all required columns
    const hasAttLocTable = await db.schema.hasTable('attendance_locations');
    if (hasAttLocTable) {
      const columnsToCheck = [
        { name: 'uuid', type: 'string', length: 36, default: null },
        { name: 'latitude', type: 'decimal', precision: 10, scale: 8, default: null },
        { name: 'longitude', type: 'decimal', precision: 11, scale: 8, default: null },
        { name: 'timezone', type: 'string', length: 50, default: 'Asia/Kolkata' },
        { name: 'is_primary', type: 'boolean', default: false },
        { name: 'created_by', type: 'integer', default: null },
        { name: 'updated_by', type: 'integer', default: null },
      ];

      for (const col of columnsToCheck) {
        const hasCol = await db.schema.hasColumn('attendance_locations', col.name);
        if (!hasCol) {
          logger.info(`Adding missing column '${col.name}' to 'attendance_locations' table...`);
          await db.schema.alterTable('attendance_locations', (table) => {
            if (col.type === 'string') {
              const colRef = table.string(col.name, col.length as number);
              if (col.name === 'uuid') {
                // Cannot add unique constraint easily on existing data without populating it first,
                // but let's just make it nullable to avoid breaking.
                colRef.nullable();
              } else if (col.default !== null) {
                colRef.defaultTo(col.default);
              }
            } else if (col.type === 'decimal') {
              table.decimal(col.name, col.precision as number, col.scale as number).nullable();
            } else if (col.type === 'boolean') {
              table.boolean(col.name).defaultTo(col.default);
            } else if (col.type === 'integer') {
              table.integer(col.name).unsigned().nullable();
            }
          });
        }
      }
    }

    // 4. Ensure `employee_loans` table status column is VARCHAR(50) for approval workflow
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

    // ── Live Tracking Tables ──────────────────────────────────────────────────
    // Auto-create tables for the Live Tracking module if they don't exist
    const hasLive = await db.schema.hasTable('employee_live_locations');
    if (!hasLive) {
      logger.info('Creating employee_live_locations table...');
      await db.schema.createTable('employee_live_locations', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().defaultTo(db.raw('(UUID())'));
        table.integer('organization_id').unsigned().notNullable();
        table.integer('employee_id').unsigned().notNullable();
        table.decimal('latitude', 10, 7).nullable();
        table.decimal('longitude', 10, 7).nullable();
        table.decimal('heading', 6, 2).nullable();
        table.decimal('speed', 8, 2).nullable();
        table.decimal('accuracy', 8, 2).nullable();
        table.string('address', 500).nullable();
        table.enum('location_status', ['ON', 'OFF']).notNullable().defaultTo('OFF');
        table.enum('connection_status', ['ONLINE', 'OFFLINE']).notNullable().defaultTo('OFFLINE');
        table.datetime('last_ping_at').nullable();
        table.datetime('created_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP'));
        table.datetime('updated_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        table.index(['organization_id', 'employee_id'], 'idx_live_loc_org_emp');
        table.unique(['organization_id', 'employee_id'], 'uniq_live_loc_org_emp');
      });
      logger.info('employee_live_locations table created.');
    }

    const hasHistory = await db.schema.hasTable('employee_location_history');
    if (!hasHistory) {
      logger.info('Creating employee_location_history table...');
      await db.schema.createTable('employee_location_history', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().defaultTo(db.raw('(UUID())'));
        table.integer('organization_id').unsigned().notNullable();
        table.integer('employee_id').unsigned().notNullable();
        table.decimal('latitude', 10, 7).notNullable();
        table.decimal('longitude', 10, 7).notNullable();
        table.decimal('accuracy', 8, 2).nullable();
        table.decimal('speed', 8, 2).nullable();
        table.datetime('recorded_at').notNullable();
        table.datetime('created_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP'));
        table.index(['organization_id', 'employee_id', 'recorded_at'], 'idx_loc_hist_emp_time');
      });
      logger.info('employee_location_history table created.');
    }

    // ── Comp-Off Management Tables ────────────────────────────────────────────
    const hasCompOffBalances = await db.schema.hasTable('comp_off_balances');
    if (!hasCompOffBalances) {
      logger.info('Creating comp_off_balances table...');
      await db.schema.createTable('comp_off_balances', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().defaultTo(db.raw('(UUID())'));
        table.integer('organization_id').unsigned().notNullable();
        table.integer('employee_id').unsigned().notNullable();
        table.date('comp_off_earned_date').notNullable();
        table.decimal('comp_off_earned_hours', 5, 2).notNullable();
        table.date('comp_off_expires_at').nullable();
        table.date('comp_off_used_date').nullable();
        table.decimal('comp_off_used_hours', 5, 2).nullable();
        table.string('status', 50).defaultTo('available'); // available, used, expired
        table.string('reason', 500).nullable();
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP'));
        table.datetime('updated_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        
        table.index(['organization_id', 'employee_id']);
      });
      logger.info('comp_off_balances table created.');
    }

    const hasCompOffRequests = await db.schema.hasTable('comp_off_requests');
    if (!hasCompOffRequests) {
      logger.info('Creating comp_off_requests table...');
      await db.schema.createTable('comp_off_requests', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().defaultTo(db.raw('(UUID())'));
        table.integer('organization_id').unsigned().notNullable();
        table.integer('employee_id').unsigned().notNullable();
        table.integer('comp_off_id').unsigned().notNullable();
        table.date('request_date').notNullable();
        table.text('reason').nullable();
        table.integer('workflow_instance_id').unsigned().nullable();
        table.string('status', 50).defaultTo('pending'); // pending, approved, rejected
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP'));
        table.datetime('updated_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        
        table.index(['organization_id', 'employee_id']);
        table.index(['comp_off_id']);
      });
      logger.info('comp_off_requests table created.');
    }

    // ── Inject Mock Data for Comp-Off Management ──────────────────────────────
    if (!hasCompOffBalances) {
      logger.info('Injecting dummy Comp-Off credits for employees...');
      const abhishekOrg = await db('organizations').whereRaw('LOWER(email) = ?', ['abhishek@gmail.com']).first();
      
      if (abhishekOrg) {
        const orgId = abhishekOrg.id || abhishekOrg.Id;
        const employees = await db('employees').select('id').where('organization_id', orgId).limit(5);
        
        if (employees && employees.length > 0) {
          const mockBalances = [];
          for (const emp of employees) {
            const empId = emp.id || emp.Id;
            // 1 available, 1 used
            mockBalances.push({
              organization_id: orgId,
              employee_id: empId,
              comp_off_earned_date: db.raw('DATE_SUB(CURDATE(), INTERVAL 2 DAY)'),
              comp_off_earned_hours: 8.0,
              comp_off_expires_at: db.raw('DATE_ADD(CURDATE(), INTERVAL 30 DAY)'),
              status: 'available',
              reason: 'Worked on Public Holiday',
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
            mockBalances.push({
              organization_id: orgId,
              employee_id: empId,
              comp_off_earned_date: db.raw('DATE_SUB(CURDATE(), INTERVAL 15 DAY)'),
              comp_off_earned_hours: 4.0,
              comp_off_expires_at: db.raw('DATE_ADD(CURDATE(), INTERVAL 15 DAY)'),
              comp_off_used_date: db.raw('DATE_SUB(CURDATE(), INTERVAL 5 DAY)'),
              comp_off_used_hours: 4.0,
              status: 'used',
              reason: 'Weekend Overtime',
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
          }
          await db('comp_off_balances').insert(mockBalances);
          logger.info('Mock Comp-Off data injected successfully!');
        }
      }
    }

    // ── Inject Mock Data for Approvals Dashboard ──────────────────────────────
    const hasApprovalsTable = await db.schema.hasTable('workflow_approvals');
    if (hasApprovalsTable) {
      const approvedCount = await db('workflow_approvals').where('status', 'Approved').count('* as count').first();
      
      // If there are no approved records, it means we only have the 'Pending' mock data. Let's inject realistic data.
      if (!approvedCount || Number(approvedCount.count) === 0) {
        logger.info('Injecting mock Approved, Rejected, and Escalated records for dashboard visualization...');
        const abhishekOrg = await db('organizations').whereRaw('LOWER(email) = ?', ['abhishek@gmail.com']).first();
        
        if (abhishekOrg) {
          const orgId = abhishekOrg.id || abhishekOrg.Id;
          const employees = await db('employees').select('id', 'first_name', 'last_name').limit(3);
          
          if (employees && employees.length > 0) {
            const e1 = employees[0];
            const e2 = employees[1 % employees.length];
            const e3 = employees[2 % employees.length];

            const name1 = `${e1.first_name || e1.firstName} ${e1.last_name || e1.lastName}`;
            const name2 = `${e2.first_name || e2.firstName} ${e2.last_name || e2.lastName}`;
            const name3 = `${e3.first_name || e3.firstName} ${e3.last_name || e3.lastName}`;

            await db('workflow_approvals').insert([
              {
                organization_id: orgId,
                module_type: 'Leave',
                reference_id: 991,
                applicant_id: e1.id || e1.Id,
                approver_role: 'Manager',
                status: 'Approved',
                details: JSON.stringify({ name: name1, department: 'Engineering', type: 'Leave', time: '1 day ago', role: 'Employee' }),
                created_at: db.fn.now(),
                updated_at: db.fn.now()
              },
              {
                organization_id: orgId,
                module_type: 'Asset',
                reference_id: 992,
                applicant_id: e2.id || e2.Id,
                approver_role: 'HR',
                status: 'Rejected',
                details: JSON.stringify({ name: name2, department: 'Marketing', type: 'Asset', time: '2 days ago', role: 'Employee' }),
                created_at: db.fn.now(),
                updated_at: db.fn.now()
              },
              {
                organization_id: orgId,
                module_type: 'Loan',
                reference_id: 993,
                applicant_id: e3.id || e3.Id,
                approver_role: 'Admin',
                status: 'Escalated',
                details: JSON.stringify({ name: name3, department: 'Sales', type: 'Loan', time: '3 days ago', role: 'Employee' }),
                created_at: db.fn.now(),
                updated_at: db.fn.now()
              }
            ]);
            logger.info('Mock Approved/Rejected/Escalated data injected successfully!');
          }
        }
      }
    }

  } catch (error) {
    logger.error('Error in setupProfileSchemaAndSeed:', error);
  }
}
