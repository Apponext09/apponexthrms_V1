import { create } from 'zustand';

interface LeaveFilters {
  search?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  leaveTypeId?: number;
  startDate?: string;
  endDate?: string;
}

interface LeaveStore {
  // State
  filters: LeaveFilters;
  isLoading: boolean;
  error: string | null;
  selectedLeaveTypeId: number | null;
  calendarView: 'month' | 'week' | 'day';

  // Actions
  setFilters: (filters: LeaveFilters) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearFilters: () => void;
  setSelectedLeaveTypeId: (id: number | null) => void;
  setCalendarView: (view: 'month' | 'week' | 'day') => void;

  // Helpers
  addFilter: (key: keyof LeaveFilters, value: any) => void;
  removeFilter: (key: keyof LeaveFilters) => void;
}

export const useLeaveStore = create<LeaveStore>((set) => ({
  // Initial state
  filters: {},
  isLoading: false,
  error: null,
  selectedLeaveTypeId: null,
  calendarView: 'month',

  // Actions
  setFilters: (filters) => set({ filters }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  clearFilters: () => set({ filters: {} }),
  setSelectedLeaveTypeId: (id) => set({ selectedLeaveTypeId: id }),
  setCalendarView: (view) => set({ calendarView: view }),

  // Helpers
  addFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  removeFilter: (key) =>
    set((state) => {
      const newFilters = { ...state.filters };
      delete newFilters[key];
      return { filters: newFilters };
    }),
}));
