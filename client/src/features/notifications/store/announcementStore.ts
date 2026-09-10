import { create } from 'zustand';

interface AnnouncementStoreState {
  // UI state
  selectedAnnouncementId?: number;
  announcementFilter: 'all' | 'unread' | 'read';
  announcementSortBy: 'newest' | 'oldest' | 'priority';

  // Data
  readAnnouncementIds: number[];

  // Actions
  setSelectedAnnouncementId: (id?: number) => void;
  setAnnouncementFilter: (filter: 'all' | 'unread' | 'read') => void;
  setAnnouncementSortBy: (sort: 'newest' | 'oldest' | 'priority') => void;
  addReadAnnouncement: (id: number) => void;
  setReadAnnouncements: (ids: number[]) => void;
  reset: () => void;
}

const initialState = {
  selectedAnnouncementId: undefined,
  announcementFilter: 'all' as const,
  announcementSortBy: 'newest' as const,
  readAnnouncementIds: [] as number[],
};

export const useAnnouncementStore = create<AnnouncementStoreState>((set) => ({
  ...initialState,

  setSelectedAnnouncementId: (id) => set({ selectedAnnouncementId: id }),

  setAnnouncementFilter: (filter) => set({ announcementFilter: filter }),

  setAnnouncementSortBy: (sort) => set({ announcementSortBy: sort }),

  addReadAnnouncement: (id) =>
    set((state) => ({
      readAnnouncementIds: [...new Set([...state.readAnnouncementIds, id])],
    })),

  setReadAnnouncements: (ids) => set({ readAnnouncementIds: ids }),

  reset: () => set(initialState),
}));
