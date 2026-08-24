import { Router } from 'express';
import { LoanController } from './controllers/LoanController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
const controller = new LoanController();

router.use(authenticate, resolveTenant);

router.post('/', asyncHandler((req, res) => controller.createLoan(req, res)));
router.get('/', asyncHandler((req, res) => controller.getLoans(req, res)));
router.get('/active', asyncHandler((req, res) => controller.getActiveLoan(req, res)));
router.get('/:id', asyncHandler((req, res) => controller.getLoan(req, res)));
router.put('/:id', asyncHandler((req, res) => controller.updateLoan(req, res)));
router.patch('/:id', asyncHandler((req, res) => controller.updateLoan(req, res)));
router.post('/:id/approve', requirePermission('loan:create'), asyncHandler((req, res) => controller.approveLoan(req, res)));
router.post('/:id/reject', requirePermission('loan:create'), asyncHandler((req, res) => controller.rejectLoan(req, res)));
router.get('/:id/schedule', asyncHandler((req, res) => controller.getEmiSchedule(req, res)));
router.get('/:id/next-emi', asyncHandler((req, res) => controller.getNextEmi(req, res)));

// Loan Types configuration
router.get('/types', asyncHandler((req, res) => controller.getLoanTypes(req, res)));
router.post('/types', requirePermission('loan:create'), asyncHandler((req, res) => controller.saveLoanType(req, res)));
router.delete('/types/:id', requirePermission('loan:create'), asyncHandler((req, res) => controller.deleteLoanType(req, res)));

export default router;
