import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Grid2X2,
  LayoutList,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { confirmAction } from "@/components/ConfirmationDialog";
import { showToast } from "@/components/ui/toast";
import { useAccessRoles, type AccessRole } from "../hooks/useAccessRoles";
import { RoleAccessManager } from "./RoleAccessManager";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  ACCESS_PORTALS,
  defaultPortalForRole,
  type AccessPortal,
} from "./roleAccessTabs";

const ADMIN_ROLES = new Set([
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
type View = "cards" | "list";
const EMPTY = {
  name: "",
  code: "",
  description: "",
  portal: "" as AccessPortal | "",
};
type RoleForm = typeof EMPTY;

/* Translucent tints only: no solid fills, so nothing dark is added on top of your page. */
const surface = "rounded-2xl bg-foreground/[0.03]";
const input =
  "w-full rounded-lg border-0 bg-foreground/[0.04] px-3 text-sm outline-none transition focus:bg-foreground/[0.06] focus:ring-2 focus:ring-primary/40";

/* ================================================================ */
/* Page                                                              */
/* ================================================================ */

export function AccessRolesMasterForm({ onCancel }: { onCancel?: () => void }) {
  void onCancel;
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading, error } = useAccessRoles();
  const user = useAuthStore((state) => state.user);
  const isAdmin = [user?.accessRole, user?.role, ...(user?.roles ?? [])].some(
    (role) => role === "organization_admin" || role === "ceo",
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageAccess, setManageAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("cards");
  const selectedRole = roles.find((role) => role.id === selectedId);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? roles.filter((role) =>
          [role.name, role.code, role.description ?? ""].some((field) =>
            field.toLowerCase().includes(value),
          ),
        )
      : roles;
  }, [query, roles]);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedId(null);
    setForm(EMPTY);
  };
  const createRole = () => {
    setSelectedId(null);
    setForm(EMPTY);
    setModalOpen(true);
  };
  const editRole = (role: AccessRole) => {
    setSelectedId(role.id);
    setForm({
      name: role.name,
      code: role.code,
      description: role.description ?? "",
      portal: role.portal ?? defaultPortalForRole(role.code),
    });
    setModalOpen(true);
  };
  const portalName = (role: AccessRole) =>
    ACCESS_PORTALS.find(
      (item) => item.code === (role.portal ?? defaultPortalForRole(role.code)),
    )?.label ?? "Portal";

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = form.code.trim().toLowerCase();
    if (
      !form.name.trim() ||
      !form.portal ||
      (!selectedId && !/^[a-z][a-z0-9_]{1,49}$/.test(code))
    ) {
      showToast.error("Enter a name, portal, and valid role code.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        portal: form.portal,
      };
      if (selectedId)
        await apiClient.patch(`/rbac/roles/${selectedId}`, payload);
      else await apiClient.post("/rbac/roles", { ...payload, code });
      await queryClient.invalidateQueries({ queryKey: ["access-roles"] });
      closeModal();
      showToast.success(selectedId ? "Role updated" : "Role created");
    } catch (err: unknown) {
      const failure = err as { response?: { data?: { message?: string } } };
      showToast.error(
        failure.response?.data?.message || "Could not save access role",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role: AccessRole) => {
    if (
      role.isSystem ||
      !(await confirmAction(
        `Delete “${role.name}”? This role must not be assigned to employees.`,
      ))
    )
      return;
    try {
      setSaving(true);
      await apiClient.delete(`/rbac/roles/${role.id}`);
      await queryClient.invalidateQueries({ queryKey: ["access-roles"] });
      showToast.success("Access role deleted");
    } catch (err: unknown) {
      const failure = err as { response?: { data?: { message?: string } } };
      showToast.error(
        failure.response?.data?.message || "Could not delete this role.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (manageAccess && selectedRole) {
    return (
      <RoleAccessManager
        role={selectedRole}
        onBack={() => {
          setManageAccess(false);
          setSelectedId(null);
        }}
      />
    );
  }

  const itemProps = (role: AccessRole): RoleItemProps => ({
    role,
    view,
    portal: portalName(role),
    locked: !isAdmin && ADMIN_ROLES.has(role.code),
    onAccess: () => {
      setSelectedId(role.id);
      setManageAccess(true);
    },
    onEdit: () => editRole(role),
    onDelete: () => void remove(role),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Access roles
          </h1>
          <p className="mt-1.5 max-w-lg text-pretty text-sm text-muted-foreground">
            Decide which modules and pages each role can open.
          </p>
        </div>
        <Button size="lg" className="rounded-xl" onClick={createRole}>
          <Plus className="mr-2 size-4" />
          New role
        </Button>
      </header>

      <section className="space-y-4">
        <Toolbar
          query={query}
          setQuery={setQuery}
          view={view}
          setView={setView}
          shown={filtered.length}
          total={roles.length}
        />

        {isLoading && (
          <div
            className={
              view === "cards"
                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                : "space-y-2"
            }
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "rounded-2xl",
                  view === "cards" ? "h-44" : "h-16",
                )}
              />
            ))}
          </div>
        )}

        {error && (
          <Notice
            title="Could not load access roles"
            text="Refresh the page or try again in a moment."
            tone="error"
          />
        )}

        {!isLoading && !error && !filtered.length && (
          <Notice
            title={query ? "No matching roles" : "No roles yet"}
            text={
              query
                ? "Try a different name, code or description."
                : "Create your first role to start assigning access."
            }
            action={query ? "Clear search" : "Create role"}
            onAction={query ? () => setQuery("") : createRole}
          />
        )}

        {!isLoading &&
          !error &&
          !!filtered.length &&
          (view === "cards" ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => (
                <li key={r.id}>
                  <RoleItem {...itemProps(r)} />
                </li>
              ))}
            </ul>
          ) : (
            <ul
              className={cn(
                surface,
                "divide-y divide-foreground/[0.04] overflow-hidden",
              )}
            >
              {filtered.map((r) => (
                <li key={r.id}>
                  <RoleItem {...itemProps(r)} />
                </li>
              ))}
            </ul>
          ))}
      </section>

      <RoleDialog
        open={modalOpen}
        editing={!!selectedId}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={closeModal}
        onSubmit={save}
      />
    </div>
  );
}

