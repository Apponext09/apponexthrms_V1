import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/common/lib/logger';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { publishEvent } from '../../../realtime/eventBus';

/**
 * Helper: format current local datetime as MySQL-compatible string.
 * IMPORTANT: never pass `new Date()` directly to Knex for MySQL DATETIME columns;
 * Knex serialises it as ISO 8601 which MySQL rejects.
 */
const mysqlNow = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
};

export interface LateMarkParams {
  /** employees.id of the employee who checked in late */
  employeeId: number;
  /** users.id of the employee (may differ from employees.id) */
  employeeUserId: number;
  /** Full display name e.g. "Jane Smith" */
  employeeName: string;
  /** How many minutes past shift start they checked in */
  lateByMinutes: number;
  /** attendance_records.id for traceability */
  attendanceRecordId: number;
}

type RecipientRole = 'self' | 'team_lead' | 'hr' | 'admin';

interface ResolvedRecipient {
  userId: number;
  role: RecipientRole;
}

/**
 * LateMarkNotificationService
 *
 * Sends late-mark notifications to four recipient groups:
 *   1. The employee themselves  ("You checked in N min late today")
 *   2. Their reporting manager (team lead / direct manager)
 *   3. All HR-role users in the org
 *   4. The org admin user(s)
 *
 * Bypasses the notification_templates system (which requires pre-seeded DB rows)
 * by inserting directly into `notifications` with template_id = NULL.
 * Delivers real-time pushes via the eventBus → NotificationSocket pattern.
 */
export class LateMarkNotificationService {
  private db = getKnex();

  /**
   * Build the notification message for a given recipient role.
   */
  private buildMessage(
    role: RecipientRole,
    employeeName: string,
    lateByMinutes: number
  ): { title: string; body: string } {
    if (role === 'self') {
      return {
        title: 'Late Check-In Marked',
        body: `You checked in ${lateByMinutes} minute${lateByMinutes !== 1 ? 's' : ''} late today. Your attendance has been marked accordingly.`,
      };
    }

    return {
      title: 'Employee Late Check-In',
      body: `${employeeName} checked in ${lateByMinutes} minute${lateByMinutes !== 1 ? 's' : ''} late today.`,
    };
  }

  /**
   * Resolve all user IDs that should receive the late-mark notification.
   * Returns deduplicated list (in case an employee is also HR admin, etc.)
   */
  private async resolveRecipients(
    ctx: TenantContext,
    params: LateMarkParams
  ): Promise<ResolvedRecipient[]> {
    const recipients: ResolvedRecipient[] = [];
    const seen = new Set<number>();

    const add = (userId: number, role: RecipientRole) => {
      if (userId && !seen.has(userId)) {
        seen.add(userId);
        recipients.push({ userId, role });
      }
    };

    // 1. Self — the employee
    add(params.employeeUserId, 'self');

    // 2. Reporting manager (team lead)
    try {
      const emp = await this.db('employees')
        .where('id', params.employeeId)
        .where('organization_id', ctx.organizationId)
        .select('reporting_manager_id')
        .first();

      if (emp?.reporting_manager_id) {
        // reporting_manager_id references employees.id, need the linked users.id
        const managerEmp = await this.db('employees')
          .where('id', emp.reporting_manager_id)
          .where('organization_id', ctx.organizationId)
          .select('user_id')
          .first();

        if (managerEmp?.user_id) {
          add(Number(managerEmp.user_id), 'team_lead');
        }
      }
    } catch (err) {
      logger.warn('[LateMarkNotificationService] Could not resolve reporting manager', err);
    }

    // 3. HR role users
    try {
      const hrUsers = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.organization_id', ctx.organizationId)
        .whereRaw("LOWER(roles.name) LIKE '%hr%'")
        .select('user_roles.user_id');

      for (const row of hrUsers) {
        add(Number(row.user_id), 'hr');
      }
    } catch (err) {
      logger.warn('[LateMarkNotificationService] Could not resolve HR users', err);
    }

    // 4. Admin user(s) in org
    try {
      const adminUsers = await this.db('users')
        .where('organization_id', ctx.organizationId)
        .whereRaw("LOWER(role) = 'admin'")
        .whereNull('deleted_at')
        .select('id');

      for (const row of adminUsers) {
        add(Number(row.id), 'admin');
      }
    } catch (err) {
      logger.warn('[LateMarkNotificationService] Could not resolve admin users', err);
    }

    return recipients;
  }

  /**
   * Insert a notification row and push a real-time event for one recipient.
   */
  private async notifyOne(
    ctx: TenantContext,
    recipient: ResolvedRecipient,
    params: LateMarkParams,
    now: string
  ): Promise<void> {
    const { title, body } = this.buildMessage(
      recipient.role,
      params.employeeName,
      params.lateByMinutes
    );

    const notificationUuid = uuidv4();

    // Insert directly — template_id is now nullable (migration 20260810_make_notifications_flexible)
    const [notificationId] = await this.db('notifications').insert({
      uuid: notificationUuid,
      organization_id: ctx.organizationId,
      // template_id intentionally NULL — direct insert
      event_code: null,
      notification_type: 'late_mark',
      recipient_id: recipient.userId,
      channels: JSON.stringify(['in_app']),
      subject_line: title,
      body_text: body,
      variables: JSON.stringify({
        employeeName: params.employeeName,
        lateByMinutes: params.lateByMinutes,
        role: recipient.role,
      }),
      status: 'delivered',
      priority: 'normal',
      related_entity_type: 'attendance_record',
      related_entity_id: params.attendanceRecordId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: now,
      updated_at: now,
    });

    // Publish to eventBus — NotificationSocket picks this up and emits to the user room
    publishEvent<{ userId: number; payload: Record<string, unknown> }>(
      'notification:broadcast_to_user',
      {
        userId: recipient.userId,
        payload: {
          id: notificationId,
          uuid: notificationUuid,
          notification_type: 'late_mark',
          subject_line: title,
          body_text: body,
          priority: 'normal',
          status: 'delivered',
          created_at: now,
          related_entity_type: 'attendance_record',
          related_entity_id: params.attendanceRecordId,
        },
      }
    );
  }

  /**
   * Send late-mark notifications to all four recipient groups.
   * Safe to call fire-and-forget (errors are logged, not thrown).
   */
  async sendLateMarkNotifications(
    ctx: TenantContext,
    params: LateMarkParams
  ): Promise<void> {
    // Only fire when actually late
    if (!params.lateByMinutes || params.lateByMinutes <= 0) return;

    const now = mysqlNow();

    try {
      const recipients = await this.resolveRecipients(ctx, params);

      if (recipients.length === 0) {
        logger.warn('[LateMarkNotificationService] No recipients resolved — skipping');
        return;
      }

      logger.info(
        `[LateMarkNotificationService] Sending late-mark notifications to ${recipients.length} recipients ` +
        `for employee ${params.employeeId} (${params.lateByMinutes} min late)`
      );

      // Fire all inserts concurrently — failures per-recipient are caught individually
      await Promise.allSettled(
        recipients.map((r) => this.notifyOne(ctx, r, params, now))
      );
    } catch (err) {
      logger.error('[LateMarkNotificationService] sendLateMarkNotifications failed', err);
    }
  }
}
