import { logger } from '@/common/lib/logger';
import { subscribeEvent } from '../../../realtime/eventBus';
import type { TenantContext } from '../../../db/types';

/**
 * Performance Management System - Payroll Integration Hooks
 * Integrates performance ratings and achievements with payroll calculations
 */

interface AppraisalRating {
  appraisalId: number;
  employeeId: number;
  rating: number;
  ratingLabel: string;
  cycleId: number;
}

interface SalaryIncrementRecommendation {
  employeeId: number;
  currentSalary: number;
  incrementPercentage: number;
  incrementAmount: number;
  effectiveDate: string;
  reason: string;
}

interface KPIAchievementData {
  employeeId: number;
  kpiId: number;
  achievementPercentage: number;
  targetBonus: number;
  variablePayPercentage: number;
}

/**
 * Initialize payroll hooks
 * Register all payroll integration listeners
 */
export function initializePayrollHooks(): void {
  logger.info('Initializing performance payroll integration hooks');

  registerAppraisalRatingBonusHook();
  registerSalaryIncrementHook();
  registerVariablePayHook();
  registerPayrollAdjustmentHook();

  logger.info('Performance payroll integration hooks initialized successfully');
}

/**
 * Hook: Calculate Performance Bonus Based on Appraisal Rating
 * Maps appraisal ratings to bonus percentages and creates payroll adjustments
 */
function registerAppraisalRatingBonusHook(): void {
  subscribeEvent<{ ctx: TenantContext } & AppraisalRating>(
    'performance.appraisal_approved',
    async (event) => {
      try {
        const { ctx, appraisalId, employeeId, rating, ratingLabel } = event;

        logger.info(`Calculating performance bonus for employee ${employeeId} with rating ${ratingLabel}`);

        // Determine bonus percentage based on rating
        const bonusPercentageMap: Record<string, number> = {
          'exceeds_expectations': 15,
          'meets_expectations': 10,
          'needs_improvement': 0,
          'outstanding': 20,
          'excellent': 17,
          'good': 12,
          'satisfactory': 8,
          'unsatisfactory': 0,
        };

        const bonusPercentage = bonusPercentageMap[ratingLabel] || 0;

        if (bonusPercentage > 0) {
          logger.info(`Performance bonus calculated: ${bonusPercentage}% for employee ${employeeId}`);

          // Publish event to trigger payroll adjustment
          subscribeEvent<{ ctx: TenantContext }>(
            'performance.bonus_calculated',
            async (bonusEvent) => {
              try {
                logger.info(`Creating payroll adjustment for performance bonus for employee ${employeeId}`);

                // This would be handled by payroll service
                // Publishing to eventBus for payroll module to subscribe to
              } catch (error) {
                logger.error('Error creating payroll adjustment:', error);
              }
            }
          );

          // Trigger bonus calculation
          const bonusCalculation = {
            appraisalId,
            employeeId,
            rating,
            bonusPercentage,
            timestamp: new Date().toISOString(),
          };

          logger.debug('Performance bonus calculation:', bonusCalculation);
        }
      } catch (error) {
        logger.error('Error calculating performance bonus:', error);
      }
    }
  );
}

/**
 * Hook: Generate Salary Increment Recommendations
 * Creates salary increment recommendations based on performance ratings
 */
function registerSalaryIncrementHook(): void {
  subscribeEvent<{ ctx: TenantContext; employeeId: number; rating: number; ratingLabel: string; currentSalary: number }>(
    'performance.appraisal_approved',
    async (event) => {
      try {
        const { ctx, employeeId, rating, ratingLabel, currentSalary } = event;

        logger.info(`Generating salary increment recommendation for employee ${employeeId}`);

        // Determine increment percentage based on rating
        const incrementPercentageMap: Record<string, number> = {
          'exceeds_expectations': 8,
          'meets_expectations': 5,
          'needs_improvement': 0,
          'outstanding': 10,
          'excellent': 8,
          'good': 6,
          'satisfactory': 3,
          'unsatisfactory': 0,
        };

        const incrementPercentage = incrementPercentageMap[ratingLabel] || 0;

        if (incrementPercentage > 0) {
          const incrementAmount = (currentSalary * incrementPercentage) / 100;

          const recommendation: SalaryIncrementRecommendation = {
            employeeId,
            currentSalary,
            incrementPercentage,
            incrementAmount,
            effectiveDate: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0], // April 1st
            reason: `Performance-based increment: ${ratingLabel}`,
          };

          logger.info(`Salary increment recommendation generated:`, recommendation);

          // Publish salary increment recommendation event
          subscribeEvent<{ ctx: TenantContext }>(
            'performance.salary_increment_recommended',
            async (incrementEvent) => {
              try {
                logger.info(`Processing salary increment recommendation for employee ${employeeId}`);
                // Payroll module will subscribe to this event
              } catch (error) {
                logger.error('Error processing salary increment:', error);
              }
            }
          );
        }
      } catch (error) {
        logger.error('Error generating salary increment recommendation:', error);
      }
    }
  );
}

/**
 * Hook: Generate Variable Pay Recommendations Based on KPI Achievement
 * Creates variable pay recommendations based on OKR/KPI achievement percentages
 */
