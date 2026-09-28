import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, CheckSquare2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { useMenuAccess } from '@/features/access/useMenuAccess';
import type { AccessRole } from '../hooks/useAccessRoles';
import { flattenMenus, toggleMenu, type RoleMenuItem } from './roleMenuSelection';
import { buildCompleteAccessModules, defaultPortalForRole, menusForAccessRole, orderAccessModules } from './roleAccessTabs';

type MenuResponse = { data?: { items?: RoleMenuItem[] } };
type GrantResponse = { data?: { menuIds?: number[]; moduleOrder?: string[] } };

export function RoleAccessManager({ role, onBack }: { role: AccessRole; onBack: () => void }) {
  const queryClient = useQueryClient();
  const managerAccess = useMenuAccess();
  const [selected, setSelected] = useState<number[]>([]);
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageSearch, setPageSearch] = useState('');
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
      return { menuIds: ids, moduleOrder: Array.isArray(response.data?.data?.moduleOrder) ? response.data.data.moduleOrder : [] };
    },
  });

  useEffect(() => { setDirty(false); }, [role.id]);
  useEffect(() => {
    if (accessQuery.data && !dirty) {
      setSelected(accessQuery.data.menuIds);
      setModuleOrder(accessQuery.data.moduleOrder);
    }
  }, [accessQuery.data, dirty]);

  const items = useMemo(() => flattenMenus(menuQuery.data ?? []), [menuQuery.data]);
  const rolePortal = role.portal ?? defaultPortalForRole(role.code);
  const modules = useMemo(() => buildCompleteAccessModules(items), [items]);
  const portalModules = modules;
  const orderedModules = useMemo(() => orderAccessModules(portalModules, moduleOrder), [portalModules, moduleOrder]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedPages = portalModules.flatMap((module) => module.tabs)
    .filter((tab) => menusForAccessRole(tab, rolePortal).some((menu) => selectedSet.has(menu.id)));
  const managerIsAdmin = managerAccess.access?.roleCodes.some((code) => ['organization_admin', 'ceo'].includes(code)) ?? false;
  const mayGrant = (item: RoleMenuItem) => managerIsAdmin || Boolean(managerAccess.access?.menuCodes.includes(item.code));
  const resolveMenu = (tab: { menus: RoleMenuItem[] }) => menusForAccessRole(tab, rolePortal)[0];
  const toggleModule = (parentIds: number[], checked: boolean) => {
    setSelected((current) => parentIds.reduce((ids, id) => toggleMenu(items, ids, id, checked), current));
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
      // Save equivalent URLs from the selected working portal, not every portal version.
      const menuIds = portalModules.flatMap((module) => module.tabs).reduce((ids, tab) => {
        const aliases = menusForAccessRole(tab, rolePortal);
        if (!aliases.some((menu) => ids.includes(menu.id))) return ids;
        return aliases.filter(mayGrant).reduce((grants, menu) => toggleMenu(items, grants, menu.id, true), ids);
      }, selected);
      await apiClient.put(`/rbac/roles/${role.id}/menus`, { menuIds, moduleOrder: orderedModules.map((module) => module.label) });
      setSelected(menuIds);
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
        <p className="text-sm text-muted-foreground">All modules and working pages are grouped below. This role's portal version is preferred; equivalent URLs share one checkbox. Details and edit pages have separate access.</p>
      </div>
      <Button type="button" onClick={save} disabled={saving || !dirty || menuQuery.isLoading || accessQuery.isLoading || menuQuery.isError || accessQuery.isError}>
        <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save access'}
      </Button>
    </div>
    {(menuQuery.isLoading || accessQuery.isLoading) && <p role="status" className="text-sm text-muted-foreground">Loading modules and role access...</p>}
    {(menuQuery.isError || accessQuery.isError) && <div role="alert" className="text-sm text-destructive">Could not load role access. <button type="button" className="underline" onClick={() => { void menuQuery.refetch(); void accessQuery.refetch(); }}>Retry</button></div>}
    {!menuQuery.isLoading && !accessQuery.isLoading && !menuQuery.isError && !accessQuery.isError && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input type="search" aria-label="Search access modules and pages" placeholder="Search modules or pages..." value={pageSearch} onChange={(event) => setPageSearch(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-80" />
        <span className="text-sm text-muted-foreground">{portalModules.length} modules · {portalModules.reduce((count, module) => count + module.tabs.length, 0)} working pages</span>
      </div>
      <div className="space-y-3">
        {orderedModules.map((module, index) => {
          const search = pageSearch.trim().toLowerCase();
          const visibleTabs = !search || module.label.toLowerCase().includes(search) ? module.tabs : module.tabs.filter((tab) => tab.label.toLowerCase().includes(search));
          if (!visibleTabs.length) return null;
          const moduleMenus = module.tabs.flatMap((tab) => menusForAccessRole(tab, rolePortal));
          const parentIds = [...new Set(moduleMenus.map((menu) => menu.parentId).filter((id): id is number => id != null))];
          const moduleEnabled = parentIds.length > 0 && parentIds.every((id) => selectedSet.has(id));
          const Icon = module.icon;
          return <section key={module.label} className="rounded-xl border border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="font-semibold"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{module.label}</h3><span className="text-xs text-muted-foreground">{module.tabs.filter((tab) => menusForAccessRole(tab, rolePortal).some((menu) => selectedSet.has(menu.id))).length}/{module.tabs.length} pages</span></div>
              <div className="flex items-center gap-2">
                <select value={index + 1} onChange={(event) => setModulePosition(index, Number(event.target.value) - 1)} aria-label={`Position for ${module.label}`} title="Sidebar position" className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  {orderedModules.map((_, position) => <option key={position} value={position + 1}>#{position + 1}</option>)}
                </select>
                <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveModule(index, -1)} aria-label={`Move ${module.label} up`} title="Move module up"><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" disabled={index === orderedModules.length - 1} onClick={() => moveModule(index, 1)} aria-label={`Move ${module.label} down`} title="Move module down"><ArrowDown className="h-4 w-4" /></Button>
                {parentIds.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => toggleModule(parentIds.filter((id) => { const parent = items.find((item) => item.id === id); return parent && (moduleEnabled || mayGrant(parent)); }), !moduleEnabled)}>{moduleEnabled ? 'Unselect module' : 'Select module'}</Button>}
                <Button type="button" variant="outline" size="sm" onClick={() => selectAllTabs(moduleMenus.filter(mayGrant).map((menu) => menu.id))}><CheckSquare2 className="mr-1 h-4 w-4" /> Select all tabs</Button>
              </div>
            </div>
            <div className="grid gap-1 pt-3 sm:grid-cols-2 xl:grid-cols-3">{visibleTabs.map((tab) => { const TabIcon = tab.icon; const menu = resolveMenu(tab); const aliases = menusForAccessRole(tab, rolePortal); const checked = aliases.some((entry) => selectedSet.has(entry.id)); return <label key={`${module.label}:${tab.label}`} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} disabled={!menu || (!checked && !aliases.every(mayGrant))} onChange={(event) => { setSelected((current) => aliases.reduce((ids, entry) => toggleMenu(items, ids, entry.id, event.target.checked), current)); setDirty(true); }} aria-label={`Allow ${tab.label}`} />
                  <TabIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm" title={menu?.route || ''}>{tab.label}</span>
                </label>; })}</div>
          </section>;
        })}
        {portalModules.length === 0 && <p className="text-sm text-muted-foreground">No working pages are registered.</p>}
      </div>
      <div className="rounded-xl bg-muted/50 p-4 text-sm"><span className="font-medium">Selected access: {selectedPages.length} page{selectedPages.length === 1 ? '' : 's'}</span><span className="ml-2 text-muted-foreground">across all modules</span></div>
      <p className="text-xs text-muted-foreground">Page access controls visibility and URLs. Existing approval, edit, organization and subscription restrictions still apply.</p>
      {dirty && <p className="text-xs text-amber-600">You have unsaved access changes.</p>}
    </>}
  </div>;
}
