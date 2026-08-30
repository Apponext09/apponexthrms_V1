/**
 * RecruitmentNotificationHelper
 * 
 * Centralized utility for resolving notification recipients and
 * safely dispatching recruitment notifications.
 */
import { getKnex } from '../../../db/knex';
import { NotificationService } from '../../notifications/services/notification.service';
import type { TenantContext } from '../../../db/types';

export class RecruitmentNotificationHelper {
  /**
   * Get user IDs of all HR admins / HR managers for the organization.
   * Looks up users whose roles include 'hr_admin', 'hr', 'hr_manager', or 'organization_admin'.
   */
  static async getHrAdminUserIds(ctx: TenantContext): Promise<number[]> {
    const db = getKnex();
    try {
      const users = await db('users')
        .where('organization_id', ctx.organizationId)
        .where('status', 'active')
        .whereNull('deleted_at')
        .select('id', 'roles');

      const hrRoles = ['hr_admin', 'hr', 'hr_manager', 'organization_admin'];
      const hrUserIds: number[] = [];

      for (const user of users) {
        let userRoles: string[] = [];
        if (typeof user.roles === 'string') {
          try { userRoles = JSON.parse(user.roles); } catch { userRoles = [user.roles]; }
        } else if (Array.isArray(user.roles)) {
          userRoles = user.roles;
        }

        if (userRoles.some((r: string) => hrRoles.includes(r))) {
          hrUserIds.push(user.id);
        }
      }

      return hrUserIds;
    } catch {
      return [];
    }
  }

  /**
   * Get user IDs of all interviewers assigned to an interview.
   * Checks interview_panel table first, then falls back to interviewer_ids JSON column.
   */
  static async getInterviewerUserIds(ctx: TenantContext, interviewId: number): Promise<number[]> {
    const db = getKnex();
    const userIds: Set<number> = new Set();

    try {
      // Check interview_panel table
      const panelMembers = await db('interview_panel')
        .where('interview_id', interviewId)
        .select('interviewer_id', 'employee_id');

      for (const pm of panelMembers) {
        const empId = pm.interviewer_id || pm.employee_id;
        if (empId) {
          // empId is employee ID, resolve to user ID
          const user = await db('users')
            .where('employee_id', empId)
            .where('organization_id', ctx.organizationId)
            .first();
          if (user) userIds.add(user.id);
        }
      }

      // Fallback: check interviewer_ids column on the interview itself
      if (userIds.size === 0) {
        const interview = await db('interviews').where('id', interviewId).first();
        if (interview) {
          let interviewerIds: number[] = [];
          const rawIds = interview.interviewer_ids || interview.interviewer_id;
          if (typeof rawIds === 'string') {
            try { interviewerIds = JSON.parse(rawIds); } catch { interviewerIds = [parseInt(rawIds)].filter(Boolean); }
          } else if (Array.isArray(rawIds)) {
            interviewerIds = rawIds;
          } else if (typeof rawIds === 'number') {
            interviewerIds = [rawIds];
          }

          for (const empId of interviewerIds) {
            if (!empId) continue;
            const userByEmp = await db('users')
              .where('employee_id', empId)
              .where('organization_id', ctx.organizationId)
              .first();
            if (userByEmp) {
              userIds.add(userByEmp.id);
            } else {
              const userById = await db('users')
                .where('id', empId)
                .where('organization_id', ctx.organizationId)
                .first();
              if (userById) userIds.add(userById.id);
            }
          }
        }
      }
    } catch {
      // Silently fail
    }

    return Array.from(userIds);
  }

  /**
   * Get the hiring manager user ID from a job's department.
   */
  static async getHiringManagerUserId(ctx: TenantContext, jobId: number): Promise<number | null> {
    const db = getKnex();
    try {
      const job = await db('job_postings').where('id', jobId).first();
      if (!job?.department_id) return null;

      const dept = await db('departments').where('id', job.department_id).first();
      if (!dept?.manager_id) return null;

      const user = await db('users')
        .where('employee_id', dept.manager_id)
        .where('organization_id', ctx.organizationId)
        .first();

      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the assigned recruiter user ID for an application.
   */
  static async getRecruiterUserId(ctx: TenantContext, applicationId: number): Promise<number | null> {
    const db = getKnex();
    try {
      const app = await db('applications').where('id', applicationId).first();
      const recruiterId = app?.assigned_recruiter_id || app?.recruiter_id;
      if (!recruiterId) return null;

      const userByEmp = await db('users')
        .where('employee_id', recruiterId)
        .where('organization_id', ctx.organizationId)
        .first();
      if (userByEmp) return userByEmp.id;

      const userById = await db('users')
        .where('id', recruiterId)
        .where('organization_id', ctx.organizationId)
        .first();
      return userById?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve candidate name and interview details from interviewId.
   */
  static async getCandidateInfoFromInterview(ctx: TenantContext, interviewId: number): Promise<{
    candidateName: string;
    round: string;
    interviewType: string;
    scheduledDate: string;
    applicationId: number | null;
    jobId: number | null;
  }> {
    const db = getKnex();
    try {
      const interview = await db('interviews').where('id', interviewId).first();
      if (!interview) {
        return { candidateName: 'Unknown', round: 'N/A', interviewType: 'N/A', scheduledDate: 'N/A', applicationId: null, jobId: null };
      }

      let candidateName = 'Unknown Candidate';
      const appId = interview.application_id || interview.applicationId;
      let jobId: number | null = null;

      if (appId) {
        const app = await db('applications').where('id', appId).first();
        if (app?.candidate_id) {
          const candidate = await db('candidates').where('id', app.candidate_id).first();
          if (candidate) {
            candidateName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.email || 'Unknown';
          }
        }
        jobId = app?.job_id || app?.job_posting_id || null;
      }

      return {
        candidateName,
        round: String(interview.interview_round || interview.round || 'N/A'),
        interviewType: interview.interview_type || interview.type || 'N/A',
        scheduledDate: interview.scheduled_date ? String(interview.scheduled_date) : 'N/A',
        applicationId: appId,
        jobId,
      };
    } catch {
      return { candidateName: 'Unknown', round: 'N/A', interviewType: 'N/A', scheduledDate: 'N/A', applicationId: null, jobId: null };
    }
  }

  /**
   * Get the user's display name from user ID.
   */
  static async getUserDisplayName(userId: number): Promise<string> {
    const db = getKnex();
    try {
      const user = await db('users').where('id', userId).first();
      if (!user) return 'System';

      if (user.employee_id) {
        const emp = await db('employees').where('id', user.employee_id).first();
        if (emp) {
          return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || user.email || 'System';
        }
      }
      return user.email || 'System';
    } catch {
      return 'System';
    }
  }

  /**
   * Safe wrapper: send notification without breaking the main flow.
   */
  static async safeSendNotification(
    notificationService: NotificationService,
    ctx: TenantContext,
    params: {
      eventCode: string;
      recipientId: number;
      variables: Record<string, any>;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<void> {
    try {
      await notificationService.sendNotification(ctx, {
        eventCode: params.eventCode,
        recipientId: params.recipientId,
        variables: params.variables,
        priority: params.priority,
      });
    } catch {
      // Silently skip — notification failure should never break primary flow
    }
  }

  /**
   * Send a notification to multiple recipients.
   */
  static async safeSendToMultiple(
    notificationService: NotificationService,
    ctx: TenantContext,
    recipientIds: number[],
    params: {
      eventCode: string;
      variables: Record<string, any>;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<void> {
    for (const recipientId of recipientIds) {
      await this.safeSendNotification(notificationService, ctx, {
        ...params,
        recipientId,
      });
    }
  }
}
