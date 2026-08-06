import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useOvertime() {
  const [requests, setRequests] = useState<any[]>([]);

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



  return {
    requests,
    loading,
    error,
    requestOvertime,
    getMyRequests,
  };
}

