import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Announcement {
  id: number;
  uuid: string;
  organization_id: number;
  title: string;
  content: string;
  featured_image_url?: string;
  visibility_level: 'all_employees' | 'department' | 'role_specific';
  visible_to_departments?: number[]; // JSON array
  visible_to_roles?: number[]; // JSON array
  status: 'draft' | 'published' | 'archived';
  priority: 'low' | 'normal' | 'high';
  published_by?: number;
  published_at?: Date;
  expires_at?: Date;
  allow_comments: boolean;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class AnnouncementRepository extends BaseRepository<Announcement> {
  constructor() {
    super('announcement_posts');
  }

  /**
   * Get published announcements visible to user
   */
  async getPublishedVisible(
    ctx: TenantContext,
    userId: number,
    userRoles: number[],
    userDepartments: number[],
    options: any = {}
  ): Promise<{ items: Announcement[]; meta: any }> {
    let query = this.query(ctx)
      .where('status', 'published')
      .where((q) => {
        q.where('expires_at', '>', new Date()).orWhereNull('expires_at');
      });

    // Filter by visibility
    query = query.andWhere((q) => {
      q.where('visibility_level', 'all_employees')
        .orWhere((q2) => {
          q2.where('visibility_level', 'department').whereRaw(
            "JSON_CONTAINS(visible_to_departments, ?)",
            [JSON.stringify(userDepartments)]
          );
        })
        .orWhere((q2) => {
          q2.where('visibility_level', 'role_specific').whereRaw(
            "JSON_CONTAINS(visible_to_roles, ?)",
            [JSON.stringify(userRoles)]
          );
        });
    });

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');

    const items = await query
      .orderBy('priority', 'desc')
      .orderBy('published_at', 'desc')
      .offset(((options.page || 1) - 1) * (options.pageSize || 20))
      .limit(options.pageSize || 20);

    return {
      items,
      meta: {
        page: options.page || 1,
        pageSize: options.pageSize || 20,
        total: Number(count),
        hasMore: (options.page || 1) * (options.pageSize || 20) < Number(count),
        totalPages: Math.ceil(Number(count) / (options.pageSize || 20)),
      },
    };
  }

  /**
   * Get published announcements
   */
  async getPublished(ctx: TenantContext, options: any = {}): Promise<{ items: Announcement[]; meta: any }> {
    return this.list(ctx, {
      ...options,
      filters: {
        status: 'published',
      },
    });
  }

  /**
   * Get active announcements (not expired)
   */
  async getActive(ctx: TenantContext): Promise<Announcement[]> {
    return this.query(ctx)
      .where('status', 'published')
      .where((q) => {
        q.where('expires_at', '>', new Date()).orWhereNull('expires_at');
      })
      .orderBy('published_at', 'desc');
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['title', 'content'];
  }
}
