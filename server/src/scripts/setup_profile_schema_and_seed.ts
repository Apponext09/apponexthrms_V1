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

    // Diagnose existing tables
    try {
      const [tables] = await db.raw('SHOW TABLES') as any;
      const tableNames = tables.map((t: any) => Object.values(t)[0]);
      logger.info(`Existing tables in database (${tableNames.length}): ${tableNames.join(', ')}`);
    } catch (err: any) {
      logger.error('Error diagnosing database tables:', err.message);
    }

    // Run migrations programmatically
    try {
      const path = await import('path');
      const migrationDir = path.resolve(process.cwd(), '../database/migrations');
      logger.info(`Running Knex migrations programmatically from: ${migrationDir}`);
      const [batchNo, log] = await db.migrate.latest({
        directory: migrationDir,
        loadExtensions: ['.ts', '.js'],
      });
      if (log.length > 0) {
        logger.info(`Batch ${batchNo} run: ${log.join(', ')}`);
      } else {
        logger.info('No new migrations to run.');
      }
    } catch (migError: any) {
      logger.error('Error running programmatic migrations:', migError.message);
    }

    // ──────── MASTER RECRUITMENT & PORTAL SCHEMA ALIGNMENT ────────
    try {
      // 1. candidates table repair
      if (await db.schema.hasTable('candidates')) {
        const candidateCols = [
          { name: 'signature_url', type: (t: any) => t.string('signature_url', 500).nullable() },
          { name: 'resume_url', type: (t: any) => t.string('resume_url', 500).nullable() },
          { name: 'address_line1', type: (t: any) => t.string('address_line1', 500).nullable() },
          { name: 'address_line2', type: (t: any) => t.string('address_line2', 500).nullable() },
          { name: 'country', type: (t: any) => t.string('country', 100).nullable() },
          { name: 'zipcode', type: (t: any) => t.string('zipcode', 20).nullable() },
          { name: 'state', type: (t: any) => t.string('state', 100).nullable() },
          { name: 'city', type: (t: any) => t.string('city', 100).nullable() },
          { name: 'skills', type: (t: any) => t.text('skills').nullable() },
          { name: 'comments', type: (t: any) => t.text('comments').nullable() },
          { name: 'current_company', type: (t: any) => t.string('current_company', 255).nullable() },
          { name: 'qualification', type: (t: any) => t.string('qualification', 255).nullable() },
          { name: 'university', type: (t: any) => t.string('university', 255).nullable() },
          { name: 'years_of_experience', type: (t: any) => t.decimal('years_of_experience', 4, 1).nullable() },
          { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
          { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        ];
        for (const col of candidateCols) {
          if (!(await db.schema.hasColumn('candidates', col.name))) {
            await db.schema.table('candidates', col.type);
            logger.info(`Added missing column ${col.name} to candidates table`);
          }
        }
      }

      // 2. applications table repair
      if (await db.schema.hasTable('applications')) {
        const appCols = [
          { name: 'mrf_request_id', type: (t: any) => t.bigInteger('mrf_request_id').unsigned().nullable() },
          { name: 'applied_from_source', type: (t: any) => t.string('applied_from_source', 100).nullable() },
          { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
          { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        ];
        for (const col of appCols) {
          if (!(await db.schema.hasColumn('applications', col.name))) {
            await db.schema.table('applications', col.type);
            logger.info(`Added missing column ${col.name} to applications table`);
          }
        }
      }

      // 3. referrals table repair
      if (await db.schema.hasTable('referrals')) {
        const refCols = [
          { name: 'mrf_request_id', type: (t: any) => t.bigInteger('mrf_request_id').unsigned().nullable() },
          { name: 'referring_employee_id', type: (t: any) => t.bigInteger('referring_employee_id').unsigned().nullable() },
          { name: 'referrer_employee_id', type: (t: any) => t.bigInteger('referrer_employee_id').unsigned().nullable() },
          { name: 'referral_date', type: (t: any) => t.timestamp('referral_date').defaultTo(db.fn.now()).nullable() },
          { name: 'status', type: (t: any) => t.string('status', 50).defaultTo('submitted') },
          { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
          { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        ];
        for (const col of refCols) {
          if (!(await db.schema.hasColumn('referrals', col.name))) {
            await db.schema.table('referrals', col.type);
            logger.info(`Added missing column ${col.name} to referrals table`);
          }
        }
      }

      // 4. jobs table repair
      if (await db.schema.hasTable('jobs')) {
        const jobCols = [
          { name: 'mrf_request_id', type: (t: any) => t.bigInteger('mrf_request_id').unsigned().nullable() },
          { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
          { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        ];
        for (const col of jobCols) {
          if (!(await db.schema.hasColumn('jobs', col.name))) {
            await db.schema.table('jobs', col.type);
            logger.info(`Added missing column ${col.name} to jobs table`);
          }
        }
      }

      // 5. notification_templates table (template_code fix)
      if (await db.schema.hasTable('notification_templates')) {
        if (await db.schema.hasColumn('notification_templates', 'template_code')) {
          try {
            await db.raw('ALTER TABLE notification_templates MODIFY COLUMN template_code VARCHAR(100) NULL');
            logger.info('Modified template_code column to be NULLABLE in notification_templates');
          } catch (e: any) {}
        }
      }
    } catch (deepSchemaErr: any) {
      logger.error('Error during master recruitment schema alignment:', deepSchemaErr.message);
    }

    // Seed default pipeline stages if empty for any organization
    try {
      const orgs = await db('organizations').select('id');
      const DEFAULT_STAGES = [
        { stage_name: 'Applied', sequence_order: 1, stage_color: '#6366f1', is_rejection_stage: false },
        { stage_name: 'Screening', sequence_order: 2, stage_color: '#f59e0b', is_rejection_stage: false },
        { stage_name: 'Interview', sequence_order: 3, stage_color: '#3b82f6', is_rejection_stage: false },
        { stage_name: 'Technical Round', sequence_order: 4, stage_color: '#8b5cf6', is_rejection_stage: false },
        { stage_name: 'HR Round', sequence_order: 5, stage_color: '#ec4899', is_rejection_stage: false },
        { stage_name: 'Offered', sequence_order: 6, stage_color: '#10b981', is_rejection_stage: false },
        { stage_name: 'Hired', sequence_order: 7, stage_color: '#22c55e', is_rejection_stage: false },
        { stage_name: 'Rejected', sequence_order: 8, stage_color: '#ef4444', is_rejection_stage: true },
        { stage_name: 'On Hold', sequence_order: 9, stage_color: '#94a3b8', is_rejection_stage: false },
      ];

      const inserts: any[] = [];
      for (const org of orgs) {
        const countRes = await db('pipeline_stages').where('organization_id', org.id).count('id as count').first();
        const hasStages = countRes && Number((countRes as any).count) > 0;
        
        if (!hasStages) {
          logger.info(`Seeding default pipeline stages for Organization ID ${org.id}...`);
          inserts.push(
            ...DEFAULT_STAGES.map((stage) => ({
              uuid: uuidv4(),
              organization_id: org.id,
              stage_name: stage.stage_name,
              sequence_order: stage.sequence_order,
              stage_color: stage.stage_color,
              is_rejection_stage: stage.is_rejection_stage ? 1 : 0,
              created_by: 1,
              updated_by: 1,
              created_at: db.fn.now(),
              updated_at: db.fn.now(),
            }))
          );
        }
      }
      if (inserts.length > 0) {
        await db('pipeline_stages').insert(inserts);
        logger.info(`Successfully seeded ${inserts.length} default pipeline stages.`);
      }
    } catch (seedError: any) {
      logger.error('Error seeding default pipeline stages:', seedError.message);
    }

    // Seeding recruitment permissions if they don't exist
    try {
      const recruitmentPermissions = [
        { code: 'recruitment.mrf.read', module: 'recruitment', resource: 'mrf', action: 'read', description: 'Read MRF Requests' },
        { code: 'recruitment.mrf.write', module: 'recruitment', resource: 'mrf', action: 'write', description: 'Create and Manage MRF Requests' },
        { code: 'recruitment.job.read', module: 'recruitment', resource: 'job', action: 'read', description: 'Read Recruitment Jobs' },
        { code: 'recruitment.job.write', module: 'recruitment', resource: 'job', action: 'write', description: 'Create and Manage Recruitment Jobs' },
        { code: 'recruitment.candidate.read', module: 'recruitment', resource: 'candidate', action: 'read', description: 'Read Candidates' },
        { code: 'recruitment.candidate.write', module: 'recruitment', resource: 'candidate', action: 'write', description: 'Create and Manage Candidates' },
        { code: 'recruitment.application.read', module: 'recruitment', resource: 'application', action: 'read', description: 'Read Applications' },
        { code: 'recruitment.application.write', module: 'recruitment', resource: 'application', action: 'write', description: 'Manage Applications' },
        { code: 'recruitment.interview.read', module: 'recruitment', resource: 'interview', action: 'read', description: 'Read Interviews' },
        { code: 'recruitment.interview.write', module: 'recruitment', resource: 'interview', action: 'write', description: 'Manage Interviews' },
        { code: 'recruitment.assessment.read', module: 'recruitment', resource: 'assessment', action: 'read', description: 'Read Assessments' },
        { code: 'recruitment.assessment.write', module: 'recruitment', resource: 'assessment', action: 'write', description: 'Manage Assessments' },
        { code: 'recruitment.offer.read', module: 'recruitment', resource: 'offer', action: 'read', description: 'Read Offers' },
        { code: 'recruitment.offer.write', module: 'recruitment', resource: 'offer', action: 'write', description: 'Manage Offers' },
        { code: 'recruitment.read', module: 'recruitment', resource: 'recruitment', action: 'read', description: 'Read Recruitment Dashboard' },
      ];

      for (const perm of recruitmentPermissions) {
        const existing = await db('permissions').where('code', perm.code).first();
        if (!existing) {
          logger.info(`Seeding permission: ${perm.code}`);
          await db('permissions').insert({
            code: perm.code,
            module: perm.module,
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
            is_system: true,
          });
        }
      }

      const targetRoles = ['super_admin', 'organization_admin', 'recruitment_manager', 'hr_admin', 'hr_manager', 'manager', 'department_head'];
      
      const allPermissions = await db('permissions')
        .whereIn('code', recruitmentPermissions.map(p => p.code))
        .select('id', 'code');

      const allRoles = await db('roles')
        .whereIn('code', targetRoles)
        .select('id', 'code', 'organization_id');

      for (const role of allRoles) {
        for (const perm of allPermissions) {
          const mappingExists = await db('role_permissions')
            .where({ role_id: role.id, permission_id: perm.id })
            .first();

          if (!mappingExists) {
            logger.info(`Assigning permission ${perm.code} to Role ${role.code} (Role ID ${role.id})`);
            await db('role_permissions').insert({
              role_id: role.id,
              permission_id: perm.id,
            });
          }
        }
      }

      logger.info('Recruitment permissions seeding and role mapping completed successfully!');
    } catch (permSeedError: any) {
      logger.error('Error seeding recruitment permissions:', permSeedError.message);
    }

    // Seed default assessments for all organizations
    try {
      const orgs = await db('organizations').select('id');
      const { v4: uuidv4 } = await import('uuid');

      const defaultAssessments = [
        { assessment_name: 'JavaScript Coding Challenge', assessment_type: 'coding', duration_minutes: 45, passing_score: 70, description: 'DSA and problem-solving round with 3 coding problems' },
        { assessment_name: 'React Frontend Assessment', assessment_type: 'coding', duration_minutes: 60, passing_score: 60, description: 'Component building, hooks, and state management test' },
        { assessment_name: 'Python Backend Test', assessment_type: 'coding', duration_minutes: 50, passing_score: 65, description: 'API design, algorithms and data structures in Python' },
        { assessment_name: 'General Aptitude MCQ', assessment_type: 'mcq', duration_minutes: 30, passing_score: 50, description: 'Logical reasoning, quantitative aptitude and verbal ability' },
        { assessment_name: 'Technical MCQ - Full Stack', assessment_type: 'mcq', duration_minutes: 40, passing_score: 60, description: 'HTML/CSS, JavaScript, Node.js, SQL and system design MCQs' },
        { assessment_name: 'HR Screening Form', assessment_type: 'form', duration_minutes: 20, passing_score: 0, description: 'Background check, references, and cultural fit questionnaire' },
      ];

      for (const org of orgs) {
        const existingCount = await db('assessments').where('organization_id', org.id).count('id as cnt').first();
        if (Number(existingCount?.cnt || 0) === 0) {
          for (const assessment of defaultAssessments) {
            await db('assessments').insert({
              uuid: uuidv4(),
              organization_id: org.id,
              ...assessment,
              created_by: 1,
              updated_by: 1,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
          logger.info(`Seeded ${defaultAssessments.length} default assessments for org ${org.id}`);
        }
      }
    } catch (assessmentSeedError: any) {
      logger.error('Error seeding default assessments:', assessmentSeedError.message);
    }

    // Seed dropdown settings & masters for each organization if they are empty
    try {
      const orgs = await db('organizations').select('id');
      const defaultUser = await db('users').first();
      const defaultUserId = defaultUser ? defaultUser.id : 1;

      for (const org of orgs) {
        const orgId = org.id;

        // 1. Seed Company if empty
        const companyCount = await db('company').where('organization_id', orgId).count('company_id as count').first();
        if (!companyCount || Number((companyCount as any).count) === 0) {
          logger.info(`Seeding companies for Org ID ${orgId}...`);
          await db('company').insert([
            { uuid: uuidv4(), organization_id: orgId, name: 'Apponext Global Inc', code: 'APP-GLOBAL', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Apponext Tech', code: 'APP-TECH', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Trial Company', code: 'TRIAL-CO', created_by: defaultUserId, updated_by: defaultUserId },
          ]);
        }

        // 2. Seed Locations if empty
        const locationCount = await db('locations').where('organization_id', orgId).count('id as count').first();
        if (!locationCount || Number((locationCount as any).count) === 0) {
          logger.info(`Seeding locations for Org ID ${orgId}...`);
          await db('locations').insert([
            { uuid: uuidv4(), organization_id: orgId, name: 'Headquarters', code: 'LOC-HQ', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Remote', code: 'LOC-REM', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Mumbai Office', code: 'LOC-MUM', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'New York Office', code: 'LOC-NY', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
          ]);
        }

        // 3. Seed Departments if empty
        const deptCount = await db('departments').where('organization_id', orgId).count('id as count').first();
        if (!deptCount || Number((deptCount as any).count) === 0) {
          logger.info(`Seeding departments for Org ID ${orgId}...`);
          await db('departments').insert([
            { uuid: uuidv4(), organization_id: orgId, name: 'Engineering', code: 'DEPT-ENG', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'HR', code: 'DEPT-HR', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Sales', code: 'DEPT-SALES', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Marketing', code: 'DEPT-MKTG', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Finance', code: 'DEPT-FIN', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
          ]);
        }

        // 4. Seed Grades if empty
        const gradeCount = await db('grades').where('organization_id', orgId).count('id as count').first();
        if (!gradeCount || Number((gradeCount as any).count) === 0) {
          logger.info(`Seeding grades for Org ID ${orgId}...`);
          await db('grades').insert([
            { uuid: uuidv4(), organization_id: orgId, name: 'Grade A', code: 'GR-A', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Grade B', code: 'GR-B', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Grade C', code: 'GR-C', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Junior', code: 'GR-JR', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Senior', code: 'GR-SR', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
          ]);
        }

        // 5. Seed Designations if empty
        const desCount = await db('designations').where('organization_id', orgId).count('id as count').first();
        if (!desCount || Number((desCount as any).count) === 0) {
          logger.info(`Seeding designations for Org ID ${orgId}...`);
          await db('designations').insert([
            { uuid: uuidv4(), organization_id: orgId, name: 'Software Developer', code: 'DES-SDE', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'QA Engineer', code: 'DES-QA', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'HR Executive', code: 'DES-HR', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Product Manager', code: 'DES-PM', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, name: 'Sales Executive', code: 'DES-SE', status: 'active', created_by: defaultUserId, updated_by: defaultUserId },
          ]);
        }

        // 6. Seed Employees if empty
        const empCount = await db('employees').where('organization_id', orgId).count('id as count').first();
        if (!empCount || Number((empCount as any).count) === 0) {
          logger.info(`Seeding employees for Org ID ${orgId}...`);
          await db('employees').insert([
            { uuid: uuidv4(), organization_id: orgId, employee_code: 'EMP-001', first_name: 'Sakshi', last_name: 'Shukla', email: 'sakshi@apponext.com', status: 'active', date_of_joining: '2024-01-15', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, employee_code: 'EMP-002', first_name: 'Rahul', last_name: 'Sharma', email: 'rahul@apponext.com', status: 'active', date_of_joining: '2024-01-15', created_by: defaultUserId, updated_by: defaultUserId },
            { uuid: uuidv4(), organization_id: orgId, employee_code: 'EMP-003', first_name: 'Siddharth', last_name: 'Mehta', email: 'siddharth@apponext.com', status: 'active', date_of_joining: '2024-01-15', created_by: defaultUserId, updated_by: defaultUserId },
          ]);
        }
      }
    } catch (dropdownSeedError: any) {
      logger.error('Error seeding dropdown options:', dropdownSeedError.message);
    }

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
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_pass',
        'sender_name',
        'sender_email',
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

    // Ensure `assessments` table has `allow_reattempt` column
    const hasAssessmentsTable = await db.schema.hasTable('assessments');
    if (hasAssessmentsTable) {
      const hasAllowReattempt = await db.schema.hasColumn('assessments', 'allow_reattempt');
      if (!hasAllowReattempt) {
        logger.info("Adding missing column 'allow_reattempt' to 'assessments' table...");
        await db.schema.alterTable('assessments', (table) => {
          table.boolean('allow_reattempt').defaultTo(true);
        });
      }
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

    // Ensure `leave_applications` table has the newer retro/payroll columns
    const hasLeaveAppTable = await db.schema.hasTable('leave_applications');
    if (hasLeaveAppTable) {
      const hasIsBackdated = await db.schema.hasColumn('leave_applications', 'is_backdated');
      if (!hasIsBackdated) {
        logger.info("Adding missing column 'is_backdated' to 'leave_applications' table...");
        await db.schema.alterTable('leave_applications', (table) => {
          table.boolean('is_backdated').defaultTo(false);
        });
      }
      const hasRequiresArrears = await db.schema.hasColumn('leave_applications', 'requires_payroll_arrears');
      if (!hasRequiresArrears) {
        logger.info("Adding missing column 'requires_payroll_arrears' to 'leave_applications' table...");
        await db.schema.alterTable('leave_applications', (table) => {
          table.boolean('requires_payroll_arrears').defaultTo(false);
        });
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

    // Ensure `resume_bank` table has job_id and mrf_request_id columns
    const hasResumeBankTable = await db.schema.hasTable('resume_bank');
    if (hasResumeBankTable) {
      const hasJobId = await db.schema.hasColumn('resume_bank', 'job_id');
      if (!hasJobId) {
        logger.info("Adding missing column 'job_id' and 'mrf_request_id' to 'resume_bank' table...");
        await db.schema.alterTable('resume_bank', (table) => {
          table.bigInteger('job_id').unsigned().nullable();
          table.bigInteger('mrf_request_id').unsigned().nullable();
        });
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

    // ── Inject Mock Data for Recruitment ──────────────────────────────────────
    const hasJobs = await db.schema.hasTable('jobs');
    const hasCandidates = await db.schema.hasTable('candidates');
    const hasApps = await db.schema.hasTable('applications');
    const hasStages = await db.schema.hasTable('pipeline_stages');

    if (hasJobs && hasCandidates && hasApps && hasStages) {
      const targetEmails = ['abhishek@gmail.com', 'narendragaikwad1402@gmail.com'];
      for (const targetEmail of targetEmails) {
        const abhishekOrg = await db('organizations').whereRaw('LOWER(email) = ?', [targetEmail]).first();
        if (abhishekOrg) {
          const orgId = abhishekOrg.id || abhishekOrg.Id;

          // Ensure target user has a user record in the users table
          let abhishekUser = await db('users').where({ email: targetEmail }).first();
        const abhishekUserPassHash = await hash('Admin@123', {
          type: 2,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });
        if (!abhishekUser) {
          logger.info(`Creating admin user record for ${targetEmail} under organization ID ${orgId}...`);
          const [newUserId] = await db('users').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            email: targetEmail,
            password_hash: abhishekUserPassHash,
            status: 'active',
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
          
          // Also create system role organization_admin and user_roles mapping
          let adminRole = await db('roles').where({ organization_id: orgId, code: 'organization_admin' }).first();
          if (!adminRole) {
            const [roleId] = await db('roles').insert({
              uuid: uuidv4(),
              organization_id: orgId,
              name: 'Organization Admin',
              code: 'organization_admin',
              description: 'Full administrative access for organization',
              is_system: true,
              is_platform_role: false,
              is_default: false,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
            adminRole = { id: roleId };
          }
          await db('user_roles').insert({
            organization_id: orgId,
            user_id: newUserId,
            role_id: adminRole.id,
            assigned_by: newUserId,
            assigned_at: db.fn.now()
          });
        }

        // Ensure we have pipeline stages
        let stagesList = await db('pipeline_stages').where('organization_id', orgId).select('id', 'stage_name');
        if (stagesList.length === 0) {
          logger.info(`Seeding missing default pipeline stages for Abhishek organization ID ${orgId}...`);
          const DEFAULT_STAGES = [
            { stage_name: 'Applied', sequence_order: 1, stage_color: '#6366f1', is_rejection_stage: false },
            { stage_name: 'Screening', sequence_order: 2, stage_color: '#f59e0b', is_rejection_stage: false },
            { stage_name: 'Interview', sequence_order: 3, stage_color: '#3b82f6', is_rejection_stage: false },
            { stage_name: 'Technical Round', sequence_order: 4, stage_color: '#8b5cf6', is_rejection_stage: false },
            { stage_name: 'HR Round', sequence_order: 5, stage_color: '#ec4899', is_rejection_stage: false },
            { stage_name: 'Offered', sequence_order: 6, stage_color: '#10b981', is_rejection_stage: false },
            { stage_name: 'Hired', sequence_order: 7, stage_color: '#22c55e', is_rejection_stage: false },
            { stage_name: 'Rejected', sequence_order: 8, stage_color: '#ef4444', is_rejection_stage: true },
            { stage_name: 'On Hold', sequence_order: 9, stage_color: '#94a3b8', is_rejection_stage: false },
          ];
          const inserts = DEFAULT_STAGES.map((stage) => ({
            uuid: uuidv4(),
            organization_id: orgId,
            stage_name: stage.stage_name,
            sequence_order: stage.sequence_order,
            stage_color: stage.stage_color,
            is_rejection_stage: stage.is_rejection_stage ? 1 : 0,
            created_by: 1,
            updated_by: 1,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          }));
          await db('pipeline_stages').insert(inserts);
          stagesList = await db('pipeline_stages').where('organization_id', orgId).select('id', 'stage_name');
        }

        // Find or create a job
        let job = await db('jobs').where('organization_id', orgId).first();
        if (!job) {
          const user = await db('users').where('organization_id', orgId).first();
          const userId = user ? user.id : 1;

          const [jobId] = await db('jobs').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            job_code: 'JD-001',
            job_title: 'Senior Node.js Developer',
            job_description: 'We are looking for a Senior Node.js Developer with 5+ years of experience in JavaScript/TypeScript, Express, and MySQL.',
            status: 'published',
            no_of_positions: 3,
            job_type: 'full_time',
            experience_level: 'senior',
            employment_type: 'remote',
            is_internal: false,
            is_published_external: true,
            created_by: userId,
            updated_by: userId,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
          job = await db('jobs').where('id', jobId).first();
        }

        // Check if applications are empty
        const appsCount = await db('applications').where('organization_id', orgId).count('* as count').first();
        const countVal = appsCount ? Number((appsCount as any).count || (appsCount as any)['count(*)'] || 0) : 0;
        try {
          const fs = await import('fs');
          fs.appendFileSync('seeding_run.log', `OrgId: ${orgId}, appsCount: ${JSON.stringify(appsCount)}, countVal: ${countVal}\n`);
        } catch (e) {}

        if (countVal === 0) {
          logger.info('Seeding mock candidates and applications for recruitment module...');

          const mockCandidates = [
            { first_name: 'John', last_name: 'Doe', email: 'john.doe@gmail.com', phone: '9876543210', source: 'direct_apply', status: 'interview' },
            { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@gmail.com', phone: '9876543211', source: 'job_board', status: 'screening' },
            { first_name: 'David', last_name: 'Miller', email: 'david.miller@gmail.com', phone: '9876543212', source: 'employee_referral', status: 'hired' },
            { first_name: 'Sarah', last_name: 'Connor', email: 'sarah.connor@gmail.com', phone: '9876543213', source: 'recruitment_agency', status: 'offer' },
            { first_name: 'Alex', last_name: 'Jones', email: 'alex.jones@gmail.com', phone: '9876543214', source: 'direct_apply', status: 'rejected' }
          ];

          const mysqlNow = new Date().toISOString().replace('T', ' ').substring(0, 19);

          for (const cand of mockCandidates) {
            let existingCand = await db('candidates').where('email', cand.email).first();
            let candidateId;
            if (!existingCand) {
              const user = await db('users').where('organization_id', orgId).first();
              const userId = user ? user.id : 1;

              const [newId] = await db('candidates').insert({
                uuid: uuidv4(),
                organization_id: orgId,
                first_name: cand.first_name,
                last_name: cand.last_name,
                email: cand.email,
                phone: cand.phone,
                source: cand.source,
                status: cand.status,
                created_by: userId,
                updated_by: userId,
                created_at: mysqlNow,
                updated_at: mysqlNow
              });
              candidateId = newId;
            } else {
              candidateId = existingCand.id;
            }

            // Find matching stage ID
            let stageId = null;
            if (stagesList.length > 0) {
              const matchingStage = stagesList.find(s => {
                const sName = (s.stageName || (s as any).stage_name || '').toLowerCase();
                return (cand.status === 'interview' && sName.includes('interview')) ||
                       (cand.status === 'screening' && sName.includes('screen')) ||
                       (cand.status === 'hired' && sName.includes('hired')) ||
                       (cand.status === 'offer' && sName.includes('offer')) ||
                       (cand.status === 'rejected' && sName.includes('reject')) ||
                       sName.includes('apply');
              });
              stageId = matchingStage ? matchingStage.id : stagesList[0].id;
            }

            const user = await db('users').where('organization_id', orgId).first();
            const userId = user ? user.id : 1;

            await db('applications').insert({
              uuid: uuidv4(),
              organization_id: orgId,
              candidate_id: candidateId,
              job_id: job.id,
              application_status: cand.status,
              applied_at: mysqlNow,
              applied_from_source: cand.source,
              pipeline_stage_id: stageId,
              current_stage_entered_at: mysqlNow,
              created_by: userId,
              updated_by: userId,
              created_at: mysqlNow,
              updated_at: mysqlNow
            });
          }
          logger.info('Successfully seeded mock recruitment candidate & application data.');
        }

        // Integration test data verification
        const testJob = await db('jobs').where('job_code', 'TEST-JOB-101').first();
        const testCand = await db('candidates').where('email', 'test.candidate@testflow.com').first();
        const testApp = await db('applications').where('applied_from_source', 'integration_test').first();
        const testEmp = await db('employees').where('email', 'test.candidate@testflow.com').first();

        const fs = await import('fs');
        const path = await import('path');
        fs.writeFileSync(path.resolve(process.cwd(), 'diagnostic.log'), JSON.stringify({
          testJob: testJob ? { id: testJob.id, job_code: testJob.job_code } : null,
          testCand: testCand ? { id: testCand.id, email: testCand.email } : null,
          testApp: testApp ? { id: testApp.id, status: testApp.application_status } : null,
          testEmp: testEmp ? { id: testEmp.id, status: testEmp.status } : null,
          timestamp: new Date().toISOString()
        }, null, 2));
      }
      }
    }

    // Ensure answers_json column exists in assessment_attempts table
    try {
      const hasAttemptsTable = await db.schema.hasTable('assessment_attempts');
      if (hasAttemptsTable) {
        const hasColumn = await db.schema.hasColumn('assessment_attempts', 'answers_json');
        if (!hasColumn) {
          logger.info('Upgrading assessment_attempts table to add missing answers_json column...');
          await db.schema.alterTable('assessment_attempts', (table) => {
            table.json('answers_json').nullable();
          });
          logger.info('Successfully added answers_json column to assessment_attempts table.');
        }
      }

      const hasAssessmentsTable = await db.schema.hasTable('assessments');
      if (hasAssessmentsTable) {
        const hasDeptCol = await db.schema.hasColumn('assessments', 'department_id');
        if (!hasDeptCol) {
          logger.info('Upgrading assessments table to add missing department_id and designation_id columns...');
          await db.schema.alterTable('assessments', (table) => {
            table.bigInteger('department_id').unsigned().nullable();
            table.bigInteger('designation_id').unsigned().nullable();
          });
          logger.info('Successfully added department_id and designation_id columns to assessments table.');
        }
      }
    } catch (err: any) {
      logger.error('Error upgrading assessment tables schema:', err.message);
    }

  } catch (error: any) {
    logger.error('Error in setupProfileSchemaAndSeed:', error);
    try {
      const fs = await import('fs');
      const path = await import('path');
      fs.writeFileSync(path.resolve(process.cwd(), 'seed_error.log'), JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
    } catch (e) {}
  }
}
