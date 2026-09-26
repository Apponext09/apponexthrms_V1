import { describe, expect, it } from 'vitest';
import { filterGrantedGroups, type SectionGroup } from './SectionNavigation';

const groups: SectionGroup[] = [
  { label: 'Dashboard', items: [{ name: 'Dashboard', href: '/dashboard' }] },
  { label: 'Attendance', items: [
    { name: 'My Attendance', href: '/attendance' },
    { name: 'Face Punch', href: '/attendance/face-punch' },
  ] },
  { label: 'Payroll', items: [{ name: 'Payroll', href: '/payroll' }] },
];

describe('original navigation role filtering', () => {
  it('preserves module order, names, and child tabs while hiding ungranted pages', () => {
    const allowed = new Set(['/dashboard', '/attendance/face-punch']);
    const result = filterGrantedGroups(groups, (path) => allowed.has(path));
    expect(result.map((group) => group.label)).toEqual(['Dashboard', 'Attendance']);
    expect(result[1].items.map((item) => item.name)).toEqual(['Face Punch']);
  });

  it('retains a grouping item when only a nested child is granted', () => {
    const nested: SectionGroup[] = [{ label: 'Attendance', items: [{ name: 'Attendance', href: '/attendance', subItems: [{ name: 'My Attendance', href: '/attendance/my' }] }] }];
    const result = filterGrantedGroups(nested, (path) => path === '/attendance/my');
    expect(result[0].items[0].subItems?.map((item) => item.name)).toEqual(['My Attendance']);
  });

  it('checks the granted page behind a tab query without changing its link', () => {
    const tabs: SectionGroup[] = [{ label: 'Masters', items: [{ name: 'Access Roles', href: '/operational-masters?tab=access-roles' }] }];
    expect(filterGrantedGroups(tabs, (href) => href === '/operational-masters?tab=access-roles')[0].items[0].href)
      .toBe('/operational-masters?tab=access-roles');
  });
});
