import { useState, useMemo, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEmployees } from "@/features/employee/hooks/useEmployees";
import { useDesignations } from "@/features/settings/hooks/useDesignations";
import { EmployeeCreateModal } from "@/features/employee/components/EmployeeCreateModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { apiClient } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  AlertTriangle,
  CheckCircle2,
  MoveRight,
  Building,
  XCircle,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Employee } from "@/types";
import { InvalidDropModal } from "../components/InvalidDropModal";
import {
  validateDragAndDrop,
  normalizePositionKey,
  DEFAULT_HIERARCHY_RULES,
} from "../utils/orgHierarchyEngine";
import type { HierarchyRule } from "../types/orgHierarchy";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — Plus Jakarta Sans font
// ─────────────────────────────────────────────────────────────────────────────
const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.org-font { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }

@keyframes org-pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb, 59,130,246), 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(var(--primary-rgb, 59,130,246), 0.0); }
}
.org-pulse-node { animation: org-pulse-ring 1.2s ease-in-out infinite; }

@keyframes org-float-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.org-float-in { animation: org-float-in 0.22s ease-out both; }
`;

// Dot grid for canvas background
const DOT_GRID =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1.5' cy='1.5' r='1' fill='%2394A3B8'/%3E%3C/svg%3E\")";

const BTN_PRIMARY =
  "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1";
const BTN_OUTLINE =
  "border border-border bg-card text-foreground hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50";
const DIALOG_SURFACE =
  "org-font sm:max-w-md bg-card text-foreground border border-border rounded-2xl shadow-[0_20px_50px_-12px_rgba(11,37,69,0.25)]";

// ─────────────────────────────────────────────────────────────────────────────
// Role configuration — richly styled badges per tier
// ─────────────────────────────────────────────────────────────────────────────
type RoleTier = "ceo" | "board" | "cxo_cto" | "cxo_cfo" | "cxo_coo" | "cxo" | "manager" | "team_lead" | "senior" | "employee" | "intern";

interface RoleConfig {
  label: string;
  tier: RoleTier;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  nameColor: string;
  designColor: string;
  Icon: React.ElementType;
}

const TIER_CONFIGS: Record<string, RoleConfig> = {
  ceo: {
    label: "CEO",
    tier: "ceo",
    cardBg: "bg-slate-900 dark:bg-slate-800",
    cardBorder: "border-slate-700",
    badgeBg: "bg-amber-400/20",
    badgeBorder: "border-amber-400/60",
    badgeText: "text-amber-300",
    nameColor: "text-white",
    designColor: "text-slate-300",
    Icon: Crown,
  },
  board: {
    label: "Board of Directors",
    tier: "board",
    cardBg: "bg-slate-900 dark:bg-slate-800",
    cardBorder: "border-slate-700",
    badgeBg: "bg-amber-400/20",
    badgeBorder: "border-amber-400/60",
    badgeText: "text-amber-300",
    nameColor: "text-white",
    designColor: "text-slate-300",
    Icon: Layers,
  },
  cto: {
    label: "CTO",
    tier: "cxo_cto",
    cardBg: "bg-indigo-950/80 dark:bg-indigo-900/80",
    cardBorder: "border-indigo-700/60",
    badgeBg: "bg-indigo-500/20",
    badgeBorder: "border-indigo-500/50",
    badgeText: "text-indigo-300",
    nameColor: "text-indigo-50",
    designColor: "text-indigo-300",
    Icon: Zap,
  },
  cfo: {
    label: "CFO",
    tier: "cxo_cfo",
    cardBg: "bg-emerald-950/80 dark:bg-emerald-900/70",
    cardBorder: "border-emerald-700/60",
    badgeBg: "bg-emerald-500/20",
    badgeBorder: "border-emerald-500/50",
    badgeText: "text-emerald-300",
    nameColor: "text-emerald-50",
    designColor: "text-emerald-300",
    Icon: ShieldCheck,
  },
  coo: {
    label: "COO",
    tier: "cxo_coo",
    cardBg: "bg-violet-950/80 dark:bg-violet-900/70",
    cardBorder: "border-violet-700/60",
    badgeBg: "bg-violet-500/20",
    badgeBorder: "border-violet-500/50",
    badgeText: "text-violet-300",
    nameColor: "text-violet-50",
    designColor: "text-violet-300",
    Icon: Briefcase,
  },
  cxo: {
    label: "Executive",
    tier: "cxo",
    cardBg: "bg-purple-950/70 dark:bg-purple-900/70",
    cardBorder: "border-purple-700/60",
    badgeBg: "bg-purple-500/20",
    badgeBorder: "border-purple-500/50",
    badgeText: "text-purple-300",
    nameColor: "text-purple-50",
    designColor: "text-purple-300",
    Icon: Crown,
  },
  manager: {
    label: "Manager",
    tier: "manager",
    cardBg: "bg-card",
    cardBorder: "border-blue-400/50",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-400/40",
    badgeText: "text-blue-600 dark:text-blue-400",
    nameColor: "text-foreground",
    designColor: "text-muted-foreground",
    Icon: Building2,
  },
  team_lead: {
    label: "Team Lead",
    tier: "team_lead",
    cardBg: "bg-card",
    cardBorder: "border-teal-400/50",
    badgeBg: "bg-teal-500/10",
    badgeBorder: "border-teal-400/40",
    badgeText: "text-teal-600 dark:text-teal-400",
    nameColor: "text-foreground",
    designColor: "text-muted-foreground",
    Icon: UserCheck,
  },
  senior_employee: {
    label: "Sr. Employee",
    tier: "senior",
    cardBg: "bg-card",
    cardBorder: "border-sky-400/40",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-400/40",
    badgeText: "text-sky-600 dark:text-sky-400",
    nameColor: "text-foreground",
    designColor: "text-muted-foreground",
    Icon: UserCheck,
  },
  employee: {
    label: "Employee",
    tier: "employee",
    cardBg: "bg-card",
    cardBorder: "border-border",
    badgeBg: "bg-muted/60",
    badgeBorder: "border-border",
    badgeText: "text-muted-foreground",
    nameColor: "text-foreground",
    designColor: "text-muted-foreground",
    Icon: User,
  },
  intern: {
    label: "Intern",
    tier: "intern",
    cardBg: "bg-orange-50 dark:bg-orange-950/40",
    cardBorder: "border-orange-300/60",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeBorder: "border-orange-300/60",
    badgeText: "text-orange-600 dark:text-orange-400",
    nameColor: "text-foreground",
    designColor: "text-orange-500 dark:text-orange-400",
    Icon: User,
  },
};

function resolveRoleConfig(emp: any): RoleConfig {
  const role = ((emp.accessRole || emp.role || "") as string).toLowerCase().trim();
  const desig = (
    emp.designation ||
    emp.jobTitle ||
    emp.designationName ||
    emp.designation_name ||
    ""
  ).toLowerCase().trim();

  if (role === "ceo" || desig === "ceo" || desig.includes("chief executive")) return TIER_CONFIGS.ceo;
  if (role === "cto" || desig === "cto" || desig.includes("chief tech") || desig.includes("chief technology")) return TIER_CONFIGS.cto;
  if (role === "cfo" || desig === "cfo" || desig.includes("chief financial") || desig.includes("finance head")) return TIER_CONFIGS.cfo;
  if (role === "coo" || desig === "coo" || desig.includes("chief operating") || desig.includes("chief operations")) return TIER_CONFIGS.coo;
  if (role === "cxo" || desig.startsWith("chief ") || desig.includes("c-level")) return TIER_CONFIGS.cxo;
  if (role === "hr_manager" || role === "hr_admin" || role === "support" || desig.includes("hr manager") || desig.includes("hr head")) return TIER_CONFIGS.manager;
  if (role === "department_head" || role === "manager" || desig.includes("manager") || desig.includes("head") || desig.includes("director")) return TIER_CONFIGS.manager;
  if (role === "team_lead" || desig.includes("team lead") || desig.includes("team leader") || desig.includes("tech lead") || desig.includes("lead engineer")) return TIER_CONFIGS.team_lead;
  if (desig.includes("senior") || desig.includes("sr.") || desig.includes("sr ") || desig.includes("principal")) return TIER_CONFIGS.senior_employee;
  if (role === "intern" || desig.includes("intern") || desig.includes("trainee") || desig.includes("apprentice")) return TIER_CONFIGS.intern;
  return TIER_CONFIGS.employee;
}

const isDarkCard = (cfg: RoleConfig) =>
  ["ceo", "board", "cxo_cto", "cxo_cfo", "cxo_coo", "cxo"].includes(cfg.tier);

// ─────────────────────────────────────────────────────────────────────────────
// Designation resolver (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function resolveDesignation(emp?: Employee | null, designationsList?: any[]): string {
  if (!emp) return "—";
  const e = emp as any;

  if (e.designation && typeof e.designation === "string" && e.designation.trim() !== "" && e.designation.trim() !== "—") {
    return e.designation.trim();
  }
  if (e.designationName && typeof e.designationName === "string" && e.designationName.trim()) {
    return e.designationName.trim();
  }
  if (e.designation_name && typeof e.designation_name === "string" && e.designation_name.trim()) {
    return e.designation_name.trim();
  }
  if (e.jobTitle && typeof e.jobTitle === "string" && e.jobTitle.trim()) return e.jobTitle.trim();
  if (e.job_title && typeof e.job_title === "string" && e.job_title.trim()) return e.job_title.trim();

  const desigId = e.currentDesignationId ?? e.designationId ?? e.designation_id ?? e.current_designation_id;
  if (desigId && Array.isArray(designationsList) && designationsList.length > 0) {
    const matched = designationsList.find((d: any) => String(d.id) === String(desigId));
    if (matched?.name) return matched.name;
  }

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

  if (e.department) return `${e.department} Executive`;
  return "Employee";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: is employee an Intern?
// ─────────────────────────────────────────────────────────────────────────────
function isIntern(emp: any): boolean {
  const role = ((emp.accessRole || emp.role || "") as string).toLowerCase().trim();
  const desig = (emp.designation || emp.jobTitle || emp.designationName || "").toLowerCase().trim();
  return role === "intern" || desig.includes("intern") || desig.includes("trainee") || desig.includes("apprentice");
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar tone picker
// ─────────────────────────────────────────────────────────────────────────────
const AVATAR_TONES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
];
function avatarTone(id?: number) {
  return AVATAR_TONES[(id || 0) % AVATAR_TONES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// ReferenceNode — Redesigned with role-tier colours
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
  isBoardRoot?: boolean;
  deptName?: string;
  designationsList?: any[];
}

function ReferenceNode({
  emp,
  highlight,
  isPulsing = false,
  hasChildren,
  isCollapsed,
  onToggleExpand,
  onClick,
  isAdmin = false,
  isBoardRoot = false,
  deptName,
  designationsList,
}: ReferenceNodeProps) {
  const name = [emp.firstName, emp.lastName].filter(Boolean).join(" ");
  const initials = `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase();
  const designation = isAdmin && !isBoardRoot ? "CHIEF EXECUTIVE OFFICER" : isBoardRoot ? "Executive Leadership" : resolveDesignation(emp, designationsList);

  const cfg = isBoardRoot
    ? TIER_CONFIGS.board
    : isAdmin
      ? TIER_CONFIGS.ceo
      : resolveRoleConfig(emp);
  const onDark = isDarkCard(cfg);

  const isInternEmp = isIntern(emp);
  const isDragDisabled = Boolean(isAdmin || isBoardRoot || emp.id === 999999 || emp.id === 999998);

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: String(emp.id),
    disabled: isDragDisabled,
    data: { emp, isAdmin: isAdmin || isBoardRoot },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: String(emp.id),
    data: { emp, isAdmin: isAdmin || isBoardRoot },
  });

  const setCombinedRef = (element: HTMLDivElement | null) => {
    setDraggableRef(element);
    setDroppableRef(element);
  };

  const style: React.CSSProperties = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 0 : 50 }
    : {};

  let stateClasses = "";
  if (isPulsing) {
    stateClasses = "border-primary ring-4 ring-primary/30 scale-110 shadow-xl z-40 org-pulse-node";
  } else if (isDragging) {
    stateClasses = "opacity-40 border-dashed border-primary bg-primary/10";
  } else if (isOver) {
    stateClasses = "border-primary ring-4 ring-primary/20 scale-105 shadow-xl z-40";
  } else if (highlight) {
    stateClasses = "border-primary ring-2 ring-primary/25 shadow-md";
  } else {
    stateClasses = `${cfg.cardBorder} ${cfg.cardBg} hover:shadow-lg hover:scale-[1.02]`;
  }

  const dept = (emp as any).department || (emp as any).departmentName;

  return (
    <div className="relative flex flex-col items-center shrink-0 org-float-in">
      {/* Department label above node */}
      {deptName && (
        <div className="flex flex-col items-center mb-1.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-semibold text-[10px]">
            <Building2 className="w-2.5 h-2.5" />
            <span>{deptName}</span>
          </div>
          <div className="w-px h-2.5 bg-border" />
        </div>
      )}

      {/* Drop target indicator */}
      {isOver && !isDragging && (
        <div className="absolute -top-4 z-50 flex items-center px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold text-[11px] shadow-lg whitespace-nowrap">
          <MoveRight className="w-3 h-3 mr-1" /> Drop to reassign
        </div>
      )}

      {/* Intern leaf badge */}
      {isInternEmp && !isAdmin && (
        <div className="absolute -top-2.5 right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 border border-orange-300/60 text-[9px] font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
          Leaf
        </div>
      )}

      {/* Main card */}
      <div
        id={`node-card-${emp.id}`}
        data-org-node
        ref={setCombinedRef}
        {...listeners}
        {...attributes}
        style={style}
        onClick={onClick}
        title={
          isAdmin
            ? "Organization Admin"
            : isInternEmp
              ? "Intern — leaf node, cannot have subordinates"
              : "Drag node onto a manager to reassign reporting manager"
        }
        className={`group relative flex flex-col items-center border-2 rounded-2xl px-3 py-3
          w-[176px] min-h-[108px] transition-all duration-200 cursor-grab active:cursor-grabbing select-none
          shadow-[0_2px_8px_rgba(0,0,0,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-primary/60
          ${stateClasses}`}
      >
        {/* Role tier badge at top */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold mb-2 ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>
          <cfg.Icon className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate max-w-[80px]">{cfg.label}</span>
        </div>

        {/* Avatar */}
        <Avatar className={`h-9 w-9 rounded-full mb-1.5 border-2 ${onDark ? "border-white/20" : "border-white shadow-sm"}`}>
          <AvatarImage src={(emp as any).avatarUrl || undefined} alt={name} />
          <AvatarFallback
            className={`text-[11px] font-bold ${
              isAdmin || isBoardRoot
                ? "bg-amber-400/30 text-amber-200"
                : onDark
                  ? `${cfg.badgeBg} ${cfg.badgeText}`
                  : avatarTone(emp.id)
            }`}
          >
            {initials || <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <div className={`w-full text-[12px] font-bold text-center truncate leading-tight ${cfg.nameColor}`}>
          {name}
        </div>

        {/* Designation */}
        <div className={`w-full text-[10px] font-medium text-center truncate mt-0.5 ${cfg.designColor}`}>
          {designation}
        </div>

        {/* Department pill (for non-CEO/board) */}
        {dept && !isAdmin && !isBoardRoot && (
          <div className={`mt-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${onDark ? "bg-white/10 text-white/60" : "bg-muted/60 text-muted-foreground border border-border"}`}>
            <Building className="w-2 h-2 shrink-0" />
            <span className="truncate max-w-[110px]">{dept}</span>
          </div>
        )}

        {/* Expand / collapse toggle */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md
              hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-primary/60 outline-none
              ${onDark ? "bg-slate-700 border-slate-500" : "bg-card border-border hover:border-primary"}`}
            title={isCollapsed ? "Expand Children" : "Collapse Children"}
            aria-label={isCollapsed ? "Expand children" : "Collapse children"}
          >
            {isCollapsed ? (
              <Plus className={`w-3 h-3 ${onDark ? "text-white" : "text-primary"}`} />
            ) : (
              <Minus className={`w-3 h-3 ${onDark ? "text-slate-400" : "text-muted-foreground"}`} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TreeBranch — Recursive tree renderer
// ─────────────────────────────────────────────────────────────────────────────
interface TreeBranchProps {
  node: any;
  highlight: Set<number>;
  pulsingEmpId?: number | null;
  collapsedMap: Record<number, boolean>;
  onToggleCollapse: (id: number) => void;
  onSelectEmp: (e: Employee) => void;
  designationsList?: any[];
}

function TreeBranch({
  node,
  highlight,
  pulsingEmpId,
  collapsedMap,
  onToggleCollapse,
  onSelectEmp,
  designationsList,
}: TreeBranchProps) {
  const isCollapsed = collapsedMap[node.emp.id] ?? false;
  const children = node.children || [];
  const hasChildren = children.length > 0;

  // Only show the dept/level label ABOVE the node itself (not above its children)
  // CEO/Board → shows "Executive Leadership" or "Board of Directors"
  // CXO (CTO/CFO/COO) → shows their C-Suite tag
  // Regular employees → no label above (dept is shown via pill inside their card)
  const deptName = node.isAdmin
    ? "Executive Leadership"
    : node.isBoardRoot
      ? "Board of Directors"
      : node.isCxo
        ? `C-Suite · ${(node.cxoType || "CXO").toUpperCase()}`
        : undefined;

  return (
    <div className="flex flex-col items-center shrink-0">
      <ReferenceNode
        emp={node.emp}
        highlight={highlight.has(node.emp.id)}
        isPulsing={pulsingEmpId === node.emp.id}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleExpand={() => onToggleCollapse(node.emp.id)}
        onClick={() => onSelectEmp(node.emp)}
        isAdmin={node.isAdmin}
        isBoardRoot={node.isBoardRoot}
        deptName={deptName}
        designationsList={designationsList}
      />

      {/* Children with connector lines */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center pt-4">
          {/* Stem down */}
          <div className="w-px h-5 bg-border shrink-0" />

          <div className="flex items-start justify-center">
            {children.map((childNode: any, index: number) => (
              <div
                key={childNode.emp.id}
                className="flex flex-col items-center shrink-0"
              >
                {/* Horizontal rails */}
                <div className="relative h-5 w-full shrink-0">
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
                    designationsList={designationsList}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main OrgStructurePage Component
// ─────────────────────────────────────────────────────────────────────────────
export function OrgStructurePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { employees, isLoading, refetch } = useEmployees({ pageSize: 1000 });
  const { designations = [] } = useDesignations();
  const [searchTerm, setSearchTerm] = useState("");
  const [pulsingEmpId, setPulsingEmpId] = useState<number | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isUpdatingManager, setIsUpdatingManager] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Hierarchy rules (configurable)
  const [hierarchyRules] = useState<HierarchyRule[]>(() => {
    try {
      const stored = localStorage.getItem("org_hierarchy_rules");
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_HIERARCHY_RULES;
  });

  // Invalid drop modal state
  const [invalidDropModal, setInvalidDropModal] = useState<{
    open: boolean;
    title?: string;
    message?: string;
  }>({ open: false });

  // Admin Setting: Export Chart Visibility for Employees
  const [isExportEnabledForEmployees, setIsExportEnabledForEmployees] =
    useState<boolean>(() => {
      const stored = localStorage.getItem("org_chart_export_employee_enabled");
      return stored !== null ? JSON.parse(stored) : true;
    });

  const userRole = (user as any)?.accessRole || (user as any)?.role || "";
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

  // Collapse State for nodes
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  // Reassignment Confirm Step State
  const [reassignConfirm, setReassignConfirm] = useState<{
    activeEmp: Employee;
    targetEmp: Employee;
    targetIsAdmin?: boolean;
    sameDept: boolean;
    activeEmpDept: string;
    targetEmpDept: string;
  } | null>(null);

  // Canvas Zoom & Pan Controls
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panPointer = useRef<{ id: number; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const exportTreeRef = useRef<HTMLDivElement>(null);

  // Active Dragged Employee for DragOverlay preview
  const [activeDragEmp, setActiveDragEmp] = useState<Employee | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const toggleCollapse = (id: number) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : false,
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const emp: Employee = event.active.data.current?.emp;
    if (emp) setActiveDragEmp(emp);
  };

  // ─── Phase 1+3: Wired validation on drag-end ───
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragEmp(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeEmp: Employee = active.data.current?.emp;
    const targetEmp: Employee = over.data.current?.emp;
    const targetIsAdmin: boolean = !!over.data.current?.isAdmin;

    if (!activeEmp || !targetEmp || activeEmp.id === targetEmp.id) return;

    const allEmps = localEmps || (employees as Employee[]) || [];

    // Run full validation via orgHierarchyEngine
    const validationResult = validateDragAndDrop(
      activeEmp,
      { emp: targetEmp, isAdmin: targetIsAdmin },
      hierarchyRules,
      allEmps,
    );

    if (!validationResult.isValid) {
      setInvalidDropModal({
        open: true,
        title: validationResult.errorTitle || "Invalid Move",
        message: validationResult.errorMessage || "This move violates the organization hierarchy.",
      });
      return;
    }

    // Phase 3 explicit: reject if target is Intern
    if (!targetIsAdmin && isIntern(targetEmp)) {
      setInvalidDropModal({
        open: true,
        title: "Cannot Drop Under an Intern",
        message: `${(targetEmp as any).firstName || "This person"} is an Intern — the final level in the hierarchy. Interns cannot have subordinates.`,
      });
      return;
    }

    // Compute department match info for Phase 4 enhanced popup
    const activeDept =
      (activeEmp as any).department ||
      (activeEmp as any).departmentName ||
      "";
    const targetDept =
      (targetEmp as any).department ||
      (targetEmp as any).departmentName ||
      "";

    const activeEmpDeptId =
      (activeEmp as any).currentDepartmentId ||
      (activeEmp as any).departmentId ||
      null;
    const targetEmpDeptId =
      (targetEmp as any).currentDepartmentId ||
      (targetEmp as any).departmentId ||
      null;

    let sameDept = false;
    if (targetIsAdmin) {
      sameDept = true; // Always allowed to drop under CEO/Admin
    } else if (activeEmpDeptId && targetEmpDeptId) {
      sameDept = String(activeEmpDeptId) === String(targetEmpDeptId);
    } else if (activeDept && targetDept) {
      sameDept = activeDept.toLowerCase().trim() === targetDept.toLowerCase().trim();
    } else {
      sameDept = true; // Can't determine, assume ok
    }

    setReassignConfirm({
      activeEmp,
      targetEmp,
      targetIsAdmin,
      sameDept,
      activeEmpDept: activeDept || "—",
      targetEmpDept: targetDept || "Executive Leadership",
    });
  };

  // Search: uncollapse ancestors, center zoom, pulse card
  const handleSearchSubmit = (term: string) => {
    if (!term.trim()) return;
    const lower = term.toLowerCase().trim();
    const activeList = localEmps || (employees as Employee[]) || [];

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

    const ancestors: number[] = [];
    let currId: number | null | undefined = matched.reportingManagerId;
    const empMap = new Map<number, Employee>();
    activeList.forEach((e) => { if (e.id) empMap.set(e.id, e); });

    const visited = new Set<number>();
    while (currId && empMap.has(currId) && !visited.has(currId)) {
      visited.add(currId);
      ancestors.push(currId);
      const mgr = empMap.get(currId);
      currId = mgr?.reportingManagerId;
    }
    ancestors.push(999999);

    setCollapsedMap((prev) => {
      const next = { ...prev };
      ancestors.forEach((id) => { next[id] = false; });
      return next;
    });

    setPulsingEmpId(matched.id);
    setTimeout(() => setPulsingEmpId(null), 3200);

    setTimeout(() => {
      const el = document.getElementById(`node-card-${matched.id}`);
      if (el && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const cardRect = el.getBoundingClientRect();
        const targetScale = 1.15;
        setScale(targetScale);
        const deltaX = (containerRect.left + containerRect.width / 2) - (cardRect.left + cardRect.width / 2);
        const deltaY = (containerRect.top + containerRect.height / 2) - (cardRect.top + cardRect.height / 2);
        setPan((prevPan) => ({ x: prevPan.x + deltaX, y: prevPan.y + deltaY }));
      }
    }, 150);

    toast.success(`Zoomed to ${matched.firstName} ${matched.lastName}`);
  };

  // Auto-focus for non-admin portals
  useEffect(() => {
    if (isAdminOrManager || !user?.employeeId || !(localEmps || employees)?.length) return;
    const currentEmployee = (localEmps || employees || []).find(
      (employee: any) => Number(employee.id) === Number(user.employeeId),
    );
    if (currentEmployee) {
      handleSearchSubmit(
        `${currentEmployee.firstName || ""} ${currentEmployee.lastName || ""}`.trim(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrManager, user?.employeeId, localEmps, employees]);

  // ─── Phase 2: Build Dynamic Hierarchy — Multiple CEO Support ───
  const treeData = useMemo(() => {
    const rawList = localEmps || (employees as Employee[]);
    if (!rawList || rawList.length === 0) return null;

    const getMgrId = (e: Employee): number | null => {
      const val = e.reportingManagerId ?? (e as any).reporting_manager_id;
      return val !== null && val !== undefined && val !== "" ? Number(val) : null;
    };

    const getCxoCategory = (e: Employee): "cfo" | "coo" | "cto" | "cxo" | null => {
      const role = ((e.accessRole || (e as any).role || "") as string).toLowerCase().trim();
      const desig = (e.designation || e.jobTitle || (e as any).designationName || "").toLowerCase().trim();
      if (role === "cfo" || desig === "cfo" || desig.includes("chief financial") || desig.includes("finance head")) return "cfo";
      if (role === "coo" || desig === "coo" || desig.includes("chief operating") || desig.includes("chief operations")) return "coo";
      if (role === "cto" || desig === "cto" || desig.includes("chief tech") || desig.includes("chief technology") || desig.includes("head of engineering")) return "cto";
      if (role === "cxo" || desig.startsWith("chief ") || desig.includes("c-level") || desig === "cmo" || desig === "cio" || desig === "cpo") return "cxo";
      return null;
    };

    const isCeoEmp = (e: any): boolean => {
      const isCeoFlag = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
      const role = ((e.accessRole || e.role || "") as string).toLowerCase().trim();
      const desig = (e.designation || e.jobTitle || (e as any).designationName || "").toLowerCase().trim();
      return isCeoFlag || role === "ceo" || desig === "ceo" || desig === "chief executive officer";
    };

    // ─── Role level derived from resolveRoleConfig tier (SAME as card badge) ───────
    // This ensures hierarchy validation matches exactly what the user sees on each card.
    // If badge shows 'Manager' on a card → level 3.
    // If badge shows 'Employee' on a card → level 6.
    // Rule: child.level MUST be >= parent.level
    //   Employee(6) under Manager(3) → 6≥3 ✓
    //   Manager(3) under Employee(6) → 3≥6 ✗ → violation → surfaces under CEO
    const TIER_LEVELS: Record<string, number> = {
      ceo: 1, board: 1,
      cxo: 2, cxo_cto: 2, cxo_cfo: 2, cxo_coo: 2,
      manager: 3,
      team_lead: 4,
      senior: 5,
      employee: 6,
      intern: 7,
    };
    const getRoleLevel = (e: any): number => {
      const cfg = resolveRoleConfig(e);
      return TIER_LEVELS[cfg.tier] ?? 6;
    };

    // Find ALL CEO employees (Phase 2: multiple CEO support)
    const ceoEmployees = rawList.filter(isCeoEmp);

    // Claimed IDs tracker — only CEO IDs at start
    const claimedEmpIds = new Set<number>();
    ceoEmployees.forEach((ceo) => { if (ceo.id) claimedEmpIds.add(ceo.id); });

    // Filter out all CEO profiles from lower list
    const activeList = rawList.filter((e: any) => !isCeoEmp(e));

    // ─── Role-aware child resolution (ONLY explicit reporting_manager_id) ──────
    // Children whose role level is LOWER (more senior) than their assigned parent
    // are REJECTED and will surface under CEO via remainingUnclaimed.
    // Example: empeight sharma (Manager, level 3) assigned under Rahul Shende (Employee, level 6)
    //   → childLevel 3 < parentLevel 6 → REJECTED → surfaces under CEO
    const findDirectChildren = (parentId: number, parentRoleLevel: number): Employee[] => {
      const results: Employee[] = [];
      activeList.forEach((emp) => {
        if (!emp.id || claimedEmpIds.has(emp.id) || getMgrId(emp) !== parentId) return;
        const childLevel = getRoleLevel(emp);
        if (childLevel >= parentRoleLevel) {
          // valid: child is same level or lower in hierarchy
          claimedEmpIds.add(emp.id);
          results.push(emp);
        }
        // else: hierarchy violation → leave unclaimed → CEO fallback
      });
      return results;
    };

    const buildSubTree = (emp: Employee): any => {
      const cat = getCxoCategory(emp);
      const isCxo = cat !== null;
      const empLevel = getRoleLevel(emp);
      const childEmps = emp.id ? findDirectChildren(emp.id, empLevel) : [];
      return { emp, isCxo, cxoType: cat, children: childEmps.map(buildSubTree) };
    };

    // If multiple CEOs → virtual "Board of Directors" root
    if (ceoEmployees.length > 1) {
      const BOARD_ROOT_ID = 999998;
      const boardRootEmp: Employee = {
        id: BOARD_ROOT_ID,
        firstName: "Board of",
        lastName: "Directors",
        email: user?.email || "board@company.com",
        employeeCode: "BOD-00",
        designation: "Executive Leadership Council",
        department: "Executive Leadership",
      };

      const ceoBranches = ceoEmployees.map((ceo) => {
        const ceoId = ceo.id!;
        const rootDirectEmps = activeList.filter((emp) => {
          const mgrId = getMgrId(emp);
          if (claimedEmpIds.has(emp.id!)) return false;
          if (!mgrId || mgrId === ceoId) return true;
          const managerExistsInList = activeList.some((other) => other.id === mgrId);
          return !managerExistsInList;
        });
        rootDirectEmps.forEach((emp) => { if (emp.id && !claimedEmpIds.has(emp.id)) claimedEmpIds.add(emp.id); });
        const rootChildren = rootDirectEmps.map(buildSubTree);
        const remainingUnclaimed = activeList.filter((emp) => emp.id && !claimedEmpIds.has(emp.id));
        remainingUnclaimed.forEach((emp) => { if (emp.id) claimedEmpIds.add(emp.id); });
        const fallbackChildren = remainingUnclaimed.map(buildSubTree);
        return { emp: ceo, isAdmin: true, isCeo: true, children: [...rootChildren, ...fallbackChildren] };
      });

      return {
        emp: boardRootEmp,
        isAdmin: false,
        isBoardRoot: true,
        isCeo: false,
        children: ceoBranches,
      };
    }

    // Single CEO path (original behavior preserved)
    const ceoEmployee = ceoEmployees[0];
    const ceoId = ceoEmployee?.id || 999999;
    const adminName = ceoEmployee
      ? `${ceoEmployee.firstName || ""} ${ceoEmployee.lastName || ""}`.trim() || "Chief Executive Officer"
      : user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "Chief Executive Officer";
    const adminEmail = ceoEmployee?.email || user?.email || "ceo@apponext.com";

    const rootCeoEmp: Employee = {
      id: ceoId,
      firstName: adminName,
      lastName: "",
      email: adminEmail,
      employeeCode: ceoEmployee?.employeeCode || "CEO-01",
      designation: "CHIEF EXECUTIVE OFFICER (CEO)",
      department: ceoEmployee?.department || "Executive Leadership",
      avatarUrl: (ceoEmployee as any)?.avatarUrl,
    };

    // Employees are direct reports of CEO when:
    // 1. They have no reporting_manager_id set
    // 2. Their reporting_manager_id points to the CEO
    // 3. Their reporting_manager_id points to someone not in the active list (e.g. external/deleted mgr)
    const rootDirectEmps = activeList.filter((emp) => {
      const mgrId = getMgrId(emp);
      if (claimedEmpIds.has(emp.id!)) return false;
      if (!mgrId || mgrId === ceoId || mgrId === 999999) return true;
      // If their manager is not in the list, surface them under CEO
      const managerExistsInList = activeList.some((other) => other.id === mgrId);
      return !managerExistsInList;
    });

    // Claim root-level employees before recursing
    rootDirectEmps.forEach((emp) => { if (emp.id) claimedEmpIds.add(emp.id); });
    const rootChildren = rootDirectEmps.map(buildSubTree);

    // Safety net: any employee still unclaimed (shouldn't happen with above) → under CEO
    const remainingUnclaimed = activeList.filter((emp) => emp.id && !claimedEmpIds.has(emp.id));
    remainingUnclaimed.forEach((emp) => { if (emp.id) claimedEmpIds.add(emp.id); });
    const fallbackChildren = remainingUnclaimed.map(buildSubTree);

    return { emp: rootCeoEmp, isAdmin: true, isCeo: true, children: [...rootChildren, ...fallbackChildren] };
  }, [localEmps, employees, user]);

  // Search Highlight
  const highlightIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<number>();
    const term = searchTerm.toLowerCase();
    const activeList = localEmps || (employees as Employee[]);
    return new Set<number>(
      activeList
        .filter((e) =>
          [e.firstName, e.lastName, e.email, e.designation, e.department]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
        .map((e) => e.id!),
    );
  }, [searchTerm, localEmps, employees]);

  const handleZoomIn = () => setScale((s) => Math.min(parseFloat((s + 0.15).toFixed(2)), 2.0));
  const handleZoomOut = () => setScale((s) => Math.max(parseFloat((s - 0.15).toFixed(2)), 0.3));
  const handleResetZoom = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // Native non-passive wheel listener: Zooms ONLY the org chart canvas block and prevents whole browser page zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setScale((prevScale) => {
        const nextScale = Math.min(Math.max(0.3, prevScale + delta), 2.0);
        return parseFloat(nextScale.toFixed(2));
      });
    };

    container.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheelNative);
    };
  }, []);

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
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
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

  const handleManagerChange = async (newManagerId: string) => {
    if (!selectedEmp?.id) return;
    setIsUpdatingManager(true);
    const parsedId = newManagerId ? parseInt(newManagerId, 10) : null;
    const previousEmps = localEmps;

    if (localEmps) {
      setLocalEmps(
        localEmps.map((emp) =>
          emp.id === selectedEmp.id ? { ...emp, reportingManagerId: parsedId } : emp,
        ),
      );
    }

    try {
      await apiClient.patch(`/employees/${selectedEmp.id}`, { reportingManagerId: parsedId });
      const targetMgr = ((employees as Employee[]) || []).find((e) => e.id === parsedId);
      toast.success(
        targetMgr
          ? `Assigned ${selectedEmp.firstName} to report under ${targetMgr.firstName} ${targetMgr.lastName}`
          : `Assigned ${selectedEmp.firstName} as direct report to CEO`,
      );
      setSelectedEmp(null);
      refetch();
    } catch (err: any) {
      setLocalEmps(previousEmps);
      toast.error(err?.response?.data?.message || "Failed to update reporting manager");
    } finally {
      setIsUpdatingManager(false);
    }
  };

  const handleExportPNG = async () => {
    if (!exportTreeRef.current) return;
    try {
      toast.info("Generating high-resolution PNG of entire org structure...");
      const prevScale = scale;
      const prevPan = pan;
      setScale(1);
      setPan({ x: 0, y: 0 });
      await new Promise((r) => setTimeout(r, 120));
      const targetEl = exportTreeRef.current;
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: targetEl.scrollWidth + 40,
        height: targetEl.scrollHeight + 40,
      });
      setScale(prevScale);
      setPan(prevPan);
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
    if (!exportTreeRef.current) return;
    try {
      toast.info("Preparing PDF document of entire org structure...");
      const prevScale = scale;
      const prevPan = pan;
      setScale(1);
      setPan({ x: 0, y: 0 });
      await new Promise((r) => setTimeout(r, 120));
      const targetEl = exportTreeRef.current;
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: targetEl.scrollWidth + 40,
        height: targetEl.scrollHeight + 40,
      });
      setScale(prevScale);
      setPan(prevPan);
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
                @page { size: A4 landscape; margin: 10mm; }
                body { margin: 0; padding: 15px; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #ffffff; text-align: center; }
                .header { margin-bottom: 15px; }
                .header h2 { margin: 0; font-size: 20px; color: #0B2545; }
                .header p { margin: 4px 0 0; font-size: 12px; color: #5B7089; }
                .img-container { width: 100%; display: flex; justify-content: center; }
                img { max-width: 100%; height: auto; border: 1px solid #D5E3F2; border-radius: 12px; }
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
            <p className="mt-1 text-xs text-muted-foreground">
              Explore reporting lines · Drag-and-drop to reassign (same department only)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-1">
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
                  <Button size="sm" variant="outline" className={`h-9 text-xs font-semibold gap-1.5 px-3 ${BTN_OUTLINE}`}>
                    <Download className="w-3.5 h-3.5 text-primary" />
                    Export chart
                    <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="org-font w-44 bg-card text-foreground border border-border rounded-xl shadow-lg">
                  <DropdownMenuItem onClick={handleExportPNG} className="text-xs gap-2 cursor-pointer font-medium focus:bg-primary/10 focus:text-foreground">
                    <Image className="w-3.5 h-3.5 text-primary" />
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="text-xs gap-2 cursor-pointer font-medium focus:bg-primary/10 focus:text-foreground">
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

        {/* ─── Search bar ─── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <form
            className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-md"
            onSubmit={(event) => { event.preventDefault(); handleSearchSubmit(searchTerm); }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search employee by name, dept, or email…"
                aria-label="Search employee"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9 border-border bg-background pl-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" className={`h-9 px-4 text-xs font-semibold ${BTN_PRIMARY}`}>Find</Button>
          </form>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> CEO/CXO</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/60 inline-block border border-blue-400/50" /> Manager</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500/60 inline-block border border-teal-400/50" /> Team Lead</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-300/60 inline-block border border-orange-300/50" /> Intern</span>
          </div>

          <span className="text-xs text-muted-foreground hidden md:block">Drag background to pan · Ctrl+scroll to zoom</span>
        </div>

        {/* ─── Tree canvas with @dnd-kit DndContext ─── */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={containerRef}
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerCancel={handlePanEnd}
            onLostPointerCapture={handlePanEnd}
            className={`relative min-h-[600px] flex-1 select-none overflow-hidden rounded-xl border border-border bg-card shadow-sm touch-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          >
            {/* Dot grid bg */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: DOT_GRID, backgroundSize: "24px 24px", opacity: 0.3 }}
            />

            {/* Edge pan controls */}
            <button type="button" onClick={() => setPan((p) => ({ ...p, y: p.y + 140 }))}
              className={`${panBtn} top-0 left-1/2 -translate-x-1/2 w-28 h-6 rounded-b-lg border-t-0`}
              title="Pan Up" aria-label="Pan up">
              <ChevronUp className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => setPan((p) => ({ ...p, y: p.y - 140 }))}
              className={`${panBtn} bottom-0 left-1/2 -translate-x-1/2 w-28 h-6 rounded-t-lg border-b-0`}
              title="Pan Down" aria-label="Pan down">
              <ChevronDown className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => setPan((p) => ({ ...p, x: p.x + 180 }))}
              className={`${panBtn} left-0 top-1/2 -translate-y-1/2 w-6 h-28 rounded-r-lg border-l-0`}
              title="Pan Left" aria-label="Pan left">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => setPan((p) => ({ ...p, x: p.x - 180 }))}
              className={`${panBtn} right-0 top-1/2 -translate-y-1/2 w-6 h-28 rounded-l-lg border-r-0`}
              title="Pan Right" aria-label="Pan right">
              <ChevronRight className="w-5 h-5" />
            </button>

            {isLoading ? (
              <div className="relative flex flex-col items-center justify-center h-64 space-y-2">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">Building organization hierarchy…</p>
              </div>
            ) : !treeData ? (
              <div className="relative flex flex-col items-center justify-center h-64 text-center space-y-3">
                <Users className="w-10 h-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold text-foreground">No employees found</p>
                  <p className="text-xs text-muted-foreground">Add staff to populate the hierarchy chart.</p>
                </div>
                <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className={`h-8 text-xs font-semibold gap-1.5 ${BTN_PRIMARY}`}>
                  <UserPlus className="w-3.5 h-3.5" /> Add first employee
                </Button>
              </div>
            ) : (
              <div
                className="relative w-full h-full flex justify-center pt-14 pb-20 transition-transform duration-75 origin-top"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
              >
                <div
                  ref={exportTreeRef}
                  className="w-fit min-w-full flex justify-center p-6 bg-card text-foreground rounded-xl"
                >
                  <TreeBranch
                    node={treeData}
                    highlight={highlightIds}
                    pulsingEmpId={pulsingEmpId}
                    collapsedMap={collapsedMap}
                    onToggleCollapse={toggleCollapse}
                    onSelectEmp={(e) => {
                      if (e.id === 999999 || e.id === 999998) return;
                      setSelectedEmp(e);
                    }}
                    designationsList={designations}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drag overlay preview */}
          <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeDragEmp ? (
              <div className="org-font flex flex-col items-center bg-card border-2 border-primary ring-4 ring-primary/20 rounded-2xl px-3 py-3 w-[176px] min-h-[108px] shadow-2xl cursor-grabbing pointer-events-none z-50">
                <Avatar className="h-9 w-9 rounded-full mb-1.5 border border-border">
                  <AvatarImage src={(activeDragEmp as any).avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                    {activeDragEmp.firstName?.[0]}
                    {activeDragEmp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full text-[12px] font-bold text-foreground text-center truncate">
                  {activeDragEmp.firstName} {activeDragEmp.lastName}
                </div>
                <div className="text-[11px] font-semibold text-primary mt-0.5 flex items-center gap-1">
                  <MoveRight className="w-3 h-3" /> Drop to reassign
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* ─── Invalid Drop Modal (Phase 1+3) ─── */}
        <InvalidDropModal
          open={invalidDropModal.open}
          onClose={() => setInvalidDropModal({ open: false })}
          title={invalidDropModal.title}
          message={invalidDropModal.message}
        />

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
                  Configure hierarchy chart visibility and export options.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between gap-4 p-3.5 bg-muted/50 border border-border rounded-xl">
                  <div className="space-y-0.5 max-w-[280px]">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      Allow employee chart export
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Show or hide the PNG and PDF export options for employee logins.
                    </p>
                  </div>
                  <Switch
                    checked={isExportEnabledForEmployees}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    onCheckedChange={(val) => {
                      setIsExportEnabledForEmployees(val);
                      localStorage.setItem("org_chart_export_employee_enabled", JSON.stringify(val));
                      toast.success(val ? "Chart export is now visible for employees." : "Chart export is now hidden for employees.");
                    }}
                  />
                </div>

                {/* Hierarchy rules info */}
                <div className="p-3.5 bg-muted/50 border border-border rounded-xl space-y-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Active Hierarchy Rules
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Drag-and-drop is validated against {hierarchyRules.length} configurable rules.
                    Same-department enforcement is active — employees can only be reassigned within their department.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <Button size="sm" className={`h-8 text-xs font-semibold px-4 ${BTN_PRIMARY}`} onClick={() => setIsSettingsModalOpen(false)}>
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── Phase 4: Enhanced Reassign Confirmation Dialog ─── */}
        {reassignConfirm && (
          <Dialog open onOpenChange={() => setReassignConfirm(null)}>
            <DialogContent className={`${DIALOG_SURFACE} sm:max-w-lg`}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <MoveRight className="w-5 h-5 text-primary" />
                  Confirm Reporting Reassignment
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Review the move details below and confirm to update the reporting hierarchy.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1">
                {/* Department match indicator */}
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                  reassignConfirm.sameDept
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/60 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-50 dark:bg-amber-900/20 border-amber-300/60 text-amber-700 dark:text-amber-400"
                }`}>
                  {reassignConfirm.sameDept ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {reassignConfirm.sameDept
                      ? "Same department — move is within department boundaries ✓"
                      : `Cross-department move: ${reassignConfirm.activeEmpDept} → ${reassignConfirm.targetEmpDept}`}
                  </span>
                </div>

                {/* Move summary card */}
                <div className="bg-muted/50 p-3.5 rounded-xl border border-border text-xs space-y-3">
                  {/* Employee being moved */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-full border border-border shrink-0">
                      <AvatarImage src={(reassignConfirm.activeEmp as any)?.avatarUrl || undefined} />
                      <AvatarFallback className={`text-xs font-bold ${avatarTone(reassignConfirm.activeEmp.id)}`}>
                        {reassignConfirm.activeEmp.firstName?.[0]}{reassignConfirm.activeEmp.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-foreground text-sm truncate">
                        {reassignConfirm.activeEmp.firstName} {reassignConfirm.activeEmp.lastName}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {resolveDesignation(reassignConfirm.activeEmp, designations)} · {reassignConfirm.activeEmpDept}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-blue-50 dark:bg-blue-900/30 border-blue-300/50 text-blue-600 dark:text-blue-400">
                      Moving
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex-1 h-px bg-border" />
                    <MoveRight className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* New manager */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-full border border-border shrink-0">
                      <AvatarImage src={(reassignConfirm.targetEmp as any)?.avatarUrl || undefined} />
                      <AvatarFallback className={`text-xs font-bold ${reassignConfirm.targetIsAdmin ? "bg-slate-700 text-amber-300" : avatarTone(reassignConfirm.targetEmp.id)}`}>
                        {reassignConfirm.targetIsAdmin ? <Crown className="w-4 h-4" /> : `${reassignConfirm.targetEmp.firstName?.[0]}${reassignConfirm.targetEmp.lastName?.[0]}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-foreground text-sm truncate">
                        {reassignConfirm.targetIsAdmin
                          ? "Organization Admin / Executive Management"
                          : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}`}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {reassignConfirm.targetIsAdmin
                          ? "Chief Executive Officer · Executive Leadership"
                          : `${resolveDesignation(reassignConfirm.targetEmp, designations)} · ${reassignConfirm.targetEmpDept}`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300/50 text-emerald-600 dark:text-emerald-400">
                      New Manager
                    </Badge>
                  </div>
                </div>

                {/* What will happen summary */}
                <div className="p-3 rounded-xl border border-border bg-primary/5 text-[11px] text-muted-foreground space-y-1.5">
                  <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    What will happen:
                  </div>
                  <ul className="space-y-1 pl-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>{reassignConfirm.activeEmp.firstName}</strong>'s reporting manager will change to <strong>{reassignConfirm.targetIsAdmin ? "Organization Admin" : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}`}</strong></span>
                    </li>
                    {!reassignConfirm.sameDept && (
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span className="text-amber-700 dark:text-amber-400">Department will be updated from <strong>{reassignConfirm.activeEmpDept}</strong> to <strong>{reassignConfirm.targetEmpDept}</strong></span>
                      </li>
                    )}
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>All sub-reports under {reassignConfirm.activeEmp.firstName} will remain unchanged</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs font-semibold gap-1.5 ${BTN_OUTLINE}`}
                  onClick={() => setReassignConfirm(null)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={`h-8 text-xs font-semibold gap-1.5 ${BTN_PRIMARY}`}
                  onClick={async () => {
                    const activeEmpId = reassignConfirm.activeEmp.id;
                    const targetManagerId = reassignConfirm.targetIsAdmin ? null : reassignConfirm.targetEmp.id;
                    const targetDeptId = reassignConfirm.targetIsAdmin
                      ? null
                      : (reassignConfirm.targetEmp.currentDepartmentId || (reassignConfirm.targetEmp as any).departmentId || null);

                    const previousLocalEmps = localEmps;
                    const confirmState = reassignConfirm;
                    setReassignConfirm(null);

                    if (!activeEmpId) return;

                    // Optimistic update
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
                                : confirmState.targetEmp.department || emp.department,
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
                      setLocalEmps(previousLocalEmps);
                      const msg =
                        err?.response?.data?.error?.details?.message ||
                        err?.response?.data?.message ||
                        "Failed to reassign employee";
                      toast.error(msg);
                    }
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Move
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── Employee detail dialog (unchanged behavior) ─── */}
        {selectedEmp && (
          <Dialog open onOpenChange={() => setSelectedEmp(null)}>
            <DialogContent className={DIALOG_SURFACE}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={(selectedEmp as any)?.avatarUrl || undefined} />
                    <AvatarFallback className={`text-sm font-bold ${avatarTone(selectedEmp.id)}`}>
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
                        const cfg = resolveRoleConfig(selectedEmp);
                        const Icon = cfg.Icon;
                        return (
                          <Badge variant="outline" className={`text-[11px] font-semibold py-0 ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        );
                      })()}
                      <span className="text-xs font-medium text-muted-foreground">{selectedEmp.employeeCode}</span>
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Reporting hierarchy and manager assignment
                </DialogDescription>
              </DialogHeader>

              {/* Direct reporting manager */}
              {(() => {
                const allEmpsList = localEmps || (employees as Employee[]) || [];
                const mgrId = selectedEmp.reportingManagerId ?? (selectedEmp as any).reporting_manager_id;
                const currentMgr = mgrId ? allEmpsList.find((e) => Number(e.id) === Number(mgrId)) : null;
                const ceoEmp = allEmpsList.find((e: any) => {
                  const isCeo = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
                  const desig = (e.designation || e.jobTitle || "").toLowerCase();
                  return isCeo || desig.includes("ceo") || desig.includes("chief executive");
                });
                const isSelectedEmpCeo = selectedEmp.id === ceoEmp?.id || (selectedEmp as any).isCeo || (selectedEmp as any).is_ceo;
                const fallbackManagerName = (selectedEmp as any).reportingManager || (selectedEmp as any).reporting_manager_name;

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
                        <AvatarImage src={(currentMgr as any)?.avatarUrl || undefined} />
                        <AvatarFallback className={`text-xs font-bold ${avatarTone(currentMgr?.id || 1)}`}>
                          {currentMgr
                            ? `${currentMgr.firstName?.[0] || ""}${currentMgr.lastName?.[0] || ""}`
                            : isSelectedEmpCeo
                              ? <ShieldCheck className="w-4 h-4" />
                              : ceoEmp
                                ? `${ceoEmp.firstName?.[0] || ""}${ceoEmp.lastName?.[0] || ""}`
                                : <Crown className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                          {isSelectedEmpCeo ? (
                            <span>Board of Directors / Shareholders</span>
                          ) : currentMgr ? (
                            <span>{currentMgr.firstName} {currentMgr.lastName}</span>
                          ) : fallbackManagerName ? (
                            <span>{fallbackManagerName}</span>
                          ) : ceoEmp ? (
                            <span className="flex items-center gap-1.5">
                              {ceoEmp.firstName} {ceoEmp.lastName}
                              <Badge variant="outline" className="text-[10px] font-bold py-0 px-1.5 bg-foreground text-background border-foreground">CEO</Badge>
                            </span>
                          ) : (
                            <span className="text-primary font-bold flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 inline" /> Direct report to CEO
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                          {isSelectedEmpCeo ? (
                            <span>Corporate Executive Governance</span>
                          ) : currentMgr ? (
                            <span>
                              {resolveDesignation(currentMgr, designations)}
                              {currentMgr.department ? ` · ${currentMgr.department}` : ""}
                            </span>
                          ) : ceoEmp ? (
                            <span>Chief Executive Officer · Executive Leadership</span>
                          ) : (
                            <span>Top-level Executive Organization</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Intern warning */}
              {isIntern(selectedEmp) && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-orange-300/60 bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-700 dark:text-orange-400">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This employee is an <strong>Intern</strong> — the final level in the hierarchy. No employees can be assigned to report under them.</span>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs bg-muted/50 p-3.5 rounded-xl border border-border">
                {[
                  ["Department", selectedEmp.department || "—"],
                  ["Designation", resolveDesignation(selectedEmp, designations)],
                  ["Email", selectedEmp.email],
                  ["Mobile", selectedEmp.mobile || selectedEmp.phone || "—"],
                  ["Joined", selectedEmp.dateOfJoining ? new Date(selectedEmp.dateOfJoining).toLocaleDateString() : "—"],
                  ["Employment", selectedEmp.employmentType?.replace("_", " ") || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground block">{label}</span>
                    <span title={value} className={`font-bold block truncate text-xs text-foreground ${label === "Employment" ? "capitalize" : ""}`}>
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
                  onClick={() => { navigate(`/employees/${selectedEmp.id}`); setSelectedEmp(null); }}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" /> View profile
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
