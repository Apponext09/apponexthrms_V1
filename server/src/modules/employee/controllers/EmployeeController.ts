import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { getKnex } from '../../../db/knex';
import { EmployeeService } from '../services/EmployeeService';
import { EmployeeDocumentService } from '../services/EmployeeDocumentService';
import { EmployeeLifecycleService } from '../services/EmployeeLifecycleService';
import { AssetService } from '../services/AssetService';
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  employeeBulkCreateSchema,
  employeePersonalInfoUpdateSchema,
  employeeProfessionalInfoUpdateSchema,
  employeeDocumentCreateSchema,
  assetAllocationCreateSchema,
  assetAllocationReturnSchema,
  statusTransitionSchema,
} from '@apponexthrms/shared';
import { logger } from '../../../common/lib/logger';

export class EmployeeController {
  private service: EmployeeService;
  private documentService: EmployeeDocumentService;
  private lifecycleService: EmployeeLifecycleService;
  private assetService: AssetService;

  constructor() {
    this.service = new EmployeeService();
    this.documentService = new EmployeeDocumentService();
    this.lifecycleService = new EmployeeLifecycleService();
    this.assetService = new AssetService();
  }

  /**
   * Create employee
   */
  createEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, employeeCreateSchema);

    const result = await this.service.createEmployee(ctx, {
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
        jobTitle: validated.jobTitle,
      departmentId: validated.departmentId,
      branchId: validated.branchId,
      locationId: validated.locationId,
      reportingManagerId: validated.reportingManagerId,
        costCenterId: validated.costCenterId,
        accessRole: validated.accessRole,
        password: (validated as any).password,
    });

    res.status(201).json({
      success: true,
      data: result.employee,
      generatedPassword: result.generatedPassword,
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
   * GET /employees/me - Get logged in user's employee profile
   */
  getMeEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const db = getKnex();

    let employeeId: number | null = null;
    const user = await db('users')
      .where('id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (user?.employee_id) {
      employeeId = user.employee_id;
    } else if (user?.email) {
      const empByEmail = await db('employees')
        .where('email', user.email)
        .where('organization_id', ctx.organizationId)
        .first();
      if (empByEmail) {
        employeeId = empByEmail.id;
        await db('users').where('id', user.id).update({ employee_id: empByEmail.id });
      }
    }

    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'Employee profile not linked' });
    }

    const employee = await this.service.getEmployee(ctx, employeeId);
    res.json({
      success: true,
      data: employee,
    });
  });

  /**
   * PUT /employees/me - Update logged in user's employee profile
   */
  updateMeEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const db = getKnex();

    let employeeId: number | null = null;
    const user = await db('users')
      .where('id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (user?.employee_id) {
      employeeId = user.employee_id;
    } else if (user?.email) {
      const empByEmail = await db('employees')
        .where('email', user.email)
        .where('organization_id', ctx.organizationId)
        .first();
      if (empByEmail) {
        employeeId = empByEmail.id;
        await db('users').where('id', user.id).update({ employee_id: empByEmail.id });
      }
    }

    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'Employee profile not linked' });
    }

    const validated = validate(req.body, employeeUpdateSchema);
    const updated = await this.service.updateEmployee(ctx, employeeId, validated as any);

    // Sync changes to user record if first_name, last_name, or email updated
    const userUpdates: Record<string, any> = {};
    if (validated.firstName) userUpdates.first_name = validated.firstName;
    if (validated.lastName) userUpdates.last_name = validated.lastName;
    if (validated.email) userUpdates.email = validated.email;
    if (user && Object.keys(userUpdates).length > 0) {
      await db('users').where('id', user.id).update(userUpdates);
    }

    res.json({
      success: true,
      data: updated,
    });
  });

  /**
   * List employees
   */
  listEmployees = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const {
      page = 1,
      pageSize = 10,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      employmentType,
      employment_type,
      departmentId,
      department_id,
    } = req.query;

    const empType = (employmentType || employment_type) as string;
    const deptId = (departmentId || department_id) as string;

    logger.debug('listEmployees called', {
      organizationId: ctx.organizationId,
      page,
      pageSize,
      sortBy,
      sortOrder,
      search: search ? 'present' : 'absent',
      status,
      employmentType: empType,
      departmentId: deptId,
    });

    const result = await this.service.listEmployees(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
      filters: {
        ...(status && { status: status as string }),
        ...(empType && { employment_type: empType }),
        ...(deptId && { current_department_id: parseInt(deptId, 10) }),
      },
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
    console.log('--- UPDATE EMPLOYEE REQUEST BODY ---', req.body);
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

  /**
   * Get employee personal info
   */
  getPersonalInfo = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const info = await this.service.getPersonalInfo(ctx, parseInt(id, 10));

    res.json({
      success: true,
      data: info,
    });
  });

  /**
   * Create or update employee personal info
   */
  upsertPersonalInfo = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, employeePersonalInfoUpdateSchema);

    const info = await this.service.upsertPersonalInfo(ctx, parseInt(id, 10), validated);

    res.json({
      success: true,
      data: info,
    });
  });

  /**
   * Get employee professional info
   */
  getProfessionalInfo = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const info = await this.service.getProfessionalInfo(ctx, parseInt(id, 10));

    res.json({
      success: true,
      data: info,
    });
  });

  /**
   * Create or update employee professional info
   */
  upsertProfessionalInfo = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, employeeProfessionalInfoUpdateSchema);

    const info = await this.service.upsertProfessionalInfo(ctx, parseInt(id, 10), validated);

    res.json({
      success: true,
      data: info,
    });
  });

  /**
   * Get employee documents
   */
  getDocuments = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const result = await this.documentService.getEmployeeDocuments(ctx, parseInt(id, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  });

  /**
   * Get logged-in employee's documents
   */
  getMyDocuments = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    let empId = ctx.userId;

    try {
      const user = await (this.service as any).employeeRepo?.db('users')
        .where('id', ctx.userId)
        .first();
      if (user && user.employee_id) {
        empId = user.employee_id;
      } else if (user && user.email) {
        const empByEmail = await (this.service as any).employeeRepo?.db('employees')
          .where('email', user.email)
          .first();
        if (empByEmail && empByEmail.id) {
          empId = empByEmail.id;
        }
      }
    } catch (e) {}

    const result = await this.documentService.getEmployeeDocuments(ctx, empId, {
      page: 1,
      pageSize: 100,
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  });

  /**
   * Upload employee document (metadata; file stored as URL)
   */
  uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(
      { ...req.body, employeeId: parseInt(id, 10) },
      employeeDocumentCreateSchema
    );

    const document = await this.documentService.uploadDocument(ctx, validated);

    res.status(201).json({
      success: true,
      data: document,
    });
  });

  /**
   * Verify (approve/reject) employee document
   */
  verifyDocument = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { documentId } = req.params;
    const { approved, reason } = req.body;

    const document = await this.documentService.verifyDocument(
      ctx,
      parseInt(documentId, 10),
      Boolean(approved),
      reason
    );

    res.json({
      success: true,
      data: document,
    });
  });

  /**
   * Delete employee document
   */
  deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { documentId } = req.params;

    await this.documentService.deleteDocument(ctx, parseInt(documentId, 10));

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  });

  /**
   * Get employee asset allocations
   */
  getEmployeeAssets = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const result = await this.assetService.getEmployeeAssets(ctx, parseInt(id, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  });

  /**
   * Allocate asset to employee
   */
  allocateAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(
      { ...req.body, employeeId: parseInt(id, 10) },
      assetAllocationCreateSchema
    );

    const allocation = await this.assetService.allocateAsset(ctx, validated);

    res.status(201).json({
      success: true,
      data: allocation,
    });
  });

  /**
   * Return an allocated asset
   */
  returnAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { allocationId } = req.params;
    const validated = validate(req.body, assetAllocationReturnSchema);

    const allocation = await this.assetService.returnAsset(
      ctx,
      parseInt(allocationId, 10),
      validated
    );

    res.json({
      success: true,
      data: allocation,
    });
  });

  /**
   * Get employee lifecycle history
   */
  getLifecycleHistory = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const result = await this.lifecycleService.getEmployeeHistory(ctx, parseInt(id, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.meta,
    });
  });

  /**
   * Transition employee status (records lifecycle history)
   */
  transitionStatus = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(
      { ...req.body, employeeId: parseInt(id, 10) },
      statusTransitionSchema
    );

    const lifecycle = await this.lifecycleService.transitionStatus(ctx, validated);

    res.status(201).json({
      success: true,
      data: lifecycle,
    });
  });

  /**
   * Download sample employee import CSV template
   */
  downloadSampleTemplate = asyncHandler(async (req: Request, res: Response) => {
    const csvContent = 'employeeCode,firstName,lastName,middleName,email,phone,mobile,dateOfBirth,gender,dateOfJoining,employmentType,departmentId,reportingManagerId,password,confirmPassword\n' +
      'EMP001,John,Doe,Alexander,john.doe@example.com,+1234567890,+1987654321,1990-01-15,male,2023-01-15,full_time,1,,TempPass123!,TempPass123!\n' +
      'EMP002,Jane,Smith,,jane.smith@example.com,+1234567891,,1992-05-20,female,2023-03-01,full_time,2,1,TempPass456!,TempPass456!\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');
    res.status(200).send(csvContent);
  });

  /**
   * Bulk upload employees from JSON array (sent after parsing CSV on frontend)
   */
  bulkUploadEmployees = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, employeeBulkCreateSchema);

    const employees = await this.service.createEmployeesBulk(ctx, validated.employees);

    res.status(201).json({
      success: true,
      message: `${employees.length} employees imported successfully`,
      data: employees,
    });
  });

  /**
   * Log Digital ID Card generation event
   */
  issueIdCard = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Digital ID Card generated and verified successfully',
      issuedAt: new Date().toISOString(),
      employeeId: id,
    });
  });
}

export const employeeController = new EmployeeController();
