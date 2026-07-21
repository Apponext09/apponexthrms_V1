import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface DeviceLog {
  id: number;
  uuid: string;
  organization_id: number;
  device_id: string;
  device_type: 'biometric' | 'rfid' | 'qr_scanner' | 'face_recognition' | 'kiosk';
  location_id: number;
  employee_id: number | null;
  punch_time: string;
  punch_type: 'check_in' | 'break_in' | 'break_out' | 'check_out';
  device_response_code: number;
  device_response_message: string | null;
  processed: boolean;
  matched_attendance_id: number | null;
  created_at: string;
}

export class DeviceLogRepository extends BaseRepository<DeviceLog> {
  constructor() {
    super('attendance_device_logs');
  }

  async getUnprocessed(ctx: TenantContext, limit: number = 100): Promise<DeviceLog[]> {
    return this.query(ctx)
      .where('processed', false)
      .orderBy('punch_time', 'asc')
      .limit(limit);
  }

  async getByDevice(ctx: TenantContext, deviceId: string, limit: number = 100): Promise<DeviceLog[]> {
    return this.query(ctx)
      .where('device_id', deviceId)
      .orderBy('punch_time', 'desc')
      .limit(limit);
  }

  async getByLocation(ctx: TenantContext, locationId: number, limit: number = 100): Promise<DeviceLog[]> {
    return this.query(ctx)
      .where('location_id', locationId)
      .orderBy('punch_time', 'desc')
      .limit(limit);
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, limit: number = 100): Promise<DeviceLog[]> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .orderBy('punch_time', 'desc')
      .limit(limit);
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
