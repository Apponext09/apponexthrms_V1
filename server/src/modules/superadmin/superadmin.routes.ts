import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import dashboardRoutes from './Dashboard/dashboard.routes';
import organizationRoutes from './Organization/organization.routes';
import subscriptionRoutes from './Subcription/subscription.routes';
import helpDeskRoutes from './HelpDesk/helpdesk.routes';
import profileRoutes from './Profile/profile.routes';

const router = Router();

// Middleware: Authenticate all SuperAdmin endpoints
router.use(authenticate);

// Sub-module routes
router.use('/dashboard', dashboardRoutes);
router.use('/organizations', organizationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/helpdesk', helpDeskRoutes);
router.use('/profile', profileRoutes);

export default router;
