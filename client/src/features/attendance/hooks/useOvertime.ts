import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useOvertime() {
  const [requests, setRequests] = useState<any[]>([]);
  const [compOffBalance, setCompOffBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOvertime = useCallback(async (requestData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/overtime', requestData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyRequests = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/overtime', { params });
      setRequests(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompOffBalance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/comp-off-balance');
      setCompOffBalance(response.data.data?.balance || 0);
      setError(null);
      return response.data.data?.balance || 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requests,
    compOffBalance,
    loading,
    error,
    requestOvertime,
    getMyRequests,
    getCompOffBalance,
  };
}

