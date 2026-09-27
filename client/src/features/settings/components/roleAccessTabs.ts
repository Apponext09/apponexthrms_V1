import type { ComponentType } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { NAVIGATION_SECTIONS } from '@/config/navigation';
import { ICON_REGISTRY } from '@/layouts/Sidebar';
import { mapToHRHref } from '@/layouts/HRLayout';
import { MANAGER_NAV } from '@/layouts/ManagerLayout';
import { TEAM_LEAD_NAV } from '@/layouts/TeamLeadLayout';
import { FINANCE_NAV } from '@/layouts/FinanceSidebar';
import { INTERN_NAV } from '@/layouts/InternSidebar';
import { CONSULTANT_NAV } from '@/layouts/ConsultantSidebar';
import { EMPLOYEE_NAV_SECTIONS } from '@/features/employee/layout/EmployeeSidebar';
import type { RoleMenuItem } from './roleMenuSelection';

export type AccessPortal = 'admin' | 'hr' | 'manager' | 'team_lead' | 'employee' | 'intern' | 'consultant' | 'finance';
export const ACCESS_PORTALS: { code: AccessPortal; label: string }[] = [
  { code: 'admin', label: 'Admin' }, { code: 'hr', label: 'HR' },
  { code: 'manager', label: 'Manager' }, { code: 'team_lead', label: 'Team Lead' },
  { code: 'employee', label: 'Employee' }, { code: 'intern', label: 'Intern' },
  { code: 'consultant', label: 'Consultant' }, { code: 'finance', label: 'Finance' },
];

type Icon = ComponentType<{ className?: string }>;
type NavLink = { name: string; href: string; icon?: Icon | string; children?: NavLink[]; subItems?: NavLink[] };
type NavGroup = { label: string; icon?: Icon | string; items: NavLink[] };
export type AccessTab = { menu: RoleMenuItem; label: string; icon: Icon };
export type AccessTabGroup = { label: string; icon: Icon; tabs: AccessTab[] };
export type CommonAccessTab = { label: string; icon: Icon; menus: RoleMenuItem[] };
export type CommonAccessModule = { label: string; icon: Icon; tabs: CommonAccessTab[] };

export function orderAccessModules<T extends { label: string }>(modules: T[], order: string[]): T[] {
  const positions = new Map(order.map((label, index) => [label, index]));
  return [...modules].sort((a, b) => (positions.get(a.label) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.label) ?? Number.MAX_SAFE_INTEGER));
}

function icon(value: Icon | string | undefined): Icon {
  return typeof value === 'string' ? ICON_REGISTRY[value] || LayoutDashboard : value || LayoutDashboard;
}

function leafLinks(items: NavLink[]): NavLink[] {
  // A navigation item can be a working page and a container at the same time.
  return items.flatMap((item) => [item, ...leafLinks(item.children ?? []), ...leafLinks(item.subItems ?? [])]);
}

function navigation(portal: AccessPortal): NavGroup[] {
  if (portal === 'admin' || portal === 'hr') {
    return NAVIGATION_SECTIONS.map((section) => ({
      label: section.label, icon: section.icon || section.items[0]?.icon,
      items: section.items.map((item) => ({ ...item,
        href: portal === 'hr' ? mapToHRHref(item.href) : item.href,
        children: item.children?.map((child) => ({ ...child, href: portal === 'hr' ? mapToHRHref(child.href) : child.href })),
      })),
    }));
  }
  if (portal === 'employee') return [
    { label: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard }] },
    ...EMPLOYEE_NAV_SECTIONS,
  ];
  const groups = portal === 'manager' ? MANAGER_NAV : portal === 'team_lead' ? TEAM_LEAD_NAV
    : portal === 'finance' ? FINANCE_NAV : portal === 'intern' ? INTERN_NAV : CONSULTANT_NAV;
  return groups as unknown as NavGroup[];
}

export function defaultPortalForRole(code: string): AccessPortal {
  if (['organization_admin', 'org_admin', 'owner', 'admin', 'ceo', 'cto', 'cfo', 'coo', 'cxo'].includes(code)) return 'admin';
  if (['hr', 'hr_admin', 'hr_manager'].includes(code)) return 'hr';
  if (['manager', 'department_head', 'dept_head', 'reporting_manager'].includes(code)) return 'manager';
  if (['team_lead', 'lead'].includes(code)) return 'team_lead';
  if (['finance', 'finance_manager'].includes(code)) return 'finance';
  if (code === 'intern') return 'intern';
  if (code === 'consultant') return 'consultant';
  return 'employee';
}

export function buildAccessTabs(items: RoleMenuItem[], portal: AccessPortal): { groups: AccessTabGroup[]; otherPages: RoleMenuItem[] } {
  const pages = items.filter((item) => item.portal === portal && item.route);
  const byPath = new Map(pages.map((item) => [item.route!, item]));
  const used = new Set<number>();
  const groups = navigation(portal).map((group) => {
    const tabs: AccessTab[] = [];
    for (const link of leafLinks(group.items)) {
      const menu = byPath.get(link.href);
      if (!menu || used.has(menu.id)) continue;
      used.add(menu.id);
      tabs.push({ menu, label: link.name, icon: icon(link.icon) });
    }
    return { label: group.label, icon: icon(group.icon || group.items[0]?.icon), tabs };
  }).filter((group) => group.tabs.length > 0);
  groups.sort((a, b) => {
    const rank = (label: string) => /dashboard|overview/i.test(label) ? 0 : /attendance/i.test(label) ? 1 : 2;
    return rank(a.label) - rank(b.label);
  });
  return { groups, otherPages: pages.filter((page) => !used.has(page.id)) };
}

