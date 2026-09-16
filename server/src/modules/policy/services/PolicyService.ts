import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PolicyRepository } from '../repositories/PolicyRepository';
import { PolicyCategoryRepository, PolicyCategory } from '../repositories/PolicyCategoryRepository';
import { ESignatureProviderFactory } from '../integrations/ESignatureProviderFactory';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext } from '../../../db/types';
import type {
  CreatePolicyDTO,
  UpdatePolicyDTO,
  PolicyWithStats,
  UserPolicyView,
  EmployeePolicyAcceptance,
} from '../policy.types';
import { NotFoundError, ValidationError } from '../../../common/errors';
import { getKnex } from '../../../db/knex';

export class PolicyService {
  private policyRepo: PolicyRepository;
  private categoryRepo: PolicyCategoryRepository;

  constructor() {
    this.policyRepo = new PolicyRepository();
    this.categoryRepo = new PolicyCategoryRepository();
  }

  /**
   * List all policies (Admin/HR view)
   */
  async listPolicies(ctx: TenantContext): Promise<PolicyWithStats[]> {
    return this.policyRepo.listAllWithMappings(ctx);
  }

  /**
   * Get single policy by ID
   */
  async getPolicyById(ctx: TenantContext, id: number): Promise<PolicyWithStats> {
    const policy = await this.policyRepo.getById(ctx, id);
    if (!policy) {
      throw new NotFoundError('Policy document not found');
    }
    return policy;
  }

  /**
   * Create policy document
   */
  async createPolicy(ctx: TenantContext, input: any): Promise<PolicyWithStats> {
    if (!input.title || !input.title.trim()) {
      throw new ValidationError('Policy title is required');
    }

    // 1. Normalize fileUrl if missing
    let fileUrl = input.fileUrl;
    if (!fileUrl) {
      if (input.sections && Array.isArray(input.sections) && input.sections.length > 0) {
        fileUrl = JSON.stringify(input.sections);
      } else if (input.description && input.description.trim()) {
        fileUrl = input.description.trim();
      } else {
        fileUrl = 'Governance Policy Document';
      }
    }

    // 2. Normalize roleMappings if missing from assignments array
    let roleMappings = input.roleMappings;
    if (!roleMappings || !Array.isArray(roleMappings) || roleMappings.length === 0) {
      if (input.assignments && Array.isArray(input.assignments)) {
        roleMappings = input.assignments
          .filter((a: any) => a.targetType === 'role' || !a.targetType)
          .map((a: any) => ({
            roleCode: a.targetId,
            isMandatory: input.requireAcknowledgement !== false,
          }));
      }
    }
    if (!roleMappings || roleMappings.length === 0) {
      roleMappings = [{ roleCode: 'all', isMandatory: true }];
    }

    // 3. Normalize department assignments if present in assignments
    let applicableDepartmentIds = input.applicableDepartmentIds;
    if ((!applicableDepartmentIds || applicableDepartmentIds.length === 0) && input.assignments) {
      applicableDepartmentIds = input.assignments
        .filter((a: any) => a.targetType === 'department')
        .map((a: any) => String(a.targetId))
        .filter((id: string) => id !== 'all');
    }

    // 4. Normalize employee assignments
    let applicableEmployeeIds = input.applicableEmployeeIds;
    if ((!applicableEmployeeIds || applicableEmployeeIds.length === 0) && input.assignments) {
      applicableEmployeeIds = input.assignments
        .filter((a: any) => a.targetType === 'employee')
        .map((a: any) => String(a.targetId))
        .filter((id: string) => id !== 'all');
    }

    // 5. Normalize designation assignments
    let applicableDesignationIds = input.applicableDesignationIds;
    if ((!applicableDesignationIds || applicableDesignationIds.length === 0) && input.assignments) {
      applicableDesignationIds = input.assignments
        .filter((a: any) => a.targetType === 'designation')
        .map((a: any) => String(a.targetId))
        .filter((id: string) => id !== 'all');
    }

    // 6. Custom Scope
    const customScope = input.customScope || {};
    if (input.assignments) {
      const customAssignments = input.assignments.filter((a: any) => a.targetType === 'custom' || a.targetType === 'location');
      if (customAssignments.length > 0) {
        customScope.assignments = customAssignments;
      }
    }

    const isActive = input.status === 'draft' ? false : (input.isActive !== undefined ? Boolean(input.isActive) : true);

    return this.policyRepo.create(ctx, {
      ...input,
      title: input.title.trim(),
      category: input.category || 'General',
      fileUrl: fileUrl,
      version: input.version || '1.0',
      isActive: isActive,
      applicableDepartmentIds: applicableDepartmentIds || [],
      applicableEmployeeIds: applicableEmployeeIds || [],
      applicableDesignationIds: applicableDesignationIds || [],
      customScope: customScope,
      roleMappings: roleMappings,
    });
  }

