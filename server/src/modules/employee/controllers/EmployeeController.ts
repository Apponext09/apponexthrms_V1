import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { EmployeeService } from '../services/EmployeeService';
import { EmployeeDocumentService } from '../services/EmployeeDocumentService';
import { EmployeeLifecycleService } from '../services/EmployeeLifecycleService';
import { AssetService } from '../services/AssetService';
import {
  employeeCreateSchema,
  employeeUpdateSchema,
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
}

export const employeeController = new EmployeeController();
