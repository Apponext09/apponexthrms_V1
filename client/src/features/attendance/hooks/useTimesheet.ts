import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useTimesheet() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [entries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTimesheet = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/timesheets', data);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addEntry = useCallback(async (timesheetId: number, entryData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post(`/attendance/timesheets/${timesheetId}/entries`, entryData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyTimesheets = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/timesheets', { params });
      setTimesheets(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitTimesheet = useCallback(async (timesheetId: number) => {
    setLoading(true);
    try {
      const response = await apiClient.post(`/attendance/timesheets/${timesheetId}/submit`, {});
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    timesheets,
    entries,
    loading,
    error,
    createTimesheet,
    addEntry,
    getMyTimesheets,
    submitTimesheet,
  };
}

