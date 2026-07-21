import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['recruitment-dashboard'],
    queryFn: async () => {
      const response = await api.get('/recruitment/dashboard');
      return response.data.data;
    },
  });
};

export const useMetrics = () => {
  return useQuery({
    queryKey: ['recruitment-metrics'],
    queryFn: async () => {
      const response = await api.get('/recruitment/metrics');
      return response.data.data;
    },
  });
};

