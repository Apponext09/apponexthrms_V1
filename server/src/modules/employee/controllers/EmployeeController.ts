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
      status: validated.status,
      designationId: validated.designationId,
      jobTitle: validated.jobTitle,
      departmentId: validated.departmentId,
      branchId: validated.branchId,
      locationId: validated.locationId,
      reportingManagerId: validated.reportingManagerId,
      costCenterId: validated.costCenterId,
      currentGradeId: (validated as any).currentGradeId,
      accessRole: validated.accessRole,
      password: (validated as any).password,
      salarySlabId: (validated as any).salarySlabId || req.body.salarySlabId || req.body.salary_slab_id,
    });


    const db = getKnex();
    const org = await db('organizations').where('id', ctx.organizationId).first().catch(() => null);
    const emp = result.employee;
    const fullName = `${emp.first_name || (emp as any).firstName || ''} ${emp.last_name || (emp as any).lastName || ''}`.trim();

    res.status(201).json({
      success: true,
      status: emp.status || 'active',
      data: {
        employeeName: fullName,
        employeeEmail: emp.email,
        organizationName: org?.name || '',
        status: emp.status || 'active',
      },
      generatedPassword: result.generatedPassword,
    });
  });

  /**
   * Get employee by ID
   */
  getEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const employee = await this.service.getEmployee(ctx, id);

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
      .first();

    if (user?.employee_id) {
      const emp = await db('employees')
        .where('id', user.employee_id)
        .whereNull('deleted_at')
        .first();
      if (emp) {
        employeeId = user.employee_id;
      }
    }

    if (!employeeId && user?.email) {
      const empByEmail = await db('employees')
        .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
        .whereNull('deleted_at')
        .first();
      if (empByEmail) {
        employeeId = empByEmail.id;
        await db('users').where('id', user.id).update({ employee_id: empByEmail.id });
      }
    }

    if (!employeeId) {
      const firstEmp = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();
      if (firstEmp) {
        employeeId = firstEmp.id;
      }
    }

    if (!employeeId) {
      res.status(404).json({ success: false, message: 'Employee profile not linked' });
      return;
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
      res.status(404).json({ success: false, message: 'Employee profile not linked' });
      return;
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

    const org = await db('organizations').where('id', ctx.organizationId).first().catch(() => null);
    const fullName = `${updated.first_name || (updated as any).firstName || ''} ${updated.last_name || (updated as any).lastName || ''}`.trim();

    res.json({
      success: true,
      status: updated.status || 'active',
      data: {
        employeeName: fullName,
        employeeEmail: updated.email,
        organizationName: org?.name || '',
        status: updated.status || 'active',
      },
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
      companyId,
      company_id,
      excludeCeo,
      exclude_ceo,
    } = req.query;

    const empType = (employmentType || employment_type) as string;
    const deptId = (departmentId || department_id) as string;
    const targetCompId = (companyId || company_id) as string;
    const shouldExcludeCeo = excludeCeo === 'true' || exclude_ceo === 'true' || excludeCeo === true;

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
      companyId: targetCompId,
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
        ...(targetCompId && targetCompId.toLowerCase() !== 'all' && { company_id: parseInt(targetCompId, 10) }),
        ...(shouldExcludeCeo && { is_ceo: 0 }),
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
    const db = getKnex();
    const org = await db('organizations').where('id', ctx.organizationId).first().catch(() => null);
    const fullName = `${employee.first_name || (employee as any).firstName || ''} ${employee.last_name || (employee as any).lastName || ''}`.trim();

    res.json({
      success: true,
      status: employee.status || 'active',
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
   * Accept document verification & privacy policy for employee
   */
  acceptDocumentPolicy = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const empId = parseInt(id, 10);
    const db = getKnex();

    await db('employees')
      .where('id', empId)
      .where('organization_id', ctx.organizationId)
      .update({
        document_policy_accepted: true,
        document_policy_accepted_at: new Date(),
      });

    res.json({
      success: true,
      message: 'Document policy accepted successfully',
      data: { documentPolicyAccepted: true },
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
    const csvContent = 'Employee Code,First Name,Middle Name,Last Name,Email,Mobile,Date of Birth,Gender,Date of Joining,Employment Type,Department Name,Job Title,Reporting Manager Email,Access Role,Password\n' +
      'EMP001,John,,Doe,john.doe@example.com,+919876543210,1990-01-15,male,2023-01-15,full_time,Engineering,Software Engineer,manager@example.com,employee,Admin@123\n' +
      'EMP002,Jane,A,Smith,jane.smith@example.com,+919876543211,1992-05-20,female,2023-03-01,full_time,HR,HR Manager,,hr_manager,Admin@123\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');
    res.status(200).send(csvContent);
  });

  bulkUploadEmployees = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, employeeBulkCreateSchema);

    const result = await this.service.createEmployeesBulk(ctx, validated.employees);

    res.status(201).json({
      success: true,
      message: `${result.imported} employees imported successfully. ${result.failed} failed.`,
      data: result,
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

  /**
   * POST /employees/profile-update-requests
   */
  createProfileUpdateRequest = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId, requestType, targetArea, requestedChanges, reason } = req.body;
    const result = await this.service.createProfileUpdateRequest(ctx, {
      employeeId: employeeId ? Number(employeeId) : undefined,
      requestType,
      targetArea,
      requestedChanges,
      reason,
    });
    res.status(201).json({ success: true, data: result });
  });

  /**
   * GET /employees/profile-update-requests
   */
  getProfileUpdateRequests = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const result = await this.service.getProfileUpdateRequests(ctx, companyId);
    res.json({ success: true, data: result });
  });

  /**
   * PATCH /employees/profile-update-requests/:id/status
   */
  updateProfileUpdateRequestStatus = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const result = await this.service.updateProfileUpdateRequestStatus(ctx, Number(id), status, rejectionReason);
    res.json({ success: true, data: result });
  });

  /**
   * GET /employees/my-edit-permission
   * Returns whether an employee has an approved (and unused) profile update request within 24h
   */
  getMyEditPermission = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const db = getKnex();
    const user = req.user as any;
    const targetEmpId = req.query.employeeId ? Number(req.query.employeeId) : null;

    // Resolve employee id from query or user
    let empId: number | null = targetEmpId || user?.employeeId || null;
    if (!empId && user?.id) {
      const u = await db('users').where('id', user.id).first();
      empId = u?.employee_id || null;
      if (!empId && u?.email) {
        const emp = await db('employees').whereRaw('LOWER(email) = ?', [u.email.toLowerCase()]).first();
        empId = emp?.id || null;
      }
    }

    if (!empId) {
      return res.json({ success: true, data: { editUnlocked: false, approvedRequestId: null } });
    }

    // Unlocks for 1 day (24 hours = 86,400,000 ms) from approved_at
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const approved = await db('employee_profile_update_requests')
      .where('employee_id', empId)
      .where('status', 'approved')
      .where(function () {
        this.whereNull('approved_at').orWhere('approved_at', '>=', oneDayAgo);
      })
      .whereNull('deleted_at')
      .orderBy('id', 'desc')
      .first();

    return res.json({
      success: true,
      data: {
        editUnlocked: !!approved,
        approvedRequestId: approved?.id || null,
        approvedAt: approved?.approved_at || null,
        unlockedSection: approved?.profile_section || null,
      },
    });
  });

  /**
   * POST /employees/consume-edit-permission/:requestId
   * Marks an approved profile update request as 'completed' (used) after edit is saved
   */
  consumeEditPermission = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const db = getKnex();
    const { requestId } = req.params;

    await db('employee_profile_update_requests')
      .where('id', Number(requestId))
      .update({
        status: 'completed',
        updated_at: new Date(),
        updated_by: ctx.userId || 1,
      });

    return res.json({ success: true, message: 'Edit permission consumed.' });
  });

  /**
   * GET /employees/my-profile-requests
   * Returns all profile update requests submitted by the logged-in employee
   */
  getMyProfileRequests = asyncHandler(async (req: Request, res: Response) => {
    const db = getKnex();
    const user = req.user as any;

    let empId: number | null = user?.employeeId || null;
    if (!empId && user?.id) {
      const u = await db('users').where('id', user.id).first();
      empId = u?.employee_id || null;
      if (!empId && u?.email) {
        const emp = await db('employees').whereRaw('LOWER(email) = ?', [u.email.toLowerCase()]).first();
        empId = emp?.id || null;
      }
    }

    if (!empId) return res.json({ success: true, data: [] });

    const result = await this.service.getMyProfileUpdateRequests(empId);
    return res.json({ success: true, data: result });
  });

  /**
   * GET /employees/org-hierarchy/rules
   */
  getOrgHierarchyRules = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { OrgHierarchyService } = await import('../services/OrgHierarchyService');
    const service = new OrgHierarchyService();
    const rules = await service.getHierarchyRules(ctx);
    res.json({ success: true, data: rules });
  });

  /**
   * PUT /employees/org-hierarchy/rules
   */
  saveOrgHierarchyRules = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { rules } = req.body;
    const { OrgHierarchyService } = await import('../services/OrgHierarchyService');
    const service = new OrgHierarchyService();
    await service.saveHierarchyRules(ctx, rules || []);
    res.json({ success: true, message: 'Org hierarchy rules saved successfully' });
  });
}

export const employeeController = new EmployeeController();

