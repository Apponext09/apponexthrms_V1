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
          (a.policyVersion || a.policy_version) === pVersion
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
      roleMappings: mappings.map((m) => ({
        roleCode: m.roleCode || m.role_code,
        isMandatory: Boolean(m.isMandatory !== undefined ? m.isMandatory : m.is_mandatory),
      })),
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
   * Create policy document with role mappings
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
        created_by: validUserId,
        updated_by: validUserId,
        created_at: new Date(),
        updated_at: new Date(),
      });

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

      await trx('policy_documents').where('id', id).update(updateData);

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

    // Fetch user's gender and department from linked employee profile
    const userEmployee = await this.db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .where('u.id', userId)
      .select('e.gender', 'e.current_department_id as currentDepartmentId')
      .first();

    const userGender = String(userEmployee?.gender || '').toLowerCase().trim();
    const userDeptId = userEmployee?.currentDepartmentId ? Number(userEmployee.currentDepartmentId) : null;

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
          // Policy is gender-restricted (e.g. 'female' POSH) and user gender does not match -> Skip
          continue;
        }
      }

      // 2. Department Filter Check
      const pDepts = parseDeptIds(policy.applicableDepartmentIds || policy.applicable_department_ids);
      if (pDepts.length > 0) {
        if (userDeptId && !pDepts.includes(userDeptId)) {
          // Policy is department-restricted and user's department is not in the list -> Skip
          continue;
        }
      }

      // 3. Role Mapping Check
      const pMappings = matchingMappings.filter(
        (m) => (m.policyDocumentId || m.policy_document_id) === policy.id
      );

      const matchedMapping = pMappings.find((m) => {
        const code = String(m.roleCode || m.role_code || '').toLowerCase().trim();
        return roles.includes(code);
      });

      if (matchedMapping) {
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

    return applicablePolicies.map((p) => {
      const acceptance = acceptanceMap.get(p.id);
      const isAccepted = Boolean(acceptance && acceptance.policyVersion === p.version);
      const isVersionCurrent = isAccepted;

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
    const [insertedId] = await this.db('employee_policy_acceptances').insert({
      uuid,
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      employee_id: employeeId,
      user_id: userId,
      policy_document_id: policyId,
      policy_version: policy.version,
      accepted_at: new Date(),
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: new Date(),
      updated_at: new Date(),
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
      acceptedAt: new Date(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
      updatedAt: new Date(),
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

    const acceptances = await this.db('employee_policy_acceptances')
      .where('organization_id', ctx.organizationId)
      .where('policy_document_id', policyId);

    const acceptanceByUser = new Map<number, any>();
    for (const a of acceptances) {
      acceptanceByUser.set(a.userId || a.user_id, a);
    }

    const auditList = Array.from(userMap.values()).map((user) => {
      const acc = acceptanceByUser.get(user.userId);
      const accVersion = acc?.policyVersion || acc?.policy_version;
      const isAccepted = Boolean(acc && accVersion === policy.version);
      return {
        ...user,
        policyVersion: policy.version,
        isAccepted,
        acceptedVersion: accVersion || null,
        acceptedAt: acc?.acceptedAt || acc?.accepted_at || null,
        ipAddress: acc?.ipAddress || acc?.ip_address || null,
        userAgent: acc?.userAgent || acc?.user_agent || null,
      };
    });

    return {
      policy: {
        id: policy.id,
        title: policy.title,
        version: policy.version,
        category: policy.category,
        isActive: Boolean(policy.isActive !== undefined ? policy.isActive : policy.is_active),
      },
      auditList,
    };
  }
}
