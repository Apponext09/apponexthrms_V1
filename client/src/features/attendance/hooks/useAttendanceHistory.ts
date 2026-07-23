import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';
import type { AttendanceRecord } from '../types';

export function useAttendanceHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHistory = useCallback(
    async (params?: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    }) => {
      setLoading(true);
      try {
        const response = await apiClient.get('/attendance/history', { params });
        setRecords(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
        setError(null);
      } catch (err) {
        setRecords([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    records,
    total,
    loading,
    error,
    getHistory,
  };
}
