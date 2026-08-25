import { PolicyRepository } from '../repositories/PolicyRepository';
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

  constructor() {
    this.policyRepo = new PolicyRepository();
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
  async createPolicy(ctx: TenantContext, input: CreatePolicyDTO): Promise<PolicyWithStats> {
    if (!input.title || !input.title.trim()) {
      throw new ValidationError('Policy title is required');
    }
    if (!input.fileUrl) {
      throw new ValidationError('Policy file or document attachment is required');
    }

    return this.policyRepo.create(ctx, {
      ...input,
      title: input.title.trim(),
      category: input.category || 'General',
      version: input.version || '1.0',
      isActive: input.isActive !== undefined ? input.isActive : true,
      roleMappings: input.roleMappings || [{ roleCode: 'all', isMandatory: true }],
    });
  }

  /**
   * Update policy document
   */
  async updatePolicy(ctx: TenantContext, id: number, input: UpdatePolicyDTO): Promise<PolicyWithStats> {
    const updated = await this.policyRepo.update(ctx, id, input);
    if (!updated) {
      throw new NotFoundError('Policy document not found');
    }
    return updated;
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
   * Get policy compliance audit
   */
  async getPolicyAudit(ctx: TenantContext, policyId: number) {
    const audit = await this.policyRepo.getPolicyAudit(ctx, policyId);
    if (!audit) {
      throw new NotFoundError('Policy document not found');
    }
    return audit;
  }
}
