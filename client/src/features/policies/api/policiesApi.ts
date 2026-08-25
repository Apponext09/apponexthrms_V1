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
    const res = await apiClient.get('/auth/policies/dashboard-stats');
    return res.data?.data || {
      totalPolicies: 0,
      publishedPolicies: 0,
      draftPolicies: 0,
      archivedPolicies: 0,
      employeesAcknowledgedPercent: 0,
      pendingAcknowledgements: 0,
    };
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
    const res = await apiClient.get('/auth/policies/admin-list', { params });
    return res.data?.data || [];
  },

  /**
   * Get Employee My Policies portal list
   */
  async getMyPolicies(): Promise<RolePolicyRecord[]> {
    const res = await apiClient.get('/auth/role-policies');
    return res.data?.data || [];
  },

  /**
   * Get single policy by ID
   */
  async getPolicyById(id: number): Promise<RolePolicyRecord | null> {
    const res = await apiClient.get(`/auth/role-policies/${id}`);
    return res.data?.data || null;
  },

  /**
   * Create new policy
   */
  async createPolicy(payload: Partial<RolePolicyRecord> & { changeDescription?: string }): Promise<any> {
    const res = await apiClient.post('/auth/role-policies', payload);
    return res.data;
  },

  /**
   * Update existing policy
   */
  async updatePolicy(id: number, payload: Partial<RolePolicyRecord> & { changeDescription?: string }): Promise<any> {
    const res = await apiClient.put(`/auth/role-policies/${id}`, payload);
    return res.data;
  },

  /**
   * Archive a policy
   */
  async archivePolicy(id: number): Promise<any> {
    const res = await apiClient.post(`/auth/policies/${id}/archive`);
    return res.data;
  },

  /**
   * Get Policy Version History
   */
  async getVersionHistory(id: number): Promise<PolicyVersionRecord[]> {
    const res = await apiClient.get(`/auth/policies/${id}/versions`);
    return res.data?.data || [];
  },

  /**
   * Acknowledge a policy
   */
  async acknowledgePolicy(policyId: number, comments?: string): Promise<any> {
    const res = await apiClient.post(`/auth/policies/${policyId}/acknowledge`, { comments });
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
    const res = await apiClient.get('/auth/policies/reports/acknowledgements', { params });
    return res.data?.data || {
      summary: { totalEmployees: 0, acknowledged: 0, pending: 0, notApplicable: 0 },
      report: [],
    };
  },

  /**
   * Send reminder to pending employees for a policy
   */
  async sendReminder(policyId: number): Promise<any> {
    const res = await apiClient.post(`/auth/policies/${policyId}/send-reminder`);
    return res.data;
  },
};
