import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface LicensedFeature {
  enabled: boolean;
  source: 'addon' | 'override';
  usage_limit?: number;
  usage_current?: number;
}

export interface LicensedFeaturesResponse {
  [moduleKey: string]: {
    [featureKey: string]: LicensedFeature;
  };
}

/**
 * Fetch all licensed features for the organization
 */
export function useLicensedFeatures() {
  return useQuery({
    queryKey: ['licensing', 'features', 'all'],
    queryFn: async () => {
      const response = await apiClient.get('/licensing/features/all');
      return response.data.data as LicensedFeaturesResponse;
    },
    enabled: !!localStorage.getItem('accessToken'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Check if a specific feature is licensed for the organization
 */
export function isFeatureLicensed(
  features: LicensedFeaturesResponse | undefined,
  moduleKey: string,
  featureKey: string
): boolean {
  if (!features) return false;
  return features[moduleKey]?.[featureKey]?.enabled === true;
}
