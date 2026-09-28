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

  it('shows a granted LMS Settings link under Settings in the role portal', () => {
    const pages = [
      { id: 7, code: 'admin-lms-settings', label: 'Integrations', parentId: null, portal: 'admin', route: '/settings/lms-integrations' },
      { id: 8, code: 'hr-lms-settings', label: 'Integrations', parentId: null, portal: 'hr', route: '/hr/settings/lms-integrations' },
    ];
    const groups = buildGrantedNavigationGroups(pages, ['/hr/settings/lms-integrations'], 'hr');
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Settings');
    expect(groups[0].items.map((item) => [item.name, item.href])).toEqual([['LMS Settings', '/hr/settings/lms-integrations']]);
  });

  it('links a profile-only Intern to its own Profile page', () => {
    const pages = [
      { id: 9, code: 'employee-profile', label: 'Profile', parentId: null, portal: 'employee', route: '/employee/profile' },
      { id: 10, code: 'intern-profile', label: 'Profile', parentId: null, portal: 'intern', route: '/intern/profile' },
    ];
    const routes = buildGrantedNavigationGroups(pages, ['/intern/profile'], 'intern').flatMap((group) => group.items.map((item) => item.href));
    expect(routes).toEqual(['/intern/profile']);
  });

  it('applies the saved role-specific module priority', () => {
    const groups = buildGrantedNavigationGroups(catalog, ['/finance/dashboard', '/recruitment/jobs'], 'finance', ['Recruitment', 'Dashboard']);
    expect(groups.map((group) => group.label)).toEqual(['Recruitment', 'Dashboard']);
  });
});
