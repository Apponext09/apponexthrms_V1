import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction, getKnex } from '../../../db/knex';
import { EmployeeRepository, type Employee } from '../repositories/EmployeeRepository';
import { EmployeePersonalInfoRepository } from '../repositories/EmployeePersonalInfoRepository';
import { EmployeeProfessionalInfoRepository } from '../repositories/EmployeeProfessionalInfoRepository';
import { EmployeeCompensationRepository } from '../repositories/EmployeeCompensationRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class EmployeeService {
  private employeeRepo: EmployeeRepository;
  private personalInfoRepo: EmployeePersonalInfoRepository;
  private professionalInfoRepo: EmployeeProfessionalInfoRepository;
  private compensationRepo: EmployeeCompensationRepository;
  private auditService: AuditService;

  constructor() {
    this.employeeRepo = new EmployeeRepository();
    this.personalInfoRepo = new EmployeePersonalInfoRepository();
    this.professionalInfoRepo = new EmployeeProfessionalInfoRepository();
    this.compensationRepo = new EmployeeCompensationRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a new employee
   */
  async createEmployee(ctx: TenantContext, input: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone?: string;
    mobile?: string;
    dateOfBirth?: string;
    gender?: string;
    dateOfJoining: string;
    employmentType: string;
    designationId?: number;
    departmentId?: number;
    branchId?: number;
    locationId?: number;
    reportingManagerId?: number;
    costCenterId?: number;
    avatarUrl?: string;
    password: string;
  }): Promise<{ employee: Employee; generatedPassword?: string }> {
    // Check if employee code is unique
    const isUnique = await this.employeeRepo.isCodeUnique(ctx, input.employeeCode);
    if (!isUnique) {
      throw new ValidationError(`Employee code '${input.employeeCode}' already exists`);
    }

    // Create employee
    const employee = await this.employeeRepo.create(ctx, {
      uuid: uuidv4(),
      employee_code: input.employeeCode,
      first_name: input.firstName,
      last_name: input.lastName,
      middle_name: input.middleName || null,
      email: input.email,
      phone: input.phone || null,
      mobile: input.mobile || null,
      date_of_birth: input.dateOfBirth || null,
      gender: input.gender || null,
      date_of_joining: input.dateOfJoining,
      employment_type: input.employmentType,
      current_designation_id: input.designationId || null,
      current_department_id: input.departmentId || null,
      current_branch_id: input.branchId || null,
      current_location_id: input.locationId || null,
      reporting_manager_id: input.reportingManagerId || null,
      cost_center_id: input.costCenterId || null,
      avatar_url: input.avatarUrl || null,
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Create user login credentials
    const plainPassword = input.password;
    const hashedPassword = await hash(plainPassword, {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const db = getKnex();
    await db.transaction(async (trx) => {
      // 1. Create user
      const [userId] = await trx('users').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employee.id,
        email: input.email,
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 2. Find or create employee role
      let employeeRole = await trx('roles')
        .where('organization_id', ctx.organizationId)
        .where('code', 'employee')
        .first();

      if (!employeeRole) {
        const [roleId] = await trx('roles').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          code: 'employee',
          name: 'EMPLOYEE',
          description: 'Employee role',
          created_at: new Date(),
          updated_at: new Date(),
        });
        employeeRole = { id: roleId };
      }

      // 3. Assign role to user
      await trx('user_roles').insert({
        organization_id: ctx.organizationId,
        user_id: userId,
        role_id: employeeRole.id,
        assigned_by: ctx.userId,
        assigned_at: new Date(),
      });
    });

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      afterState: {
        employeeCode: input.employeeCode,
        firstName: input.firstName,
        email: input.email,
      },
    });

    return { employee, generatedPassword: plainPassword };
  }

  /**
   * Update employee information
   */
  async updateEmployee(ctx: TenantContext, employeeId: number, input: Record<string, any>): Promise<Employee> {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const payload: Record<string, any> = {};

    if (input.employeeCode !== undefined) payload.employee_code = input.employeeCode;
    if (input.firstName !== undefined) payload.first_name = input.firstName;
    if (input.middleName !== undefined) payload.middle_name = input.middleName;
    if (input.lastName !== undefined) payload.last_name = input.lastName;
    if (input.email !== undefined) payload.email = input.email;
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.mobile !== undefined) payload.mobile = input.mobile;
    if (input.dateOfBirth !== undefined) payload.date_of_birth = input.dateOfBirth;
    if (input.gender !== undefined) payload.gender = input.gender;
    if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
    if (input.avatar_url !== undefined) payload.avatar_url = input.avatar_url;
    if (input.customIdCard !== undefined) payload.custom_id_card = input.customIdCard;
    if (input.custom_id_card !== undefined) payload.custom_id_card = input.custom_id_card;
    if (input.reportingManagerId !== undefined) payload.reporting_manager_id = input.reportingManagerId;
    if (input.reporting_manager_id !== undefined) payload.reporting_manager_id = input.reporting_manager_id;
    if (input.designationId !== undefined) payload.current_designation_id = input.designationId;
    if (input.departmentId !== undefined) payload.current_department_id = input.departmentId;
    if (input.branchId !== undefined) payload.current_branch_id = input.branchId;
    if (input.locationId !== undefined) payload.current_location_id = input.locationId;
    if (input.employmentType !== undefined) payload.employment_type = input.employmentType;
    if (input.status !== undefined) payload.status = input.status;
    if (input.dateOfJoining !== undefined) payload.date_of_joining = input.dateOfJoining;
    if (input.dateOfConfirmation !== undefined) payload.date_of_confirmation = input.dateOfConfirmation;
    if (input.probationEndDate !== undefined) payload.probation_end_date = input.probationEndDate;

    // Copy any direct snake_case properties if passed (skip camelCase)
    for (const key of Object.keys(input)) {
      if (!(key in payload) && input[key] !== undefined && !/[A-Z]/.test(key)) {
        payload[key] = input[key];
      }
    }

    payload.updated_by = ctx.userId;

    const updated = await this.employeeRepo.update(ctx, employeeId, payload as any);

    if (input.password) {
      const hashedPassword = await hash(input.password, {
        type: 2, // argon2id
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      const db = getKnex();
      await db('users')
        .where('employee_id', employeeId)
        .where('organization_id', ctx.organizationId)
        .update({
          password_hash: hashedPassword,
          updated_at: new Date()
        });
    }

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      beforeState: employee,
      afterState: updated,
    });

    return updated;
  }

  /**
   * Get employee by ID
   */
  async getEmployee(ctx: TenantContext, employeeId: number): Promise<Employee> {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  /**
   * List employees
   */
  async listEmployees(ctx: TenantContext, options?: ListQueryOptions) {
    return this.employeeRepo.list(ctx, options);
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(ctx: TenantContext, employeeId: number): Promise<void> {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    await this.employeeRepo.delete(ctx, employeeId);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      beforeState: employee,
    });
  }

  /**
   * Get direct reports for a manager
   */
  async getDirectReports(ctx: TenantContext, managerId: number, options?: ListQueryOptions) {
    return this.employeeRepo.getDirectReports(ctx, managerId, options);
  }

  /**
   * Get personal info for employee
   */
  async getPersonalInfo(ctx: TenantContext, employeeId: number) {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return this.personalInfoRepo.getByEmployeeId(ctx, employeeId);
  }

  /**
   * Create or update personal info for employee
   */
  async upsertPersonalInfo(ctx: TenantContext, employeeId: number, input: {
    fatherName?: string | null;
    motherName?: string | null;
    spouseName?: string | null;
    childrenCount?: number;
    permanentAddress?: string | null;
    currentAddress?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
  }) {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const existing = await this.personalInfoRepo.getByEmployeeId(ctx, employeeId);

    const data: Record<string, unknown> = {
      father_name: input.fatherName,
      mother_name: input.motherName,
      spouse_name: input.spouseName,
      children_count: input.childrenCount,
      permanent_address: input.permanentAddress,
      current_address: input.currentAddress,
      city: input.city,
      state: input.state,
      country: input.country,
      postal_code: input.postalCode,
      updated_by: ctx.userId,
    };
    // Drop undefined keys so partial updates don't overwrite existing values
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

    if (!existing) {
      data.uuid = uuidv4();
      data.created_by = ctx.userId;
    }

    const result = await this.personalInfoRepo.upsert(ctx, employeeId, data as any);

    await this.auditService.log(ctx, {
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'EMPLOYEE_PERSONAL_INFO',
      entityId: result.id,
      changeDescription: `Personal info ${existing ? 'updated' : 'created'} for employee ${employeeId}`,
    });

    return result;
  }

  /**
   * Get professional info for employee
   */
  async getProfessionalInfo(ctx: TenantContext, employeeId: number) {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return this.professionalInfoRepo.getByEmployeeId(ctx, employeeId);
  }

  /**
   * Create or update professional info for employee
   */
  async upsertProfessionalInfo(ctx: TenantContext, employeeId: number, input: {
    qualification?: string | null;
    specialization?: string | null;
    university?: string | null;
    graduationYear?: number | null;
    yearsOfExperience?: number;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
  }) {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const existing = await this.professionalInfoRepo.getByEmployeeId(ctx, employeeId);

    const data: Record<string, unknown> = {
      qualification: input.qualification,
      specialization: input.specialization,
      university: input.university,
      graduation_year: input.graduationYear,
      years_of_experience: input.yearsOfExperience,
      linkedin_url: input.linkedinUrl,
      github_url: input.githubUrl,
      updated_by: ctx.userId,
    };
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

    if (!existing) {
      data.uuid = uuidv4();
      data.created_by = ctx.userId;
    }

    const result = await this.professionalInfoRepo.upsert(ctx, employeeId, data as any);

    await this.auditService.log(ctx, {
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'EMPLOYEE_PROFESSIONAL_INFO',
      entityId: result.id,
      changeDescription: `Professional info ${existing ? 'updated' : 'created'} for employee ${employeeId}`,
    });

    return result;
  }

  /**
   * Update employee status (lifecycle transition)
   */
  async updateStatus(ctx: TenantContext, employeeId: number, newStatus: string): Promise<Employee> {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const updated = await this.employeeRepo.update(ctx, employeeId, {
      status: newStatus,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      changeDescription: `Status changed from ${employee.status} to ${newStatus}`,
    });

    return updated;
  }

  /**
   * Create multiple employees in a database transaction
   */
  async createEmployeesBulk(ctx: TenantContext, inputs: Array<{
    employeeCode: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone?: string;
    mobile?: string;
    dateOfBirth?: string;
    gender?: string;
    dateOfJoining: string;
    employmentType: string;
    designationId?: number;
    departmentId?: number;
    branchId?: number;
    locationId?: number;
    reportingManagerId?: number;
    costCenterId?: number;
    password: string;
  }>): Promise<any[]> {
    return withTransaction(async (trx) => {
      const results = [];
      for (const input of inputs) {
        // Validate department existence if provided
        if (input.departmentId) {
          const dept = await trx('departments')
            .where({ id: input.departmentId, organization_id: ctx.organizationId })
            .first();
          if (!dept) {
            throw new ValidationError(`Department with ID '${input.departmentId}' does not exist in your organization`);
          }
        }

        // Validate reporting manager existence if provided
        if (input.reportingManagerId) {
          const mgr = await trx('employees')
            .where({ id: input.reportingManagerId, organization_id: ctx.organizationId })
            .first();
          if (!mgr) {
            throw new ValidationError(`Reporting Manager with ID '${input.reportingManagerId}' does not exist in your organization`);
          }
        }

        // Skip if employee code already exists in your organization
        const codeExists = await trx('employees')
          .where({ employee_code: input.employeeCode, organization_id: ctx.organizationId })
          .first();
        if (codeExists) {
          continue;
        }

        // Skip if email already exists
        const emailExists = await trx('users')
          .where({ email: input.email })
          .first();
        if (emailExists) {
          continue;
        }

        // Create employee
        const employee = await this.employeeRepo.create(ctx, {
          uuid: uuidv4(),
          employee_code: input.employeeCode,
          first_name: input.firstName,
          last_name: input.lastName,
          middle_name: input.middleName || null,
          email: input.email,
          phone: input.phone || null,
          mobile: input.mobile || null,
          date_of_birth: input.dateOfBirth || null,
          gender: input.gender || null,
          date_of_joining: input.dateOfJoining,
          employment_type: input.employmentType,
          current_designation_id: input.designationId || null,
          current_department_id: input.departmentId || null,
          current_branch_id: input.branchId || null,
          current_location_id: input.locationId || null,
          reporting_manager_id: input.reportingManagerId || null,
          cost_center_id: input.costCenterId || null,
          status: 'active',
          created_by: ctx.userId,
          updated_by: ctx.userId,
        } as any);

        // Generate credentials
        const plainPassword = input.password;
        const hashedPassword = await hash(plainPassword, {
          type: 2, // argon2id
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });

        // 1. Create user
        const [userId] = await trx('users').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employee.id,
          email: input.email,
          password_hash: hashedPassword,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });

        // 2. Find or create employee role
        let employeeRole = await trx('roles')
          .where('organization_id', ctx.organizationId)
          .where('code', 'employee')
          .first();

        if (!employeeRole) {
          const [roleId] = await trx('roles').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            code: 'employee',
            name: 'EMPLOYEE',
            description: 'Employee role',
            created_at: new Date(),
            updated_at: new Date(),
          });
          employeeRole = { id: roleId };
        }

        // 3. Assign role to user
        await trx('user_roles').insert({
          organization_id: ctx.organizationId,
          user_id: userId,
          role_id: employeeRole.id,
          assigned_by: ctx.userId,
          assigned_at: new Date(),
        });

        // Audit log
        await this.auditService.log(ctx, {
          action: 'CREATE',
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          afterState: {
            employeeCode: input.employeeCode,
            firstName: input.firstName,
            email: input.email,
          },
        });

        results.push({
          ...employee,
          generatedPassword: plainPassword,
        });
      }
      return results;
    });
  }
}
