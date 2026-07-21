import { create } from 'zustand';

interface AnalyticsFilters {
  startDate: string | null;
  endDate: string | null;
  departmentId: number | null;
  employeeId: number | null;
  status: string | null;
}

interface AnalyticsStoreState {
  // Filters
  filters: AnalyticsFilters;
  chartType: 'pie' | 'bar' | 'line' | 'area';
  timeRange: 'week' | 'month' | 'quarter' | 'year';

  // Data
  dashboardData: any | null;
  reportData: any | null;
  loading: boolean;
  error: string | null;

  // Actions
  setFilters: (filters: Partial<AnalyticsFilters>) => void;
  setChartType: (type: 'pie' | 'bar' | 'line' | 'area') => void;
  setTimeRange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  setDashboardData: (data: any) => void;
  setReportData: (data: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetFilters: () => void;
}

export const useAnalyticsStore = create<AnalyticsStoreState>((set) => ({
  // Initial state
  filters: {
    startDate: null,
    endDate: null,
    departmentId: null,
    employeeId: null,
    status: null,
  },
  chartType: 'bar',
  timeRange: 'month',
  dashboardData: null,
  reportData: null,
  loading: false,
  error: null,

  // Actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setChartType: (type) => set({ chartType: type }),

  setTimeRange: (range) => set({ timeRange: range }),

  setDashboardData: (data) => set({ dashboardData: data }),

  setReportData: (data) => set({ reportData: data }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  resetFilters: () =>
    set({
      filters: {
        startDate: null,
        endDate: null,
        departmentId: null,
        employeeId: null,
        status: null,
      },
      error: null,
    }),
}));
