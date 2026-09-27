import { describe, expect, it } from 'vitest';
import { buildAccessTabs, buildCommonAccessModules, defaultPortalForRole, orderAccessModules } from './roleAccessTabs';
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

  it('shows one common module list with dashboard then all attendance portal tabs', () => {
    const sharedMenus: RoleMenuItem[] = [...menus,
      { id: 30, code: 'page:employee:/employee/attendance', label: 'Attendance', parentId: 3, portal: 'employee', route: '/employee/attendance' },
    ];
    const view = buildCommonAccessModules(sharedMenus);
    expect(view.modules.slice(0, 2).map((module) => module.label)).toEqual(['Dashboard', 'Attendance']);
    expect(view.modules[1].tabs.map((tab) => tab.label)).toEqual([
      'Attendance Dashboard', 'Face Punch', 'Attendance Logs',
    ]);
    expect(view.otherPages.flatMap((page) => page.menus.map((menu) => menu.route))).toContain('/employees/:id');
    expect(view.modules[0].tabs).toHaveLength(1);
  });

  it('keeps portal menu IDs behind a single checkbox for equivalent pages', () => {
    const view = buildCommonAccessModules([
      { id: 1, code: 'admin-dashboard', label: 'Dashboard', parentId: 10, portal: 'admin', route: '/dashboard' },
      { id: 2, code: 'hr-dashboard', label: 'Dashboard', parentId: 10, portal: 'hr', route: '/hr/dashboard' },
      { id: 3, code: 'employee-dashboard', label: 'Dashboard', parentId: 10, portal: 'employee', route: '/employee/dashboard' },
    ]);
    expect(view.modules[0].tabs).toHaveLength(1);
    expect(view.modules[0].tabs[0].menus.map((menu) => menu.id)).toEqual([1, 2, 3]);
  });

  it('keeps Shift Management separate with both General and Roster Shift tabs', () => {
    const view = buildCommonAccessModules([
      { id: 40, code: 'general-shift', label: 'General Shift', parentId: 3, portal: 'admin', route: '/attendance/shifts' },
      { id: 41, code: 'roster-shift', label: 'Roster Shift', parentId: 3, portal: 'admin', route: '/attendance/roster-shifts' },
      { id: 42, code: 'my-shifts', label: 'My Shifts', parentId: 3, portal: 'hr', route: '/hr/my-shifts' },
    ]);
    expect(view.modules.find((module) => module.label === 'Shift Management')?.tabs.map((tab) => tab.label)).toEqual(['General Shift', 'Roster Shift', 'My Shifts']);
  });

  it('places concrete catalog pages missing from static navigation in their module', () => {
    const view = buildCommonAccessModules([
      { id: 3, code: 'module:attendance', label: 'Attendance', parentId: null },
      { id: 50, code: 'unlisted', label: 'Special Attendance Report', parentId: 3, portal: 'admin', route: '/attendance/special-report' },
      { id: 51, code: 'detail', label: 'Attendance Detail', parentId: 3, portal: 'admin', route: '/attendance/:id' },
    ]);
    expect(view.modules.find((module) => module.label === 'Attendance')?.tabs.map((tab) => tab.label)).toContain('Special Attendance Report');
    expect(view.otherPages.flatMap((page) => page.menus.map((menu) => menu.id))).toContain(51);
  });

  it('keeps Masters and Master Operations as separate modules', () => {
    const view = buildCommonAccessModules([
      { id: 11, code: 'module:settings', label: 'Settings', parentId: null },
      { id: 60, code: 'company-master', label: 'Company', parentId: 11, portal: 'admin', route: '/masters?tab=company' },
      { id: 61, code: 'ot-rule', label: 'OT Rule', parentId: 11, portal: 'admin', route: '/operational-masters?tab=ot-rule' },
      { id: 62, code: 'hr-access-roles', label: 'Access Roles', parentId: 11, portal: 'hr', route: '/hr/operational-masters/access-roles' },
    ]);
    expect(view.modules.find((module) => module.label === 'Masters')?.tabs.map((tab) => tab.label)).toContain('Company');
    expect(view.modules.find((module) => module.label === 'Master Operations')?.tabs.map((tab) => tab.label)).toEqual(['OT Rule', 'Access Roles']);
  });

  it('uses saved module positions and keeps newly added modules in default order', () => {
    const modules = [{ label: 'Dashboard' }, { label: 'Attendance' }, { label: 'Masters' }];
    expect(orderAccessModules(modules, ['Masters', 'Dashboard']).map((module) => module.label)).toEqual(['Masters', 'Dashboard', 'Attendance']);
  });
});
