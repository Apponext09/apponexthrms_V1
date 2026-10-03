/** A visible tab owns its detail/create/edit pages, never all sibling module tabs. */
export type TabAccessFlow = { portal: string; owners: string[]; pages: string[] };
export const TAB_ACCESS_FLOWS: TabAccessFlow[] = ['admin', 'hr'].flatMap((portal) => {
  const prefix = portal === 'hr' ? '/hr' : '';
  const paths = (routes: string[]) => routes.map((route) => `${prefix}${route}`);
  return [
    { portal, owners: paths(['/employees']), pages: paths(['/employees/:id', '/employees/:id/edit']) },
    { portal, owners: paths(['/policies/manage']), pages: paths(['/policies/create', '/policies/edit/:id']) },
    { portal, owners: paths(['/assets/list']), pages: paths([portal === 'hr' ? '/assets/details/:id' : '/assets/:id']) },
    { portal, owners: paths(['/workflows/list']), pages: paths(['/workflows/create', '/workflows/new', '/workflow/create', '/workflow/new', '/workflows/builder', '/workflow/builder', '/workflows/:id', '/workflows/:id/edit', '/workflows/:id/builder', ...(portal === 'hr' ? ['/workflow/:id/edit'] : [])]) },
    { portal, owners: paths(['/masters/builder', ...(portal === 'admin' ? ['/settings/master-builder'] : [])]), pages: paths(['/masters/builder/:id', ...(portal === 'admin' ? ['/settings/master-builder/:id'] : [])]) },
    { portal, owners: paths(['/lms/catalog', '/lms/courses', '/lms/my-learning', '/lms/my-courses']), pages: paths(['/lms/catalog/:id', '/lms/courses/:id', '/lms/course/:id', '/lms/assessment/:id']) },
  ];
});

// Tracking history is reached from the live map and is not an independently
// assignable feature. Keep this relationship here so the access editor, API
// expansion, and data migrations all use the same rule.
TAB_ACCESS_FLOWS.push(
  {
    portal: 'admin',
    owners: ['/attendance/live-tracking', '/live-tracking'],
    pages: ['/live-tracking/history', '/admin/live-tracking/history'],
  },
  {
    portal: 'hr',
    owners: ['/hr/live-tracking'],
    pages: ['/hr/live-tracking/history'],
  },
  {
    portal: 'manager',
    owners: ['/manager/live-tracking'],
    pages: ['/manager/live-tracking/history'],
  },
  {
    portal: 'team_lead',
    owners: ['/team-lead/live-tracking'],
    pages: ['/team-lead/live-tracking/history'],
  },
);

// Pages opened from inside a feature inherit that feature's access. These are
// workflows, not separately assignable sidebar capabilities.
TAB_ACCESS_FLOWS.push(
  {
    portal: 'admin',
    owners: ['/leaves', '/leaves/my-leaves'],
    pages: ['/leaves/history', '/leaves/apply', '/leaves/balance', '/leaves/balances', '/leaves/encashment'],
  },
  {
    portal: 'hr',
    owners: ['/hr/leaves', '/hr/leaves/my-leaves'],
    pages: ['/hr/leaves/apply', '/hr/leaves/balance', '/hr/leaves/encashment'],
  },
  {
    portal: 'admin',
    owners: ['/settings/leave-policies'],
    pages: ['/settings/org-leave-settings', '/settings-group/org-leave-settings'],
  },
  {
    portal: 'hr',
    owners: ['/hr/settings/leave-policies'],
    pages: ['/hr/settings/org-leave-settings'],
  },
  {
    portal: 'admin',
    owners: ['/notifications'],
    pages: ['/notifications/preferences'],
  },
  {
    portal: 'admin',
    owners: ['/policies/manage'],
    pages: ['/policies/queries'],
  },
);
TAB_ACCESS_FLOWS.push({ portal: 'employee', owners: ['/employee/lms/catalog', '/employee/lms/my-learning'],
  pages: ['/employee/lms/catalog/:id', '/employee/lms/course/:id', '/employee/lms/assessment/:id', '/employee/lms/assessment/:courseId'] });

const canonical = (route: string) => route.toLowerCase().replace(/\/$/, '');
export function tabOwnedRoutes(route: string, portal: string): string[] {
  return TAB_ACCESS_FLOWS.filter((flow) => flow.portal === portal && flow.owners.some((owner) => canonical(owner) === canonical(route)))
    .flatMap((flow) => flow.pages);
}

export function expandTabAccessIds<T extends { id: number; portal?: string | null; route?: string | null }>(ids: number[], catalog: T[]): number[] {
  const selected = new Set(ids);
  for (const item of catalog) {
    if (!selected.has(Number(item.id)) || !item.route || !item.portal) continue;
    const routes = new Set(tabOwnedRoutes(item.route, item.portal).map(canonical));
    for (const page of catalog) if (page.portal === item.portal && page.route && routes.has(canonical(page.route))) selected.add(Number(page.id));
  }
  return [...selected];
}

/** Shared action pages do not make an unselected sibling tab appear selected. */
export function tabSelectionMenus<T extends { portal?: string | null; route?: string | null }>(menus: T[]): T[] {
  const owners = menus.filter((menu) => menu.route && menu.portal && TAB_ACCESS_FLOWS.some((flow) =>
    flow.portal === menu.portal && flow.owners.some((owner) => canonical(owner) === canonical(menu.route!))));
  if (!owners.length) return menus;
  const pages = new Set(owners.flatMap((owner) => tabOwnedRoutes(owner.route!, owner.portal!).map((route) => `${owner.portal}:${canonical(route)}`)));
  return menus.filter((menu) => !menu.route || !pages.has(`${menu.portal}:${canonical(menu.route)}`));
}
