import type { Request, Response, NextFunction } from 'express';
import { PolicyService } from '../services/PolicyService';
import { UnauthorizedError } from '../../../common/errors';

export class PolicyController {
  private policyService: PolicyService;

  constructor() {
    this.policyService = new PolicyService();
  }

  /**
   * GET /policies
   * List all policies in organization (Admin/HR view)
   */
  listPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policies = await this.policyService.listPolicies(req.ctx);
      res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/target-options
   * Dynamic master options for Policy Target Assignment
   */
  getTargetOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const targetOptions = await this.policyService.getTargetOptions(req.ctx);
      res.json({
        success: true,
        data: targetOptions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/upload
   * Upload policy document attachment (PDF/DOCX)
   */
  uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const path = await import('path');
      const fs = await import('fs/promises');
      const { v4: uuidv4 } = await import('uuid');

      const uploadsDir = path.join(process.cwd(), 'uploads', 'policies');
      await fs.mkdir(uploadsDir, { recursive: true });

      const fileExt = path.extname(file.originalname) || '.pdf';
      const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `policy_${Date.now()}_${uuidv4().slice(0, 8)}_${cleanFileName}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      if (file.buffer) {
        await fs.writeFile(filePath, file.buffer);
      }

      const relativeUrl = `/uploads/policies/${uniqueFileName}`;

      res.status(200).json({
        success: true,
        data: {
          fileUrl: relativeUrl,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype || fileExt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/categories
   */
  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const categories = await this.policyService.listCategories(req.ctx);
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/categories
   */
  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const { name, description } = req.body;
      const category = await this.policyService.createCategory(req.ctx, name, description);
      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /policies/categories/:id
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      await this.policyService.deleteCategory(req.ctx, id);
      res.json({
        success: true,
        message: 'Policy category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id
   */
  getPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const policy = await this.policyService.getPolicyById(req.ctx, id);
      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies
   */
  createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policy = await this.policyService.createPolicy(req.ctx, req.body);
      res.status(201).json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /policies/:id
   */
  updatePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const policy = await this.policyService.updatePolicy(req.ctx, id, req.body);
      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /policies/:id
   */
  deletePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      await this.policyService.deletePolicy(req.ctx, id);
      res.json({
        success: true,
        message: 'Policy document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/my-policies
   * Returns all policies applicable to the logged-in user
   */
  getMyPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const jwtRoles = (req.user as any)?.roles;
      const policies = await this.policyService.getMyPolicies(req.ctx, jwtRoles);
      res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/pending
   * Returns unaccepted mandatory policies for the logged-in user
   */
  getPendingPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const jwtRoles = (req.user as any)?.roles;
      const pendingPolicies = await this.policyService.getPendingPolicies(req.ctx, jwtRoles);
      res.json({
        success: true,
        data: pendingPolicies,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/:id/accept
   * Records user acceptance
   */
  acceptPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const acceptance = await this.policyService.acceptPolicy(
        req.ctx,
        id,
        typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : undefined,
        userAgent
      );

      res.json({
        success: true,
        message: 'Policy accepted successfully',
        data: acceptance,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/audit
   * Compliance audit view for HR
   */
  getPolicyAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const audit = await this.policyService.getPolicyAudit(req.ctx, id);
      res.json({
        success: true,
        data: audit,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/versions
   * Version history for policy document
   */
  getVersionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const versions = await this.policyService.getVersionHistory(req.ctx, id);
      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/upload-attachment
   * Upload single supporting attachment file (PDF/DOC/DOCX/JPG/JPEG/PNG)
   */
  uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No attachment file uploaded' });
        return;
      }

      const path = await import('path');
      const fs = await import('fs/promises');
      const crypto = await import('crypto');
      const { v4: uuidv4 } = await import('uuid');

      // Format & File Extension Validation
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        res.status(400).json({
          success: false,
          message: `File format '${fileExt}' is not supported. Allowed formats: PDF, DOC, DOCX, JPG, JPEG, PNG`,
        });
        return;
      }

      // Max File Size Validation (50MB)
      const maxSizeBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        res.status(400).json({
          success: false,
          message: 'File size exceeds maximum allowed limit of 50MB.',
        });
        return;
      }

      const uploadsDir = path.join(process.cwd(), 'uploads', 'policies');
      await fs.mkdir(uploadsDir, { recursive: true });

      const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `attachment_${Date.now()}_${uuidv4().slice(0, 8)}_${cleanFileName}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      let checksum = '';
      if (file.buffer) {
        await fs.writeFile(filePath, file.buffer);
        checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
      }

      const relativeUrl = `/uploads/policies/${uniqueFileName}`;

      res.status(200).json({
        success: true,
        data: {
          fileUrl: relativeUrl,
          storagePath: relativeUrl,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype || fileExt,
          checksum: checksum,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/attachments
   */
  getAttachments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const versionId = req.query.versionId ? parseInt(req.query.versionId as string, 10) : undefined;
      const attachments = await this.policyService.getAttachments(req.ctx, id, versionId);
      res.json({
        success: true,
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/:id/attachments
   */
  addAttachmentRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);
      const attachment = await this.policyService.addAttachment(req.ctx, {
        ...req.body,
        policyDocumentId: policyId,
      });
      res.status(201).json({
        success: true,
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /policies/attachments/:attachmentId
   */
  deleteAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const attachmentId = parseInt(req.params.attachmentId, 10);
      await this.policyService.deleteAttachment(req.ctx, attachmentId);
      res.json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /policies/:id/attachments/:attachmentId/set-main
   */
  setMainAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);
      const attachmentId = parseInt(req.params.attachmentId, 10);
      await this.policyService.setMainAttachment(req.ctx, policyId, attachmentId);
      res.json({
        success: true,
        message: 'Main document updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/attachments/:attachmentId/download
   * Secure view/download endpoint for policy attachments
   */
  downloadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const attachmentId = parseInt(req.params.attachmentId, 10);

      const path = await import('path');
      const fs = await import('fs');
      const db = (await import('../../../db/knex')).getKnex();

      const attachment = await db('policy_attachments')
        .where('id', attachmentId)
        .where('organization_id', req.ctx.organizationId)
        .whereNull('deleted_at')
        .first();

      if (!attachment) {
        res.status(404).json({ success: false, message: 'Attachment not found or access denied' });
        return;
      }

      // Authorization Check: Verify user has access to the target policy
      const jwtRoles = (req.user as any)?.roles;
      const policyDocId = attachment.policy_document_id || attachment.policyDocumentId;
      const canAccess = await this.policyService.canUserAccessPolicy(req.ctx, policyDocId, jwtRoles);
      if (!canAccess) {
        res.status(403).json({ success: false, message: 'Access denied: You are not authorized to access files for this policy.' });
        return;
      }

      const storagePath = attachment.storage_path || attachment.storagePath;
      const relativeClean = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;
      const fullPath = path.join(process.cwd(), relativeClean);

      if (!fs.existsSync(fullPath)) {
        res.status(404).json({ success: false, message: 'Attachment file not found on server' });
        return;
      }

      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${attachment.file_name}"`);
      fs.createReadStream(fullPath).pipe(res);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/:id/initiate-esign
   * Initiate third-party E-Signature transaction for assigned exact policy version
   */
  initiateESignature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);
      const { returnUrl } = req.body || {};

      const result = await this.policyService.initiateESignature(req.ctx, policyId, returnUrl);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/signature-status
   * Get signature status for logged in employee on policy
   */
  getSignatureStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);

      const status = await this.policyService.getPolicySignatureStatus(req.ctx, policyId);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/signatures
   * HR Compliance list of signatures for a policy
   */
  listPolicySignatures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);

      const signatures = await this.policyService.listSignaturesForPolicy(req.ctx, policyId);
      res.status(200).json({
        success: true,
        data: signatures,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/signatures/:signatureId/download-signed
   * View/download signed PDF document
   */
  downloadSignedDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const signatureId = parseInt(req.params.signatureId, 10);

      const info = await this.policyService.getSignedDocumentInfo(req.ctx, signatureId);

      const path = await import('path');
      const fs = await import('fs');

      if (info.downloadUrl && info.downloadUrl.startsWith('/uploads/')) {
        const fullPath = path.join(process.cwd(), info.downloadUrl.slice(1));
        if (fs.existsSync(fullPath)) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${info.fileName}"`);
          fs.createReadStream(fullPath).pipe(res);
          return;
        }
      }

      // Dynamic placeholder signed PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${info.fileName}"`);
      res.status(200).send(`%PDF-1.4\n1 0 obj << /Title (${info.fileName}) /Author (${info.signature.userName || 'Employee'}) /Status (DIGITALLY_SIGNED) >> endobj\nxref\ntrailer << /Root 1 0 R >>\n%%EOF`);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/signatures/:signatureId/download-evidence
   * View/download signature certificate evidence
   */
  downloadSignedEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const signatureId = parseInt(req.params.signatureId, 10);

      const info = await this.policyService.getSignedEvidenceInfo(req.ctx, signatureId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${info.fileName}"`);
      res.status(200).send(`%PDF-1.4\n1 0 obj << /Title (Signature Evidence Certificate) /Provider (${info.signature.provider}) /TransactionId (${info.signature.providerTransactionId}) /SignedAt (${info.signature.signedAt}) /DocumentHash (${info.signature.documentHash}) >> endobj\nxref\ntrailer << /Root 1 0 R >>\n%%EOF`);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/integrations/esign/webhook
   * Public webhook endpoint for third-party E-Signature callbacks
   */
  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const result = await this.policyService.handleWebhook(req.headers, req.body, rawBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * ── POLICY QUERY CONTROLLER METHODS ──────────────────────────────────────
   */

  /**
   * POST /policies/:id/queries
   */
  submitPolicyQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);
      const { policyVersionId, policyVersion, question } = req.body;
      const jwtRoles = (req.user as any)?.roles;

      const query = await this.policyService.submitPolicyQuery(
        req.ctx,
        policyId,
        policyVersionId,
        policyVersion,
        question,
        jwtRoles
      );

      res.status(201).json({
        success: true,
        data: query,
        message: 'Query submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/my-queries
   */
  getMyQueries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const queries = await this.policyService.getUserPolicyQueries(req.ctx);
      res.status(200).json({
        success: true,
        data: queries,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/queries
   */
  getPolicyQueriesByPolicyId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policyId = parseInt(req.params.id, 10);
      const jwtRoles = (req.user as any)?.roles;

      const queries = await this.policyService.getPolicyQueriesByPolicyId(req.ctx, policyId, jwtRoles);
      res.status(200).json({
        success: true,
        data: queries,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/admin/queries
   */
  getAdminPolicyQueries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const statusFilter = req.query.status as string;

      const queries = await this.policyService.getAdminPolicyQueries(req.ctx, statusFilter);
      res.status(200).json({
        success: true,
        data: queries,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/queries/:queryId/reply
   */
  replyToPolicyQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const queryId = parseInt(req.params.queryId, 10);
      const { reply, status } = req.body;

      const updated = await this.policyService.replyToPolicyQuery(req.ctx, queryId, reply, status);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Reply submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const policyController = new PolicyController();

