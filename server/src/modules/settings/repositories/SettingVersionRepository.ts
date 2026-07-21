import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, QueryBuilder } from '../../../db/types';

export interface SettingVersion {
  id: number;
  uuid: string;
  organization_id: number;
  entity_type: string;
  entity_id: number;
  version_number: number;
  old_value: any;
  new_value: any;
  change_type: 'create' | 'update' | 'delete' | 'restore';
  changed_by_user_id: number;
  change_reason: string | null;
  created_at: string;
}

export class SettingVersionRepository extends BaseRepository<SettingVersion> {
  constructor() {
    super('setting_versions');
  }

  /**
   * Create a new version record (append-only)
   */
  async createVersion(
    ctx: TenantContext,
    data: {
      entity_type: string;
      entity_id: number;
      version_number: number;
      old_value: any;
      new_value: any;
      change_type: 'create' | 'update' | 'delete' | 'restore';
      change_reason?: string | null;
    }
  ): Promise<SettingVersion> {
    return this.create(ctx, {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      version_number: data.version_number,
      old_value: data.old_value,
      new_value: data.new_value,
      change_type: data.change_type,
      changed_by_user_id: ctx.userId,
      change_reason: data.change_reason || null,
    });
  }

  /**
   * Get all versions for an entity
   */
  async getForEntity(ctx: TenantContext, entityType: string, entityId: number) {
    return this.query(ctx)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .orderBy('version_number', 'asc');
  }

  /**
   * Get latest version for an entity
   */
  async getLatestForEntity(ctx: TenantContext, entityType: string, entityId: number): Promise<SettingVersion | null> {
    return this.query(ctx)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .orderBy('version_number', 'desc')
      .first() as Promise<SettingVersion | null>;
  }

  /**
   * Get changes by user
   */
  async getByUser(ctx: TenantContext, userId: number) {
    return this.query(ctx)
      .where('changed_by_user_id', userId)
      .orderBy('created_at', 'desc');
  }

  /**
   * Get changes by type
   */
  async getByChangeType(ctx: TenantContext, changeType: string) {
    return this.query(ctx)
      .where('change_type', changeType)
      .orderBy('created_at', 'desc');
  }

  /**
   * Get changes in date range
   */
  async getInDateRange(ctx: TenantContext, startDate: string, endDate: string) {
    return this.query(ctx)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .orderBy('created_at', 'desc');
  }

  /**
   * Get next version number for entity
   */
  async getNextVersionNumber(ctx: TenantContext, entityType: string, entityId: number): Promise<number> {
    const latest = await this.getLatestForEntity(ctx, entityType, entityId);
    return latest ? latest.version_number + 1 : 1;
  }

  /**
   * Override query method to NOT apply soft delete filter (append-only table)
   */
  protected query(ctx: TenantContext): QueryBuilder<SettingVersion> {
    return this.db<SettingVersion>(this.tableName).where('organization_id', ctx.organizationId);
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['entity_type'];
  }
}
