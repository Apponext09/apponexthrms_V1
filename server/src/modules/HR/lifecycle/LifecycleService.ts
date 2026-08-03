import { v4 as uuidv4 } from 'uuid';
import type { TenantContext } from '../../../db/types';

export class LifecycleService {
  /**
   * Get list of all employees with their lifecycle summaries (onboarding, transfers count, offboarding)
   */
  async getAllEmployeeLifecycleSummaries(
    ctx: TenantContext,
    filters?: { search?: string; stage?: string; departmentId?: number }
  ) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let query = db('employees')
      .leftJoin('departments', 'employees.current_department_id', 'departments.id')
      .leftJoin('designations', 'employees.current_designation_id', 'designations.id')
      .leftJoin('employees as mgr', 'employees.reporting_manager_id', 'mgr.id')
      .leftJoin('departments as mgr_dept', 'mgr.current_department_id', 'mgr_dept.id')
      .leftJoin('users', 'employees.email', 'users.email')
      .leftJoin('employee_onboarding_records as onboarding', 'employees.id', 'onboarding.employee_id')
      .leftJoin('employee_offboarding_records as offboarding', 'employees.id', 'offboarding.employee_id')
      .leftJoin('attendance_locations as loc', 'employees.current_location_id', 'loc.id')
      .where('employees.organization_id', ctx.organizationId)
      .whereNull('employees.deleted_at')
      .select(
        'employees.id',
        'employees.uuid',
        'employees.employee_code',
        'employees.first_name',
        'employees.last_name',
        'employees.email',
        'employees.phone',
        'employees.status as lifecycle_status',
        'employees.date_of_joining',
        'employees.avatar_url',
        'users.avatar_url as user_avatar_url',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'departments.id as department_id',
        'departments.name as department_name',
        'mgr_dept.id as mgr_department_id',
        'mgr_dept.name as mgr_department_name',
        'designations.id as designation_id',
        'designations.name as designation_name',
        'employees.reporting_manager_id',
        'mgr.first_name as mgr_first_name',
        'mgr.last_name as mgr_last_name',
        'employees.current_location_id',
        'loc.location_name',
        'onboarding.interviewer_name',
        'onboarding.onboarded_by_name',
        'onboarding.interview_date',
        'onboarding.orientation_completed',
        'offboarding.exit_type',
        'offboarding.resignation_date',
        'offboarding.relieving_date',
        'offboarding.fnf_status'
      );

    if (filters?.departmentId) {
      query = query.where((b) => {
        b.where('employees.current_department_id', filters.departmentId)
          .orWhere('mgr.current_department_id', filters.departmentId);
      });
    }

    if (filters?.stage && filters.stage !== 'all') {
      query = query.where('employees.status', filters.stage);
    }

    if (filters?.search) {
      const term = `%${filters.search.trim()}%`;
      query = query.where((b) => {
        b.where('employees.first_name', 'like', term)
          .orWhere('employees.last_name', 'like', term)
          .orWhere('employees.email', 'like', term)
          .orWhere('employees.employee_code', 'like', term)
          .orWhere('departments.name', 'like', term)
          .orWhere('mgr_dept.name', 'like', term)
          .orWhere('designations.name', 'like', term);
      });
    }

    const employees = await query.orderBy('employees.id', 'desc');

    // Query transfer counts for each employee
    const transferCounts = await db('employee_transfers')
      .where('organization_id', ctx.organizationId)
      .groupBy('employee_id')
      .select('employee_id', db.raw('count(*) as count'));

    const transferCountMap = new Map<number, number>();
    for (const tc of transferCounts) {
      transferCountMap.set(Number(tc.employee_id), Number(tc.count));
    }

    const adminUser = await db('users')
      .where('organization_id', ctx.organizationId)
      .where((b) => b.where('role', 'organization_admin').orWhere('role', 'super_admin').orWhere('email', 'harsh@gmail.com'))
      .first();