function registerVariablePayHook(): void {
  subscribeEvent<{ ctx: TenantContext } & KPIAchievementData>(
    'performance.kpi_achievement_recorded',
    async (event) => {
      try {
        const { ctx, employeeId, kpiId, achievementPercentage, targetBonus, variablePayPercentage } = event;

        logger.info(`Calculating variable pay for employee ${employeeId} with KPI achievement ${achievementPercentage}%`);

        // Calculate actual variable pay based on achievement
        let variablePayAmount = 0;

        if (achievementPercentage >= 100) {
          variablePayAmount = targetBonus * (variablePayPercentage / 100);
        } else if (achievementPercentage >= 80) {
          variablePayAmount = targetBonus * ((achievementPercentage / 100) * (variablePayPercentage / 100));
        } else if (achievementPercentage >= 60) {
          variablePayAmount = targetBonus * 0.5 * (variablePayPercentage / 100);
        }
        // Below 60%, no variable pay

        const variablePayRecommendation = {
          employeeId,
          kpiId,
          achievementPercentage,
          targetBonus,
          variablePayPercentage,
          actualVariablePayAmount: variablePayAmount,
          timestamp: new Date().toISOString(),
        };

        logger.info(`Variable pay calculated:`, variablePayRecommendation);

        if (variablePayAmount > 0) {
          // Publish variable pay recommendation event
          subscribeEvent<{ ctx: TenantContext }>(
            'performance.variable_pay_recommended',
            async (variablePayEvent) => {
              try {
                logger.info(`Processing variable pay recommendation for employee ${employeeId}`);
                // Payroll module will subscribe to this event
              } catch (error) {
                logger.error('Error processing variable pay:', error);
              }
            }
          );
        }
      } catch (error) {
        logger.error('Error calculating variable pay:', error);
      }
    }
  );
}

/**
 * Hook: Trigger Payroll Adjustment for Performance-Based Compensation
 * Creates payroll adjustments when salary increments or bonuses are approved
 */
function registerPayrollAdjustmentHook(): void {
  // Salary increment approval
  subscribeEvent<{ ctx: TenantContext; employeeId: number; incrementPercentage: number; effectiveDate: string }>(
    'performance.salary_increment_approved',
    async (event) => {
      try {
        const { ctx, employeeId, incrementPercentage, effectiveDate } = event;

        logger.info(`Creating payroll adjustment for salary increment for employee ${employeeId}`);

        const payrollAdjustment = {
          employeeId,
          adjustmentType: 'SALARY_INCREMENT',
          adjustmentPercentage: incrementPercentage,
          effectiveDate,
          reason: 'Performance-based salary increment approval',
          status: 'pending_processing',
          timestamp: new Date().toISOString(),
        };

        logger.info(`Payroll adjustment created:`, payrollAdjustment);

        // Publish payroll adjustment event
        subscribeEvent<{ ctx: TenantContext }>(
          'payroll.adjustment_required',
          async (adjustmentEvent) => {
            try {
              logger.info(`Processing payroll adjustment for employee ${employeeId}`);
              // Payroll service will process this adjustment
            } catch (error) {
              logger.error('Error processing payroll adjustment:', error);
            }
          }
        );
      } catch (error) {
        logger.error('Error creating payroll adjustment:', error);
      }
    }
  );

  // Performance bonus approval
  subscribeEvent<{ ctx: TenantContext; employeeId: number; bonusAmount: number; description: string }>(
    'performance.bonus_approved',
    async (event) => {
      try {
        const { ctx, employeeId, bonusAmount, description } = event;

        logger.info(`Creating payroll adjustment for performance bonus for employee ${employeeId}`);

        const payrollAdjustment = {
          employeeId,
          adjustmentType: 'PERFORMANCE_BONUS',
          adjustmentAmount: bonusAmount,
          reason: description,
          status: 'pending_processing',
          timestamp: new Date().toISOString(),
        };

        logger.info(`Performance bonus payroll adjustment created:`, payrollAdjustment);

        // Publish payroll adjustment event
        subscribeEvent<{ ctx: TenantContext }>(
          'payroll.adjustment_required',
          async (adjustmentEvent) => {
            try {
              logger.info(`Processing performance bonus payroll adjustment for employee ${employeeId}`);
            } catch (error) {
              logger.error('Error processing bonus payroll adjustment:', error);
            }
          }
        );
      } catch (error) {
        logger.error('Error creating bonus payroll adjustment:', error);
      }
    }
  );
}

/**
 * Helper: Get salary for employee (to be called from payroll service)
 */
export async function getSalaryForBonus(ctx: TenantContext, employeeId: number): Promise<number> {
  // This would query the salary structure from payroll module
  logger.info(`Fetching salary for employee ${employeeId}`);
  return 0; // Placeholder
}

/**
 * Helper: Calculate bonus based on achievement percentage
 */
export function calculateBonusFromAchievement(salary: number, achievementPercentage: number, targetBonusPercentage: number): number {
  const baseBonus = (salary * targetBonusPercentage) / 100;
  const achievedBonus = (baseBonus * achievementPercentage) / 100;
  return Math.max(0, achievedBonus);
}


