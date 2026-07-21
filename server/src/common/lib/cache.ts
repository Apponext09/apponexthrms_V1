/**
 * In-memory LRU permission cache with TTL
 * Used to cache user permissions to avoid repeated DB queries
 * Can be swapped for Redis in production
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number = 1000, ttlMs: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from cache
   */
  get(key: K): V | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: K, value: V): void {
    // Delete existing entry to move to end (most recently used)
    this.cache.delete(key);

    // If at max size, remove oldest entry (first in map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Add new entry
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Delete a key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern (for permission updates)
   */
  invalidatePattern(predicate: (key: K) => boolean): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (predicate(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: `${((this.cache.size / this.maxSize) * 100).toFixed(2)}%`,
    };
  }
}

/**
 * Global permission cache instance
 */
const permissionCache = new LRUCache<string, string[]>(
  1000, // Max 1000 users cached
  60000 // TTL: 60 seconds
);

/**
 * Get cached permissions for a user
 * Key format: `${organizationId}:${userId}`
 */
export function getCachedPermissions(organizationId: number, userId: number): string[] | null {
  const key = `${organizationId}:${userId}`;
  return permissionCache.get(key as any);
}

/**
 * Cache permissions for a user
 */
export function cachePermissions(
  organizationId: number,
  userId: number,
  permissions: string[]
): void {
  const key = `${organizationId}:${userId}`;
  permissionCache.set(key as any, permissions);
}

/**
 * Invalidate cached permissions for a user
 */
export function invalidateUserPermissions(organizationId: number, userId: number): void {
  const key = `${organizationId}:${userId}`;
  permissionCache.delete(key as any);
}

/**
 * Invalidate all cached permissions for an organization (e.g., when roles change)
 */
export function invalidateOrgPermissions(organizationId: number): number {
  return permissionCache.invalidatePattern(
    (key: any) => key.startsWith(`${organizationId}:`)
  );
}

/**
 * Clear all cached permissions
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Get cache statistics
 */
export function getPermissionCacheStats() {
  return permissionCache.getStats();
}
