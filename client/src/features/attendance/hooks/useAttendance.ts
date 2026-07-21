import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';
import type { AttendanceRecord } from '../types';

export function useAttendance() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCheckInStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/status');
      setIsCheckedIn(response.data.data?.isCheckedIn || false);
      setCheckInTime(response.data.data?.checkInTime || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get check-in status');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIn = useCallback(
    async (params: {
      method: string;
      latitude?: number;
      longitude?: number;
      locationId?: number;
    }) => {
      setLoading(true);
      try {
        const response = await apiClient.post('/attendance/check-in', params);
        setIsCheckedIn(true);
        setCheckInTime(response.data.data?.check_in_time || null);
        setError(null);
        return response.data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Check-in failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const checkOut = useCallback(
    async (params: {
      method: string;
      latitude?: number;
      longitude?: number;
      locationId?: number;
    }) => {
      setLoading(true);
      try {
        const response = await apiClient.post('/attendance/check-out', params);
        setIsCheckedIn(false);
        setError(null);
        return response.data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Check-out failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const breakIn = useCallback(
    async (breakType: string = 'lunch') => {
      setLoading(true);
      try {
        const response = await apiClient.post('/attendance/break-in', { breakType });
        setError(null);
        return response.data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Break-in failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const breakOut = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/break-out', {});
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Break-out failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTodayRecord = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/today');
      setError(null);
      return response.data.data as AttendanceRecord;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get today\'s record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isCheckedIn,
    checkInTime,
    loading,
    error,
    getCheckInStatus,
    checkIn,
    checkOut,
    breakIn,
    breakOut,
    getTodayRecord,
  };
}

