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
   * Helper method to resolve the Organization Admin's employee ID for a tenant context
   */
  private async getOrgAdminEmployeeId(db: any, ctx: TenantContext): Promise<number | null> {
    try {
      const hasAdminOrgs = await db.schema.hasTable('admin_organizations');
      if (hasAdminOrgs) {
        const adminOrgRow = await db('admin_organizations')
          .where({ organization_id: ctx.organizationId, status: 'active' })
          .first();
        if (adminOrgRow?.user_id) {
          const user = await db('users').where({ id: adminOrgRow.user_id }).first();
          if (user?.employee_id) {
            return Number(user.employee_id);
          }
        }
      }

      const adminRoleUser = await db('users')
        .join('user_roles', 'users.id', 'user_roles.user_id')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('users.organization_id', ctx.organizationId)
        .whereIn('roles.code', ['organization_admin', 'admin', 'super_admin', 'superadmin'])
        .whereNotNull('users.employee_id')
        .select('users.employee_id')
        .first();

      if (adminRoleUser?.employee_id) {
        return Number(adminRoleUser.employee_id);
      }

      const adminUser = await db('users')
        .where({ organization_id: ctx.organizationId })
        .whereNotNull('employee_id')
        .where((b: any) => {
          b.where('email', 'like', '%admin%').orWhere('email', 'like', '%owner%');
        })
        .select('employee_id')
        .first();

      if (adminUser?.employee_id) {
        return Number(adminUser.employee_id);
      }

      const firstEmp = await db('employees')
        .where({ organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .orderBy('id', 'asc')
        .first();

      return firstEmp ? Number(firstEmp.id) : null;
    } catch (err) {
      console.warn('[EmployeeService] Error resolving org admin employee ID:', err);
      return null;
    }
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
    status?: string;
    designationId?: number;
    departmentId?: number;
    branchId?: number;
    locationId?: number;
    reportingManagerId?: number;
    costCenterId?: number;
    currentGradeId?: number;
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

    // Helper to get Org Admin's employee ID
    let finalReportingManagerId = input.reportingManagerId || null;
    if (['department_head', 'hr_manager'].includes(input.accessRole || 'employee')) {
      const adminEmpId = await this.getOrgAdminEmployeeId(db, ctx);
      if (adminEmpId) {
        finalReportingManagerId = adminEmpId;
      }
    }

    let finalEmpCode = input.employeeCode;
    if (!finalEmpCode || finalEmpCode.trim() === '') {
      const [countRow] = await db('employees').where('organization_id', ctx.organizationId).count('* as count');
      const nextNum = (Number((countRow as any)?.count || 0) + 1);
      finalEmpCode = `EMP${String(nextNum % 1000).padStart(3, '0')}`;
    }

    // Create employee
    const employee = await this.employeeRepo.create(ctx, {
      uuid: uuidv4(),
      employee_code: finalEmpCode,
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
      current_grade_id: input.currentGradeId || null,
      reporting_manager_id: finalReportingManagerId,
      cost_center_id: input.costCenterId || null,
      avatar_url: input.avatarUrl || null,
      status: input.status || 'active',
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

    try {
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

        // 2. Assign accessRole and user roles
        await this.syncUserAccessRole(trx, ctx, userId, input.accessRole || 'employee', employee.id, input.departmentId);

        // 3. Assign Leave Policies (check bulk mappings first, fallback to default)
        const mappings = await trx('leave_policy_mappings')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .orderBy('priority', 'desc');

        const targetRoleCode = input.accessRole || 'employee';
        const roleRecord = await trx('roles')
          .where('organization_id', ctx.organizationId)
          .where('code', targetRoleCode)
          .first();
        const roleIdVal = roleRecord ? roleRecord.id : null;

        let matchedMapping = null;
        for (const mapping of mappings) {
          const mRoleId = mapping.roleId || mapping.role_id;
          if (mRoleId && String(mRoleId) !== String(roleIdVal)) {
            continue;
          }
          const mDesignationId = mapping.designationId || mapping.designation_id;
          if (mDesignationId && String(mDesignationId) !== String(input.currentDesignationId || (input as any).current_designation_id)) {
            continue;
          }
          const mDeptId = mapping.departmentId || mapping.department_id;
          if (mDeptId && String(mDeptId) !== String(input.departmentId || (input as any).current_department_id)) {
            continue;
          }
          const mEmpType = mapping.employmentType || mapping.employment_type;
          if (mEmpType && mEmpType !== input.employmentType) {
            continue;
          }
          matchedMapping = mapping;
          break;
        }

        let defaultPolicy = null;
        if (matchedMapping) {
          const policyId = matchedMapping.leavePolicyId || matchedMapping.leave_policy_id;
          if (policyId) {
            defaultPolicy = await trx('leave_policies')
              .where('id', policyId)
              .first();
          }
        }

        if (!defaultPolicy) {
          defaultPolicy = await trx('leave_policies')
            .where('organization_id', ctx.organizationId)
            .where('is_default', true)
            .where('status', 'active')
            .first();
        }

        if (!defaultPolicy) {
          defaultPolicy = await trx('leave_policies')
            .where('organization_id', ctx.organizationId)
            .where('status', 'active')
            .first();
        }

        if (!defaultPolicy) {
          defaultPolicy = await trx('leave_policies').where('status', 'active').first();
        }

        if (defaultPolicy) {
          let leaveTypes = await trx('leave_types')
            .where('organization_id', ctx.organizationId)
            .orWhereNull('organization_id');

          if (!leaveTypes || leaveTypes.length === 0) {
            leaveTypes = await trx('leave_types')
              .where('organization_id', 1)
              .orWhereNull('organization_id');
          }

          const currentYear = new Date().getFullYear();
          const fyStart = `${currentYear}-04-01`;
          const fyEnd = `${currentYear + 1}-03-31`;

          for (const lt of leaveTypes) {
            // Create leave policy assignment
            await trx('leave_policy_assignments').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: employee.id,
              leave_type_id: lt.id,
              leave_policy_id: defaultPolicy.id,
              annual_quota: lt.default_allowance_days || lt.defaultAllowanceDays || 12,
              carry_forward_enabled: 1,
              carry_forward_limit: 5,
              encashment_enabled: lt.leave_code === 'PL' ? 1 : 0,
              encashment_limit: lt.leave_code === 'PL' ? 15 : 0,
              sandwich_policy_enabled: lt.leave_code === 'SL' ? 1 : 0,
              probation_excluded: 0,
              can_take_negative: lt.leave_code === 'LOP' ? 1 : 0,
              assignment_start_date: input.dateOfJoining ? new Date(input.dateOfJoining) : new Date(),
              is_active: true,
              created_by: ctx.userId,
              updated_by: ctx.userId,
              created_at: new Date(),
              updated_at: new Date()
            } as any);

            // Create leave balance
            const quota = lt.default_allowance_days || lt.defaultAllowanceDays || 12;
            await trx('leave_balances').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: employee.id,
              leave_type_id: lt.id,
              financial_year_start: fyStart,
              financial_year_end: fyEnd,
              opening_balance: quota,
              credited_balance: 0,
              consumed_balance: 0,
              available_balance: quota,
              carry_forward_balance: 0,
              encashed_balance: 0,
              expired_balance: 0,
              pending_approval_balance: 0,
              created_by: ctx.userId,
              updated_by: ctx.userId,
              created_at: new Date(),
              updated_at: new Date()
            } as any);
          }
        }
      });
    } catch (transactionError) {
      console.error('[EmployeeService] Transaction failed, rolling back employee creation:', transactionError);
      await this.employeeRepo.hardDelete(ctx, employee.id).catch(delErr => {
        console.error('[EmployeeService] Failed to rollback orphaned employee:', delErr);
      });
      throw transactionError;
    }

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
        // Alter columns to LONGTEXT so base64 profile pictures store cleanly without MySQL string length errors
        try {
          await db.raw('ALTER TABLE employees MODIFY COLUMN avatar_url LONGTEXT NULL');
        } catch (e) {
          // Ignore if alter fails
        }

        try {
          const hasBioTable = await db.schema.hasTable('employee_biometric_profiles');
          if (hasBioTable) {
            await db.raw('ALTER TABLE employee_biometric_profiles MODIFY COLUMN profile_photo LONGTEXT NULL');
          }
        } catch (e) {
          // Ignore
        }

        const columnsToEnsure = [
          { name: 'avatar_url', type: 'text' },
          { name: 'bio', type: 'text' },
          { name: 'job_title', type: 'string', length: 150 },
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

  private async syncUserAccessRole(
    db: any,
    ctx: TenantContext,
    userId: number,
    accessRole: string,
    employeeId: number,
    departmentId?: number | null
  ) {
    const targetRole = accessRole || 'employee';
    const roleCodes = ['employee', 'team_lead', 'hr_manager', 'department_head'];
    if (!roleCodes.includes(targetRole)) return;

    // Fetch existing system roles for this organization
    const existingRoles = await db('roles')
      .where('organization_id', ctx.organizationId)
      .whereIn('code', roleCodes);

    const roleMap = new Map<string, number>();
    for (const r of existingRoles) {
      roleMap.set(r.code, r.id);
    }

    const roleNames: Record<string, string> = {
      department_head: 'Department Manager',
      team_lead: 'Team Lead',
      hr_manager: 'HR Manager',
      employee: 'Employee',
    };

    // 1. Ensure target role exists in roles table
    let targetRoleId = roleMap.get(targetRole);
    if (!targetRoleId) {
      const [newRoleId] = await db('roles').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        code: targetRole,
        name: roleNames[targetRole] || targetRole,
        description: `System role created for ${roleNames[targetRole] || targetRole}`,
        is_system: true,
        is_platform_role: false,
        is_default: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      targetRoleId = newRoleId;
      roleMap.set(targetRole, newRoleId);
    }

    // 2. Ensure base 'employee' role exists
    let employeeRoleId = roleMap.get('employee');
    if (!employeeRoleId) {
      const [baseRoleId] = await db('roles').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        code: 'employee',
        name: 'EMPLOYEE',
        description: 'Default employee role',
        is_system: true,
        is_platform_role: false,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      employeeRoleId = baseRoleId;
      roleMap.set('employee', baseRoleId);
    }

    // 3. Clear existing role mappings for roleCodes
    const roleIdsToClear = Array.from(roleMap.values());
    await db('user_roles')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .whereIn('role_id', roleIdsToClear)
      .delete();

    // 4. Assign base employee role
    await db('user_roles').insert({
      organization_id: ctx.organizationId,
      user_id: userId,
      role_id: employeeRoleId,
      assigned_by: ctx.userId || userId,
      assigned_at: new Date(),
    });

    // 5. Assign target accessRole if different from employee
    if (targetRole !== 'employee' && targetRoleId && targetRoleId !== employeeRoleId) {
      await db('user_roles').insert({
        organization_id: ctx.organizationId,
        user_id: userId,
        role_id: targetRoleId,
        assigned_by: ctx.userId || userId,
        assigned_at: new Date(),
      });
    }

    // 6. Update department_head_id if role is department_head
    if (targetRole === 'department_head' && departmentId) {
      await db('departments')
        .where({ id: departmentId, organization_id: ctx.organizationId })
        .update({
          department_head_id: employeeId,
          updated_by: ctx.userId || userId,
          updated_at: new Date(),
        });
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
    if (input.bio !== undefined) payload.bio = input.bio;
    if (input.jobTitle !== undefined) payload.job_title = input.jobTitle;
    if (input.job_title !== undefined) payload.job_title = input.job_title;
    if (input.customIdCard !== undefined) payload.custom_id_card = input.customIdCard;
    if (input.custom_id_card !== undefined) payload.custom_id_card = input.custom_id_card;
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
    if (input.resignationDate !== undefined) payload.resignation_date = input.resignationDate;

    const allowedEmployeeColumns = new Set([
      'employee_code', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'mobile',
      'date_of_birth', 'gender', 'blood_group', 'nationality', 'aadhar_number', 'pan_number',
      'passport_number', 'avatar_url', 'bio', 'job_title', 'reporting_manager_id', 'current_designation_id',
      'current_department_id', 'current_branch_id', 'current_location_id', 'cost_center_id',
      'employment_type', 'status', 'date_of_joining', 'date_of_confirmation', 'probation_end_date',
      'resignation_date',
    ]);

    // Copy any direct snake_case properties if passed and valid in employees table
    for (const key of Object.keys(input)) {
      if (allowedEmployeeColumns.has(key) && !(key in payload) && input[key] !== undefined) {
        payload[key] = input[key];
      }
    }

    // Hardcode rule: Manager ('department_head') and HR ('hr_manager') directly report to Admin
    const targetAccessRole = input.accessRole !== undefined
      ? input.accessRole
      : (employee as any).accessRole || 'employee';

    if (['department_head', 'hr_manager'].includes(targetAccessRole)) {
      const db = getKnex();
      const adminEmpId = await this.getOrgAdminEmployeeId(db, ctx);
      if (adminEmpId && adminEmpId !== employeeId) {
        payload.reporting_manager_id = adminEmpId;
      }
    }

    // Validate target department existence & organization ownership if provided
    if (payload.current_department_id) {
      const db = getKnex();
      const dept = await db('departments')
        .where({ id: payload.current_department_id, organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .first();

      if (!dept) {
        throw new ValidationError('Target department does not exist in this organization.');
      }
    }

    if (payload.reporting_manager_id) {
      if (Number(payload.reporting_manager_id) === Number(employeeId)) {
        throw new ValidationError('An employee cannot be their own reporting manager.');
      }

      const db = getKnex();
      let currentManagerId: number | null = Number(payload.reporting_manager_id);
      const visited = new Set<number>([employeeId]);

      while (currentManagerId) {
        if (visited.has(currentManagerId)) {
          throw new ValidationError('Circular reporting manager chain detected.');
        }
        visited.add(currentManagerId);

        const mgr: { reporting_manager_id?: number | null } | undefined = await db('employees')
          .where('id', currentManagerId)
          .select('reporting_manager_id')
          .first();

        currentManagerId = mgr?.reporting_manager_id ? Number(mgr.reporting_manager_id) : null;
      }
    }

    payload.updated_by = ctx.userId;

    const updated = await this.employeeRepo.update(ctx, employeeId, payload as any);

    if (payload.resignation_date) {
      const db = getKnex();
      const leaveTypes = await db('leave_types')
        .where('organization_id', ctx.organizationId)
        .orWhereNull('organization_id')
        .whereNull('deleted_at');

      const cancelEnabledTypeIds = leaveTypes
        .filter((lt: any) => {
          try {
            const settings = typeof lt.application_settings === 'string'
              ? JSON.parse(lt.application_settings)
              : lt.application_settings;
            return !!settings?.cancelFutureAppliedLeaveOnResignation;
          } catch (e) {
            return false;
          }
        })
        .map((lt: any) => lt.id);

      if (cancelEnabledTypeIds.length > 0) {
        const futureApps = await db('leave_applications')
          .where('employee_id', employeeId)
          .whereIn('leave_type_id', cancelEnabledTypeIds)
          .whereIn('status', ['submitted', 'pending_manager', 'pending_hr', 'approved', 'pending_hr_override'])
          .where('application_start_date', '>=', payload.resignation_date);

        for (const app of futureApps) {
          await db('leave_applications')
            .where('id', app.id)
            .update({
              status: 'cancelled',
              admin_notes: 'Automatically cancelled due to employee resignation.',
              updated_at: new Date(),
            });

          const totalDays = parseFloat(app.total_days || app.totalDays || 0);
          const balance = await db('leave_balances')
            .where({
              employee_id: employeeId,
              leave_type_id: app.leave_type_id,
              financial_year_start: app.financial_year_start
            })
            .first();

          if (balance) {
            if (app.status === 'approved') {
              const newConsumed = Math.max(0, (parseFloat(balance.consumed_balance) || 0) - totalDays);
              const newAvailable = (parseFloat(balance.available_balance) || 0) + totalDays;
              await db('leave_balances')
                .where('id', balance.id)
                .update({
                  consumed_balance: newConsumed,
                  available_balance: newAvailable,
                  last_updated_at: new Date().toISOString(),
                });
            } else {
              const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);
              const newAvailable = (parseFloat(balance.available_balance) || 0) + totalDays;
              await db('leave_balances')
                .where('id', balance.id)
                .update({
                  pending_approval_balance: newPending,
                  available_balance: newAvailable,
                  last_updated_at: new Date().toISOString(),
                });
            }
          }
        }
      }
    }

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

      let userIdToSync: number | null = null;

      if (existingUser) {
        userIdToSync = existingUser.id;
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
        userIdToSync = newUserId;
      }

      if (userIdToSync) {
        const targetAccessRole = input.accessRole || (employee as any).accessRole || 'employee';
        const targetDeptId = input.departmentId ?? updated.current_department_id ?? employee.current_department_id;
        await this.syncUserAccessRole(db, ctx, userIdToSync, targetAccessRole, employeeId, targetDeptId);
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
    await this.ensureEmployeeColumns();
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

    const db = getKnex();
    await db.transaction(async (trx) => {
      const timestamp = Date.now();

      // 1. Scramble user email and deactivate
      const user = await trx('users')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', employeeId)
        .first();

      if (user) {
        await trx('users').where('id', user.id).update({
          status: 'inactive',
          email: `${user.email}_del_${timestamp}`.substring(0, 255)
        });
      }

      // 2. Scramble employee unique fields and soft delete
      await trx('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', employeeId)
        .update({
          deleted_at: new Date(),
          status: 'exit',
          employee_code: `${(employee as any).employeeCode || (employee as any).employee_code}_del_${timestamp}`.substring(0, 50),
          email: `${employee.email}_del_${timestamp}`.substring(0, 255)
        });
    });

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
            .whereNull('deleted_at')
            .first();
          if (!mgr) {
            throw new ValidationError(`Reporting Manager with ID '${input.reportingManagerId}' does not exist in your organization`);
          }
        }

        // Skip if employee code already exists in your organization
        const codeExists = await trx('employees')
          .where({ employee_code: input.employeeCode, organization_id: ctx.organizationId })
          .whereNull('deleted_at')
          .first();
        if (codeExists) {
          throw new ValidationError(`Employee with code '${input.employeeCode}' already exists in your organization`);
        }

        // Skip if email already exists
        const emailExists = await trx('users')
          .where({ email: input.email })
          .first();
        if (emailExists) {
          throw new ValidationError(`Employee with email '${input.email}' already exists`);
        }

        // Create employee directly in the transaction to prevent database inconsistency
        const [empId] = await trx('employees').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
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
          created_at: new Date(),
          updated_at: new Date()
        });

        // Fetch the created employee within the transaction context
        const employee = await trx('employees').where('id', empId).first();

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
