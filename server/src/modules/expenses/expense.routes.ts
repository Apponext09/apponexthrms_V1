import { Router } from 'express';
import { ExpenseController } from './controllers/ExpenseController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
const controller = new ExpenseController();

router.use(authenticate, resolveTenant);

router.post('/', asyncHandler((req, res) => controller.submitClaim(req, res)));
router.get('/', asyncHandler((req, res) => controller.getClaims(req, res)));
router.post('/:id/approve', asyncHandler((req, res) => controller.approveClaim(req, res)));
router.put('/:id/approve', asyncHandler((req, res) => controller.approveClaim(req, res)));
router.post('/:id/reject', asyncHandler((req, res) => controller.rejectClaim(req, res)));
router.put('/:id/reject', asyncHandler((req, res) => controller.rejectClaim(req, res)));

export default router;
