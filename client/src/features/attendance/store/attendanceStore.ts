import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AttendanceRecord } from '../types';

interface BreakState {
  isOnBreak: boolean;
  breakStartTime: string | null;
  assignedBreakMinutes: number;
  totalUsedMinutes: number;
  remainingBreakMinutes: number;
  isBreakQuotaExhausted: boolean;
}

interface AttendanceStoreState {
  // State
  currentRecord: AttendanceRecord | null;
  isCheckedIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  todayDuration: number | null;

  // Break State (persisted to localStorage for reload recovery)
  isOnBreak: boolean;
  breakStartTime: string | null;
  assignedBreakMinutes: number;
  totalUsedMinutes: number;
  remainingBreakMinutes: number;
  isBreakQuotaExhausted: boolean;

  // Actions
  setCurrentRecord: (record: AttendanceRecord | null) => void;
  setCheckedIn: (checked: boolean, time?: string) => void;
  setCheckedOut: (time: string) => void;
  setOnBreak: (onBreak: boolean, time?: string) => void;
  updateDuration: (minutes: number | null) => void;
  /** Set full break status from API response (e.g. /attendance/status) */
  setBreakStatusFromAPI: (status: {
    isOnBreak: boolean;
    isBreakQuotaExhausted: boolean;
    assignedBreakMinutes: number;
    totalBreakMinutes: number;
    remainingBreakMinutes: number;
    activeBreak?: { breakStartTime?: string | null } | null;
  }) => void;
  /** Called when break ends successfully */
  clearBreakState: () => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceStoreState>()(
  persist(
    (set) => ({
      // Initial state
      currentRecord: null,
      isCheckedIn: false,
      checkInTime: null,
      checkOutTime: null,
      todayDuration: null,
      isOnBreak: false,
      breakStartTime: null,
      assignedBreakMinutes: 60,
      totalUsedMinutes: 0,
      remainingBreakMinutes: 60,
      isBreakQuotaExhausted: false,

      // Actions
      setCurrentRecord: (record) =>
        set({
          currentRecord: record,
          isCheckedIn: !!record?.check_in_time,
          checkInTime: record?.check_in_time || null,
          checkOutTime: record?.check_out_time || null,
          todayDuration: record?.duration_minutes || null,
        }),

      setCheckedIn: (checked, time) =>
        set({
          isCheckedIn: checked,
          checkInTime: time || (checked ? new Date().toISOString() : null),
        }),

      setCheckedOut: (time) =>
        set({
          isCheckedIn: false,
          checkOutTime: time,
        }),

      setOnBreak: (onBreak, time) =>
        set({
          isOnBreak: onBreak,
          breakStartTime: time || (onBreak ? new Date().toISOString() : null),
        }),

      updateDuration: (minutes) =>
        set({
          todayDuration: minutes,
        }),

      setBreakStatusFromAPI: (status) =>
        set({
          isOnBreak: status.isOnBreak,
          breakStartTime: status.activeBreak?.breakStartTime || null,
          assignedBreakMinutes: status.assignedBreakMinutes || 60,
          totalUsedMinutes: status.totalBreakMinutes || 0,
          remainingBreakMinutes: status.remainingBreakMinutes || 0,
          isBreakQuotaExhausted: status.isBreakQuotaExhausted || false,
        }),

      clearBreakState: () =>
        set({
          isOnBreak: false,
          breakStartTime: null,
        }),

      reset: () =>
        set({
          currentRecord: null,
          isCheckedIn: false,
          checkInTime: null,
          checkOutTime: null,
          todayDuration: null,
          isOnBreak: false,
          breakStartTime: null,
          assignedBreakMinutes: 60,
          totalUsedMinutes: 0,
          remainingBreakMinutes: 60,
          isBreakQuotaExhausted: false,
        }),
    }),
    {
      name: 'hrms_attendance_break_state',
      // Only persist the break-related fields for reload recovery
      partialize: (state) => ({
        isOnBreak: state.isOnBreak,
        breakStartTime: state.breakStartTime,
        isCheckedIn: state.isCheckedIn,
        checkInTime: state.checkInTime,
      }),
    }
  )
);
