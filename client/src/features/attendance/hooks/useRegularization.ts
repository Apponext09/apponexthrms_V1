import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useRegularization() {
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(async (requestData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/regularization', requestData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyRequests = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/regularization', { params });
      setRequests(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPending = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/regularization/pending', { params });
      setPendingRequests(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending');
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(async (id: number, comments?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.patch(`/attendance/regularization/${id}/approve`, { comments });
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requests,
    pendingRequests,
    loading,
    error,
    createRequest,
    getMyRequests,
    getPending,
    approve,
  };
}

