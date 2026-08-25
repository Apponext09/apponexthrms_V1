import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

export interface PolicyDocument {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  title: string;
  description?: string | null;
  category: string;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  version: string;
  isActive: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other';
  applicableDepartmentIds?: number[];
  createdBy: number;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  roleMappings?: Array<{
    roleCode: string;
    isMandatory: boolean;
  }>;
  stats?: {
    totalTargetUsers: number;
    acceptedUsers: number;
    pendingUsers: number;
    compliancePercentage: number;
  };
}

export interface UserPolicyView extends PolicyDocument {
  isMandatory: boolean;
  isAccepted: boolean;
  acceptedAt?: string | null;
  acceptedVersion?: string | null;
  isVersionCurrent: boolean;
}

export interface CreatePolicyPayload {
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  version?: string;
  isActive?: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other';
  applicableDepartmentIds?: number[];
  roleMappings: Array<{
    roleCode: string;
    isMandatory?: boolean;
  }>;
}

export interface UpdatePolicyPayload {
  title?: string;
  description?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  version?: string;
  isActive?: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other';
  applicableDepartmentIds?: number[];
  roleMappings?: Array<{
    roleCode: string;
    isMandatory?: boolean;
  }>;
}

export interface PolicyAuditUser {
  userId: number;
  employeeId?: number | null;
  name: string;
  employeeCode?: string | null;
  email: string;
  departmentName: string;
  roles: string[];
  policyVersion: string;
  isAccepted: boolean;
  acceptedVersion?: string | null;
  acceptedAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PolicyAuditResponse {
  policy: {
    id: number;
    title: string;
    version: string;
    category: string;
    isActive: boolean;
  };
  auditList: PolicyAuditUser[];
}

export function usePolicies() {
  return useQuery<PolicyDocument[]>({
    queryKey: ['policies', 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/policies');
      return res.data?.data || [];
    },
    staleTime: 30000,
  });
}

export function usePolicy(id: number | null) {
  return useQuery<PolicyDocument>({
    queryKey: ['policies', id],
    queryFn: async () => {
      const res = await apiClient.get(`/policies/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });
}

export function usePendingPolicies(options?: { enabled?: boolean }) {
  return useQuery<UserPolicyView[]>({
    queryKey: ['policies', 'pending'],
    queryFn: async () => {
      const res = await apiClient.get('/policies/pending');
      return res.data?.data || [];
    },
    staleTime: 10000,
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useMyPolicies() {
  return useQuery<UserPolicyView[]>({
    queryKey: ['policies', 'my-policies'],
    queryFn: async () => {
      const res = await apiClient.get('/policies/my-policies');
      return res.data?.data || [];
    },
    staleTime: 30000,
  });
}

export function usePolicyAudit(policyId: number | null) {
  return useQuery<PolicyAuditResponse>({
    queryKey: ['policies', 'audit', policyId],
    queryFn: async () => {
      const res = await apiClient.get(`/policies/${policyId}/audit`);
      return res.data?.data;
    },
    enabled: !!policyId,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePolicyPayload) => {
      const res = await apiClient.post('/policies', payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy document created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create policy document');
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdatePolicyPayload }) => {
      const res = await apiClient.put(`/policies/${id}`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy document updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update policy document');
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/policies/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy document deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete policy document');
    },
  });
}

export function useAcceptPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policyId: number) => {
      const res = await apiClient.post(`/policies/${policyId}/accept`);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to accept policy');
    },
  });
}
