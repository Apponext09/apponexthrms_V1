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

function icon(value: Icon | string | undefined): Icon {
  return typeof value === 'string' ? ICON_REGISTRY[value] || LayoutDashboard : value || LayoutDashboard;
}

function leafLinks(items: NavLink[]): NavLink[] {
  return items.flatMap((item) => item.children?.length ? leafLinks(item.children)
    : item.subItems?.length ? leafLinks(item.subItems) : [item]);
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
