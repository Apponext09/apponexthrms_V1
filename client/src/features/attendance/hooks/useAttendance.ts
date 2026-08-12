import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';
import type { AttendanceRecord } from '../types';

export interface BreakTypeOption {
  id: number;
  uuid?: string;
  name: string;
  break_type?: 'Manual' | 'Auto';
  max_allow_time?: string; // HH:MM
  is_active?: 'Yes' | 'No';
}

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
      return response.data.data;
    } catch (err) {
      // Gracefully handle check-in status fetch without displaying raw 500 error box
      setIsCheckedIn(false);
      setCheckInTime(null);
      return null;
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

  /**
   * Start break — no type needed at this stage; type is selected when stopping
   */
  const breakIn = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/break-in', {});
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Break-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Stop break — employee selects the break type after stopping
   */
  const breakOut = useCallback(
    async (params?: {
      breakTypeName?: string;
      breakSettingId?: number;
    }) => {
      setLoading(true);
      try {
        const response = await apiClient.post('/attendance/break-out', {
          breakTypeName: params?.breakTypeName,
          breakSettingId: params?.breakSettingId,
        });
        setError(null);
        return response.data.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Break-out failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get active break types directly from the breaks database settings table
   */
  const getBreakTypes = useCallback(async (): Promise<BreakTypeOption[]> => {
    try {
      const response = await apiClient.get('/settings/breaks?is_active=Yes&pageSize=100');
      const items: any[] = Array.isArray(response.data?.data)
        ? response.data.data
        : response.data?.data?.items || [];

      return items.map((b: any) => ({
        id: b.id,
        uuid: b.uuid,
        name: b.name,
        break_type: b.break_type || b.breakType,
        max_allow_time: b.max_allow_time || b.maxAllowTime,
        is_active: b.is_active || b.isActive,
      }));
    } catch (err) {
      console.warn('Failed to fetch break types from breaks table:', err);
      return [];
    }
  }, []);

  const getTodayRecord = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/today');
      setError(null);
      return response.data.data as AttendanceRecord;
    } catch (err) {
      // Gracefully handle empty or 500 status without throwing
      return null;
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
    getBreakTypes,
    getTodayRecord,
  };
}
