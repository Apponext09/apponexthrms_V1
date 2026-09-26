import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckSquare2, Save } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import type { AccessRole } from "../hooks/useAccessRoles";
import {
  flattenMenus,
  toggleMenu,
  type RoleMenuItem,
} from "./roleMenuSelection";
import {
  ACCESS_PORTALS,
  buildAccessTabs,
  defaultPortalForRole,
  type AccessPortal,
} from "./roleAccessTabs";

type MenuResponse = { data?: { items?: RoleMenuItem[] } };
type GrantResponse = { data?: { menuIds?: number[] } };

export function RoleAccessManager({
  role,
  onBack,
}: {
  role: AccessRole;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [portal, setPortal] = useState<AccessPortal>(() =>
    defaultPortalForRole(role.code),
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuQuery = useQuery({
    queryKey: ["rbac-menus"],
    queryFn: async () => {
      const response = await apiClient.get<MenuResponse>("/rbac/menus");
      const items = response.data?.data?.items;
      if (!Array.isArray(items)) throw new Error("Menu catalog is unavailable");
      return items;
    },
  });
  const accessQuery = useQuery({
    queryKey: ["role-menu-access", role.id],
    queryFn: async () => {
      const response = await apiClient.get<GrantResponse>(
        `/rbac/roles/${role.id}/menus`,
      );
      const ids = response.data?.data?.menuIds;
      if (!Array.isArray(ids)) throw new Error("Role access is unavailable");
      return ids;
    },
  });

  useEffect(() => {
    setPortal(defaultPortalForRole(role.code));
    setDirty(false);
  }, [role.id, role.code]);
  useEffect(() => {
    if (accessQuery.data && !dirty) setSelected(accessQuery.data);
  }, [accessQuery.data, dirty]);

  const items = useMemo(
    () => flattenMenus(menuQuery.data ?? []),
    [menuQuery.data],
  );
  const { groups, otherPages } = useMemo(
    () => buildAccessTabs(items, portal),
    [items, portal],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedPages = items.filter(
    (item) => item.route && selectedSet.has(item.id),
  );
  const change = (id: number, checked: boolean) => {
    setSelected((current) => toggleMenu(items, current, id, checked));
    setDirty(true);
  };
  /** Turns a module's parent tab(s) on or off, e.g. Dashboard, Attendance, Core HR. */
  const toggleModule = (parentIds: number[], checked: boolean) => {
    setSelected((current) =>
      parentIds.reduce(
        (ids, id) => toggleMenu(items, ids, id, checked),
        current,
      ),
    );
    setDirty(true);
  };
  const selectAllTabs = (ids: number[]) => {
    setSelected((current) =>
      ids.reduce((grants, id) => toggleMenu(items, grants, id, true), current),
    );
    setDirty(true);
  };
  const deselectAllTabs = (ids: number[]) => {
    setSelected((current) =>
      ids.reduce((grants, id) => toggleMenu(items, grants, id, false), current),
    );
    setDirty(true);
  };
  const save = async () => {
    try {
      setSaving(true);
      await apiClient.put(`/rbac/roles/${role.id}/menus`, {
        menuIds: selected,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["role-menu-access", role.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["menu-access"] }),
        queryClient.invalidateQueries({ queryKey: ["access-roles"] }),
      ]);
      setDirty(false);
      showToast.success(`Access saved for ${role.name}`);
    } catch (error: unknown) {
      const failure = error as { response?: { data?: { message?: string } } };
      showToast.error(
        failure?.response?.data?.message || "Could not save role access",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Roles
          </Button>
          <h2 className="text-xl font-bold">Manage access: {role.name}</h2>
          <p className="text-sm text-muted-foreground">
            Select the tabs this role can open. Selecting a tab automatically
            enables its parent module; use a module's checkbox to enable or
            disable it directly.
          </p>
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={
            saving ||
            !dirty ||
            menuQuery.isLoading ||
            accessQuery.isLoading ||
            menuQuery.isError ||
            accessQuery.isError
          }
        >
          <Save className="mr-1 h-4 w-4" />{" "}
          {saving ? "Saving..." : "Save access"}
        </Button>
      </div>
      {(menuQuery.isLoading || accessQuery.isLoading) && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading modules and role access...
        </p>
      )}
      {(menuQuery.isError || accessQuery.isError) && (
        <div role="alert" className="text-sm text-destructive">
          Could not load role access.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void menuQuery.refetch();
              void accessQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!menuQuery.isLoading &&
        !accessQuery.isLoading &&
        !menuQuery.isError &&
        !accessQuery.isError && (
          <>
            {/* {ACCESS_PORTALS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  role="tab"
                  aria-selected={portal === option.code}
                  onClick={() => setPortal(option.code)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${portal === option.code ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {option.label}
                </button>
              ))} */}
            <div className="space-y-3">
              {groups.map((group, index) => {
                const parentIds = [
                  ...new Set(
                    group.tabs
                      .map((tab) => tab.menu.parentId)
                      .filter((id): id is number => id != null),
                  ),
                ];
                const moduleEnabled =
                  parentIds.length > 0 &&
                  parentIds.every((id) => selectedSet.has(id));
                const allTabsSelected =
                  group.tabs.length > 0 &&
                  group.tabs.every((tab) => selectedSet.has(tab.menu.id));
                const Icon = group.icon;
                return (
                  <section
                    key={`${portal}:${group.label}`}
                    className="rounded-xl border border-border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">
                          <span className="mr-2 text-muted-foreground">
                            {index + 1}.
                          </span>
                          {group.label}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {
                            group.tabs.filter((tab) =>
                              selectedSet.has(tab.menu.id),
                            ).length
                          }
                          /{group.tabs.length} tabs
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {parentIds.length > 0 && (
                          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={moduleEnabled}
                              onChange={(event) =>
                                toggleModule(parentIds, event.target.checked)
                              }
                              aria-label={`${moduleEnabled ? "Disable" : "Enable"} ${group.label} module`}
                            />
                            <span
                              className={
                                moduleEnabled
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }
                            >
                              {moduleEnabled
                                ? "Module enabled"
                                : "Enable module"}
                            </span>
                          </label>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            allTabsSelected
                              ? deselectAllTabs(
                                  group.tabs.map((tab) => tab.menu.id),
                                )
                              : selectAllTabs(
                                  group.tabs.map((tab) => tab.menu.id),
                                )
                          }
                        >
                          <CheckSquare2 className="mr-1 h-4 w-4" />{" "}
                          {allTabsSelected
                            ? "Deselect all tabs"
                            : "Select all tabs"}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-1 pt-2 sm:grid-cols-2 xl:grid-cols-3">
                      {group.tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <label
                            key={tab.menu.id}
                            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={selectedSet.has(tab.menu.id)}
                              onChange={(event) =>
                                change(tab.menu.id, event.target.checked)
                              }
                              aria-label={`Allow ${portal} ${tab.label}`}
                            />
                            <TabIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span
                              className="truncate text-sm"
                              title={tab.menu.route || undefined}
                            >
                              {tab.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No navigation tabs are registered for this portal.
                </p>
              )}
              {otherPages.length > 0 && (
                <details className="rounded-xl border border-border px-4 py-3">
                  <summary className="cursor-pointer font-medium">
                    Additional working pages ({otherPages.length})
                  </summary>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Detail and sub-pages that are routable but are not
                    standalone sidebar tabs.
                  </p>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                    {otherPages.map((page) => (
                      <label
                        key={page.id}
                        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedSet.has(page.id)}
                          onChange={(event) =>
                            change(page.id, event.target.checked)
                          }
                          aria-label={`Allow ${portal} ${page.label}`}
                        />
                        <span
                          className="min-w-0 truncate text-sm"
                          title={page.route || undefined}
                        >
                          {page.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-sm">
              <span className="font-medium">
                Selected access: {selectedPages.length} page
                {selectedPages.length === 1 ? "" : "s"}
              </span>
              <span className="ml-2 text-muted-foreground">
                across all portals
              </span>
            </div>
            {dirty && (
              <p className="text-xs text-amber-600">
                You have unsaved access changes.
              </p>
            )}
          </>
        )}
    </div>
  );
}
