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
import { OrgHierarchyService } from './OrgHierarchyService';
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
    salarySlabId?: number | string;
    salary_slab_id?: number | string;
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

    // Helper to get Org Admin's employee ID if no reporting manager is specified
    let finalReportingManagerId = input.reportingManagerId || null;
    if (!finalReportingManagerId && ['department_head', 'hr_manager', 'cto', 'cfo', 'coo', 'cxo'].includes(input.accessRole || 'employee')) {
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

    // Note: the employee who gets a salary slab assigned at creation time
    // (input.salarySlabId) is tracked via salary_structures.slab_id, not a
    // column on employees — the employees table has no salary_slab_id
    // column, so including it here always failed the insert with "Unknown
    // column 'salary_slab_id'". The actual /payroll/structures/assign call
    // that EmployeeCreateModal makes right after this is what persists it.

    // Resolve target company ID (use active company or fallback to parent company for org admin)
    let effectiveCompanyId = ctx.companyId || (input as any).companyId || null;
    if (!effectiveCompanyId) {
      const parentComp = await db('company')
        .where('organization_id', ctx.organizationId)
        .where((b) => b.where('is_parent', 1).orWhere('is_parent', true))
        .whereNull('deleted_at')
        .first();
      if (parentComp) {
        effectiveCompanyId = Number((parentComp as any).companyId || (parentComp as any).company_id || (parentComp as any).id);
      }
    }

    // Create employee
    const employee = await this.employeeRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      company_id: effectiveCompanyId,
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
    const plainPassword = input.password || `${(input.firstName || 'Emp').replace(/\s+/g, '')}@${new Date().getFullYear()}!`;
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
          company_id: effectiveCompanyId,
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
          if (mDesignationId && String(mDesignationId) !== String((input as any).currentDesignationId || (input as any).current_designation_id || input.designationId)) {
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
          { name: 'bank_name', type: 'string', length: 100 },
          { name: 'account_no', type: 'string', length: 50 },
          { name: 'ifsc_code', type: 'string', length: 50 },
          { name: 'company_bank', type: 'string', length: 100 },
          { name: 'branch_name', type: 'string', length: 100 },
          { name: 'pf_no', type: 'string', length: 50 },
          { name: 'uan_no', type: 'string', length: 50 },
          { name: 'esic_no', type: 'string', length: 50 },
          { name: 'pan_status', type: 'string', length: 50 },
          { name: 'user_band', type: 'string', length: 50 },
          { name: 'eligible_for_eps', type: 'string', length: 10 },
          { name: 'background_verification', type: 'string', length: 50 },
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
    const roleCodes = ['employee', 'team_lead', 'hr_manager', 'department_head', 'cto', 'cfo', 'coo', 'cxo', 'intern', 'consultant', 'finance'];
    if (!roleCodes.includes(targetRole)) return;

    // Fetch existing system roles for this organization or platform (organization_id IS NULL)
    const existingRoles = await db('roles')
      .where(function (this: any) {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .whereIn('code', roleCodes);

    const roleMap = new Map<string, number>();
    for (const r of existingRoles) {
      roleMap.set(r.code, r.id);
    }

    const roleNames: Record<string, string> = {
      cto: 'Chief Technology Officer',
      cfo: 'Chief Financial Officer',
      coo: 'Chief Operating Officer',
      cxo: 'Chief Executive Officer / CXO',
      department_head: 'Department Manager',
      team_lead: 'Team Lead',
      hr_manager: 'HR Manager',
      employee: 'Employee',
      intern: 'Intern',
      consultant: 'Consultant',
      finance: 'Finance',
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
      .where('user_id', userId)
      .where(function(this: any) {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .whereIn('role_id', roleIdsToClear)
      .delete();

    // Sync role column on users table directly
    await db('users')
      .where('id', userId)
      .update({ role: targetRole, updated_at: new Date() })
      .catch(() => {});

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
    if (input.reportingManagerId !== undefined || input.reporting_manager_id !== undefined) {
      const targetMgrId = input.reportingManagerId !== undefined ? input.reportingManagerId : input.reporting_manager_id;
      const numTargetId = targetMgrId !== null && targetMgrId !== undefined && String(targetMgrId).trim() !== '' ? Number(targetMgrId) : null;
      const existingMgrId = (employee as any).reporting_manager_id !== null && (employee as any).reporting_manager_id !== undefined ? Number((employee as any).reporting_manager_id) : null;

      if (numTargetId !== existingMgrId) {
        const orgHierarchyService = new OrgHierarchyService();
        await orgHierarchyService.validateReportingManagerUpdate(ctx, Number(employeeId), numTargetId);
      }
      payload.reporting_manager_id = targetMgrId;
    }
    if (input.designationId !== undefined) payload.current_designation_id = input.designationId;
    if (input.departmentId !== undefined) payload.current_department_id = input.departmentId;
    if ((input as any).currentDepartmentId !== undefined) payload.current_department_id = (input as any).currentDepartmentId;
    if ((input as any).current_department_id !== undefined) payload.current_department_id = (input as any).current_department_id;
    if ((input as any).department_id !== undefined) payload.current_department_id = (input as any).department_id;
    if (input.branchId !== undefined) payload.current_branch_id = input.branchId;
    if (input.locationId !== undefined) payload.current_location_id = input.locationId;
    if (input.costCenterId !== undefined) payload.cost_center_id = input.costCenterId;
    if (input.employmentType !== undefined) payload.employment_type = input.employmentType;
    if (input.status !== undefined) payload.status = input.status;
    if (input.dateOfJoining !== undefined) payload.date_of_joining = input.dateOfJoining;
    if (input.dateOfConfirmation !== undefined) payload.date_of_confirmation = input.dateOfConfirmation;
    if (input.probationEndDate !== undefined) payload.probation_end_date = input.probationEndDate;
    if (input.resignationDate !== undefined) payload.resignation_date = input.resignationDate;
    if (input.bankName !== undefined) payload.bank_name = input.bankName;
    if (input.bank_name !== undefined) payload.bank_name = input.bank_name;
    if (input.accountNo !== undefined) payload.account_no = input.accountNo;
    if (input.account_no !== undefined) payload.account_no = input.account_no;
    if (input.accountNumber !== undefined) payload.account_no = input.accountNumber;
    if (input.ifscCode !== undefined) payload.ifsc_code = input.ifscCode;
    if (input.ifsc_code !== undefined) payload.ifsc_code = input.ifsc_code;
    if (input.branchName !== undefined) payload.branch_name = input.branchName;
    if (input.branch_name !== undefined) payload.branch_name = input.branch_name;
    if (input.accountType !== undefined) payload.account_type = input.accountType;
    if (input.account_type !== undefined) payload.account_type = input.account_type;
    if (input.upiId !== undefined) payload.upi_id = input.upiId;
    if (input.upi_id !== undefined) payload.upi_id = input.upi_id;
    // Note: salary slab assignment is tracked via salary_structures.slab_id
    // (see /payroll/structures/assign) — employees has no salary_slab_id
    // column, so writing it here always failed the update.
    // Statutory / compliance fields
    if (input.pf_no !== undefined) payload.pf_no = input.pf_no;
    if (input.pfNo !== undefined) payload.pf_no = input.pfNo;
    if (input.pf_number !== undefined) payload.pf_no = input.pf_number;
    if (input.pfNumber !== undefined) payload.pf_no = input.pfNumber;
    if (input.uan_no !== undefined) payload.uan_no = input.uan_no;
    if (input.uanNo !== undefined) payload.uan_no = input.uanNo;
    if (input.uan_number !== undefined) payload.uan_no = input.uan_number;
    if (input.uanNumber !== undefined) payload.uan_no = input.uanNumber;
    if (input.esic_no !== undefined) payload.esic_no = input.esic_no;
    if (input.esicNo !== undefined) payload.esic_no = input.esicNo;
    if (input.esic_number !== undefined) payload.esic_no = input.esic_number;
    if (input.esicNumber !== undefined) payload.esic_no = input.esicNumber;
    // aadhaar variants
    if (input.aadhaar_number !== undefined) payload.aadhar_number = input.aadhaar_number;
    if (input.aadhaarNumber !== undefined) payload.aadhar_number = input.aadhaarNumber;
    if (input.aadhar_number !== undefined) payload.aadhar_number = input.aadhar_number;
    if (input.aadharNumber !== undefined) payload.aadhar_number = input.aadharNumber;
    if (input.uidaiNumber !== undefined) payload.aadhar_number = input.uidaiNumber;
    if (input.company_bank !== undefined) payload.company_bank = input.company_bank;
    if (input.pan_number !== undefined) payload.pan_number = input.pan_number;
    if (input.panNumber !== undefined) payload.pan_number = input.panNumber;
    if (input.pan !== undefined) payload.pan_number = input.pan;
    if (input.pan_status !== undefined) payload.pan_status = input.pan_status;
    if (input.panStatus !== undefined) payload.pan_status = input.panStatus;
    if (input.user_band !== undefined) payload.user_band = input.user_band;
    if (input.userBand !== undefined) payload.user_band = input.userBand;
    if (input.eligible_for_eps !== undefined) payload.eligible_for_eps = input.eligible_for_eps;
    if (input.eligibleForEps !== undefined) payload.eligible_for_eps = input.eligibleForEps;
    if (input.background_verification !== undefined) payload.background_verification = input.background_verification;
    if (input.backgroundVerification !== undefined) payload.background_verification = input.backgroundVerification;

    const allowedEmployeeColumns = new Set([
      'employee_code', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'mobile',
      'date_of_birth', 'gender', 'blood_group', 'nationality', 'aadhar_number', 'pan_number',
      'passport_number', 'avatar_url', 'bio', 'job_title', 'reporting_manager_id', 'current_designation_id',
      'current_department_id', 'current_branch_id', 'current_location_id', 'cost_center_id',
      'employment_type', 'status', 'date_of_joining', 'date_of_confirmation', 'probation_end_date',
      'resignation_date', 'bank_name', 'account_no', 'ifsc_code', 'company_bank', 'branch_name', 'account_type', 'upi_id',
      'pf_no', 'uan_no', 'esic_no', 'pan_status', 'user_band', 'eligible_for_eps', 'background_verification'
    ]);

    // Copy any direct snake_case properties if passed and valid in employees table
    for (const key of Object.keys(input)) {
      if (allowedEmployeeColumns.has(key) && !(key in payload) && input[key] !== undefined) {
        payload[key] = input[key];
      }
    }

    const targetAccessRole = input.accessRole || input.access_role || input.role || '';

    // Default Manager ('department_head', 'cto', etc.) and HR ('hr_manager') to Admin only if no reporting manager was provided
    if (targetAccessRole && ['department_head', 'hr_manager', 'cto', 'cfo', 'coo', 'cxo'].includes(targetAccessRole) && !input.reportingManagerId && !input.reporting_manager_id) {
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
        .where('employee_id', employeeId)
        .first();

      const targetEmail = (input.email || updated.email || employee.email || '').trim();

      if (!existingUser && targetEmail) {
        existingUser = await db('users')
          .whereRaw('LOWER(email) = ?', [targetEmail.toLowerCase()])
          .first();
      }

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
      const targetAccessRole = input.accessRole || input.access_role || input.role || 'employee';

      if (existingUser) {
        userIdToSync = existingUser.id;
        const userUpdateData: Record<string, any> = {
          updated_at: new Date(),
          role: targetAccessRole,
          employee_id: employeeId,
        };
        if (targetEmail) userUpdateData.email = targetEmail;
        if (hashedPassword) userUpdateData.password_hash = hashedPassword;
        await db('users').where('id', existingUser.id).update(userUpdateData);
      } else if (targetEmail) {
        const defaultHash = hashedPassword || await hash('Password@123', {
          type: 2,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });
        const [newUserId] = await db('users').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          email: targetEmail,
          password_hash: defaultHash,
          role: targetAccessRole,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        userIdToSync = newUserId;
      }

      if (userIdToSync) {
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
  async getEmployee(ctx: TenantContext, employeeId: number | string): Promise<Employee> {
    await this.ensureEmployeeColumns();
    const db = getKnex();
    const strVal = String(employeeId || '').trim();
    const numericId = parseInt(strVal, 10);
    let employee: Employee | null = null;

    if (!isNaN(numericId) && numericId > 0) {
      employee = await this.employeeRepo.getById(ctx, numericId).catch(() => null);
      if (!employee) {
        // Fallback 1: Check if numericId is a user ID in users table
        const user = await db('users').where({ id: numericId }).first().catch(() => null);
        if (user && user.employee_id) {
          employee = await this.employeeRepo.getById(ctx, user.employee_id).catch(() => null);
        }
        if (!employee && user && user.email) {
          employee = await this.employeeRepo.getByEmail(ctx, user.email).catch(() => null);
        }
      }
    }

    // Fallback 2: Lookup by email, employeeCode, or UUID string
    if (!employee && strVal) {
      if (strVal.includes('@')) {
        employee = await this.employeeRepo.getByEmail(ctx, strVal).catch(() => null);
      } else {
        employee = await this.employeeRepo.getByCode(ctx, strVal).catch(() => null);
        if (!employee) {
          employee = (await db('employees')
            .where({ organization_id: ctx.organizationId })
            .whereNull('deleted_at')
            .where('uuid', strVal)
            .first()
            .catch(() => null)) as Employee | null;
        }
      }
    }

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

  async createEmployeesBulk(ctx: TenantContext, inputs: Array<any>): Promise<{
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const db = getKnex();
    const errors: Array<{ row: number; error: string }> = [];
    let imported = 0;
    let failed = 0;

    // ── Pre-resolve master data caches (outside per-row transactions) ──
    // This avoids unique key constraint violations when multiple rows share the same
    // new department/grade/designation that doesn't exist yet in the database.

    // Cache maps: normalizedName -> id
    const deptCache = new Map<string, number>();
    const gradeCache = new Map<string, number>();
    const desigCache = new Map<string, number>();
    const roleCache = new Map<string, number>();

    // Seed caches from existing DB rows
    const existingDepts = await db('departments').where('organization_id', ctx.organizationId).whereNull('deleted_at').select('id', 'name', 'code');
    for (const d of existingDepts) { deptCache.set(d.name.trim().toLowerCase(), d.id); deptCache.set(d.code.trim().toLowerCase(), d.id); }

    const existingGrades = await db('grades').where('organization_id', ctx.organizationId).whereNull('deleted_at').select('id', 'name', 'code');
    for (const g of existingGrades) { gradeCache.set(g.name.trim().toLowerCase(), g.id); gradeCache.set(g.code.trim().toLowerCase(), g.id); }

    const existingDesigs = await db('designations').where('organization_id', ctx.organizationId).whereNull('deleted_at').select('id', 'name', 'code');
    for (const d of existingDesigs) { desigCache.set(d.name.trim().toLowerCase(), d.id); desigCache.set(d.code.trim().toLowerCase(), d.id); }

    const existingRoles = await db('roles')
      .where(function() { this.where('organization_id', ctx.organizationId).orWhereNull('organization_id'); })
      .whereNull('deleted_at').select('id', 'name', 'code');
    for (const r of existingRoles) { roleCache.set(r.name.trim().toLowerCase(), r.id); if (r.code) roleCache.set(r.code.trim().toLowerCase(), r.id); }

    // Helper to get or create a department (uses cache to prevent duplicate inserts)
    const getOrCreateDept = async (name: string): Promise<number> => {
      const key = name.trim().toLowerCase();
      if (deptCache.has(key)) return deptCache.get(key)!;
      const code = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);
      // Ensure code is unique by checking cache
      let finalCode = code;
      let suffix = 1;
      while ([...deptCache.keys()].some(k => k === finalCode.toLowerCase())) {
        finalCode = `${code.substring(0, 47)}_${suffix++}`;
      }
      const [newId] = await db('departments').insert({ uuid: uuidv4(), organization_id: ctx.organizationId, name: name.trim(), code: finalCode, status: 'active', created_by: ctx.userId, updated_by: ctx.userId, created_at: new Date(), updated_at: new Date() });
      deptCache.set(key, newId);
      deptCache.set(finalCode.toLowerCase(), newId);
      return newId;
    };

    const getOrCreateGrade = async (name: string): Promise<number> => {
      const key = name.trim().toLowerCase();
      if (gradeCache.has(key)) return gradeCache.get(key)!;
      const code = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);
      let finalCode = code;
      let suffix = 1;
      while ([...gradeCache.keys()].some(k => k === finalCode.toLowerCase())) {
        finalCode = `${code.substring(0, 47)}_${suffix++}`;
      }
      const [newId] = await db('grades').insert({ uuid: uuidv4(), organization_id: ctx.organizationId, name: name.trim(), code: finalCode, status: 'active', created_by: ctx.userId, updated_by: ctx.userId, created_at: new Date(), updated_at: new Date() });
      gradeCache.set(key, newId);
      gradeCache.set(finalCode.toLowerCase(), newId);
      return newId;
    };

    const getOrCreateDesig = async (name: string, deptId: number | null): Promise<number> => {
      const key = name.trim().toLowerCase();
      if (desigCache.has(key)) return desigCache.get(key)!;
      const code = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);
      let finalCode = code;
      let suffix = 1;
      while ([...desigCache.keys()].some(k => k === finalCode.toLowerCase())) {
        finalCode = `${code.substring(0, 47)}_${suffix++}`;
      }
      const [newId] = await db('designations').insert({ uuid: uuidv4(), organization_id: ctx.organizationId, name: name.trim(), code: finalCode, department_id: deptId, status: 'active', created_by: ctx.userId, updated_by: ctx.userId, created_at: new Date(), updated_at: new Date() });
      desigCache.set(key, newId);
      desigCache.set(finalCode.toLowerCase(), newId);
      return newId;
    };

    const getOrCreateRole = async (name: string): Promise<number> => {
      const key = name.trim().toLowerCase();
      if (roleCache.has(key)) return roleCache.get(key)!;
      const code = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
      const [newId] = await db('roles').insert({ uuid: uuidv4(), organization_id: ctx.organizationId, name: name.trim(), code, is_system: false, is_platform_role: false, is_default: false, created_at: new Date(), updated_at: new Date() });
      roleCache.set(key, newId);
      roleCache.set(code, newId);
      return newId;
    };

    // ── Per-row processing ──────────────────────────────────────────────────────
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const rowNum = i + 1;

      // Skip completely blank rows
      const isBlank = Object.values(input).every(
        (val) => val === null || val === undefined || String(val).trim() === ''
      );
      if (isBlank) continue;

      try {
        await withTransaction(async (trx) => {
          // 1. Mandatory Field Validations
          if (!input.employeeCode?.trim()) throw new ValidationError('Employee Code is required');
          if (!input.email?.trim()) throw new ValidationError('Email Address is required');
          if (!input.firstName?.trim()) throw new ValidationError('First Name is required');
          if (!input.lastName?.trim()) throw new ValidationError('Last Name is required');
          if (!input.dateOfJoining?.trim()) throw new ValidationError('Date of Joining is required');
          if (!input.email?.trim() || !/\S+@\S+\.\S+/.test(input.email.trim())) {
            throw new ValidationError('Valid Email Address is required');
          }
          if (!input.password?.trim()) throw new ValidationError('Password is required');
          if (input.password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters long');
          }

          if (input.confirmPassword?.trim() && input.password.trim() !== input.confirmPassword.trim()) {
            throw new ValidationError('Passwords do not match');
          }

          // Duplicate checks
          const codeExists = await trx('employees')
            .where({ employee_code: input.employeeCode.trim(), organization_id: ctx.organizationId })
            .whereNull('deleted_at')
            .first();
          if (codeExists) {
            throw new ValidationError(`Employee Code already exists`);
          }

          const emailExists = await trx('users')
            .where({ email: input.email.trim() })
            .first();
          if (emailExists) {
            throw new ValidationError(`Email already exists`);
          }

          // Also check email uniqueness in employees table
          const empEmailExists = await trx('employees')
            .where({ email: input.email.trim(), organization_id: ctx.organizationId })
            .whereNull('deleted_at')
            .first();
          if (empEmailExists) {
            throw new ValidationError(`Email already exists in employees`);
          }

          // Optional mobile validation
          let mobileVal = input.mobile?.trim() || null;
          if (mobileVal) {
            const mobileRegex = /^[0-9]{10}$/;
            if (!mobileRegex.test(mobileVal)) {
              throw new ValidationError('Mobile number must be exactly 10 digits');
            }
          }

          // Optional gender format check
          let normalizedGender = null;
          if (input.gender?.trim()) {
            const genLower = input.gender.trim().toLowerCase();
            if (!['male', 'female', 'other'].includes(genLower)) {
              throw new ValidationError('Gender must be Male, Female, or Other');
            }
            normalizedGender = genLower;
          }

          // Optional Employment Type format check
          let normalizedEmploymentType = 'full_time';
          if (input.employmentType?.trim()) {
            const etInput = input.employmentType.trim().toLowerCase().replace(/_/g, ' ');
            if (etInput === 'full time') normalizedEmploymentType = 'full_time';
            else if (etInput === 'part time') normalizedEmploymentType = 'part_time';
            else if (etInput === 'contract') normalizedEmploymentType = 'contract';
            else if (etInput === 'intern' || etInput === 'internship') normalizedEmploymentType = 'internship';
            else {
              throw new ValidationError('Employment Type must be Full Time, Part Time, Contract, or Intern');
            }
          }

          // Date format validation
          const dateOfJoining = input.dateOfJoining.trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfJoining)) {
            throw new ValidationError('Invalid Date of Joining format (expected YYYY-MM-DD)');
          }

          // ── Resolve master data via caches (no per-row DB inserts for new masters) ──
          let deptId: number | null = input.departmentId || null;
          if (input.department && typeof input.department === 'string' && input.department.trim()) {
            deptId = await getOrCreateDept(input.department.trim());
          }

          let gradeId: number | null = null;
          if (input.grade && typeof input.grade === 'string' && input.grade.trim()) {
            gradeId = await getOrCreateGrade(input.grade.trim());
          }

          let designationId: number | null = input.designationId || null;
          if (input.designation && typeof input.designation === 'string' && input.designation.trim()) {
            designationId = await getOrCreateDesig(input.designation.trim(), deptId);
          }

          // Resolve Role
          const roleName = input.role?.trim() || input.accessRole?.trim() || 'Employee';
          let roleId: number;
          const cachedRoleId = roleCache.get(roleName.trim().toLowerCase());
          if (cachedRoleId) {
            roleId = cachedRoleId;
          } else {
            roleId = await getOrCreateRole(roleName);
          }

          // Resolve Reports To (Manager by email, code, or name) - graceful fallback
          let reportingManagerId: number | null = input.reportingManagerId || null;
          if (input.reportsTo && typeof input.reportsTo === 'string' && input.reportsTo.trim()) {
            const mgr = await trx('employees')
              .where('organization_id', ctx.organizationId)
              .whereNull('deleted_at')
              .andWhere(function() {
                this.where('employee_code', input.reportsTo.trim())
                    .orWhere('email', input.reportsTo.trim());
              })
              .first();
            if (mgr) reportingManagerId = mgr.id;
          }

          // Insert Employee
          const [empId] = await trx('employees').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            company_id: ctx.companyId || null,
            employee_code: input.employeeCode.trim(),
            first_name: input.firstName.trim(),
            last_name: input.lastName.trim(),
            email: input.email.trim(),
            mobile: mobileVal,
            gender: normalizedGender,
            date_of_joining: dateOfJoining,
            employment_type: normalizedEmploymentType,
            current_designation_id: designationId,
            current_department_id: deptId,
            reporting_manager_id: reportingManagerId,
            status: input.status || 'active',
            created_by: ctx.userId,
            updated_by: ctx.userId,
            created_at: new Date(),
            updated_at: new Date()
          });

          // Generate Password Hash
          const hashedPassword = await hash(input.password.trim(), {
            type: 2, // argon2id
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
          });

          // Create User
          const [userId] = await trx('users').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            company_id: ctx.companyId || null,
            employee_id: empId,
            email: input.email.trim(),
            password_hash: hashedPassword,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Assign Role to User
          await trx('user_roles').insert({
            organization_id: ctx.organizationId,
            user_id: userId,
            role_id: roleId,
            assigned_by: ctx.userId,
            assigned_at: new Date(),
          });

          // Audit Log (non-blocking)
          await this.auditService.log(ctx, {
            action: 'CREATE',
            entityType: 'EMPLOYEE',
            entityId: empId,
            afterState: {
              employeeCode: input.employeeCode.trim(),
              firstName: input.firstName.trim(),
              email: input.email.trim(),
            },
          });
        });
        imported++;
      } catch (err: any) {
        console.error(`Bulk Import Row ${rowNum} Error:`, err?.message || err);
        failed++;
        errors.push({ row: rowNum, error: err.message || 'Unknown error during import' });
      }
    }

    return {
      total: inputs.length,
      imported,
      failed,
      errors,
    };
  }

  /**
   * Submit a profile update request (Employee side)
   */
  async createProfileUpdateRequest(ctx: TenantContext, input: {
    employeeId?: number;
    requestType?: 'personal_info' | 'contact' | 'bank_details' | 'emergency_contact';
    targetArea?: string;
    requestedChanges: string;
    reason: string;
  }) {
    const db = getKnex();
    const uuid = uuidv4();

    let empId = input.employeeId;
    if (!empId && ctx.userId) {
      const user = await db('users').where('id', ctx.userId).first();
      empId = user?.employee_id;
      if (!empId && user?.email) {
        const emp = await db('employees').whereRaw('LOWER(email) = ?', [user.email.toLowerCase()]).first();
        empId = emp?.id;
      }
    }

    if (!empId) {
      throw new Error('Employee profile not linked to user account.');
    }

    const empObj = await db('employees').where('id', empId).first();
    const orgId = ctx.organizationId || empObj?.organization_id || 8;
    const compId = ctx.companyId || empObj?.company_id || null;

    const reqType = input.requestType || 'personal_info';

    const [id] = await db('employee_profile_update_requests').insert({
      uuid,
      organization_id: orgId,
      company_id: compId,
      employee_id: empId,
      request_type: reqType,
      profile_section: input.targetArea || 'General Profile Information',
      reason: input.reason,
      requested_value: JSON.stringify({
        targetArea: input.targetArea || 'General Profile Information',
        requestedChanges: input.requestedChanges,
        reason: input.reason,
      }),
      status: 'pending',
      submitted_at: new Date(),
      created_by: ctx.userId || 1,
      updated_by: ctx.userId || 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return { id, uuid, success: true, message: 'Profile edit request submitted successfully.' };
  }

  /**
   * Get list of profile update requests
   */
  async getProfileUpdateRequests(ctx: TenantContext, companyId?: number) {
    const db = getKnex();
    let query = db('employee_profile_update_requests as pr')
      .join('employees as e', 'pr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('company as c', 'pr.company_id', 'c.company_id')
      .select(
        'pr.id',
        'pr.uuid',
        'pr.request_type as requestType',
        'pr.profile_section as profileSection',
        'pr.reason as reason',
        'pr.requested_value as requestedValue',
        'pr.status',
        'pr.rejection_reason as rejectionReason',
        'pr.submitted_at as submittedAt',
        'pr.approved_at as approvedAt',
        'pr.approved_by as approvedBy',
        'e.id as employeeId',
        'e.first_name as firstName',
        'e.last_name as lastName',
        'e.employee_code as employeeCode',
        'e.avatar_url as avatarUrl',
        'd.name as departmentName',
        'c.name as companyName'
      )
      .where('pr.organization_id', ctx.organizationId || 8)
      .whereNull('pr.deleted_at')
      .orderBy('pr.id', 'desc');

    if (companyId) {
      query = query.where((q) => q.where('pr.company_id', companyId).orWhereNull('pr.company_id'));
    }

    const rows = await query;
    return rows.map((r: any) => {
      let parsedVal: any = {};
      try {
        parsedVal = typeof r.requestedValue === 'string' ? JSON.parse(r.requestedValue) : (r.requestedValue || {});
      } catch (e) {
        parsedVal = {};
      }
      return {
        id: r.id,
        reqId: `PRF-${String(r.id).padStart(4, '0')}`,
        uuid: r.uuid,
        requestType: r.requestType,
        profileSection: r.profileSection || parsedVal.targetArea || 'General',
        reason: r.reason || parsedVal.reason || '',
        requestedChanges: parsedVal.requestedChanges || '',
        employeeId: r.employeeId,
        employeeName: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Employee',
        employeeCode: r.employeeCode || `EMP${r.employeeId}`,
        departmentName: r.departmentName || '-',
        companyName: r.companyName || '-',
        avatarUrl: r.avatarUrl,
        submittedAt: r.submittedAt,
        approvedAt: r.approvedAt,
        status: (r.status || 'pending').toLowerCase(),
        rejectionReason: r.rejectionReason,
      };
    });
  }

  /**
   * Update profile update request status (Approve / Reject)
   */
  async updateProfileUpdateRequestStatus(ctx: TenantContext, id: number, status: 'approved' | 'rejected', reason?: string) {
    const db = getKnex();
    await db('employee_profile_update_requests')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .update({
        status,
        rejection_reason: reason || null,
        approved_at: status === 'approved' ? new Date() : null,
        approved_by: status === 'approved' ? (ctx.userId || 1) : null,
        updated_at: new Date(),
        updated_by: ctx.userId || 1,
      });

    return { success: true, message: `Profile update request ${status}.` };
  }

  /**
   * Get the logged-in employee's own profile update request history
   */
  async getMyProfileUpdateRequests(empId: number) {
    const db = getKnex();
    const rows = await db('employee_profile_update_requests as pr')
      .select(
        'pr.id',
        'pr.profile_section as profileSection',
        'pr.reason',
        'pr.requested_value as requestedValue',
        'pr.status',
        'pr.rejection_reason as rejectionReason',
        'pr.submitted_at as submittedAt',
        'pr.approved_at as approvedAt',
      )
      .where('pr.employee_id', empId)
      .whereNull('pr.deleted_at')
      .orderBy('pr.id', 'desc');

    return rows.map((r: any) => {
      let parsedVal: any = {};
      try {
        parsedVal = typeof r.requestedValue === 'string' ? JSON.parse(r.requestedValue) : (r.requestedValue || {});
      } catch { parsedVal = {}; }
      return {
        id: r.id,
        reqId: `PRF-${String(r.id).padStart(4, '0')}`,
        profileSection: r.profileSection || parsedVal.targetArea || 'General',
        reason: r.reason || parsedVal.reason || '',
        requestedChanges: parsedVal.requestedChanges || '',
        status: (r.status || 'pending').toLowerCase(),
        rejectionReason: r.rejectionReason,
        submittedAt: r.submittedAt,
        approvedAt: r.approvedAt,
      };
    });
  }
}

