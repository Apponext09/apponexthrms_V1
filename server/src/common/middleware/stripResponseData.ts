import type { Request, Response, NextFunction } from 'express';

/**
 * Fields that are internal/audit fields and should never be sent to the client.
 * These provide no value to the frontend and expose internal implementation details.
 */
const STRIP_FIELDS = new Set([
  'uuid',
  'created_by',
  'updated_by',
  'deleted_at',
  'organization_id',
  'company_id',
]);

/**
 * Recursively cleans a value:
 *  1. Removes keys whose value is null or undefined
 *  2. Removes internal/audit fields (uuid, created_by, updated_by, etc.)
 *  3. Recurses into nested objects and arrays
 */
function cleanValue(value: unknown): unknown {
  // Null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Dates, Buffers, and RegExps — preserve as-is
  if (value instanceof Date || Buffer.isBuffer(value) || value instanceof RegExp) {
    return value;
  }

  // Arrays — clean each element
  if (Array.isArray(value)) {
    return value
      .map(cleanValue)
      .filter(item => item !== null && item !== undefined);
  }

  // Plain objects — strip null values and internal fields
  if (typeof value === 'object') {
    // Only clean plain JSON objects
    const isPlainObject = Object.prototype.toString.call(value) === '[object Object]';
    if (!isPlainObject) {
      return value;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Skip internal audit fields
      if (STRIP_FIELDS.has(key)) continue;
      // Skip null and undefined values
      if (val === null || val === undefined) continue;
      // Recurse into nested objects/arrays
      cleaned[key] = cleanValue(val);
    }
    return cleaned;
  }

  // Primitives (string, number, boolean, symbol, bigint)
  return value;
}

/**
 * cleanResponseData middleware
 *
 * Intercepts all res.json() calls on /api/* routes and cleans the response:
 *  - Removes null/undefined values recursively (they're useless to the frontend)
 *  - Removes internal audit fields: uuid, created_by, updated_by, deleted_at,
 *    organization_id, company_id
 *  - Keeps all other fields intact so the frontend still receives full data
 *
 * This does NOT break any functionality — frontend never renders null values
 * or internal audit fields in the UI.
 */
export function cleanResponseData(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    // Only process API routes
    if (!req.originalUrl || !req.originalUrl.startsWith('/api')) {
      return originalJson(body);
    }

    try {
      // Recursively clean the entire response body
      const cleaned = cleanValue(body);
      return originalJson(cleaned);
    } catch (err) {
      console.warn('cleanResponseData: failed to clean response body, returning original', err);
      return originalJson(body);
    }
  };

  next();
}
