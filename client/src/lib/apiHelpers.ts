/**
 * API Helper Functions for consistent endpoint handling and fallback logic
 */
import { apiClient } from '@/config/api';

/**
 * Fetch data with fallback endpoints
 * Tries primary endpoint first, then falls back to alternatives
 */
export const fetchWithFallback = async (
  endpoints: string[],
  options?: any
) => {
  let lastError: any;

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.get(endpoint, options);
      return response.data?.data || response.data || [];
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  // If all endpoints fail, return empty array
  console.warn(`All endpoints failed: ${endpoints.join(', ')}`, lastError);
  return [];
};

/**
 * Standardized API endpoint getter
 * Returns primary endpoint for each resource with fallbacks
 */
export const API_ENDPOINTS = {
  departments: () => ['/settings/departments', '/departments'],
  designations: () => ['/settings/designations', '/designations', '/reports/options'],
  locations: () => ['/settings/locations', '/locations', '/attendance/locations'],
  companies: () => ['/settings/companies', '/companies'],
  employees: () => ['/employees'],
  employeeStatuses: () => ['/settings/employee-statuses', '/employee-statuses'],
  employmentTypes: () => ['/settings/employment-types'],
} as const;

/**
 * Batch fetch multiple resources with fallbacks
 */
export const fetchMultipleResources = async (
  resources: Array<{ key: string; endpoints: string[] }>
) => {
  const results: Record<string, any[]> = {};

  const promises = resources.map(async ({ key, endpoints }) => {
    try {
      const data = await fetchWithFallback(endpoints);
      results[key] = data;
    } catch (err) {
      console.error(`Failed to fetch ${key}:`, err);
      results[key] = [];
    }
  });

  await Promise.all(promises);
  return results;
};
