import { create } from 'zustand';

interface PayrollFilter {
  cycleId: number | null;
  status: 'draft' | 'processing' | 'locked' | 'approved' | 'published' | 'completed' | null;
  month: string | null;
}

interface PayrollState {
  filters: PayrollFilter;
  selectedPayrollId: number | null;
  setFilter: (filter: Partial<PayrollFilter>) => void;
  clearFilters: () => void;
  setSelectedPayrollId: (id: number | null) => void;
}

const defaultFilters: PayrollFilter = {
  cycleId: null,
  status: null,
  month: null
};

export const usePayrollStore = create<PayrollState>((set) => ({
  filters: defaultFilters,
  selectedPayrollId: null,
  setFilter: (filter) =>
    set((state) => ({
      filters: { ...state.filters, ...filter }
    })),
  clearFilters: () => set({ filters: defaultFilters }),
  setSelectedPayrollId: (id) => set({ selectedPayrollId: id })
}));
