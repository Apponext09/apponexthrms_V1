import { describe, expect, it } from 'vitest';
import { PORTAL_ROUTES, expandMenuSelection, moduleForRoute, pageAllowsReadPermission } from './menu.catalog';

describe('existing page catalog', () => {
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
