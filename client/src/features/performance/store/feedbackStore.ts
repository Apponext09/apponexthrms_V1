import { create } from 'zustand';

export interface FeedbackPortalState {
  // Portal navigation
  activeTab: 'pending' | 'submitted' | 'received' | 'analytics';
  selectedFeedbackRequestId?: number;

  // Feedback submission tracking
  isSubmittingFeedback: boolean;
  feedbackDraft: {
    requestId?: number;
    rating?: number;
    comment?: string;
    strengths?: string;
    areasForImprovement?: string;
  };

  // Filters
  filters: {
    status?: 'pending' | 'submitted' | 'expired';
    feedbackType?: '360' | 'peer' | 'manager' | 'skip_level' | 'custom';
    fromDate?: string;
    toDate?: string;
  };

  // Display preferences
  showAnonymousWarning: boolean;
  sortBy: 'date' | 'status' | 'type';
  sortOrder: 'asc' | 'desc';

  // Actions
  setActiveTab: (tab: 'pending' | 'submitted' | 'received' | 'analytics') => void;
  setSelectedFeedbackRequest: (requestId?: number) => void;
  setIsSubmittingFeedback: (isSubmitting: boolean) => void;
  updateFeedbackDraft: (draft: Partial<FeedbackPortalState['feedbackDraft']>) => void;
  clearFeedbackDraft: () => void;
  setFilter: (filter: Partial<FeedbackPortalState['filters']>) => void;
  clearFilters: () => void;
  setShowAnonymousWarning: (show: boolean) => void;
  setSortBy: (sortBy: 'date' | 'status' | 'type') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
}

export const useFeedbackStore = create<FeedbackPortalState>((set) => ({
  activeTab: 'pending',
  selectedFeedbackRequestId: undefined,
  isSubmittingFeedback: false,
  feedbackDraft: {},
  filters: {
    status: undefined,
    feedbackType: undefined,
    fromDate: undefined,
    toDate: undefined
  },
  showAnonymousWarning: false,
  sortBy: 'date',
  sortOrder: 'desc',

  setActiveTab: (tab) =>
    set({ activeTab: tab }),

  setSelectedFeedbackRequest: (requestId) =>
    set({ selectedFeedbackRequestId: requestId }),

  setIsSubmittingFeedback: (isSubmitting) =>
    set({ isSubmittingFeedback: isSubmitting }),

  updateFeedbackDraft: (draft) =>
    set((state) => ({
      feedbackDraft: { ...state.feedbackDraft, ...draft }
    })),

  clearFeedbackDraft: () =>
    set({
      feedbackDraft: {},
      selectedFeedbackRequestId: undefined
    }),

  setFilter: (filter) =>
    set((state) => ({
      filters: { ...state.filters, ...filter }
    })),

  clearFilters: () =>
    set({
      filters: {
        status: undefined,
        feedbackType: undefined,
        fromDate: undefined,
        toDate: undefined
      }
    }),

  setShowAnonymousWarning: (show) =>
    set({ showAnonymousWarning: show }),

  setSortBy: (sortBy) =>
    set({ sortBy }),

  setSortOrder: (order) =>
    set({ sortOrder: order })
}));
