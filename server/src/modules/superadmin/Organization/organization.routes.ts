import { Router } from 'express';
import { superAdminOrganizationController } from './organization.controller';

const router = Router();

router.get('/', superAdminOrganizationController.listOrganizations);
router.post('/', superAdminOrganizationController.createOrganization);
router.put('/:id', superAdminOrganizationController.updateOrganization);
router.patch('/:id/status', superAdminOrganizationController.toggleStatus);
router.delete('/:id', superAdminOrganizationController.deleteOrganization);

export default router;
