import { v4 as uuidv4 } from 'uuid';
import { RecognitionRepository, RewardPointsRepository } from '../repositories/RecognitionRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class RecognitionService {
  private recognitionRepo: RecognitionRepository;
  private rewardRepo: RewardPointsRepository;
  private auditService: AuditService;

  constructor() {
    this.recognitionRepo = new RecognitionRepository();
    this.rewardRepo = new RewardPointsRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create recognition
   */
  async recognize(ctx: TenantContext, input: {
    recognizedBy: number;
    employeeId: number;
    recognitionType: string;
    pointsAwarded?: number;
    message?: string;
  }) {
    const recognition = await this.recognitionRepo.create(ctx, {
      uuid: uuidv4(),
      recognized_by: input.recognizedBy,
      employee_id: input.employeeId,
      recognition_type: input.recognitionType,
      points_awarded: input.pointsAwarded || 0,
      message: input.message || null,
    } as any);

    // Update reward points
    if (input.pointsAwarded && input.pointsAwarded > 0) {
      await this.rewardRepo.updateBalance(ctx, input.employeeId, input.pointsAwarded);
    }

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'RECOGNITION',
      entityId: recognition.id,
      afterState: { recognitionType: input.recognitionType, pointsAwarded: input.pointsAwarded },
    });

    return recognition;
  }

  /**
   * Get recognitions for employee
   */
  async getEmployeeRecognitions(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.recognitionRepo.getForEmployee(ctx, employeeId, options);
  }

  /**
   * Get total points for employee
   */
  async getTotalPoints(ctx: TenantContext, employeeId: number): Promise<number> {
    return this.recognitionRepo.getTotalPoints(ctx, employeeId);
  }

  /**
   * Get reward points for employee
   */
  async getRewardPoints(ctx: TenantContext, employeeId: number) {
    const points = await this.rewardRepo.getForEmployee(ctx, employeeId);
    if (!points) {
      // Create if doesn't exist
      return this.rewardRepo.create(ctx, {
        uuid: uuidv4(),
        employee_id: employeeId,
        points_balance: 0,
      } as any);
    }
    return points;
  }

  /**
   * Redeem reward points
   */
  async redeemPoints(ctx: TenantContext, employeeId: number, pointsToRedeem: number) {
    const points = await this.getRewardPoints(ctx, employeeId);

    if (points.points_balance < pointsToRedeem) {
      throw new NotFoundError('Insufficient reward points');
    }

    const updated = await this.rewardRepo.updateBalance(ctx, employeeId, -pointsToRedeem);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'REWARD_POINTS',
      entityId: updated.id,
      details: { pointsRedeemed: pointsToRedeem },
    });

    return updated;
  }

  /**
   * Get recognitions by type
   */
  async getRecognitionsByType(ctx: TenantContext, type: string, options?: ListQueryOptions) {
    return this.recognitionRepo.getByType(ctx, type, options);
  }

  /**
   * Get recognitions given by user
   */
  async getRecognitionsGivenBy(ctx: TenantContext, userId: number, options?: ListQueryOptions) {
    return this.recognitionRepo.getByRecognizer(ctx, userId, options);
  }

  /**
   * Get leaderboard (top employees by reward points)
   */
  async getLeaderboard(ctx: TenantContext, limit: number = 10): Promise<any[]> {
    const allRecognitions = await this.recognitionRepo.list(ctx, {
      pageSize: 1000, // Get all for aggregation
    });

    // Group by employee and sum points
    const leaderboard: Record<number, { employeeId: number; totalPoints: number }> = {};
    for (const recognition of allRecognitions.items) {
      if (!leaderboard[recognition.employee_id]) {
        leaderboard[recognition.employee_id] = {
          employeeId: recognition.employee_id,
          totalPoints: 0,
        };
      }
      leaderboard[recognition.employee_id].totalPoints += recognition.points_awarded;
    }

    // Sort and limit
    return Object.values(leaderboard).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
  }
}
