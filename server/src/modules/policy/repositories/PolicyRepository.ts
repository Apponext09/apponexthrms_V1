import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import type {
  PolicyDocument,
  PolicyRoleMapping,
  EmployeePolicyAcceptance,
  CreatePolicyDTO,
  UpdatePolicyDTO,
  PolicyWithStats,
  UserPolicyView,
  PolicyVersionHistoryRecord,
  PolicyAttachment,
  PolicyAttachmentInput,
  PolicySignature,
  PolicyQuery,
  PolicyQueryStatus,
} from '../policy.types';
import { v4 as uuidv4 } from 'uuid';

function parseDeptIds(val: any): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(Number);
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch (e) {
    return [];
  }
}

function parseIds(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (e) {
    return [];
  }
}

function parseJsonObj(val: any): Record<string, any> {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return {};
  }
}

export function normalizeVersion(v: any): string {
  if (!v) return '';
  return String(v).trim().toLowerCase().replace(/^v/, '');
}

export function expandRoleCodes(roleCodes: string[]): string[] {
  const expanded = new Set<string>();
  for (const r of roleCodes) {
    const norm = String(r || '').toLowerCase().trim();
    if (!norm) continue;
    expanded.add(norm);

    if (['organization_admin', 'org_admin', 'ceo', 'admin'].includes(norm)) {
      expanded.add('organization_admin');
      expanded.add('org_admin');
      expanded.add('ceo');
      expanded.add('admin');
    }
    // All HR codes are aliases — 'hr' is canonical, others kept for DB backward compat
    if (['hr', 'hr_admin', 'hr_manager', 'support'].includes(norm)) {
      expanded.add('hr');
      expanded.add('hr_admin');
      expanded.add('hr_manager');
      expanded.add('support');
    }
    if (['department_head', 'manager', 'dept_head', 'dept_manager'].includes(norm)) {
      expanded.add('department_head');
      expanded.add('manager');
      expanded.add('dept_head');
      expanded.add('dept_manager');
    }
    if (['team_lead', 'teamlead', 'lead'].includes(norm)) {
      expanded.add('team_lead');
      expanded.add('teamlead');
      expanded.add('lead');
    }
  }
  expanded.add('all');
  return Array.from(expanded);
}

export class PolicyRepository {
  private get db() {
    return getKnex();
  }

  /**
   * List all policies in organization (Admin/HR view)
   */
  async listAllWithMappings(ctx: TenantContext): Promise<PolicyWithStats[]> {
    const policies = await this.db('policy_documents')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');

    if (policies.length === 0) return [];

    const policyIds = policies.map((p) => p.id);

    // Fetch role mappings
    const mappings = await this.db('policy_document_role_mappings')
      .where('organization_id', ctx.organizationId)
      .whereIn('policy_document_id', policyIds)
      .whereNull('deleted_at');

    // Fetch acceptances
    const acceptances = await this.db('employee_policy_acceptances')
      .where('organization_id', ctx.organizationId)
      .whereIn('policy_document_id', policyIds);

    // Get total active users per role for stats
    const userRoleCounts = await this.db('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.organization_id', ctx.organizationId)
      .groupBy('r.code')
      .select('r.code as role_code')
      .countDistinct('ur.user_id as user_count');

    const roleCountMap = new Map<string, number>();
    for (const r of userRoleCounts) {
      const code = String(r.roleCode || r.role_code || '').toLowerCase();
      const count = Number(r.userCount || r.user_count) || 0;
      if (code) roleCountMap.set(code, count);
    }

    return policies.map((policy) => {
      const pId = policy.id;
      const pVersion = policy.version;

      const pMappings = mappings.filter((m) => (m.policyDocumentId || m.policy_document_id) === pId);
      const pAcceptances = acceptances.filter(
        (a) =>
          (a.policyDocumentId || a.policy_document_id) === pId &&
          (!a.policyVersion || !a.policy_version || normalizeVersion(a.policyVersion || a.policy_version) === normalizeVersion(pVersion))
      );

      // Calculate distinct target users
      const mappedRoleCodes = new Set<string>();
      pMappings.forEach((m) => {
        const code = String(m.roleCode || m.role_code || '').toLowerCase();
        if (code) mappedRoleCodes.add(code);
      });

      let totalTargetUsers = 0;
      if (mappedRoleCodes.has('all')) {
        const allCount = Array.from(roleCountMap.values()).reduce((sum, c) => sum + c, 0);
        totalTargetUsers = allCount || 1;
      } else {
        mappedRoleCodes.forEach((role) => {
          totalTargetUsers += roleCountMap.get(role) || 0;
        });
      }

      const acceptedUsers = new Set(pAcceptances.map((a) => a.userId || a.user_id)).size;
      const pendingUsers = Math.max(0, totalTargetUsers - acceptedUsers);
      const compliancePercentage =
        totalTargetUsers > 0
          ? Math.min(100, Math.round((acceptedUsers / totalTargetUsers) * 100))
          : 100;

      return {
        id: policy.id,
        uuid: policy.uuid,
        organizationId: policy.organizationId || policy.organization_id,
        companyId: policy.companyId || policy.company_id,
        title: policy.title,
        description: policy.description,
        category: policy.category,
        fileUrl: policy.fileUrl || policy.file_url,
        fileName: policy.fileName || policy.file_name,
        fileSize: policy.fileSize || policy.file_size,
        fileType: policy.fileType || policy.file_type,
        version: policy.version,
        isActive: Boolean(policy.isActive !== undefined ? policy.isActive : policy.is_active),
        applicableGender: policy.applicableGender || policy.applicable_gender || 'all',
        applicableDepartmentIds: parseDeptIds(policy.applicableDepartmentIds || policy.applicable_department_ids),
        createdBy: policy.createdBy || policy.created_by,
        updatedBy: policy.updatedBy || policy.updated_by,
        createdAt: policy.createdAt || policy.created_at,
        updatedAt: policy.updatedAt || policy.updated_at,
        deletedAt: policy.deletedAt || policy.deleted_at,
        roleMappings: pMappings.map((m) => ({
          roleCode: m.roleCode || m.role_code,
          isMandatory: Boolean(m.isMandatory !== undefined ? m.isMandatory : m.is_mandatory),
        })),
        stats: {
          totalTargetUsers,
          acceptedUsers,
          pendingUsers,
          compliancePercentage,
        },
      };
    });
  }

  /**
   * Helper to fetch attachments for a policy or specific version
   */
  async getAttachmentsForPolicy(
    ctx: TenantContext,
    policyDocumentId: number,
    versionId?: number
  ): Promise<PolicyAttachment[]> {
    let query = this.db('policy_attachments as pa')
      .leftJoin('users as u', 'pa.uploaded_by', 'u.id')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .where('pa.organization_id', ctx.organizationId)
      .where('pa.policy_document_id', policyDocumentId)
      .whereNull('pa.deleted_at');

    if (versionId) {
      query = query.where('pa.policy_version_id', versionId);
    }

    const records = await query
      .select(
        'pa.id',
        'pa.uuid',
        'pa.organization_id as organizationId',
        'pa.company_id as companyId',
        'pa.policy_document_id as policyDocumentId',
        'pa.policy_version_id as policyVersionId',
        'pa.file_name as fileName',
        'pa.file_type as fileType',
        'pa.file_size as fileSize',
        'pa.storage_path as storagePath',
        'pa.checksum',
        'pa.is_main_document as isMainDocument',
        'pa.uploaded_by as uploadedBy',
        'pa.uploaded_at as uploadedAt',
        'pa.created_at as createdAt',
        this.db.raw("CONCAT_WS(' ', e.first_name, e.last_name) as uploadedByName")
      )
      .orderBy('pa.is_main_document', 'desc')
      .orderBy('pa.created_at', 'asc');

    return records.map((r: any) => ({
      ...r,
      organizationId: r.organizationId || r.organization_id,
      companyId: r.companyId || r.company_id,
      policyDocumentId: r.policyDocumentId || r.policy_document_id,
      policyVersionId: r.policyVersionId || r.policy_version_id,
      fileName: r.fileName || r.file_name,
      fileType: r.fileType || r.file_type,
      fileSize: Number(r.fileSize || r.file_size || 0),
      storagePath: r.storagePath || r.storage_path,
      checksum: r.checksum || '',
      isMainDocument: Boolean(r.isMainDocument !== undefined ? r.isMainDocument : r.is_main_document),
      uploadedBy: r.uploadedBy || r.uploaded_by,
      uploadedByName: r.uploadedByName || 'HR Admin',
      uploadedAt: r.uploadedAt || r.uploaded_at,
      createdAt: r.createdAt || r.created_at,
    }));
  }

