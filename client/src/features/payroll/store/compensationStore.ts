import { create } from 'zustand';

interface CompensationFilter {
  revisionType: 'increment' | 'promotion' | 'compensation_change' | 'adjustment' | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'implemented' | null;
  employeeId: number | null;
}

interface CompensationState {
  filters: CompensationFilter;
  selectedRevisionId: number | null;
  viewMode: 'list' | 'detail';
  setFilter: (filter: Partial<CompensationFilter>) => void;
  clearFilters: () => void;
  setSelectedRevisionId: (id: number | null) => void;
  setViewMode: (mode: 'list' | 'detail') => void;
}

const defaultFilters: CompensationFilter = {
  revisionType: null,
  status: null,
  employeeId: null
};

export const useCompensationStore = create<CompensationState>((set) => ({
  filters: defaultFilters,
  selectedRevisionId: null,
  viewMode: 'list',
  setFilter: (filter) =>
    set((state) => ({
      filters: { ...state.filters, ...filter }
    })),
  clearFilters: () => set({ filters: defaultFilters }),
  setSelectedRevisionId: (id) => set({ selectedRevisionId: id }),
  setViewMode: (mode) => set({ viewMode: mode })
}));
