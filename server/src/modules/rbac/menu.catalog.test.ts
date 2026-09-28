import { describe, expect, it } from 'vitest';
import { PORTAL_ROUTES, expandMenuSelection, moduleForRoute, pageAllowsReadPermission, pageAllowsPermission } from './menu.catalog';

describe('existing page catalog', () => {
  it('grants supported tab actions without granting unrelated administration', () => {
    expect(pageAllowsPermission('employee.profile.update', '/employees')).toBe(true);
    expect(pageAllowsPermission('employee.profile.update', '/hr/employees')).toBe(true);
    expect(pageAllowsPermission('employee.profile.update', '/intern/profile')).toBe(false);
    expect(pageAllowsPermission('recruitment.job.write', '/hr/recruitment/jobs')).toBe(true);
    expect(pageAllowsPermission('recruitment.mrf.write', '/hr/recruitment/jobs')).toBe(false);
    expect(pageAllowsPermission('performance.goal_write', '/hr/performance/goals')).toBe(true);
    expect(pageAllowsPermission('performance.review_write', '/hr/performance/goals')).toBe(false);
    expect(pageAllowsPermission('workflow:update', '/workflows/list')).toBe(true);
    expect(pageAllowsPermission('workflow:approve', '/workflows/list')).toBe(false);
    expect(pageAllowsPermission('payroll:process', '/payroll/processing')).toBe(true);
    expect(pageAllowsPermission('payroll:process', '/employee/payslips')).toBe(false);
    expect(pageAllowsPermission('loan:create', '/employee/loans')).toBe(false);
    expect(pageAllowsPermission('asset.delete', '/assets/list')).toBe(true);
    expect(pageAllowsPermission('asset.transfer.approve', '/assets/transfer')).toBe(true);
    expect(pageAllowsPermission('asset.transfer.approve', '/assets/list')).toBe(false);
    expect(pageAllowsPermission('attendance.shift_write', '/attendance/shifts')).toBe(true);
    expect(pageAllowsPermission('attendance.shift_write', '/attendance/locations')).toBe(false);
    expect(pageAllowsPermission('leave.approve', '/leaves/approvals')).toBe(true);
    expect(pageAllowsPermission('leave.approve', '/leaves/my-leaves')).toBe(false);
    expect(pageAllowsPermission('leave.policy.manage', '/settings/org-leave-settings')).toBe(true);
    expect(pageAllowsPermission('leave.policy.manage', '/hr/settings/org-leave-settings')).toBe(true);
    expect(pageAllowsPermission('expense.claim.approve', '/expenses/approvals')).toBe(true);
    expect(pageAllowsPermission('expense.category.delete', '/expenses/categories')).toBe(true);
    expect(pageAllowsPermission('expense.category.delete', '/expenses/my-expenses')).toBe(false);
    expect(pageAllowsPermission('lms.course.update', '/lms/courses')).toBe(true);
    expect(pageAllowsPermission('lms.course.update', '/lms/batches')).toBe(false);
    expect(pageAllowsPermission('rbac.roles.write', '/employees')).toBe(false);
  });
  it('includes every organization portal and known attendance detail paths', () => {
    expect(Object.keys(PORTAL_ROUTES).sort()).toEqual(['admin', 'consultant', 'employee', 'finance', 'hr', 'intern', 'manager', 'teamlead']);
    expect(PORTAL_ROUTES.admin).toContain('/attendance/live-tracking');
    expect(PORTAL_ROUTES.employee).toContain('/employee/face-attendance');
    expect(PORTAL_ROUTES.admin).toContain('/employees/:id');
    expect(PORTAL_ROUTES.admin).toContain('/operational-masters');
    expect(PORTAL_ROUTES.hr).toContain('/hr/operational-masters');
    expect(PORTAL_ROUTES.admin).not.toContain('/superadmin/dashboard');
  });

  it('groups attendance-related pages under one parent module', () => {
    expect(moduleForRoute('/employee/face-attendance')).toBe('attendance');
    expect(moduleForRoute('/attendance/live-tracking')).toBe('attendance');
    expect(moduleForRoute('/employee/attendance')).toBe('attendance');
    expect(moduleForRoute('/attendance/shifts')).toBe('shift_management');
    expect(moduleForRoute('/hr/my-shifts')).toBe('shift_management');
    expect(moduleForRoute('/employee/shift-roster')).toBe('shift_management');
    expect(moduleForRoute('/masters?tab=company')).toBe('masters');
    expect(moduleForRoute('/hr/masters/company')).toBe('masters');
    expect(moduleForRoute('/operational-masters?tab=ot-rule')).toBe('master_operations');
    expect(moduleForRoute('/hr/operational-masters/access-roles')).toBe('master_operations');
  });

  it('selecting a child adds its parent, but selecting a parent never adds children', () => {
    const rows = [{ id: 2, parentId: 1 }, { id: 3, parentId: 1 }];
    expect(expandMenuSelection([2], rows)).toEqual([2, 1]);
    expect(expandMenuSelection([1], rows)).toEqual([1]);
    expect(expandMenuSelection([2, 3], rows)).toEqual([2, 3, 1]);
  });

  it('bridges only the matching page to a legacy read permission', () => {
    expect(pageAllowsReadPermission('recruitment.mrf.read', '/manager/mrf-request')).toBe(true);
    expect(pageAllowsReadPermission('recruitment.mrf.read', '/recruitment/jobs')).toBe(false);
    expect(pageAllowsReadPermission('payroll:view', '/employee/payslips')).toBe(false);
    expect(pageAllowsReadPermission('payroll:view', '/payroll')).toBe(true);
    expect(pageAllowsReadPermission('recruitment.mrf.write', '/manager/mrf-request')).toBe(false);
  });
});
