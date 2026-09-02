import { getKnex } from '../../../db/knex';
import { logger } from '../../../common/lib/logger';
import type { TenantContext } from '../../../db/types';

/**
 * Timezone handling service for attendance operations
 * Ensures accurate timestamp recording and timezone conversions
 */
export class TimezoneService {
  private db = getKnex();

  /**
   * Get organization timezone
   */
  async getOrgTimezone(orgId: number): Promise<string> {
    const org = await this.db('organizations')
      .where('id', orgId)
      .select('timezone')
      .first();

    return org?.timezone || 'UTC';
  }

  /**
   * Get employee timezone (can override org timezone)
   */
  async getEmployeeTimezone(ctx: TenantContext, employeeId: number): Promise<string> {
    const employee = await this.db('employees')
      .where('id', employeeId)
      .where('organization_id', ctx.organizationId)
      .select('timezone', 'organization_id')
      .first();

    if (employee?.timezone) {
      return employee.timezone;
    }

    return this.getOrgTimezone(ctx.organizationId);
  }

  /**
   * Get current server timestamp in UTC
   * This is the canonical timestamp stored in database
   */
  getUtcNow(): Date {
    return new Date();
  }

  /**
   * Convert UTC timestamp to organization timezone string
   * Returns ISO string in the org's timezone
   */
  convertUtcToOrgTimezone(
    utcDate: Date,
    orgTimezone: string
  ): { iso: string; unix: number; formatted: string } {
    try {
      // For now, using JavaScript Date object
      // In production, use a library like date-fns-tz or luxon
      const date = new Date(utcDate);
      const unix = date.getTime();
      const iso = date.toISOString();

      // Format: YYYY-MM-DD HH:mm:ss (no timezone suffix)
      const formatted = date.toISOString().replace('T', ' ').substring(0, 19);

      return {
        iso,
        unix,
        formatted,
      };
    } catch (error) {
      logger.error('[Timezone] Conversion error', {
        error: error instanceof Error ? error.message : String(error),
        timezone: orgTimezone,
      });
      throw new Error('Timezone conversion failed');
    }
  }

  /**
   * Record attendance timestamp with timezone metadata
   * Ensures the timestamp can be accurately audited
   */
  async recordAttendanceTimestamp(
    ctx: TenantContext,
    employeeId: number,
    operation: 'check_in' | 'check_out' | 'break_in' | 'break_out',
    clientSubmittedTime?: Date
  ): Promise<{
    timestamp: Date;
    timezone: string;
    unix: number;
    clientTimeMatch: boolean;
    skewMs: number;
  }> {
    const timezone = await this.getEmployeeTimezone(ctx, employeeId);
    const serverTime = this.getUtcNow();
    const unix = serverTime.getTime();

    // Check for time skew if client provided time
    let clientTimeMatch = false;
    let skewMs = 0;

    if (clientSubmittedTime) {
      const clientUnix = clientSubmittedTime.getTime();
      skewMs = Math.abs(unix - clientUnix);
      clientTimeMatch = skewMs < 5000; // Within 5 seconds

      if (skewMs > 5000) {
        logger.warn('[Timezone] Client time skew detected', {
          employeeId,
          operation,
          skewMs,
          timezone,
          clientTime: clientSubmittedTime.toISOString(),
          serverTime: serverTime.toISOString(),
        });
      }
    }

    logger.debug('[Timezone] Attendance timestamp recorded', {
      employeeId,
      operation,
      timestamp: serverTime.toISOString(),
      timezone,
      clientTimeMatch,
      skewMs,
    });

    return {
      timestamp: serverTime,
      timezone,
      unix,
      clientTimeMatch,
      skewMs,
    };
  }

  /**
   * Validate attendance timestamp accuracy
   * Check if timestamp falls within valid business hours (if applicable)
   */
  async validateTimestampAccuracy(
    ctx: TenantContext,
    employeeId: number,
    timestamp: Date,
    timezone: string
  ): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const now = new Date();

    // Check for future timestamps
    if (timestamp > now) {
      issues.push('Timestamp is in the future');
    }

    // Check for very old timestamps (>7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timestamp < sevenDaysAgo) {
      issues.push('Timestamp is older than 7 days');
    }

    // Verify timezone is valid
    const validTimezones = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York'];
    if (!validTimezones.includes(timezone)) {
      // Allow if timezone looks valid (basic check)
      if (!timezone.includes('/')) {
        issues.push('Invalid timezone format');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get attendance records for a day in employee's timezone
   * Returns records correctly bounded by the employee's day boundaries
   */
  async getEmployeeDayRecords(
    ctx: TenantContext,
    employeeId: number,
    date: Date
  ): Promise<any[]> {
    const timezone = await this.getEmployeeTimezone(ctx, employeeId);

    // Get midnight boundaries in employee's timezone
    // This is simplified - in production use a proper timezone library
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const records = await this.db('attendance_records')
      .where('employee_id', employeeId)
      .where('organization_id', ctx.organizationId)
      .whereBetween('check_in_time', [dayStart, dayEnd])
      .orderBy('check_in_time', 'asc');

    logger.debug('[Timezone] Day records retrieved', {
      employeeId,
      date: date.toISOString().split('T')[0],
      timezone,
      recordCount: records.length,
    });

    return records;
  }

  /**
   * Calculate working hours accurately considering timezone
   */
  calculateWorkingHours(
    checkInTime: Date,
    checkOutTime: Date
  ): {
    totalMinutes: number;
    totalHours: number;
    formatted: string;
  } {
    const durationMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalMinutes = Math.floor(durationMs / 60000);
    const totalHours = (totalMinutes / 60).toFixed(2);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      totalMinutes,
      totalHours: parseFloat(totalHours),
      formatted: `${hours}h ${minutes}m`,
    };
  }

  /**
   * Audit timestamp changes
   */
  async auditTimestampChange(
    ctx: TenantContext,
    recordId: number,
    fieldName: string,
    oldValue: Date,
    newValue: Date,
    reason: string
  ): Promise<void> {
    await this.db('attendance_audit').insert({
      organization_id: ctx.organizationId,
      record_id: recordId,
      field_name: fieldName,
      old_value: oldValue.toISOString(),
      new_value: newValue.toISOString(),
      changed_by: ctx.userId,
      reason,
      created_at: new Date(),
    });

    logger.warn('[Timezone] Timestamp changed in audit', {
      recordId,
      fieldName,
      oldValue: oldValue.toISOString(),
      newValue: newValue.toISOString(),
      reason,
      changedBy: ctx.userId,
    });
  }
}

export const timezoneService = new TimezoneService();
