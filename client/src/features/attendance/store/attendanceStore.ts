import { create } from 'zustand';
import type { AttendanceRecord } from '../types';

interface AttendanceStoreState {
  // State
  currentRecord: AttendanceRecord | null;
  isCheckedIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  todayDuration: number | null;
  isOnBreak: boolean;
  breakStartTime: string | null;

  // Actions
  setCurrentRecord: (record: AttendanceRecord | null) => void;
  setCheckedIn: (checked: boolean, time?: string) => void;
  setCheckedOut: (time: string) => void;
  setOnBreak: (onBreak: boolean, time?: string) => void;
  updateDuration: (minutes: number | null) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceStoreState>((set) => ({
  // Initial state
  currentRecord: null,
  isCheckedIn: false,
  checkInTime: null,
  checkOutTime: null,
  todayDuration: null,
  isOnBreak: false,
  breakStartTime: null,

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

  reset: () =>
    set({
      currentRecord: null,
      isCheckedIn: false,
      checkInTime: null,
      checkOutTime: null,
      todayDuration: null,
      isOnBreak: false,
      breakStartTime: null,
    }),
}));
