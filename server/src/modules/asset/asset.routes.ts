import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { assetController } from './controllers/AssetController';

const router = Router();

// Apply authentication and tenant resolution middleware
router.use(authenticate, resolveTenant);

// ===== ASSETS =====
router.get('/stats', asyncHandler((req, res) => assetController.getStats(req, res)));
router.get('/', asyncHandler((req, res) => assetController.listAssets(req, res)));
router.post('/', asyncHandler((req, res) => assetController.createAsset(req, res)));
router.get('/:id', asyncHandler((req, res) => assetController.getAsset(req, res)));
router.put('/:id', asyncHandler((req, res) => assetController.updateAsset(req, res)));
router.delete('/:id', asyncHandler((req, res) => assetController.deleteAsset(req, res)));

// ===== CATEGORIES =====
router.get('/categories', asyncHandler((req, res) => assetController.listCategories(req, res)));
router.post('/categories', asyncHandler((req, res) => assetController.createCategory(req, res)));
router.put('/categories/:id', asyncHandler((req, res) => assetController.updateCategory(req, res)));

// ===== ASSIGNMENTS =====
router.get('/assignments', asyncHandler((req, res) => assetController.listAssignments(req, res)));
router.post('/assign', asyncHandler((req, res) => assetController.assignAsset(req, res)));
router.get('/my-assets', asyncHandler((req, res) => assetController.getMyAssets(req, res)));

// ===== TRANSFERS =====
router.get('/transfers', asyncHandler((req, res) => assetController.listTransfers(req, res)));
router.post('/transfer/request', asyncHandler((req, res) => assetController.requestTransfer(req, res)));
router.post('/transfer/:id/approve', asyncHandler((req, res) => assetController.approveTransfer(req, res)));
router.post('/transfer/:id/reject', asyncHandler((req, res) => assetController.rejectTransfer(req, res)));

// ===== RETURNS =====
router.get('/returns', asyncHandler((req, res) => assetController.listReturns(req, res)));
router.post('/return/request', asyncHandler((req, res) => assetController.requestReturn(req, res)));
router.post('/return/:id/process', asyncHandler((req, res) => assetController.processReturn(req, res)));

// ===== MAINTENANCE =====
router.get('/maintenance', asyncHandler((req, res) => assetController.listMaintenance(req, res)));
router.post('/maintenance', asyncHandler((req, res) => assetController.createMaintenance(req, res)));
router.post('/maintenance/:id/complete', asyncHandler((req, res) => assetController.completeMaintenance(req, res)));

// ===== SOFTWARE LICENSES =====
router.get('/licenses', asyncHandler((req, res) => assetController.listLicenses(req, res)));
router.post('/licenses', asyncHandler((req, res) => assetController.createLicense(req, res)));
router.put('/licenses/:id', asyncHandler((req, res) => assetController.updateLicense(req, res)));
router.get('/licenses/expiring', asyncHandler((req, res) => assetController.getExpiringLicenses(req, res)));

// ===== ASSET REQUESTS =====
router.get('/requests', asyncHandler((req, res) => assetController.listRequests(req, res)));
router.post('/requests', asyncHandler((req, res) => assetController.createRequest(req, res)));
router.post('/requests/:id/approve', asyncHandler((req, res) => assetController.approveRequest(req, res)));
router.post('/requests/:id/reject', asyncHandler((req, res) => assetController.rejectRequest(req, res)));

// ===== VENDORS =====
router.get('/vendors', asyncHandler((req, res) => assetController.listVendors(req, res)));
router.post('/vendors', asyncHandler((req, res) => assetController.createVendor(req, res)));
router.put('/vendors/:id', asyncHandler((req, res) => assetController.updateVendor(req, res)));
router.delete('/vendors/:id', asyncHandler((req, res) => assetController.deleteVendor(req, res)));

export default router;
