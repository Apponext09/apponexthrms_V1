import { create } from 'zustand';

export interface ReviewCycleState {
  currentCycleId?: number;
  currentCycleName?: string;
  selectedReviewerId?: number;
  selectedRevieweeId?: number;
  reviewProgress: number;
  isCalibrationMode: boolean;
  selectedRatingDistributionBucket?: 'high_performer' | 'solid_performer' | 'needs_improvement' | 'unsatisfactory';
  calibrationComments?: string;
  selectedReviewIds: number[];
  filters: {
    status?: 'draft' | 'submitted' | 'in_review' | 'completed' | 'acknowledged';
    rating?: number;
    department?: number;
    manager?: number;
  };

  // Actions
  setCurrentCycle: (cycleId: number, cycleName: string) => void;
  setSelectedReviewer: (reviewerId: number) => void;
  setSelectedReviewee: (revieweeId: number) => void;
  setReviewProgress: (progress: number) => void;
  setCalibrationMode: (isActive: boolean) => void;
  setRatingDistributionBucket: (bucket?: 'high_performer' | 'solid_performer' | 'needs_improvement' | 'unsatisfactory') => void;
  setCalibrationComments: (comments: string) => void;
  toggleReviewSelection: (reviewId: number) => void;
  clearReviewSelection: () => void;
  setFilter: (filter: Partial<ReviewCycleState['filters']>) => void;
  clearFilters: () => void;
}

export const useReviewCycleStore = create<ReviewCycleState>((set) => ({
  currentCycleId: undefined,
  currentCycleName: undefined,
  selectedReviewerId: undefined,
  selectedRevieweeId: undefined,
  reviewProgress: 0,
  isCalibrationMode: false,
  selectedRatingDistributionBucket: undefined,
  calibrationComments: undefined,
  selectedReviewIds: [],
  filters: {
    status: undefined,
    rating: undefined,
    department: undefined,
    manager: undefined
  },

  setCurrentCycle: (cycleId, cycleName) =>
    set({
      currentCycleId: cycleId,
      currentCycleName: cycleName
    }),

  setSelectedReviewer: (reviewerId) =>
    set({ selectedReviewerId: reviewerId }),

  setSelectedReviewee: (revieweeId) =>
    set({ selectedRevieweeId: revieweeId }),

  setReviewProgress: (progress) =>
    set({ reviewProgress: progress }),

  setCalibrationMode: (isActive) =>
    set({ isCalibrationMode: isActive }),

  setRatingDistributionBucket: (bucket) =>
    set({ selectedRatingDistributionBucket: bucket }),

  setCalibrationComments: (comments) =>
    set({ calibrationComments: comments }),

  toggleReviewSelection: (reviewId) =>
    set((state) => ({
      selectedReviewIds: state.selectedReviewIds.includes(reviewId)
        ? state.selectedReviewIds.filter((id) => id !== reviewId)
        : [...state.selectedReviewIds, reviewId]
    })),

  clearReviewSelection: () =>
    set({ selectedReviewIds: [] }),

  setFilter: (filter) =>
    set((state) => ({
      filters: { ...state.filters, ...filter }
    })),

  clearFilters: () =>
    set({
      filters: {
        status: undefined,
        rating: undefined,
        department: undefined,
        manager: undefined
      }
    })
}));
