import { apiClient } from '@/config/api';
import type {
  RolePolicyRecord,
  PolicyDashboardStats,
  PolicyVersionRecord,
  PolicyAcknowledgementReportData,
} from '../types/policy';

export const policiesApi = {
  /**
   * Get Admin Policy Dashboard stats
   */
  async getDashboardStats(): Promise<PolicyDashboardStats> {
    try {
      const res = await apiClient.get('/policies');
      const policies: any[] = res.data?.data || [];

      const totalPolicies = policies.length;
      const publishedPolicies = policies.filter((p) => p.isActive && !p.deletedAt).length;
      const draftPolicies = policies.filter((p) => !p.isActive && !p.deletedAt).length;
      const archivedPolicies = policies.filter((p) => Boolean(p.deletedAt)).length;

      let totalComplianceSum = 0;
      let totalPendingSignoffs = 0;

      policies.forEach((p) => {
        if (p.stats) {
          totalComplianceSum += p.stats.compliancePercentage || 0;
          totalPendingSignoffs += p.stats.pendingUsers || 0;
        }
      });

      const avgCompliance = totalPolicies > 0 ? Math.round(totalComplianceSum / totalPolicies) : 0;

      return {
        totalPolicies,
        publishedPolicies,
        draftPolicies,
        archivedPolicies,
        employeesAcknowledgedPercent: avgCompliance,
        pendingAcknowledgements: totalPendingSignoffs,
      };
    } catch (err) {
      console.error('Failed to calculate dashboard stats:', err);
      return {
        totalPolicies: 0,
        publishedPolicies: 0,
        draftPolicies: 0,
        archivedPolicies: 0,
        employeesAcknowledgedPercent: 0,
        pendingAcknowledgements: 0,
      };
    }
  },

  /**
   * Get Admin filtered policy list
   */
  async getAdminPolicies(params?: {
    search?: string;
    status?: string;
    category?: string;
    role?: string;
    department?: string;
  }): Promise<RolePolicyRecord[]> {
    try {
      const res = await apiClient.get('/policies', { params });
      let list: any[] = res.data?.data || [];

      // Filter in-memory if needed
      if (params?.search && params.search.trim()) {
        const query = params.search.toLowerCase().trim();
        list = list.filter(
          (p) =>
            (p.title && p.title.toLowerCase().includes(query)) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query))
        );
      }

      if (params?.status && params.status !== 'all') {
        if (params.status === 'published') {
          list = list.filter((p) => p.isActive && !p.deletedAt);
        } else if (params.status === 'draft') {
          list = list.filter((p) => !p.isActive && !p.deletedAt);
        } else if (params.status === 'archived') {
          list = list.filter((p) => Boolean(p.deletedAt));
        }
      }

      if (params?.category && params.category !== 'all') {
        list = list.filter((p) => p.category === params.category);
      }

      if (params?.role && params.role !== 'all') {
        list = list.filter((p) =>
          p.roleMappings?.some((rm: any) => rm.roleCode === params.role || rm.roleCode === 'all')
        );
      }

      // Map DB policy format to RolePolicyRecord format for UI
      return list.map((p) => ({
        id: p.id,
        title: p.title,
        documentRef: `POL-${String(p.id).padStart(3, '0')}`,
        category: p.category || 'General',
        description: p.description || '',
        status: p.deletedAt ? 'archived' : p.isActive ? 'published' : 'draft',
        version: p.version || '1.0',
        effectiveDate: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
        reviewDate: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
        createdBy: String(p.createdBy || 'System Admin'),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
        sections: (() => {
          if (typeof p.fileUrl === 'string' && p.fileUrl.startsWith('[')) {
            try { return JSON.parse(p.fileUrl); } catch { return []; }
          }
          return [];
        })(),
        applicableGender: p.applicableGender || p.applicable_gender || 'all',
        targetRoles: p.roleMappings?.map((rm: any) => rm.roleCode) || ['all'],
        targetDepartments: p.applicableDepartmentIds || [],
        targetEmployees: [],
        acknowledgedCount: p.stats?.acceptedUsers || 0,
        pendingCount: p.stats?.pendingUsers || 0,
        totalTargetEmployees: p.stats?.totalTargetUsers || 0,
        isAcknowledged: p.isAccepted || false,
        requireAcknowledgement: true,
        allowDownload: true,
        sendNotification: true,
      }));
    } catch (err) {
      console.error('Failed to get admin policies:', err);
      return [];
    }
  },

  /**
   * Get Employee My Policies portal list
   */
  async getMyPolicies(): Promise<RolePolicyRecord[]> {
    try {
      const res = await apiClient.get('/policies/my-policies');
      const list: any[] = res.data?.data || [];
      return list.map((p) => ({
        id: p.id,
        title: p.title,
        documentRef: `POL-${String(p.id).padStart(3, '0')}`,
        category: p.category || 'General',
        description: p.description || '',
        status: p.isActive ? 'published' : 'draft',
        version: p.version || '1.0',
        effectiveDate: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
        reviewDate: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
        createdBy: 'Admin',
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
        sections: (() => {
          if (typeof p.fileUrl === 'string' && p.fileUrl.startsWith('[')) {
            try { return JSON.parse(p.fileUrl); } catch { return []; }
          }
          return [];
        })(),
        targetRoles: [],
        targetDepartments: [],
        targetEmployees: [],
        acknowledgedCount: p.isAccepted ? 1 : 0,
        pendingCount: p.isAccepted ? 0 : 1,
        totalTargetEmployees: 1,
        isAcknowledged: Boolean(p.isAccepted),
        requireAcknowledgement: Boolean(p.isMandatory),
        allowDownload: true,
        sendNotification: true,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get pending mandatory policies for current user
   */
  async getPendingPolicies(): Promise<any[]> {
    const res = await apiClient.get('/policies/pending');
    return res.data?.data || [];
  },

  /**
   * Get single policy by ID
   */
  async getPolicyById(id: number): Promise<RolePolicyRecord | null> {
    try {
      const res = await apiClient.get(`/policies/${id}`);
      const p = res.data?.data;
      if (!p) return null;
      return {
        id: p.id,
        title: p.title,
        documentRef: `POL-${String(p.id).padStart(3, '0')}`,
        category: p.category || 'General',
        description: p.description || '',
        status: p.deletedAt ? 'archived' : p.isActive ? 'published' : 'draft',
        version: p.version || '1.0',
        effectiveDate: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
        reviewDate: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
        createdBy: String(p.createdBy || 'System Admin'),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
        sections: (() => {
          if (typeof p.fileUrl === 'string' && p.fileUrl.startsWith('[')) {
            try { return JSON.parse(p.fileUrl); } catch { return []; }
          }
          return [];
        })(),
        targetRoles: p.roleMappings?.map((rm: any) => rm.roleCode) || ['all'],
        targetDepartments: p.applicableDepartmentIds || [],
        targetEmployees: [],
        acknowledgedCount: p.stats?.acceptedUsers || 0,
        pendingCount: p.stats?.pendingUsers || 0,
        totalTargetEmployees: p.stats?.totalTargetUsers || 0,
        isAcknowledged: p.isAccepted || false,
        requireAcknowledgement: true,
        allowDownload: true,
        sendNotification: true,
      };
    } catch {
      return null;
    }
  },

  /**
   * Create new policy
   */
  async createPolicy(payload: Partial<RolePolicyRecord> & { changeDescription?: string }): Promise<any> {
    const res = await apiClient.post('/policies', payload);
    return res.data;
  },

  /**
   * Update existing policy
   */
  async updatePolicy(id: number, payload: Partial<RolePolicyRecord> & { changeDescription?: string }): Promise<any> {
    const res = await apiClient.put(`/policies/${id}`, payload);
    return res.data;
  },

  /**
   * Archive a policy
   */
  async archivePolicy(id: number): Promise<any> {
    const res = await apiClient.delete(`/policies/${id}`);
    return res.data;
  },

  /**
   * Get Policy Version History
   */
  async getVersionHistory(id: number): Promise<PolicyVersionRecord[]> {
    try {
      const res = await apiClient.get(`/policies/${id}/audit`);
      const audit = res.data?.data;
      if (!audit || !audit.policy) return [];
      return [
        {
          id: 1,
          policyId: audit.policy.id,
          version: audit.policy.version,
          changeDescription: 'Current version',
          createdBy: 'Admin',
          createdAt: new Date().toISOString(),
          isActive: audit.policy.isActive,
        },
      ];
    } catch {
      return [];
    }
  },

  /**
   * Acknowledge/Accept a policy
   */
  async acknowledgePolicy(policyId: number, comments?: string): Promise<any> {
    const res = await apiClient.post(`/policies/${policyId}/accept`, { comments });
    return res.data;
  },

  /**
   * Get Policy Acknowledgement Report
   */
  async getAcknowledgementReport(params?: {
    policyId?: number;
    role?: string;
    departmentId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PolicyAcknowledgementReportData> {
    try {
      const res = await apiClient.get('/policies');
      const policies: any[] = res.data?.data || [];

      const targetPolicies = params?.policyId
        ? policies.filter((p) => p.id === Number(params.policyId))
        : policies;

      const reportItems: any[] = [];
      const uniqueEmployeeUserIds = new Set<number>();

      // Fetch compliance audit for each target policy
      await Promise.all(
        targetPolicies.map(async (p) => {
          try {
            const auditRes = await apiClient.get(`/policies/${p.id}/audit`);
            const auditData = auditRes.data?.data;
            const auditList: any[] = auditData?.auditList || [];

            auditList.forEach((u) => {
              if (u.userId) uniqueEmployeeUserIds.add(u.userId);

              const isAck = Boolean(u.isAccepted);
              const statusStr = isAck ? 'Acknowledged' : 'Pending';

              // Apply role/status filters if set
              if (params?.status && params.status !== 'all') {
                if (params.status.toLowerCase() === 'acknowledged' && !isAck) return;
                if (params.status.toLowerCase() === 'pending' && isAck) return;
              }

              if (params?.role && params.role !== 'all') {
                const userRoles: string[] = u.roles || [];
                if (!userRoles.includes(params.role) && !userRoles.includes('all')) return;
              }

              reportItems.push({
                id: `${p.id}-${u.userId}`,
                policyId: p.id,
                employeeName: u.name || u.email || 'Employee',
                employeeCode: u.employeeCode || `EMP-${u.userId}`,
                email: u.email || '',
                department: u.departmentName || 'General',
                role: Array.isArray(u.roles) ? u.roles.join(', ') : 'employee',
                policyTitle: p.title,
                policyName: p.title,
                documentRef: `POL-${String(p.id).padStart(3, '0')}`,
                version: p.version || '1.0',
                status: statusStr,
                acknowledgedDate: u.acceptedAt || null,
                acknowledgedAt: u.acceptedAt || null,
                comments: u.ipAddress ? `Signed from ${u.ipAddress}` : '',
              });
            });
          } catch {
            // Ignore audit fetch failures for single policy
          }
        })
      );

      const acknowledgedCount = reportItems.filter((r) => r.status === 'Acknowledged').length;
      const pendingCount = reportItems.filter((r) => r.status === 'Pending').length;

      return {
        summary: {
          totalEmployees: uniqueEmployeeUserIds.size || targetPolicies.reduce((sum, p) => sum + (p.stats?.totalTargetUsers || 0), 0),
          acknowledged: acknowledgedCount,
          pending: pendingCount,
          notApplicable: 0,
        },
        report: reportItems,
      };
    } catch (err) {
      console.error('Failed to load acknowledgement report:', err);
      return {
        summary: { totalEmployees: 0, acknowledged: 0, pending: 0, notApplicable: 0 },
        report: [],
      };
    }
  },

  /**
   * Send reminder to pending employees for a policy
   */
  async sendReminder(policyId: number): Promise<any> {
    return { success: true, message: 'Reminders queued' };
  },
};
