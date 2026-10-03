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
import { WORKING_PAGE_GROUPS } from './accessPageDefinitions';
import { SETTINGS_CONFIGURATION_ROUTES, SETTINGS_CONFIGURATION_TABS, TAB_ACCESS_FLOWS } from '@apponexthrms/shared';

export type AccessPortal = 'admin' | 'hr' | 'manager' | 'team_lead' | 'employee' | 'intern' | 'consultant' | 'finance';
export const ACCESS_PORTALS: { code: AccessPortal; label: string }[] = [
  { code: 'admin', label: 'Admin' }, { code: 'hr', label: 'HR' },
  { code: 'manager', label: 'Manager' }, { code: 'team_lead', label: 'Team Lead' },
  { code: 'employee', label: 'Employee' }, { code: 'intern', label: 'Intern' },
  { code: 'consultant', label: 'Consultant' }, { code: 'finance', label: 'Finance' },
];

type Icon = ComponentType<{ className?: string }>;
type NavLink = { name: string; href: string; icon?: Icon | string; minRoles?: string[]; excludeRoles?: string[]; children?: NavLink[]; subItems?: NavLink[] };
type NavGroup = { label: string; icon?: Icon | string; items: NavLink[] };
export type AccessTab = { menu: RoleMenuItem; label: string; icon: Icon };
export type AccessTabGroup = { label: string; icon: Icon; tabs: AccessTab[] };
export type CommonAccessTab = { label: string; icon: Icon; menus: RoleMenuItem[] };
export type CommonAccessModule = { label: string; icon: Icon; tabs: CommonAccessTab[] };
export type AccessSourceGroup = { portal: AccessPortal; label: string; modules: CommonAccessModule[] };

/** Source labels are presentation groups; they never imply granting another portal. */
export function buildAccessSourceGroups(modules: CommonAccessModule[]): AccessSourceGroup[] {
  return ACCESS_PORTALS.map(({ code: portal, label }) => ({
    portal,
    label: portal === 'admin' ? 'CEO / Admin' : label,
    modules: modules.map((module) => ({ ...module, tabs: module.tabs.map((tab) => ({
      ...tab, menus: tab.menus.filter((menu) => menu.portal === portal),
    })).filter((tab) => tab.menus.length > 0) })).filter((module) => module.tabs.length > 0),
  })).filter((group) => group.modules.length > 0);
}

/** Keep one module list, with CEO/Admin pages first, then HR and other sources. */
export function buildSourceLabelledModules(modules: CommonAccessModule[]) {
  const sources = buildAccessSourceGroups(modules);
  return modules.map((module) => ({
    ...module,
    tabs: sources.flatMap((source) => module.tabs.flatMap((tab) => {
      const menus = tab.menus.filter((menu) => menu.portal === source.portal);
      return menus.length ? [{ ...tab, menus, source: source.label, portal: source.portal }] : [];
    })),
  }));
}

/** A common tab can only grant its route in the role's own portal. */
export function menuForRolePortal(tab: Pick<CommonAccessTab, 'menus'>, portal: AccessPortal): RoleMenuItem | undefined {
  return tab.menus.find((menu) => menu.portal === portal);
}

export function menusForRolePortal(tab: Pick<CommonAccessTab, 'menus'>, portal: AccessPortal): RoleMenuItem[] {
  return tab.menus.filter((menu) => menu.portal === portal);
}

/** Prefer the role's portal; pages without that variant use one existing working portal. */
export function menusForAccessRole(tab: Pick<CommonAccessTab, 'menus'>, portal: AccessPortal): RoleMenuItem[] {
  const own = menusForRolePortal(tab, portal);
  if (own.length) return own;
  const sourcePortal = tab.menus[0]?.portal;
  return tab.menus.filter((menu) => menu.portal === sourcePortal);
}

export function modulesForRolePortal(modules: CommonAccessModule[], portal: AccessPortal): CommonAccessModule[] {
  return modules.map((module) => ({
    ...module,
    tabs: module.tabs.filter((tab) => Boolean(menuForRolePortal(tab, portal))),
  })).filter((module) => module.tabs.length > 0);
}

export function orderAccessModules<T extends { label: string }>(modules: T[], order: string[]): T[] {
  const positions = new Map(order.map((label, index) => [label, index]));
  return [...modules].sort((a, b) => (positions.get(a.label) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.label) ?? Number.MAX_SAFE_INTEGER));
}

function icon(value: Icon | string | undefined): Icon {
  return typeof value === 'string' ? ICON_REGISTRY[value] || LayoutDashboard : value || LayoutDashboard;
}

