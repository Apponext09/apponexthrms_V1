import { Router, type Request, type Response } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import rbacRoutes from '../modules/rbac/rbac.routes';
import usersRoutes from '../modules/users/users.routes';
import organizationsRoutes from '../modules/organizations/organizations.routes';
import performanceRoutes from '../modules/performance/performance.routes';
import employeeRoutes from '../modules/employee/employee.routes';
import attendanceRoutes from '../modules/attendance/attendance.routes';
import { leavesRouter } from '../modules/leaves/leaves.routes';
import payrollRoutes from '../modules/payroll/payroll.routes';
import loanRoutes from '../modules/loans/loan.routes';
import expenseRoutes from '../modules/expenses/expense.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import settingsRoutes from '../modules/settings/settings.routes';
import assetRoutes from '../modules/asset/asset.routes';
import recruitmentRoutes from '../modules/recruitment/recruitment.routes';
import masterHolidayCalendarRoutes from '../modules/master/routes/masterHolidayCalendar.routes';
import workflowRoutes from '../modules/workflow/workflow.routes';
import marketplaceRoutes from '../modules/marketplace/marketplace.routes';
import licensingRoutes from '../modules/licensing/licensing.routes';
import superAdminRoutes from '../modules/superadmin/superadmin.routes';
import { interviewRouter } from '../modules/employee-lifecycle/routes/InterviewRoutes';
import { lettersRouter } from '../modules/letters/letters.routes';
import teamLeadRoutes from '../modules/team-lead/team-lead.routes';
import managerRoutes from '../modules/manager/manager.routes';
import lifecycleRoutes from '../modules/HR/lifecycle/lifecycle.routes';
import approvalsRoutes from '../modules/approvals/approvals.routes';
import livetrackingRoutes from '../modules/Livetracking/livetracking.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import reportRoutes from '../modules/reports/reports.routes';
import { jobReferenceController } from '../modules/recruitment/controllers/JobReferenceController';
import { recruitmentController } from '../modules/recruitment/controllers/RecruitmentController';
import policyRoutes from '../modules/policy/policy.routes';
import masterBuilderRoutes from '../modules/master-builder/masterBuilder.routes';
import lmsRoutes from '../modules/lms/lms.routes';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});



/**
 * Mount module routers
 */
router.use('/dashboard', dashboardRoutes);
router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);
router.use('/users', usersRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leavesRouter);
router.use('/payroll', payrollRoutes);
router.use('/loans', loanRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reimbursements', expenseRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/letters', lettersRouter);
router.use('/assets', assetRoutes);
router.use('/performance', performanceRoutes);
router.use('/recruitment', recruitmentRoutes);
router.use('/policies', policyRoutes);
router.use('/master/holiday-calendars', masterHolidayCalendarRoutes);
router.use('/master-builder', masterBuilderRoutes);
router.use('/lms', lmsRoutes);

/**
 * Public Job Reference Routes (no auth required)
 */
router.get('/public/jobs', jobReferenceController.listPublicJobs);
router.get('/public/job-portal/filters', jobReferenceController.getFilterData);
router.get('/public/job-portal/openings', jobReferenceController.listOpenings);
router.get('/public/job-portal/candidates', jobReferenceController.listCandidatesWithResumes);
router.get('/public/job-portal/settings', jobReferenceController.getPublicPortalSettings);

// Aliases for /public/job-reference/*
router.get('/public/job-reference/filters', jobReferenceController.getFilterData);
router.get('/public/job-reference/openings', jobReferenceController.listOpenings);
router.get('/public/job-reference/candidates', jobReferenceController.listCandidatesWithResumes);
router.get('/public/job-reference/settings', jobReferenceController.getPublicPortalSettings);

router.get('/public/job-reference/:mrfId', jobReferenceController.getPublicJobData);
router.post('/public/job-reference/:mrfId/apply', jobReferenceController.applyFromReference);
router.post('/public/job-reference/:mrfId/refer-existing', jobReferenceController.referExisting);

// Authenticated Career Portal Settings routes
router.get('/recruitment/career-portal-settings', jobReferenceController.getPortalSettings);
router.put('/recruitment/career-portal-settings', jobReferenceController.updatePortalSettings);

// Public offers and assessments
router.get('/public/offers/:uuid', recruitmentController.getPublicOffer);
router.post('/public/offers/:uuid/accept', recruitmentController.acceptPublicOffer);
router.post('/public/offers/:uuid/reject', recruitmentController.rejectPublicOffer);
router.get('/public/assessments/attempts/:uuid', recruitmentController.getPublicAssessmentAttempt);
router.post('/public/assessments/attempts/:uuid/submit', recruitmentController.submitPublicAssessmentAttempt);
router.post('/public/assessments/attempts/:uuid/autosave', recruitmentController.autosavePublicAssessmentAttempt);
router.post('/public/assessments/attempts/:uuid/verify-proctoring', recruitmentController.verifyPublicAssessmentProctoring);
router.post('/public/assessments/run-code', recruitmentController.runPublicAssessmentCode);

// ── Report Engine (isolated module) ─────────────────────────────────────────
router.use('/reports', reportRoutes);

