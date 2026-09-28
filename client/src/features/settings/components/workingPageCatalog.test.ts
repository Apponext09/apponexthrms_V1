import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { WORKING_PAGE_GROUPS } from './accessPageDefinitions';
import { buildCompleteAccessModules, modulesForRolePortal } from './roleAccessTabs';
import { PORTAL_ROUTES } from '../../../../../server/src/modules/rbac/menu.catalog';

describe('complete working page catalog', () => {
  it('keeps all modules in a common list without duplicate page names', () => {
    const entries = Object.entries(WORKING_PAGE_GROUPS).flatMap(([portal, groups]) =>
      [...new Set(groups.flatMap((group) => group.routes.map((route) => route.toLowerCase())))].map((route) => ({ portal, route })));
    const menus = entries.map((entry, index) => ({ ...entry, id: index + 1, code: `${entry.portal}:${entry.route}`, label: entry.route, parentId: null }));
    const modules = buildCompleteAccessModules(menus);
    expect(modules.map((module) => module.label)).toEqual(expect.arrayContaining(['Leaves', 'Recruitment', 'LMS', 'Expenses', 'Assets', 'Performance', 'Workflows', 'Policies', 'Settings']));
    for (const module of modules) expect(new Set(module.tabs.map((tab) => tab.label)).size, module.label).toBe(module.tabs.length);
  });
  for (const [portal, groups] of Object.entries(WORKING_PAGE_GROUPS)) {
    it(`covers every non-redirect ${portal} route and registers its grant`, () => {
      const file = portal === 'team_lead' ? 'teamlead' : portal;
      const content = readFileSync(new URL(`../../../routes/${file}.routes.tsx`, import.meta.url), 'utf8');
      const source = ts.createSourceFile('routes.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const routes: string[] = [];
      const visit = (node: ts.Node) => {
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'Route') {
          const attributes = node.attributes.properties;
          const path = attributes.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'path') as ts.JsxAttribute | undefined;
          const element = attributes.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'element') as ts.JsxAttribute | undefined;
          const expression = element?.initializer && ts.isJsxExpression(element.initializer) ? element.initializer.expression : undefined;
          const tag = expression && (ts.isJsxSelfClosingElement(expression) ? expression.tagName : ts.isJsxElement(expression) ? expression.openingElement.tagName : undefined);
          if (path?.initializer && ts.isStringLiteral(path.initializer) && tag && tag.getText(source) !== 'Navigate') {
            let route = path.initializer.text;
            let parent = node.parent;
            while (!route.startsWith('/') && parent) {
              if (ts.isJsxElement(parent) && parent.openingElement.tagName.getText(source) === 'Route') {
                const ancestor = parent.openingElement.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'path') as ts.JsxAttribute | undefined;
                if (ancestor?.initializer && ts.isStringLiteral(ancestor.initializer)) route = `${ancestor.initializer.text}/${route}`;
              }
              parent = parent.parent;
            }
            routes.push(route);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      const defined = groups.flatMap((group) => group.routes);
      expect(new Set(defined)).toEqual(new Set(routes));
      const registered = PORTAL_ROUTES[file];
      expect(defined.filter((route) => !registered.includes(route))).toEqual([]);
      const normalized = [...new Set(defined.map((route) => route.toLowerCase()))];
      const menus = normalized.map((route, index) => ({ id: index + 1, code: route, label: route, portal, route, parentId: null }));
      const displayed = modulesForRolePortal(buildCompleteAccessModules(menus), portal as Parameters<typeof modulesForRolePortal>[1]);
      const represented = new Set(displayed.flatMap((module) => module.tabs.flatMap((tab) => tab.menus.map((menu) => menu.route))));
      expect(normalized.filter((route) => !/^\/(hr\/)?(masters|operational-masters)(\/\*|$)/.test(route) && !represented.has(route))).toEqual([]);
      for (const module of displayed) expect(new Set(module.tabs.map((tab) => tab.label)).size, module.label).toBe(module.tabs.length);
    });
  }
});