function leafLinks(items: NavLink[]): NavLink[] {
  return items.flatMap((item) => {
    const children = [...(item.children ?? []), ...(item.subItems ?? [])];
    // A container pointing at its first child is not another independent page.
    return [...(children.some((child) => child.href === item.href) ? [] : [item]), ...leafLinks(children)];
  });
}

function roleNavigation(portal: 'admin' | 'hr'): NavGroup[] {
  const roleCodes = portal === 'admin' ? new Set(['organization_admin', 'org_admin', 'admin', 'owner', 'ceo'])
    : new Set(['hr', 'hr_admin', 'hr_manager']);
  const allowed = (item: { minRoles?: string[]; excludeRoles?: string[] }) =>
    (!item.minRoles?.length || item.minRoles.some((role) => roleCodes.has(role))) &&
    (!item.excludeRoles?.length || !item.excludeRoles.some((role) => roleCodes.has(role)));
  const filterLinks = (items: NavLink[]): NavLink[] => items.filter((item) => allowed(item)).map((item) => ({
    ...item,
    href: portal === 'hr' ? mapToHRHref(item.href) : item.href,
    children: item.children ? filterLinks(item.children) : undefined,
    subItems: item.subItems ? filterLinks(item.subItems) : undefined,
  }));
  return NAVIGATION_SECTIONS.filter((section) => allowed(section)).map((section) => ({
    label: section.label, icon: section.icon || section.items[0]?.icon, items: filterLinks(section.items),
  })).filter((group) => group.items.length > 0);
}

