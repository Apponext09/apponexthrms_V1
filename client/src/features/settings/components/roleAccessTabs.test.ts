import { describe, expect, it } from 'vitest';
import { buildAccessTabs, defaultPortalForRole } from './roleAccessTabs';
import type { RoleMenuItem } from './roleMenuSelection';

const menus: RoleMenuItem[] = [
  { id: 1, code: 'module:general', label: 'General', parentId: null },
  { id: 2, code: 'page:admin:/dashboard', label: 'Dashboard', parentId: 1, portal: 'admin', route: '/dashboard' },
  { id: 3, code: 'module:attendance', label: 'Attendance', parentId: null },
  { id: 4, code: 'page:admin:/attendance', label: 'Attendance', parentId: 3, portal: 'admin', route: '/attendance' },
  { id: 5, code: 'page:admin:/attendance/face-punch', label: 'Face Punch', parentId: 3, portal: 'admin', route: '/attendance/face-punch' },
  { id: 6, code: 'page:admin:/operational-masters?tab=ot-rule', label: 'OT Rule', parentId: 1, portal: 'admin', route: '/operational-masters?tab=ot-rule' },
  { id: 7, code: 'page:admin:/operational-masters?tab=access-roles', label: 'Access Roles', parentId: 1, portal: 'admin', route: '/operational-masters?tab=access-roles' },
  { id: 8, code: 'page:admin:/employees/:id', label: 'Employee Details', parentId: 1, portal: 'admin', route: '/employees/:id' },
];

describe('access role navigation tabs', () => {
  it('uses working navigation labels and places dashboard before attendance', () => {
    const view = buildAccessTabs(menus, 'admin');
    expect(view.groups.slice(0, 2).map((group) => group.label)).toEqual(['Dashboard', 'Attendance']);
    expect(view.groups[1].tabs.map((tab) => tab.label)).toEqual(['Dashboard', 'CEO Face Punch']);
    expect(view.groups.find((group) => group.label === 'Master Operations')?.tabs.map((tab) => tab.label)).toEqual(['OT Rule', 'Access Roles']);
    expect(view.otherPages.map((page) => page.route)).toContain('/employees/:id');
  });

  it('starts known roles in their real portal and custom roles in employee', () => {
    expect(defaultPortalForRole('hr')).toBe('hr');
    expect(defaultPortalForRole('finance')).toBe('finance');
    expect(defaultPortalForRole('new_role')).toBe('employee');
  });

  it('maps HR and employee tabs to their actual portal routes', () => {
    const portalMenus: RoleMenuItem[] = [
      { id: 20, code: 'hr-role-tab', label: 'Access Roles', parentId: 1, portal: 'hr', route: '/hr/operational-masters/access-roles' },
      { id: 21, code: 'employee-dashboard', label: 'Dashboard', parentId: 1, portal: 'employee', route: '/employee/dashboard' },
      { id: 22, code: 'employee-attendance', label: 'Attendance', parentId: 1, portal: 'employee', route: '/employee/attendance' },
    ];
    expect(buildAccessTabs(portalMenus, 'hr').groups.flatMap((group) => group.tabs).map((tab) => tab.label)).toContain('Access Roles');
    expect(buildAccessTabs(portalMenus, 'employee').groups.slice(0, 2).map((group) => group.label)).toEqual(['Dashboard', 'Attendance']);
  });
});
