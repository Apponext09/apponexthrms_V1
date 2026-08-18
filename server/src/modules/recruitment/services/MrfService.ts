import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { MrfRequestRepository } from '../repositories/MrfRequestRepository';
import { MrfApprovalHistoryRepository } from '../repositories/MrfApprovalHistoryRepository';
import type { CreateMrfRequestInput, UpdateMrfRequestInput } from '../types/mrf';

export class MrfService {
  private mrfRepo: MrfRequestRepository;
  private approvalRepo: MrfApprovalHistoryRepository;

  constructor() {
    this.mrfRepo = new MrfRequestRepository();
    this.approvalRepo = new MrfApprovalHistoryRepository();
  }

  /**
   * Create a new MRF Request with auto-generated MR number
   */
  async createMrf(ctx: TenantContext, input: CreateMrfRequestInput) {
    const mrNumber = await this.mrfRepo.getNextMrNumber(ctx);

    const created = await this.mrfRepo.create(ctx, {
      mr_number: mrNumber,
      position_title: input.positionTitle.toUpperCase(),
      number_of_positions: input.numberOfPositions,
      recruitment_type: input.recruitmentType || 'Both',
      company_id: input.companyId || null,
      company_location_id: input.companyLocationId || null,
      department_id: input.departmentId || null,
      grade_id: input.gradeId || null,
      employment_type: input.employmentType || null,
      qualification_required: input.qualificationRequired || null,
      experience_desired: input.experienceDesired || null,
      interviewer_id: input.interviewerId || null,
      pay_scale_type: input.payScaleType || null,
      pay_scale_for_position: input.payScaleForPosition || null,
      reason_for_requirement: input.reasonForRequirement || null,
      list_in_job_page: input.listInJobPage || 'Yes',
      skills: input.skills ? JSON.stringify(input.skills) : null,
      comment: input.comment || null,
      job_description: input.jobDescription || null,
      target_closure_date: (input as any).targetClosureDate || (input as any).expiryDate || null,
      stage: input.stage || 'Pending Approval',
      status: input.status || (input.listInJobPage === 'No' ? 'Closed' : 'Open'),
      requested_by: ctx.userId,
      approved_by: input.stage === 'Approved' ? ctx.userId : null,
      approved_at: input.stage === 'Approved' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Create initial submission/approval audit entry
    await this.approvalRepo.create(ctx, {
      mrf_request_id: created.id,
      approver_id: ctx.userId,
      action: input.stage === 'Approved' ? 'approved' : 'submitted',
      comment: input.stage === 'Approved' ? 'MRF Request created and approved' : 'MRF Request submitted',
    } as any);

    if (created.interviewer_id) {
      const fullMrf = await this.mrfRepo.getById(ctx, created.id);
      if (fullMrf) {
        await this.sendInterviewerNotification(ctx, created.interviewer_id, fullMrf);
      }
    }

    return created;
  }

  /**
   * List MRF Requests with optional filters
   */
  async listMrfs(
    ctx: TenantContext,
    options: ListQueryOptions & {
      mrNumber?: string;
      positionTitle?: string;
      status?: 'Open' | 'Closed';
      departmentId?: number;
    } = {}
  ) {
    const filters: Record<string, unknown> = {};

    if (options.status) filters.status = options.status;
    if (options.departmentId) filters.department_id = options.departmentId;

    // Build search from mrNumber or positionTitle
    let search = options.search;
    if (options.mrNumber) search = options.mrNumber;
    if (options.positionTitle) search = options.positionTitle;

    return this.mrfRepo.list(ctx, {
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy || 'created_at',
      sortOrder: options.sortOrder || 'desc',
      search,
      filters,
    });
  }

  /**
   * Get single MRF by ID
   */
  async getMrf(ctx: TenantContext, id: number) {
    return this.mrfRepo.getById(ctx, id);
  }

  /**
   * Update an MRF Request
   */
  async updateMrf(ctx: TenantContext, id: number, input: UpdateMrfRequestInput) {
    const updateData: Record<string, any> = { updated_by: ctx.userId };

    if (input.positionTitle !== undefined) updateData.position_title = input.positionTitle.toUpperCase();
    if (input.numberOfPositions !== undefined) updateData.number_of_positions = input.numberOfPositions;
    if (input.recruitmentType !== undefined) updateData.recruitment_type = input.recruitmentType;
    if (input.companyId !== undefined) updateData.company_id = input.companyId;
    if (input.companyLocationId !== undefined) updateData.company_location_id = input.companyLocationId;
    if (input.departmentId !== undefined) updateData.department_id = input.departmentId;
    if (input.gradeId !== undefined) updateData.grade_id = input.gradeId;
    if (input.employmentType !== undefined) updateData.employment_type = input.employmentType;
    if (input.qualificationRequired !== undefined) updateData.qualification_required = input.qualificationRequired;
    if (input.experienceDesired !== undefined) updateData.experience_desired = input.experienceDesired;
    if (input.interviewerId !== undefined) updateData.interviewer_id = input.interviewerId;
    if (input.payScaleType !== undefined) updateData.pay_scale_type = input.payScaleType;
    if (input.payScaleForPosition !== undefined) updateData.pay_scale_for_position = input.payScaleForPosition;
    if (input.reasonForRequirement !== undefined) updateData.reason_for_requirement = input.reasonForRequirement;
    if (input.listInJobPage !== undefined) updateData.list_in_job_page = input.listInJobPage;
    if (input.skills !== undefined) updateData.skills = JSON.stringify(input.skills);
    if (input.comment !== undefined) updateData.comment = input.comment;
    if (input.jobDescription !== undefined) updateData.job_description = input.jobDescription;
    if ((input as any).targetClosureDate !== undefined || (input as any).expiryDate !== undefined) {
      updateData.target_closure_date = (input as any).targetClosureDate || (input as any).expiryDate || null;
    }

    const oldMrf = await this.mrfRepo.getById(ctx, id);
    const updated = await this.mrfRepo.update(ctx, id, updateData);

    if (updateData.interviewer_id && (!oldMrf || oldMrf.interviewer_id !== updateData.interviewer_id)) {
      const fullMrf = await this.mrfRepo.getById(ctx, id);
      if (fullMrf) {
        await this.sendInterviewerNotification(ctx, updateData.interviewer_id, fullMrf);
      }
    }

    return updated;
  }

  /**
   * Soft-delete an MRF Request
   */
  async deleteMrf(ctx: TenantContext, id: number) {
    return this.mrfRepo.delete(ctx, id);
  }

  /**
   * Approve an MRF Request
   */
  async approveMrf(ctx: TenantContext, id: number, comment?: string) {
    await this.mrfRepo.update(ctx, id, {
      stage: 'Approved',
      approved_by: ctx.userId,
      approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);

    await this.approvalRepo.create(ctx, {
      mrf_request_id: id,
      approver_id: ctx.userId,
      action: 'approved',
      comment: comment || 'MRF Request approved',
    } as any);

    return this.mrfRepo.getById(ctx, id);
  }

  /**
   * Reject an MRF Request
   */
  async rejectMrf(ctx: TenantContext, id: number, comment?: string) {
    await this.mrfRepo.update(ctx, id, {
      stage: 'Rejected',
      status: 'Closed',
      updated_by: ctx.userId,
    } as any);

    await this.approvalRepo.create(ctx, {
      mrf_request_id: id,
      approver_id: ctx.userId,
      action: 'rejected',
      comment: comment || 'MRF Request rejected',
    } as any);

    return this.mrfRepo.getById(ctx, id);
  }

  /**
   * Get approval audit log for an MRF
   */
  async getAuditLog(ctx: TenantContext, mrfId: number) {
    return this.approvalRepo.getByMrfId(ctx, mrfId);
  }

  /**
   * Add a custom action/comment log to an MRF Request
   */
  async addAction(ctx: TenantContext, mrfId: number, status: string, comment?: string) {
    let actionType: 'approved' | 'rejected' | 'returned' | 'submitted' = 'submitted';
    if (status.toLowerCase().includes('approve')) actionType = 'approved';
    else if (status.toLowerCase().includes('reject')) actionType = 'rejected';
    else if (status.toLowerCase().includes('close')) actionType = 'returned';

    await this.approvalRepo.create(ctx, {
      mrf_request_id: mrfId,
      approver_id: ctx.userId,
      action: actionType,
      comment: comment ? `[${status}] ${comment}` : `Action: ${status}`,
    } as any);

    if (['Approved', 'Closed', 'Rejected', 'WIP'].includes(status)) {
      await this.mrfRepo.update(ctx, mrfId, {
        status: status === 'Closed' ? 'Closed' : 'Open',
        stage: status,
        updated_by: ctx.userId
      } as any);
    }

    return this.approvalRepo.getByMrfId(ctx, mrfId);
  }

  /**
   * Generate shareable job reference link
   */
  generateReferenceLink(baseUrl: string, mrfId: number, mrNumber: string): string {
    return `${baseUrl}/job-reference/${mrNumber}/${mrfId}`;
  }

  private async sendInterviewerNotification(ctx: TenantContext, interviewerEmployeeId: number, mrfRequest: any) {
    try {
      const db = this.mrfRepo.db;

      // Resolve user ID for the employee
      const user = await db('users')
        .where('employee_id', interviewerEmployeeId)
        .where('organization_id', ctx.organizationId)
        .first();

      if (!user) {
        console.warn(`[MrfService] No user account linked to employee ID ${interviewerEmployeeId}, skipping notification`);
        return;
      }

      // Ensure notification template and event exist for recruitment MRF assignment
      const eventCode = 'recruitment.mrf.assigned';
      const eventName = 'MRF Interviewer Assigned';
      const subject = 'New MRF Assigned for Interview: {{mrNumber}}';
      const body = 'Hello {{employeeName}},\n\nYou have been assigned as the interviewer for MRF Request {{mrNumber}} ({{positionTitle}}).\n\nDetails:\n- Positions: {{numberOfPositions}}\n- Department: {{department}}\n- Requester Comments: {{comment}}\n\nPlease review it in your recruitment portal.';

      // Get superadmin or fallback user ID for seeding
      const systemUserId = ctx.userId || user.id;

      // 1. Check template
      let templateRow = await db('notification_templates')
        .where('organization_id', ctx.organizationId)
        .where('template_name', eventName)
        .whereNull('deleted_at')
        .first();

      if (!templateRow) {
        const { v4: uuidv4 } = await import('uuid');
        const [insertedId] = await db('notification_templates').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          template_name: eventName,
          subject: subject,
          email_notification: body,
          is_active: 'Yes',
          created_by: systemUserId,
          updated_by: systemUserId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        templateRow = { id: insertedId };
      }

      // 2. Check event
      const eventRow = await db('notification_events')
        .where('organization_id', ctx.organizationId)
        .where('event_code', eventCode)
        .whereNull('deleted_at')
        .first();

      if (!eventRow) {
        const { v4: uuidv4 } = await import('uuid');
        await db('notification_events').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          event_code: eventCode,
          event_name: eventName,
          default_template_id: templateRow.id,
          is_enabled: true,
          created_by: systemUserId,
          updated_by: systemUserId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Fetch employee full name to interpolate
      const interviewer = await db('employees').where('id', interviewerEmployeeId).first();
      const interviewerName = interviewer 
        ? `${interviewer.first_name || ''} ${interviewer.last_name || ''}`.trim()
        : 'Interviewer';

      // Import and call NotificationService
      const { NotificationService } = await import('../../notifications/services/notification.service');
      const notificationService = new NotificationService();

      await notificationService.sendNotification(ctx, {
        eventCode,
        recipientId: user.id,
        variables: {
          employeeName: interviewerName,
          mrNumber: mrfRequest.mrNumber || mrfRequest.mr_number || '',
          positionTitle: mrfRequest.positionTitle || mrfRequest.position_title || '',
          numberOfPositions: String(mrfRequest.numberOfPositions || mrfRequest.number_of_positions || 1),
          department: mrfRequest.department || mrfRequest.department_name || 'N/A',
          comment: mrfRequest.comment || 'None',
        },
      });

      console.log(`[MrfService] Notification successfully sent to user ID ${user.id} for MRF ${mrfRequest.id}`);
    } catch (err) {
      console.error('[MrfService] Failed to send interviewer assignment notification:', err);
    }
  }
}
