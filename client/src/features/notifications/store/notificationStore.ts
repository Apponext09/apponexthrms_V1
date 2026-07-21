import { create } from 'zustand';

interface NotificationStoreState {
  // UI state
  drawerOpen: boolean;
  notificationCenterOpen: boolean;
  selectedNotificationId?: number;

  // Data
  unreadCount: number;
  notificationFilter: 'all' | 'unread' | 'read';

  // Actions
  setDrawerOpen: (open: boolean) => void;
  setNotificationCenterOpen: (open: boolean) => void;
  setSelectedNotificationId: (id?: number) => void;
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: (amount: number) => void;
  setNotificationFilter: (filter: 'all' | 'unread' | 'read') => void;
  reset: () => void;
}

const initialState = {
  drawerOpen: false,
  notificationCenterOpen: false,
  selectedNotificationId: undefined,
  unreadCount: 0,
  notificationFilter: 'all' as const,
};

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  ...initialState,

  setDrawerOpen: (open) => set({ drawerOpen: open }),

  setNotificationCenterOpen: (open) => set({ notificationCenterOpen: open }),

  setSelectedNotificationId: (id) => set({ selectedNotificationId: id }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  decrementUnreadCount: (amount) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - amount),
    })),

  setNotificationFilter: (filter) => set({ notificationFilter: filter }),

  reset: () => set(initialState),
}));
