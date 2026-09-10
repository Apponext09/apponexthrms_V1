import { v4 as uuidv4 } from 'uuid';
import { KPITemplateRepository, EmployeeKPIRepository } from '../repositories/KPIRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class KPIService {
  private kpiTemplateRepo: KPITemplateRepository;
  private employeeKpiRepo: EmployeeKPIRepository;
  private auditService: AuditService;

  constructor() {
    this.kpiTemplateRepo = new KPITemplateRepository();
    this.employeeKpiRepo = new EmployeeKPIRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create KPI template
   */
  async createTemplate(ctx: TenantContext, input: {
    name: string;
    description?: string;
    measurementType: string;
    targetValue: number;
    roleBased?: boolean;
    departmentBased?: boolean;
  }) {
    const template = await this.kpiTemplateRepo.create(ctx, {
      uuid: uuidv4(),
      name: input.name,
      description: input.description || null,
      measurement_type: input.measurementType,
      target_value: input.targetValue,
      role_based: input.roleBased || false,
      department_based: input.departmentBased || false,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'KPI_TEMPLATE',
      entityId: template.id,
      afterState: { name: input.name },
    });

    return template;
  }

  /**
   * Assign KPI to employee
   */
  async assignKPI(ctx: TenantContext, input: {
    employeeId: number;
    kpiTemplateId: number;
    targetValue: number;
  }) {
    const template = await this.kpiTemplateRepo.getById(ctx, input.kpiTemplateId);
    if (!template) {
      throw new NotFoundError('KPI template not found');
    }

    const kpi = await this.employeeKpiRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      kpi_template_id: input.kpiTemplateId,
      target_value: input.targetValue,
      actual_value: 0,
      achievement_percentage: 0,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'EMPLOYEE_KPI',
      entityId: kpi.id,
      afterState: { employeeId: input.employeeId, targetValue: input.targetValue },
    });

    return kpi;
  }

  /**
   * Update KPI actual value and recalculate achievement
   */
  async updateActualValue(ctx: TenantContext, kpiId: number, actualValue: number) {
    const kpi = await this.employeeKpiRepo.getById(ctx, kpiId);
    if (!kpi) {
      throw new NotFoundError('Employee KPI not found');
    }

    return this.employeeKpiRepo.updateAchievement(ctx, kpiId, actualValue, kpi.target_value);
  }

  /**
   * Get employee KPIs
   */
  async getEmployeeKPIs(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.employeeKpiRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Calculate KPI achievement for employee
   */
  async calculateEmployeeAchievement(ctx: TenantContext, employeeId: number): Promise<number> {
    const kpis = await this.getEmployeeKPIs(ctx, employeeId);
    if (kpis.items.length === 0) return 0;

    const totalAchievement = kpis.items.reduce((sum, kpi) => sum + kpi.achievement_percentage, 0);
    return totalAchievement / kpis.items.length;
  }

  /**
   * Get KPI template
   */
  async getTemplate(ctx: TenantContext, templateId: number) {
    const template = await this.kpiTemplateRepo.getById(ctx, templateId);
    if (!template) {
      throw new NotFoundError('KPI template not found');
    }
    return template;
  }

  /**
   * List KPI templates
   */
  async listTemplates(ctx: TenantContext, options?: ListQueryOptions) {
    return this.kpiTemplateRepo.list(ctx, options);
  }

  /**
   * Delete KPI template
   */
  async deleteTemplate(ctx: TenantContext, templateId: number) {
    await this.getTemplate(ctx, templateId);
    await this.kpiTemplateRepo.delete(ctx, templateId);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'KPI_TEMPLATE',
      entityId: templateId,
    });
  }
}
