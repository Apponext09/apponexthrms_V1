import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { hash } from 'argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runDatabaseSeed() {
  console.log('\n======================================================');
  console.log('🌱 STARTING MASTER DATABASE SCHEMA & SEED EXECUTION');
  console.log('======================================================\n');

  const dbName = process.env.DB_NAME || 'apponexthrms';

  // Pre-create database if it doesn't exist
  const setupDb = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4',
    },
  });

  try {
    console.log(`📦 Checking/Creating database: ${dbName}...`);
    await setupDb.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database "${dbName}" is ready.`);
  } catch (err) {
    console.warn(`⚠️ Pre-creating database warning (will attempt connection anyway): ${err.message}`);
  } finally {
    await setupDb.destroy();
  }

  const db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      charset: 'utf8mb4',
    },
  });

  try {
    // ----------------------------------------------------------------------
    // 1. ORGANIZATIONS TABLE SCHEMA & SEED
    // ----------------------------------------------------------------------
    const hasOrgTable = await db.schema.hasTable('organizations');
    if (!hasOrgTable) {
      console.log('📦 Creating table: organizations...');
      await db.schema.createTable('organizations', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.string('name', 255).notNullable();
        table.string('email', 255).nullable();
        table.string('password_hash', 255).nullable();
        table.string('owner_name', 255).nullable();
        table.string('first_name', 100).nullable();
        table.string('last_name', 100).nullable();
        table.string('phone', 20).nullable();
        table.specificType('avatar_url', 'LONGTEXT').nullable();
        table.specificType('bio', 'LONGTEXT').nullable();
        table.string('designation', 255).nullable();
        table.string('website', 255).nullable();
        table.string('location', 255).nullable();
        table.string('industry', 100).nullable();
        table.specificType('logo_url', 'LONGTEXT').nullable();
        table.string('subscription_tier', 50).defaultTo('enterprise');
        table.string('status', 20).defaultTo('active');
        table.timestamps(true, true);
      });
      console.log('✅ Table organizations created successfully.');
    } else {
      const orgCols = [
        'email', 'password_hash', 'owner_name', 'first_name', 'last_name',
        'phone', 'avatar_url', 'bio', 'designation', 'website', 'location',
        'industry', 'logo_url', 'subscription_tier', 'status'
      ];
      for (const col of orgCols) {
        const exists = await db.schema.hasColumn('organizations', col);
        if (!exists) {
          await db.schema.alterTable('organizations', (table) => {
            if (col === 'avatar_url' || col === 'bio' || col === 'logo_url') {
              table.specificType(col, 'LONGTEXT').nullable();
            } else {
              table.string(col, 255).nullable();
            }
          });
          console.log(`🔧 Added missing column '${col}' to organizations table.`);
        }
      }
    }

    // Seed default Organization
    let mainOrg = await db('organizations').first();
    const abhishekPassHash = await hash('abhishek@gmail.com', { type: 2 });
    const adminPassHash = await hash('Admin@123', { type: 2 });

    if (!mainOrg) {
      console.log('🌱 Seeding main organization (Apponext Systems)...');
      const [insertedId] = await db('organizations').insert({
        uuid: uuidv4(),
        name: 'Apponext Systems Pvt Ltd',
        email: 'abhishek@gmail.com',
        password_hash: abhishekPassHash,
        owner_name: 'Abhishek Sharma',
        first_name: 'Abhishek',
        last_name: 'Sharma',
        phone: '+91 9876543210',
        designation: 'CEO & Founder',
        location: 'Mumbai HQ, India',
        industry: 'Information Technology',
        subscription_tier: 'enterprise',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mainOrg = await db('organizations').where('id', insertedId).first();
    } else {
      await db('organizations').where('id', mainOrg.id).update({
        email: mainOrg.email || 'abhishek@gmail.com',
        password_hash: mainOrg.password_hash || abhishekPassHash,
        owner_name: mainOrg.owner_name || 'Abhishek Sharma',
        updated_at: new Date(),
      });
    }

    const orgId = mainOrg.id;
    console.log(`✅ Main Organization ready (ID: ${orgId}, Name: ${mainOrg.name})`);

    // ----------------------------------------------------------------------
    // 2. SUPER_ADMINS TABLE SCHEMA & SEED
    // ----------------------------------------------------------------------
    const hasSuperAdminTable = await db.schema.hasTable('super_admins');
    if (!hasSuperAdminTable) {
      console.log('📦 Creating table: super_admins...');
      await db.schema.createTable('super_admins', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('user_id').unsigned().nullable();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('first_name', 100).defaultTo('Super');
        table.string('last_name', 100).defaultTo('Admin');
        table.string('phone', 20).nullable();
        table.specificType('avatar_url', 'LONGTEXT').nullable();
        table.string('access_level', 50).defaultTo('superadmin');
        table.string('status', 20).defaultTo('active');
        table.timestamps(true, true);
      });
      console.log('✅ Table super_admins created successfully.');
    }

    const superAdminPassHash = await hash('SuperAdmin@123', { type: 2 });
    let superAdmin = await db('super_admins').where('email', 'superadmin@apponext.com').first();
    if (!superAdmin) {
      console.log('🌱 Seeding SuperAdmin (superadmin@apponext.com)...');
      const [saId] = await db('super_admins').insert({
        uuid: uuidv4(),
        email: 'superadmin@apponext.com',
        password_hash: superAdminPassHash,
        first_name: 'Super',
        last_name: 'Admin',
        phone: '+91 9999999999',
        access_level: 'superadmin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });
      superAdmin = await db('super_admins').where('id', saId).first();
    }
    console.log(`✅ SuperAdmin account ready (ID: ${superAdmin.id})`);

    // ----------------------------------------------------------------------
    // 3. USERS TABLE SCHEMA & SEED
    // ----------------------------------------------------------------------
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log('📦 Creating table: users...');
      await db.schema.createTable('users', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('first_name', 100).notNullable();
        table.string('last_name', 100).notNullable();
        table.string('role', 50).defaultTo('employee');
        table.string('department', 100).nullable();
        table.string('position', 100).nullable();
        table.string('phone', 20).nullable();
        table.specificType('avatar_url', 'LONGTEXT').nullable();
        table.string('status', 20).defaultTo('active');
        table.timestamps(true, true);
      });
      console.log('✅ Table users created successfully.');
    } else {
      const userCols = ['organization_id', 'first_name', 'last_name', 'phone', 'avatar_url', 'role', 'department', 'position', 'status'];
      for (const col of userCols) {
        const exists = await db.schema.hasColumn('users', col);
        if (!exists) {
          await db.schema.alterTable('users', (table) => {
            if (col === 'avatar_url') {
              table.specificType(col, 'LONGTEXT').nullable();
            } else if (col === 'organization_id') {
              table.bigInteger(col).unsigned().nullable();
            } else {
              table.string(col, 255).nullable();
            }
          });
        }
      }
    }

    // Seed/Update Admin and Employee users
    const seedUsers = [
      {
        email: 'abhishek@gmail.com',
        password_hash: abhishekPassHash,
        first_name: 'Abhishek',
        last_name: 'Sharma',
        role: 'organization_admin',
        department: 'Management',
        position: 'Managing Director',
        phone: '+91 9876543210',
      },
      {
        email: 'admin@apponext.com',
        password_hash: adminPassHash,
        first_name: 'System',
        last_name: 'Admin',
        role: 'organization_admin',
        department: 'HR & Operations',
        position: 'HR Administrator',
        phone: '+91 9876543211',
      },
      {
        email: 'rahul.desai@apponext.com',
        password_hash: adminPassHash,
        first_name: 'Rahul',
        last_name: 'Desai',
        role: 'employee',
        department: 'Product',
        position: 'Product Manager',
        phone: '+91 9876543212',
      },
      {
        email: 'kavya.reddy@apponext.com',
        password_hash: adminPassHash,
        first_name: 'Kavya',
        last_name: 'Reddy',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Engineer II',
        phone: '+91 9876543213',
      },
      {
        email: 'arjun.mehta@apponext.com',
        password_hash: adminPassHash,
        first_name: 'Arjun',
        last_name: 'Mehta',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Engineer',
        phone: '+91 9876543214',
      },
      {
        email: 'priya.sharma@apponext.com',
        password_hash: adminPassHash,
        first_name: 'Priya',
        last_name: 'Sharma',
        role: 'employee',
        department: 'Product',
        position: 'Associate PM',
        phone: '+91 9876543215',
      },
      {
        email: 'vikram.singh@apponext.com',
        password_hash: adminPassHash,
        first_name: 'Vikram',
        last_name: 'Singh',
        role: 'employee',
        department: 'Finance',
        position: 'Senior Accountant',
        phone: '+91 9876543216',
      },
    ];

    for (const u of seedUsers) {
      const existing = await db('users').where('email', u.email).first();
      if (!existing) {
        await db('users').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          email: u.email,
          password_hash: u.password_hash,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          department: u.department,
          position: u.position,
          phone: u.phone,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`👤 Created user: ${u.first_name} ${u.last_name} (${u.email})`);
      } else {
        await db('users').where('id', existing.id).update({
          organization_id: orgId,
          role: u.role,
          department: u.department,
          position: u.position,
          status: 'active',
          updated_at: new Date(),
        });
      }
    }
    console.log('✅ Users table populated and mapped.');

    // ----------------------------------------------------------------------
    // 4. ADMIN_ORGANIZATIONS TABLE SCHEMA & SEED
    // ----------------------------------------------------------------------
    const hasAdminOrgs = await db.schema.hasTable('admin_organizations');
    if (!hasAdminOrgs) {
      console.log('📦 Creating table: admin_organizations...');
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
      });
      console.log('✅ Table admin_organizations created successfully.');
    }

    const adminUsers = await db('users').whereIn('email', ['abhishek@gmail.com', 'admin@apponext.com']).select('*');
    for (const au of adminUsers) {
      const existingMapping = await db('admin_organizations')
        .where('user_id', au.id)
        .where('organization_id', orgId)
        .first();

      if (!existingMapping) {
        await db('admin_organizations').insert({
          uuid: uuidv4(),
          super_admin_id: superAdmin.id,
          user_id: au.id,
          organization_id: orgId,
          admin_role: 'organization_admin',
          permissions: JSON.stringify(['all']),
          status: 'active',
          assigned_by: superAdmin.id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`🔗 Linked user ${au.email} to organization in admin_organizations.`);
      }
    }
    console.log('✅ admin_organizations table seeded.');

    // ----------------------------------------------------------------------
    // 5. DEPARTMENT_MANAGERS TABLE
    // ----------------------------------------------------------------------
    const hasDeptMgrs = await db.schema.hasTable('department_managers');
    if (!hasDeptMgrs) {
      console.log('📦 Creating table: department_managers...');
      await db.schema.createTable('department_managers', (table) => {
        table.bigIncrements('id').primary();
        table.string('department_id', 100).notNullable();
        table.bigInteger('manager_id').unsigned().notNullable();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.timestamps(true, true);
      });
      console.log('✅ Table department_managers created.');
    }

    // ----------------------------------------------------------------------
    // 6. ATTENDANCE_RECORDS TABLE & SEED
    // ----------------------------------------------------------------------
    const hasAttendanceRecords = await db.schema.hasTable('attendance_records');
    if (!hasAttendanceRecords) {
      console.log('📦 Creating table: attendance_records...');
      await db.schema.createTable('attendance_records', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.string('check_in_date', 10).notNullable();
        table.string('check_in_time').nullable();
        table.string('check_out_time').nullable();
        table.integer('duration_minutes').nullable();
        table.integer('break_time_minutes').defaultTo(0);
        table.integer('work_duration_minutes').nullable();
        table.string('status', 20).defaultTo('present');
        table.integer('check_in_location_id').nullable();
        table.integer('check_out_location_id').nullable();
        table.string('check_in_method', 50).nullable();
        table.string('check_out_method', 50).nullable();
        table.boolean('is_late').defaultTo(false);
        table.boolean('is_early_departure').defaultTo(false);
        table.boolean('is_regularized').defaultTo(false);
        table.integer('regularization_request_id').nullable();
        table.integer('overtime_minutes').defaultTo(0);
        table.text('notes').nullable();
        table.bigInteger('created_by').nullable();
        table.bigInteger('updated_by').nullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table attendance_records created.');
    }

    // ----------------------------------------------------------------------
    // 7. EMPLOYEE LIFECYCLE TABLES (ONBOARDING, TRANSFERS, RESIGNATIONS, EXIT_CLEARANCE, FINAL_SETTLEMENT)
    // ----------------------------------------------------------------------
    const hasOnboarding = await db.schema.hasTable('onboarding');
    if (!hasOnboarding) {
      console.log('📦 Creating table: onboarding...');
      await db.schema.createTable('onboarding', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.string('status', 50).defaultTo('initiated');
        table.date('start_date').notNullable();
        table.date('completion_date').nullable();
        table.json('training_sessions').nullable();
        table.json('equipment_assigned').nullable();
        table.boolean('system_access_granted').defaultTo(false);
        table.bigInteger('buddy_id').unsigned().nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Table onboarding created.');
    }

    const hasTransfers = await db.schema.hasTable('transfers');
    if (!hasTransfers) {
      console.log('📦 Creating table: transfers...');
      await db.schema.createTable('transfers', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.string('from_department', 100).nullable();
        table.string('to_department', 100).nullable();
        table.string('from_branch', 100).nullable();
        table.string('to_branch', 100).nullable();
        table.bigInteger('from_reporting_manager_id').unsigned().nullable();
        table.bigInteger('to_reporting_manager_id').unsigned().nullable();
        table.string('transfer_type', 50).defaultTo('lateral');
        table.date('transfer_date').notNullable();
        table.string('status', 50).defaultTo('pending');
        table.string('approval_status', 50).defaultTo('pending');
        table.text('reason').nullable();
        table.string('approved_by', 255).nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Table transfers created.');
    }

    const hasResignations = await db.schema.hasTable('resignations');
    if (!hasResignations) {
      console.log('📦 Creating table: resignations...');
      await db.schema.createTable('resignations', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.date('resignation_date').notNullable();
        table.date('last_working_day').notNullable();
        table.integer('notice_period_days').defaultTo(30);
        table.string('status', 50).defaultTo('submitted');
        table.text('reason_for_resignation').nullable();
        table.string('reason_category', 100).defaultTo('other');
        table.string('accepted_by', 255).nullable();
        table.datetime('accepted_at').nullable();
        table.boolean('exit_interview_conducted').defaultTo(false);
        table.date('exit_interview_date').nullable();
        table.text('exit_feedback').nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Table resignations created.');
    }

    const hasExitClearance = await db.schema.hasTable('exit_clearance');
    if (!hasExitClearance) {
      console.log('📦 Creating table: exit_clearance...');
      await db.schema.createTable('exit_clearance', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.bigInteger('resignation_id').unsigned().nullable();
        table.string('status', 50).defaultTo('pending');
        table.date('clearance_date').nullable();
        table.boolean('finance_cleared').defaultTo(false);
        table.boolean('it_cleared').defaultTo(false);
        table.boolean('operations_cleared').defaultTo(false);
        table.boolean('security_cleared').defaultTo(false);
        table.boolean('equipment_returned').defaultTo(false);
        table.boolean('documents_returned').defaultTo(false);
        table.boolean('access_revoked').defaultTo(false);
        table.text('remarks').nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Table exit_clearance created.');
    }

    const hasFinalSettlement = await db.schema.hasTable('final_settlement');
    if (!hasFinalSettlement) {
      console.log('📦 Creating table: final_settlement...');
      await db.schema.createTable('final_settlement', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.bigInteger('resignation_id').unsigned().nullable();
        table.date('settlement_date').notNullable();
        table.string('status', 50).defaultTo('pending');
        table.decimal('final_salary', 12, 2).nullable();
        table.decimal('gratuity', 12, 2).nullable();
        table.decimal('leave_encashment', 12, 2).nullable();
        table.decimal('bonus', 12, 2).nullable();
        table.decimal('other_benefits', 12, 2).nullable();
        table.decimal('deductions', 12, 2).nullable();
        table.decimal('net_amount', 12, 2).nullable();
        table.string('payment_mode', 50).nullable();
        table.date('payment_date').nullable();
        table.string('transaction_id', 100).nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Table final_settlement created.');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL DATABASE TABLES & SEEDS COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ DB Seed Error:', error);
  } finally {
    await db.destroy();
  }
}

runDatabaseSeed();
