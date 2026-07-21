import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useShifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [myShift, setMyShift] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAllShifts = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/shifts', { params });
      setShifts(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyShift = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/my-shift', {
        params: date ? { date } : {},
      });
      setMyShift(response.data.data);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shift');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createShift = useCallback(async (shiftData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/shifts', shiftData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shift');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignShift = useCallback(async (assignmentData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/shifts/assign', assignmentData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign shift');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestSwap = useCallback(async (swapData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/shift-swap', swapData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request swap');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    shifts,
    myShift,
    loading,
    error,
    getAllShifts,
    getMyShift,
    createShift,
    assignShift,
    requestSwap,
  };
}

