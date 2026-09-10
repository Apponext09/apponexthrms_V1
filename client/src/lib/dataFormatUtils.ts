/**
 * Safely extract array data from API responses
 * Handles multiple response formats for robustness
 */
export function safeArrayify(data: any): any[] {
  // If already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  // If data.data is an array, return it
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }

  // If data.data.data is an array, return it
  if (data?.data?.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }

  // If nothing worked, return empty array
  return [];
}

/**
 * Safely extract single item from API responses
 */
export function safeExtract(data: any): any {
  // If it's an object, return it
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  // If data.data is an object (not array), return it
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data;
  }

  // Otherwise return the data as-is
  return data || null;
}

/**
 * Safely extract meta information from paginated responses
 */
export function safeMeta(data: any) {
  return data?.meta || { total: 0, page: 1, pageSize: 20 };
}
