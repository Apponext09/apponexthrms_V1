import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface PerformanceAnalyticsCache {
  id: number;
  uuid: string;
  organization_id: number;
  metric_type: string;
  metric_data: any;
  generated_at: string;
  created_at: string;
  deleted_at: string | null;
}

export class AnalyticsRepository extends BaseRepository<PerformanceAnalyticsCache> {
  constructor() {
    super('performance_analytics_cache');
  }

  /**
   * Get cache by metric type
   */
  async getByMetricType(ctx: TenantContext, metricType: string): Promise<PerformanceAnalyticsCache | null> {
    return this.getByFields(ctx, {
      metric_type: metricType,
    });
  }

  /**
   * Get all analytics cache
   */
  async getAllCache(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, options);
  }

  /**
   * Update or create cache entry
   */
  async upsertCache(ctx: TenantContext, metricType: string, data: any, userId: number) {
    const existing = await this.getByMetricType(ctx, metricType);

    if (existing) {
      return this.update(ctx, existing.id, {
        metric_data: data,
        generated_at: new Date().toISOString(),
        updated_by: userId,
      } as any);
    }

    return this.create(ctx, {
      metric_type: metricType,
      metric_data: data,
      generated_at: new Date().toISOString(),
    } as any);
  }

  /**
   * Check if cache is fresh (less than duration old)
   */
  isStale(generatedAt: string, durationMinutes: number = 60): boolean {
    const generated = new Date(generatedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - generated) / (1000 * 60);
    return diffMinutes > durationMinutes;
  }
}