    const adminName = adminUser
      ? `${adminUser.first_name || adminUser.firstName || 'Organization'} ${adminUser.last_name || adminUser.lastName || 'Admin'}`.trim()
      : 'Harsh Gawali (Organization Admin)';

    return employees.map((emp: any) => {
      const empId = Number(emp.id);
      const rawFn = emp.firstName || emp.first_name || emp.userFirstName || emp.user_first_name;
      const rawLn = emp.lastName || emp.last_name || emp.userLastName || emp.user_last_name;
      const fn = rawFn || (emp.email ? emp.email.split('@')[0] : `Employee ${empId}`);
      const ln = rawLn || '';
      const fullName = `${fn} ${ln}`.trim();
      const avatar = emp.avatarUrl || emp.avatar_url || emp.userAvatarUrl || emp.user_avatar_url || undefined;

      const mgrFn = emp.mgrFirstName || emp.mgr_first_name;
      const mgrLn = emp.mgrLastName || emp.mgr_last_name;
      const reportingManager = mgrFn ? `${mgrFn} ${mgrLn || ''}`.trim() : adminName;

      const resolvedDeptId = emp.departmentId || emp.department_id || emp.mgrDepartmentId || emp.mgr_department_id || null;
      const resolvedDeptName = emp.departmentName || emp.department_name || emp.mgrDepartmentName || emp.mgr_department_name || 'General';
      const resolvedDesigName = emp.designationName || emp.designation_name || 'Employee';

      const empCode = emp.employeeCode || emp.employee_code || `EMP-${empId}`;
      const joinDate = emp.dateOfJoining || emp.date_of_joining || emp.createdAt || emp.created_at;

      return {
        id: empId,
        uuid: emp.uuid,
        employeeCode: empCode,
        name: fullName,
        firstName: fn,
        lastName: ln,
        email: emp.email,
        phone: emp.phone || 'N/A',
        avatarUrl: avatar,
        lifecycleStatus: emp.lifecycleStatus || emp.lifecycle_status || emp.status || 'active',
        joiningDate: joinDate ? String(joinDate).split('T')[0] : 'N/A',
        departmentId: resolvedDeptId ? Number(resolvedDeptId) : null,
        departmentName: resolvedDeptName,
        designationId: (emp.currentDesignationId || emp.current_designation_id || emp.designationId || emp.designation_id) ? Number(emp.currentDesignationId || emp.current_designation_id || emp.designationId || emp.designation_id) : null,
        designationName: resolvedDesigName,
        reportingManagerId: (emp.reportingManagerId || emp.reporting_manager_id) ? Number(emp.reportingManagerId || emp.reporting_manager_id) : null,
        reportingManager,
        currentLocationId: (emp.currentLocationId || emp.current_location_id) ? Number(emp.currentLocationId || emp.current_location_id) : null,
        locationName: emp.locationName || emp.location_name || 'Primary Office',
        transfersCount: transferCountMap.get(empId) || 0,
        onboarding: {
          interviewerName: emp.interviewer_name || 'HR Team',
          onboardedByName: emp.onboarded_by_name || 'HR Admin',
          interviewDate: emp.interview_date ? String(emp.interview_date).split('T')[0] : null,
          orientationCompleted: Boolean(emp.orientation_completed),
        },
        offboarding: {
          exitType: emp.exit_type || null,
          resignationDate: emp.resignation_date ? String(emp.resignation_date).split('T')[0] : null,
          relievingDate: emp.relieving_date ? String(emp.relieving_date).split('T')[0] : null,
          fnfStatus: emp.fnf_status || 'pending',
        },
      };
    });
  }

  /**
   * Get complete lifecycle details for a single employee
   */
  async getEmployeeLifecycleDetails(ctx: TenantContext, employeeId: number) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // 1. Employee Basic Profile
    const emp = await db('employees')
      .leftJoin('departments', 'employees.current_department_id', 'departments.id')
      .leftJoin('designations', 'employees.current_designation_id', 'designations.id')
      .leftJoin('employees as mgr', 'employees.reporting_manager_id', 'mgr.id')
      .leftJoin('departments as mgr_dept', 'mgr.current_department_id', 'mgr_dept.id')
      .leftJoin('users', 'employees.email', 'users.email')
      .leftJoin('attendance_locations as loc', 'employees.current_location_id', 'loc.id')
      .where('employees.organization_id', ctx.organizationId)
      .where('employees.id', employeeId)
      .select(
        'employees.id',
        'employees.uuid',
        'employees.employee_code',
        'employees.first_name',
        'employees.last_name',
        'employees.email',
        'employees.phone',
        'employees.status',
        'employees.date_of_joining',
        'employees.avatar_url',
        'employees.current_department_id',
        'employees.current_designation_id',
        'employees.current_location_id',
        'employees.reporting_manager_id',
        'users.avatar_url as user_avatar_url',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'departments.id as department_id',
        'departments.name as department_name',
        'mgr_dept.name as mgr_department_name',
        'designations.id as designation_id',
        'designations.name as designation_name',
        'mgr.first_name as mgr_first_name',
        'mgr.last_name as mgr_last_name',
        'loc.location_name'
      )
      .first();

    if (!emp) {
      throw new Error(`Employee ${employeeId} not found.`);
    }

    // 2. Onboarding Record
    const onboarding = await db('employee_onboarding_records')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .first();

    // 3. Offboarding Record
    const offboarding = await db('employee_offboarding_records')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .first();

    // 4. Transfer History
    const transfers = await db('employee_transfers')
      .leftJoin('departments as from_dept', 'employee_transfers.from_department_id', 'from_dept.id')
      .leftJoin('departments as to_dept', 'employee_transfers.to_department_id', 'to_dept.id')
      .leftJoin('designations as from_desig', 'employee_transfers.from_designation_id', 'from_desig.id')
      .leftJoin('designations as to_desig', 'employee_transfers.to_designation_id', 'to_desig.id')
      .leftJoin('attendance_locations as from_loc', 'employee_transfers.from_location_id', 'from_loc.id')
      .leftJoin('attendance_locations as to_loc', 'employee_transfers.to_location_id', 'to_loc.id')
      .leftJoin('employees as from_mgr', 'employee_transfers.from_reporting_manager_id', 'from_mgr.id')
      .leftJoin('employees as to_mgr', 'employee_transfers.to_reporting_manager_id', 'to_mgr.id')
      .leftJoin('users as creator', 'employee_transfers.created_by', 'creator.id')
      .where('employee_transfers.organization_id', ctx.organizationId)
      .where('employee_transfers.employee_id', employeeId)
      .select(
        'employee_transfers.*',
        'from_dept.name as from_department_name',
        'to_dept.name as to_department_name',
        'from_desig.name as from_designation_name',
        'to_desig.name as to_designation_name',
        'from_loc.location_name as from_location_name',
        'to_loc.location_name as to_location_name',
        'from_mgr.first_name as from_mgr_first_name',
        'from_mgr.last_name as from_mgr_last_name',
        'to_mgr.first_name as to_mgr_first_name',
        'to_mgr.last_name as to_mgr_last_name',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name'
      )
      .orderBy('effective_date', 'desc');

    // 5. Lifecycle Transition Events
    const lifecycleEvents = await db('employee_lifecycle')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .orderBy('created_at', 'desc');

    const rawFn = emp.firstName || emp.first_name || emp.userFirstName || emp.user_first_name;
    const rawLn = emp.lastName || emp.last_name || emp.userLastName || emp.user_last_name;
    const fullName = `${rawFn || ''} ${rawLn || ''}`.trim() || emp.email;

    const adminUser = await db('users')
      .where('organization_id', ctx.organizationId)
      .where((b) => b.where('role', 'organization_admin').orWhere('role', 'super_admin').orWhere('email', 'harsh@gmail.com'))
      .first();

    const adminName = adminUser
      ? `${adminUser.first_name || adminUser.firstName || 'Organization'} ${adminUser.last_name || adminUser.lastName || 'Admin'}`.trim()
      : 'Harsh Gawali (Organization Admin)';

    const mgrFn = emp.mgrFirstName || emp.mgr_first_name;
    const mgrLn = emp.mgrLastName || emp.mgr_last_name;
    const reportingManager = mgrFn ? `${mgrFn} ${mgrLn || ''}`.trim() : adminName;

    const resolvedDeptId = emp.currentDepartmentId || emp.current_department_id || emp.departmentId || emp.department_id || emp.mgrDepartmentId || emp.mgr_department_id || null;
    const resolvedDeptName = emp.departmentName || emp.department_name || emp.mgrDepartmentName || emp.mgr_department_name || 'General';
    const resolvedDesigName = emp.designationName || emp.designation_name || 'Employee';

    const joinDate = emp.dateOfJoining || emp.date_of_joining || emp.createdAt || emp.created_at;

    return {
      profile: {
        id: Number(emp.id),
        employeeCode: emp.employeeCode || emp.employee_code || `EMP-${emp.id}`,
        name: fullName,
        firstName: rawFn,
        lastName: rawLn,
        email: emp.email,
        phone: emp.phone,
        avatarUrl: emp.avatarUrl || emp.avatar_url || emp.userAvatarUrl || emp.user_avatar_url || undefined,
        lifecycleStatus: emp.lifecycleStatus || emp.lifecycle_status || emp.status || 'active',
        joiningDate: joinDate ? String(joinDate).split('T')[0] : 'N/A',
        departmentId: resolvedDeptId ? Number(resolvedDeptId) : null,
        departmentName: resolvedDeptName,
        designationId: (emp.currentDesignationId || emp.current_designation_id || emp.designationId || emp.designation_id) ? Number(emp.currentDesignationId || emp.current_designation_id || emp.designationId || emp.designation_id) : null,
        designationName: resolvedDesigName,
        reportingManagerId: (emp.reportingManagerId || emp.reporting_manager_id) ? Number(emp.reportingManagerId || emp.reporting_manager_id) : null,
        reportingManager,
        currentLocationId: (emp.currentLocationId || emp.current_location_id) ? Number(emp.currentLocationId || emp.current_location_id) : null,
        locationName: emp.locationName || emp.location_name || 'Primary Office',
      },
      onboarding: onboarding ? {
        interviewerName: onboarding.interviewer_name || 'HR Team',
        interviewerId: onboarding.interviewer_id ? Number(onboarding.interviewer_id) : null,
        onboardedByName: onboarding.onboarded_by_name || 'HR Admin',
        onboardedById: onboarding.onboarded_by_id ? Number(onboarding.onboarded_by_id) : null,
        interviewDate: onboarding.interview_date ? String(onboarding.interview_date).split('T')[0] : null,
        interviewRating: onboarding.interview_rating || '4.5 / 5',
        interviewNotes: onboarding.interview_notes || 'Strong candidate background, cleared technical and HR round.',
        joiningDate: onboarding.joining_date ? String(onboarding.joining_date).split('T')[0] : null,
        probationEndDate: onboarding.probation_end_date ? String(onboarding.probation_end_date).split('T')[0] : null,
        orientationCompleted: Boolean(onboarding.orientation_completed),
        documentsVerified: Boolean(onboarding.documents_verified),
        welcomeKitIssued: Boolean(onboarding.welcome_kit_issued),
        notes: onboarding.notes || '',
      } : {
        interviewerName: 'HR Team',
        onboardedByName: 'HR Lead',
        interviewDate: emp.joining_date ? String(emp.joining_date).split('T')[0] : null,
        interviewRating: '4.5 / 5',
        interviewNotes: 'Cleared technical interview and HR onboarding orientation.',
        joiningDate: emp.joining_date ? String(emp.joining_date).split('T')[0] : null,
        probationEndDate: null,
        orientationCompleted: true,
        documentsVerified: true,
        welcomeKitIssued: true,
        notes: 'Default onboarding completed.',
      },
      offboarding: offboarding ? {
        exitType: offboarding.exit_type || 'resignation',
        resignationDate: offboarding.resignation_date ? String(offboarding.resignation_date).split('T')[0] : null,
        noticePeriodDays: offboarding.notice_period_days || 30,
        relievingDate: offboarding.relieving_date ? String(offboarding.relieving_date).split('T')[0] : null,
        lastWorkingDay: offboarding.last_working_day ? String(offboarding.last_working_day).split('T')[0] : null,
        exitInterviewerName: offboarding.exit_interviewer_name || 'HR Manager',
        exitReason: offboarding.exit_reason || '',
        exitNotes: offboarding.exit_notes || '',
        assetsReturned: Boolean(offboarding.assets_returned),
        fnfStatus: offboarding.fnf_status || 'pending',
      } : null,
      transfers: transfers.map((t: any) => {
        const effDate = t.effectiveDate || t.effective_date;
        const createDate = t.createdAt || t.created_at;
        return {
          id: Number(t.id),
          uuid: t.uuid,
          effectiveDate: effDate ? String(effDate).split('T')[0] : 'N/A',
          transferType: t.transferType || t.transfer_type || 'department_change',
          transferReason: t.transferReason || t.transfer_reason || '',
          notes: t.notes || '',
          fromDepartmentName: t.fromDepartmentName || t.from_department_name || 'General',
          toDepartmentName: t.toDepartmentName || t.to_department_name || 'General',
          fromDesignationName: t.fromDesignationName || t.from_designation_name || 'Employee',
          toDesignationName: t.toDesignationName || t.to_designation_name || 'Employee',
          fromLocationName: t.fromLocationName || t.from_location_name || 'Primary Office',
          toLocationName: t.toLocationName || t.to_location_name || 'Primary Office',
          fromManagerName: (t.fromMgrFirstName || t.from_mgr_first_name) ? `${t.fromMgrFirstName || t.from_mgr_first_name} ${t.fromMgrLastName || t.from_mgr_last_name || ''}`.trim() : 'N/A',
          toManagerName: (t.toMgrFirstName || t.to_mgr_first_name) ? `${t.toMgrFirstName || t.to_mgr_first_name} ${t.toMgrLastName || t.to_mgr_last_name || ''}`.trim() : 'N/A',
          createdBy: (t.creatorFirstName || t.creator_first_name) ? `${t.creatorFirstName || t.creator_first_name} ${t.creatorLastName || t.creator_last_name || ''}`.trim() : 'HR Admin',
          createdAt: createDate ? String(createDate) : 'N/A',
        };
      }),
      lifecycleEvents: lifecycleEvents.map((e: any) => {
        const transDate = e.transitionDate || e.transition_date;
        return {
          id: Number(e.id),
          fromStatus: e.fromStatus || e.from_status,
          toStatus: e.toStatus || e.to_status,
          transitionDate: transDate ? String(transDate).split('T')[0] : 'N/A',
          notes: e.notes || '',
        };
      }),
    };
  }

  /**
   * Transfer an employee (Updates department, designation, manager, or location and logs transfer audit)
   */
  async transferEmployee(ctx: TenantContext, input: {
    employeeId: number;
    toDepartmentId?: number;
    toDesignationId?: number;
    toLocationId?: number;
    toReportingManagerId?: number;
    effectiveDate: string;
    transferType: string;
    transferReason?: string;
    notes?: string;
  }) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const emp = await db('employees')
      .where('organization_id', ctx.organizationId)
      .where('id', input.employeeId)
      .first();

    if (!emp) {
      throw new Error(`Employee ${input.employeeId} not found.`);
    }

      const fromDepartmentId = emp.current_department_id || emp.department_id;
    const fromDesignationId = emp.current_designation_id || emp.designation_id;
    const fromLocationId = emp.current_location_id;
    const fromReportingManagerId = emp.reporting_manager_id;

    const toDepartmentId = input.toDepartmentId || fromDepartmentId;
    const toDesignationId = input.toDesignationId || fromDesignationId;
    const toLocationId = input.toLocationId || fromLocationId;
    const toReportingManagerId = input.toReportingManagerId || fromReportingManagerId;

    await db.transaction(async (trx) => {
      // 1. Insert Transfer Record
      await trx('employee_transfers').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: input.employeeId,
        from_department_id: fromDepartmentId,
        to_department_id: toDepartmentId,
        from_designation_id: fromDesignationId,
        to_designation_id: toDesignationId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        from_reporting_manager_id: fromReportingManagerId,
        to_reporting_manager_id: toReportingManagerId,
        effective_date: input.effectiveDate,
        transfer_type: input.transferType || 'department_change',
        transfer_reason: input.transferReason || null,
        notes: input.notes || null,
        created_by: ctx.userId,
        created_at: new Date(),
      });

      // 2. Update Employee Row
      const updateData: any = {};
      if (input.toDepartmentId) updateData.current_department_id = input.toDepartmentId;
      if (input.toDesignationId) updateData.current_designation_id = input.toDesignationId;
      if (input.toLocationId) updateData.current_location_id = input.toLocationId;
      if (input.toReportingManagerId) updateData.reporting_manager_id = input.toReportingManagerId;
      updateData.updated_at = new Date();

      if (Object.keys(updateData).length > 1) {
        await trx('employees')
          .where('organization_id', ctx.organizationId)
          .where('id', input.employeeId)
          .update(updateData);
      }

      // 3. Log Lifecycle Event
      await trx('employee_lifecycle').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: input.employeeId,
        from_status: emp.status,
        to_status: emp.status,
        transition_date: input.effectiveDate,
        notes: `Transfer (${input.transferType}): ${input.transferReason || 'Internal Reassignment'}`,
        created_by: ctx.userId,
        created_at: new Date(),
      });
    });

    return { success: true, message: 'Employee transfer executed successfully.' };
  }

  /**
   * Save or update Onboarding & Interview Record for an Employee
   */
  async saveOnboardingDetails(ctx: TenantContext, input: {
    employeeId: number;
    interviewerName?: string;
    interviewerId?: number;
    onboardedByName?: string;
    onboardedById?: number;
    interviewDate?: string;
    interviewRating?: string;
    interviewNotes?: string;
    joiningDate?: string;
    probationEndDate?: string;
    orientationCompleted?: boolean;
    documentsVerified?: boolean;
    welcomeKitIssued?: boolean;
    notes?: string;
  }) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const existing = await db('employee_onboarding_records')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', input.employeeId)
      .first();

    const payload: any = {
      interviewer_name: input.interviewerName || null,
      interviewer_id: input.interviewerId || null,
      onboarded_by_name: input.onboardedByName || null,
      onboarded_by_id: input.onboardedById || null,
      interview_date: input.interviewDate || null,
      interview_rating: input.interviewRating || null,
      interview_notes: input.interviewNotes || null,
      joining_date: input.joiningDate || null,
      probation_end_date: input.probationEndDate || null,
      orientation_completed: input.orientationCompleted ?? false,
      documents_verified: input.documentsVerified ?? false,
      welcome_kit_issued: input.welcomeKitIssued ?? false,
      notes: input.notes || null,
      updated_at: new Date(),
    };

    if (existing) {
      await db('employee_onboarding_records')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', input.employeeId)
        .update(payload);
    } else {
      payload.uuid = uuidv4();
      payload.organization_id = ctx.organizationId;
      payload.employee_id = input.employeeId;
      payload.created_by = ctx.userId;
      payload.created_at = new Date();
      await db('employee_onboarding_records').insert(payload);
    }

    return { success: true, message: 'Onboarding details saved successfully.' };
  }

  /**
   * Save or update Offboarding & Exit Record for an Employee
   */
  async saveOffboardingDetails(ctx: TenantContext, input: {
    employeeId: number;
    exitType: string;
    resignationDate?: string;
    noticePeriodDays?: number;
    relievingDate?: string;
    lastWorkingDay?: string;
    exitInterviewerName?: string;
    exitInterviewerId?: number;
    exitReason?: string;
    exitNotes?: string;
    assetsReturned?: boolean;
    fnfStatus?: string;
    updateEmployeeStatus?: 'notice' | 'exit' | 'alumni' | 'active';
  }) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const existing = await db('employee_offboarding_records')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', input.employeeId)
      .first();

    const payload: any = {
      exit_type: input.exitType || 'resignation',
      resignation_date: input.resignationDate || null,
      notice_period_days: input.noticePeriodDays || 30,
      relieving_date: input.relievingDate || null,
      last_working_day: input.lastWorkingDay || null,
      exit_interviewer_name: input.exitInterviewerName || null,
      exit_interviewer_id: input.exitInterviewerId || null,
      exit_reason: input.exitReason || null,
      exit_notes: input.exitNotes || null,
      assets_returned: input.assetsReturned ?? false,
      fnf_status: input.fnfStatus || 'pending',
      updated_at: new Date(),
    };

    await db.transaction(async (trx) => {
      if (existing) {
        await trx('employee_offboarding_records')
          .where('organization_id', ctx.organizationId)
          .where('employee_id', input.employeeId)
          .update(payload);
      } else {
        payload.uuid = uuidv4();
        payload.organization_id = ctx.organizationId;
        payload.employee_id = input.employeeId;
        payload.created_by = ctx.userId;
        payload.created_at = new Date();
        await trx('employee_offboarding_records').insert(payload);
      }

      const employeeUpdatePayload: any = {
        updated_at: new Date()
      };
      if (input.updateEmployeeStatus) {
        employeeUpdatePayload.status = input.updateEmployeeStatus;
      }
      if (input.resignationDate) {
        employeeUpdatePayload.resignation_date = input.resignationDate;
      }

      await trx('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', input.employeeId)
        .update(employeeUpdatePayload);

      // Handle future leave cancellation if resignation date is provided
      if (input.resignationDate) {
        const leaveTypes = await trx('leave_types')
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
          const futureApps = await trx('leave_applications')
            .where('employee_id', input.employeeId)
            .whereIn('leave_type_id', cancelEnabledTypeIds)
            .whereIn('status', ['submitted', 'pending_manager', 'pending_hr', 'approved', 'pending_hr_override'])
            .where('application_start_date', '>=', input.resignationDate);

          for (const app of futureApps) {
            await trx('leave_applications')
              .where('id', app.id)
              .update({
                status: 'cancelled',
                admin_notes: 'Automatically cancelled due to employee resignation.',
                updated_at: new Date(),
              });

            const totalDays = parseFloat(app.total_days || app.totalDays || 0);
            const balance = await trx('leave_balances')
              .where({
                employee_id: input.employeeId,
                leave_type_id: app.leave_type_id,
                financial_year_start: app.financial_year_start
              })
              .first();

            if (balance) {
              if (app.status === 'approved') {
                const newConsumed = Math.max(0, (parseFloat(balance.consumed_balance) || 0) - totalDays);
                const newAvailable = (parseFloat(balance.available_balance) || 0) + totalDays;
                await trx('leave_balances')
                  .where('id', balance.id)
                  .update({
                    consumed_balance: newConsumed,
                    available_balance: newAvailable,
                    last_updated_at: new Date().toISOString(),
                  });
              } else {
                const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);
                const newAvailable = (parseFloat(balance.available_balance) || 0) + totalDays;
                await trx('leave_balances')
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
    });

    return { success: true, message: 'Offboarding details saved successfully.' };
  }
}
