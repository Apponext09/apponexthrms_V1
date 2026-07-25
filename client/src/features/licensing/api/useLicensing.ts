import { useQuery } from '@tanstack/react-query';

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
      const rawApiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const baseUrl = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
      const response = await fetch(`${baseUrl}/licensing/features/all`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch licensed features');
      }

      const data = await response.json();
      return data.data as LicensedFeaturesResponse;
    },
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
