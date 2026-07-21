import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { EmployeeService } from '../services/EmployeeService';
import { employeeCreateSchema, employeeUpdateSchema } from '@apponexthrms/shared';
import { logger } from '../../../common/lib/logger';

export class EmployeeController {
  private service: EmployeeService;

  constructor() {
    this.service = new EmployeeService();
  }

  /**
   * Create employee
   */
  createEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, employeeCreateSchema);

    const employee = await this.service.createEmployee(ctx, {
      employeeCode: validated.employeeCode,
      firstName: validated.firstName,
      lastName: validated.lastName,
      middleName: validated.middleName,
      email: validated.email,
      phone: validated.phone,
      mobile: validated.mobile,
      dateOfBirth: validated.dateOfBirth,
      gender: validated.gender,
      dateOfJoining: validated.dateOfJoining,
      employmentType: validated.employmentType,
      designationId: validated.designationId,
      departmentId: validated.departmentId,
      branchId: validated.branchId,
      locationId: validated.locationId,
      reportingManagerId: validated.reportingManagerId,
      costCenterId: validated.costCenterId,
    });

    res.status(201).json({
      success: true,
      data: employee,
    });
  });

  /**
   * Get employee by ID
   */
  getEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const employee = await this.service.getEmployee(ctx, parseInt(id, 10));

    res.json({
      success: true,
      data: employee,
    });
  });

  /**
   * List employees
   */
  listEmployees = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    logger.debug('listEmployees called', {
      organizationId: ctx.organizationId,
      page,
      pageSize,
      sortBy,
      sortOrder,
      search: search ? 'present' : 'absent',
    });

    const result = await this.service.listEmployees(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  });

  /**
   * Update employee
   */
  updateEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, employeeUpdateSchema);

    const employee = await this.service.updateEmployee(ctx, parseInt(id, 10), validated as any);

    res.json({
      success: true,
      data: employee,
    });
  });

  /**
   * Delete employee
   */
  deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.service.deleteEmployee(ctx, parseInt(id, 10));

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  });

  /**
   * Get direct reports for a manager
   */
  getDirectReports = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getDirectReports(ctx, parseInt(id, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  });
}

export const employeeController = new EmployeeController();