// Generic reports options dropdown route
router.get('/reports/options', async (req: Request, res: Response) => {
  try {
    const { getKnex } = await import('../db/knex');
    const db = getKnex();
    const orgId = req.ctx?.organizationId || 1;

    const [departments, designations, locations] = await Promise.all([
      db('departments').where({ organization_id: orgId }).whereNull('deleted_at').select('id', 'name', 'code'),
      db('designations').where({ organization_id: orgId }).whereNull('deleted_at').select('id', 'name', 'code'),
      db('locations')
        .where({ organization_id: orgId })
        .whereNull('deleted_at')
        .where(function () {
          this.where('status', 'active').orWhere('is_active', 'Yes');
        })
        .whereNot('status', 'inactive')
        .whereNot('is_active', 'No')
        .select('id', 'name', 'code', 'city'),
    ]);

    res.json({
      success: true,
      data: {
        departments,
        designations,
        locations,
      },
    });
  } catch (err: any) {
    res.json({
      success: true,
      data: {
        departments: [],
        designations: [],
        locations: [],
      },
    });
  }
});

router.use('/workflow', workflowRoutes);
router.use('/workflows', workflowRoutes);
router.use('/interviews', interviewRouter);
router.use('/team-lead', teamLeadRoutes);
router.use('/manager', managerRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/livetracking', livetrackingRoutes);
router.use('/hr/lifecycle', lifecycleRoutes);
router.use('/lifecycle', lifecycleRoutes);

/**
 * Phase 1: Marketplace & Licensing
 */
router.use('/marketplace', marketplaceRoutes);
router.use('/licensing', licensingRoutes);
router.use('/superadmin', superAdminRoutes);

/**
 * ⚠️ TEMPORARY: One-shot seed endpoint for super_admins table.
 * Remove after running!  POST /api/v1/seed-superadmin
 */

router.post('/seed-superadmin', async (req: Request, res: Response) => {
  try {
    const { getKnex } = await import('../db/knex');
    const { hash } = await import('argon2');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const log: string[] = [];

    // 1. Ensure super_admins table
    const hasSA = await db.schema.hasTable('super_admins');
    if (!hasSA) {
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
      log.push('✅ Created table: super_admins');
    } else {
      log.push('ℹ️ Table super_admins already exists');
    }

    // 2. Ensure admin_organizations table
    const hasAO = await db.schema.hasTable('admin_organizations');
    if (!hasAO) {
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
      log.push('✅ Created table: admin_organizations');
    } else {
      log.push('ℹ️ Table admin_organizations already exists');
    }

    // 3. Seed Super Admin
    const email = 'superadmin@apponext.com';
    const password = 'SuperAdmin@2026!Secure';
    const passwordHash = await hash(password, {
      memoryCost: 12288, timeCost: 3, parallelism: 1, type: 1,
    });

    const existingUser = await db('users').whereRaw('LOWER(email) = ?', [email.toLowerCase()]).first();
    const userId = existingUser?.id ?? null;

    const existingSA = await db('super_admins').where('email', email).first();
    let superAdminId: number;

    if (!existingSA) {
      const [insertedId] = await db('super_admins').insert({
        uuid: uuidv4(),
        user_id: userId,
        email,
        password_hash: passwordHash,
        first_name: 'Super',
        last_name: 'Admin',
        access_level: 'owner',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });
      superAdminId = insertedId;
      log.push(`✅ Inserted Super Admin (ID: ${superAdminId})`);
    } else {
      superAdminId = existingSA.id;
      await db('super_admins').where({ id: superAdminId }).update({
        password_hash: passwordHash,
        user_id: userId,
        updated_at: new Date(),
      });
      log.push(`ℹ️ Super Admin already exists (ID: ${superAdminId}) — updated credentials`);
    }

    // 4. Link to organization
    const org = await db('organizations').orderBy('id', 'asc').first();
    if (org) {
      const existingLink = await db('admin_organizations')
        .where({ super_admin_id: superAdminId, organization_id: org.id })
        .first();
      if (!existingLink) {
        await db('admin_organizations').insert({
          uuid: uuidv4(),
          super_admin_id: superAdminId,
          user_id: userId,
          organization_id: org.id,
          admin_role: 'super_admin',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        log.push(`✅ Linked Super Admin → Org (ID: ${org.id})`);
      } else {
        log.push(`ℹ️ admin_organizations link already exists`);
      }
    } else {
      log.push('⚠️ No organizations found — skipped linkage');
    }

    // 5. Ensure users table has superadmin row
    if (!existingUser) {
      const orgId = org?.id ?? null;
      await db('users').insert({
        uuid: uuidv4(),
        email,
        first_name: 'Super',
        last_name: 'Admin',
        password_hash: passwordHash,
        organization_id: orgId,
        role: 'superadmin',
        status: 'active',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const newUser = await db('users').where('email', email).first();
      if (newUser) {
        await db('super_admins').where({ id: superAdminId }).update({ user_id: newUser.id });
        log.push(`✅ Created superadmin in users table (ID: ${newUser.id})`);
      }
    } else {
      log.push(`ℹ️ User row already exists (ID: ${userId})`);
    }

    // Verify
    const verifyRows = await db('super_admins').select('*');
    res.json({
      success: true,
      log,
      superAdminsCount: verifyRows.length,
      superAdmins: verifyRows,
      credentials: { email, password },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

export default router;
