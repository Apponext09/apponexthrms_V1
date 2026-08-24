import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface NotificationItem {
  id: number | string;
  uuid?: string;
  subject_line?: string;
  subjectLine?: string;
  subject?: string;
  title?: string;
  body_text?: string;
  bodyText?: string;
  body?: string;
  message?: string;
  status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  created_at?: string;
  createdAt?: string;
  read_at?: string | null;
  readAt?: string | null;
  [key: string]: any;
}

export interface NotificationListOptions {
  page?: number;
  pageSize?: number;
  status?: string;
}

export const useNotifications = (options?: NotificationListOptions) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications', options?.page, options?.pageSize, options?.status],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (options?.page) params.page = options.page;
      if (options?.pageSize) params.pageSize = options.pageSize;
      if (options?.status) params.status = options.status;

      const response = await apiClient.get('/notifications', { params });
      return response.data;
    },
    refetchInterval: (query) => (query.state.status === 'error' ? false : 3000),
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data;
    },
    refetchInterval: (query) => (query.state.status === 'error' ? false : 3000),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number | string) => {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number | string) => {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rawListData = listQuery.data?.data ?? listQuery.data;
  const items: NotificationItem[] = Array.isArray(rawListData)
    ? rawListData
    : Array.isArray(rawListData?.items)
    ? rawListData.items
    : [];

  const rawCountData = unreadCountQuery.data?.data ?? unreadCountQuery.data;
  const count =
    typeof rawCountData?.count === 'number'
      ? rawCountData.count
      : typeof rawCountData?.unreadCount === 'number'
      ? rawCountData.unreadCount
      : typeof rawCountData?.unread_count === 'number'
      ? rawCountData.unread_count
      : typeof rawCountData === 'number'
      ? rawCountData
      : items.filter((n) => !n.read_at && !n.readAt).length;

  return {
    notifications: items,
    meta: rawListData?.meta ?? listQuery.data?.meta,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,

    unreadCount: count,
    unreadCountLoading: unreadCountQuery.isLoading,
    unreadCountError: unreadCountQuery.error,

    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    markAsReadLoading: markAsReadMutation.isPending,

    markAllAsRead: markAllAsReadMutation.mutate,
    markAllAsReadAsync: markAllAsReadMutation.mutateAsync,
    markAllAsReadLoading: markAllAsReadMutation.isPending,

    deleteNotification: deleteNotificationMutation.mutate,
    deleteNotificationAsync: deleteNotificationMutation.mutateAsync,
    deleteNotificationLoading: deleteNotificationMutation.isPending,

    refetch: listQuery.refetch,
    refetchUnreadCount: unreadCountQuery.refetch,
  };
};

