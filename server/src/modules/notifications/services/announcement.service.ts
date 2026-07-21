import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/common/lib/logger';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { AnnouncementRepository, type Announcement } from '../repositories/announcement.repository';
import { AnnouncementReadRepository } from '../repositories/announcement-read.repository';

export class AnnouncementService {
  private announcementRepo: AnnouncementRepository;
  private readRepo: AnnouncementReadRepository;

  constructor() {
    this.announcementRepo = new AnnouncementRepository();
    this.readRepo = new AnnouncementReadRepository();
  }

  /**
   * Create announcement
   */
  async createAnnouncement(ctx: TenantContext, input: any): Promise<Announcement> {
    const announcement = await this.announcementRepo.create(ctx, {
      uuid: uuidv4(),
      title: input.title,
      content: input.content,
      featured_image_url: input.featured_image_url,
      visibility_level: input.visibility_level || 'all_employees',
      visible_to_departments: input.visible_to_departments,
      visible_to_roles: input.visible_to_roles,
      status: 'draft',
      priority: input.priority || 'normal',
      allow_comments: input.allow_comments !== false,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Announcement created: ${announcement.uuid}`);
    return announcement;
  }

  /**
   * Update announcement
   */
  async updateAnnouncement(ctx: TenantContext, id: number | string, input: any): Promise<Announcement> {
    const announcement = await this.announcementRepo.getById(ctx, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    if (announcement.status === 'published') {
      throw new ValidationError('Cannot edit published announcement');
    }

    const updated = await this.announcementRepo.update(ctx, id, {
      title: input.title || announcement.title,
      content: input.content || announcement.content,
      featured_image_url: input.featured_image_url || announcement.featured_image_url,
      visibility_level: input.visibility_level || announcement.visibility_level,
      visible_to_departments: input.visible_to_departments !== undefined ? input.visible_to_departments : announcement.visible_to_departments,
      visible_to_roles: input.visible_to_roles !== undefined ? input.visible_to_roles : announcement.visible_to_roles,
      priority: input.priority || announcement.priority,
      allow_comments: input.allow_comments !== undefined ? input.allow_comments : announcement.allow_comments,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Announcement updated: ${announcement.uuid}`);
    return updated;
  }

  /**
   * Publish announcement
   */
  async publishAnnouncement(ctx: TenantContext, id: number | string): Promise<Announcement> {
    const announcement = await this.announcementRepo.getById(ctx, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    const published = await this.announcementRepo.update(ctx, id, {
      status: 'published',
      published_by: ctx.userId,
      published_at: new Date(),
      updated_by: ctx.userId,
    } as any);

    logger.info(`Announcement published: ${announcement.uuid}`);
    return published;
  }

  /**
   * Archive announcement
   */
  async archiveAnnouncement(ctx: TenantContext, id: number | string): Promise<Announcement> {
    const announcement = await this.announcementRepo.getById(ctx, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    const archived = await this.announcementRepo.update(ctx, id, {
      status: 'archived',
      updated_by: ctx.userId,
    } as any);

    logger.info(`Announcement archived: ${announcement.uuid}`);
    return archived;
  }

  /**
   * Get announcements for user (with visibility filtering)
   */
  async getAnnouncementsForUser(
    ctx: TenantContext,
    userId: number,
    userRoles: number[],
    userDepartments: number[],
    options: any = {}
  ): Promise<{ items: (Announcement & { read: boolean })[]; meta: any }> {
    const result = await this.announcementRepo.getPublishedVisible(
      ctx,
      userId,
      userRoles,
      userDepartments,
      options
    );

    // Get read announcements for this user
    const readAnnouncementIds = await this.readRepo.getReadByUser(ctx, userId);

    // Add read flag
    const items = result.items.map((announcement) => ({
      ...announcement,
      read: readAnnouncementIds.includes(announcement.id),
    }));

    return {
      items,
      meta: result.meta,
    };
  }

  /**
   * Mark announcement as read
   */
  async markAnnouncementAsRead(ctx: TenantContext, announcementId: number): Promise<void> {
    const announcement = await this.announcementRepo.getById(ctx, announcementId);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    await this.readRepo.markAsRead(ctx, announcementId, ctx.userId);
    logger.info(`Announcement marked as read: ${announcementId}`);
  }

  /**
   * Get announcement detail
   */
  async getAnnouncementDetail(ctx: TenantContext, id: number | string): Promise<Announcement & { read_count: number }> {
    const announcement = await this.announcementRepo.getById(ctx, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    const read_count = await this.readRepo.getReadCount(ctx, announcement.id);

    return {
      ...announcement,
      read_count,
    };
  }

  /**
   * Delete announcement (soft delete)
   */
  async deleteAnnouncement(ctx: TenantContext, id: number | string): Promise<void> {
    const announcement = await this.announcementRepo.getById(ctx, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    await this.announcementRepo.delete(ctx, id);
    logger.info(`Announcement deleted: ${announcement.uuid}`);
  }
}


