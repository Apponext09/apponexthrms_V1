import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export const useTemplates = () => {
  const queryClient = useQueryClient();

  const createTemplateMutation = useMutation({
    mutationFn: async (input: any) => {
      const response = await apiClient.post('/templates', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: any }) => {
      const response = await apiClient.patch(`/templates/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const publishTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/templates/${id}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(`/templates/${id}/archive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const previewTemplateMutation = useMutation({
    mutationFn: async ({ id, variables }: { id: number; variables: any }) => {
      const response = await apiClient.post(`/templates/${id}/preview`, { variables });
      return response.data;
    },
  });

  const getTemplateQuery = (id?: number) =>
    useQuery({
      queryKey: ['template', id],
      queryFn: async () => {
        const response = await apiClient.get(`/templates/${id}`);
        return response.data;
      },
      enabled: !!id,
    });

  return {
    createTemplate: createTemplateMutation.mutate,
    createTemplateLoading: createTemplateMutation.isPending,

    updateTemplate: updateTemplateMutation.mutate,
    updateTemplateLoading: updateTemplateMutation.isPending,

    publishTemplate: publishTemplateMutation.mutate,
    publishTemplateLoading: publishTemplateMutation.isPending,

    archiveTemplate: archiveTemplateMutation.mutate,
    archiveTemplateLoading: archiveTemplateMutation.isPending,

    previewTemplate: previewTemplateMutation.mutate,
    previewTemplateLoading: previewTemplateMutation.isPending,
    previewedTemplate: previewTemplateMutation.data,

    getTemplate: getTemplateQuery,
  };
};