  /**
   * Get single attachment by ID
   */
  async getAttachmentById(ctx: TenantContext, attachmentId: number): Promise<PolicyAttachment | null> {
    const r = await this.db('policy_attachments')
      .where('id', attachmentId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!r) return null;

    return {
      id: r.id,
      uuid: r.uuid,
      organizationId: r.organization_id,
      companyId: r.company_id,
      policyDocumentId: r.policy_document_id,
      policyVersionId: r.policy_version_id,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSize: Number(r.file_size || 0),
      storagePath: r.storage_path,
      checksum: r.checksum || '',
      isMainDocument: Boolean(r.is_main_document),
      uploadedBy: r.uploaded_by,
      uploadedAt: r.uploaded_at,
      createdAt: r.created_at,
    };
  }

  /**
   * Check if policy document version is published (active)
   */
  async isVersionPublished(ctx: TenantContext, policyDocumentId: number): Promise<boolean> {
    const policy = await this.db('policy_documents')
      .where('id', policyDocumentId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!policy) return false;
    return Boolean(policy.is_active || policy.isActive);
  }

  /**
   * Create a single attachment record
   */
  async createAttachment(ctx: TenantContext, input: any): Promise<PolicyAttachment> {
    const validUserId = await this.getValidUserId(this.db, ctx);
    const uuid = uuidv4();
    const [id] = await this.db('policy_attachments').insert({
      uuid,
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      policy_document_id: input.policyDocumentId,
      policy_version_id: input.policyVersionId || null,
      file_name: input.fileName,
      file_type: input.fileType,
      file_size: input.fileSize,
      storage_path: input.storagePath,
      checksum: input.checksum || '',
      is_main_document: Boolean(input.isMainDocument),
      uploaded_by: validUserId,
      uploaded_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // If set as main document, unset main on other attachments for this policy
    if (input.isMainDocument) {
      await this.db('policy_attachments')
        .where('organization_id', ctx.organizationId)
        .where('policy_document_id', input.policyDocumentId)
        .whereNot('id', id)
        .update({ is_main_document: false, updated_at: new Date() });

      // Update main policy document record
      await this.db('policy_documents')
        .where('id', input.policyDocumentId)
        .where('organization_id', ctx.organizationId)
        .update({
          file_url: input.storagePath,
          file_name: input.fileName,
          file_size: input.fileSize,
          file_type: input.fileType,
          updated_at: new Date(),
        });
    }

    const created = await this.db('policy_attachments').where('id', id).first();
    return {
      id: created.id,
      uuid: created.uuid,
      organizationId: created.organization_id,
      companyId: created.company_id,
      policyDocumentId: created.policy_document_id,
      policyVersionId: created.policy_version_id,
      fileName: created.file_name,
      fileType: created.file_type,
      fileSize: Number(created.file_size || 0),
      storagePath: created.storage_path,
      checksum: created.checksum,
      isMainDocument: Boolean(created.is_main_document),
      uploadedBy: created.uploaded_by,
      uploadedAt: created.uploaded_at,
      createdAt: created.created_at,
    };
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(ctx: TenantContext, attachmentId: number): Promise<boolean> {
    const count = await this.db('policy_attachments')
      .where('id', attachmentId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      });

    return count > 0;
  }

  /**
   * Set an attachment as the main document
   */
  async setMainAttachment(ctx: TenantContext, policyDocumentId: number, attachmentId: number): Promise<boolean> {
    const attachment = await this.db('policy_attachments')
      .where('id', attachmentId)
      .where('policy_document_id', policyDocumentId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!attachment) return false;

    // Unset main on all other attachments for this policy
    await this.db('policy_attachments')
      .where('organization_id', ctx.organizationId)
      .where('policy_document_id', policyDocumentId)
      .update({ is_main_document: false, updated_at: new Date() });

    // Set main on targeted attachment
    await this.db('policy_attachments')
      .where('id', attachmentId)
      .update({ is_main_document: true, updated_at: new Date() });

    // Update main policy document record
    await this.db('policy_documents')
      .where('id', policyDocumentId)
      .where('organization_id', ctx.organizationId)
      .update({
        file_url: attachment.storage_path,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        file_type: attachment.file_type,
        updated_at: new Date(),
      });

    return true;
  }

  /**
   * Get single policy by ID
   */
  async getById(ctx: TenantContext, id: number): Promise<PolicyWithStats | null> {
    const policy = await this.db('policy_documents')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!policy) return null;

    const mappings = await this.db('policy_document_role_mappings')
      .where('organization_id', ctx.organizationId)
      .where('policy_document_id', policy.id)
      .whereNull('deleted_at');

    const attachments = await this.getAttachmentsForPolicy(ctx, policy.id);
    const mainAttachment = attachments.find((a) => a.isMainDocument) || attachments[0] || null;

    return {
      id: policy.id,
      uuid: policy.uuid,
      organizationId: policy.organizationId || policy.organization_id,
      companyId: policy.companyId || policy.company_id,
      title: policy.title,
      description: policy.description,
      category: policy.category,
      fileUrl: policy.fileUrl || policy.file_url,
      fileName: policy.fileName || policy.file_name,
      fileSize: policy.fileSize || policy.file_size,
      fileType: policy.fileType || policy.file_type,
      version: policy.version,
      isActive: Boolean(policy.isActive !== undefined ? policy.isActive : policy.is_active),
      applicableGender: policy.applicableGender || policy.applicable_gender || 'all',
      applicableDepartmentIds: parseDeptIds(policy.applicableDepartmentIds || policy.applicable_department_ids),
      applicableEmployeeIds: parseIds(policy.applicableEmployeeIds || policy.applicable_employee_ids),
      applicableDesignationIds: parseIds(policy.applicableDesignationIds || policy.applicable_designation_ids),
      customScope: parseJsonObj(policy.customScope || policy.custom_scope),
      createdBy: policy.createdBy || policy.created_by,
      updatedBy: policy.updatedBy || policy.updated_by,
      createdAt: policy.createdAt || policy.created_at,
      updatedAt: policy.updatedAt || policy.updated_at,
      deletedAt: policy.deletedAt || policy.deleted_at,
      roleMappings: mappings.map((m) => ({
        roleCode: m.roleCode || m.role_code,
        isMandatory: Boolean(m.isMandatory !== undefined ? m.isMandatory : m.is_mandatory),
      })),
      assignments: [
        ...mappings.map((m) => ({ targetType: 'role', targetId: m.roleCode || m.role_code })),
        ...parseIds(policy.applicableDepartmentIds || policy.applicable_department_ids).map((id) => ({ targetType: 'department', targetId: String(id) })),
        ...parseIds(policy.applicableEmployeeIds || policy.applicable_employee_ids).map((id) => ({ targetType: 'employee', targetId: String(id) })),
        ...parseIds(policy.applicableDesignationIds || policy.applicable_designation_ids).map((id) => ({ targetType: 'designation', targetId: String(id) })),
      ],
      attachments,
      mainAttachment,
    };
  }

  /**
   * Helper to get a valid user_id for FK constraints
   */
  private async getValidUserId(trx: any, ctx: TenantContext): Promise<number> {
    if (ctx.userId) {
      const u = await trx('users').where('id', ctx.userId).first();
      if (u) return u.id;
    }
    const orgUser = await trx('users').where('organization_id', ctx.organizationId).first();
    if (orgUser) return orgUser.id;
    const firstUser = await trx('users').first();
    return firstUser ? firstUser.id : 1;
  }

  /**
   * Create policy document with role mappings and attachments
   */
  async create(ctx: TenantContext, input: CreatePolicyDTO): Promise<PolicyWithStats> {
    return this.db.transaction(async (trx) => {
      const validUserId = await this.getValidUserId(trx, ctx);
      const uuid = uuidv4();
      const [id] = await trx('policy_documents').insert({
        uuid,
        organization_id: ctx.organizationId,
        company_id: ctx.companyId || null,
        title: input.title,
        description: input.description || null,
        category: input.category || 'General',
        file_url: input.fileUrl,
        file_name: input.fileName || null,
        file_size: input.fileSize || null,
        file_type: input.fileType || null,
        version: input.version || '1.0',
        is_active: input.isActive !== undefined ? input.isActive : true,
        applicable_gender: input.applicableGender || 'all',
        applicable_department_ids: input.applicableDepartmentIds && input.applicableDepartmentIds.length > 0
          ? JSON.stringify(input.applicableDepartmentIds)
          : null,
        applicable_employee_ids: input.applicableEmployeeIds && input.applicableEmployeeIds.length > 0
          ? JSON.stringify(input.applicableEmployeeIds)
          : null,
        applicable_designation_ids: input.applicableDesignationIds && input.applicableDesignationIds.length > 0
          ? JSON.stringify(input.applicableDesignationIds)
          : null,
        custom_scope: input.customScope ? JSON.stringify(input.customScope) : null,
        created_by: validUserId,
        updated_by: validUserId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Insert initial version history record
      const [versionId] = await trx('policy_document_versions').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        company_id: ctx.companyId || null,
        policy_document_id: id,
        version: input.version || '1.0',
        title: input.title,
        description: input.description || null,
        file_url: input.fileUrl,
        file_name: input.fileName || null,
        file_size: input.fileSize || null,
        file_type: input.fileType || null,
        change_description: input.changeDescription || 'Initial published policy document',
        created_by: validUserId,
        created_at: new Date(),
      });

      // Insert attachments
      const attachmentsToInsert: any[] = [];
      const hasMainAttachment = input.attachments?.some((a) => a.isMainDocument);

      // Add main PDF file as attachment if present and not already in input.attachments
      if (input.fileUrl && !hasMainAttachment) {
        attachmentsToInsert.push({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          policy_document_id: id,
          policy_version_id: versionId,
          file_name: input.fileName || `${input.title}.pdf`,
          file_type: input.fileType || 'application/pdf',
          file_size: input.fileSize || 0,
          storage_path: input.fileUrl,
          checksum: '',
          is_main_document: true,
          uploaded_by: validUserId,
          uploaded_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      if (input.attachments && input.attachments.length > 0) {
        for (const att of input.attachments) {
          attachmentsToInsert.push({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            company_id: ctx.companyId || null,
            policy_document_id: id,
            policy_version_id: versionId,
            file_name: att.fileName,
            file_type: att.fileType,
            file_size: att.fileSize,
            storage_path: att.storagePath,
            checksum: att.checksum || '',
            is_main_document: Boolean(att.isMainDocument),
            uploaded_by: validUserId,
            uploaded_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      if (attachmentsToInsert.length > 0) {
        await trx('policy_attachments').insert(attachmentsToInsert);
      }

      if (input.roleMappings && input.roleMappings.length > 0) {
        const seenRoleCodes = new Set<string>();
        const mappingsToInsert: any[] = [];

        for (const rm of input.roleMappings) {
          const code = String(rm.roleCode || '').toLowerCase().trim();
          if (code && !seenRoleCodes.has(code)) {
            seenRoleCodes.add(code);
            mappingsToInsert.push({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              company_id: ctx.companyId || null,
              policy_document_id: id,
              role_code: code,
              is_mandatory: rm.isMandatory !== undefined ? rm.isMandatory : true,
              created_by: validUserId,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }

        if (mappingsToInsert.length > 0) {
          await trx('policy_document_role_mappings').insert(mappingsToInsert);
        }
      }

      const policy = await trx('policy_documents').where('id', id).first();
      const mappings = await trx('policy_document_role_mappings')
        .where('policy_document_id', id)
        .whereNull('deleted_at');

      return {
        id: policy.id,
        uuid: policy.uuid,
        organizationId: policy.organizationId || policy.organization_id,
        companyId: policy.companyId || policy.company_id,
        title: policy.title,
        description: policy.description,
        category: policy.category,
        fileUrl: policy.fileUrl || policy.file_url,
        fileName: policy.fileName || policy.file_name,
        fileSize: policy.fileSize || policy.file_size,
        fileType: policy.fileType || policy.file_type,
        version: policy.version,
        isActive: Boolean(policy.isActive !== undefined ? policy.isActive : policy.is_active),
        applicableGender: policy.applicableGender || policy.applicable_gender || 'all',
        applicableDepartmentIds: parseDeptIds(policy.applicableDepartmentIds || policy.applicable_department_ids),
        applicableEmployeeIds: parseIds(policy.applicableEmployeeIds || policy.applicable_employee_ids),
        applicableDesignationIds: parseIds(policy.applicableDesignationIds || policy.applicable_designation_ids),
        customScope: parseJsonObj(policy.customScope || policy.custom_scope),
        createdBy: policy.createdBy || policy.created_by,
        updatedBy: policy.updatedBy || policy.updated_by,
        createdAt: policy.createdAt || policy.created_at,
        updatedAt: policy.updatedAt || policy.updated_at,
        deletedAt: policy.deletedAt || policy.deleted_at,
        roleMappings: mappings.map((m) => ({
          roleCode: m.roleCode || m.role_code,
          isMandatory: Boolean(m.isMandatory !== undefined ? m.isMandatory : m.is_mandatory),
        })),
      };
    });
  }

  /**
   * Update policy document and role mappings
   */
  async update(ctx: TenantContext, id: number, input: UpdatePolicyDTO): Promise<PolicyWithStats | null> {
    return this.db.transaction(async (trx) => {
      const validUserId = await this.getValidUserId(trx, ctx);
      const existing = await trx('policy_documents')
        .where('id', id)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();

      if (!existing) return null;

      const updateData: any = {
        updated_by: validUserId,
        updated_at: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.fileUrl !== undefined) updateData.file_url = input.fileUrl;
      if (input.fileName !== undefined) updateData.file_name = input.fileName;
      if (input.fileSize !== undefined) updateData.file_size = input.fileSize;
      if (input.fileType !== undefined) updateData.file_type = input.fileType;
      if (input.version !== undefined) updateData.version = input.version;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;
      if (input.applicableGender !== undefined) updateData.applicable_gender = input.applicableGender;
      if (input.applicableDepartmentIds !== undefined) {
        updateData.applicable_department_ids = input.applicableDepartmentIds && input.applicableDepartmentIds.length > 0
          ? JSON.stringify(input.applicableDepartmentIds)
          : null;
      }
      if (input.applicableEmployeeIds !== undefined) {
        updateData.applicable_employee_ids = input.applicableEmployeeIds && input.applicableEmployeeIds.length > 0
          ? JSON.stringify(input.applicableEmployeeIds)
          : null;
      }
      if (input.applicableDesignationIds !== undefined) {
        updateData.applicable_designation_ids = input.applicableDesignationIds && input.applicableDesignationIds.length > 0
          ? JSON.stringify(input.applicableDesignationIds)
          : null;
      }
      if (input.customScope !== undefined) {
        updateData.custom_scope = input.customScope ? JSON.stringify(input.customScope) : null;
      }

      await trx('policy_documents').where('id', id).update(updateData);

      // Record a new version entry if version or file details changed
      const isVersionBump = input.version && input.version !== (existing.version || existing.version);
      const isFileChange = input.fileUrl && input.fileUrl !== (existing.file_url || existing.fileUrl);

      let versionId: number | null = null;
      if (isVersionBump || isFileChange || input.changeDescription || (input.attachments && input.attachments.length > 0)) {
        const [vId] = await trx('policy_document_versions').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          policy_document_id: id,
          version: input.version || existing.version || '1.0',
          title: input.title || existing.title,
          description: input.description !== undefined ? input.description : existing.description,
          file_url: input.fileUrl || existing.file_url || existing.fileUrl,
          file_name: input.fileName !== undefined ? input.fileName : (existing.file_name || existing.fileName),
          file_size: input.fileSize !== undefined ? input.fileSize : (existing.file_size || existing.fileSize),
          file_type: input.fileType !== undefined ? input.fileType : (existing.file_type || existing.fileType),
          change_description: input.changeDescription || (isVersionBump ? `Updated version to ${input.version}` : 'Updated document attachment'),
          created_by: validUserId,
          created_at: new Date(),
        });
        versionId = vId;
      }

      if (input.attachments && input.attachments.length > 0) {
        const attachmentsToInsert = input.attachments.map((att) => ({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          policy_document_id: id,
          policy_version_id: versionId,
          file_name: att.fileName,
          file_type: att.fileType,
          file_size: att.fileSize,
          storage_path: att.storagePath,
          checksum: att.checksum || '',
          is_main_document: Boolean(att.isMainDocument),
          uploaded_by: validUserId,
          uploaded_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        }));
        await trx('policy_attachments').insert(attachmentsToInsert);
      }

      if (input.roleMappings !== undefined) {
        // Replace mappings
        await trx('policy_document_role_mappings')
          .where('policy_document_id', id)
          .where('organization_id', ctx.organizationId)
          .delete();

        const seenRoleCodes = new Set<string>();
        const mappingsToInsert: any[] = [];

        for (const rm of input.roleMappings) {
          const code = String(rm.roleCode || '').toLowerCase().trim();
          if (code && !seenRoleCodes.has(code)) {
            seenRoleCodes.add(code);
            mappingsToInsert.push({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              company_id: ctx.companyId || null,
              policy_document_id: id,
              role_code: code,
              is_mandatory: rm.isMandatory !== undefined ? rm.isMandatory : true,
              created_by: validUserId,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }

        if (mappingsToInsert.length > 0) {
          await trx('policy_document_role_mappings').insert(mappingsToInsert);
        }
      }

      const policy = await trx('policy_documents').where('id', id).first();
      const mappings = await trx('policy_document_role_mappings')
        .where('policy_document_id', id)
        .whereNull('deleted_at');

      return {
        id: policy.id,
        uuid: policy.uuid,
        organizationId: policy.organizationId || policy.organization_id,
        companyId: policy.companyId || policy.company_id,
        title: policy.title,
        description: policy.description,
        category: policy.category,
        fileUrl: policy.fileUrl || policy.file_url,
        fileName: policy.fileName || policy.file_name,
        fileSize: policy.fileSize || policy.file_size,
        fileType: policy.fileType || policy.file_type,
        version: policy.version,
        isActive: Boolean(policy.isActive !== undefined ? policy.isActive : policy.is_active),
        applicableGender: policy.applicableGender || policy.applicable_gender || 'all',
        applicableDepartmentIds: parseDeptIds(policy.applicableDepartmentIds || policy.applicable_department_ids),
        applicableEmployeeIds: parseIds(policy.applicableEmployeeIds || policy.applicable_employee_ids),
        applicableDesignationIds: parseIds(policy.applicableDesignationIds || policy.applicable_designation_ids),
        customScope: parseJsonObj(policy.customScope || policy.custom_scope),
        createdBy: policy.createdBy || policy.created_by,
        updatedBy: policy.updatedBy || policy.updated_by,
        createdAt: policy.createdAt || policy.created_at,
        updatedAt: policy.updatedAt || policy.updated_at,
        deletedAt: policy.deletedAt || policy.deleted_at,
        roleMappings: mappings.map((m) => ({
          roleCode: m.roleCode || m.role_code,
          isMandatory: Boolean(m.isMandatory !== undefined ? m.isMandatory : m.is_mandatory),
        })),
        assignments: [
          ...mappings.map((m) => ({ targetType: 'role', targetId: m.roleCode || m.role_code })),
          ...parseIds(policy.applicableDepartmentIds || policy.applicable_department_ids).map((id) => ({ targetType: 'department', targetId: String(id) })),
          ...parseIds(policy.applicableEmployeeIds || policy.applicable_employee_ids).map((id) => ({ targetType: 'employee', targetId: String(id) })),
          ...parseIds(policy.applicableDesignationIds || policy.applicable_designation_ids).map((id) => ({ targetType: 'designation', targetId: String(id) })),
        ],
      };
    });
  }

  /**
   * Soft-delete policy
   */
  async delete(ctx: TenantContext, id: number): Promise<boolean> {
    const count = await this.db('policy_documents')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .update({
        deleted_at: new Date(),
        updated_by: ctx.userId,
        updated_at: new Date(),
      });

    return count > 0;
  }

  /**
   * Get all policies applicable to the given user based on their roles, gender, and department
   */
  async getUserPoliciesWithAcceptance(
    ctx: TenantContext,
    userId: number,
    roleCodes: string[]
  ): Promise<UserPolicyView[]> {
    const roles = expandRoleCodes(roleCodes);

    // Fetch user's gender, department, employee ID, designation from linked employee profile
    const userEmployee = await this.db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .where('u.id', userId)
      .select(
        'e.id as employeeId',
        'e.gender',
        'e.current_department_id as currentDepartmentId',
        'e.current_designation_id as currentDesignationId'
      )
      .first();

    const userEmpId = userEmployee?.employeeId ? String(userEmployee.employeeId) : null;
    const userGender = String(userEmployee?.gender || '').toLowerCase().trim();
    const userDeptId = userEmployee?.currentDepartmentId ? String(userEmployee.currentDepartmentId) : null;
    const userDesigId = userEmployee?.currentDesignationId ? String(userEmployee.currentDesignationId) : null;

    // Query active policies
    const activePolicies = await this.db('policy_documents')
      .where('organization_id', ctx.organizationId)
      .where('is_active', true)
      .whereNull('deleted_at');

    if (activePolicies.length === 0) return [];

    const activePolicyIds = activePolicies.map((p) => p.id);

    // Query mappings matching user's roles
    const matchingMappings = await this.db('policy_document_role_mappings')
      .where('organization_id', ctx.organizationId)
      .whereIn('policy_document_id', activePolicyIds)
      .whereNull('deleted_at');

    const applicablePolicies: any[] = [];

    for (const policy of activePolicies) {
      // 1. Gender Filter Check
      const pGender = String(policy.applicableGender || policy.applicable_gender || 'all').toLowerCase().trim();
      if (pGender !== 'all') {
        if (userGender && userGender !== pGender) {
          continue;
        }
      }

      // 2. Department Filter Check
      const pDepts = parseIds(policy.applicableDepartmentIds || policy.applicable_department_ids);
      if (pDepts.length > 0 && !pDepts.includes('all')) {
        if (userDeptId && !pDepts.includes(userDeptId)) {
          continue;
        }
      }

      // 3. Employee Filter Check
      const pEmps = parseIds(policy.applicableEmployeeIds || policy.applicable_employee_ids);
      if (pEmps.length > 0 && !pEmps.includes('all')) {
        if (userEmpId && !pEmps.includes(userEmpId)) {
          continue;
        }
      }

      // 4. Designation Filter Check
      const pDesigs = parseIds(policy.applicableDesignationIds || policy.applicable_designation_ids);
      if (pDesigs.length > 0 && !pDesigs.includes('all')) {
        if (userDesigId && !pDesigs.includes(userDesigId)) {
          continue;
        }
      }

      // 5. Role Mapping Check
      const pMappings = matchingMappings.filter(
        (m) => (m.policyDocumentId || m.policy_document_id) === policy.id
      );

      const matchedMapping = pMappings.find((m) => {
        const code = String(m.roleCode || m.role_code || '').toLowerCase().trim();
        return roles.includes(code);
      });

      // Include if role matches OR if assigned specifically by department/employee/designation
      if (matchedMapping || pMappings.length === 0 || (pEmps.length > 0 && userEmpId && pEmps.includes(userEmpId))) {
        const isMandatory = pMappings.some((m) =>
          Boolean(m.isMandatory !== undefined ? m.isMandatory : m.is_mandatory)
        );
        applicablePolicies.push({
          ...policy,
          isMandatory,
        });
      }
    }

    if (applicablePolicies.length === 0) return [];

    const policyIds = applicablePolicies.map((p) => p.id);

    // Fetch user's acceptances for these policies
    const acceptances = await this.db('employee_policy_acceptances')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .whereIn('policy_document_id', policyIds);

    const acceptanceMap = new Map<number, EmployeePolicyAcceptance>();
    for (const a of acceptances) {
      acceptanceMap.set(a.policyDocumentId || a.policy_document_id, {
        id: a.id,
        uuid: a.uuid,
        organizationId: a.organizationId || a.organization_id,
        companyId: a.companyId || a.company_id,
        employeeId: a.employeeId || a.employee_id,
        userId: a.userId || a.user_id,
        policyDocumentId: a.policyDocumentId || a.policy_document_id,
        policyVersion: a.policyVersion || a.policy_version,
        acceptedAt: a.acceptedAt || a.accepted_at,
        ipAddress: a.ipAddress || a.ip_address,
        userAgent: a.userAgent || a.user_agent,
        createdAt: a.createdAt || a.created_at,
        updatedAt: a.updatedAt || a.updated_at,
      });
    }

    // Fetch attachments for active policies
    const allAttachments = await this.db('policy_attachments as pa')
      .where('pa.organization_id', ctx.organizationId)
      .whereIn('pa.policy_document_id', policyIds)
      .whereNull('pa.deleted_at')
      .orderBy('pa.is_main_document', 'desc');

    const attachmentMap = new Map<number, any[]>();
    for (const att of allAttachments) {
      const pId = att.policyDocumentId || att.policy_document_id;
      if (!attachmentMap.has(pId)) attachmentMap.set(pId, []);
      attachmentMap.get(pId)!.push({
        id: att.id,
        uuid: att.uuid,
        organizationId: att.organizationId || att.organization_id,
        companyId: att.companyId || att.company_id,
        policyDocumentId: pId,
        policyVersionId: att.policyVersionId || att.policy_version_id,
        fileName: att.fileName || att.file_name,
        fileType: att.fileType || att.file_type,
        fileSize: Number(att.fileSize || att.file_size || 0),
        storagePath: att.storagePath || att.storage_path,
        checksum: att.checksum || '',
        isMainDocument: Boolean(att.isMainDocument !== undefined ? att.isMainDocument : att.is_main_document),
        uploadedBy: att.uploadedBy || att.uploaded_by,
        uploadedAt: att.uploadedAt || att.uploaded_at,
        createdAt: att.createdAt || att.created_at,
      });
    }

    return applicablePolicies.map((p) => {
      const acceptance = acceptanceMap.get(p.id);
      const isAccepted = Boolean(
        acceptance &&
        (!acceptance.policyVersion || normalizeVersion(acceptance.policyVersion) === normalizeVersion(p.version))
      );
      const isVersionCurrent = isAccepted;
      const pAtts = attachmentMap.get(p.id) || [];
      const mainAtt = pAtts.find((a) => a.isMainDocument) || pAtts[0] || null;

      return {
        id: p.id,
        uuid: p.uuid,
        organizationId: p.organizationId || p.organization_id,
        companyId: p.companyId || p.company_id,
        title: p.title,
        description: p.description,
        category: p.category,
        fileUrl: p.fileUrl || p.file_url,
        fileName: p.fileName || p.file_name,
        fileSize: p.fileSize || p.file_size,
        fileType: p.fileType || p.file_type,
        version: p.version,
        isActive: Boolean(p.isActive !== undefined ? p.isActive : p.is_active),
        applicableGender: p.applicableGender || p.applicable_gender || 'all',
        applicableDepartmentIds: parseDeptIds(p.applicableDepartmentIds || p.applicable_department_ids),
        createdBy: p.createdBy || p.created_by,
        updatedBy: p.updatedBy || p.updated_by,
        createdAt: p.createdAt || p.created_at,
        updatedAt: p.updatedAt || p.updated_at,
        deletedAt: p.deletedAt || p.deleted_at,
        isMandatory: Boolean(p.isMandatory),
        isAccepted,
        acceptedAt: acceptance?.acceptedAt || null,
        acceptedVersion: acceptance?.policyVersion || null,
        isVersionCurrent,
        attachments: pAtts,
        mainAttachment: mainAtt,
      };
    });
  }

  /**
   * Get pending mandatory policies for user
   */
  async getPendingMandatoryPolicies(
    ctx: TenantContext,
    userId: number,
    roleCodes: string[]
  ): Promise<UserPolicyView[]> {
    const allUserPolicies = await this.getUserPoliciesWithAcceptance(ctx, userId, roleCodes);
    return allUserPolicies.filter((p) => p.isMandatory && !p.isAccepted);
  }

  /**
   * Record user policy acceptance
   */
  async recordAcceptance(
    ctx: TenantContext,
    policyId: number,
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmployeePolicyAcceptance> {
    const policy = await this.db('policy_documents')
      .where('id', policyId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!policy) {
      throw new Error('Policy not found');
    }

    const user = await this.db('users').where('id', userId).first();
    const employeeId = user?.employeeId || user?.employee_id || null;

    const existing = await this.db('employee_policy_acceptances')
      .where({
        user_id: userId,
        policy_document_id: policyId,
        policy_version: policy.version,
      })
      .first();

    if (existing) {
      return {
        id: existing.id,
        uuid: existing.uuid,
        organizationId: existing.organizationId || existing.organization_id,
        companyId: existing.companyId || existing.company_id,
        employeeId: existing.employeeId || existing.employee_id,
        userId: existing.userId || existing.user_id,
        policyDocumentId: existing.policyDocumentId || existing.policy_document_id,
        policyVersion: existing.policyVersion || existing.policy_version,
        acceptedAt: existing.acceptedAt || existing.accepted_at,
        ipAddress: existing.ipAddress || existing.ip_address,
        userAgent: existing.userAgent || existing.user_agent,
        createdAt: existing.createdAt || existing.created_at,
        updatedAt: existing.updatedAt || existing.updated_at,
      };
    }

    const uuid = uuidv4();
    const now = new Date();
    const [insertedId] = await this.db('employee_policy_acceptances').insert({
      uuid,
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      employee_id: employeeId,
      user_id: userId,
      policy_document_id: policyId,
      policy_version: policy.version,
      accepted_at: now,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: now,
      updated_at: now,
    });

    return {
      id: insertedId,
      uuid,
      organizationId: ctx.organizationId,
      companyId: ctx.companyId || null,
      employeeId,
      userId,
      policyDocumentId: policyId,
      policyVersion: policy.version,
      acceptedAt: now,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get compliance audit list for a policy
   */
  async getPolicyAudit(ctx: TenantContext, policyId: number) {
    const policy = await this.db('policy_documents')
      .where('id', policyId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!policy) return null;

    const pGender = String(policy.applicableGender || policy.applicable_gender || 'all').toLowerCase().trim();
    const pDepts = parseDeptIds(policy.applicableDepartmentIds || policy.applicable_department_ids);

    const mappings = await this.db('policy_document_role_mappings')
      .where('organization_id', ctx.organizationId)
      .where('policy_document_id', policyId)
      .whereNull('deleted_at');

    const mappedRoles = mappings.map((m) => String(m.roleCode || m.role_code).toLowerCase().trim());

    let targetUsersQuery = this.db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
      .leftJoin('roles as r', 'ur.role_id', 'r.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('u.organization_id', ctx.organizationId)
      .where('u.status', 'active');

    if (!mappedRoles.includes('all')) {
      targetUsersQuery = targetUsersQuery.whereIn('r.code', mappedRoles);
    }

    if (pGender !== 'all') {
      targetUsersQuery = targetUsersQuery.whereRaw('LOWER(e.gender) = ?', [pGender]);
    }

    if (pDepts.length > 0) {
      targetUsersQuery = targetUsersQuery.whereIn('e.current_department_id', pDepts);
    }

    const targetUsers = await targetUsersQuery.select(
      'u.id as user_id',
      'u.email',
      'e.id as employee_id',
      'e.first_name',
      'e.last_name',
      'e.employee_code',
      'd.name as department_name',
      'r.code as role_code'
    );

    const userMap = new Map<number, any>();
    for (const u of targetUsers) {
      const uId = u.userId || u.user_id;
      const eId = u.employeeId || u.employee_id;
      const firstName = u.firstName || u.first_name;
      const lastName = u.lastName || u.last_name;
      const empCode = u.employeeCode || u.employee_code;
      const deptName = u.departmentName || u.department_name;
      const rCode = u.roleCode || u.role_code;

      if (!userMap.has(uId)) {
        userMap.set(uId, {
          userId: uId,
          employeeId: eId,
          name: firstName ? `${firstName} ${lastName || ''}`.trim() : u.email.split('@')[0],
          employeeCode: empCode || null,
          email: u.email,
          departmentName: deptName || 'N/A',
          roles: [rCode || 'employee'],
        });
      } else {
        const item = userMap.get(uId);
        if (rCode && !item.roles.includes(rCode)) {
          item.roles.push(rCode);
        }
      }
    }

    const [acceptances, signatures] = await Promise.all([
      this.db('employee_policy_acceptances')
        .where('organization_id', ctx.organizationId)
        .where('policy_document_id', policyId),
      this.db('policy_signatures')
        .where('organization_id', ctx.organizationId)
        .where('policy_document_id', policyId),
    ]);

    const acceptanceByUser = new Map<number, any>();
    for (const a of acceptances) {
      acceptanceByUser.set(a.userId || a.user_id, a);
    }

    const signatureByUser = new Map<number, any>();
    for (const s of signatures) {
      signatureByUser.set(s.userId || s.user_id, s);
    }

    const auditList = Array.from(userMap.values()).map((user) => {
      const acc = acceptanceByUser.get(user.userId);
      const sig = signatureByUser.get(user.userId);
      const accVersion = acc?.policyVersion || acc?.policy_version;
      const isAccepted = Boolean(
        acc &&
        (!accVersion || normalizeVersion(accVersion) === normalizeVersion(policy.version))
      );
      const isSigned = Boolean(sig && sig.status === 'SIGNED');
      const provider = isSigned ? (sig.provider || 'Apponext E-Sign') : null;
      const signatureId = isSigned ? sig.id : null;
      const signatureStatus = isSigned ? 'SIGNED' : (isAccepted ? 'ACKNOWLEDGED' : 'PENDING');
      const signedAt = isSigned ? (sig.signedAt || sig.signed_at || null) : null;
      const acceptedAt = acc?.acceptedAt || acc?.accepted_at || null;

      return {
        ...user,
        policyVersion: policy.version,
        isAccepted: isAccepted || isSigned,
        acceptedVersion: accVersion || policy.version,
        acceptedAt: acceptedAt,
        ipAddress: acc?.ipAddress || acc?.ip_address || null,
        userAgent: acc?.userAgent || acc?.user_agent || null,
        signatureProvider: provider,
        signatureStatus: signatureStatus,
        signatureId: signatureId,
        signedAt: signedAt,
      };
    });

    return {
      policy: {
        id: policy.id,
        title: policy.title,
        version: policy.version,
        category: policy.category,
        signatureMode: policy.signature_mode || policy.signatureMode || 'ACKNOWLEDGEMENT',
        isActive: Boolean(policy.isActive !== undefined ? policy.isActive : policy.is_active),
      },
      auditList,
    };
  }

  /**
   * Signature Repository Methods
   */
  async createSignatureRecord(ctx: TenantContext, data: {
    policyDocumentId: number;
    policyVersionId?: number | null;
    userId: number;
    employeeId?: number | null;
    provider: string;
    providerTransactionId: string;
    status?: string;
    authenticationMethod?: string;
    providerMetadata?: any;
  }): Promise<PolicySignature> {
    const uuid = uuidv4();
    const [id] = await this.db('policy_signatures').insert({
      uuid,
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      policy_document_id: data.policyDocumentId,
      policy_version_id: data.policyVersionId || null,
      user_id: data.userId,
      employee_id: data.employeeId || null,
      provider: data.provider,
      provider_transaction_id: data.providerTransactionId,
      status: data.status || 'PENDING',
      authentication_method: data.authenticationMethod || 'DIRECT_AUTH',
      initiated_at: new Date(),
      provider_metadata: data.providerMetadata ? JSON.stringify(data.providerMetadata) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const record = await this.getSignatureById(ctx, id);
    return record!;
  }

  async getSignatureById(ctx: TenantContext, id: number): Promise<PolicySignature | null> {
    const r = await this.db('policy_signatures as ps')
      .leftJoin('users as u', 'ps.user_id', 'u.id')
      .leftJoin('employees as e', 'ps.employee_id', 'e.id')
      .leftJoin('policy_documents as pd', 'ps.policy_document_id', 'pd.id')
      .leftJoin('policy_document_versions as pdv', 'ps.policy_version_id', 'pdv.id')
      .where('ps.id', id)
      .where('ps.organization_id', ctx.organizationId)
      .whereNull('ps.deleted_at')
      .select(
        'ps.*',
        'u.email as userEmail',
        this.db.raw("CONCAT_WS(' ', e.first_name, e.last_name) as userName"),
        'pd.title as policyTitle',
        'pdv.version as policyVersion'
      )
      .first();

    if (!r) return null;

    return {
      id: r.id,
      uuid: r.uuid,
      organizationId: r.organization_id,
      companyId: r.company_id,
      policyDocumentId: r.policy_document_id,
      policyVersionId: r.policy_version_id,
      userId: r.user_id,
      employeeId: r.employee_id,
      provider: r.provider,
      providerTransactionId: r.provider_transaction_id,
      status: r.status,
      authenticationMethod: r.authentication_method,
      initiatedAt: r.initiated_at,
      signedAt: r.signed_at,
      documentHash: r.document_hash,
      signedDocumentRef: r.signed_document_ref,
      evidenceRef: r.evidence_ref,
      providerMetadata: typeof r.provider_metadata === 'string' ? JSON.parse(r.provider_metadata) : r.provider_metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: r.userName || r.user_name || r.userEmail,
      userEmail: r.userEmail || r.user_email,
      policyTitle: r.policyTitle || r.policy_title,
      policyVersion: r.policyVersion || r.policy_version,
    };
  }

  async getSignatureByTransactionId(transactionId: string): Promise<PolicySignature | null> {
    const r = await this.db('policy_signatures as ps')
      .leftJoin('users as u', 'ps.user_id', 'u.id')
      .leftJoin('employees as e', 'ps.employee_id', 'e.id')
      .leftJoin('policy_documents as pd', 'ps.policy_document_id', 'pd.id')
      .where('ps.provider_transaction_id', transactionId)
      .whereNull('ps.deleted_at')
      .select(
        'ps.*',
        'u.email as userEmail',
        this.db.raw("CONCAT_WS(' ', e.first_name, e.last_name) as userName"),
        'pd.title as policyTitle'
      )
      .first();

    if (!r) return null;

    return {
      id: r.id,
      uuid: r.uuid,
      organizationId: r.organization_id,
      companyId: r.company_id,
      policyDocumentId: r.policy_document_id,
      policyVersionId: r.policy_version_id,
      userId: r.user_id,
      employeeId: r.employee_id,
      provider: r.provider,
      providerTransactionId: r.provider_transaction_id,
      status: r.status,
      authenticationMethod: r.authentication_method,
      initiatedAt: r.initiated_at,
      signedAt: r.signed_at,
      documentHash: r.document_hash,
      signedDocumentRef: r.signed_document_ref,
      evidenceRef: r.evidence_ref,
      providerMetadata: typeof r.provider_metadata === 'string' ? JSON.parse(r.provider_metadata) : r.provider_metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: r.userName || r.user_name || r.userEmail,
      userEmail: r.userEmail || r.user_email,
      policyTitle: r.policyTitle || r.policy_title,
    };
  }

  async getSignatureByUserAndPolicyVersion(
    ctx: TenantContext,
    userId: number,
    policyDocumentId: number,
    policyVersionId?: number | null
  ): Promise<PolicySignature | null> {
    let query = this.db('policy_signatures')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .where('policy_document_id', policyDocumentId)
      .whereNull('deleted_at');

    if (policyVersionId) {
      query = query.where('policy_version_id', policyVersionId);
    }

    const r = await query.orderBy('created_at', 'desc').first();
    if (!r) return null;

    return {
      id: r.id,
      uuid: r.uuid,
      organizationId: r.organization_id,
      companyId: r.company_id,
      policyDocumentId: r.policy_document_id,
      policyVersionId: r.policy_version_id,
      userId: r.user_id,
      employeeId: r.employee_id,
      provider: r.provider,
      providerTransactionId: r.provider_transaction_id,
      status: r.status,
      authenticationMethod: r.authentication_method,
      initiatedAt: r.initiated_at,
      signedAt: r.signed_at,
      documentHash: r.document_hash,
      signedDocumentRef: r.signed_document_ref,
      evidenceRef: r.evidence_ref,
      providerMetadata: typeof r.provider_metadata === 'string' ? JSON.parse(r.provider_metadata) : r.provider_metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async updateSignatureRecord(transactionId: string, updates: {
    status?: string;
    signedAt?: Date | string | null;
    documentHash?: string | null;
    signedDocumentRef?: string | null;
    evidenceRef?: string | null;
    providerMetadata?: any;
  }): Promise<boolean> {
    const payload: any = { updated_at: new Date() };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.signedAt !== undefined) payload.signed_at = updates.signedAt;
    if (updates.documentHash !== undefined) payload.document_hash = updates.documentHash;
    if (updates.signedDocumentRef !== undefined) payload.signed_document_ref = updates.signedDocumentRef;
    if (updates.evidenceRef !== undefined) payload.evidence_ref = updates.evidenceRef;
    if (updates.providerMetadata !== undefined) payload.provider_metadata = JSON.stringify(updates.providerMetadata);

    const count = await this.db('policy_signatures')
      .where('provider_transaction_id', transactionId)
      .update(payload);

    return count > 0;
  }

  async listSignaturesForPolicy(ctx: TenantContext, policyId: number): Promise<PolicySignature[]> {
    const records = await this.db('policy_signatures as ps')
      .leftJoin('users as u', 'ps.user_id', 'u.id')
      .leftJoin('employees as e', 'ps.employee_id', 'e.id')
      .leftJoin('policy_document_versions as pdv', 'ps.policy_version_id', 'pdv.id')
      .where('ps.organization_id', ctx.organizationId)
      .where('ps.policy_document_id', policyId)
      .whereNull('ps.deleted_at')
      .select(
        'ps.*',
        'u.email as userEmail',
        this.db.raw("CONCAT_WS(' ', e.first_name, e.last_name) as userName"),
        'pdv.version as policyVersion'
      )
      .orderBy('ps.created_at', 'desc');

    return records.map((r: any) => ({
      id: r.id,
      uuid: r.uuid,
      organizationId: r.organization_id,
      companyId: r.company_id,
      policyDocumentId: r.policy_document_id,
      policyVersionId: r.policy_version_id,
      userId: r.user_id,
      employeeId: r.employee_id,
      provider: r.provider,
      providerTransactionId: r.provider_transaction_id,
      status: r.status,
      authenticationMethod: r.authentication_method,
      initiatedAt: r.initiated_at,
      signedAt: r.signed_at,
      documentHash: r.document_hash,
      signedDocumentRef: r.signed_document_ref,
      evidenceRef: r.evidence_ref,
      providerMetadata: typeof r.provider_metadata === 'string' ? JSON.parse(r.provider_metadata) : r.provider_metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: r.userName || r.user_name || r.userEmail,
      userEmail: r.userEmail || r.user_email,
      policyVersion: r.policyVersion || r.policy_version,
    }));
  }

  /**
   * Get version history for a policy document
   */
  async getVersionHistory(ctx: TenantContext, policyDocumentId: number): Promise<PolicyVersionHistoryRecord[]> {
    const records = await this.db('policy_document_versions as pdv')
      .leftJoin('users as u', 'pdv.created_by', 'u.id')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .where('pdv.organization_id', ctx.organizationId)
      .where('pdv.policy_document_id', policyDocumentId)
      .select(
        'pdv.id',
        'pdv.uuid',
        'pdv.organization_id as organizationId',
        'pdv.company_id as companyId',
        'pdv.policy_document_id as policyDocumentId',
        'pdv.version',
        'pdv.title',
        'pdv.description',
        'pdv.file_url as fileUrl',
        'pdv.file_name as fileName',
        'pdv.file_size as fileSize',
        'pdv.file_type as fileType',
        'pdv.change_description as changeDescription',
        'pdv.created_by as createdBy',
        'pdv.created_at as createdAt',
        this.db.raw("CONCAT_WS(' ', e.first_name, e.last_name) as createdByName")
      )
      .orderBy('pdv.created_at', 'desc');

    const allAttachments = await this.getAttachmentsForPolicy(ctx, policyDocumentId);

    return records.map((r: any) => {
      const versionAttachments = allAttachments.filter((a) => a.policyVersionId === r.id);
      const mainAtt = versionAttachments.find((a) => a.isMainDocument) || versionAttachments[0] || null;

      return {
        ...r,
        organizationId: r.organizationId || r.organization_id,
        companyId: r.companyId || r.company_id,
        policyDocumentId: r.policyDocumentId || r.policy_document_id,
        fileUrl: r.fileUrl || r.file_url,
        fileName: r.fileName || r.file_name,
        fileSize: r.fileSize || r.file_size,
        fileType: r.fileType || r.file_type,
        changeDescription: r.changeDescription || r.change_description,
        createdBy: r.createdBy || r.created_by,
        createdAt: r.createdAt || r.created_at,
        createdByName: r.createdByName || 'HR Admin',
        attachments: versionAttachments.length > 0 ? versionAttachments : allAttachments,
        mainAttachment: mainAtt,
      };
    });
  }

  /**
   * Helper to ensure policy_queries table exists
   */
  private async ensurePolicyQueriesTable(): Promise<void> {
    const exists = await this.db.schema.hasTable('policy_queries');
    if (!exists) {
      await this.db.schema.createTable('policy_queries', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').notNullable().index();
        table.integer('company_id').nullable();
        table.integer('policy_document_id').notNullable().index();
        table.integer('policy_version_id').nullable();
        table.string('policy_version', 50).nullable();
        table.integer('employee_id').nullable().index();
        table.integer('user_id').notNullable().index();
        table.text('question').notNullable();
        table.string('status', 20).notNullable().defaultTo('OPEN');
        table.text('reply').nullable();
        table.integer('replied_by').nullable();
        table.timestamp('replied_at').nullable();
        table.timestamps(true, true);
      });
    }
  }

  /**
   * Create a new employee question/query about a policy
   */
  async createPolicyQuery(
    ctx: TenantContext,
    input: {
      policyDocumentId: number;
      policyVersionId?: number | null;
      policyVersion?: string | null;
      userId: number;
      question: string;
    }
  ): Promise<PolicyQuery> {
    await this.ensurePolicyQueriesTable();

    // Resolve employee_id from user
    const userRow = await this.db('users').where('id', input.userId).select('employee_id', 'company_id').first();
    const employeeId = userRow?.employee_id || null;
    const companyId = ctx.companyId || userRow?.company_id || null;

    const queryUuid = uuidv4();
    const [id] = await this.db('policy_queries').insert({
      uuid: queryUuid,
      organization_id: ctx.organizationId,
      company_id: companyId,
      policy_document_id: input.policyDocumentId,
      policy_version_id: input.policyVersionId || null,
      policy_version: input.policyVersion || null,
      employee_id: employeeId,
      user_id: input.userId,
      question: input.question,
      status: 'OPEN',
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    const record = await this.db('policy_queries').where('id', id).first();
    return this.mapQueryRecord(record);
  }

  /**
   * Get all policy queries asked by a specific employee/user
   */
  async getUserPolicyQueries(ctx: TenantContext, userId: number): Promise<PolicyQuery[]> {
    await this.ensurePolicyQueriesTable();

    const records = await this.db('policy_queries as pq')
      .leftJoin('policy_documents as pd', 'pq.policy_document_id', 'pd.id')
      .leftJoin('users as u_reply', 'pq.replied_by', 'u_reply.id')
      .leftJoin('employees as e_reply', 'u_reply.employee_id', 'e_reply.id')
      .where('pq.organization_id', ctx.organizationId)
      .where('pq.user_id', userId)
      .select(
        'pq.*',
        'pd.title as policyTitle',
        this.db.raw("CONCAT_WS(' ', e_reply.first_name, e_reply.last_name) as repliedByName")
      )
      .orderBy('pq.created_at', 'desc');

    return records.map((r: any) => this.mapQueryRecord(r));
  }

  /**
   * Get policy queries for a specific policy document
   */
  async getPolicyQueriesByPolicyId(ctx: TenantContext, policyDocumentId: number, userId?: number): Promise<PolicyQuery[]> {
    await this.ensurePolicyQueriesTable();

    let query = this.db('policy_queries as pq')
      .leftJoin('policy_documents as pd', 'pq.policy_document_id', 'pd.id')
      .leftJoin('users as u_reply', 'pq.replied_by', 'u_reply.id')
      .leftJoin('employees as e_reply', 'u_reply.employee_id', 'e_reply.id')
      .where('pq.organization_id', ctx.organizationId)
      .where('pq.policy_document_id', policyDocumentId);

    if (userId) {
      query = query.where('pq.user_id', userId);
    }

    const records = await query
      .select(
        'pq.*',
        'pd.title as policyTitle',
        this.db.raw("CONCAT_WS(' ', e_reply.first_name, e_reply.last_name) as repliedByName")
      )
      .orderBy('pq.created_at', 'desc');

    return records.map((r: any) => this.mapQueryRecord(r));
  }

  /**
   * Get all policy queries for HR / Admin dashboard across organization
   */
  async getAdminPolicyQueries(ctx: TenantContext, statusFilter?: string): Promise<PolicyQuery[]> {
    await this.ensurePolicyQueriesTable();

    let query = this.db('policy_queries as pq')
      .leftJoin('policy_documents as pd', 'pq.policy_document_id', 'pd.id')
      .leftJoin('users as u', 'pq.user_id', 'u.id')
      .leftJoin('employees as e', 'pq.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('users as u_reply', 'pq.replied_by', 'u_reply.id')
      .leftJoin('employees as e_reply', 'u_reply.employee_id', 'e_reply.id')
      .where('pq.organization_id', ctx.organizationId);

    if (statusFilter && statusFilter !== 'all') {
      query = query.where('pq.status', statusFilter.toUpperCase());
    }

    const records = await query
      .select(
        'pq.*',
        'pd.title as policyTitle',
        'e.employee_code as employeeCode',
        'd.name as departmentName',
        this.db.raw("CONCAT_WS(' ', e.first_name, e.last_name) as employeeName"),
        this.db.raw("CONCAT_WS(' ', e_reply.first_name, e_reply.last_name) as repliedByName")
      )
      .orderBy('pq.created_at', 'desc');

    return records.map((r: any) => this.mapQueryRecord(r));
  }

  /**
   * HR / Admin reply to employee policy question
   */
  async replyToPolicyQuery(
    ctx: TenantContext,
    queryId: number,
    reply: string,
    status: PolicyQueryStatus,
    repliedBy: number
  ): Promise<PolicyQuery | null> {
    await this.ensurePolicyQueriesTable();

    const existing = await this.db('policy_queries')
      .where('id', queryId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!existing) return null;

    await this.db('policy_queries')
      .where('id', queryId)
      .update({
        reply,
        status: status || 'REPLIED',
        replied_by: repliedBy,
        replied_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    const updated = await this.db('policy_queries').where('id', queryId).first();
    return this.mapQueryRecord(updated);
  }

  /**
   * Helper to verify if a policy is assigned/applicable to a user
   */
  async isPolicyApplicableToUser(
    ctx: TenantContext,
    userId: number,
    roleCodes: string[],
    policyId: number
  ): Promise<boolean> {
    const roles = expandRoleCodes(roleCodes);
    const isAdmin = roles.some((r) =>
      ['organization_admin', 'org_admin', 'admin', 'hr', 'hr_admin', 'hr_manager', 'ceo'].includes(r)
    );
    if (isAdmin) return true;

    const userPolicies = await this.getUserPoliciesWithAcceptance(ctx, userId, roleCodes);
    return userPolicies.some((p) => p.id === policyId);
  }

  private mapQueryRecord(r: any): PolicyQuery {
    return {
      id: r.id,
      uuid: r.uuid,
      organizationId: r.organizationId || r.organization_id,
      companyId: r.companyId || r.company_id,
      policyDocumentId: r.policyDocumentId || r.policy_document_id,
      policyVersionId: r.policyVersionId || r.policy_version_id,
      policyVersion: r.policyVersion || r.policy_version,
      employeeId: r.employeeId || r.employee_id,
      userId: r.userId || r.user_id,
      question: r.question,
      status: r.status as PolicyQueryStatus,
      reply: r.reply || null,
      repliedBy: r.repliedBy || r.replied_by || null,
      repliedByName: r.repliedByName || null,
      repliedAt: r.repliedAt || r.replied_at || null,
      createdAt: r.createdAt || r.created_at,
      updatedAt: r.updatedAt || r.updated_at,
      employeeName: r.employeeName || null,
      employeeCode: r.employeeCode || null,
      departmentName: r.departmentName || null,
      policyTitle: r.policyTitle || null,
    };
  }
}


