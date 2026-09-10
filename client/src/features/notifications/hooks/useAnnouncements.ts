import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface AnnouncementListOptions {
  page?: number;
  pageSize?: number;
}

export const useAnnouncements = (options?: AnnouncementListOptions) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['announcements', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.pageSize) params.append('pageSize', options.pageSize.toString());

      const response = await apiClient.get(`/notifications/announcements?${params.toString()}`);
      return response.data;
    },
  });

  const getAnnouncementQuery = (id?: number) =>
    useQuery({
      queryKey: ['announcement', id],
      queryFn: async () => {
        const response = await apiClient.get(`/notifications/announcements/${id}`);
        return response.data;
      },
      enabled: !!id,
    });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (input: any) => {
      const response = await apiClient.post('/notifications/announcements', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: any }) => {
      const response = await apiClient.patch(`/notifications/announcements/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const publishAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/notifications/announcements/${id}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const archiveAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/notifications/announcements/${id}/archive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.patch(`/notifications/announcements/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/notifications/announcements/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  return {
    announcements: listQuery.data?.items || [],
    meta: listQuery.data?.meta,
    isLoading: listQuery.isLoading,
    error: listQuery.error,

    getAnnouncement: getAnnouncementQuery,

    createAnnouncement: createAnnouncementMutation.mutate,
    createAnnouncementLoading: createAnnouncementMutation.isPending,

    updateAnnouncement: updateAnnouncementMutation.mutate,
    updateAnnouncementLoading: updateAnnouncementMutation.isPending,

    publishAnnouncement: publishAnnouncementMutation.mutate,
    publishAnnouncementLoading: publishAnnouncementMutation.isPending,

    archiveAnnouncement: archiveAnnouncementMutation.mutate,
    archiveAnnouncementLoading: archiveAnnouncementMutation.isPending,

    markAsRead: markAsReadMutation.mutate,
    markAsReadLoading: markAsReadMutation.isPending,

    deleteAnnouncement: deleteAnnouncementMutation.mutate,
    deleteAnnouncementLoading: deleteAnnouncementMutation.isPending,

    refetch: listQuery.refetch,
  };
};
