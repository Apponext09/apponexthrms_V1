import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { policyController } from './controllers/PolicyController';

import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// All policy routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

// User-facing policy endpoints (Must be accessible by all authenticated roles)
router.get('/my-policies', policyController.getMyPolicies);
router.get('/pending', policyController.getPendingPolicies);
router.get('/my-queries', policyController.getMyQueries);

// Dynamic Master Target Options endpoint
router.get('/target-options', policyController.getTargetOptions);

// File Upload endpoints
router.post('/upload', upload.single('file'), policyController.uploadFile);
router.post('/upload-attachment', upload.single('file'), policyController.uploadAttachment);

// Attachment download & management routes
router.get('/attachments/:attachmentId/download', policyController.downloadAttachment);
router.delete('/attachments/:attachmentId', policyController.deleteAttachment);

// Category Management endpoints (Before /:id to avoid route collisions)
router.get('/categories', policyController.listCategories);
router.post('/categories', policyController.createCategory);
router.delete('/categories/:id', policyController.deleteCategory);

router.post('/:id/accept', policyController.acceptPolicy);

// E-Signature endpoints
router.post('/:id/initiate-esign', policyController.initiateESignature);
router.get('/:id/signature-status', policyController.getSignatureStatus);
router.get('/:id/signatures', policyController.listPolicySignatures);
router.get('/signatures/:signatureId/download-signed', policyController.downloadSignedDocument);
router.get('/signatures/:signatureId/download-evidence', policyController.downloadSignedEvidence);

// Admin & HR management endpoints
router.get('/admin/queries', policyController.getAdminPolicyQueries);
router.post('/queries/:queryId/reply', policyController.replyToPolicyQuery);

router.get('/', policyController.listPolicies);
router.post('/', policyController.createPolicy);
router.get('/:id', policyController.getPolicy);
router.put('/:id', policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);
router.get('/:id/queries', policyController.getPolicyQueriesByPolicyId);
router.post('/:id/queries', policyController.submitPolicyQuery);
router.get('/:id/audit', policyController.getPolicyAudit);
router.get('/:id/versions', policyController.getVersionHistory);
router.get('/:id/attachments', policyController.getAttachments);
router.post('/:id/attachments', policyController.addAttachmentRecord);
router.put('/:id/attachments/:attachmentId/set-main', policyController.setMainAttachment);

export default router;

