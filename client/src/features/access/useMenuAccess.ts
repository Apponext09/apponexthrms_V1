import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchPath } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';

export interface MenuCatalogItem {
  id: number;
  code: string;
  label: string;
  parentId: number | null;
  path: string | null;
  route?: string | null;
  portal: string | null;
  sortOrder: number;
  subscriptionModule?: string | null;
}

interface MyMenuAccess {
  menuCodes: string[];
  paths: string[];
  roleCodes: string[];
  configured: boolean;
}

const EMPTY_CATALOG: MenuCatalogItem[] = [];

const unwrap = <T,>(response: { data: { data?: T } & Partial<T> }): T => (response.data.data ?? response.data) as T;

export function matchesMenuPath(pattern: string, pathname: string): boolean {
  if (!pattern.startsWith('/')) return false;
  if (pattern.includes('?') || pathname.includes('?')) return pattern === pathname;
  return Boolean(matchPath({ path: pattern, end: true }, pathname));
}

export function firstGrantedPage(paths: string[]): string | undefined {
  return paths.find((path) => path.startsWith('/') && !path.includes(':') && !path.includes('*') &&
    !/^\/(hr|manager|employee|intern|consultant|finance|team-lead)$/.test(path));
}

export function isPathGranted(pathname: string, catalog: MenuCatalogItem[], allowedPaths: string[]): boolean {
  // A URL tab with its own catalog entry must not inherit access from the hub page.
  const [base, query] = pathname.split('?', 2);
  const tab = new URLSearchParams(query || '').get('tab');
  if (tab && catalog.some((item) => (item.path ?? item.route) === `${base}?tab=${tab}`)) {
    return allowedPaths.includes(`${base}?tab=${tab}`);
  }
  const candidates = catalog.filter((item) => (item.path ?? item.route) && matchesMenuPath((item.path ?? item.route)!, pathname));
  if (!candidates.length) return false;
  const matchingIds = new Set(candidates.map((item) => item.id));
  const matchingAllowed = catalog.some((item) => matchingIds.has(item.id) && (item.path ?? item.route) && allowedPaths.includes((item.path ?? item.route)!));
  return matchingAllowed;
}

export function useMenuAccess() {
  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const isSuperAdmin = Boolean(user?.roles?.includes('super_admin') || user?.accessRole === 'super_admin');
  const enabled = authenticated && Boolean(user) && !isSuperAdmin;

  const catalogQuery = useQuery({
    queryKey: ['menu-catalog'],
    queryFn: async () => {
      const response = await apiClient.get('/rbac/menus');
      return unwrap<{ items: MenuCatalogItem[] }>(response).items;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const accessQuery = useQuery({
    queryKey: ['menu-access', user?.id, user?.organizationId],
    queryFn: async () => {
      const response = await apiClient.get('/rbac/me/menus');
      return unwrap<MyMenuAccess>(response);
    },
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const catalog = catalogQuery.data ?? EMPTY_CATALOG;
  const access = accessQuery.data;
  const ready = isSuperAdmin || (catalogQuery.isSuccess && accessQuery.isSuccess && access?.configured === true);
  const error = enabled && (catalogQuery.isError || accessQuery.isError || (accessQuery.isSuccess && !access?.configured));
  const retry = useCallback(() => {
    void catalogQuery.refetch();
    void accessQuery.refetch();
  }, [catalogQuery.refetch, accessQuery.refetch]);
  const canAccessPath = useCallback((path: string) => isSuperAdmin || (ready && isPathGranted(path, catalog, access?.paths ?? [])), [isSuperAdmin, ready, catalog, access?.paths]);

  return { catalog, access, ready, error, retry, isSuperAdmin, canAccessPath };
}
