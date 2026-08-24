import { getKnex } from '../../db/knex';

export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface UserRolePolicyResponse {
  policyId: number;
  roleCode: string;
  title: string;
  description: string;
  sections: PolicySection[];
  policyAccepted: boolean;
  policyAcceptedAt: string | null;
}

export class RolePolicyService {
  private db = getKnex();

  /**
   * Determine primary role code for policy selection
   */
  private resolveRoleCode(userRoles: string[] = []): string {
    const normalized = userRoles.map((r) => String(r).toLowerCase().trim());

    if (normalized.some((r) => ['super_admin', 'superadmin', 'organization_admin', 'admin'].includes(r))) {
      return 'organization_admin';
    }
    if (normalized.some((r) => ['hr_manager', 'hr_admin', 'hr', 'hr_executive'].includes(r))) {
      return 'hr_manager';
    }
    if (normalized.some((r) => ['department_head', 'dept_head', 'manager', 'dept_manager'].includes(r))) {
      return 'department_head';
    }
    if (normalized.some((r) => ['team_lead', 'teamlead', 'lead'].includes(r))) {
      return 'team_lead';
    }
    if (normalized.some((r) => ['intern', 'trainee'].includes(r))) {
      return 'intern';
    }

    // Default or primary role code fallback
    return normalized[0] || 'employee';
  }

  /**
   * Get role-assigned policy document for the current authenticated user
   */
  async getPolicyForUser(userId: number, roles: string[] = []): Promise<UserRolePolicyResponse> {
    const user = await this.db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found.');
    }

    const roleCode = this.resolveRoleCode(roles);

    // Fetch exact role policy or fallback to employee policy
    let policy = await this.db('role_policies').where({ role_code: roleCode }).first();
    if (!policy) {
      policy = await this.db('role_policies').where({ role_code: 'employee' }).first();
    }

    if (!policy) {
      // Fallback dummy structure if table is empty
      return {
        policyId: 0,
        roleCode: 'employee',
        title: 'Apponext HRMS Employee Code of Conduct & Workplace Policy',
        description: 'Standard workplace policy regarding ethics, attendance, asset care, and IT security.',
        sections: [
          {
            id: 'emp_1',
            title: '1. Professional Ethics & Conduct',
            content: 'Employees must interact professionally, respectfully, and adhere to corporate guidelines.',
          },
        ],
        policyAccepted: Boolean(user.policy_accepted),
        policyAcceptedAt: user.policy_accepted_at ? new Date(user.policy_accepted_at).toISOString() : null,
      };
    }

    let parsedSections: PolicySection[] = [];
    try {
      parsedSections = typeof policy.sections === 'string' ? JSON.parse(policy.sections) : policy.sections;
    } catch {
      parsedSections = [];
    }

    return {
      policyId: policy.id,
      roleCode: policy.role_code || roleCode,
      title: policy.title,
      description: policy.description || '',
      sections: parsedSections,
      policyAccepted: Boolean(user.policy_accepted ?? user.policyAccepted ?? false),
      policyAcceptedAt: (user.policy_accepted_at || user.policyAcceptedAt) ? new Date(user.policy_accepted_at || user.policyAcceptedAt).toISOString() : null,
    };
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
    });

    return {
      success: true,
      message: 'Role policy accepted successfully.',
      policyAccepted: true,
      policyAcceptedAt: now.toISOString(),
    };
  }
}
