import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import type {
  IdCardTemplate,
  IdCardTemplateVersion,
  IdCardConfig,
  TemplateAppliesTo,
} from '../types/idCard.types';

export const ID_CARD_QUERY_KEYS = {
  allTemplates: ['id-card-templates'] as const,
  template: (id: number) => ['id-card-templates', id] as const,
  activeTemplate: (employeeId?: number) => ['id-card-templates', 'active', employeeId] as const,
  versions: (id: number) => ['id-card-templates', id, 'versions'] as const,
};

export function useIdCardTemplates() {
  return useQuery({
    queryKey: ID_CARD_QUERY_KEYS.allTemplates,
    queryFn: async () => {
      const res = await apiClient.get('/settings/id-card/templates');
      return (res.data?.data || []) as IdCardTemplate[];
    },
  });
}

export function useIdCardTemplate(id?: number) {
  return useQuery({
    queryKey: ID_CARD_QUERY_KEYS.template(id || 0),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get(`/settings/id-card/templates/${id}`);
      return (res.data?.data || null) as IdCardTemplate | null;
    },
    enabled: !!id,
  });
}

export function useActiveIdCardTemplate(employeeId?: number) {
  return useQuery({
    queryKey: ID_CARD_QUERY_KEYS.activeTemplate(employeeId),
    queryFn: async () => {
      const params = employeeId ? { employeeId } : {};
      const res = await apiClient.get('/settings/id-card/active-template', { params });
      return (res.data?.data || null) as IdCardTemplate | null;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useIdCardTemplateVersions(templateId?: number) {
  return useQuery({
    queryKey: ID_CARD_QUERY_KEYS.versions(templateId || 0),
    queryFn: async () => {
      if (!templateId) return [];
      const res = await apiClient.get(`/settings/id-card/templates/${templateId}/versions`);
      return (res.data?.data || []) as IdCardTemplateVersion[];
    },
    enabled: !!templateId,
  });
}

export function useCreateIdCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      isDefault?: boolean;
      appliesTo?: TemplateAppliesTo;
      configJson: IdCardConfig;
      status?: 'draft' | 'published';
    }) => {
      const res = await apiClient.post('/settings/id-card/templates', payload);
      return res.data?.data as IdCardTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.allTemplates });
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.activeTemplate() });
      toast.success(`Template '${data.name}' created successfully.`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create template.');
    },
  });
}

export function useUpdateIdCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
      name?: string;
      description?: string;
      isDefault?: boolean;
      appliesTo?: TemplateAppliesTo;
      configJson?: IdCardConfig;
      status?: 'draft' | 'published';
    }) => {
      const res = await apiClient.put(`/settings/id-card/templates/${id}`, payload);
      return res.data?.data as IdCardTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
      toast.success('Template changes saved successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update template.');
    },
  });
}

export function usePublishIdCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      changelog,
      configJson,
      isDefault,
    }: {
      id: number;
      changelog?: string;
      configJson?: IdCardConfig;
      isDefault?: boolean;
    }) => {
      const res = await apiClient.post(`/settings/id-card/templates/${id}/publish`, {
        changelog,
        configJson,
        isDefault,
      });
      return res.data?.data as IdCardTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
      toast.success(`Template '${data.name}' is now live (v${data.version}).`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to publish template.');
    },
  });
}

export function useDuplicateIdCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/settings/id-card/templates/${id}/duplicate`);
      return res.data?.data as IdCardTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.allTemplates });
      toast.success(`Duplicated as '${data.name}'.`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to duplicate template.');
    },
  });
}

export function useDeleteIdCardTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/settings/id-card/templates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.allTemplates });
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.activeTemplate() });
      toast.success('Template deleted successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete template.');
    },
  });
}

export function useRollbackIdCardTemplateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, versionId }: { id: number; versionId: number }) => {
      const res = await apiClient.post(`/settings/id-card/templates/${id}/rollback/${versionId}`);
      return res.data?.data as IdCardTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.allTemplates });
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.template(data.id) });
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.activeTemplate() });
      queryClient.invalidateQueries({ queryKey: ID_CARD_QUERY_KEYS.versions(data.id) });
      toast.success('Rolled back template configuration successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to rollback template.');
    },
  });
}

export function useUploadIdCardAsset() {
  return useMutation({
    mutationFn: async ({ imageBase64, filename }: { imageBase64: string; filename?: string }) => {
      const res = await apiClient.post('/settings/id-card/upload-asset', { imageBase64, filename });
      return res.data?.data as { url: string; filename: string };
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to upload image asset.');
    },
  });
}
