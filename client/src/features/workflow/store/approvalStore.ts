import { create } from 'zustand';
import { apiClient as api } from '@/config/api';

interface Approval {
  id: number;
  instance_id: number;
  step_id: number;
  step_number: number;
  approver_id: number;
  status: 'pending' | 'approved' | 'rejected';
  assigned_at: string;
  [key: string]: any;
}

interface ApprovalStore {
  approvals: Approval[];
  pendingCount: number;
  selectedApproval: Approval | null;

  setApprovals: (approvals: Approval[]) => void;
  setPendingCount: (count: number) => void;
  setSelectedApproval: (approval: Approval | null) => void;

  loadPendingApprovals: (page?: number, pageSize?: number) => Promise<void>;
  approveApproval: (approvalId: number, comment?: string) => Promise<void>;
  rejectApproval: (approvalId: number, reason: string) => Promise<void>;
  delegateApproval: (
    approvalId: number,
    toUserId: number,
    reason?: string
  ) => Promise<void>;
  escalateApproval: (
    approvalId: number,
    toUserId: number,
    reason?: string
  ) => Promise<void>;
}

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  approvals: [],
  pendingCount: 0,
  selectedApproval: null,

  setApprovals: (approvals) => set({ approvals }),

  setPendingCount: (count) => set({ pendingCount: count }),

  setSelectedApproval: (approval) => set({ selectedApproval: approval }),

  loadPendingApprovals: async (page = 1, pageSize = 20) => {
    try {
      const res = await api.get(`/approvals/pending?page=${page}&pageSize=${pageSize}`);
      set({
        approvals: res.data.data,
        pendingCount: res.data.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      throw error;
    }
  },

  approveApproval: async (approvalId, comment) => {
    try {
      await api.post(`/approvals/${approvalId}/approve`, { comment });
      const { approvals } = get();
      set({
        approvals: approvals.map((a) =>
          a.id === approvalId ? { ...a, status: 'approved' } : a
        ),
      });
    } catch (error) {
      console.error('Failed to approve:', error);
      throw error;
    }
  },

  rejectApproval: async (approvalId, reason) => {
    try {
      await api.post(`/approvals/${approvalId}/reject`, { reason });
      const { approvals } = get();
      set({
        approvals: approvals.map((a) =>
          a.id === approvalId ? { ...a, status: 'rejected' } : a
        ),
      });
    } catch (error) {
      console.error('Failed to reject:', error);
      throw error;
    }
  },

  delegateApproval: async (approvalId, toUserId, reason) => {
    try {
      await api.post(`/approvals/${approvalId}/delegate`, {
        toUserId,
        reason,
      });
      const { approvals } = get();
      set({
        approvals: approvals.filter((a) => a.id !== approvalId),
      });
    } catch (error) {
      console.error('Failed to delegate:', error);
      throw error;
    }
  },

  escalateApproval: async (approvalId, toUserId, reason) => {
    try {
      await api.post(`/approvals/${approvalId}/escalate`, {
        toUserId,
        reason,
      });
      const { approvals } = get();
      set({
        approvals: approvals.filter((a) => a.id !== approvalId),
      });
    } catch (error) {
      console.error('Failed to escalate:', error);
      throw error;
    }
  },
}));