function commonModuleName(label: string): string {
  if (/^(overview|dashboard)$/i.test(label)) return 'Dashboard';
  if (/^attendance$/i.test(label)) return 'Attendance';
  if (/^core\s?hr$/i.test(label)) return 'Core HR';
  if (/^(leave management|leaves)$/i.test(label)) return 'Leaves';
  if (/^(expense management|expenses)$/i.test(label)) return 'Expenses';
  if (/^(master operations|operational masters)$/i.test(label)) return 'Master Operations';
  return label;
}

function commonTabName(module: string, label: string): string {
  if (module === 'Dashboard') return 'Dashboard';
  if (module === 'Attendance') {
    if (/face.?punch|face attendance/i.test(label)) return 'Face Punch';
    if (/^(my )?attendance (log|logs)$|^logs$|^my attendance$/i.test(label)) return 'Attendance Logs';
    if (/^my shifts?$/i.test(label)) return 'My Shifts';
    if (/^general shift$/i.test(label)) return 'General Shift';
    if (/^roster shift$/i.test(label)) return 'Roster Shift';
    if (/^shift management$/i.test(label)) return 'Shift Management';
    if (/correction|regularization/i.test(label)) return 'Attendance Correction';
    if (/^dashboard$/i.test(label)) return 'Attendance Dashboard';
  }
  if (module === 'Core HR') {
    if (/^(org )?structure$|^org chart$/i.test(label)) return 'Org Structure';
    if (/^(digital )?id card$|^identity$/i.test(label)) return 'ID Card';
  }
  return label.trim();
}

function commonRoute(route: string): string {
  return route.replace(/^\/(hr|manager|team-lead|employee|intern|consultant|finance)(?=\/)/, '');
}

function moduleForPage(page: RoleMenuItem, byId: Map<number, RoleMenuItem>): string {
  const route = commonRoute(page.route || '').toLowerCase();
  if (/\/(shifts|roster-shifts|shift-roster|my-shifts)(\/|$)/.test(route)) return 'Shift Management';
  if (route.startsWith('/operational-masters')) return 'Master Operations';
  if (route.startsWith('/masters')) return 'Masters';
  if (route.startsWith('/settings')) return 'Settings';
  const parent = page.parentId == null ? undefined : byId.get(page.parentId);
  const label = parent?.label || 'General';
  if (label === 'People') return 'Core HR';
  if (label === 'General') {
    if (/^\/(dashboard|overview)$/.test(route)) return 'Dashboard';
    if (route.startsWith('/workflow')) return 'Workflow';
    return 'General';
  }
  return commonModuleName(label);
}

/** One visible tab for equivalent portal routes, retaining each actual menu ID. */
export function buildCommonAccessModules(items: RoleMenuItem[]): { modules: CommonAccessModule[]; otherPages: CommonAccessTab[] } {
  const byName = new Map<string, CommonAccessModule>();
  const otherByRoute = new Map<string, CommonAccessTab>();
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const { code: portal } of ACCESS_PORTALS) {
    const view = buildAccessTabs(items, portal);
    for (const page of view.otherPages) {
      if (page.route && !/[:*]/.test(page.route) && !/^\/(hr|manager|team-lead|employee|intern|consultant|finance)$/.test(page.route)) {
        const label = moduleForPage(page, byId);
        let module = byName.get(label);
        if (!module) {
          module = { label, icon: LayoutDashboard, tabs: [] };
          byName.set(label, module);
        }
        const tabLabel = commonTabName(label, page.label);
        const existing = module.tabs.find((tab) => tab.menus.some((menu) => commonRoute(menu.route || '') === commonRoute(page.route!)) && !tab.menus.some((menu) => menu.portal === page.portal));
        if (existing) existing.menus.push(page);
        else module.tabs.push({ label: tabLabel, icon: LayoutDashboard, menus: [page] });
        continue;
      }
      const key = commonRoute(page.route!);
      const existing = otherByRoute.get(key);
      if (existing) existing.menus.push(page);
      else otherByRoute.set(key, { label: page.label, icon: LayoutDashboard, menus: [page] });
    }
    for (const group of view.groups) {
      for (const tab of group.tabs) {
        const label = moduleForPage(tab.menu, byId) === 'Shift Management' ? 'Shift Management' : commonModuleName(group.label);
        let module = byName.get(label);
        if (!module) {
          module = { label, icon: group.icon, tabs: [] };
          byName.set(label, module);
        } else module.icon = group.icon;
        const commonLabel = commonTabName(label, tab.label);
        const existing = module.tabs.find((entry) => entry.label.toLowerCase() === commonLabel.toLowerCase());
        if (existing && !existing.menus.some((menu) => menu.portal === tab.menu.portal)) {
          existing.menus.push(tab.menu);
        } else if (!existing) module.tabs.push({ label: commonLabel, icon: tab.icon, menus: [tab.menu] });
        else module.tabs.push({ label: tab.label, icon: tab.icon, menus: [tab.menu] });
      }
    }
  }
  const modules = [...byName.values()];
  const rank = (label: string) => label === 'Dashboard' ? 0 : label === 'Attendance' ? 1 : label === 'Shift Management' ? 2
    : label === 'Masters' ? 3 : label === 'Master Operations' ? 4 : 5;
  modules.sort((a, b) => rank(a.label) - rank(b.label));
  return { modules, otherPages: [...otherByRoute.values()] };
}
