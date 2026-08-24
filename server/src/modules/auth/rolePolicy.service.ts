import { getKnex } from '../../db/knex';

export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface RolePolicyRecord {
  id: number;
  roleCode: string;
  documentRef?: string;
  title: string;
  description?: string;
  sections: PolicySection[];
  status?: string;
  effectiveDate?: string | null;
  organizationId?: number | null;
  createdBy?: number | null;
  policyAccepted?: boolean;
  policyAcceptedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export class RolePolicyService {
  private db = getKnex();

  /**
   * Determine primary role code for policy selection with fallback checks on user row & designation
   */
  public resolveRoleCode(userRoles: string[] = [], userRow?: any): string {
    const normalized = userRoles.map((r) => String(r).toLowerCase().trim());
    const userRoleStr = (userRow?.role || '').toLowerCase().trim();
    const userDesigStr = (userRow?.designation || '').toLowerCase().trim();

    if (
      normalized.some((r) => ['super_admin', 'superadmin', 'organization_admin', 'admin', 'super admin', 'org admin', 'owner'].includes(r)) ||
      ['superadmin', 'organization_admin', 'admin'].includes(userRoleStr) ||
      userDesigStr.includes('admin')
    ) {
      return 'organization_admin';
    }

    if (
      normalized.some((r) => ['hr_manager', 'hr_admin', 'hr', 'hr manager', 'hr executive'].includes(r)) ||
      ['hr_manager', 'hr'].includes(userRoleStr) ||
      userDesigStr.includes('hr')
    ) {
      return 'hr_manager';
    }

    if (
      normalized.some((r) => ['department_head', 'dept_head', 'manager', 'dept_manager', 'department manager'].includes(r)) ||
      ['department_head', 'manager'].includes(userRoleStr) ||
      userDesigStr.includes('manager')
    ) {
      return 'department_head';
    }

    if (
      normalized.some((r) => ['team_lead', 'teamlead', 'lead', 'team lead'].includes(r)) ||
      ['team_lead'].includes(userRoleStr) ||
      userDesigStr.includes('lead')
    ) {
      return 'team_lead';
    }

    if (
      normalized.some((r) => ['intern', 'trainee', 'internship'].includes(r)) ||
      ['intern'].includes(userRoleStr) ||
      userDesigStr.includes('intern')
    ) {
      return 'intern';
    }

    return normalized[0] || 'employee';
  }

  /**
   * Get role-assigned policy document for mandatory login acceptance popup
   */
  async getPolicyForUser(userId: number, roles: string[] = []): Promise<RolePolicyRecord> {
    let user = await this.db('users').where({ id: userId }).first().catch(() => null);
    if (!user) {
      const sa = await this.db('super_admins').where({ id: userId }).orWhere({ user_id: userId }).first().catch(() => null);
      if (sa) {
        user = {
          id: userId,
          role: 'organization_admin',
          designation: 'Organization Administrator',
          policy_accepted: sa.policy_accepted || false,
          policy_accepted_at: sa.policy_accepted_at || null,
        };
      } else {
        user = { id: userId, policy_accepted: false, policy_accepted_at: null };
      }
    }

    const roleCode = this.resolveRoleCode(roles, user);

    // Fetch exact role policy or fallback to employee policy
    let policy = await this.db('role_policies').where({ role_code: roleCode }).first();
    if (!policy) {
      policy = await this.db('role_policies').where({ role_code: 'employee' }).first();
    }

    if (!policy) {
      return {
        id: 0,
        roleCode: 'employee',
        documentRef: 'POL-005',
        title: 'EMPLOYEE CODE OF CONDUCT & WORKPLACE ETHICS POLICY',
        description: 'Standard workplace policy regarding ethics, attendance, asset care, and IT security.',
        sections: [
          {
            id: 'emp_1',
            title: '1. POLICY STATEMENT',
            content: 'Employees must interact professionally, respectfully, and adhere to corporate guidelines.',
          },
        ],
        policyAccepted: Boolean(user?.policy_accepted ?? user?.policyAccepted ?? false),
        policyAcceptedAt: (user?.policy_accepted_at || user?.policyAcceptedAt) ? new Date(user.policy_accepted_at || user.policyAcceptedAt).toISOString() : null,
      };
    }

    let parsedSections: PolicySection[] = [];
    try {
      let raw = policy.sections;
      while (typeof raw === 'string') {
        raw = JSON.parse(raw);
      }
      parsedSections = Array.isArray(raw) ? raw : [];
    } catch {
      parsedSections = [];
    }

    return {
      id: policy.id,
      roleCode: policy.role_code || policy.roleCode || roleCode,
      documentRef: policy.document_ref || policy.documentRef || `POL-${String(policy.id).padStart(3, '0')}`,
      title: policy.title,
      description: policy.description || '',
      sections: parsedSections,
      status: policy.status || 'published',
      policyAccepted: Boolean(user?.policy_accepted ?? user?.policyAccepted ?? false),
      policyAcceptedAt: (user?.policy_accepted_at || user?.policyAcceptedAt) ? new Date(user.policy_accepted_at || user.policyAcceptedAt).toISOString() : null,
    };
  }

  /**
   * Get all visible policies for a user based on their role and organization context
   */
  async getAllPoliciesForUser(userId: number, roles: string[] = [], organizationId?: number): Promise<RolePolicyRecord[]> {
    let user = await this.db('users').where({ id: userId }).first().catch(() => null);
    if (!user) {
      const sa = await this.db('super_admins').where({ id: userId }).orWhere({ user_id: userId }).first().catch(() => null);
      if (sa) {
        user = { id: userId, role: 'organization_admin', designation: 'Organization Administrator' };
      }
    }

    const primaryRole = this.resolveRoleCode(roles, user);
    const isSuperAdmin = roles.some((r) => ['super_admin', 'superadmin', 'owner'].includes(String(r).toLowerCase()));
    const isOrgAdmin = primaryRole === 'organization_admin';

    let query = this.db('role_policies');

    if (isSuperAdmin || isOrgAdmin) {
      // Admin / Super Admin see ALL role policies (so they can review & manage policies across all roles)
    } else {
      // Role-wise policies: show role's policy + general employee policy (if applicable)
      const allowedRoles = [primaryRole, 'all'];
      if (primaryRole !== 'employee' && primaryRole !== 'intern') {
        allowedRoles.push('employee');
      }

      query = query.where('status', 'published').whereIn('role_code', allowedRoles);

      if (organizationId) {
        query = query.where(function () {
          this.whereNull('organization_id').orWhere('organization_id', organizationId);
        });
      }
    }

    const rows = await query.orderBy('id', 'asc');

    return rows.map((p) => {
      let parsedSections: PolicySection[] = [];
      try {
        let raw = p.sections;
        while (typeof raw === 'string') {
          raw = JSON.parse(raw);
        }
        parsedSections = Array.isArray(raw) ? raw : [];
      } catch {
        parsedSections = [];
      }

      return {
        id: p.id,
        roleCode: p.role_code || p.roleCode || primaryRole,
        documentRef: p.document_ref || p.documentRef || `POL-${String(p.id).padStart(3, '0')}`,
        title: p.title,
        description: p.description || '',
        sections: parsedSections,
        status: p.status || 'published',
        effectiveDate: p.effective_date ? new Date(p.effective_date).toISOString() : null,
        organizationId: p.organization_id || null,
        createdBy: p.created_by || null,
        policyAccepted: Boolean(user?.policy_accepted ?? user?.policyAccepted ?? false),
        policyAcceptedAt: user?.policy_accepted_at ? new Date(user.policy_accepted_at).toISOString() : null,
        createdAt: p.created_at ? new Date(p.created_at).toISOString() : undefined,
        updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
      };
    });
  }

  /**
   * Create new policy (Super Admin & Admin only)
   */
  async createPolicy(data: any, authorId: number) {
    const sectionsJson = typeof data.sections === 'string' ? data.sections : JSON.stringify(data.sections || []);
    const now = new Date();

    const [id] = await this.db('role_policies').insert({
      role_code: data.roleCode || data.role_code || 'employee',
      organization_id: data.organizationId || null,
      document_ref: data.documentRef || `POL-${Date.now().toString().slice(-4)}`,
      title: data.title,
      description: data.description || '',
      sections: sectionsJson,
      status: data.status || 'published',
      effective_date: data.effectiveDate ? new Date(data.effectiveDate) : now,
      created_by: authorId,
      created_at: now,
      updated_at: now,
    });

    return { success: true, message: 'Policy created successfully.', policyId: id };
  }

  /**
   * Update existing policy (Super Admin & Admin only)
   */
  async updatePolicy(id: number, data: any) {
    const updateData: any = { updated_at: new Date() };

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.roleCode || data.role_code) updateData.role_code = data.roleCode || data.role_code;
    if (data.documentRef) updateData.document_ref = data.documentRef;
    if (data.status) updateData.status = data.status;
    if (data.sections) {
      updateData.sections = typeof data.sections === 'string' ? data.sections : JSON.stringify(data.sections);
    }
    if (data.effectiveDate) updateData.effective_date = new Date(data.effectiveDate);

    await this.db('role_policies').where({ id }).update(updateData);
    return { success: true, message: 'Policy updated successfully.' };
  }

  /**
   * Record user policy acceptance in the database
   */
  async acceptPolicyForUser(userId: number) {
    const now = new Date();
    await this.db('users').where({ id: userId }).update({
      policy_accepted: 1,
      policy_accepted_at: now,
      updated_at: now,
    }).catch(() => {});

    await this.db('super_admins').where({ id: userId }).orWhere({ user_id: userId }).update({
      policy_accepted: 1,
      policy_accepted_at: now,
      updated_at: now,
    }).catch(() => {});

    return {
      success: true,
      message: 'Role policy accepted successfully.',
      policyAccepted: true,
      policyAcceptedAt: now.toISOString(),
    };
  }
}
