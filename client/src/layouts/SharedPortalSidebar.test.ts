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
  it('shows saved Finance grants from other portals instead of only fixed Finance tabs', () => {
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

  it('applies the saved role-specific module priority', () => {
    const groups = buildGrantedNavigationGroups(catalog, ['/finance/dashboard', '/recruitment/jobs'], 'finance', ['Recruitment', 'Dashboard']);
    expect(groups.map((group) => group.label)).toEqual(['Recruitment', 'Dashboard']);
  });
});
