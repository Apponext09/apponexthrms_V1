import { logger } from '@/common/lib/logger';
import { initializeWorkflowHooks, registerWorkflowCompletionHandlers } from './integrations/workflowHooks';
import { initializeNotificationHooks, registerGoalApprovedNotification, registerReviewSubmittedNotification, registerAppraisalSubmittedNotification } from './integrations/notificationHooks';
import { initializePayrollHooks } from './integrations/payrollHooks';
import { initializeRecruitmentHooks } from './integrations/recruitmentHooks';

// Export all service classes
export { GoalService } from './services/GoalService';
export { OKRService } from './services/OKRService';
export { KPIService } from './services/KPIService';
export { ReviewService } from './services/ReviewService';
export { FeedbackService } from './services/FeedbackService';
export { AppraisalService } from './services/AppraisalService';
export { CompetencyService } from './services/CompetencyService';
export { PIPService } from './services/PIPService';
export { SuccessionService } from './services/SuccessionService';
export { RecognitionService } from './services/RecognitionService';
export { AnalyticsService } from './services/AnalyticsService';

// Export all controllers
export { goalController } from './controllers/GoalController';
export { okrController } from './controllers/OKRController';
export { reviewController } from './controllers/ReviewController';
export { feedbackController } from './controllers/FeedbackController';
export { appraisalController } from './controllers/AppraisalController';
export { competencyController } from './controllers/CompetencyController';
export { pipController } from './controllers/PIPController';
export { successionController } from './controllers/SuccessionController';
export { recognitionController } from './controllers/RecognitionController';
export { analyticsController } from './controllers/AnalyticsController';

// Export route mounting function
export { mountPerformanceRoutes } from './performance.routes';

// Export permissions
export * from './performance.permissions';

// Export integration hooks
export { initializeWorkflowHooks, registerWorkflowCompletionHandlers } from './integrations/workflowHooks';
export { initializeNotificationHooks } from './integrations/notificationHooks';
export { initializePayrollHooks } from './integrations/payrollHooks';
export { initializeRecruitmentHooks } from './integrations/recruitmentHooks';

/**
 * Performance Module Bootstrap
 * Initializes all services, hooks, and integrations
 *
 * This function should be called during application startup
 * after all dependent modules are initialized
 */
export async function bootstrapPerformanceModule(): Promise<void> {
  logger.info('Bootstrapping Performance Management Module');

  try {
    // Initialize all integration hooks
    // Note: These require dependent services to be available
    logger.info('Initializing performance integrations...');

    // Get service instances (from DI container or create new ones)
    // These should be injected from a DI container in production
    const mockWorkflowService = {}; // Placeholder - inject from DI container
    const mockNotificationService = {}; // Placeholder - inject from DI container

    // Initialize workflow hooks
    initializeWorkflowHooks(mockWorkflowService as any);
    registerWorkflowCompletionHandlers(mockWorkflowService as any);

    // Initialize notification hooks
    initializeNotificationHooks(mockNotificationService as any);
    registerGoalApprovedNotification(mockNotificationService as any);
    registerReviewSubmittedNotification(mockNotificationService as any);
    registerAppraisalSubmittedNotification(mockNotificationService as any);

    // Initialize payroll hooks
    initializePayrollHooks();

    // Initialize recruitment hooks
    initializeRecruitmentHooks();

    logger.info('Performance Management Module bootstrapped successfully');
  } catch (error) {
    logger.error('Error bootstrapping Performance Management Module:', error);
    throw error;
  }
}

/**
 * Service Container
 * Centralized access to performance management services
 */
export class PerformanceServiceContainer {
  private static instance: PerformanceServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceServiceContainer {
    if (!PerformanceServiceContainer.instance) {
      PerformanceServiceContainer.instance = new PerformanceServiceContainer();
    }
    return PerformanceServiceContainer.instance;
  }

  /**
   * Register a service
   */
  registerService(name: string, service: any): void {
    if (this.services.has(name)) {
      logger.warn(`Service ${name} already registered, overwriting`);
    }
    this.services.set(name, service);
  }

  /**
   * Get a service
   */
  getService(name: string): any {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in container`);
    }
    return service;
  }

  /**
   * Get all services
   */
  getAllServices(): Map<string, any> {
    return new Map(this.services);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
  }
}

/**
 * Initialize dependency injection container
 * This should be called with actual service instances from your DI framework
 */
export function initializePerformanceServiceContainer(
  services: Record<string, any>
): PerformanceServiceContainer {
  const container = PerformanceServiceContainer.getInstance();

  for (const [name, service] of Object.entries(services)) {
    container.registerService(name, service);
  }

  logger.info('Performance service container initialized with', Object.keys(services).length, 'services');
  return container;
}

/**
 * Module startup hook
 * Called when module is loaded
 */
export async function onModuleLoad(): Promise<void> {
  logger.info('Performance module loading...');

  try {
    // Bootstrap module after all dependencies are available
    // This is typically called from main app initialization
    logger.info('Performance module loaded successfully');
  } catch (error) {
    logger.error('Error loading performance module:', error);
    throw error;
  }
}

/**
 * Module shutdown hook
 * Called when module is being unloaded
 */
export async function onModuleShutdown(): Promise<void> {
  logger.info('Performance module shutting down...');

  try {
    const container = PerformanceServiceContainer.getInstance();
    container.clear();

    logger.info('Performance module shut down successfully');
  } catch (error) {
    logger.error('Error shutting down performance module:', error);
    throw error;
  }
}