/* ================================================================ */
/* Toolbar                                                           */
/* ================================================================ */

function Toolbar({
  query,
  setQuery,
  view,
  setView,
  shown,
  total,
}: {
  query: string;
  setQuery: (v: string) => void;
  view: View;
  setView: (v: View) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          aria-label="Search roles"
          placeholder="Search roles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(input, "h-10 pl-9 pr-9")}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06]"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {query ? `${shown} of ${total}` : total}{" "}
          {total === 1 ? "role" : "roles"}
        </span>
        <div
          className="flex gap-0.5 rounded-lg bg-foreground/[0.04] p-0.5"
          role="group"
          aria-label="Layout"
        >
          {(
            [
              ["cards", Grid2X2],
              ["list", LayoutList],
            ] as const
          ).map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              aria-label={`${mode} view`}
              onClick={() => setView(mode)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-muted-foreground transition",
                view === mode && "bg-foreground/[0.08] text-foreground",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/* Role item (one component, two layouts)                            */
/* ================================================================ */

interface RoleItemProps {
  role: AccessRole;
  view: View;
  portal: string;
  locked: boolean;
  onAccess: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RoleItem({
  role,
  view,
  portal,
  locked,
  onAccess,
  onEdit,
  onDelete,
}: RoleItemProps) {
  const isCard = view === "cards";

  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {locked ? (
          <Lock className="size-4" />
        ) : (
          <ShieldCheck className="size-4" />
        )}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{role.name}</h3>
          {role.isSystem && (
            <span className="rounded-full bg-foreground/[0.08] px-2 py-0.5 text-[11px] text-muted-foreground">
              System
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{role.code}</p>
      </div>
    </div>
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg bg-foreground/[0.05] hover:bg-foreground/[0.09]"
        disabled={locked}
        onClick={onAccess}
      >
        Manage access
      </Button>
      {!role.isSystem && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={`Edit ${role.name}`}
            disabled={locked}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${role.name}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </>
      )}
    </div>
  );

  const description = (
    <p className="line-clamp-2 text-pretty text-sm text-muted-foreground">
      {role.description || "No description added."}
    </p>
  );

  if (isCard) {
    return (
      <article
        className={cn(
          surface,
          "flex h-full min-h-44 flex-col gap-4 p-5 transition-colors hover:bg-foreground/[0.05]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {identity}
          <span className="shrink-0 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-xs text-muted-foreground">
            {portal}
          </span>
        </div>
        {description}
        <div className="mt-auto">{actions}</div>
      </article>
    );
  }

  return (
    <article className="grid gap-3 px-5 py-4 transition-colors hover:bg-foreground/[0.03] lg:grid-cols-[minmax(220px,1.1fr)_minmax(200px,1.4fr)_120px_auto] lg:items-center lg:gap-6">
      {identity}
      {description}
      <span className="w-fit rounded-full bg-foreground/[0.05] px-2.5 py-1 text-xs text-muted-foreground">
        {portal}
      </span>
      <div className="lg:justify-self-end">{actions}</div>
    </article>
  );
}

/* ================================================================ */
/* Empty / error notice                                              */
/* ================================================================ */

function Notice({
  title,
  text,
  action,
  onAction,
  tone,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
  tone?: "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        surface,
        "flex flex-col items-center px-6 py-14 text-center",
        tone === "error" && "bg-destructive/5",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary",
          tone === "error" && "bg-destructive/10 text-destructive",
        )}
      >
        <ShieldCheck className="size-5" />
      </span>
      <h2 className="mt-4 font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && (
        <Button
          variant="ghost"
          className="mt-5 rounded-lg bg-foreground/[0.05] hover:bg-foreground/[0.09]"
          onClick={onAction}
        >
          {action}
        </Button>
      )}
    </div>
  );
}

/* ================================================================ */
/* Create / edit dialog                                              */
/* ================================================================ */

function RoleDialog({
  open,
  editing,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: boolean;
  form: RoleForm;
  setForm: (f: RoleForm) => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto rounded-2xl border-0 p-0 shadow-xl sm:w-full">
        <form onSubmit={onSubmit}>
          <DialogHeader className="space-y-1 p-6 pb-2 pr-12">
            <DialogTitle className="text-balance text-lg">
              {editing ? "Edit role" : "New role"}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              {editing
                ? "Update this role’s details."
                : "Add the role now, then set what it can access."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Role name" id="role-name" required>
              <input
                id="role-name"
                autoFocus
                required
                maxLength={100}
                placeholder="Regional HR Manager"
                className={cn(input, "h-10")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <Field
              label="Role code"
              id="role-code"
              required
              hint={editing ? "The code can’t be changed." : undefined}
            >
              <input
                id="role-code"
                required
                disabled={editing}
                placeholder="regional_hr_manager"
                className={cn(input, "h-10 disabled:opacity-60")}
                value={form.code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
              />
            </Field>

            <Field
              label="Portal"
              id="role-portal"
              required
              className="sm:col-span-2"
            >
              <select
                id="role-portal"
                required
                value={form.portal}
                className={cn(input, "h-10")}
                onChange={(e) =>
                  setForm({ ...form, portal: e.target.value as AccessPortal })
                }
              >
                <option value="" disabled>
                  Choose a portal
                </option>
                {ACCESS_PORTALS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Description"
              id="role-description"
              className="sm:col-span-2"
              hint={`${form.description.length}/500`}
            >
              <textarea
                id="role-description"
                rows={3}
                maxLength={500}
                value={form.description}
                className={cn(input, "resize-none py-2")}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
          </div>

          <DialogFooter className="gap-2 px-6 pb-6">
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}{" "}
        {!required && (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
