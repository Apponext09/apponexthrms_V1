import { Router } from 'express';
import { EmployeeStatusController } from './controllers/EmployeeStatusController';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
const controller = new EmployeeStatusController();

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.delete));

export default router;
