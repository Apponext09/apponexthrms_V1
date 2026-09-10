import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';
import {
  ApplicationStatus,
  CandidateStatus,
  APPLICATION_TO_CANDIDATE_STATUS_MAP,
  STATUS_PROGRESSION_RANK,
  mapStageNameToApplicationStatus,
  matchStageForStatus,
} from '../constants/statusMapping';

export interface SyncStatusOptions {
  stageId?: number;
  notes?: string;
  rejectionReason?: string;
  triggeredBy?: string;
  metadata?: Record<string, any>;
  changedBy?: number;
  trx?: any;
}

export interface SyncStatusResult {
  application: any;
  candidate: any;
  stageId: number | null;
  status: ApplicationStatus;
}

/**
 * StatusSyncService
 * 
 * Centralized Single Source of Truth for recruitment status synchronization.
 * 
 * Any status change across the recruitment funnel (Applicant Tracker, Assessment,
 * Interview, Resume Bank Shortlist) MUST route through this service.
 * 
 * In a single ACID transaction, it guarantees that:
 * 1. `applications.application_status` is updated.
 * 2. `applications.pipeline_stage_id` is updated in lockstep.
 * 3. `application_stage_history` logs the transition.
 * 4. `candidates.status` is dynamically recomputed to reflect the candidate's
 *    most active / advanced application.
 */
export class StatusSyncService {
  /**
   * Synchronize an application's status and pipeline stage, then recompute candidate status.
   */
  async syncApplicationStatus(
    ctx: TenantContext,
    applicationId: number,
    newStatusOrStageId: ApplicationStatus | number,
    options: SyncStatusOptions = {}
  ): Promise<SyncStatusResult> {
    const db = getKnex();

    const executeInTransaction = async (trx: any): Promise<SyncStatusResult> => {
      const now = new Date();
      const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // 1. Fetch target application
      const application = await trx('applications')
        .where({ id: applicationId, organization_id: ctx.organizationId })
        .first();

      if (!application) {
        throw new Error(`Application with ID ${applicationId} not found`);
      }

      // 2. Fetch organization's pipeline stages
      let stagesQuery = trx('pipeline_stages')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');

      const hasStageOrder = await trx.schema.hasColumn('pipeline_stages', 'stage_order').catch(() => false);
      if (hasStageOrder) {
        stagesQuery = stagesQuery.orderBy('stage_order', 'asc');
      } else {
        stagesQuery = stagesQuery.orderBy('sequence_order', 'asc');
      }
      const stages = await stagesQuery;

      // 3. Resolve target status and target stageId
      let targetStatus: ApplicationStatus;
      let targetStageId: number | null = null;

      if (typeof newStatusOrStageId === 'number') {
        // Input is a Stage ID (e.g. from Tracker drag-and-drop)
        targetStageId = newStatusOrStageId;
        const matchedStage = stages.find((s: any) => s.id === targetStageId);
        if (!matchedStage) {
          throw new Error(`Pipeline stage with ID ${targetStageId} not found`);
        }
        targetStatus = mapStageNameToApplicationStatus(
          matchedStage.stage_name || matchedStage.stageName || '',
          Boolean(matchedStage.is_rejection_stage || matchedStage.isRejectionStage)
        );
      } else {
        // Input is an ApplicationStatus string (e.g. 'interview', 'screening')
        targetStatus = newStatusOrStageId;
        if (options.stageId) {
          targetStageId = options.stageId;
        } else {
          targetStageId = matchStageForStatus(stages, targetStatus);
        }
      }

      const prevStageId = application.pipelineStageId || null;
      const prevStatus = application.applicationStatus;

      // 4. Update Applications table
      const updateData: any = {
        application_status: targetStatus,
        pipeline_stage_id: targetStageId,
        current_stage_entered_at: mysqlNow,
        updated_by: options.changedBy || ctx.userId,
        updated_at: mysqlNow,
      };

      if (targetStatus === 'rejected') {
        updateData.rejection_reason = options.rejectionReason || options.notes || 'Rejected during recruitment review';
        updateData.rejected_at_stage = prevStatus || 'applied';
      }

      await trx('applications')
        .where('id', applicationId)
        .update(updateData);

      const updatedApplication = await trx('applications').where('id', applicationId).first();

      // 5. Insert stage history audit log
      if (targetStageId && (targetStageId !== prevStageId || targetStatus !== prevStatus)) {
        const hasMetadataCol = await trx.schema.hasColumn('application_stage_history', 'metadata').catch(() => false);
        
        let notesText = options.notes || `Status changed from ${prevStatus || 'none'} to ${targetStatus}`;
        if (options.triggeredBy && !notesText.includes(options.triggeredBy)) {
          notesText = `[${options.triggeredBy}] ${notesText}`;
        }

        const historyData: any = {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          application_id: applicationId,
          from_stage_id: prevStageId,
          to_stage_id: targetStageId,
          moved_by_user_id: options.changedBy || ctx.userId || 1,
          notes: notesText,
          moved_at: mysqlNow,
          created_at: mysqlNow,
        };

        if (hasMetadataCol && (options.metadata || options.triggeredBy)) {
          historyData.metadata = JSON.stringify({
            triggeredBy: options.triggeredBy,
            ...options.metadata,
          });
        }

        await trx('application_stage_history').insert(historyData);
      }

      // 6. Recompute candidate's overall status based on their most active application
      const candidateId = application.candidate_id || application.candidateId;
      let updatedCandidate = null;

      if (candidateId) {
        updatedCandidate = await this.recomputeCandidateStatus(trx, ctx, candidateId);
      }

      return {
        application: updatedApplication,
        candidate: updatedCandidate,
        stageId: targetStageId,
        status: targetStatus,
      };
    };

    if (options.trx) {
      return executeInTransaction(options.trx);
    } else {
      return db.transaction(executeInTransaction);
    }
  }

  /**
   * Recompute candidate's status by examining all active applications for that candidate.
   * Uses STATUS_PROGRESSION_RANK to pick the most advanced non-terminal application.
   */
  async recomputeCandidateStatus(trx: any, ctx: TenantContext, candidateId: number): Promise<any> {
    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const candidateApps = await trx('applications')
      .where({ candidate_id: candidateId, organization_id: ctx.organizationId })
      .whereNull('deleted_at');

    let chosenCandidateStatus: CandidateStatus = 'applied';

    if (candidateApps.length > 0) {
      // Sort applications by status progression rank descending, then updated_at descending
      candidateApps.sort((a: any, b: any) => {
        const rankA = STATUS_PROGRESSION_RANK[a.application_status] ?? 0;
        const rankB = STATUS_PROGRESSION_RANK[b.application_status] ?? 0;
        if (rankA !== rankB) return rankB - rankA;
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const mostActiveApp = candidateApps[0];
      chosenCandidateStatus = APPLICATION_TO_CANDIDATE_STATUS_MAP[mostActiveApp.application_status] || 'applied';
    }

    await trx('candidates')
      .where('id', candidateId)
      .update({
        status: chosenCandidateStatus,
        updated_at: mysqlNow,
      });

    return trx('candidates').where('id', candidateId).first();
  }
}

export const statusSyncService = new StatusSyncService();
