import { create } from 'zustand';

export interface PerformanceFilters {
  department?: number;
  status?: string;
  rating?: number;
  searchTerm?: string;
  sortBy?: 'name' | 'rating' | 'date' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

export interface PerformancePagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PerformanceUIState {
  selectedTab: 'goals' | 'okrs' | 'kpis' | 'reviews' | 'feedback' | 'appraisals' | 'competencies' | 'pips' | 'succession' | 'recognition' | 'analytics';
  selectedEmployeeId?: number;
  selectedCycleId?: number;
  selectedGoalId?: number;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  selectedItemId?: number;
  viewMode: 'list' | 'grid' | 'timeline';
}

export interface PerformanceState {
  // Filters
  filters: PerformanceFilters;
  setFilter: (filter: Partial<PerformanceFilters>) => void;
  clearFilters: () => void;

  // Pagination
  pagination: PerformancePagination;
  setPagination: (pagination: Partial<PerformancePagination>) => void;
  resetPagination: () => void;

  // UI State
  uiState: PerformanceUIState;
  setUIState: (state: Partial<PerformanceUIState>) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (itemId: number) => void;
  closeEditModal: () => void;
  openDeleteModal: (itemId: number) => void;
  closeDeleteModal: () => void;
  setViewMode: (mode: 'list' | 'grid' | 'timeline') => void;
}

const defaultFilters: PerformanceFilters = {
  department: undefined,
  status: undefined,
  rating: undefined,
  searchTerm: '',
  sortBy: 'date',
  sortOrder: 'desc'
};

const defaultPagination: PerformancePagination = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0
};

const defaultUIState: PerformanceUIState = {
  selectedTab: 'goals',
  selectedEmployeeId: undefined,
  selectedCycleId: undefined,
  selectedGoalId: undefined,
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  selectedItemId: undefined,
  viewMode: 'list'
};

export const usePerformanceStore = create<PerformanceState>((set) => ({
  filters: defaultFilters,
  setFilter: (filter) =>
    set((state) => ({
      filters: { ...state.filters, ...filter },
      pagination: { ...state.pagination, currentPage: 1 }
    })),
  clearFilters: () =>
    set({
      filters: defaultFilters,
      pagination: defaultPagination
    }),

  pagination: defaultPagination,
  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination }
    })),
  resetPagination: () =>
    set({ pagination: defaultPagination }),

  uiState: defaultUIState,
  setUIState: (state) =>
    set((current) => ({
      uiState: { ...current.uiState, ...state }
    })),
  openCreateModal: () =>
    set((state) => ({
      uiState: { ...state.uiState, isCreateModalOpen: true }
    })),
  closeCreateModal: () =>
    set((state) => ({
      uiState: { ...state.uiState, isCreateModalOpen: false }
    })),
  openEditModal: (itemId) =>
    set((state) => ({
      uiState: {
        ...state.uiState,
        isEditModalOpen: true,
        selectedItemId: itemId
      }
    })),
  closeEditModal: () =>
    set((state) => ({
      uiState: { ...state.uiState, isEditModalOpen: false, selectedItemId: undefined }
    })),
  openDeleteModal: (itemId) =>
    set((state) => ({
      uiState: {
        ...state.uiState,
        isDeleteModalOpen: true,
        selectedItemId: itemId
      }
    })),
  closeDeleteModal: () =>
    set((state) => ({
      uiState: { ...state.uiState, isDeleteModalOpen: false, selectedItemId: undefined }
    })),
  setViewMode: (mode) =>
    set((state) => ({
      uiState: { ...state.uiState, viewMode: mode }
    }))
}));
