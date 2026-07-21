import { v4 as uuidv4 } from 'uuid';
import {
  CompetencyFrameworkRepository,
  CompetencyRepository,
  EmployeeCompetencyRepository,
} from '../repositories/CompetencyRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class CompetencyService {
  private frameworkRepo: CompetencyFrameworkRepository;
  private competencyRepo: CompetencyRepository;
  private employeeCompetencyRepo: EmployeeCompetencyRepository;
  private auditService: AuditService;

  constructor() {
    this.frameworkRepo = new CompetencyFrameworkRepository();
    this.competencyRepo = new CompetencyRepository();
    this.employeeCompetencyRepo = new EmployeeCompetencyRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create competency framework
   */
  async createFramework(ctx: TenantContext, input: {
    name: string;
    description?: string;
  }) {
    const framework = await this.frameworkRepo.create(ctx, {
      uuid: uuidv4(),
      name: input.name,
      description: input.description || null,
      status: 'active',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'COMPETENCY_FRAMEWORK',
      entityId: framework.id,
      afterState: { name: input.name },
    });

    return framework;
  }

  /**
   * Create competency within framework
   */
  async createCompetency(ctx: TenantContext, input: {
    frameworkId: number;
    name: string;
    description?: string;
    proficiencyLevels?: string[];
  }) {
    const framework = await this.frameworkRepo.getById(ctx, input.frameworkId);
    if (!framework) {
      throw new NotFoundError('Competency framework not found');
    }

    const competency = await this.competencyRepo.create(ctx, {
      uuid: uuidv4(),
      framework_id: input.frameworkId,
      name: input.name,
      description: input.description || null,
      proficiency_levels: input.proficiencyLevels || null,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'COMPETENCY',
      entityId: competency.id,
      afterState: { name: input.name },
    });

    return competency;
  }

  /**
   * Assess employee competency
   */
  async assessCompetency(ctx: TenantContext, input: {
    employeeId: number;
    competencyId: number;
    currentLevel: number;
    targetLevel?: number;
  }) {
    const competency = await this.competencyRepo.getById(ctx, input.competencyId);
    if (!competency) {
      throw new NotFoundError('Competency not found');
    }

    const assessment = await this.employeeCompetencyRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      competency_id: input.competencyId,
      current_level: input.currentLevel,
      target_level: input.targetLevel || null,
      gap_analysis: input.targetLevel ? `Gap: ${input.targetLevel - input.currentLevel}` : null,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'EMPLOYEE_COMPETENCY',
      entityId: assessment.id,
      afterState: { currentLevel: input.currentLevel },
    });

    return assessment;
  }

  /**
   * Get employee competencies
   */
  async getEmployeeCompetencies(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.employeeCompetencyRepo.getForEmployee(ctx, employeeId, options);
  }

  /**
   * Get competencies with gaps for employee
   */
  async getCompetencyGaps(ctx: TenantContext, employeeId: number) {
    return this.employeeCompetencyRepo.getWithGaps(ctx, employeeId);
  }

  /**
   * Get framework
   */
  async getFramework(ctx: TenantContext, frameworkId: number) {
    const framework = await this.frameworkRepo.getById(ctx, frameworkId);
    if (!framework) {
      throw new NotFoundError('Competency framework not found');
    }
    return framework;
  }

  /**
   * Get framework with competencies
   */
  async getFrameworkWithCompetencies(ctx: TenantContext, frameworkId: number) {
    const framework = await this.getFramework(ctx, frameworkId);
    const competencies = await this.competencyRepo.getByFramework(ctx, frameworkId);

    return {
      ...framework,
      competencies: competencies.items,
    };
  }

  /**
   * Update employee competency
   */
  async updateCompetency(ctx: TenantContext, id: number, input: any) {
    const competency = await this.employeeCompetencyRepo.getById(ctx, id);
    if (!competency) {
      throw new NotFoundError('Employee competency not found');
    }

    const updated = await this.employeeCompetencyRepo.update(ctx, id, input);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'EMPLOYEE_COMPETENCY',
      entityId: id,
      beforeState: competency,
      afterState: updated,
    });

    return updated;
  }

  /**
   * List frameworks
   */
  async listFrameworks(ctx: TenantContext, options?: ListQueryOptions) {
    return this.frameworkRepo.getActive(ctx, options);
  }
}
