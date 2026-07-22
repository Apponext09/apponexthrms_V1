import { v4 as uuidv4 } from 'uuid';
import { SalaryStructureRepository } from '../repositories/SalaryStructureRepository';
import { SalaryStructureComponentRepository } from '../repositories/SalaryStructureComponentRepository';
import { EmployeeSalaryStructureRepository } from '../repositories/EmployeeSalaryStructureRepository';
import { SalaryComponentRepository } from '../repositories/SalaryComponentRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';

interface CreateStructureInput {
  structureName: string;
  structureCode: string;
  description?: string;
  applicableToDesignationId?: number;
  applicableToLocationId?: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

interface AssignStructureInput {
  employeeId: number;
  structureId: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export class SalaryStructureService {
  private structureRepo: SalaryStructureRepository;
  private componentRepo: SalaryStructureComponentRepository;
  private employeeStructureRepo: EmployeeSalaryStructureRepository;
  private salaryComponentRepo: SalaryComponentRepository;
  private auditService: AuditService;

  constructor() {
    this.structureRepo = new SalaryStructureRepository();
    this.componentRepo = new SalaryStructureComponentRepository();
    this.employeeStructureRepo = new EmployeeSalaryStructureRepository();
    this.salaryComponentRepo = new SalaryComponentRepository();
    this.auditService = new AuditService();
  }

  async createStructure(ctx: TenantContext, input: CreateStructureInput) {
    const existing = await this.structureRepo.getByCode(ctx, input.structureCode);
    if (existing) {
      throw new ValidationError(`Structure code ${input.structureCode} already exists`);
    }

    const structure = await this.structureRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      structure_name: input.structureName,
      structure_code: input.structureCode,
      description: input.description,
      applicable_to_designation_id: input.applicableToDesignationId,
      applicable_to_location_id: input.applicableToLocationId,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo,
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SALARY_STRUCTURE',
      entityId: structure.id,
      afterState: { structure }
    });

    return structure;
  }

  async addComponentToStructure(ctx: TenantContext, structureId: number, componentId: number, sortOrder: number) {
    const structure = await this.structureRepo.getById(ctx, structureId);
    if (!structure) throw new NotFoundError('Salary structure not found');

    const component = await this.salaryComponentRepo.getById(ctx, componentId);
    if (!component) throw new NotFoundError('Salary component not found');

    const scComponent = await this.componentRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      structure_id: structureId,
      component_id: componentId,
      sort_order: sortOrder,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    return scComponent;
  }

  async assignStructureToEmployee(ctx: TenantContext, input: AssignStructureInput) {
    const structure = await this.structureRepo.getById(ctx, input.structureId);
    if (!structure) throw new NotFoundError('Salary structure not found');

    // Deactivate previous assignments using standard updateWhere helper
    await this.employeeStructureRepo.updateWhere(
      ctx,
      { employee_id: input.employeeId, is_current: true },
      { is_current: false } as any
    );

    const assignment = await this.employeeStructureRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      salary_structure_id: input.structureId,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo,
      is_current: true,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    return assignment;
  }

  async getEmployeeSalaryStructure(ctx: TenantContext, employeeId: number, date: string) {
    return this.employeeStructureRepo.getCurrent(ctx, employeeId, date);
  }

  async calculateCTC(ctx: TenantContext, structureId: number): Promise<number> {
    const components = await this.componentRepo.getForStructure(ctx, structureId);

    let ctc = 0;
    for (const comp of components) {
      const component = await this.salaryComponentRepo.getById(ctx, comp.component_id);
      if (component && component.component_type === 'earnings') {
        ctc += component.percentage_of_basic || 0;
      }
    }

    return ctc;
  }

  async listStructures(ctx: TenantContext) {
    return this.structureRepo.listActive(ctx);
  }

  async getStructure(ctx: TenantContext, structureId: number) {
    return this.structureRepo.getById(ctx, structureId);
  }

  async getStructureComponents(ctx: TenantContext, structureId: number) {
    const components = await this.componentRepo.getForStructure(ctx, structureId);
    const result = [];
    for (const comp of components) {
      const component = await this.salaryComponentRepo.getById(ctx, comp.component_id);
      if (component) {
        result.push({ ...comp, component });
      }
    }
    return result;
  }
}