function navigation(portal: AccessPortal): NavGroup[] {
  if (portal === 'admin' || portal === 'hr') {
    return roleNavigation(portal);
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
  if (/^careers$/i.test(label)) return 'Recruitment';
  if (/^(master operations|operational masters)$/i.test(label)) return 'Master Operations';
  return label;
}

function commonRoute(route: string): string {
  return route.replace(/^\/(hr|manager|team-lead|employee|intern|consultant|finance)(?=\/)/, '');
}

/** One visible tab for equivalent portal routes, retaining each actual menu ID. */
export function buildCommonAccessModules(items: RoleMenuItem[]): { modules: CommonAccessModule[]; otherPages: CommonAccessTab[] } {
  const byName = new Map<string, CommonAccessModule>();
  const otherByRoute = new Map<string, CommonAccessTab>();
  for (const { code: portal } of ACCESS_PORTALS) {
    const view = buildAccessTabs(items, portal);
    for (const page of view.otherPages) {
      const key = commonRoute(page.route!);
      const existing = otherByRoute.get(key);
      if (existing) existing.menus.push(page);
      else otherByRoute.set(key, { label: page.label, icon: LayoutDashboard, menus: [page] });
    }
    for (const group of view.groups) {
      for (const tab of group.tabs) {
        const label = tab.label === 'Holiday Calendar' ? 'Leaves' : commonModuleName(group.label);
        let module = byName.get(label);
        if (!module) {
          module = { label, icon: group.icon, tabs: [] };
          byName.set(label, module);
        }
        const existing = module.tabs.find((entry) => entry.label.toLowerCase() === tab.label.trim().toLowerCase());
        if (existing && !existing.menus.some((menu) => menu.portal === tab.menu.portal)) {
          existing.menus.push(tab.menu);
        } else if (!existing) module.tabs.push({ label: tab.label.trim(), icon: tab.icon, menus: [tab.menu] });
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

function workingPageModule(route: string, component: string): string {
  if (component === 'CompanyProfilePage') return 'Settings';
  if (component === 'MasterBuilderPage' || component === 'MasterBuilderDetailPage') return 'Masters';
  const path = commonRoute(route).toLowerCase().replace(/^\/settings-group(?=\/)/, '/settings');
  if (/^\/(operational-masters)/.test(path)) return 'Master Operations';
  if (/^\/masters/.test(path)) return 'Masters';
  if (/^\/modules|\/settings\/modules/.test(path)) return 'Modules';
  if (/^\/analytics|^\/reports$/.test(path)) return 'Reports & Analytics';
  if (/^\/policies/.test(path)) return 'Policies';
  if (/workflow/.test(path) && !/attendance/.test(path)) return 'Workflows';
  if (/loan/.test(path)) return 'Loan Management';
  if (/settlement|gratuity/.test(path)) return 'Settlements';
  if (/leave|holiday/.test(path)) return 'Leaves';
  if (/expense|travel|mileage|reimbursement/.test(path)) return 'Expenses';
  if (/lms|learning|training/.test(path)) return 'LMS';
  if (/recruit|mrf|interview|referral|job-opening|career|hiring|ijp/.test(path)) return 'Recruitment';
  if (/asset/.test(path)) return 'Assets';
  if (/performance|goal|feedback/.test(path)) return 'Performance';
  if (/attendance|face-|shift|live-tracking|timesheet/.test(path)) return 'Attendance';
  if (/payroll|payslip|salary|tax-declaration/.test(path)) return 'Payroll';
  if (/notification/.test(path)) return 'Notifications';
  if (/announcement/.test(path)) return 'Announcements';
  if (/helpdesk|health-wellness|ai-assistant|survey/.test(path)) return 'Support';
  if (/employee|org-structure|team|letter/.test(path)) return 'Core HR';
  if (/profile|lifecycle|document|id-card|org-chart/.test(path)) return 'My Workspace';
  if (/approval/.test(path)) return 'Approvals';
  if (/request/.test(path)) return 'HR Operations';
  if (/dashboard/.test(path)) return 'Dashboard';
  return 'Settings';
}

function workingPageName(component: string, mode: string): string {
  const names: Record<string, string> = {
    ApprovalInboxPage: 'Approval Inbox', TrackingHistoryPage: 'Live Tracking History',
    CustomReportBuilder: 'Leave Report Builder', BurnoutRiskDashboard: 'Burnout Risk Report',
    AssignAsset: 'Assign Asset', TransferAsset: 'Transfer Asset', ReturnAsset: 'Return Asset',
    Maintenance: 'Asset Maintenance', Licenses: 'Asset Licenses', Reports: 'Asset Reports', Analytics: 'Asset Analytics',
    CourseDetailPage: 'Course Details', AssessmentPlayerPage: 'Course Assessment',
    MasterBuilderDetailPage: 'Master Builder Details', CreatePolicyPage: mode === 'edit' ? 'Edit Policy' : 'Create Policy',
    WorkflowBuilderPage: mode === 'edit' ? 'Edit Workflow' : mode === 'create' ? 'Create Workflow' : 'Workflow Builder',
    EmployeeProfilePage: 'Employee Details', EmployeeEditPage: 'Edit Employee',
    GeneralSettingsPage: 'General Settings', SettingsSecurityPage: 'Security Settings',
    OrgLeaveSettings: 'Organization Leave Settings', CompanyProfilePage: 'Company Profile',
  };
  return names[component] ?? component.replace(/Page$/, '').replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/^Lms\b/, 'LMS').replace(/^Mrf\b/, 'MRF')
    .replace(/^Ceo\b/, 'CEO').replace(/^Id\b/, 'ID');
}

function workingModuleIcon(label: string): Icon {
  const section = NAVIGATION_SECTIONS.find((entry) => commonModuleName(entry.label) === label);
  const fallbacks: Record<string, string> = { Workflows: 'GitBranch', Policies: 'ShieldCheck', Notifications: 'Bell',
    Announcements: 'Megaphone', 'My Workspace': 'User', Support: 'LifeBuoy', Approvals: 'CheckCircle' };
  return icon(section?.icon || section?.items[0]?.icon || fallbacks[label]);
}

/** Complete working-page catalog for management, not an unfiltered list of URL aliases. */
export function buildCompleteAccessModules(items: RoleMenuItem[]): CommonAccessModule[] {
  const modules = buildCommonAccessModules(items).modules;
  for (const { code: portal } of ACCESS_PORTALS) {
    for (const definition of WORKING_PAGE_GROUPS[portal] ?? []) {
      const byModule = new Map<string, RoleMenuItem[]>();
      for (const route of definition.routes) {
        // Master hub wildcards must never substitute for separately managed tabs.
        if (/^\/(hr\/)?(masters|operational-masters)(\/\*|$)/.test(route)) continue;
        const menu = items.find((item) => item.portal === portal && item.route?.toLowerCase() === route.toLowerCase());
        if (!menu) continue;
        const label = workingPageModule(route, definition.component);
        const existingMenus = byModule.get(label) ?? [];
        if (!existingMenus.some((entry) => entry.id === menu.id)) byModule.set(label, [...existingMenus, menu]);
      }
      for (const [label, menus] of byModule) {
        let anchors = modules.flatMap((module) => module.tabs).filter((tab) => tab.menus.some((menu) => menus.some((entry) => entry.id === menu.id)));
        if (anchors.length > 1 && definition.component !== 'LoanManagement') {
          const target = modules.find((module) => module.label === label)?.tabs.find((tab) => anchors.includes(tab)) ?? anchors[0];
          for (const anchor of anchors) {
            if (anchor === target) continue;
            const aliases = anchor.menus.filter((menu) => menus.some((entry) => entry.id === menu.id));
            target.menus.push(...aliases.filter((menu) => !target.menus.some((entry) => entry.id === menu.id)));
            anchor.menus = anchor.menus.filter((menu) => !aliases.includes(menu));
          }
          anchors = [target];
        }
        const covered = new Set(anchors.flatMap((tab) => tab.menus.map((menu) => menu.id)));
        let missing = menus.filter((menu) => !covered.has(menu.id));
        if (!missing.length) continue;
        if (anchors.length === 1) {
          anchors[0].menus.push(...missing);
          continue;
        }
        if (anchors.length > 1) {
          // A reused component can expose distinct tabs (e.g. Loan Types vs Loans).
          // Attach short legacy aliases only to the matching tab, not to both.
          missing = missing.filter((menu) => {
            const segment = menu.route?.split('/').pop();
            const matching = anchors.filter((tab) => tab.menus.some((entry) => entry.portal === portal && entry.route?.split('/').pop() === segment));
            if (matching.length !== 1) return true;
            matching[0].menus.push(menu);
            return false;
          });
          if (!missing.length) continue;
        }
        let module = modules.find((entry) => entry.label === label);
        if (!module) {
          module = { label, icon: workingModuleIcon(label), tabs: [] };
          modules.push(module);
        }
        const name = workingPageName(definition.component, definition.mode);
        const existing = module.tabs.find((tab) => tab.label === name);
        if (existing) existing.menus.push(...missing);
        else module.tabs.push({ label: name, icon: module.icon, menus: missing });
      }
    }
  }
  // LMS integrations are also linked from General Settings. Keep their single
  // access entry visibly under Settings, rather than losing it to LMS deduplication.
  const lmsSettingsRoutes = new Set(Object.values(WORKING_PAGE_GROUPS).flatMap((groups) => groups
    .filter((group) => group.component === 'LmsIntegrationSettingsPage').flatMap((group) => group.routes.map((route) => route.toLowerCase()))));
  const lmsSettingsMenus = items.filter((item) => item.route && lmsSettingsRoutes.has(item.route.toLowerCase()));
  if (lmsSettingsMenus.length) {
    for (const module of modules) for (const tab of module.tabs) {
      tab.menus = tab.menus.filter((menu) => !lmsSettingsMenus.some((entry) => entry.id === menu.id));
    }
    let settings = modules.find((module) => module.label === 'Settings');
    if (!settings) { settings = { label: 'Settings', icon: icon('Settings'), tabs: [] }; modules.push(settings); }
    settings.tabs.push({ label: 'LMS Settings', icon: icon('GraduationCap'), menus: lmsSettingsMenus });
  }
  const configurationMenus = items.filter((item) => item.portal && item.route && SETTINGS_CONFIGURATION_ROUTES[item.portal]?.some((route) =>
    SETTINGS_CONFIGURATION_TABS.some((tab) => item.route === `${route}?tab=${tab.id}`)));
  if (configurationMenus.length) {
    let settings = modules.find((module) => module.label === 'Settings');
    if (!settings) { settings = { label: 'Settings', icon: icon('Settings'), tabs: [] }; modules.push(settings); }
    for (const module of modules) for (const tab of module.tabs) {
      tab.menus = tab.menus.filter((menu) => !configurationMenus.some((child) => child.portal === menu.portal && child.route?.split('?')[0] === menu.route));
    }
    for (const tab of SETTINGS_CONFIGURATION_TABS) {
      const menus = configurationMenus.filter((menu) => new URLSearchParams(menu.route!.split('?')[1]).get('tab') === tab.id);
      if (menus.length) settings.tabs.push({ label: tab.label, icon: icon(tab.icon), menus });
    }
  }
  for (const flow of TAB_ACCESS_FLOWS) {
    const owners = modules.flatMap((module) => module.tabs).filter((tab) => tab.menus.some((menu) => menu.portal === flow.portal && flow.owners.includes(menu.route?.toLowerCase() ?? '')));
    if (!owners.length) continue;
    const owned = items.filter((menu) => menu.portal === flow.portal && flow.pages.includes(menu.route?.toLowerCase() ?? ''));
    // Remove action-only checkboxes, but keep other source versions in their tabs.
    for (const module of modules) for (const tab of module.tabs) tab.menus = tab.menus.filter((menu) => !owned.some((page) => page.id === menu.id));
    for (const tab of owners) tab.menus.push(...owned.filter((page) => !tab.menus.some((menu) => menu.id === page.id)));
  }
  return modules.map((module) => ({ ...module, tabs: module.tabs.filter((tab) => tab.menus.length > 0) })).filter((module) => module.tabs.length > 0);
}
