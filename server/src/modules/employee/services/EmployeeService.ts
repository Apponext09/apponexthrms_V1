import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction, getKnex } from '../../../db/knex';
import { EmployeeRepository, type Employee } from '../repositories/EmployeeRepository';
import { EmployeePersonalInfoRepository } from '../repositories/EmployeePersonalInfoRepository';
import { EmployeeProfessionalInfoRepository } from '../repositories/EmployeeProfessionalInfoRepository';
import { EmployeeCompensationRepository } from '../repositories/EmployeeCompensationRepository';
import { AuditService } from '../../audit/audit.service';
import { BiometricService } from '../../attendance/services/BiometricService';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

async function resolveAuditUserId(db: any, ctx: TenantContext): Promise<number> {
  const user = await db('users').where({ id: ctx.userId }).first();
  if (user) {
    return ctx.userId;
  }
  const fallback = await db('users')
    .where({ organization_id: ctx.organizationId, status: 'active' })
    .first();
  if (fallback) {
    return fallback.id;
  }
  const ultimate = await db('users').where({ status: 'active' }).first();
  if (ultimate) {
    return ultimate.id;
  }
  return ctx.userId;
}

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
    accessRole?: string;
    jobTitle?: string;
    password: string;
  }): Promise<{ employee: Employee; generatedPassword?: string }> {
    // Check if employee code is unique
    const isUnique = await this.employeeRepo.isCodeUnique(ctx, input.employeeCode);
    if (!isUnique) {
      throw new ValidationError(`Employee code '${input.employeeCode}' already exists`);
    }

    const db = getKnex();

    // Check if email is already taken
    const existingEmp = await db('employees')
      .where({ organization_id: ctx.organizationId, email: input.email })
      .first();
    if (existingEmp) {
      throw new ValidationError(`An employee with email '${input.email}' already exists in your organization.`);
    }

    const existingUser = await db('users')
      .where({ organization_id: ctx.organizationId, email: input.email })
      .first();
    if (existingUser) {
      throw new ValidationError(`A user account with email '${input.email}' already exists in your organization.`);
    }

    let currentDesignationId = input.designationId || null;

    if (input.jobTitle && input.departmentId) {
      let designation = await db('designations')
        .where({ organization_id: ctx.organizationId, department_id: input.departmentId, name: input.jobTitle })
        .first();
      if (!designation) {
        const auditUserId = await resolveAuditUserId(db, ctx);
        const [designationId] = await db('designations').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          department_id: input.departmentId,
          name: input.jobTitle,
          code: `D${input.departmentId}_${input.jobTitle.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`.slice(0, 50),
          created_by: auditUserId,
          updated_by: auditUserId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        currentDesignationId = designationId;
      } else {
        currentDesignationId = designation.id;
      }
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
      current_designation_id: currentDesignationId,
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

      // 3. Assign base role to user
      await trx('user_roles').insert({
        organization_id: ctx.organizationId,
        user_id: userId,
        role_id: employeeRole.id,
        assigned_by: ctx.userId,
        assigned_at: new Date(),
      });

      // 4. Assign custom accessRole if specified
      if (input.accessRole && input.accessRole !== 'employee') {
        let accessRoleObj = await trx('roles')
          .where('organization_id', ctx.organizationId)
          .where('code', input.accessRole)
          .first();

        if (!accessRoleObj) {
          const roleNames: Record<string, string> = {
            department_head: 'Department Manager',
            team_lead: 'Team Lead',
            hr_manager: 'HR Manager',
          };
          const [roleId] = await trx('roles').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            code: input.accessRole,
            name: roleNames[input.accessRole] || input.accessRole,
            description: `System role created for ${roleNames[input.accessRole] || input.accessRole}`,
            is_system: true,
            is_platform_role: false,
            is_default: false,
            created_at: new Date(),
            updated_at: new Date(),
          });
          accessRoleObj = { id: roleId };

          const employeePermissions = await trx('role_permissions')
            .where('role_id', employeeRole.id)
            .select('permission_id');
          if (employeePermissions.length) {
            await trx('role_permissions').insert(
              employeePermissions.map((permission) => ({
                role_id: roleId,
                permission_id: permission.permission_id,
              }))
            );
          }
        }

        await trx('user_roles').insert({
          organization_id: ctx.organizationId,
          user_id: userId,
          role_id: accessRoleObj.id,
          assigned_by: ctx.userId,
          assigned_at: new Date(),
        });

        if (input.accessRole === 'department_head' && input.departmentId) {
          await trx('departments')
            .where({ id: input.departmentId, organization_id: ctx.organizationId })
            .update({ department_head_id: employee.id, updated_by: ctx.userId, updated_at: new Date() });
        }
      }
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

    if (input.avatarUrl && input.avatarUrl.startsWith('data:image/')) {
      try {
        const biometricService = new BiometricService();
        await biometricService.enrollFace(ctx, employee.id, input.avatarUrl);
      } catch (bioErr) {
        console.warn('[EmployeeService] Initial biometric enrollment skipped:', bioErr);
      }
    }

    return { employee };
  }

  private async ensureEmployeeColumns() {
    try {
      const db = getKnex();
      const hasTable = await db.schema.hasTable('employees');
      if (hasTable) {
        const columnsToEnsure = [
          { name: 'avatar_url', type: 'text' },
          { name: 'blood_group', type: 'string', length: 20 },
          { name: 'nationality', type: 'string', length: 100 },
          { name: 'aadhar_number', type: 'string', length: 50 },
          { name: 'pan_number', type: 'string', length: 50 },
          { name: 'passport_number', type: 'string', length: 50 },
        ];
        for (const col of columnsToEnsure) {
          const hasCol = await db.schema.hasColumn('employees', col.name);
          if (!hasCol) {
            await db.schema.alterTable('employees', (table) => {
              if (col.type === 'text') {
                table.text(col.name).nullable();
              } else {
                table.string(col.name, col.length || 100).nullable();
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('[EmployeeService] ensureEmployeeColumns warning:', e);
    }
  }

  /**
   * Update employee information
   */
  async updateEmployee(ctx: TenantContext, employeeId: number, input: Record<string, any>): Promise<Employee> {
    await this.ensureEmployeeColumns();

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
    if (input.bloodGroup !== undefined) payload.blood_group = input.bloodGroup;
    if (input.blood_group !== undefined) payload.blood_group = input.blood_group;
    if (input.nationality !== undefined) payload.nationality = input.nationality;
    if (input.aadharNumber !== undefined) payload.aadhar_number = input.aadharNumber;
    if (input.aadhar_number !== undefined) payload.aadhar_number = input.aadhar_number;
    if (input.panNumber !== undefined) payload.pan_number = input.panNumber;
    if (input.pan_number !== undefined) payload.pan_number = input.pan_number;
    if (input.passportNumber !== undefined) payload.passport_number = input.passportNumber;
    if (input.passport_number !== undefined) payload.passport_number = input.passport_number;
    if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
    if (input.avatar_url !== undefined) payload.avatar_url = input.avatar_url;
    if (input.reportingManagerId !== undefined) payload.reporting_manager_id = input.reportingManagerId;
    if (input.reporting_manager_id !== undefined) payload.reporting_manager_id = input.reporting_manager_id;
    if (input.designationId !== undefined) payload.current_designation_id = input.designationId;
    if (input.departmentId !== undefined) payload.current_department_id = input.departmentId;
    if (input.branchId !== undefined) payload.current_branch_id = input.branchId;
    if (input.locationId !== undefined) payload.current_location_id = input.locationId;
    if (input.costCenterId !== undefined) payload.cost_center_id = input.costCenterId;
    if (input.employmentType !== undefined) payload.employment_type = input.employmentType;
    if (input.status !== undefined) payload.status = input.status;
    if (input.dateOfJoining !== undefined) payload.date_of_joining = input.dateOfJoining;
    if (input.dateOfConfirmation !== undefined) payload.date_of_confirmation = input.dateOfConfirmation;
    if (input.probationEndDate !== undefined) payload.probation_end_date = input.probationEndDate;

    const allowedEmployeeColumns = new Set([
      'employee_code', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'mobile',
      'date_of_birth', 'gender', 'blood_group', 'nationality', 'aadhar_number', 'pan_number',
      'passport_number', 'avatar_url', 'reporting_manager_id', 'current_designation_id',
      'current_department_id', 'current_branch_id', 'current_location_id', 'cost_center_id',
      'employment_type', 'status', 'date_of_joining', 'date_of_confirmation', 'probation_end_date',
    ]);

    // Copy any direct snake_case properties if passed and valid in employees table
    for (const key of Object.keys(input)) {
      if (allowedEmployeeColumns.has(key) && !(key in payload) && input[key] !== undefined) {
        payload[key] = input[key];
      }
    }

    // Exclude non-employees table properties
    delete payload.password;
    delete payload.confirmPassword;
    delete payload.accessRole;
    delete payload.jobTitle;

    payload.updated_by = ctx.userId;

    const updated = await this.employeeRepo.update(ctx, employeeId, payload as any);

    if (payload.avatar_url && payload.avatar_url.length > 50) {
      try {
        const biometricService = new BiometricService();
        await biometricService.enrollFace(
          ctx,
          updated.id,
          Array.isArray(input.biometricImages) && input.biometricImages.length
            ? input.biometricImages
            : payload.avatar_url
        );
      } catch (bioErr) {
        console.warn('[EmployeeService] Automatic biometric face enrollment skipped:', bioErr);
      }
    } else if (payload.avatar_url === null || payload.avatar_url === '') {
      try {
        const biometricService = new BiometricService();
        await biometricService.deactivateFace(ctx, updated.id);
      } catch (bioErr) {
        console.warn('[EmployeeService] Biometric profile deactivation skipped:', bioErr);
      }
    }

    // Handle user account updates or creation (e.g. password, email, accessRole)
    try {
      const db = getKnex();
      let existingUser = await db('users')
        .where({ organization_id: ctx.organizationId, employee_id: employeeId })
        .first();

      if (!existingUser && employee.email) {
        existingUser = await db('users')
          .where({ organization_id: ctx.organizationId, email: employee.email })
          .first();
      }

      if (input.password || input.email || input.accessRole || !existingUser) {
        const targetEmail = input.email || updated.email || employee.email;
        let hashedPassword: string | undefined = undefined;

        if (input.password) {
          hashedPassword = await hash(input.password, {
            type: 2,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
          });
        }

        if (existingUser) {
          const userUpdateData: Record<string, any> = { updated_at: new Date() };
          if (targetEmail) userUpdateData.email = targetEmail;
          if (hashedPassword) userUpdateData.password_hash = hashedPassword;
          await db('users').where('id', existingUser.id).update(userUpdateData);
        } else if (hashedPassword && targetEmail) {
          const [newUserId] = await db('users').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: employeeId,
            email: targetEmail,
            password_hash: hashedPassword,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          });

          let empRole = await db('roles')
            .where('organization_id', ctx.organizationId)
            .where('code', input.accessRole || 'employee')
            .first();

          if (!empRole) {
            empRole = await db('roles')
              .where('organization_id', ctx.organizationId)
              .where('code', 'employee')
              .first();
          }

          if (empRole) {
            await db('user_roles').insert({
              organization_id: ctx.organizationId,
              user_id: newUserId,
              role_id: empRole.id,
              assigned_by: ctx.userId || newUserId,
              assigned_at: new Date(),
            });
          }
        }
      }
    } catch (userSyncErr) {
      console.warn('[EmployeeService] User credentials sync warning:', userSyncErr);
    }

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      beforeState: employee as any,
      afterState: updated as any,
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
      beforeState: employee as any,
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
      afterState: { description: `Personal info ${existing ? 'updated' : 'created'} for employee ${employeeId}` },
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
      afterState: { description: `Professional info ${existing ? 'updated' : 'created'} for employee ${employeeId}` },
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
      beforeState: { status: employee.status },
      afterState: { status: newStatus, description: `Status changed from ${employee.status} to ${newStatus}` },
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
