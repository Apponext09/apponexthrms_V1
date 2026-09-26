import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Pencil,
  LayoutGrid,
  Lock,
  Search,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ui/toast";
import { useAccessRoles } from "../hooks/useAccessRoles";
import { RoleAccessManager } from "./RoleAccessManager";
import { useAuthStore } from "@/features/auth/store/authStore";

const ADMIN_MANAGED_ROLE_CODES = new Set([
  "organization_admin",
  "org_admin",
  "admin",
  "owner",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "cxo",
  "hr",
  "hr_admin",
  "hr_manager",
]);

export function AccessRolesMasterForm({ onCancel }: { onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading, error } = useAccessRoles();
  const user = useAuthStore((state) => state.user);
  const isOrganizationAdmin = [
    user?.accessRole,
    user?.role,
    ...(user?.roles ?? []),
  ].some((role) => role === "organization_admin" || role === "ceo");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [manageAccess, setManageAccess] = useState(false);
  const [query, setQuery] = useState("");

  const selectedRole = roles.find((role) => role.id === selectedId);
  const isEditing = !!selectedId;

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.code.toLowerCase().includes(q) ||
        (role.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, query]);

  const reset = () => {
    setManageAccess(false);
    setSelectedId(null);
    setName("");
    setCode("");
    setDescription("");
  };

  /** openAccess = true -> "Edit modules" (module/page access manager).
   *  openAccess = false -> "Update role" (edit name/description in the form). */
  const select = (role: (typeof roles)[number], openAccess: boolean) => {
    setSelectedId(role.id);
    setName(role.name);
    setCode(role.code);
    setDescription(role.description ?? "");
    setManageAccess(openAccess);
  };

  const refresh = async () =>
    queryClient.invalidateQueries({ queryKey: ["access-roles"] });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedCode = code.trim().toLowerCase();
    if (
      !name.trim() ||
      (!selectedId && !/^[a-z][a-z0-9_]{1,49}$/.test(normalizedCode))
    ) {
      showToast.error(
        "Enter a name and a valid role code (letters, numbers, underscore).",
      );
      return;
    }
    try {
      setSaving(true);
      if (selectedId) {
        await apiClient.patch(`/rbac/roles/${selectedId}`, {
          name: name.trim(),
          description: description.trim(),
        });
      } else {
        await apiClient.post("/rbac/roles", {
          name: name.trim(),
          code: normalizedCode,
          description: description.trim(),
        });
      }
      await refresh();
      reset();
      showToast.success("Access role saved");
    } catch (err: unknown) {
      const failure = err as { response?: { data?: { message?: string } } };
      showToast.error(
        failure?.response?.data?.message || "Could not save access role",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (
      !selectedRole ||
      selectedRole.isSystem ||
      !window.confirm(`Delete ${selectedRole.name}?`)
    )
      return;
    try {
      setSaving(true);
      await apiClient.delete(`/rbac/roles/${selectedRole.id}`);
      await refresh();
      reset();
      showToast.success("Access role deleted");
    } catch (err: unknown) {
      const failure = err as { response?: { data?: { message?: string } } };
      showToast.error(
        failure?.response?.data?.message ||
          "Could not delete access role. It may still be assigned to employees.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (manageAccess && selectedRole)
    return <RoleAccessManager role={selectedRole} onBack={reset} />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Access Roles</h1>
            <p className="mt-0.5 max-w-lg text-sm text-muted-foreground">
             Create Roles and it's access.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={reset}>
          <Plus className="mr-1.5 h-4 w-4" /> New role
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
        {/* Role list */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              Organization roles{" "}
              <span className="font-normal text-muted-foreground">
                ({filteredRoles.length}
                {query ? ` of ${roles.length}` : ""})
              </span>
            </h2>
            <div className="relative w-full max-w-[220px] sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles"
                className="h-8 pl-8 pr-7 text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {isLoading && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading roles...
            </p>
          )}
          {error && (
            <p className="py-6 text-center text-sm text-destructive">
              Could not load roles.
            </p>
          )}
          {!isLoading && !error && filteredRoles.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query
                ? "No roles match your search."
                : "No roles yet. Add one to get started."}
            </p>
          )}

          <div className="space-y-2">
            {filteredRoles.map((role) => {
              const locked =
                !isOrganizationAdmin && ADMIN_MANAGED_ROLE_CODES.has(role.code);
              const active = selectedId === role.id;
              return (
                <div
                  key={role.id}
                  className={`rounded-xl border p-3 transition-colors sm:flex sm:items-center sm:justify-between sm:gap-4 ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {role.code}
                      </code>
                      {Boolean(role.isSystem) && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          System
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                    {locked && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 shrink-0" /> Only Organization
                        Admin can change this system role.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
                    {!role.isSystem && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={locked}
                        onClick={() => select(role, false)}
                        aria-label={`Update ${role.name} role details`}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Update role
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={active && manageAccess ? "default" : "outline"}
                      size="sm"
                      disabled={locked}
                      onClick={() => select(role, true)}
                      aria-label={`Edit module access for ${role.name}`}
                    >
                      <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Edit modules
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create / edit form */}
        <form
          onSubmit={save}
          className="h-fit space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <div>
            <h2 className="font-bold">
              {isEditing ? "Update role" : "Add a role"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isEditing
                ? `Editing “${selectedRole?.name ?? ""}”.`
                : "Role codes can't be changed after creation."}
            </p>
          </div>

          <div>
            <label htmlFor="access-role-name" className="text-sm font-medium">
              Role name
            </label>
            <Input
              id="access-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              disabled={!!selectedRole?.isSystem}
            />
          </div>
          <div>
            <label htmlFor="access-role-code" className="text-sm font-medium">
              Role code
            </label>
            <Input
              id="access-role-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={50}
              disabled={!!selectedId}
              placeholder="Role code"
              required
            />
          </div>
          <div>
            <label
              htmlFor="access-role-description"
              className="text-sm font-medium"
            >
              Description
            </label>
            <Input
              id="access-role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={!!selectedRole?.isSystem}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !!selectedRole?.isSystem}>
              {saving ? "Saving..." : isEditing ? "Save changes" : "Add role"}
            </Button>
            {isEditing && (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            )}
            {selectedRole && !selectedRole.isSystem && (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={remove}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