  /**
   * Update policy document
   */
  async updatePolicy(ctx: TenantContext, id: number, input: any): Promise<PolicyWithStats> {
    let fileUrl = input.fileUrl;
    if (!fileUrl && input.sections && Array.isArray(input.sections) && input.sections.length > 0) {
      fileUrl = JSON.stringify(input.sections);
    }

    let roleMappings = input.roleMappings;
    if ((!roleMappings || roleMappings.length === 0) && input.assignments) {
      roleMappings = input.assignments
        .filter((a: any) => a.targetType === 'role' || !a.targetType)
        .map((a: any) => ({
          roleCode: a.targetId,
          isMandatory: input.requireAcknowledgement !== false,
        }));
    }

    let applicableDepartmentIds = input.applicableDepartmentIds;
    if ((!applicableDepartmentIds || applicableDepartmentIds.length === 0) && input.assignments) {
      applicableDepartmentIds = input.assignments
        .filter((a: any) => a.targetType === 'department')
        .map((a: any) => String(a.targetId))
        .filter((id: string) => id !== 'all');
    }

    let applicableEmployeeIds = input.applicableEmployeeIds;
    if ((!applicableEmployeeIds || applicableEmployeeIds.length === 0) && input.assignments) {
      applicableEmployeeIds = input.assignments
        .filter((a: any) => a.targetType === 'employee')
        .map((a: any) => String(a.targetId))
        .filter((id: string) => id !== 'all');
    }

    let applicableDesignationIds = input.applicableDesignationIds;
    if ((!applicableDesignationIds || applicableDesignationIds.length === 0) && input.assignments) {
      applicableDesignationIds = input.assignments
        .filter((a: any) => a.targetType === 'designation')
        .map((a: any) => String(a.targetId))
        .filter((id: string) => id !== 'all');
    }

    const updated = await this.policyRepo.update(ctx, id, {
      ...input,
      fileUrl: fileUrl,
      roleMappings: roleMappings,
      applicableDepartmentIds: applicableDepartmentIds,
      applicableEmployeeIds: applicableEmployeeIds,
      applicableDesignationIds: applicableDesignationIds,
      customScope: input.customScope,
    });
    if (!updated) {
      throw new NotFoundError('Policy document not found');
    }
    return updated;
  }

