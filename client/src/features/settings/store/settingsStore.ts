import { create } from 'zustand';

export type SettingsModule =
  | 'company-profile'
  | 'branches'
  | 'locations'
  | 'departments'
  | 'designations'
  | 'cost-centers'
  | 'holidays'
  | 'attendance-policies'
  | 'leave-policies'
  | 'payroll-policies'
  | 'work-policies'
  | 'branding'
  | 'email-templates'
  | 'organization-settings'
  | 'history';

interface SettingsStore {
  // UI State
  activeModule: SettingsModule;
  setActiveModule: (module: SettingsModule) => void;

  // Modals
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Filters
  filters: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Pagination
  currentPage: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Form
  editingId: string | number | null;
  setEditingId: (id: string | number | null) => void;

  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  // UI State
  activeModule: 'company-profile',
  setActiveModule: (module) => set({ activeModule: module }),

  // Modals
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, editingId: null }),

  // Filters
  filters: {},
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {}, currentPage: 1 }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

  // Pagination
  currentPage: 1,
  pageSize: 20,
  setPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

  // Form
  editingId: null,
  setEditingId: (id) => set({ editingId: id }),

  // Sorting
  sortBy: 'created_at',
  sortOrder: 'desc',
  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
}));
