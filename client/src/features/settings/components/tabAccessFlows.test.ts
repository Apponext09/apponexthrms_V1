import { describe, expect, it } from 'vitest';
import { expandTabAccessIds, TAB_ACCESS_FLOWS, tabSelectionMenus } from '@apponexthrms/shared';
import { buildCompleteAccessModules, buildSourceLabelledModules } from './roleAccessTabs';
import { flattenMenus, toggleMenu } from './roleMenuSelection';
import { WORKING_PAGE_GROUPS } from './accessPageDefinitions';
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

  it.each([
    ['admin', '/live-tracking', ['/live-tracking/history', '/admin/live-tracking/history']],
    ['hr', '/hr/live-tracking', ['/hr/live-tracking/history']],
    ['manager', '/manager/live-tracking', ['/manager/live-tracking/history']],
    ['team_lead', '/team-lead/live-tracking', ['/team-lead/live-tracking/history']],
  ] as const)('bundles live tracking history into the %s live tracking tab', (portal, owner, children) => {
    const catalog = [owner, ...children].map((route, index) => ({
      id: index + 200, code: `${portal}:${route}`, label: route, route, portal, parentId: 99,
    }));
    expect(tabSelectionMenus(catalog).map((menu) => menu.route)).toEqual([owner]);
    expect(expandTabAccessIds([200], catalog)).toEqual(catalog.map((menu) => menu.id));
    const visibleTabs = buildCompleteAccessModules(catalog).flatMap((module) => module.tabs);
    expect(visibleTabs).toHaveLength(1);
    expect(visibleTabs[0].menus.map((menu) => menu.route)).toEqual([owner, ...children]);
  });

  it.each([
    ['admin', '/settings/leave-policies', ['/settings/org-leave-settings', '/settings-group/org-leave-settings']],
    ['hr', '/hr/settings/leave-policies', ['/hr/settings/org-leave-settings']],
    ['admin', '/leaves/my-leaves', ['/leaves/balance', '/leaves/encashment']],
    ['hr', '/hr/leaves/my-leaves', ['/hr/leaves/balance', '/hr/leaves/encashment']],
    ['admin', '/notifications', ['/notifications/preferences']],
    ['admin', '/policies/manage', ['/policies/queries']],
  ] as const)('bundles embedded %s workflow pages under %s', (portal, owner, children) => {
    const catalog = [owner, ...children].map((route, index) => ({ id: index + 300, route, portal }));
    expect(tabSelectionMenus(catalog).map((menu) => menu.route)).toEqual([owner]);
    expect(expandTabAccessIds([300], catalog)).toEqual(catalog.map((menu) => menu.id));
  });

  it('registers every create, edit, details and embedded history route under a parent tab', () => {
    const childRoutes = new Set(TAB_ACCESS_FLOWS.flatMap((flow) => flow.pages.map((route) => `${flow.portal}:${route.toLowerCase()}`)));
    const embeddedComponents = new Set([
      'TrackingHistoryPage', 'OrgLeaveSettings', 'NotificationPreferencesPage',
      'AdminPolicyQueriesPage', 'LeaveBalancePage', 'LeaveEncashmentPage',
    ]);
    const unowned = Object.entries(WORKING_PAGE_GROUPS).flatMap(([portal, groups]) => groups.flatMap((group) => {
      if (!['create', 'edit', 'details'].includes(group.mode) && !embeddedComponents.has(group.component)) return [];
      return group.routes.filter((route) => !childRoutes.has(`${portal}:${route.toLowerCase()}`));
    }));
    expect(unowned).toEqual([]);
  });

  it('does not allow a route history screen to silently become a separate permission', () => {
    const childRoutes = new Set(TAB_ACCESS_FLOWS.flatMap((flow) => flow.pages.map((route) => `${flow.portal}:${route.toLowerCase()}`)));
    const orphanHistoryRoutes = Object.entries(WORKING_PAGE_GROUPS).flatMap(([portal, groups]) => groups.flatMap((group) => {
      const hasParentAlias = group.routes.some((route) => !/\/history(?:\/|$)/i.test(route));
      return group.routes.filter((route) => /\/history(?:\/|$)/i.test(route)
        && !hasParentAlias
        && !childRoutes.has(`${portal}:${route.toLowerCase()}`));
    }));
    expect(orphanHistoryRoutes).toEqual([]);
  });
});
