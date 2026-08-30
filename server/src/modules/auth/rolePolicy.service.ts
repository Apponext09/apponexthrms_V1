import { getKnex } from '../../db/knex';

export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface RolePolicyRecord {
  id: number;
  roleCode: string;
  assignedRoles: string[];
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
      normalized.some((r) => ['super_admin', 'superadmin', 'owner'].includes(r)) ||
      userRoleStr === 'superadmin' || userRoleStr === 'super_admin'
    ) {
      return 'super_admin';
    }

    if (
      normalized.some((r) => ['organization_admin', 'admin', 'org admin', 'ceo'].includes(r)) ||
      ['organization_admin', 'admin', 'ceo'].includes(userRoleStr) ||
      userDesigStr.includes('admin') || userDesigStr.includes('ceo')
    ) {
      return 'organization_admin';
    }

    if (
      normalized.some((r) => ['hr_manager', 'hr_admin', 'hr', 'hr manager', 'hr executive'].includes(r)) ||
      ['hr_manager', 'hr', 'hr_admin'].includes(userRoleStr) ||
      userDesigStr.includes('hr')
    ) {
      return 'hr_manager';
    }

    if (
      normalized.some((r) => ['finance_manager', 'payroll_manager', 'finance', 'payroll'].includes(r)) ||
      ['finance_manager', 'payroll_manager'].includes(userRoleStr) ||
      userDesigStr.includes('finance') || userDesigStr.includes('payroll')
    ) {
      return 'finance_manager';
    }

    if (
      normalized.some((r) => ['recruitment_manager', 'recruiter', 'talent_acquisition'].includes(r)) ||
      ['recruitment_manager', 'recruiter'].includes(userRoleStr) ||
      userDesigStr.includes('recruit') || userDesigStr.includes('talent')
    ) {
      return 'recruitment_manager';
    }

    if (
      normalized.some((r) => ['department_head', 'dept_head', 'manager', 'dept_manager', 'department manager', 'reporting_manager'].includes(r)) ||
      ['department_head', 'manager', 'reporting_manager'].includes(userRoleStr) ||
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
      normalized.some((r) => ['auditor', 'compliance_officer'].includes(r)) ||
      ['auditor'].includes(userRoleStr) ||
      userDesigStr.includes('audit')
    ) {
      return 'auditor';
    }

    if (
      normalized.some((r) => ['consultant', 'contractor'].includes(r)) ||
      ['consultant', 'contractor'].includes(userRoleStr) ||
      userDesigStr.includes('consultant')
    ) {
      return 'consultant';
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
   * Helper to normalize user roles list into a list of role codes
   */
  private normalizeUserRoleCodes(userRoles: string[] = [], userRow?: any): string[] {
    const primary = this.resolveRoleCode(userRoles, userRow);
    const codes = new Set<string>();
    codes.add(primary);

    userRoles.forEach((r) => {
      const norm = String(r).toLowerCase().trim();
      if (norm) codes.add(norm);
    });

    if (primary === 'super_admin') {
      codes.add('super_admin');
      codes.add('organization_admin');
    }
    if (primary === 'organization_admin') {
      codes.add('organization_admin');
    }
    if (primary === 'hr_manager') {
      codes.add('hr_manager');
      codes.add('hr');
    }
    if (primary === 'department_head') {
      codes.add('department_head');
      codes.add('manager');
    }
    if (primary === 'team_lead') {
      codes.add('team_lead');
    }

    codes.add('all');
    return Array.from(codes);
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

    // Query policy mapped via policy_assignments or role_policies table
    let policy = await this.db('role_policies as rp')
      .leftJoin('policy_assignments as pa', 'rp.id', 'pa.policy_id')
      .where(function () {
        this.where('rp.role_code', roleCode)
          .orWhere('pa.role_code', roleCode);
      })
      .where('rp.status', 'published')
      .select('rp.*')
      .first();

    if (!policy) {
      policy = await this.db('role_policies as rp')
        .leftJoin('policy_assignments as pa', 'rp.id', 'pa.policy_id')
        .where(function () {
          this.where('rp.role_code', 'employee')
            .orWhere('pa.role_code', 'employee');
        })
        .where('rp.status', 'published')
        .select('rp.*')
        .first();
    }

    if (!policy) {
      return {
        id: 0,
        roleCode: 'employee',
        assignedRoles: ['employee'],
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

    const assignments = await this.db('policy_assignments').where({ policy_id: policy.id }).select('role_code');
    const assignedRoles = assignments.length > 0
      ? assignments.map((a: any) => a.roleCode || a.role_code)
      : [policy.roleCode || policy.role_code || roleCode];

    return {
      id: policy.id,
      roleCode: policy.roleCode || policy.role_code || roleCode,
      assignedRoles,
      documentRef: policy.documentRef || policy.document_ref || `POL-${String(policy.id).padStart(3, '0')}`,
      title: policy.title,
      description: policy.description || '',
      sections: parsedSections,
      status: policy.status || 'published',
      policyAccepted: Boolean(user?.policyAccepted ?? user?.policy_accepted ?? false),
      policyAcceptedAt: (user?.policyAcceptedAt || user?.policy_accepted_at) ? new Date(user.policyAcceptedAt || user.policy_accepted_at).toISOString() : null,
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
    const isSuperAdmin = roles.some((r) => ['super_admin', 'superadmin', 'owner'].includes(String(r).toLowerCase())) || primaryRole === 'super_admin';
    const isOrgAdmin = primaryRole === 'organization_admin';
    const allowedRoleCodes = this.normalizeUserRoleCodes(roles, user);

    let query = this.db('role_policies as rp')
      .leftJoin('policy_assignments as pa', 'rp.id', 'pa.policy_id');

    if (isSuperAdmin) {
      // Super Admin sees ALL policies across all roles & organizations
    } else if (isOrgAdmin) {
      // Org Admin sees policies for their organization or global org policies
      if (organizationId) {
        query = query.where(function () {
          this.whereNull('rp.organization_id').orWhere('rp.organization_id', organizationId);
        });
      }
    } else {
      // HR, Manager, Team Lead, Employee, Intern, Other Roles:
      // Must be published and effective date <= now (or null)
      const now = new Date();
      query = query
        .where('rp.status', 'published')
        .where(function () {
          this.whereNull('rp.effective_date').orWhere('rp.effective_date', '<=', now);
        })
        .where(function () {
          this.whereIn('rp.role_code', allowedRoleCodes)
            .orWhereIn('pa.role_code', allowedRoleCodes);
        });

      if (organizationId) {
        query = query.where(function () {
          this.whereNull('rp.organization_id').orWhere('rp.organization_id', organizationId);
        });
      }
    }

    const rows = await query
      .select('rp.*')
      .groupBy('rp.id')
      .orderBy('rp.id', 'asc');

    // Fetch role assignments for each returned policy
    const policyIds = rows.map((r) => r.id);
    let assignmentsMap: Record<number, string[]> = {};
    if (policyIds.length > 0) {
      const assignments = await this.db('policy_assignments')
        .whereIn('policy_id', policyIds)
        .select('policy_id', 'role_code');

      assignments.forEach((a: any) => {
        const polId = a.policyId || a.policy_id;
        const rCode = a.roleCode || a.role_code;
        if (polId && rCode) {
          if (!assignmentsMap[polId]) assignmentsMap[polId] = [];
          assignmentsMap[polId].push(rCode);
        }
      });
    }

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

      const assignedRoles = (assignmentsMap[p.id] && assignmentsMap[p.id].length > 0)
        ? assignmentsMap[p.id]
        : [p.roleCode || p.role_code || primaryRole];

      const effDate = p.effectiveDate || p.effective_date;
      const acceptedAt = user?.policyAcceptedAt || user?.policy_accepted_at;

      return {
        id: p.id,
        roleCode: p.roleCode || p.role_code || primaryRole,
        assignedRoles,
        documentRef: p.documentRef || p.document_ref || `POL-${String(p.id).padStart(3, '0')}`,
        title: p.title,
        description: p.description || '',
        sections: parsedSections,
        status: p.status || 'published',
        effectiveDate: effDate ? new Date(effDate).toISOString() : null,
        organizationId: p.organizationId || p.organization_id || null,
        createdBy: p.createdBy || p.created_by || null,
        policyAccepted: Boolean(user?.policyAccepted ?? user?.policy_accepted ?? false),
        policyAcceptedAt: acceptedAt ? new Date(acceptedAt).toISOString() : null,
        createdAt: p.createdAt || p.created_at ? new Date(p.createdAt || p.created_at).toISOString() : undefined,
        updatedAt: p.updatedAt || p.updated_at ? new Date(p.updatedAt || p.updated_at).toISOString() : undefined,
      };
    });
  }

  /**
   * Get single policy by ID with strict authorization enforcement
   */
  async getPolicyByIdForUser(policyId: number, userId: number, roles: string[] = [], organizationId?: number): Promise<RolePolicyRecord | null> {
    const all = await this.getAllPoliciesForUser(userId, roles, organizationId);
    return all.find((p) => p.id === policyId) || null;
  }

  /**
   * Create new policy with multi-role assignment (Super Admin & Admin only)
   */
  async createPolicy(data: any, authorId: number, organizationId?: number) {
    const sectionsJson = typeof data.sections === 'string' ? data.sections : JSON.stringify(data.sections || []);
    const now = new Date();

    const assignedRoles: string[] = Array.isArray(data.assignedRoles) && data.assignedRoles.length > 0
      ? data.assignedRoles
      : [data.roleCode || data.role_code || 'employee'];

    const primaryRoleCode = assignedRoles[0] || 'employee';

    const [id] = await this.db('role_policies').insert({
      role_code: primaryRoleCode,
      organization_id: data.organizationId || organizationId || null,
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

    // Create entries in policy_assignments
    for (const roleCode of assignedRoles) {
      await this.db('policy_assignments').insert({
        policy_id: id,
        role_code: roleCode,
        organization_id: data.organizationId || organizationId || null,
        created_at: now,
        updated_at: now,
      });
    }

    return { success: true, message: 'Policy created successfully.', policyId: id };
  }

  /**
   * Update existing policy & role assignments (Super Admin & Admin only)
   */
  async updatePolicy(id: number, data: any, organizationId?: number) {
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
    if (data.organizationId !== undefined) updateData.organization_id = data.organizationId;

    await this.db('role_policies').where({ id }).update(updateData);

    // Update policy_assignments if assignedRoles passed
    const assignedRoles: string[] = Array.isArray(data.assignedRoles)
      ? data.assignedRoles
      : (data.roleCode ? [data.roleCode] : []);

    if (assignedRoles.length > 0) {
      await this.db('policy_assignments').where({ policy_id: id }).delete();
      const now = new Date();
      for (const roleCode of assignedRoles) {
        await this.db('policy_assignments').insert({
          policy_id: id,
          role_code: roleCode,
          organization_id: data.organizationId || organizationId || null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    return { success: true, message: 'Policy updated successfully.' };
  }

  /**
   * Delete or archive a policy
   */
  async deletePolicy(id: number) {
    await this.db('policy_assignments').where({ policy_id: id }).delete();
    await this.db('role_policies').where({ id }).delete();
    return { success: true, message: 'Policy deleted successfully.' };
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
    }).catch(() => { });

    await this.db('super_admins').where({ id: userId }).orWhere({ user_id: userId }).update({
      policy_accepted: 1,
      policy_accepted_at: now,
      updated_at: now,
    }).catch(() => { });

    return {
      success: true,
      message: 'Role policy accepted successfully.',
      policyAccepted: true,
      policyAcceptedAt: now.toISOString(),
    };
  }
}
