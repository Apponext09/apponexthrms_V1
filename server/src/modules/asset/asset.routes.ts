import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { assetController } from './controllers/AssetController';
import { denyRoles } from '../../common/middleware/denyRoles';

const router = Router();

// Apply authentication and tenant resolution middleware
router.use(authenticate, resolveTenant);
router.use(denyRoles(['organization_admin', 'ceo', 'hr', 'hr_admin', 'hr_manager']));

// ===== ASSETS =====
router.get('/stats', assetController.getStats);
router.get('/', assetController.listAssets);
router.post('/', assetController.createAsset);
router.get('/:id', assetController.getAsset);
router.put('/:id', assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);

// ===== CATEGORIES =====
router.get('/categories', assetController.listCategories);
router.post('/categories', assetController.createCategory);
router.put('/categories/:id', assetController.updateCategory);

// ===== ASSIGNMENTS =====
router.get('/assignments', assetController.listAssignments);
router.post('/assign', assetController.assignAsset);
router.get('/my-assets', assetController.getMyAssets);

// ===== TRANSFERS =====
router.get('/transfers', assetController.listTransfers);
router.post('/transfer/request', assetController.requestTransfer);
router.post('/transfer/:id/approve', assetController.approveTransfer);
router.post('/transfer/:id/reject', assetController.rejectTransfer);

// ===== RETURNS =====
router.get('/returns', assetController.listReturns);
router.post('/return/request', assetController.requestReturn);
router.post('/return/:id/process', assetController.processReturn);

// ===== MAINTENANCE =====
router.get('/maintenance', assetController.listMaintenance);
router.post('/maintenance', assetController.createMaintenance);
router.post('/maintenance/:id/complete', assetController.completeMaintenance);

// ===== SOFTWARE LICENSES =====
router.get('/licenses', assetController.listLicenses);
router.post('/licenses', assetController.createLicense);
router.put('/licenses/:id', assetController.updateLicense);
router.get('/licenses/expiring', assetController.getExpiringLicenses);

// ===== ASSET REQUESTS =====
router.get('/requests', assetController.listRequests);
router.post('/requests', assetController.createRequest);
router.post('/requests/:id/approve', assetController.approveRequest);
router.post('/requests/:id/reject', assetController.rejectRequest);

// ===== VENDORS =====
router.get('/vendors', assetController.listVendors);
router.post('/vendors', assetController.createVendor);
router.put('/vendors/:id', assetController.updateVendor);
router.delete('/vendors/:id', assetController.deleteVendor);

export default router;
