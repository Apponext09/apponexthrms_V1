import { useEffect, useMemo, useState } from 'react';
import { expandTabAccessIds, tabSelectionMenus } from '@apponexthrms/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, CheckSquare2, KeyRound, Save } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { useMenuAccess } from '@/features/access/useMenuAccess';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { AccessRole } from '../hooks/useAccessRoles';
import { flattenMenus, toggleMenu, toggleSourceModule, type RoleMenuItem } from './roleMenuSelection';
import { buildAccessSourceGroups, buildCompleteAccessModules, buildSourceLabelledModules, orderAccessModules } from './roleAccessTabs';

type MenuResponse = { data?: { items?: RoleMenuItem[] } };
type GrantResponse = { data?: { menuIds?: number[]; permissionCodes?: string[]; moduleOrder?: string[] } };
type PermissionItem = { id: number; code: string; module: string; resource: string; action: string; description?: string | null; menuIds: number[] };
type PermissionResponse = { data?: { items?: PermissionItem[] } };
type ManagedFeature = { label: string; source: string; menus: RoleMenuItem[] };

const isViewAction = (permission: PermissionItem) => ['read', 'view'].includes(permission.action.toLowerCase());
const actionLabel = (permission: PermissionItem) => permission.action.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function RoleAccessManager({ role, onBack }: { role: AccessRole; onBack: () => void }) {
  const queryClient = useQueryClient();
  const managerAccess = useMenuAccess();
  const managerPermissions = useAuthStore((state) => state.user?.permissions ?? []);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageSearch, setPageSearch] = useState('');
  const [managedFeature, setManagedFeature] = useState<ManagedFeature | null>(null);
  const menuQuery = useQuery({
    queryKey: ['rbac-menus'],
    queryFn: async () => {
      const response = await apiClient.get<MenuResponse>('/rbac/menus');
      const rows = response.data?.data?.items;
      if (!Array.isArray(rows)) throw new Error('Menu catalog is unavailable');
      return rows;
    },
  });
  const accessQuery = useQuery({
    queryKey: ['role-menu-access', role.id],
    queryFn: async () => {
      const response = await apiClient.get<GrantResponse>(`/rbac/roles/${role.id}/menus`);
      const ids = response.data?.data?.menuIds;
      if (!Array.isArray(ids)) throw new Error('Role access is unavailable');
      return {
        menuIds: ids,
        permissionCodes: Array.isArray(response.data?.data?.permissionCodes) ? response.data.data.permissionCodes : [],
        moduleOrder: Array.isArray(response.data?.data?.moduleOrder) ? response.data.data.moduleOrder : [],
      };
    },
  });
  const permissionQuery = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: async () => {
      const response = await apiClient.get<PermissionResponse>('/rbac/permissions');
      const rows = response.data?.data?.items;
      if (!Array.isArray(rows)) throw new Error('Permission catalog is unavailable');
      return rows;
    },
  });

  useEffect(() => { setDirty(false); }, [role.id]);
  useEffect(() => {
    if (accessQuery.data && !dirty) {
      setSelected(accessQuery.data.menuIds);
      setSelectedPermissions(accessQuery.data.permissionCodes);
      setModuleOrder(accessQuery.data.moduleOrder);
    }
  }, [accessQuery.data, dirty]);

  const items = useMemo(() => flattenMenus(menuQuery.data ?? []), [menuQuery.data]);
  const modules = useMemo(() => buildCompleteAccessModules(items), [items]);
  const portalModules = modules;
  const orderedModules = useMemo(() => orderAccessModules(portalModules, moduleOrder), [portalModules, moduleOrder]);
  const sourceGroups = useMemo(() => buildAccessSourceGroups(orderedModules), [orderedModules]);
  const labelledModules = useMemo(() => buildSourceLabelledModules(orderedModules), [orderedModules]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedPermissionSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
  const selectedPages = sourceGroups.flatMap((source) => source.modules.flatMap((module) => module.tabs))
    .filter((tab) => tabSelectionMenus(tab.menus).some((menu) => selectedSet.has(menu.id)));
  const managerIsAdmin = managerAccess.access?.roleCodes.some((code) => ['organization_admin', 'ceo'].includes(code)) ?? false;
  const mayGrant = (item: RoleMenuItem) => managerIsAdmin || Boolean(managerAccess.access?.menuCodes.includes(item.code));
  const mayGrantPermission = (permission: PermissionItem) => managerIsAdmin || managerPermissions.includes('*') || managerPermissions.includes(permission.code);
  const permissionsForMenus = (menus: RoleMenuItem[]) => {
    const ids = new Set(menus.map((menu) => menu.id));
    return (permissionQuery.data ?? []).filter((permission) => permission.menuIds.some((id) => ids.has(id)));
  };
  const toggleFeature = (menus: RoleMenuItem[], enabled: boolean) => {
    setSelected((current) => expandTabAccessIds(menus.reduce((ids, entry) => toggleMenu(items, ids, entry.id, enabled), current), items));
    const applicable = permissionsForMenus(menus);
    setSelectedPermissions((current) => {
      const next = new Set(current);
      for (const permission of applicable) {
        if (!enabled || (isViewAction(permission) && mayGrantPermission(permission))) {
          if (enabled) next.add(permission.code); else next.delete(permission.code);
        }
      }
      return [...next].sort();
    });
    setDirty(true);
  };
  const toggleModule = (parentIds: number[], pageIds: number[], checked: boolean) => {
    setSelected((current) => toggleSourceModule(items, current, parentIds, pageIds, checked));
    setDirty(true);
  };
  const selectAllTabs = (ids: number[]) => {
    setSelected((current) => ids.reduce((grants, id) => toggleMenu(items, grants, id, true), current));
    setDirty(true);
  };
  const moveModule = (index: number, direction: -1 | 1) => {
    const next = orderedModules.map((module) => module.label);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setModuleOrder(next);
    setDirty(true);
  };
  const setModulePosition = (from: number, to: number) => {
    if (from === to || to < 0 || to >= orderedModules.length) return;
    const next = orderedModules.map((module) => module.label);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setModuleOrder(next);
    setDirty(true);
  };
  const save = async () => {
    try {
      setSaving(true);
      // Expand route aliases only for the explicitly selected page's source portal.
      const menuIds = sourceGroups.flatMap((source) => source.modules.flatMap((module) => module.tabs)).reduce((ids, tab) => {
        const aliases = tab.menus;
        if (!tabSelectionMenus(aliases).some((menu) => ids.includes(menu.id))) return ids;
        return aliases.filter(mayGrant).reduce((grants, menu) => toggleMenu(items, grants, menu.id, true), ids);
      }, selected);
      const grantedMenuIds = new Set(menuIds);
      const allowedPermissionCodes = new Set((permissionQuery.data ?? [])
        .filter((permission) => permission.menuIds.some((id) => grantedMenuIds.has(id)))
        .map((permission) => permission.code));
      const normalizedPermissions = new Set(selectedPermissions.filter((code) => allowedPermissionCodes.has(code)));
      for (const source of sourceGroups) for (const module of source.modules) for (const tab of module.tabs) {
        if (!tabSelectionMenus(tab.menus).some((menu) => menuIds.includes(menu.id))) continue;
        for (const permission of permissionsForMenus(tab.menus)) {
          if (isViewAction(permission) && mayGrantPermission(permission)) normalizedPermissions.add(permission.code);
        }
      }
      await apiClient.put(`/rbac/roles/${role.id}/menus`, {
        menuIds,
        permissionCodes: [...normalizedPermissions].sort(),
        moduleOrder: orderedModules.map((module) => module.label),
      });
      setSelected(menuIds);
      setSelectedPermissions([...normalizedPermissions].sort());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['role-menu-access', role.id] }),
        queryClient.invalidateQueries({ queryKey: ['menu-access'] }),
        queryClient.invalidateQueries({ queryKey: ['access-roles'] }),
      ]);
      setDirty(false);
      showToast.success(`Access saved for ${role.name}`);
    } catch (error: unknown) {
      const failure = error as { response?: { data?: { message?: string } } };
      showToast.error(failure?.response?.data?.message || 'Could not save role access');
    } finally { setSaving(false); }
  };

  return <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2"><ArrowLeft className="mr-1 h-4 w-4" /> Roles</Button>
        <h2 className="text-xl font-bold">Manage access: {role.name}</h2>
        <p className="text-sm text-muted-foreground">Each module contains all its pages, labelled with their source role (CEO / Admin, HR, Intern, etc.). Pages still open in this role's existing login.</p>
      </div>
      <Button type="button" onClick={save} disabled={saving || !dirty || menuQuery.isLoading || accessQuery.isLoading || permissionQuery.isLoading || menuQuery.isError || accessQuery.isError || permissionQuery.isError}>
        <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save access'}
      </Button>
    </div>
    {(menuQuery.isLoading || accessQuery.isLoading || permissionQuery.isLoading) && <p role="status" className="text-sm text-muted-foreground">Loading modules, actions and role access...</p>}
    {(menuQuery.isError || accessQuery.isError || permissionQuery.isError) && <div role="alert" className="text-sm text-destructive">Could not load role access. <button type="button" className="underline" onClick={() => { void menuQuery.refetch(); void accessQuery.refetch(); void permissionQuery.refetch(); }}>Retry</button></div>}
    {!menuQuery.isLoading && !accessQuery.isLoading && !permissionQuery.isLoading && !menuQuery.isError && !accessQuery.isError && !permissionQuery.isError && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input type="search" aria-label="Search access modules and pages" placeholder="Search modules or pages..." value={pageSearch} onChange={(event) => setPageSearch(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-80" />
        <span className="text-sm text-muted-foreground">{portalModules.length} modules across {sourceGroups.length} portal sources</span>
      </div>
      <div className="space-y-3">
        {labelledModules.map((module, index) => {
          const search = pageSearch.trim().toLowerCase();
          const visibleTabs = !search || module.label.toLowerCase().includes(search) ? module.tabs : module.tabs.filter((tab) => `${tab.label} ${tab.source}`.toLowerCase().includes(search));
          if (!visibleTabs.length) return null;
          const moduleMenus = module.tabs.flatMap((tab) => tab.menus);
          const parentIds = [...new Set(moduleMenus.map((menu) => menu.parentId).filter((id): id is number => id != null))];
          const moduleEnabled = parentIds.length > 0 && parentIds.every((id) => selectedSet.has(id));
          const Icon = module.icon;
          return <section key={module.label} className="rounded-xl border border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="font-semibold"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{module.label}</h3><span className="text-xs text-muted-foreground">{module.tabs.filter((tab) => tabSelectionMenus(tab.menus).some((menu) => selectedSet.has(menu.id))).length}/{module.tabs.length} pages</span></div>
              <div className="flex items-center gap-2">
                <select value={index + 1} onChange={(event) => setModulePosition(index, Number(event.target.value) - 1)} aria-label={`Position for ${module.label}`} title="This role's sidebar position" className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  {orderedModules.map((_, position) => <option key={position} value={position + 1}>#{position + 1}</option>)}
                </select>
                <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveModule(index, -1)} aria-label={`Move ${module.label} up`} title="Move module up"><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" disabled={index === orderedModules.length - 1} onClick={() => moveModule(index, 1)} aria-label={`Move ${module.label} down`} title="Move module down"><ArrowDown className="h-4 w-4" /></Button>
                {parentIds.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => toggleModule(parentIds.filter((id) => { const parent = items.find((item) => item.id === id); return parent && (moduleEnabled || mayGrant(parent)); }), moduleMenus.map((menu) => menu.id), !moduleEnabled)}>{moduleEnabled ? 'Unselect module' : 'Select module'}</Button>}
                <Button type="button" variant="outline" size="sm" onClick={() => selectAllTabs(moduleMenus.filter(mayGrant).map((menu) => menu.id))}><CheckSquare2 className="mr-1 h-4 w-4" /> Select all tabs</Button>
              </div>
            </div>
            <div className="grid gap-2 pt-3 sm:grid-cols-2 xl:grid-cols-3">{visibleTabs.map((tab) => {
              const TabIcon = tab.icon; const aliases = tab.menus; const menu = aliases[0];
              const checked = tabSelectionMenus(aliases).some((entry) => selectedSet.has(entry.id));
              const actionCount = permissionsForMenus(aliases).filter((permission) => !isViewAction(permission) && selectedPermissionSet.has(permission.code)).length;
              return <div key={`${module.label}:${tab.label}:${tab.portal}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-muted/60">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={checked} disabled={!menu || (!checked && !aliases.every(mayGrant))} onChange={(event) => toggleFeature(aliases, event.target.checked)} aria-label={`Allow ${tab.label} (${tab.source})`} />
                <TabIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm" title={menu?.route || ''}>{tab.label} <span className="text-xs text-muted-foreground">— {tab.source}</span></span>
                <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" disabled={!checked} onClick={() => setManagedFeature({ label: tab.label, source: tab.source, menus: aliases })}>
                  <KeyRound className="mr-1 h-3.5 w-3.5" /> Manage{actionCount ? ` (${actionCount})` : ''}
                </Button>
              </div>;
            })}</div>
          </section>;
        })}
        {portalModules.length === 0 && <p className="text-sm text-muted-foreground">No working pages are registered.</p>}
      </div>
      <div className="rounded-xl bg-muted/50 p-4 text-sm"><span className="font-medium">Selected access: {selectedPages.length} page{selectedPages.length === 1 ? '' : 's'}</span><span className="ml-2 text-muted-foreground">across all modules</span></div>
      <p className="text-xs text-muted-foreground">View access includes related detail pages. Create, update, delete, approve and other sensitive actions are granted separately through Manage Access.</p>
      {dirty && <p className="text-xs text-amber-600">You have unsaved access changes.</p>}
    </>}
    <Dialog open={Boolean(managedFeature)} onOpenChange={(open) => { if (!open) setManagedFeature(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage access: {managedFeature?.label}</DialogTitle>
          <DialogDescription>{managedFeature?.source} portal. View includes the feature list, details and dependent read-only pages.</DialogDescription>
        </DialogHeader>
        {managedFeature && (() => {
          const applicable = permissionsForMenus(managedFeature.menus);
          const featureEnabled = tabSelectionMenus(managedFeature.menus).some((menu) => selectedSet.has(menu.id));
          const actionPermissions = applicable.filter((permission) => !isViewAction(permission));
          return <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={featureEnabled} onChange={(event) => toggleFeature(managedFeature.menus, event.target.checked)} />
              <span><span className="block text-sm font-medium">View</span><span className="block text-xs text-muted-foreground">Open this feature and its dependent detail pages.</span></span>
            </label>
            {actionPermissions.map((permission) => {
              const checked = selectedPermissionSet.has(permission.code);
              const grantable = mayGrantPermission(permission);
              return <label key={permission.code} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={checked} disabled={!featureEnabled || (!checked && !grantable)} onChange={(event) => {
                  setSelectedPermissions((current) => event.target.checked ? [...new Set([...current, permission.code])].sort() : current.filter((code) => code !== permission.code));
                  setDirty(true);
                }} />
                <span><span className="block text-sm font-medium">{actionLabel(permission)}</span><span className="block text-xs text-muted-foreground">{permission.description || permission.code}</span></span>
              </label>;
            })}
            {!actionPermissions.length && <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">This feature currently has read-only access. No additional server actions are registered.</p>}
          </div>;
        })()}
        <DialogFooter><Button type="button" onClick={() => setManagedFeature(null)}>Apply</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
