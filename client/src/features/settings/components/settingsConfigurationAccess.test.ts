import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SETTINGS_CONFIGURATION_ROUTES, SETTINGS_CONFIGURATION_TABS } from '@apponexthrms/shared';
import { buildCompleteAccessModules, menusForAccessRole } from './roleAccessTabs';
import { isPathGranted, type MenuCatalogItem } from '@/features/access/useMenuAccess';
import { moduleForRoute, PORTAL_ROUTES } from '../../../../../server/src/modules/rbac/menu.catalog';

describe('all Settings configuration tabs', () => {
  it('covers every existing Admin and HR configuration tab', () => {
    for (const page of ['Admin', 'HR']) {
      const source = readFileSync(new URL(`../pages/${page}ConfigurationPage.tsx`, import.meta.url), 'utf8');
      const definition = source.slice(source.indexOf('const CONFIG_TABS'), source.indexOf('export function'));
      const ids = [...definition.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
      expect(ids).toEqual(SETTINGS_CONFIGURATION_TABS.map((tab) => tab.id));
    }
  });

  it('lists all twelve Settings tabs once with working portal URLs', () => {
    let id = 1;
    const rows = Object.entries(SETTINGS_CONFIGURATION_ROUTES).flatMap(([portal, routes]) => routes.flatMap((route) => [
      { id: id++, code: route, label: 'Configuration', parentId: null, portal, route },
      ...SETTINGS_CONFIGURATION_TABS.map((tab) => ({ id: id++, code: `${route}:${tab.id}`, label: tab.label, parentId: null, portal, route: `${route}?tab=${tab.id}` })),
    ]));
    const modules = buildCompleteAccessModules(rows);
    expect(modules).toHaveLength(1);
    expect(modules[0].label).toBe('Settings');
    expect(modules[0].tabs.map((tab) => tab.label)).toEqual(SETTINGS_CONFIGURATION_TABS.map((tab) => tab.label));
    for (const tab of modules[0].tabs) {
      expect(menusForAccessRole(tab, 'hr')).toHaveLength(2);
      for (const menu of tab.menus) {
        expect(PORTAL_ROUTES[menu.portal!]).toContain(menu.route);
        expect(moduleForRoute(menu.route!)).toBe('settings');
      }
    }
  });

  it('does not give another configuration tab through the hub or sibling tab', () => {
    const routes = ['/configuration', '/configuration?tab=restrict-ip', '/configuration?tab=notice-period'];
    const catalog: MenuCatalogItem[] = routes.map((path, index) => ({ id: index + 1, code: path, label: path, parentId: null, path, portal: 'admin', sortOrder: index }));
    expect(isPathGranted(routes[1], catalog, [routes[0]])).toBe(false);
    expect(isPathGranted(routes[1], catalog, [routes[2]])).toBe(false);
    expect(isPathGranted(routes[1], catalog, [routes[1]])).toBe(true);
  });
});
