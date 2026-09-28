import { expect, it } from 'vitest';
import { getVisibleSections } from '@/config/navigation';
import { mapToHRHref } from '@/layouts/HRLayout';
import { MANAGER_NAV } from '@/layouts/ManagerLayout';
import { TEAM_LEAD_NAV } from '@/layouts/TeamLeadLayout';
import { FINANCE_NAV } from '@/layouts/FinanceSidebar';
import { INTERN_NAV } from '@/layouts/InternSidebar';
import { CONSULTANT_NAV } from '@/layouts/ConsultantSidebar';
import { EMPLOYEE_NAV_SECTIONS } from '@/features/employee/layout/EmployeeSidebar';
import { PORTAL_ROUTES } from '../../../../../server/src/modules/rbac/menu.catalog';

type Link = { name: string; href: string; children?: Link[]; subItems?: Link[] };
function links(items: Link[]): Link[] { return items.flatMap((item) => [item, ...links(item.children ?? []), ...links(item.subItems ?? [])]); }

it('registers every original portal navigation route in the menu catalog', () => {
  const sources: Record<string, Link[]> = {
    admin: ['organization_admin', 'ceo', 'admin', 'owner'].flatMap((role) => links(getVisibleSections([role]).flatMap((section) => section.items))),
    hr: ['hr', 'hr_admin', 'hr_manager'].flatMap((role) => links(getVisibleSections([role]).flatMap((section) => section.items))).map((item) => ({ ...item, href: mapToHRHref(item.href) })),
    manager: links(MANAGER_NAV.flatMap((group) => group.items)),
    teamlead: links(TEAM_LEAD_NAV.flatMap((group) => group.items)),
    finance: links(FINANCE_NAV.flatMap((group) => group.items)),
    intern: links(INTERN_NAV.flatMap((group) => group.items)),
    consultant: links(CONSULTANT_NAV.flatMap((group) => group.items)),
    employee: links(EMPLOYEE_NAV_SECTIONS.flatMap((group) => group.items)),
  };
  for (const [portal, items] of Object.entries(sources)) {
    const catalog = new Set(PORTAL_ROUTES[portal]);
    const missing = items.filter((item) => !catalog.has(item.href) && !/^\/(hr\/)?(masters|operational-masters)(\?|\/)/.test(item.href));
    expect(missing.map((item) => `${item.name}:${item.href}`), portal).toEqual([]);
  }
});
