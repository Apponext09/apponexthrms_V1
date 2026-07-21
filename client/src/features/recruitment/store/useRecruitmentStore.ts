import { create } from 'zustand';

interface RecruitmentFilter {
  status?: string;
  department?: number;
  source?: string;
  search?: string;
}

interface RecruitmentStore {
  // Job state
  selectedJob: any | null;
  setSelectedJob: (job: any | null) => void;

  // Candidate state
  selectedCandidate: any | null;
  setSelectedCandidate: (candidate: any | null) => void;

  // Application state
  selectedApplication: any | null;
  setSelectedApplication: (app: any | null) => void;

  // Filters
  filters: RecruitmentFilter;
  setFilters: (filters: RecruitmentFilter) => void;
  clearFilters: () => void;

  // View mode
  viewMode: 'list' | 'kanban' | 'grid';
  setViewMode: (mode: 'list' | 'kanban' | 'grid') => void;

  // Pagination
  currentPage: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export const useRecruitmentStore = create<RecruitmentStore>((set) => ({
  selectedJob: null,
  setSelectedJob: (job) => set({ selectedJob: job }),

  selectedCandidate: null,
  setSelectedCandidate: (candidate) => set({ selectedCandidate: candidate }),

  selectedApplication: null,
  setSelectedApplication: (app) => set({ selectedApplication: app }),

  filters: {},
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),

  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  currentPage: 1,
  pageSize: 20,
  setPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size }),
}));
