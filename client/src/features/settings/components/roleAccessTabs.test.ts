import { describe, expect, it } from 'vitest';
import { buildAccessTabs, buildCommonAccessModules, buildCompleteAccessModules, defaultPortalForRole, menuForRolePortal, menusForAccessRole, modulesForRolePortal, orderAccessModules } from './roleAccessTabs';
import type { RoleMenuItem } from './roleMenuSelection';
import { PORTAL_ROUTES } from '../../../../../server/src/modules/rbac/menu.catalog';

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
      'Dashboard', 'CEO Face Punch', 'Attendance Logs',
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
    expect(menuForRolePortal(view.modules[0].tabs[0], 'finance')).toBeUndefined();
    expect(menuForRolePortal(view.modules[0].tabs[0], 'employee')?.id).toBe(3);
    expect(modulesForRolePortal(view.modules, 'finance')).toEqual([]);
    expect(modulesForRolePortal(view.modules, 'employee')[0].tabs).toHaveLength(1);
    expect(menusForAccessRole(view.modules[0].tabs[0], 'employee').map((menu) => menu.id)).toEqual([3]);
    expect(menusForAccessRole(view.modules[0].tabs[0], 'finance').map((menu) => menu.id)).toEqual([1]);
  });

  it('lists the requested working tabs under clean common modules', () => {
    const catalog = Object.entries(PORTAL_ROUTES).flatMap(([portal, routes]) => routes.map((route, index) => ({
      id: `${portal}:${index}`, portal, route,
    }))).map((row, index) => ({ id: index + 1000, code: row.id, label: row.route, parentId: null, portal: row.portal, route: row.route }));
    const modules = buildCommonAccessModules(catalog).modules;
    const labels = (name: string) => modules.find((module) => module.label === name)?.tabs.map((tab) => tab.label) ?? [];
    expect(labels('Leaves')).toEqual(expect.arrayContaining(['My Leaves', 'Leave Approvals', 'Leave Settings', 'Approvals Dashboard', 'Holiday Calendar']));
    expect(labels('Shift Management')).toEqual(expect.arrayContaining(['General Shift', 'Roster Shift']));
    expect(labels('Recruitment')).toEqual(expect.arrayContaining(['MRF Request', 'IJP Approvals', 'Interview Schedule', 'Internal Job Openings', 'Employee Referrals']));
    expect(labels('LMS')).toEqual(expect.arrayContaining(['Dashboard', 'Course Management', 'Categories', 'Batches & Live Classes', 'Learner Enrollments', 'Compliance Training', 'Training Reports', 'Course Catalog', 'My Learning Hub', 'My Certificates', 'Integration Settings']));
    expect(labels('Expenses')).toEqual(expect.arrayContaining(['Expense Management Dashboard', 'My Expenses', 'Expense Approvals', 'Finance Verification', 'Payment Cycle Reports', 'Travel Requests', 'Travel Advances', 'Mileage Claims', 'Expense Categories', 'Expense Policies', 'Reports & Analytics', 'Settings']));
    for (const name of ['Course Catalog', 'My Learning Hub', 'My Certificates']) {
      expect(labels('LMS').filter((label) => label === name)).toHaveLength(1);
    }
  });

  it('adds non-sidebar working pages and groups aliases without granting another portal version', () => {
    const view = buildCompleteAccessModules([
      { id: 101, code: 'admin-leaves', label: 'My Leaves', parentId: 1, portal: 'admin', route: '/leaves/my-leaves' },
      { id: 102, code: 'admin-leave-history', label: 'History', parentId: 1, portal: 'admin', route: '/leaves/history' },
      { id: 103, code: 'employee-leaves', label: 'My Leaves', parentId: 1, portal: 'employee', route: '/employee/leaves' },
      { id: 104, code: 'encashment', label: 'Encashment', parentId: 1, portal: 'admin', route: '/leaves/encashment' },
    ]);
    const leaves = view.find((module) => module.label === 'Leaves')!;
    expect(leaves.tabs.map((tab) => tab.label)).toEqual(['My Leaves', 'Leave Encashment']);
    expect(menusForAccessRole(leaves.tabs[0], 'admin').map((menu) => menu.id)).toEqual([101, 102]);
    expect(menusForAccessRole(leaves.tabs[0], 'employee').map((menu) => menu.id)).toEqual([103]);
  });

  it('shows LMS Settings once under Settings with all working URL variants', () => {
    const routes = [
      ['admin', '/lms/settings/integrations'], ['admin', '/settings/lms-integrations'],
      ['admin', '/settings-group/lms-integrations'], ['hr', '/hr/lms/settings/integrations'],
      ['hr', '/hr/settings/lms-integrations'],
    ];
    const view = buildCompleteAccessModules(routes.map(([portal, route], index) => ({ id: index + 200, code: route, label: 'Integrations', parentId: null, portal, route })));
    const all = view.flatMap((module) => module.tabs);
    expect(all).toHaveLength(1);
    const tab = view.find((module) => module.label === 'Settings')?.tabs[0];
    expect(tab?.label).toBe('LMS Settings');
    expect(tab?.menus).toHaveLength(5);
    expect(menusForAccessRole(tab!, 'hr').map((menu) => menu.portal)).toEqual(['hr', 'hr']);
  });

  it('keeps Shift Management separate with both General and Roster Shift tabs', () => {
    const view = buildCommonAccessModules([
      { id: 40, code: 'general-shift', label: 'General Shift', parentId: 3, portal: 'admin', route: '/attendance/shifts' },
      { id: 41, code: 'roster-shift', label: 'Roster Shift', parentId: 3, portal: 'admin', route: '/attendance/roster-shifts' },
      { id: 42, code: 'my-shifts', label: 'My Shifts', parentId: 3, portal: 'hr', route: '/hr/my-shifts' },
    ]);
    expect(view.modules.find((module) => module.label === 'Shift Management')?.tabs.map((tab) => tab.label)).toEqual(['General Shift', 'Roster Shift']);
    expect(view.modules.find((module) => module.label === 'Attendance')?.tabs.map((tab) => tab.label)).toContain('My Shifts');
  });

  it('groups Holiday Calendar with Leaves and employee Careers with Recruitment', () => {
    const view = buildCommonAccessModules([
      { id: 90, code: 'admin-leaves', label: 'My Leaves', parentId: 1, portal: 'admin', route: '/leaves/my-leaves' },
      { id: 91, code: 'admin-holiday', label: 'Holiday Calendar', parentId: 1, portal: 'admin', route: '/holidays' },
      { id: 92, code: 'employee-holiday', label: 'Holiday Calendar', parentId: 1, portal: 'employee', route: '/employee/holiday-calendar' },
      { id: 93, code: 'admin-mrf', label: 'MRF Request', parentId: 1, portal: 'admin', route: '/recruitment/mrf-request' },
      { id: 94, code: 'employee-jobs', label: 'Internal Job Openings', parentId: 1, portal: 'employee', route: '/employee/job-openings' },
    ]);
    expect(view.modules.find((module) => module.label === 'Leaves')?.tabs.map((tab) => tab.label)).toEqual(['My Leaves', 'Holiday Calendar']);
    expect(view.modules.find((module) => module.label === 'Recruitment')?.tabs.map((tab) => tab.label)).toEqual(['MRF Request', 'Internal Job Openings']);
    expect(view.modules.find((module) => module.label === 'HR Operations')).toBeUndefined();
  });

  it('shows matching LMS tabs once even when portal routes differ', () => {
    const view = buildCommonAccessModules([
      { id: 95, code: 'admin-learning', label: 'My Learning Hub', parentId: 1, portal: 'admin', route: '/lms/my-learning' },
      { id: 96, code: 'employee-learning', label: 'My Learning Hub', parentId: 1, portal: 'employee', route: '/employee/lms/my-learning' },
    ]);
    expect(view.modules.find((module) => module.label === 'LMS')?.tabs).toHaveLength(1);
  });

  it('does not turn arbitrary catalog routes into visible navigation tabs', () => {
    const view = buildCommonAccessModules([
      { id: 3, code: 'module:attendance', label: 'Attendance', parentId: null },
      { id: 50, code: 'unlisted', label: 'Special Attendance Report', parentId: 3, portal: 'admin', route: '/attendance/special-report' },
      { id: 51, code: 'detail', label: 'Attendance Detail', parentId: 3, portal: 'admin', route: '/attendance/:id' },
    ]);
    expect(view.modules.flatMap((module) => module.tabs.map((tab) => tab.label))).not.toContain('Special Attendance Report');
    expect(view.otherPages.flatMap((page) => page.menus.map((menu) => menu.id))).toEqual([50, 51]);
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

  it('restores the original Module Management tabs when catalog entries exist', () => {
    const view = buildCommonAccessModules([
      { id: 70, code: 'admin-module-ceo', label: 'CEO / Admin', parentId: 11, portal: 'admin', route: '/modules?module=ceo' },
      { id: 71, code: 'admin-module-hr', label: 'HR', parentId: 11, portal: 'admin', route: '/modules?module=hr' },
      { id: 72, code: 'hr-module-ceo', label: 'CEO / Admin', parentId: 11, portal: 'hr', route: '/hr/modules?module=ceo' },
      { id: 73, code: 'hr-settings-general', label: 'General Settings', parentId: 11, portal: 'hr', route: '/hr/settings/general' },
    ]);
    expect(view.modules.find((module) => module.label === 'Modules')?.tabs.map((tab) => tab.label)).toEqual(['CEO / Admin', 'HR']);
    expect(view.modules.find((module) => module.label === 'Settings')?.tabs.map((tab) => tab.label)).toContain('General Settings');
  });

  it('excludes role-only links that were never visible in that portal', () => {
    const admin = buildAccessTabs([
      { id: 80, code: 'hr-only-admin-route', label: 'My Lifecycle', parentId: 2, portal: 'admin', route: '/employee/lifecycle' },
    ], 'admin');
    expect(admin.groups).toEqual([]);
    const hr = buildAccessTabs([
      { id: 81, code: 'ceo-only-hr-route', label: 'CEO Attendance Report', parentId: 7, portal: 'hr', route: '/hr/analytics/ceo-attendance' },
    ], 'hr');
    expect(hr.groups).toEqual([]);
  });
});
