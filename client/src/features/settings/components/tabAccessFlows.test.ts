import { describe, expect, it } from 'vitest';
import { expandTabAccessIds, tabSelectionMenus } from '@apponexthrms/shared';
import { buildCompleteAccessModules, buildSourceLabelledModules } from './roleAccessTabs';
import { flattenMenus, toggleMenu } from './roleMenuSelection';
const routes = ['/employees', '/employees/:id', '/employees/:id/edit', '/employees/onboarding', '/hr/employees', '/hr/employees/:id', '/hr/employees/:id/edit'];
const items = routes.map((route, index) => ({ id: index + 1, code: route, label: route, route, portal: route.startsWith('/hr/') ? 'hr' : 'admin', parentId: 99 }));

describe('full tab access', () => {
  it('bundles Employees list/details/edit in one source-labelled checkbox', () => {
    const tabs = buildSourceLabelledModules(buildCompleteAccessModules(items)).flatMap((module) => module.tabs);
    const admin = tabs.filter((tab) => tab.menus.some((menu) => menu.route === '/employees'));
    expect(admin).toHaveLength(1);
    expect(admin[0].menus.map((menu) => menu.route)).toEqual(expect.arrayContaining(routes.slice(0, 3)));
    expect(admin[0].menus.map((menu) => menu.route)).not.toContain('/employees/onboarding');
    expect(tabs.some((tab) => tab.label === 'Employee Edit')).toBe(false);
    expect(tabs.some((tab) => tab.label === 'Employee Details')).toBe(false);
    expect(tabSelectionMenus(admin[0].menus).map((menu) => menu.route)).toEqual(['/employees']);
  });
  it('expands existing or new list grants, without onboarding or another portal', () => {
    expect(expandTabAccessIds([1], items)).toEqual([1, 2, 3]);
    expect(expandTabAccessIds([5], items)).toEqual([5, 6, 7]);
    expect(expandTabAccessIds([99], items)).toEqual([99]);
    expect(expandTabAccessIds([], items)).toEqual([]);
  });
  it('unchecking a tab removes its entire route bundle', () => {
    const tab = buildCompleteAccessModules(items).flatMap((module) => module.tabs).find((entry) => entry.menus.some((menu) => menu.route === '/employees'))!;
    const ids = tab.menus.filter((menu) => menu.portal === 'admin').reduce((selected, menu) => toggleMenu(flattenMenus(items), selected, menu.id, false), [1, 2, 3, 5, 6, 7, 99]);
    expect(expandTabAccessIds(ids, items)).toEqual([5, 6, 7, 99]);
  });
  it('does not select a sibling LMS tab through shared detail pages', () => {
    const menus = ['/lms/catalog', '/lms/catalog/:id', '/lms/assessment/:id'].map((route, id) => ({ id, route, portal: 'admin' }));
    expect(tabSelectionMenus(menus).map((menu) => menu.route)).toEqual(['/lms/catalog']);
  });
});
