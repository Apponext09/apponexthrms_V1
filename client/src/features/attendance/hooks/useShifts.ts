import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useShifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [myShift, setMyShift] = useState<any | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Shift Templates ──────────────────────────────────────

  const getAllShifts = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/shifts', { params: { pageSize: 100, ...params } });
      setShifts(response.data.data || []);
      setError(null);
      return response.data.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shifts');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyShift = useCallback(async (date?: string) => {
    try {
      const response = await apiClient.get('/attendance/my-shift', {
        params: date ? { date } : {},
      });
      setMyShift(response.data.data);
      return response.data.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const createShift = useCallback(async (shiftData: any) => {
    try {
      const response = await apiClient.post('/attendance/shifts', shiftData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shift');
      throw err;
    }
  }, []);

  const updateShift = useCallback(async (shiftId: number, shiftData: any) => {
    try {
      const response = await apiClient.put(`/attendance/shifts/${shiftId}`, shiftData);
      setError(null);
      // Update local state
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, ...response.data.data } : s))
      );
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shift');
      throw err;
    }
  }, []);

  const deleteShift = useCallback(async (shiftId: number) => {
    try {
      await apiClient.delete(`/attendance/shifts/${shiftId}`);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shift');
      throw err;
    }
  }, []);

  const toggleShiftStatus = useCallback(async (shiftId: number, status: 'active' | 'inactive') => {
    try {
      const response = await apiClient.patch(`/attendance/shifts/${shiftId}/status`, { status });
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, status } : s))
      );
      return response.data.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // ─── Assignments ──────────────────────────────────────────

  const assignShift = useCallback(async (assignmentData: any) => {
    try {
      const response = await apiClient.post('/attendance/shifts/assign', assignmentData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign shift');
      throw err;
    }
  }, []);

  const getAllAssignments = useCallback(async (params?: any) => {
    setLoadingAssignments(true);
    try {
      const response = await apiClient.get('/attendance/shifts/assignments', {
        params: { pageSize: 100, isCurrent: true, ...params },
      });
      const data = response.data.data || [];
      setAssignments(data);
      return data;
    } catch (err) {
      setAssignments([]);
      return [];
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const deleteAssignment = useCallback(async (assignmentId: number) => {
    try {
      const response = await apiClient.delete(`/attendance/shifts/assignments/${assignmentId}`);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment');
      throw err;
    }
  }, []);

  // ─── Swap Requests ────────────────────────────────────────

  const requestSwap = useCallback(async (swapData: any) => {
    try {
      const response = await apiClient.post('/attendance/shift-swap', swapData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request swap');
      throw err;
    }
  }, []);

  const getAllSwapRequests = useCallback(async (params?: any) => {
    setLoadingSwaps(true);
    try {
      const response = await apiClient.get('/attendance/shift-swaps', {
        params: { pageSize: 100, ...params },
      });
      const data = response.data.data || [];
      setSwapRequests(data);
      return data;
    } catch (err) {
      setSwapRequests([]);
      return [];
    } finally {
      setLoadingSwaps(false);
    }
  }, []);

  const approveSwap = useCallback(async (swapId: number) => {
    try {
      const response = await apiClient.post(`/attendance/shift-swaps/${swapId}/approve`);
      setSwapRequests((prev) =>
        prev.map((s) => (s.id === swapId ? { ...s, status: 'approved' } : s))
      );
      return response.data.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const rejectSwap = useCallback(async (swapId: number, reason?: string) => {
    try {
      const response = await apiClient.post(`/attendance/shift-swaps/${swapId}/reject`, { reason });
      setSwapRequests((prev) =>
        prev.map((s) => (s.id === swapId ? { ...s, status: 'rejected' } : s))
      );
      return response.data.data;
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    // State
    shifts,
    myShift,
    assignments,
    swapRequests,
    loading,
    loadingAssignments,
    loadingSwaps,
    error,
    // Shift template actions
    getAllShifts,
    getMyShift,
    createShift,
    updateShift,
    deleteShift,
    toggleShiftStatus,
    // Assignment actions
    assignShift,
    getAllAssignments,
    deleteAssignment,
    // Swap actions
    requestSwap,
    getAllSwapRequests,
    approveSwap,
    rejectSwap,
  };
}
