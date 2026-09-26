import { describe, expect, it } from 'vitest';
import { firstGrantedPage, isPathGranted, matchesMenuPath, type MenuCatalogItem } from './useMenuAccess';

const catalog: MenuCatalogItem[] = [
  { id: 1, code: 'module:attendance', label: 'Attendance', parentId: null, path: null, portal: null, sortOrder: 0 },
  { id: 2, code: 'page:my-attendance', label: 'My Attendance', parentId: 1, path: '/employee/attendance', portal: 'employee', sortOrder: 1 },
  { id: 3, code: 'page:face-punch', label: 'Face Punch', parentId: 1, path: '/employee/face-attendance', portal: 'employee', sortOrder: 2 },
  { id: 4, code: 'page:details', label: 'Employee details', parentId: 1, path: '/employees/:id', portal: 'admin', sortOrder: 3 },
];

describe('role menu route access', () => {
  it('does not grant a child when its parent alone is selected', () => {
    expect(isPathGranted('/employee/attendance', catalog, [])).toBe(false);
  });

  it('grants only the selected child page', () => {
    expect(isPathGranted('/employee/attendance', catalog, ['/employee/attendance'])).toBe(true);
    expect(isPathGranted('/employee/face-attendance', catalog, ['/employee/attendance'])).toBe(false);
  });

  it('rejects an unknown direct URL', () => {
    expect(isPathGranted('/employee/private-report', catalog, ['/employee/attendance'])).toBe(false);
  });

  it('matches parameterized registered pages exactly', () => {
    expect(matchesMenuPath('/employees/:id', '/employees/42')).toBe(true);
    expect(isPathGranted('/employees/42', catalog, ['/employees/:id'])).toBe(true);
    expect(isPathGranted('/employees/42/edit', catalog, ['/employees/:id'])).toBe(false);
  });

  it('chooses a usable landing page for a newly granted role', () => {
    expect(firstGrantedPage(['/employee', '/employees/:id', '/employee/attendance'])).toBe('/employee/attendance');
  });

  it('does not grant one master tab through another tab or the hub page', () => {
    const tabs: MenuCatalogItem[] = [
      { id: 5, code: 'page:admin:/operational-masters', label: 'Hub', parentId: 1, path: '/operational-masters', portal: 'admin', sortOrder: 5 },
      { id: 6, code: 'page:admin:/operational-masters?tab=access-roles', label: 'Access Roles', parentId: 1, path: '/operational-masters?tab=access-roles', portal: 'admin', sortOrder: 6 },
    ];
    expect(isPathGranted('/operational-masters?tab=access-roles', tabs, ['/operational-masters'])).toBe(false);
    expect(isPathGranted('/operational-masters?tab=access-roles', tabs, ['/operational-masters?tab=access-roles'])).toBe(true);
  });
});
