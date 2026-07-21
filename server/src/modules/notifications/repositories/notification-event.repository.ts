import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationEvent {
  id: number;
  uuid: string;
  organization_id: number;
  event_code: string;
  event_name: string;
  event_description?: string;
  default_template_id?: number;
  is_enabled: boolean;
  retry_count: number;
  retry_interval_minutes: number;
  max_queue_delay_hours: number;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class NotificationEventRepository extends BaseRepository<NotificationEvent> {
  constructor() {
    super('notification_events');
  }

  /**
   * Get event by code
   */
  async getByCode(ctx: TenantContext, eventCode: string): Promise<NotificationEvent | null> {
    return this.query(ctx).where('event_code', eventCode).first() as Promise<
      NotificationEvent | null
    >;
  }

  /**
   * Get enabled events
   */
  async getEnabled(ctx: TenantContext): Promise<NotificationEvent[]> {
    return this.query(ctx).where('is_enabled', true).orderBy('event_name', 'asc');
  }

  /**
   * Get event with template details
   */
  async getWithTemplate(ctx: TenantContext, eventId: number): Promise<any> {
    return this.db('notification_events')
      .where('notification_events.id', eventId)
      .where('notification_events.organization_id', ctx.organizationId)
      .leftJoin(
        'notification_templates',
        'notification_events.default_template_id',
        'notification_templates.id'
      )
      .select('notification_events.*', 'notification_templates.*')
      .first();
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['event_code', 'event_name', 'event_description'];
  }
}
