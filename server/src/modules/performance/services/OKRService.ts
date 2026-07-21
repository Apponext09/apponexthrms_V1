import { v4 as uuidv4 } from 'uuid';
import { OKRObjectiveRepository, OKRKeyResultRepository } from '../repositories/OKRRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class OKRService {
  private okrRepo: OKRObjectiveRepository;
  private krRepo: OKRKeyResultRepository;
  private auditService: AuditService;

  constructor() {
    this.okrRepo = new OKRObjectiveRepository();
    this.krRepo = new OKRKeyResultRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create OKR objective
   */
  async createOKR(ctx: TenantContext, input: {
    title: string;
    description?: string;
    ownerId: number;
    startDate: string;
    endDate: string;
    alignedToGoalId?: number;
  }) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    const okr = await this.okrRepo.create(ctx, {
      uuid: uuidv4(),
      title: input.title,
      description: input.description || null,
      owner_id: input.ownerId,
      start_date: input.startDate,
      end_date: input.endDate,
      aligned_to_goal_id: input.alignedToGoalId || null,
      status: 'planning',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'OKR',
      entityId: okr.id,
      afterState: { title: input.title },
    });

    return okr;
  }

  /**
   * Get OKR
   */
  async getOKR(ctx: TenantContext, okrId: number) {
    const okr = await this.okrRepo.getById(ctx, okrId);
    if (!okr) {
      throw new NotFoundError('OKR not found');
    }
    return okr;
  }

  /**
   * Update OKR
   */
  async updateOKR(ctx: TenantContext, okrId: number, input: any) {
    const okr = await this.getOKR(ctx, okrId);
    const updated = await this.okrRepo.update(ctx, okrId, input);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'OKR',
      entityId: okrId,
      beforeState: okr,
      afterState: updated,
    });

    return updated;
  }

  /**
   * Create key result
   */
  async createKeyResult(ctx: TenantContext, input: {
    okrId: number;
    description: string;
    targetValue: number;
    weight?: number;
  }) {
    const okr = await this.getOKR(ctx, input.okrId);

    const kr = await this.krRepo.create(ctx, {
      uuid: uuidv4(),
      okr_id: input.okrId,
      description: input.description,
      target_value: input.targetValue,
      current_value: 0,
      weight: input.weight || 1,
      status: 'draft',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'OKR_KEY_RESULT',
      entityId: kr.id,
      afterState: { description: input.description },
    });

    return kr;
  }

  /**
   * Update key result progress
   */
  async updateKeyResultProgress(ctx: TenantContext, krId: number, currentValue: number): Promise<any> {
    const kr = await this.krRepo.getById(ctx, krId);
    if (!kr) {
      throw new NotFoundError('Key result not found');
    }

    const completion = (currentValue / kr.target_value) * 100;
    const updated = await this.krRepo.update(ctx, krId, {
      current_value: currentValue,
      status: completion >= 100 ? 'completed' : 'active',
    });

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'OKR_KEY_RESULT',
      entityId: krId,
      details: { currentValue, completion },
    });

    return updated;
  }

  /**
   * Get OKR completion percentage
   */
  async getOKRCompletion(ctx: TenantContext, okrId: number): Promise<number> {
    return this.krRepo.calculateCompletion(ctx, okrId);
  }

  /**
   * Activate OKR
   */
  async activateOKR(ctx: TenantContext, okrId: number) {
    return this.updateOKR(ctx, okrId, { status: 'active' });
  }

  /**
   * Complete OKR
   */
  async completeOKR(ctx: TenantContext, okrId: number) {
    return this.updateOKR(ctx, okrId, { status: 'completed' });
  }

  /**
   * Delete OKR
   */
  async deleteOKR(ctx: TenantContext, okrId: number) {
    await this.getOKR(ctx, okrId);
    await this.okrRepo.delete(ctx, okrId);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'OKR',
      entityId: okrId,
    });
  }
}