  /**
   * Dynamic Master Target Options Endpoint
   * Fetches all available Roles, Departments, Employees, Designations, Locations,
   * Employee Types, Shifts, and Reporting Managers from the database.
   */
  async getTargetOptions(ctx: TenantContext) {
    const db = getKnex();

    const [roles, departments, employees, designations, locations] = await Promise.all([
      db('roles')
        .where((b) => {
          b.where('organization_id', ctx.organizationId)
            .orWhere('is_platform_role', true);
        })
        .whereNull('deleted_at')
        .select('id', 'name', 'code', 'description')
        .catch(() => []),

      db('departments')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'name', 'code')
        .catch(() => []),

      db('employees as e')
        .leftJoin('users as u', 'u.employee_id', 'e.id')
        .where('e.organization_id', ctx.organizationId)
        .whereNull('e.deleted_at')
        .select(
          'e.id',
          'e.first_name',
          'e.last_name',
          'e.employee_code',
          'e.current_department_id',
          'e.current_designation_id',
          'e.employment_type',
          db.raw('COALESCE(e.email, u.email) as email')
        )
        .catch((err) => {
          console.error('Failed to query employees in getTargetOptions:', err);
          return [];
        }),

      db('designations')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'name', 'code')
        .catch(() => []),

      db('locations')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'name', 'code', 'city')
        .catch(() => []),
    ]);

    // Check optional employee_types table or extract distinct employment types
    let employeeTypes: any[] = [];
    try {
      const hasEmpTypeTable = await db.schema.hasTable('employee_types');
      if (hasEmpTypeTable) {
        employeeTypes = await db('employee_types')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .select('id', 'name', 'code');
      } else {
        const distinctTypes = await db('employees')
          .where('organization_id', ctx.organizationId)
          .whereNotNull('employment_type')
          .distinct('employment_type as name');
        employeeTypes = distinctTypes
          .filter((t: any) => Boolean(t.name))
          .map((t: any, idx: number) => ({
            id: `emp_type_${idx + 1}`,
            name: String(t.name),
            code: String(t.name || '').toLowerCase().replace(/\s+/g, '_'),
          }));
      }
    } catch (e) {
      employeeTypes = [];
    }

    // Check optional shifts table
    let shifts: any[] = [];
    try {
      const hasShiftTemplates = await db.schema.hasTable('shift_templates');
      const hasWorkShifts = await db.schema.hasTable('work_shifts');
      const tableToQuery = hasShiftTemplates ? 'shift_templates' : (hasWorkShifts ? 'work_shifts' : null);
      if (tableToQuery) {
        shifts = await db(tableToQuery)
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .select('id', 'name', 'code');
      }
    } catch (e) {
      shifts = [];
    }

    // Reporting Managers (distinct active employees that are assigned as manager)
    let reportingManagers: any[] = [];
    try {
      const mgrIds = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNotNull('reporting_manager_id')
        .distinct('reporting_manager_id as id');
      const idList = mgrIds.map((r: any) => r.id).filter(Boolean);
      if (idList.length > 0) {
        reportingManagers = await db('employees')
          .whereIn('id', idList)
          .whereNull('deleted_at')
          .select('id', 'first_name', 'last_name', 'email');
      }
    } catch (e) {
      reportingManagers = [];
    }

    return {
      roles: roles.map((r: any) => ({
        id: r.id,
        name: r.name || r.code,
        code: r.code || String(r.id),
        description: r.description || '',
      })),
      departments: departments.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code || String(d.id),
      })),
      employees: employees.map((e: any) => ({
        id: e.id,
        first_name: e.first_name || '',
        last_name: e.last_name || '',
        name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || `Employee #${e.id}`,
        email: e.email || '',
        employee_code: e.employee_code || String(e.id),
        employee_id: e.employee_code || String(e.id),
        department_id: e.current_department_id,
        designation_id: e.current_designation_id,
        employment_type: e.employment_type,
      })),
      designations: designations.map((des: any) => ({
        id: des.id,
        name: des.name,
        code: des.code || String(des.id),
      })),
      locations: locations.map((loc: any) => ({
        id: loc.id,
        name: loc.name || loc.city,
        code: loc.code || String(loc.id),
        city: loc.city,
      })),
      employeeTypes: employeeTypes.map((et: any) => ({
        id: et.id,
        name: et.name,
        code: et.code || String(et.id),
      })),
      shifts: shifts.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code || String(s.id),
      })),
      reportingManagers: reportingManagers.map((m: any) => ({
        id: m.id,
        name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
        email: m.email,
      })),
    };
  }

  /**
   * Delete policy document
   */
  async deletePolicy(ctx: TenantContext, id: number): Promise<void> {
    const success = await this.policyRepo.delete(ctx, id);
    if (!success) {
      throw new NotFoundError('Policy document not found');
    }
  }

  /**
   * Dynamic Category Management
   */
  async listCategories(ctx: TenantContext): Promise<PolicyCategory[]> {
    return this.categoryRepo.listAll(ctx);
  }

  async createCategory(ctx: TenantContext, name: string, description?: string): Promise<PolicyCategory> {
    if (!name || !name.trim()) {
      throw new ValidationError('Category name is required');
    }
    return this.categoryRepo.create(ctx, name, description);
  }

  async deleteCategory(ctx: TenantContext, id: number): Promise<void> {
    const success = await this.categoryRepo.delete(ctx, id);
    if (!success) {
      throw new NotFoundError('Category not found');
    }
  }

  /**
   * Resolve user roles from DB or JWT
   */
  async getUserRoleCodes(organizationId: number, userId: number, jwtRoles?: string[]): Promise<string[]> {
    try {
      const db = getKnex();
      const roles = await db('user_roles as ur')
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('ur.organization_id', organizationId)
        .where('ur.user_id', userId)
        .where((query) => query.whereNull('ur.expires_at').orWhere('ur.expires_at', '>', db.fn.now()))
        .pluck('r.code');

      if (roles && roles.length > 0) {
        return Array.from(new Set(roles.map((r) => String(r).toLowerCase())));
      }
    } catch (err) {
      console.warn('Failed to query user roles from DB, falling back to JWT:', err);
    }

    if (jwtRoles && jwtRoles.length > 0) {
      return Array.from(new Set(jwtRoles.map((r) => String(r).toLowerCase())));
    }

    return ['employee'];
  }

  /**
   * Get all policies applicable to the logged-in user
   */
  async getMyPolicies(ctx: TenantContext, jwtRoles?: string[]): Promise<UserPolicyView[]> {
    const roleCodes = await this.getUserRoleCodes(ctx.organizationId, ctx.userId, jwtRoles);
    return this.policyRepo.getUserPoliciesWithAcceptance(ctx, ctx.userId, roleCodes);
  }

  /**
   * Get pending mandatory policies for logged in user
   */
  async getPendingPolicies(ctx: TenantContext, jwtRoles?: string[]): Promise<UserPolicyView[]> {
    const roleCodes = await this.getUserRoleCodes(ctx.organizationId, ctx.userId, jwtRoles);
    return this.policyRepo.getPendingMandatoryPolicies(ctx, ctx.userId, roleCodes);
  }

  /**
   * Record user acceptance of a policy
   */
  async acceptPolicy(
    ctx: TenantContext,
    policyId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmployeePolicyAcceptance> {
    return this.policyRepo.recordAcceptance(ctx, policyId, ctx.userId, ipAddress, userAgent);
  }

  /**
   * Get attachments for a policy
   */
  async getAttachments(ctx: TenantContext, policyId: number, versionId?: number) {
    const policy = await this.policyRepo.getById(ctx, policyId);
    if (!policy) {
      throw new NotFoundError('Policy document not found');
    }
    return this.policyRepo.getAttachmentsForPolicy(ctx, policyId, versionId);
  }

  /**
   * Create an attachment record for a policy
   */
  async addAttachment(ctx: TenantContext, input: {
    policyDocumentId: number;
    policyVersionId?: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    checksum?: string;
    isMainDocument?: boolean;
    buffer?: Buffer;
  }) {
    const policy = await this.policyRepo.getById(ctx, input.policyDocumentId);
    if (!policy) {
      throw new NotFoundError('Policy document not found');
    }

    // Server-side Format & Size Validation
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = input.fileName.substring(input.fileName.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new ValidationError(`File format '${ext}' is not supported. Allowed formats: PDF, DOC, DOCX, JPG, JPEG, PNG`);
    }

    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (input.fileSize > maxSizeBytes) {
      throw new ValidationError('File size exceeds the 50MB limit.');
    }

    let checksum = input.checksum;
    if (!checksum && input.buffer) {
      const crypto = await import('crypto');
      checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
    }

    return this.policyRepo.createAttachment(ctx, {
      ...input,
      checksum: checksum || '',
    });
  }

  /**
   * Check if a user can access a policy (Admin/HR or assigned employee)
   */
  async canUserAccessPolicy(ctx: TenantContext, policyDocumentId: number, jwtRoles?: string[]): Promise<boolean> {
    const roleCodes = await this.getUserRoleCodes(ctx.organizationId, ctx.userId, jwtRoles);
    const isAdminOrHr = roleCodes.some((r) =>
      ['super_admin', 'superadmin', 'admin', 'hr', 'hr_manager', 'hr_admin'].includes(r.toLowerCase())
    );
    if (isAdminOrHr) return true;

    const userPolicies = await this.policyRepo.getUserPoliciesWithAcceptance(ctx, ctx.userId, roleCodes);
    return userPolicies.some((p) => p.id === policyDocumentId);
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(ctx: TenantContext, attachmentId: number): Promise<void> {
    const attachment = await this.policyRepo.getAttachmentById(ctx, attachmentId);
    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    const isPublished = await this.policyRepo.isVersionPublished(ctx, attachment.policyDocumentId);
    if (isPublished) {
      throw new ValidationError('Attachments of a published policy version are immutable. Create a new policy version to update attachments.');
    }

    const success = await this.policyRepo.deleteAttachment(ctx, attachmentId);
    if (!success) {
      throw new NotFoundError('Attachment not found');
    }
  }

  /**
   * Set an attachment as main document
   */
  async setMainAttachment(ctx: TenantContext, policyId: number, attachmentId: number): Promise<void> {
    const success = await this.policyRepo.setMainAttachment(ctx, policyId, attachmentId);
    if (!success) {
      throw new NotFoundError('Attachment or policy not found');
    }
  }

  /**
   * Get policy compliance audit
   */
  async getPolicyAudit(ctx: TenantContext, policyId: number) {
    const audit = await this.policyRepo.getPolicyAudit(ctx, policyId);
    if (!audit) {
      throw new NotFoundError('Policy document not found');
    }
    return audit;
  }

  /**
   * Get version history for policy document
   */
  async getVersionHistory(ctx: TenantContext, policyId: number) {
    const policy = await this.policyRepo.getById(ctx, policyId);
    if (!policy) {
      throw new NotFoundError('Policy document not found');
    }
    return this.policyRepo.getVersionHistory(ctx, policyId);
  }

  /**
   * ── E-SIGNATURE INTEGRATION METHODS ──────────────────────────────────────
   */

  /**
   * Initiate an E-Signature request for assigned exact policy version
   */
  async initiateESignature(ctx: TenantContext, policyId: number, returnUrl?: string) {
    const policy = await this.policyRepo.getById(ctx, policyId);
    if (!policy) {
      throw new NotFoundError('Policy document not found');
    }

    const sigMode = policy.signatureMode || (policy as any).signature_mode || 'ACKNOWLEDGEMENT';
    if (sigMode === 'NONE') {
      throw new ValidationError('This policy document does not require signatures');
    }

    const knex = getKnex();
    const user = await knex('users').where('id', ctx.userId).first();
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const employeeId = user.employee_id || user.employeeId || null;
    let signerName = user.email ? user.email.split('@')[0] : 'Employee';
    let signerEmail = user.email || 'employee@company.com';

    if (employeeId) {
      const emp = await knex('employees').where('id', employeeId).first();
      if (emp) {
        signerName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || signerName;
        signerEmail = emp.work_email || emp.personal_email || user.email || signerEmail;
      }
    }

    // Get latest published version record for this policy document
    const versions = await this.policyRepo.getVersionHistory(ctx, policyId);
    const currentVersionRecord = versions[0];
    const policyVersionId = currentVersionRecord ? currentVersionRecord.id : null;
    const exactVersion = policy.version;

    // Check if mode is BOTH: require acknowledgement first before unlocking e-sign
    if (sigMode === 'BOTH') {
      const existingAcc = await knex('employee_policy_acceptances')
        .where('user_id', ctx.userId)
        .where('policy_document_id', policyId)
        .where('policy_version', exactVersion)
        .first();

      if (!existingAcc) {
        throw new ValidationError('You must check and acknowledge the policy before completing the E-Signature step.');
      }
    }

    // Check existing signature status
    const existingSig = await this.policyRepo.getSignatureByUserAndPolicyVersion(
      ctx,
      ctx.userId,
      policyId,
      policyVersionId
    );

    if (existingSig && existingSig.status === 'SIGNED') {
      return {
        alreadySigned: true,
        signature: existingSig,
        message: 'Policy has already been signed.',
      };
    }

    const transactionId = `esign_tx_${uuidv4()}`;
    const providerInstance = ESignatureProviderFactory.getProvider();
    const providerName = providerInstance.getProviderName();

    const documentPathOrUrl = policy.mainAttachment?.storagePath || policy.fileUrl || 'policy_document.pdf';

    const signingResult = await providerInstance.createSigningRequest({
      transactionId,
      policyId,
      policyVersionId,
      policyTitle: policy.title,
      policyVersion: exactVersion,
      signerName,
      signerEmail,
      documentPathOrUrl,
      returnUrl,
    });

    const createdRecord = await this.policyRepo.createSignatureRecord(ctx, {
      policyDocumentId: policyId,
      policyVersionId,
      userId: ctx.userId,
      employeeId,
      provider: providerName,
      providerTransactionId: transactionId,
      status: signingResult.status || 'PENDING',
      authenticationMethod: 'DIRECT_AUTH',
      providerMetadata: signingResult.rawResponse,
    });

    // Log central audit event
    const auditService = new AuditService();
    await auditService.log(ctx, {
      action: 'SIGNATURE_INITIATED',
      entityType: 'POLICY_SIGNATURE',
      entityId: createdRecord.id,
      afterState: {
        policyId,
        policyVersion: exactVersion,
        transactionId,
        provider: providerName,
        status: createdRecord.status,
      },
    });

    return {
      alreadySigned: false,
      transactionId,
      provider: providerName,
      signingUrl: signingResult.signingUrl,
      status: createdRecord.status,
      signature: createdRecord,
    };
  }

  /**
   * Get E-Signature status for current user on policy
   */
  async getPolicySignatureStatus(ctx: TenantContext, policyId: number) {
    const policy = await this.policyRepo.getById(ctx, policyId);
    if (!policy) {
      throw new NotFoundError('Policy not found');
    }

    const versions = await this.policyRepo.getVersionHistory(ctx, policyId);
    const policyVersionId = versions[0]?.id || null;

    const signature = await this.policyRepo.getSignatureByUserAndPolicyVersion(
      ctx,
      ctx.userId,
      policyId,
      policyVersionId
    );

    return {
      signatureMode: policy.signatureMode || (policy as any).signature_mode || 'ACKNOWLEDGEMENT',
      policyVersion: policy.version,
      signature: signature || null,
      isSigned: signature?.status === 'SIGNED',
    };
  }

  /**
   * Process Provider Webhook Callback securely
   */
  async handleWebhook(headers: Record<string, any>, body: any, rawBody?: string) {
    const providerInstance = ESignatureProviderFactory.getProvider();
    const verification = await providerInstance.verifyWebhookSignature(headers, body, rawBody);

    if (!verification.isValid) {
      throw new ValidationError('Invalid provider webhook signature or authentication');
    }

    const transactionId = verification.transactionId || body.transactionId || body.providerTransactionId || body.envelopeId;
    if (!transactionId) {
      throw new ValidationError('Missing transaction identifier in webhook payload');
    }

    const signature = await this.policyRepo.getSignatureByTransactionId(transactionId);
    if (!signature) {
      return { success: false, message: `No policy signature transaction found for ID ${transactionId}` };
    }

    const newStatus = verification.status || (body.status || 'SIGNED').toUpperCase();

    // Prevent duplicate webhook processing if already signed
    if (signature.status === 'SIGNED' && newStatus === 'SIGNED') {
      return { success: true, message: 'Webhook already processed (idempotent)', transactionId };
    }

    const knex = getKnex();
    const now = new Date();
    let documentHash = signature.documentHash;
    let signedDocRef = signature.signedDocumentRef;
    let evidenceRef = signature.evidenceRef;

    if (newStatus === 'SIGNED') {
      // Calculate SHA-256 document hash
      const hashContent = `${transactionId}:${signature.policyDocumentId}:${signature.userId}:${now.toISOString()}`;
      documentHash = crypto.createHash('sha256').update(hashContent).digest('hex');

      // Generate signed document & evidence reference paths
      signedDocRef = `signed_policies/signed_${signature.policyDocumentId}_${signature.userId}_${transactionId}.pdf`;
      evidenceRef = `signed_policies/evidence_${signature.policyDocumentId}_${signature.userId}_${transactionId}.pdf`;

      // Auto-record policy acceptance in employee_policy_acceptances
      const user = await knex('users').where('id', signature.userId).first();
      const policyDoc = await knex('policy_documents').where('id', signature.policyDocumentId).first();

      const existingAcc = await knex('employee_policy_acceptances')
        .where({
          user_id: signature.userId,
          policy_document_id: signature.policyDocumentId,
          policy_version: policyDoc?.version || '1.0',
        })
        .first();

      if (!existingAcc) {
        await knex('employee_policy_acceptances').insert({
          uuid: uuidv4(),
          organization_id: signature.organizationId,
          company_id: signature.companyId || null,
          employee_id: signature.employeeId || user?.employee_id || null,
          user_id: signature.userId,
          policy_document_id: signature.policyDocumentId,
          policy_version: policyDoc?.version || '1.0',
          accepted_at: now,
          ip_address: headers['x-forwarded-for'] || 'PROVIDER_WEBHOOK',
          user_agent: 'ESIGN_PROVIDER_WEBHOOK',
          created_at: now,
          updated_at: now,
        });
      }
    }

    await this.policyRepo.updateSignatureRecord(transactionId, {
      status: newStatus,
      signedAt: newStatus === 'SIGNED' ? now : null,
      documentHash,
      signedDocumentRef: signedDocRef,
      evidenceRef,
      providerMetadata: body,
    });

    // Audit log
    const auditService = new AuditService();
    const ctx: TenantContext = {
      organizationId: signature.organizationId,
      companyId: signature.companyId || undefined,
      userId: signature.userId,
    };

    const auditAction = newStatus === 'SIGNED' ? 'SIGNATURE_COMPLETED' : `SIGNATURE_${newStatus}`;
    await auditService.log(ctx, {
      action: auditAction,
      entityType: 'POLICY_SIGNATURE',
      entityId: signature.id,
      beforeState: { status: signature.status },
      afterState: {
        status: newStatus,
        transactionId,
        signedAt: now,
        documentHash,
      },
    });

    if (newStatus === 'SIGNED') {
      await auditService.log(ctx, {
        action: 'SIGNED_DOCUMENT_RECEIVED',
        entityType: 'POLICY_SIGNATURE',
        entityId: signature.id,
        afterState: { signedDocRef, evidenceRef, documentHash },
      });
    }

    return {
      success: true,
      transactionId,
      status: newStatus,
      message: `Successfully processed signature status ${newStatus}`,
    };
  }

  /**
   * Stream / download signed document
   */
  async getSignedDocumentInfo(ctx: TenantContext, signatureId: number) {
    const sig = await this.policyRepo.getSignatureById(ctx, signatureId);
    if (!sig) {
      throw new NotFoundError('Signature record not found');
    }

    const policy = await this.policyRepo.getById(ctx, sig.policyDocumentId);
    return {
      signature: sig,
      policy,
      downloadUrl: policy.mainAttachment?.storagePath || policy.fileUrl,
      fileName: `Signed_${policy.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${policy.version}.pdf`,
    };
  }

  /**
   * Stream / download evidence certificate
   */
  async getSignedEvidenceInfo(ctx: TenantContext, signatureId: number) {
    const sig = await this.policyRepo.getSignatureById(ctx, signatureId);
    if (!sig) {
      throw new NotFoundError('Signature record not found');
    }

    const policy = await this.policyRepo.getById(ctx, sig.policyDocumentId);
    return {
      signature: sig,
      policy,
      fileName: `Evidence_Certificate_${policy.title.replace(/[^a-zA-Z0-9]/g, '_')}_${sig.providerTransactionId}.pdf`,
    };
  }

  /**
   * List all signatures for a policy (HR Compliance view)
   */
  async listSignaturesForPolicy(ctx: TenantContext, policyId: number) {
    return this.policyRepo.listSignaturesForPolicy(ctx, policyId);
  }
}

