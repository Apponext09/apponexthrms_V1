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
import notificationRoutes from '../modules/notifications/notification.routes';
import settingsRoutes from '../modules/settings/settings.routes';
import assetRoutes from '../modules/asset/asset.routes';
import recruitmentRoutes from '../modules/recruitment/recruitment.routes';
import workflowRoutes from '../modules/workflow/workflow.routes';
import marketplaceRoutes from '../modules/marketplace/marketplace.routes';
import licensingRoutes from '../modules/licensing/licensing.routes';
import superAdminRoutes from '../modules/superadmin/superadmin.routes';
import { interviewRouter } from '../modules/employee-lifecycle/routes/InterviewRoutes';
import teamLeadRoutes from '../modules/team-lead/team-lead.routes';
import managerRoutes from '../modules/manager/manager.routes';
import type { ApiResponse } from '@apponexthrms/shared';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  };

  res.status(200).json(response);
});

/**
 * Mount module routers
 */
router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);
router.use('/users', usersRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leavesRouter);
router.use('/payroll', payrollRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/assets', assetRoutes);
router.use('/performance', performanceRoutes);
router.use('/recruitment', recruitmentRoutes);
router.use('/workflow', workflowRoutes);
router.use('/interviews', interviewRouter);
router.use('/team-lead', teamLeadRoutes);
router.use('/manager', managerRoutes);

/**
 * Phase 1: Marketplace & Licensing
 */
router.use('/marketplace', marketplaceRoutes);
router.use('/licensing', licensingRoutes);
router.use('/superadmin', superAdminRoutes);

export default router;
