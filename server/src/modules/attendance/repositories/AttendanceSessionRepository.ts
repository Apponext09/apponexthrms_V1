import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AttendanceSession {
  id: number;
  uuid: string;
  organization_id: number;
  attendance_record_id: number;
  session_type: 'check_in' | 'break_in' | 'break_out' | 'check_out';
  session_timestamp: string;
  device_id: string | null;
  device_latitude: number | null;
  device_longitude: number | null;
  geofence_matched: boolean | null;
  ip_address: string | null;
  user_agent: string | null;
  session_notes: string | null;
  created_at: string;
}

export class AttendanceSessionRepository extends BaseRepository<AttendanceSession> {
  constructor() {
    super('attendance_sessions');
  }

  async getByRecord(ctx: TenantContext, recordId: number): Promise<AttendanceSession[]> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .orderBy('session_timestamp', 'asc');
  }

  async getLastSession(ctx: TenantContext, recordId: number): Promise<AttendanceSession | null> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .orderBy('session_timestamp', 'desc')
      .first() as Promise<AttendanceSession | null>;
  }

  async getSessionsByType(ctx: TenantContext, recordId: number, type: string): Promise<AttendanceSession[]> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .where('session_type', type)
      .orderBy('session_timestamp', 'asc');
  }

  override async create(ctx: TenantContext, data: Partial<AttendanceSession>): Promise<AttendanceSession> {
    const [id] = await this.query(ctx)
      .insert({
        ...data,
        organization_id: ctx.organizationId,
        created_at: new Date(),
      } as any);

    const created = await this.getById(ctx, id);
    if (!created) {
      throw new Error(`Failed to create ${this.tableName}`);
    }

    return created;
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
