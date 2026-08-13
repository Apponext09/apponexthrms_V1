import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface NotificationListOptions {
  page?: number;
  pageSize?: number;
  status?: string;
}

export const useNotifications = (options?: NotificationListOptions) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
      if (options?.status) params.append('status', options.status);

      const response = await apiClient.get(`/notifications?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 3000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data;
    },
    refetchInterval: 3000, // Refetch every 3 seconds for instant Bell badge update
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rawListData = listQuery.data?.data || listQuery.data;
  const items = Array.isArray(rawListData)
    ? rawListData
    : Array.isArray(rawListData?.items)
    ? rawListData.items
    : [];

  const rawCountData = unreadCountQuery.data?.data || unreadCountQuery.data;
  const count = typeof rawCountData?.count === 'number'
    ? rawCountData.count
    : typeof rawCountData === 'number'
    ? rawCountData
    : items.filter((n: any) => !n.read_at).length;

  return {
    notifications: items,
    meta: rawListData?.meta,
    isLoading: listQuery.isLoading,
    error: listQuery.error,

    unreadCount: count,
    unreadCountLoading: unreadCountQuery.isLoading,

    markAsRead: markAsReadMutation.mutate,
    markAsReadLoading: markAsReadMutation.isPending,

    markAllAsRead: markAllAsReadMutation.mutate,
    markAllAsReadLoading: markAllAsReadMutation.isPending,

    deleteNotification: deleteNotificationMutation.mutate,
    deleteNotificationLoading: deleteNotificationMutation.isPending,

    refetch: listQuery.refetch,
  };
};
