import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AnnouncementRead {
  id: number;
  uuid: string;
  organization_id: number;
  announcement_id: number;
  user_id: number;
  read_at: Date;
  created_at: Date;
}

export class AnnouncementReadRepository extends BaseRepository<AnnouncementRead> {
  constructor() {
    super('announcement_reads');
  }

  /**
   * Mark announcement as read
   */
  async markAsRead(ctx: TenantContext, announcementId: number, userId: number): Promise<AnnouncementRead> {
    // Check if already marked as read
    const existing = await this.query(ctx)
      .where('announcement_id', announcementId)
      .where('user_id', userId)
      .first();

    if (existing) {
      return existing;
    }

    return this.create(ctx, {
      announcement_id: announcementId,
      user_id: userId,
      read_at: new Date(),
    } as any);
  }

  /**
   * Get read count for announcement
   */
  async getReadCount(ctx: TenantContext, announcementId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('announcement_id', announcementId)
      .count('* as count')
      .first();

    return (result as any)?.count || 0;
  }

  /**
   * Check if user read announcement
   */
  async hasUserRead(ctx: TenantContext, announcementId: number, userId: number): Promise<boolean> {
    const result = await this.query(ctx)
      .where('announcement_id', announcementId)
      .where('user_id', userId)
      .first();

    return !!result;
  }

  /**
   * Get user's read announcements
   */
  async getReadByUser(ctx: TenantContext, userId: number): Promise<number[]> {
    const reads = await this.query(ctx).where('user_id', userId).select('announcement_id');

    return reads.map((r) => r.announcement_id);
  }

  /**
   * Get searchable fields - empty for read tracking
   */
  protected getSearchableFields(): string[] {
    return [];
  }
}
