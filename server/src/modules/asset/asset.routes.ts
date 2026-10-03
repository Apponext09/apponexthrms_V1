import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { assetController } from './controllers/AssetController';
import { requireMenuModule } from '../rbac/requireMenuAccess';
import { requirePermission } from '../../common/middleware/requirePermission';

const router = Router();

// Apply authentication and tenant resolution middleware
router.use(authenticate, resolveTenant);
router.use(requireMenuModule('assets'));

// ===== ASSETS =====
router.get('/stats', requirePermission('asset.view'), assetController.getStats);
router.get('/', requirePermission('asset.view'), assetController.listAssets);
router.post('/', requirePermission('asset.create'), assetController.createAsset);
router.put('/:id', requirePermission('asset.edit'), assetController.updateAsset);
router.delete('/:id', requirePermission('asset.delete'), assetController.deleteAsset);

// ===== CATEGORIES =====
router.get('/categories', requirePermission('asset.category.view'), assetController.listCategories);
router.post('/categories', requirePermission('asset.category.create'), assetController.createCategory);
router.put('/categories/:id', requirePermission('asset.category.edit'), assetController.updateCategory);

// ===== ASSIGNMENTS =====
router.get('/assignments', requirePermission('asset.assign.view'), assetController.listAssignments);
router.post('/assign', requirePermission('asset.assign'), assetController.assignAsset);
router.get('/my-assets', requirePermission('asset.view'), assetController.getMyAssets);

// ===== TRANSFERS =====
router.get('/transfers', requirePermission('asset.transfer.view'), assetController.listTransfers);
router.post('/transfer/request', requirePermission('asset.transfer.request'), assetController.requestTransfer);
router.post('/transfer/:id/approve', requirePermission('asset.transfer.approve'), assetController.approveTransfer);
router.post('/transfer/:id/reject', requirePermission('asset.transfer.approve'), assetController.rejectTransfer);

// ===== RETURNS =====
router.get('/returns', requirePermission('asset.return.view'), assetController.listReturns);
router.post('/return/request', requirePermission('asset.return.request'), assetController.requestReturn);
router.post('/return/:id/process', requirePermission('asset.return.process'), assetController.processReturn);

// ===== MAINTENANCE =====
router.get('/maintenance', requirePermission('asset.maintenance.view'), assetController.listMaintenance);
router.post('/maintenance', requirePermission('asset.maintenance.create'), assetController.createMaintenance);
router.post('/maintenance/:id/complete', requirePermission('asset.maintenance.complete'), assetController.completeMaintenance);

// ===== SOFTWARE LICENSES =====
router.get('/licenses', requirePermission('asset.license.view'), assetController.listLicenses);
router.post('/licenses', requirePermission('asset.license.create'), assetController.createLicense);
router.put('/licenses/:id', requirePermission('asset.license.edit'), assetController.updateLicense);
router.get('/licenses/expiring', requirePermission('asset.license.view'), assetController.getExpiringLicenses);

// ===== ASSET REQUESTS =====
router.get('/requests', requirePermission('asset.request.view'), assetController.listRequests);
router.post('/requests', requirePermission('asset.request.create'), assetController.createRequest);
router.post('/requests/:id/approve', requirePermission('asset.request.approve'), assetController.approveRequest);
router.post('/requests/:id/reject', requirePermission('asset.request.approve'), assetController.rejectRequest);

// ===== VENDORS =====
router.get('/vendors', requirePermission('asset.vendor.view'), assetController.listVendors);
router.post('/vendors', requirePermission('asset.vendor.create'), assetController.createVendor);
router.put('/vendors/:id', requirePermission('asset.vendor.edit'), assetController.updateVendor);
router.delete('/vendors/:id', requirePermission('asset.vendor.delete'), assetController.deleteVendor);

// Keep the dynamic asset lookup after every named GET route.
router.get('/:id', requirePermission('asset.view'), assetController.getAsset);

export default router;
