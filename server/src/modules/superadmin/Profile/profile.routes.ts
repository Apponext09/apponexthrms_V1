import { Router } from 'express';
import { superAdminProfileController } from './profile.controller';

const router = Router();

router.get('/', superAdminProfileController.getProfile);
router.put('/', superAdminProfileController.updateProfile);
router.post('/change-password', superAdminProfileController.changePassword);

export default router;
