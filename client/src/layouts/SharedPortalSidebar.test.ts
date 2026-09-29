import { describe, expect, it } from 'vitest';
import { buildGrantedNavigationGroups } from './SharedPortalSidebar';
import type { RoleMenuItem } from '@/features/settings/components/roleMenuSelection';

const catalog: RoleMenuItem[] = [
  { id: 1, code: 'module:general', label: 'General', parentId: null },
  { id: 2, code: 'page:finance:/finance/dashboard', label: 'Dashboard', parentId: 1, portal: 'finance', route: '/finance/dashboard' },
  { id: 3, code: 'page:admin:/recruitment/jobs', label: 'Jobs', parentId: 1, portal: 'admin', route: '/recruitment/jobs' },
  { id: 4, code: 'page:manager:/manager/ijp-approvals', label: 'IJP Approvals', parentId: 1, portal: 'manager', route: '/manager/ijp-approvals' },
];

describe('granted sidebar navigation', () => {
  it('shows granted working modules even when they have no role-portal variant', () => {
    const groups = buildGrantedNavigationGroups(catalog, ['/finance/dashboard', '/recruitment/jobs', '/manager/ijp-approvals'], 'finance');
    const routes = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(routes).toContain('/finance/dashboard');
    expect(routes).toContain('/recruitment/jobs');
    expect(routes).toContain('/manager/ijp-approvals');
  });

  it('does not show tabs without a saved page grant', () => {
    const groups = buildGrantedNavigationGroups(catalog, ['/finance/dashboard'], 'finance');
    expect(groups.flatMap((group) => group.items.map((item) => item.href))).toEqual(['/finance/dashboard']);
  });

  it('shows newly catalogued static pages but never unresolved details URLs', () => {
    const pages = [...catalog,
      { id: 5, code: 'encashment', label: 'Encashment', parentId: 1, portal: 'admin', route: '/leaves/encashment' },
      { id: 6, code: 'employee-details', label: 'Details', parentId: 1, portal: 'admin', route: '/employees/:id' },
    ];
    const routes = buildGrantedNavigationGroups(pages, ['/leaves/encashment', '/employees/:id'], 'admin').flatMap((group) => group.items.map((item) => item.href));
    expect(routes).toContain('/leaves/encashment');
    expect(routes).not.toContain('/employees/:id');
  });

  it('applies the saved role-specific module priority', () => {
    const groups = buildGrantedNavigationGroups(catalog, ['/finance/dashboard', '/recruitment/jobs'], 'finance', ['Recruitment', 'Dashboard']);
    expect(groups.map((group) => group.label)).toEqual(['Recruitment', 'Dashboard']);
  });
});
