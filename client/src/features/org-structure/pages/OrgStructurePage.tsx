import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useOrgHierarchy } from "../hooks/useOrgHierarchy";
import { buildOrgTree, type OrgTreeNode } from "../utils/buildOrgTree";
import { useDesignations } from "@/features/settings/hooks/useDesignations";
import { useDepartments } from "@/features/settings/hooks/useDepartments";
import { useLocations } from "@/features/settings/hooks/useLocations";
import { EmployeeCreateModal } from "@/features/employee/components/EmployeeCreateModal";
import { OrgHierarchyConfigModal } from "../components/OrgHierarchyConfigModal";
import type { HierarchyRule } from "../types/orgHierarchy";
import { DEFAULT_HIERARCHY_RULES, validateDragAndDrop } from "../utils/orgHierarchyEngine";
import { useAuthStore } from "@/features/auth/store/authStore";
import { apiClient } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  UserPlus,
  ExternalLink,
  Building2,
  Users,
  ShieldCheck,
  Crown,
  UserCheck,
  Briefcase,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Minus,
  User,
  Download,
  FileText,
  Image,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  Zap,
  AlertCircle,
  Filter,
  ChevronsDownUp,
  ChevronsUpDown,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Employee } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
//   Colours come from the app theme (primary, foreground, card, border, muted).
//   Font: Plus Jakarta Sans.
// ─────────────────────────────────────────────────────────────────────────────
const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.org-font { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
`;

// Plain SVG dot grid for the canvas (no gradients).
const DOT_GRID =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1.5' cy='1.5' r='1' fill='%2394A3B8'/%3E%3C/svg%3E\")";

const BTN_PRIMARY =
  "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1";
const BTN_OUTLINE =
  "border border-border bg-card text-foreground hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50";
const DIALOG_SURFACE =
  "org-font sm:max-w-md bg-card text-foreground border border-border rounded-2xl shadow-[0_20px_50px_-12px_rgba(11,37,69,0.25)]";

// ─────────────────────────────────────────────────────────────────────────────
// Role configuration & badge styling
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    Icon: React.ElementType;
  }
> = {
  ceo: {
    label: "CEO",
    bg: "bg-foreground",
    border: "border-foreground",
    text: "text-background",
    Icon: Crown,
  },
  cfo: {
    label: "CFO",
    bg: "bg-primary/10",
    border: "border-border",
    text: "text-primary",
    Icon: ShieldCheck,
  },
  coo: {
    label: "COO",
    bg: "bg-primary/10",
    border: "border-border",
    text: "text-primary",
    Icon: Briefcase,
  },
  cto: {
    label: "CTO",
    bg: "bg-primary/10",
    border: "border-border",
    text: "text-primary",
    Icon: Zap,
  },
  cxo: {
    label: "Executive (CXO)",
    bg: "bg-primary/10",
    border: "border-border",
    text: "text-primary",
    Icon: Crown,
  },
  hr_manager: {
    label: "HR Manager",
    bg: "bg-primary/10",
    border: "border-border",
    text: "text-primary",
    Icon: ShieldCheck,
  },
  department_head: {
    label: "Dept Manager",
    bg: "bg-card",
    border: "border-primary",
    text: "text-primary",
    Icon: Crown,
  },
  team_lead: {
    label: "Team Lead",
    bg: "bg-primary/10",
    border: "border-border",
    text: "text-primary",
    Icon: UserCheck,
  },
  employee: {
    label: "Employee",
    bg: "bg-muted/50",
    border: "border-border",
    text: "text-muted-foreground",
    Icon: Briefcase,
  },
};

function roleCfg(role?: string, designation?: string) {
  const r = (role || "").toLowerCase().trim();
  const d = (designation || "").toLowerCase().trim();

  if (r === "ceo" || d === "ceo" || d.includes("chief executive"))
    return ROLE_CONFIG.ceo;
  if (
    r === "cfo" ||
    d === "cfo" ||
    d.includes("chief financial") ||
    d.includes("finance head") ||
    d.includes("director of finance")
  )
    return ROLE_CONFIG.cfo;
  if (
    r === "coo" ||
    d === "coo" ||
    d.includes("chief operating") ||
    d.includes("chief operations") ||
    d.includes("operations head")
  )
    return ROLE_CONFIG.coo;
  if (
    r === "cto" ||
    d === "cto" ||
    d.includes("chief tech") ||
    d.includes("chief technology") ||
    d.includes("tech head") ||
    d.includes("head of engineering")
  )
    return ROLE_CONFIG.cto;
  if (r === "cxo" || d.startsWith("chief ") || d.includes("c-level"))
    return ROLE_CONFIG.cxo;
  if (r === "hr_manager" || r === "hr_admin" || r === "support")
    return ROLE_CONFIG.hr_manager;
  if (r === "department_head" || r === "manager")
    return ROLE_CONFIG.department_head;
  if (r === "team_lead") return ROLE_CONFIG.team_lead;
  return ROLE_CONFIG.employee;
}

function resolveDesignation(
  emp?: Employee | null,
  designationsList?: any[],
): string {
  if (!emp) return "—";
  const e = emp as any;

  // 1. Direct explicit strings
  if (
    e.designation &&
    typeof e.designation === "string" &&
    e.designation.trim() !== "" &&
    e.designation.trim() !== "—"
  ) {
    return e.designation.trim();
  }
  if (
    e.designationName &&
    typeof e.designationName === "string" &&
    e.designationName.trim()
  ) {
    return e.designationName.trim();
  }
  if (
    e.designation_name &&
    typeof e.designation_name === "string" &&
    e.designation_name.trim()
  ) {
    return e.designation_name.trim();
  }
  if (e.jobTitle && typeof e.jobTitle === "string" && e.jobTitle.trim()) {
    return e.jobTitle.trim();
  }
  if (e.job_title && typeof e.job_title === "string" && e.job_title.trim()) {
    return e.job_title.trim();
  }

  // 2. ID matching against master list
  const desigId =
    e.currentDesignationId ??
    e.designationId ??
    e.designation_id ??
    e.current_designation_id;
  if (
    desigId &&
    Array.isArray(designationsList) &&
    designationsList.length > 0
  ) {
    const matched = designationsList.find(
      (d: any) => String(d.id) === String(desigId),
    );
    if (matched?.name) return matched.name;
  }

  // 3. Fallback from role configuration
  const role = (e.accessRole || e.role || "").toLowerCase().trim();
  if (role) {
    const roleLabels: Record<string, string> = {
      organization_admin: "Organization Administrator",
      super_admin: "Super Admin",
      hr_admin: "HR Administrator",
      hr_manager: "HR Manager",
      hr: "HR Executive",
      department_head: "Department Head",
      manager: "Manager",
      team_lead: "Team Lead",
      employee: "Employee",
      intern: "Intern",
      consultant: "Consultant",
      ceo: "Chief Executive Officer",
      cto: "Chief Technology Officer",
      cfo: "Chief Financial Officer",
      coo: "Chief Operating Officer",
    };
    if (roleLabels[role]) return roleLabels[role];
  }

  // 4. Fallback based on department
  if (e.department) {
    return `${e.department} Executive`;
  }

  return "Employee";
}

// Solid blue-family avatar tones (background + initials colour)
const AVATAR_TONES = [
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
];
function avatarTone(id?: number) {
  return AVATAR_TONES[(id || 0) % AVATAR_TONES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree Node Component with @dnd-kit Draggable / Droppable & Pulsing
// ─────────────────────────────────────────────────────────────────────────────
interface ReferenceNodeProps {
  emp: Employee;
  highlight: boolean;
  isPulsing?: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  isAdmin?: boolean;
  isOrgRoot?: boolean;
  isUnassignedGroup?: boolean;
  directReportsCount?: number;
  inReportingPath?: boolean;
  deptName?: string;
}

const ReferenceNode = memo(function ReferenceNode({
  emp,
  highlight,
  isPulsing = false,
  hasChildren,
  isCollapsed,
  onToggleExpand,
  onClick,
  isAdmin = false,
  isOrgRoot = false,
  isUnassignedGroup = false,
  directReportsCount = 0,
  inReportingPath = false,
  deptName,
}: ReferenceNodeProps) {
  const name = isOrgRoot || isUnassignedGroup ? emp.firstName : [emp.firstName, emp.lastName].filter(Boolean).join(" ");
  const initials =
    `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase();
  const tone = avatarTone(emp.id);
  const designation = isAdmin ? "Admin" : isOrgRoot || isUnassignedGroup ? emp.designation : resolveDesignation(emp);

  const isDeptHeadOrHR = ["department_head", "hr_manager"].includes(
    (emp as any).accessRole || "",
  );
  // Synthetic nodes (the neutral org-root placeholder, the Unassigned
  // grouping) don't correspond to a real employee, so they're never
  // draggable. The org-root placeholder IS still a valid drop target — it
  // plays the same "assign directly to the top of the org" role a single
  // CEO card would.
  const isDragDisabled = isAdmin || isOrgRoot || isUnassignedGroup || isDeptHeadOrHR;
  const dropTargetIsAdmin = isAdmin || isOrgRoot;

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: String(emp.id),
    disabled: isDragDisabled,
    data: { emp, isAdmin: dropTargetIsAdmin },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: String(emp.id),
    disabled: isUnassignedGroup,
    data: { emp, isAdmin: dropTargetIsAdmin },
  });

  const setCombinedRef = (element: HTMLDivElement | null) => {
    setDraggableRef(element);
    setDroppableRef(element);
  };

  const style: React.CSSProperties = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 0 : 50,
      }
    : {};

  // The admin card is solid navy at rest; in any other state it turns light,
  // so text colours follow the same flag.
  const onDark = false;

  const stateClasses = isPulsing
    ? "border-primary bg-primary/10 ring-4 ring-primary/35 scale-110 shadow-xl z-40 animate-pulse motion-reduce:animate-none"
    : isDragging
      ? "opacity-40 border-dashed border-primary bg-primary/10"
      : isOver
        ? "border-primary bg-primary/10 ring-4 ring-primary/25 scale-105 shadow-lg z-40"
        : isUnassignedGroup
          ? "border-dashed border-amber-500/50 bg-amber-500/5"
          : highlight
            ? "border-primary bg-muted/50 ring-2 ring-primary/30"
            : isAdmin || isOrgRoot
              ? "border-primary bg-primary/5"
              : inReportingPath
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card hover:border-primary hover:shadow-md";

  return (
    <div className="relative flex flex-col items-center shrink-0">
      {/* Department label directly above manager node */}
      {deptName && (
        <div className="flex flex-col items-center mb-1 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-primary/10 text-primary font-semibold text-[11px]">
            <Building2 className="w-3 h-3" />
            <span>{deptName}</span>
          </div>
          <div className="w-px h-2.5 bg-border" />
        </div>
      )}

      {/* Drop target indicator while dragging over */}
      {isOver && !isDragging && (
        <div className="absolute -top-3.5 z-50 flex items-center px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold text-[11px] shadow-lg whitespace-nowrap">
          Drop to reassign here
        </div>
      )}

      {/* Node card */}
      <div
        id={`node-card-${emp.id}`}
        data-org-node
        ref={setCombinedRef}
        {...listeners}
        {...attributes}
        style={style}
        onClick={onClick}
        role="treeitem"
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-label={isUnassignedGroup ? `Unassigned: ${designation}` : `${name}, ${designation}`}
        title={
          isOrgRoot
            ? "Organization root — employees with no assigned manager attach here"
            : isUnassignedGroup
              ? "Employees whose reporting manager reference is broken or circular"
              : isAdmin
                ? "Organization Admin"
                : isDeptHeadOrHR
                  ? "Department Heads and HR Managers report directly to Organization Admin."
                  : "Drag node onto a manager to reassign reporting manager"
        }
        className={`group relative flex flex-col items-center border rounded-xl px-3 py-3
          w-[168px] min-h-[96px] transition-all duration-200 cursor-grab active:cursor-grabbing select-none
          shadow-[0_1px_2px_rgba(11,37,69,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-primary/60
          ${stateClasses}`}
      >
        {/* Avatar */}
        <Avatar
          className={`h-9 w-9 rounded-full mb-1.5 border ${onDark ? "border-background/25" : "border-border"}`}
        >
          <AvatarImage src={(emp as any).avatarUrl || undefined} alt={name} />
          <AvatarFallback
            className={`text-[11px] font-bold ${isAdmin || isOrgRoot ? "bg-primary text-primary-foreground" : isUnassignedGroup ? "bg-amber-500/15 text-amber-600" : tone}`}
          >
            {isOrgRoot ? (
              <Building2 className="w-4 h-4" />
            ) : isUnassignedGroup ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              initials || <User className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <div
          className={`w-full text-[13px] font-bold text-center truncate ${onDark ? "text-background" : "text-foreground"}`}
        >
          {name}
        </div>

        {/* Designation */}
        <div
          className={`w-full text-[11px] font-medium text-center truncate mt-0.5 ${onDark ? "text-background/70" : "text-muted-foreground"}`}
        >
          {designation}
        </div>

        {/* Direct reports count */}
        {!isUnassignedGroup && directReportsCount > 0 && (
          <div className="w-full text-[10px] font-medium text-center truncate mt-1 text-muted-foreground/80">
            {directReportsCount} direct report{directReportsCount === 1 ? "" : "s"}
          </div>
        )}

        {/* Expand / collapse toggle — 20px visible circle, ~40px tap target via invisible padding */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 outline-none"
            title={isCollapsed ? "Expand Children" : "Collapse Children"}
            aria-label={isCollapsed ? "Expand children" : "Collapse children"}
            aria-expanded={!isCollapsed}
          >
            <span className="absolute -inset-2.5" aria-hidden="true" />
            <span className="relative flex w-5 h-5 rounded-full bg-card border border-border items-center justify-center shadow-sm group-hover:border-primary hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-primary/60">
              {isCollapsed ? (
                <Plus className="w-3 h-3 text-primary" />
              ) : (
                <Minus className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Tree Branch Recursive Component
// ─────────────────────────────────────────────────────────────────────────────
interface TreeBranchProps {
  node: OrgTreeNode;
  highlight: Set<number>;
  pulsingEmpId?: number | null;
  collapsedMap: Record<number, boolean>;
  onToggleCollapse: (id: number) => void;
  onSelectEmp: (e: Employee) => void;
  isLevel1Manager?: boolean;
  pathIds?: Set<number>;
}

const TreeBranch = memo(function TreeBranch({
  node,
  highlight,
  pulsingEmpId,
  collapsedMap,
  onToggleCollapse,
  onSelectEmp,
  isLevel1Manager = false,
  pathIds,
}: TreeBranchProps) {
  const isCollapsed = collapsedMap[node.emp.id!] ?? false;
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const deptName = node.isAdmin
    ? "Executive Leadership"
    : node.isCxo
      ? `C-Suite · ${(node.cxoType || "CXO").toUpperCase()}`
      : isLevel1Manager
        ? node.emp.department || "Department"
        : undefined;

  return (
    <div className="flex flex-col items-center shrink-0">
      <ReferenceNode
        emp={node.emp}
        highlight={highlight.has(node.emp.id!)}
        isPulsing={pulsingEmpId === node.emp.id}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleExpand={() => onToggleCollapse(node.emp.id!)}
        onClick={() => onSelectEmp(node.emp)}
        isAdmin={node.isAdmin}
        isOrgRoot={node.isOrgRoot}
        isUnassignedGroup={node.isUnassignedGroup}
        directReportsCount={node.isUnassignedGroup ? 0 : children.length}
        inReportingPath={pathIds ? pathIds.has(node.emp.id!) : false}
        deptName={deptName}
      />

      {/* Children with connector lines */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center pt-3" role="group">
          {/* Stem down from the parent */}
          <div className="w-px h-5 bg-border shrink-0" />

          <div className="flex items-start justify-center">
            {children.map((childNode: OrgTreeNode, index: number) => (
              <div
                key={childNode.emp.id}
                className="flex flex-col items-center shrink-0"
              >
                {/* Per-child connector: the two half-bars meet the neighbours to form one continuous rail */}
                <div className="relative h-4 w-full shrink-0">
                  {children.length > 1 && index > 0 && (
                    <div className="absolute top-0 left-0 w-1/2 h-px bg-border" />
                  )}
                  {children.length > 1 && index < children.length - 1 && (
                    <div className="absolute top-0 right-0 w-1/2 h-px bg-border" />
                  )}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-border" />
                </div>
                <div className="px-3">
                  <TreeBranch
                    node={childNode}
                    highlight={highlight}
                    pulsingEmpId={pulsingEmpId}
                    collapsedMap={collapsedMap}
                    onToggleCollapse={onToggleCollapse}
                    onSelectEmp={onSelectEmp}
                    isLevel1Manager={node.isAdmin || node.isCxo}
                    pathIds={pathIds}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Org Summary — below sm breakpoint the interactive pan/zoom tree is
// replaced with a department-grouped, tap-to-expand list. Forcing the same
// dense canvas into a phone-width viewport is unusable (per-card min-width
// alone exceeds a 360px screen); this reads the identical fetched roster,
// just presented as a list instead of a spatial tree.
// ─────────────────────────────────────────────────────────────────────────────
interface MobileOrgSummaryProps {
  employees: Employee[];
  designations: any[];
  onSelectEmployee: (e: Employee) => void;
}

function MobileOrgSummary({ employees, designations, onSelectEmployee }: MobileOrgSummaryProps) {
  const [search, setSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) =>
      [e.firstName, e.lastName, e.email, e.designation, e.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [employees, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Employee[]>();
    filtered.forEach((e) => {
      const dept = e.department || (e as any).departmentName || "General";
      const list = map.get(dept);
      if (list) list.push(e);
      else map.set(dept, [e]);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const isDeptExpanded = (dept: string) => expandedDepts[dept] ?? Boolean(search.trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search employee by name"
          aria-label="Search employee"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 border-border bg-background pl-9 text-sm"
        />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {groups.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">No employees match "{search}".</p>
        )}
        {groups.map(([dept, deptEmployees]) => {
          const expanded = isDeptExpanded(dept);
          return (
            <div key={dept}>
              <button
                type="button"
                onClick={() => setExpandedDepts((prev) => ({ ...prev, [dept]: !expanded }))}
                className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left active:bg-muted/50"
                aria-expanded={expanded}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground truncate">{dept}</span>
                  <span className="block text-xs text-muted-foreground">
                    {deptEmployees.length} employee{deptEmployees.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              {expanded && (
                <div className="divide-y divide-border/60 bg-muted/20">
                  {deptEmployees.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEmployee(e)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                    >
                      <Avatar className="h-9 w-9 rounded-full border border-border shrink-0">
                        <AvatarImage src={(e as any).avatarUrl || undefined} />
                        <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                          {`${e.firstName?.[0] || ""}${e.lastName?.[0] || ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground truncate">{e.firstName} {e.lastName}</span>
                        <span className="block text-xs text-muted-foreground truncate">{resolveDesignation(e, designations)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main OrgStructurePage Component
// ─────────────────────────────────────────────────────────────────────────────
export function OrgStructurePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { employees, isLoading, isError, error: hierarchyError, refetch } = useOrgHierarchy();
  const { designations = [] } = useDesignations();
  const { data: departmentsData } = useDepartments(1, 200);
  const { data: locationsData } = useLocations(1, 200);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filterDeptId, setFilterDeptId] = useState<string>("");
  const [filterLocationId, setFilterLocationId] = useState<string>("");
  const [filterDesignationId, setFilterDesignationId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [pulsingEmpId, setPulsingEmpId] = useState<number | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHierarchyRulesModalOpen, setIsHierarchyRulesModalOpen] = useState(false);
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>(DEFAULT_HIERARCHY_RULES);

  // Admin Setting: Export Chart Visibility for Employees
  const [isExportEnabledForEmployees, setIsExportEnabledForEmployees] =
    useState<boolean>(() => {
      const stored = localStorage.getItem("org_chart_export_employee_enabled");
      return stored !== null ? JSON.parse(stored) : true;
    });

  const userRole = (user as any)?.accessRole || (user as any)?.role || "";
  // Every portal uses this same canvas. Only HR/admin personas can modify or export it.
  const isAdminOrManager = [
    "organization_admin",
    "ceo",
    "hr",
    "hr_admin",
    "hr_manager",
    "super_admin",
    "platform_admin",
  ].includes(userRole);
  const canExport = isAdminOrManager || isExportEnabledForEmployees;

  // Local employees state for optimistic UI updates
  const [localEmps, setLocalEmps] = useState<Employee[] | null>(null);

  useEffect(() => {
    setLocalEmps(employees || null);
  }, [employees]);

  useEffect(() => {
    if (!isAdminOrManager) return;
    let isActive = true;
    apiClient.get("/employees/org-hierarchy/rules")
      .then((response) => {
        const rules = response.data?.data;
        if (isActive && Array.isArray(rules) && rules.length) setHierarchyRules(rules);
      })
      .catch(() => toast.error("Could not load organization hierarchy settings."));
    return () => { isActive = false; };
  }, [isAdminOrManager]);

  // Debounce the live search query before it drives highlight/filter
  // recomputation — keeps typing responsive on large rosters.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Collapse State for nodes
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  // Reassignment Confirm Step State
  const [reassignConfirm, setReassignConfirm] = useState<{
    activeEmp: Employee;
    targetEmp: Employee;
    targetIsAdmin?: boolean;
  } | null>(null);

  // Canvas Zoom & Pan Controls
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panPointer = useRef<{ id: number; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const exportTreeRef = useRef<HTMLDivElement>(null);

  // Active Dragged Employee for smooth DragOverlay preview
  const [activeDragEmp, setActiveDragEmp] = useState<Employee | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    // Keyboard alternative to pointer drag-and-drop: Tab to a card, Space to
    // pick it up, Arrow keys to move focus between drop targets, Space again
    // to drop, Escape to cancel. Uses @dnd-kit's default keyboard coordinate
    // getter — this is additive and doesn't change PointerSensor behavior.
    useSensor(KeyboardSensor),
  );

  const toggleCollapse = useCallback((id: number) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false,
    }));
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    if (!isAdminOrManager) return;
    const emp: Employee = event.active.data.current?.emp;
    if (emp) setActiveDragEmp(emp);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isAdminOrManager) return;
    setActiveDragEmp(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeEmp: Employee = active.data.current?.emp;
    const targetEmp: Employee = over.data.current?.emp;
    const targetIsAdmin: boolean = !!over.data.current?.isAdmin;

    if (!activeEmp || !targetEmp || activeEmp.id === targetEmp.id) return;

    const validation = validateDragAndDrop(
      activeEmp,
      { emp: targetEmp, isAdmin: targetIsAdmin },
      hierarchyRules,
      localEmps || (employees as Employee[]) || [],
    );
    if (!validation.isValid) {
      toast.error(validation.errorMessage || "This move violates the organization hierarchy.");
      return;
    }

    setReassignConfirm({ activeEmp, targetEmp, targetIsAdmin });
  };

  // ─── Flat data helpers shared by search, filters, tree-building & the
  // ─── reporting-path breadcrumb
  const activeList = useMemo(
    () => localEmps || (employees as Employee[]) || [],
    [localEmps, employees],
  );

  const employeeById = useMemo(() => {
    const map = new Map<number, Employee>();
    activeList.forEach((e) => {
      if (e.id !== undefined && e.id !== null) map.set(Number(e.id), e);
    });
    return map;
  }, [activeList]);

  const getAncestorChain = useCallback(
    (empId: number): number[] => {
      const chain: number[] = [];
      const visited = new Set<number>();
      let currId: number | null =
        employeeById.get(empId)?.reportingManagerId ?? null;
      while (currId && employeeById.has(currId) && !visited.has(currId)) {
        visited.add(currId);
        chain.push(currId);
        const mgr = employeeById.get(currId);
        currId = mgr?.reportingManagerId ?? null;
      }
      return chain;
    },
    [employeeById],
  );

  // ─── Build Dynamic Hierarchy Tree Structure — O(n), see buildOrgTree.ts
  const treeResult = useMemo(() => buildOrgTree(activeList), [activeList]);
  const treeData = treeResult.root;

  // Surface (once per data load) organization-hierarchy data problems the
  // tree builder found — multiple CEO records, or reporting cycles — rather
  // than silently dropping anyone. Read-only viewers aren't bothered by this;
  // only the roles who could actually go fix the data are notified.
  const dataWarningKeyRef = useRef<string>("");
  useEffect(() => {
    if (!isAdminOrManager) return;
    const key = `${treeResult.ceoCount}:${treeResult.cyclicCount}`;
    if (key === dataWarningKeyRef.current) return;
    dataWarningKeyRef.current = key;
    if (treeResult.ceoCount > 1) {
      toast.warning(
        `${treeResult.ceoCount} employees are flagged as CEO — please review which one should be the organization root.`,
      );
    }
    if (treeResult.cyclicCount > 0) {
      toast.warning(
        `${treeResult.cyclicCount} employee${treeResult.cyclicCount === 1 ? "" : "s"} ${treeResult.cyclicCount === 1 ? "is" : "are"} in a circular reporting loop and shown under "Unassigned" for review.`,
      );
    }
  }, [isAdminOrManager, treeResult.ceoCount, treeResult.cyclicCount]);

  // ─── Focus/expand/pulse a specific employee — shared by explicit search
  // submit, clicking a multi-result search hit, and the initial
  // "view own position" focus for non-admin portals.
  const focusOnEmployee = useCallback(
    (matched: Employee) => {
      if (!matched?.id) return;

      const ancestors = getAncestorChain(matched.id);
      if (treeData?.emp.id !== undefined && treeData.emp.id !== null) {
        ancestors.push(Number(treeData.emp.id));
      }

      setCollapsedMap((prev) => {
        const next = { ...prev };
        ancestors.forEach((id) => {
          next[id] = false;
        });
        return next;
      });

      setPulsingEmpId(matched.id);
      setTimeout(() => setPulsingEmpId(null), 3200);

      setTimeout(() => {
        const el = document.getElementById(`node-card-${matched.id}`);
        if (el && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const cardRect = el.getBoundingClientRect();

          setScale(1.15);

          const cardCenterX = cardRect.left + cardRect.width / 2;
          const cardCenterY = cardRect.top + cardRect.height / 2;
          const containerCenterX = containerRect.left + containerRect.width / 2;
          const containerCenterY = containerRect.top + containerRect.height / 2;

          setPan((prevPan) => ({
            x: prevPan.x + (containerCenterX - cardCenterX),
            y: prevPan.y + (containerCenterY - cardCenterY),
          }));
        }
      }, 150);
    },
    [getAncestorChain, treeData],
  );

  // Explicit search submit (Enter / Find button): keeps the original
  // single-shortcut behavior for when there's exactly one obvious match.
  const handleSearchSubmit = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      const lower = term.toLowerCase().trim();
      const matched = activeList.find((e) =>
        [e.firstName, e.lastName, e.email, e.designation, e.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(lower),
      );
      if (!matched || !matched.id) {
        toast.error(`No employee matching "${term}" found.`);
        return;
      }
      focusOnEmployee(matched);
      toast.success(`Zoomed to ${matched.firstName} ${matched.lastName}`);
    },
    [activeList, focusOnEmployee],
  );

  // Multi-result live search (Phase: Search UX) — every match, not just the
  // first, so ambiguous names (e.g. two "Rahul"s) are disambiguated by the
  // viewer instead of the app guessing.
  const searchMatches = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) return [] as Employee[];
    return activeList
      .filter((e) =>
        [e.firstName, e.lastName, e.email, e.designation, e.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 20);
  }, [debouncedSearchTerm, activeList]);

  const handleSelectSearchResult = useCallback(
    (emp: Employee) => {
      focusOnEmployee(emp);
      setIsSearchFocused(false);
      toast.success(`Zoomed to ${emp.firstName} ${emp.lastName}`);
    },
    [focusOnEmployee],
  );

  // ─── Filters (Department / Location / Designation / Status) — computed
  // client-side over the same fetched roster, same convention as the
  // Employee Directory page.
  const departmentOptions = departmentsData?.data || [];
  const locationOptions = locationsData?.data || [];
  const statusOptions = useMemo(
    () => Array.from(new Set(activeList.map((e) => e.status).filter(Boolean))) as string[],
    [activeList],
  );
  const hasActiveFilters = Boolean(
    filterDeptId || filterLocationId || filterDesignationId || filterStatus,
  );

  const filterMatchIds = useMemo(() => {
    if (!hasActiveFilters) return null;
    return new Set<number>(
      activeList
        .filter((e: any) => {
          if (filterDeptId && String(e.currentDepartmentId || "") !== filterDeptId) return false;
          if (filterLocationId && String(e.currentLocationId || "") !== filterLocationId) return false;
          if (filterDesignationId && String(e.currentDesignationId || "") !== filterDesignationId) return false;
          if (filterStatus && e.status !== filterStatus) return false;
          return true;
        })
        .map((e) => e.id!),
    );
  }, [activeList, hasActiveFilters, filterDeptId, filterLocationId, filterDesignationId, filterStatus]);

  // Search highlight + filter highlight combine as an AND — narrowing, not
  // two independent overlays — and both auto-expand ancestors so a match
  // hidden in a collapsed branch is actually visible.
  const highlightIds = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    const textMatches = term
      ? new Set<number>(
          activeList
            .filter((e) =>
              [e.firstName, e.lastName, e.email, e.designation, e.department]
                .join(" ")
                .toLowerCase()
                .includes(term),
            )
            .map((e) => e.id!),
        )
      : null;

    if (!textMatches && !filterMatchIds) return new Set<number>();
    if (textMatches && filterMatchIds) {
      return new Set<number>([...textMatches].filter((id) => filterMatchIds.has(id)));
    }
    return new Set<number>(textMatches || filterMatchIds || []);
  }, [debouncedSearchTerm, activeList, filterMatchIds]);

  useEffect(() => {
    if (highlightIds.size === 0) return;
    const ancestorsToOpen = new Set<number>();
    highlightIds.forEach((id) => {
      getAncestorChain(id).forEach((aid) => ancestorsToOpen.add(aid));
    });
    if (ancestorsToOpen.size === 0) return;
    setCollapsedMap((prev) => {
      let changed = false;
      const next = { ...prev };
      ancestorsToOpen.forEach((id) => {
        if (next[id] !== false) {
          next[id] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [highlightIds, getAncestorChain]);

  // Expand All / Collapse All — mirrors the boolean-map pattern used by the
  // sidebar's navStore (expandAll/collapseAll), scoped locally to this page.
  const collectNodeIdsWithChildren = useCallback((node: OrgTreeNode | null, out: number[]) => {
    if (!node) return;
    if (node.children && node.children.length > 0) {
      out.push(Number(node.emp.id));
      node.children.forEach((child) => collectNodeIdsWithChildren(child, out));
    }
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedMap({});
  }, []);

  const handleCollapseAll = useCallback(() => {
    const ids: number[] = [];
    collectNodeIdsWithChildren(treeData, ids);
    const next: Record<number, boolean> = {};
    ids.forEach((id) => {
      next[id] = true;
    });
    setCollapsedMap(next);
  }, [treeData, collectNodeIdsWithChildren]);

  // ─── Reporting path breadcrumb (Phase: Reporting Path) — the ancestor
  // chain of the currently selected employee, CEO/root first.
  const reportingPathIds = useMemo(() => {
    if (!selectedEmp?.id) return null;
    const chain = getAncestorChain(selectedEmp.id).reverse();
    if (treeData?.emp.id !== undefined && treeData.emp.id !== null && !chain.includes(Number(treeData.emp.id))) {
      chain.unshift(Number(treeData.emp.id));
    }
    chain.push(selectedEmp.id);
    return chain;
  }, [selectedEmp, getAncestorChain, treeData]);

  // Stable Set reference (only changes when the underlying path changes) so
  // TreeBranch's React.memo isn't defeated by a fresh Set every render.
  const reportingPathIdSet = useMemo(
    () => (reportingPathIds ? new Set(reportingPathIds) : undefined),
    [reportingPathIds],
  );

  const reportingPathEmployees = useMemo(() => {
    if (!reportingPathIds) return [];
    return reportingPathIds
      .map((id) => (id === treeData?.emp.id ? treeData!.emp : employeeById.get(id)))
      .filter((e): e is Employee => Boolean(e));
  }, [reportingPathIds, employeeById, treeData]);

  const handleSelectEmp = useCallback((e: Employee) => {
    if (e.id !== undefined && e.id !== null && Number(e.id) < 0) return; // synthetic org-root / unassigned-group node
    setSelectedEmp(e);
  }, []);

  const directReportsCountFor = useCallback(
    (empId?: number | null) => {
      if (!empId) return 0;
      let count = 0;
      activeList.forEach((e) => {
        const mgrId = (e as any).reportingManagerId ?? (e as any).reporting_manager_id;
        if (mgrId !== null && mgrId !== undefined && Number(mgrId) === Number(empId)) count += 1;
      });
      return count;
    },
    [activeList],
  );

  // In view-only portals, open the shared chart around the signed-in employee.
  useEffect(() => {
    if (isAdminOrManager || !user?.employeeId || activeList.length === 0) return;
    const currentEmployee = activeList.find(
      (employee: any) => Number(employee.id) === Number(user.employeeId),
    );
    if (currentEmployee) {
      focusOnEmployee(currentEmployee);
    }
    // This is intentionally an initial focus action, not a response to canvas pan/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrManager, user?.employeeId, activeList]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 2.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.4));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.min(Math.max(0.4, s + delta), 2.0));
    }
  };

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !treeData) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-org-node], button, input, a, [role="button"]')) return;
    panPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = panPointer.current;
    if (!previous || previous.id !== event.pointerId) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    panPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setPan(current => ({ x: current.x + dx, y: current.y + dy }));
    event.preventDefault();
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panPointer.current?.id !== event.pointerId) return;
    panPointer.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const captureFullTree = async () => {
    if (!exportTreeRef.current) throw new Error("Organization chart is not ready.");
    // Capture an untransformed clone outside the scrollable chart viewport. This
    // prevents the viewport from clipping wide/deep reporting trees.
    const previousCollapsedMap = collapsedMap;
    if (Object.values(previousCollapsedMap).some(Boolean)) {
      setCollapsedMap({});
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    const clone = exportTreeRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.cssText = "position:fixed;left:0;top:0;z-index:-1;width:max-content;min-width:0;max-width:none;padding:48px;background:#fff;color:#0f172a;visibility:visible;pointer-events:none;overflow:visible;border-radius:0;";
    document.body.appendChild(clone);
    try {
      await document.fonts?.ready;
      const width = Math.ceil(clone.scrollWidth);
      const height = Math.ceil(clone.scrollHeight);
      const captureScale = Math.min(3, Math.max(2, 12000 / Math.max(width, height)));
      return await html2canvas(clone, {
        scale: captureScale,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
      });
    } finally {
      clone.remove();
      if (Object.values(previousCollapsedMap).some(Boolean)) setCollapsedMap(previousCollapsedMap);
    }
  };

  // Large-organization export can take a noticeable moment (the whole tree
  // is force-expanded and rasterized) — say so up front instead of leaving
  // the user staring at an unresponsive tab with no explanation.
  const LARGE_EXPORT_THRESHOLD = 300;
  const warnIfLargeExport = () => {
    if (activeList.length > LARGE_EXPORT_THRESHOLD) {
      toast.info(
        `Large organization (${activeList.length} employees) — export may take a moment.`,
      );
    }
  };

  const handleExportPNG = async () => {
    try {
      warnIfLargeExport();
      toast.info("Generating high-resolution PNG of entire org structure...");
      const canvas = await captureFullTree();

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Organization_Structure_Full_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      toast.success("Full Org Structure PNG exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PNG image");
    }
  };

  const handleExportPDF = async () => {
    try {
      warnIfLargeExport();
      toast.info("Preparing PDF document of entire org structure...");
      const canvas = await captureFullTree();

      const imgData = canvas.toDataURL("image/png");

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Full Organization Structure Hierarchy</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
                @page { size: ${Math.max(11, Math.ceil(canvas.width / 96 + 0.5))}in ${Math.max(8.5, Math.ceil(canvas.height / 96 + 1.1))}in; margin: 0.25in; }
                body { margin: 0; padding: 15px; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #ffffff; text-align: center; }
                .header { margin-bottom: 15px; }
                .header h2 { margin: 0; font-size: 20px; color: #0B2545; }
                .header p { margin: 4px 0 0; font-size: 12px; color: #5B7089; }
                .img-container { width: max-content; display: inline-block; }
                img { display: block; width: ${canvas.width}px; height: ${canvas.height}px; border: 1px solid #D5E3F2; border-radius: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>Full Organization Hierarchy Chart</h2>
                <p>Exported on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div class="img-container">
                <img src="${imgData}" alt="Full Organization Structure Chart" />
              </div>
              <script>
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 600);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success("PDF document ready for saving/printing!");
      } else {
        toast.error("Pop-up blocked. Please allow pop-ups to export PDF.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF document");
    }
  };

  // Shared chrome for the four pan arrows
  const panBtn =
    "absolute z-20 flex items-center justify-center bg-card/95 text-foreground border border-border shadow-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

  return (
    <div className="org-font flex min-h-full w-full flex-col gap-4 text-foreground">
      <style>{FONT_CSS}</style>

      <div className="flex w-full flex-1 flex-col gap-4">
        {/* ─── Header & controls ─── */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">People Management</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">Org Structure</h1>
              {!isLoading && (
                <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-[11px] font-semibold text-primary">
                  {employees?.length || 0} Staff
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Explore reporting lines and manage your organization hierarchy.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* Zoom — only meaningful for the desktop/tablet canvas */}
            <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleZoomOut}
                className="h-7 w-7 text-foreground hover:bg-card hover:text-primary"
                title="Zoom Out (-)"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-bold w-12 text-center text-foreground tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleZoomIn}
                className="h-7 w-7 text-foreground hover:bg-card hover:text-primary"
                title="Zoom In (+)"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleResetZoom}
                className="h-7 w-7 text-foreground hover:bg-card hover:text-primary"
                title="Reset Zoom / Fit"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {isAdminOrManager && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSettingsModalOpen(true)}
                className={`h-9 text-xs font-semibold gap-1.5 px-3 ${BTN_OUTLINE}`}
                title="Organization Hierarchy Settings"
              >
                <Settings className="w-3.5 h-3.5 text-primary" />
                Settings
              </Button>
            )}

            {canExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-9 text-xs font-semibold gap-1.5 px-3 ${BTN_OUTLINE}`}
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    Export chart
                    <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="org-font w-44 bg-card text-foreground border border-border rounded-xl shadow-lg"
                >
                  <DropdownMenuItem
                    onClick={handleExportPNG}
                    className="text-xs gap-2 cursor-pointer font-medium focus:bg-primary/10 focus:text-foreground"
                  >
                    <Image className="w-3.5 h-3.5 text-primary" />
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportPDF}
                    className="text-xs gap-2 cursor-pointer font-medium focus:bg-primary/10 focus:text-foreground"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isAdminOrManager && (
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className={`h-9 text-xs font-semibold gap-1.5 px-3 ${BTN_PRIMARY}`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Employee
              </Button>
            )}
          </div>
        </div>

        {/* ─── Desktop/tablet: interactive pan/zoom tree canvas ─── */}
        <div className="hidden sm:flex sm:flex-col sm:gap-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <form
              className="relative flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-md"
              onSubmit={(event) => {
                event.preventDefault();
                if (searchMatches.length === 1) {
                  handleSelectSearchResult(searchMatches[0]);
                } else {
                  handleSearchSubmit(searchTerm);
                }
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search employee by name"
                  aria-label="Search employee"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                  className="h-9 border-border bg-background pl-9 text-sm"
                />

                {/* Multi-result dropdown */}
                {isSearchFocused && debouncedSearchTerm.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    {searchMatches.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-muted-foreground">No employee matching "{debouncedSearchTerm}" found.</p>
                    ) : (
                      <>
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {searchMatches.length} result{searchMatches.length === 1 ? "" : "s"}
                        </p>
                        {searchMatches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSearchResult(m)}
                            className="flex w-full flex-col items-start gap-0 px-3 py-2 text-left hover:bg-primary/10 focus-visible:bg-primary/10 outline-none"
                          >
                            <span className="text-xs font-bold text-foreground">{m.firstName} {m.lastName}</span>
                            <span className="text-[11px] text-muted-foreground">{resolveDesignation(m, designations)}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button type="submit" size="sm" className={`h-9 px-4 text-xs font-semibold ${BTN_PRIMARY}`}>Find</Button>
            </form>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExpandAll}
                className={`h-9 text-xs font-semibold gap-1.5 px-3 ${BTN_OUTLINE}`}
                title="Expand all branches"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-primary" />
                Expand All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCollapseAll}
                className={`h-9 text-xs font-semibold gap-1.5 px-3 ${BTN_OUTLINE}`}
                title="Collapse all branches"
              >
                <ChevronsDownUp className="w-3.5 h-3.5 text-primary" />
                Collapse All
              </Button>
            </div>

            <span className="hidden text-xs text-muted-foreground lg:inline">Drag the chart background to pan · Ctrl or Shift + scroll to zoom</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={`h-8 text-xs font-medium gap-1 px-2.5 ${filterDeptId ? "border-primary text-primary" : BTN_OUTLINE}`}>
                  Department
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                <DropdownMenuRadioGroup value={filterDeptId} onValueChange={setFilterDeptId}>
                  <DropdownMenuRadioItem value="" className="text-xs">All Departments</DropdownMenuRadioItem>
                  {departmentOptions.map((d: any) => (
                    <DropdownMenuRadioItem key={d.id} value={String(d.id)} className="text-xs">{d.name}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={`h-8 text-xs font-medium gap-1 px-2.5 ${filterLocationId ? "border-primary text-primary" : BTN_OUTLINE}`}>
                  Location
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                <DropdownMenuRadioGroup value={filterLocationId} onValueChange={setFilterLocationId}>
                  <DropdownMenuRadioItem value="" className="text-xs">All Locations</DropdownMenuRadioItem>
                  {locationOptions.map((l: any) => (
                    <DropdownMenuRadioItem key={l.id} value={String(l.id)} className="text-xs">{l.name || l.locationName}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={`h-8 text-xs font-medium gap-1 px-2.5 ${filterDesignationId ? "border-primary text-primary" : BTN_OUTLINE}`}>
                  Designation
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                <DropdownMenuRadioGroup value={filterDesignationId} onValueChange={setFilterDesignationId}>
                  <DropdownMenuRadioItem value="" className="text-xs">All Designations</DropdownMenuRadioItem>
                  {designations.map((d: any) => (
                    <DropdownMenuRadioItem key={d.id} value={String(d.id)} className="text-xs">{d.name}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={`h-8 text-xs font-medium gap-1 px-2.5 ${filterStatus ? "border-primary text-primary" : BTN_OUTLINE}`}>
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup value={filterStatus} onValueChange={setFilterStatus}>
                  <DropdownMenuRadioItem value="" className="text-xs">All Statuses</DropdownMenuRadioItem>
                  {statusOptions.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s} className="text-xs capitalize">{s}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setFilterDeptId(""); setFilterLocationId(""); setFilterDesignationId(""); setFilterStatus(""); }}
                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Reporting path breadcrumb for the selected employee */}
          {selectedEmp && reportingPathEmployees.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground">
              {reportingPathEmployees.map((e, idx) => (
                <span key={e.id} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/60" />}
                  <span className={idx === reportingPathEmployees.length - 1 ? "font-bold text-foreground" : ""}>
                    {e.firstName} {e.lastName}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ─── Tree canvas wrapped in @dnd-kit DndContext ─── */}
        <DndContext
          sensors={isAdminOrManager ? sensors : []}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerCancel={handlePanEnd}
            onLostPointerCapture={handlePanEnd}
            className={`relative min-h-[580px] flex-1 select-none overflow-hidden rounded-xl border border-border bg-card shadow-sm touch-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: DOT_GRID,
                backgroundSize: "24px 24px",
                opacity: 0.35,
              }}
            />

            {/* Edge pan controls — 40px tap target on the short axis for touch */}
            <button
              type="button"
              onClick={() => setPan((p) => ({ ...p, y: p.y + 140 }))}
              className={`${panBtn} top-0 left-1/2 -translate-x-1/2 w-28 h-10 rounded-b-lg border-t-0`}
              title="Pan Up"
              aria-label="Pan up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setPan((p) => ({ ...p, y: p.y - 140 }))}
              className={`${panBtn} bottom-0 left-1/2 -translate-x-1/2 w-28 h-10 rounded-t-lg border-b-0`}
              title="Pan Down"
              aria-label="Pan down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setPan((p) => ({ ...p, x: p.x + 180 }))}
              className={`${panBtn} left-0 top-1/2 -translate-y-1/2 w-10 h-28 rounded-r-lg border-l-0`}
              title="Pan Left"
              aria-label="Pan left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setPan((p) => ({ ...p, x: p.x - 180 }))}
              className={`${panBtn} right-0 top-1/2 -translate-y-1/2 w-10 h-28 rounded-l-lg border-r-0`}
              title="Pan Right"
              aria-label="Pan right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {isLoading ? (
              <div className="relative flex flex-col items-center justify-center h-64 space-y-2">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">
                  Building organization hierarchy...
                </p>
              </div>
            ) : isError ? (
              <div className="relative flex h-64 items-center justify-center px-6">
                <EmptyState
                  icon={AlertCircle}
                  title="Unable to load organization structure"
                  description={hierarchyError || "We couldn't retrieve employee data. Please check your connection and try again."}
                  action={
                    <Button size="sm" onClick={() => refetch()} className={`h-8 text-xs font-semibold gap-1.5 ${BTN_PRIMARY}`}>
                      <RotateCcw className="w-3.5 h-3.5" /> Retry
                    </Button>
                  }
                />
              </div>
            ) : !treeData ? (
              <div className="relative flex h-64 items-center justify-center px-6">
                <EmptyState
                  icon={Users}
                  title="No employees found"
                  description="Your organization currently has no employees. Add staff to populate the hierarchy chart."
                  action={
                    isAdminOrManager ? (
                      <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className={`h-8 text-xs font-semibold gap-1.5 ${BTN_PRIMARY}`}>
                        <UserPlus className="w-3.5 h-3.5" /> Add first employee
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div
                className="relative w-full h-full flex justify-center pt-14 pb-20 transition-transform duration-75 origin-top"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                }}
              >
                <div
                  ref={exportTreeRef}
                  role="tree"
                  aria-label="Organization chart"
                  className="w-fit min-w-full flex justify-center p-6 bg-card text-foreground rounded-xl"
                >
                  <TreeBranch
                    node={treeData}
                    highlight={highlightIds}
                    pulsingEmpId={pulsingEmpId}
                    collapsedMap={collapsedMap}
                    onToggleCollapse={toggleCollapse}
                    onSelectEmp={handleSelectEmp}
                    pathIds={reportingPathIdSet}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drag overlay preview */}
          <DragOverlay
            dropAnimation={{
              duration: 250,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeDragEmp ? (
              <div className="org-font flex flex-col items-center bg-card border-2 border-primary ring-4 ring-primary/20 rounded-xl px-3 py-3 w-[172px] min-h-[96px] shadow-2xl cursor-grabbing pointer-events-none z-50">
                <Avatar className="h-9 w-9 rounded-full mb-1.5 border border-border">
                  <AvatarImage
                    src={(activeDragEmp as any).avatarUrl || undefined}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {activeDragEmp.firstName?.[0]}
                    {activeDragEmp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full text-[13px] font-bold text-foreground text-center truncate">
                  {activeDragEmp.firstName} {activeDragEmp.lastName}
                </div>
                <div className="text-[11px] font-semibold text-primary mt-0.5">
                  Choose a new manager
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </div>

        {/* ─── Mobile: department-grouped list instead of the spatial tree ─── */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Building organization hierarchy...</p>
            </div>
          ) : isError ? (
            <EmptyState
              icon={AlertCircle}
              title="Unable to load organization structure"
              description={hierarchyError || "We couldn't retrieve employee data. Please check your connection and try again."}
              action={
                <Button size="sm" onClick={() => refetch()} className={`h-8 text-xs font-semibold gap-1.5 ${BTN_PRIMARY}`}>
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </Button>
              }
            />
          ) : activeList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description="Your organization currently has no employees. Add staff to populate the hierarchy chart."
            />
          ) : (
            <MobileOrgSummary employees={activeList} designations={designations} onSelectEmployee={handleSelectEmp} />
          )}
        </div>

        {/* ─── Settings dialog ─── */}
        {isSettingsModalOpen && (
          <Dialog open onOpenChange={setIsSettingsModalOpen}>
            <DialogContent className={DIALOG_SURFACE}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Settings className="w-5 h-5 text-primary" />
                  Organization hierarchy settings
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configure hierarchy chart visibility and export options for
                  your organization.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between gap-4 p-3.5 bg-muted/50 border border-border rounded-xl">
                  <div className="space-y-0.5 max-w-[280px]">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Reporting hierarchy rules
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Define which positions can be selected as an employee’s direct manager.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-8 text-xs font-semibold ${BTN_OUTLINE}`}
                    onClick={() => { setIsSettingsModalOpen(false); setIsHierarchyRulesModalOpen(true); }}
                  >
                    Configure rules
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 p-3.5 bg-muted/50 border border-border rounded-xl">
                  <div className="space-y-0.5 max-w-[280px]">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      Allow employee chart export
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Show or hide the PNG and PDF export options for employee
                      logins.
                    </p>
                  </div>
                  <Switch
                    checked={isExportEnabledForEmployees}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    onCheckedChange={(val) => {
                      setIsExportEnabledForEmployees(val);
                      localStorage.setItem(
                        "org_chart_export_employee_enabled",
                        JSON.stringify(val),
                      );
                      toast.success(
                        val
                          ? "Chart export is now visible for employees."
                          : "Chart export is now hidden for employees.",
                      );
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <Button
                  size="sm"
                  className={`h-8 text-xs font-semibold px-4 ${BTN_PRIMARY}`}
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <OrgHierarchyConfigModal
          open={isHierarchyRulesModalOpen}
          onClose={() => setIsHierarchyRulesModalOpen(false)}
          rules={hierarchyRules}
          onSaveRules={async (rules) => {
            await apiClient.put("/employees/org-hierarchy/rules", { rules });
            setHierarchyRules(rules);
          }}
        />

        {/* ─── Reassign confirmation dialog ─── */}
        {reassignConfirm && (
          <Dialog open onOpenChange={() => setReassignConfirm(null)}>
            <DialogContent className={DIALOG_SURFACE}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Confirm reassignment
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Are you sure you want to change the reporting manager and
                  department for this employee?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="bg-muted/50 p-3.5 rounded-xl border border-border text-xs space-y-2.5">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground font-medium">
                      Move employee
                    </span>
                    <span className="font-bold text-foreground text-right">
                      {reassignConfirm.activeEmp.firstName}{" "}
                      {reassignConfirm.activeEmp.lastName}
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground font-medium">
                      Under manager / department
                    </span>
                    <span className="font-bold text-primary text-right">
                      {reassignConfirm.targetIsAdmin
                        ? "Organization Admin / Executive Management"
                        : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}${
                            reassignConfirm.targetEmp.department
                              ? ` / ${reassignConfirm.targetEmp.department}`
                              : ""
                          }`}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Move {reassignConfirm.activeEmp.firstName}{" "}
                  {reassignConfirm.activeEmp.lastName} under{" "}
                  {reassignConfirm.targetIsAdmin
                    ? "Organization Admin"
                    : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}`}
                  {reassignConfirm.targetEmp.department
                    ? ` / ${reassignConfirm.targetEmp.department}`
                    : ""}
                  ?
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs font-semibold ${BTN_OUTLINE}`}
                  onClick={() => setReassignConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={`h-8 text-xs font-semibold ${BTN_PRIMARY}`}
                  onClick={async () => {
                    const activeEmpId = reassignConfirm.activeEmp.id;
                    const targetManagerId = reassignConfirm.targetIsAdmin
                      ? null
                      : reassignConfirm.targetEmp.id;
                    const targetDeptId = reassignConfirm.targetIsAdmin
                      ? null
                      : reassignConfirm.targetEmp.currentDepartmentId ||
                        (reassignConfirm.targetEmp as any).departmentId ||
                        null;

                    const previousLocalEmps = localEmps;
                    const confirmState = reassignConfirm;
                    setReassignConfirm(null);

                    if (!activeEmpId) return;

                    // Optimistically move node in local tree state
                    if (localEmps) {
                      setLocalEmps(
                        localEmps.map((emp) => {
                          if (emp.id === activeEmpId) {
                            return {
                              ...emp,
                              reportingManagerId: targetManagerId,
                              currentDepartmentId: targetDeptId,
                              department: confirmState.targetIsAdmin
                                ? "Executive Management"
                                : confirmState.targetEmp.department ||
                                  emp.department,
                            };
                          }
                          return emp;
                        }),
                      );
                    }

                    try {
                      await apiClient.patch(`/employees/${activeEmpId}`, {
                        reportingManagerId: targetManagerId,
                        currentDepartmentId: targetDeptId,
                      });
                      toast.success(
                        `Moved ${confirmState.activeEmp.firstName} under ${
                          confirmState.targetIsAdmin
                            ? "Organization Admin"
                            : `${confirmState.targetEmp.firstName} ${confirmState.targetEmp.lastName}`
                        } successfully!`,
                      );
                      refetch();
                    } catch (err: any) {
                      // Roll back optimistic update on API error
                      setLocalEmps(previousLocalEmps);
                      const msg =
                        err?.response?.data?.error?.details?.message ||
                        err?.response?.data?.message ||
                        "Failed to reassign employee";
                      toast.error(msg);
                    }
                  }}
                >
                  Confirm move
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── Employee detail dialog ─── */}
        {selectedEmp && (
          <Dialog open onOpenChange={() => setSelectedEmp(null)}>
            <DialogContent className={DIALOG_SURFACE}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage
                      src={(selectedEmp as any)?.avatarUrl || undefined}
                    />
                    <AvatarFallback
                      className={`text-sm font-bold ${avatarTone(selectedEmp.id)}`}
                    >
                      {selectedEmp.firstName?.[0]}
                      {selectedEmp.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-foreground truncate">
                      {selectedEmp.firstName} {selectedEmp.lastName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const cfg = roleCfg(
                          (selectedEmp as any).accessRole,
                          resolveDesignation(selectedEmp, designations),
                        );
                        const Icon = cfg.Icon;
                        return (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold py-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        );
                      })()}
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedEmp.employeeCode}
                      </span>
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Reporting hierarchy and manager assignment
                </DialogDescription>
              </DialogHeader>

              {/* Direct reporting manager */}
              {(() => {
                const allEmpsList =
                  localEmps || (employees as Employee[]) || [];
                const mgrId =
                  selectedEmp.reportingManagerId ??
                  (selectedEmp as any).reporting_manager_id;
                const currentMgr = mgrId
                  ? allEmpsList.find((e) => Number(e.id) === Number(mgrId))
                  : null;
                const ceoEmp = allEmpsList.find((e: any) => {
                  const isCeo = Boolean(
                    e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1,
                  );
                  const desig = (
                    e.designation ||
                    e.jobTitle ||
                    ""
                  ).toLowerCase();
                  return (
                    isCeo ||
                    desig.includes("ceo") ||
                    desig.includes("chief executive")
                  );
                });
                const isSelectedEmpCeo =
                  selectedEmp.id === ceoEmp?.id ||
                  (selectedEmp as any).isCeo ||
                  (selectedEmp as any).is_ceo;
                const fallbackManagerName =
                  (selectedEmp as any).reportingManager ||
                  (selectedEmp as any).reporting_manager_name;

                return (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-border text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Direct reporting manager
                      </div>
                      {currentMgr?.employeeCode && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-card border border-border text-muted-foreground">
                          {currentMgr.employeeCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <Avatar className="h-10 w-10 rounded-full border border-border">
                        <AvatarImage
                          src={(currentMgr as any)?.avatarUrl || undefined}
                        />
                        <AvatarFallback
                          className={`text-xs font-bold ${avatarTone(currentMgr?.id || 1)}`}
                        >
                          {currentMgr ? (
                            `${currentMgr.firstName?.[0] || ""}${currentMgr.lastName?.[0] || ""}`
                          ) : isSelectedEmpCeo ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : ceoEmp ? (
                            `${ceoEmp.firstName?.[0] || ""}${ceoEmp.lastName?.[0] || ""}`
                          ) : (
                            <Crown className="w-4 h-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                          {isSelectedEmpCeo ? (
                            <span>Board of Directors / Shareholders</span>
                          ) : currentMgr ? (
                            <span>
                              {currentMgr.firstName} {currentMgr.lastName}
                            </span>
                          ) : fallbackManagerName ? (
                            <span>{fallbackManagerName}</span>
                          ) : ceoEmp ? (
                            <span className="flex items-center gap-1.5">
                              {ceoEmp.firstName} {ceoEmp.lastName}
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold py-0 px-1.5 bg-foreground text-background border-foreground"
                              >
                                CEO
                              </Badge>
                            </span>
                          ) : (
                            <span className="text-primary font-bold flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 inline" /> Direct
                              report to CEO
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                          {isSelectedEmpCeo ? (
                            <span>Corporate Executive Governance</span>
                          ) : currentMgr ? (
                            <span>
                              {resolveDesignation(currentMgr, designations)}
                              {currentMgr.department
                                ? ` · ${currentMgr.department}`
                                : ""}
                            </span>
                          ) : ceoEmp ? (
                            <span>
                              Chief Executive Officer · Executive Leadership
                            </span>
                          ) : (
                            <span>Top-level Executive Organization</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs bg-muted/50 p-3.5 rounded-xl border border-border">
                {[
                  ["Employee ID", selectedEmp.employeeCode || "—"],
                  ["Department", selectedEmp.department || "—"],
                  [
                    "Designation",
                    resolveDesignation(selectedEmp, designations),
                  ],
                  ["Email", selectedEmp.email],
                  ["Mobile", selectedEmp.mobile || selectedEmp.phone || "—"],
                  [
                    "Joined",
                    selectedEmp.dateOfJoining
                      ? new Date(selectedEmp.dateOfJoining).toLocaleDateString()
                      : "—",
                  ],
                  [
                    "Employment",
                    selectedEmp.employmentType?.replace("_", " ") || "—",
                  ],
                  [
                    "Direct Reports",
                    String(directReportsCountFor(selectedEmp.id)),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {label}
                    </span>
                    <span
                      title={value}
                      className={`font-bold block truncate text-xs text-foreground ${label === "Employment" ? "capitalize" : ""}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs font-semibold gap-1.5 ${BTN_OUTLINE}`}
                  onClick={() => {
                    navigate(`/employees/${selectedEmp.id}`);
                    setSelectedEmp(null);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" /> View
                  profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-foreground"
                  onClick={() => setSelectedEmp(null)}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <EmployeeCreateModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      </div>
    </div>
  );
}
