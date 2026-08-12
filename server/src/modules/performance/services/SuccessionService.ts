import { v4 as uuidv4 } from 'uuid';
import { SuccessionPositionRepository, SuccessorRepository } from '../repositories/SuccessionRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class SuccessionService {
  private positionRepo: SuccessionPositionRepository;
  private successorRepo: SuccessorRepository;
  private auditService: AuditService;

  constructor() {
    this.positionRepo = new SuccessionPositionRepository();
    this.successorRepo = new SuccessorRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create succession position
   */
  async createPosition(ctx: TenantContext, input: {
    positionTitle: string;
    critical?: boolean;
    numSuccessors?: number;
  }) {
    const position = await this.positionRepo.create(ctx, {
      uuid: uuidv4(),
      position_title: input.positionTitle,
      critical: input.critical || false,
      num_successors: input.numSuccessors || 1,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SUCCESSION_POSITION',
      entityId: position.id,
      afterState: { positionTitle: input.positionTitle },
    });

    return position;
  }

  /**
   * Add successor for position
   */
  async addSuccessor(ctx: TenantContext, input: {
    positionId: number;
    employeeId: number;
    readinessLevel?: string;
  }) {
    const position = await this.positionRepo.getById(ctx, input.positionId);
    if (!position) {
      throw new NotFoundError('Succession position not found');
    }

    const successor = await this.successorRepo.create(ctx, {
      uuid: uuidv4(),
      position_id: input.positionId,
      employee_id: input.employeeId,
      readiness_level: input.readinessLevel || 'not_ready',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SUCCESSOR',
      entityId: successor.id,
      afterState: { readinessLevel: input.readinessLevel },
    });

    return successor;
  }

  /**
   * Get position
   */
  async getPosition(ctx: TenantContext, positionId: number) {
    const position = await this.positionRepo.getById(ctx, positionId);
    if (!position) {
      throw new NotFoundError('Succession position not found');
    }
    return position;
  }

  /**
   * Get position with successors
   */
  async getPositionWithSuccessors(ctx: TenantContext, positionId: number) {
    const position = await this.getPosition(ctx, positionId);
    const successors = await this.successorRepo.getForPosition(ctx, positionId);

    return {
      ...position,
      successors: successors.items,
    };
  }

  /**
   * Get ready successors for position
   */
  async getReadySuccessors(ctx: TenantContext, positionId: number) {
    return this.successorRepo.getReadySuccessors(ctx, positionId);
  }

  /**
   * Get high potential successors for position
   */
  async getHighPotentialSuccessors(ctx: TenantContext, positionId: number) {
    return this.successorRepo.getHighPotentialSuccessors(ctx, positionId);
  }

  /**
   * Get critical positions
   */
  async getCriticalPositions(ctx: TenantContext, options?: ListQueryOptions) {
    return this.positionRepo.getCriticalPositions(ctx, options);
  }

  /**
   * Get positions for employee
   */
  async getPositionsForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.successorRepo.getPositionsForEmployee(ctx, employeeId, options);
  }

  /**
   * Update successor readiness
   */
  async updateSuccessorReadiness(ctx: TenantContext, successorId: number, readinessLevel: string) {
    const successor = await this.successorRepo.getById(ctx, successorId);
    if (!successor) {
      throw new NotFoundError('Successor not found');
    }

    return this.successorRepo.update(ctx, successorId, { readiness_level: readinessLevel as any });
  }

  /**
   * Get all positions
   */
  async getAllPositions(ctx: TenantContext, options?: ListQueryOptions) {
    return this.positionRepo.list(ctx, options);
  }
}
