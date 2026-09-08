import { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { EmployeeCreateModal } from '@/features/employee/components/EmployeeCreateModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Grab,
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Role configuration & badge styling
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string; Icon: React.ElementType }
> = {
  ceo: {
    label: 'CEO',
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-300',
    Icon: Crown,
  },
  cfo: {
    label: 'CFO',
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    Icon: ShieldCheck,
  },
  coo: {
    label: 'COO',
    bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/40',
    text: 'text-blue-700 dark:text-blue-300',
    Icon: Briefcase,
  },
  cto: {
    label: 'CTO',
    bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    Icon: Zap,
  },
  cxo: {
    label: 'Executive (CXO)',
    bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/40',
    text: 'text-purple-700 dark:text-purple-300',
    Icon: Crown,
  },
  hr_manager: {
    label: 'HR Manager',
    bg: 'bg-primary/10 text-primary',
    border: 'border-primary/30',
    text: 'text-primary',
    Icon: ShieldCheck,
  },
  department_head: {
    label: 'Dept Manager',
    bg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    border: 'border-violet-500/30',
    text: 'text-violet-700 dark:text-violet-300',
    Icon: Crown,
  },
  team_lead: {
    label: 'Team Lead',
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-300',
    Icon: UserCheck,
  },
  employee: {
    label: 'Employee',
    bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    text: 'text-slate-700 dark:text-slate-300',
    Icon: Briefcase,
  },
};

function roleCfg(role?: string, designation?: string) {
  const r = (role || '').toLowerCase().trim();
  const d = (designation || '').toLowerCase().trim();

  if (r === 'ceo' || d === 'ceo' || d.includes('chief executive')) return ROLE_CONFIG.ceo;
  if (r === 'cfo' || d === 'cfo' || d.includes('chief financial') || d.includes('finance head') || d.includes('director of finance')) return ROLE_CONFIG.cfo;
  if (r === 'coo' || d === 'coo' || d.includes('chief operating') || d.includes('chief operations') || d.includes('operations head')) return ROLE_CONFIG.coo;
  if (r === 'cto' || d === 'cto' || d.includes('chief tech') || d.includes('chief technology') || d.includes('tech head') || d.includes('head of engineering')) return ROLE_CONFIG.cto;
  if (r === 'cxo' || d.startsWith('chief ') || d.includes('c-level')) return ROLE_CONFIG.cxo;
  if (r === 'hr_manager' || r === 'hr_admin' || r === 'support') return ROLE_CONFIG.hr_manager;
  if (r === 'department_head' || r === 'manager') return ROLE_CONFIG.department_head;
  if (r === 'team_lead') return ROLE_CONFIG.team_lead;
  return ROLE_CONFIG.employee;
}

const AVATAR_GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-indigo-500 to-cyan-600',
];
function avatarGrad(id?: number) {
  return AVATAR_GRADIENTS[(id || 0) % AVATAR_GRADIENTS.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Concise Minimalist Tree Node Component with @dnd-kit Draggable / Droppable & Pulsing
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
  deptName?: string;
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
  deptName,
}: ReferenceNodeProps) {
  const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ');
  const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
  const grad = avatarGrad(emp.id);
  const designation = emp.designation || emp.jobTitle || (isAdmin ? 'Admin' : 'Employee');

  const isDeptHeadOrHR = ['department_head', 'hr_manager'].includes((emp as any).accessRole || '');
  const isDragDisabled = isAdmin || isDeptHeadOrHR;

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: String(emp.id),
    disabled: isDragDisabled,
    data: { emp, isAdmin },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: String(emp.id),
    data: { emp, isAdmin },
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

  return (
    <div className="relative flex flex-col items-center shrink-0">
      {/* Department Badge directly above manager node */}
      {deptName && (
        <div className="flex flex-col items-center mb-1 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-bold text-[9.5px] shadow-2xs">
            <Building2 className="w-2.5 h-2.5 text-primary" />
            <span>{deptName}</span>
          </div>
          <div className="w-0.5 h-2 bg-border" />
        </div>
      )}

      {/* Drop Target Indicator Badge when dragging over */}
      {isOver && !isDragging && (
        <div className="absolute -top-3.5 z-50 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] shadow-lg animate-bounce">
          <span>Drop to Reassign Here</span>
        </div>
      )}

      {/* Concise Minimalist Node Card */}
      <div
        id={`node-card-${emp.id}`}
        ref={setCombinedRef}
        {...listeners}
        {...attributes}
        style={style}
        onClick={onClick}
        title={
          isAdmin
            ? 'Organization Admin'
            : isDeptHeadOrHR
            ? 'Department Heads and HR Managers report directly to Organization Admin.'
            : 'Drag node onto a manager to reassign reporting manager'
        }
        className={`group relative flex flex-col items-center bg-card border shadow-xs rounded-xl p-2.5
          w-[155px] min-h-[92px] transition-all duration-200 cursor-grab active:cursor-grabbing select-none
          ${
            isPulsing
              ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-400/25 scale-110 shadow-xl animate-pulse z-40'
              : isDragging
              ? 'opacity-35 ring-2 ring-primary/40 border-dashed border-primary bg-primary/5'
              : isOver
              ? 'ring-4 ring-emerald-500/80 border-emerald-500 bg-emerald-500/10 scale-105 shadow-xl z-40'
              : highlight
              ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
              : isAdmin
              ? 'border-primary/60 bg-primary/5'
              : 'border-border/80 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
          }`}
      >
        {/* Top Avatar Icon */}
        <div className="relative mb-1">
          <Avatar className={`h-8 w-8 rounded-full border border-border/60 shadow-xs bg-gradient-to-br ${grad}`}>
            <AvatarImage src={(emp as any).avatarUrl || undefined} alt={name} />
            <AvatarFallback className={`bg-gradient-to-br ${grad} text-white text-[9.5px] font-extrabold`}>
              {initials || <User className="w-3.5 h-3.5 text-white" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Minimal Name Pill */}
        <div className="w-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full text-center truncate shadow-2xs transition-colors">
          {name}
        </div>

        {/* Designation Subtitle */}
        <div className="text-[8.5px] font-semibold text-muted-foreground uppercase tracking-wider text-center truncate w-full mt-1">
          {designation}
        </div>

        {/* Circular Toggle Button (+ / -) */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center text-foreground font-bold shadow-2xs hover:scale-110 transition-transform"
            title={isCollapsed ? 'Expand Children' : 'Collapse Children'}
          >
            {isCollapsed ? <Plus className="w-2.5 h-2.5 text-primary" /> : <Minus className="w-2.5 h-2.5 text-muted-foreground" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree Branch Recursive Component with Crisp Minimal Lines
// ─────────────────────────────────────────────────────────────────────────────
interface TreeBranchProps {
  node: any;
  highlight: Set<number>;
  pulsingEmpId?: number | null;
  collapsedMap: Record<number, boolean>;
  onToggleCollapse: (id: number) => void;
  onSelectEmp: (e: Employee) => void;
  isLevel1Manager?: boolean;
}

function TreeBranch({
  node,
  highlight,
  pulsingEmpId,
  collapsedMap,
  onToggleCollapse,
  onSelectEmp,
  isLevel1Manager = false,
}: TreeBranchProps) {
  const isCollapsed = collapsedMap[node.emp.id] ?? false;
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const deptName = node.isAdmin
    ? 'Executive Leadership'
    : node.isCxo
    ? `C-Suite · ${(node.cxoType || 'CXO').toUpperCase()}`
    : isLevel1Manager
    ? (node.emp.department || 'Department')
    : undefined;

  return (
    <div className="flex flex-col items-center shrink-0">
      {/* Node Card */}
      <ReferenceNode
        emp={node.emp}
        highlight={highlight.has(node.emp.id)}
        isPulsing={pulsingEmpId === node.emp.id}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleExpand={() => onToggleCollapse(node.emp.id)}
        onClick={() => onSelectEmp(node.emp)}
        isAdmin={node.isAdmin}
        deptName={deptName}
      />

      {/* Children Branches with Crisp Minimal Line Connectors */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center pt-2.5">
          {/* Vertical Stem down from parent toggle button */}
          <div className="w-px h-5 bg-border shrink-0" />

          {/* Horizontal Branch Line connecting children */}
          {children.length > 1 && (
            <div className="relative flex justify-center w-full">
              <div className="h-px bg-border w-full" />
            </div>
          )}

          {/* Children Array Render */}
          <div className="flex gap-5 items-start justify-center pt-0">
            {children.map((childNode: any) => (
              <div key={childNode.emp.id} className="flex flex-col items-center shrink-0">
                {children.length > 1 && <div className="w-px h-3.5 bg-border shrink-0" />}
                <TreeBranch
                  node={childNode}
                  highlight={highlight}
                  pulsingEmpId={pulsingEmpId}
                  collapsedMap={collapsedMap}
                  onToggleCollapse={onToggleCollapse}
                  onSelectEmp={onSelectEmp}
                  isLevel1Manager={node.isAdmin || node.isCxo}
                />
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
  const [searchTerm, setSearchTerm] = useState('');
  const [pulsingEmpId, setPulsingEmpId] = useState<number | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isUpdatingManager, setIsUpdatingManager] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Admin Setting: Export Chart Visibility for Employees
  const [isExportEnabledForEmployees, setIsExportEnabledForEmployees] = useState<boolean>(() => {
    const stored = localStorage.getItem('org_chart_export_employee_enabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const userRole = (user as any)?.accessRole || (user as any)?.role || '';
  const isAdminOrManager = ['hr_admin', 'hr_manager', 'department_head', 'super_admin', 'platform_admin'].includes(userRole);
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
  } | null>(null);

  // Canvas Zoom & Pan Controls
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const exportTreeRef = useRef<HTMLDivElement>(null);


  // Active Dragged Employee for smooth DragOverlay preview
  const [activeDragEmp, setActiveDragEmp] = useState<Employee | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const toggleCollapse = (id: number) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: prev[id] !== undefined ? !prev[id] : false }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const emp: Employee = event.active.data.current?.emp;
    if (emp) setActiveDragEmp(emp);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragEmp(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeEmp: Employee = active.data.current?.emp;
    const targetEmp: Employee = over.data.current?.emp;
    const targetIsAdmin: boolean = !!over.data.current?.isAdmin;

    if (!activeEmp || !targetEmp || activeEmp.id === targetEmp.id) return;

    setReassignConfirm({ activeEmp, targetEmp, targetIsAdmin });
  };

  // Search Submit: Uncollapse ancestors, center zoom, & pulse card for 3 seconds
  const handleSearchSubmit = (term: string) => {
    if (!term.trim()) return;
    const lower = term.toLowerCase().trim();
    const activeList = localEmps || (employees as Employee[]) || [];

    const matched = activeList.find((e) =>
      [e.firstName, e.lastName, e.email, e.designation, e.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(lower)
    );

    if (!matched || !matched.id) {
      toast.error(`No employee matching "${term}" found.`);
      return;
    }

    // 1. Uncollapse ancestors up to root
    const ancestors: number[] = [];
    let currId: number | null | undefined = matched.reportingManagerId;
    const empMap = new Map<number, Employee>();
    activeList.forEach((e) => {
      if (e.id) empMap.set(e.id, e);
    });

    const visited = new Set<number>();
    while (currId && empMap.has(currId) && !visited.has(currId)) {
      visited.add(currId);
      ancestors.push(currId);
      const mgr = empMap.get(currId);
      currId = mgr?.reportingManagerId;
    }

    // Always uncollapse Root Admin (999999)
    ancestors.push(999999);

    setCollapsedMap((prev) => {
      const next = { ...prev };
      ancestors.forEach((id) => {
        next[id] = false;
      });
      return next;
    });

    // 2. Pulse card for 3 seconds
    setPulsingEmpId(matched.id);
    setTimeout(() => setPulsingEmpId(null), 3200);

    // 3. Center Zoom onto target card
    setTimeout(() => {
      const el = document.getElementById(`node-card-${matched.id}`);
      if (el && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const cardRect = el.getBoundingClientRect();

        const targetScale = 1.15;
        setScale(targetScale);

        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const containerCenterX = containerRect.left + containerRect.width / 2;
        const containerCenterY = containerRect.top + containerRect.height / 2;

        const deltaX = containerCenterX - cardCenterX;
        const deltaY = containerCenterY - cardCenterY;

        setPan((prevPan) => ({
          x: prevPan.x + deltaX,
          y: prevPan.y + deltaY,
        }));
      }
    }, 150);

    toast.success(`Zoomed to ${matched.firstName} ${matched.lastName}`);
  };

  // Build Dynamic Hierarchy Tree Structure from Database
  const treeData = useMemo(() => {
    const rawList = localEmps || (employees as Employee[]);
    if (!rawList || rawList.length === 0) return null;

    // Helper to get department name
    const getDeptKey = (e: Employee): string =>
      e.department || (e as any).departmentName || (e as any).department_name || 'General';

    // Helper to get department ID
    const getDeptId = (e: Employee): number | null =>
      e.currentDepartmentId ?? (e as any).departmentId ?? (e as any).current_department_id ?? null;

    // Helper to get reporting manager ID safely from database record
    const getMgrId = (e: Employee): number | null => {
      const val = e.reportingManagerId ?? (e as any).reporting_manager_id;
      return val !== null && val !== undefined && val !== '' ? Number(val) : null;
    };

    // Helper to categorize CXO type
    const getCxoCategory = (e: Employee): 'cfo' | 'coo' | 'cto' | 'cxo' | null => {
      const role = ((e.accessRole || (e as any).role || '') as string).toLowerCase().trim();
      const desig = (e.designation || e.jobTitle || (e as any).designationName || (e as any).designation_name || '').toLowerCase().trim();

      if (role === 'cfo' || desig === 'cfo' || desig.includes('chief financial') || desig.includes('finance head') || desig.includes('director of finance')) {
        return 'cfo';
      }
      if (role === 'coo' || desig === 'coo' || desig.includes('chief operating') || desig.includes('chief operations') || desig.includes('operations head') || desig.includes('director of operations')) {
        return 'coo';
      }
      if (role === 'cto' || desig === 'cto' || desig.includes('chief tech') || desig.includes('chief technology') || desig.includes('tech head') || desig.includes('head of engineering') || desig.includes('director of engineering')) {
        return 'cto';
      }
      if (role === 'cxo' || desig.startsWith('chief ') || desig.includes('c-level') || desig === 'cmo' || desig === 'cio' || desig === 'cpo' || desig === 'cro' || desig === 'cso') {
        return 'cxo';
      }
      return null;
    };

    // 1. Resolve Root CEO node
    const ceoEmployee = rawList.find((e: any) => {
      const isCeoFlag = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
      const role = ((e.accessRole || e.role || '') as string).toLowerCase().trim();
      const desig = (e.designation || e.jobTitle || (e as any).designationName || '').toLowerCase().trim();
      return isCeoFlag || role === 'ceo' || desig === 'ceo' || desig === 'chief executive officer';
    });

    const ceoId = ceoEmployee?.id || 999999;
    const adminName = ceoEmployee
      ? `${ceoEmployee.firstName || ''} ${ceoEmployee.lastName || ''}`.trim() || 'Chief Executive Officer'
      : (user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Chief Executive Officer');
    
    const adminEmail = ceoEmployee?.email || user?.email || 'ceo@apponext.com';

    // Root CEO Node at Top of Tree
    const rootCeoEmp: Employee = {
      id: ceoId,
      firstName: adminName,
      lastName: '',
      email: adminEmail,
      employeeCode: ceoEmployee?.employeeCode || 'CEO-01',
      designation: 'CHIEF EXECUTIVE OFFICER (CEO)',
      department: ceoEmployee?.department || 'Executive Leadership',
      avatarUrl: (ceoEmployee as any)?.avatarUrl,
    };

    // Filter out root CEO profile from lower employee list so they don't appear twice
    const activeList = rawList.filter((e: any) => {
      if (ceoEmployee && e.id === ceoEmployee.id) return false;
      const isCeo = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
      return !isCeo;
    });

    // Track claimed employee IDs to guarantee ZERO duplicates across the entire tree
    const claimedEmpIds = new Set<number>();
    if (ceoEmployee?.id) claimedEmpIds.add(ceoEmployee.id);

    // Recursive helper to find all direct reports of an employee from the database
    const findDirectChildren = (parentId: number, parentDept?: string, parentDeptId?: number | null): Employee[] => {
      const results: Employee[] = [];

      // 1. Priority 1: Direct reporting_manager_id match in database
      activeList.forEach((emp) => {
        if (emp.id && !claimedEmpIds.has(emp.id) && getMgrId(emp) === parentId) {
          claimedEmpIds.add(emp.id);
          results.push(emp);
        }
      });

      // 2. Priority 2: Department match ONLY if employee has NO reporting manager assigned in database
      activeList.forEach((emp) => {
        if (emp.id && !claimedEmpIds.has(emp.id) && !getMgrId(emp)) {
          const empDeptId = getDeptId(emp);
          const empDept = getDeptKey(emp);
          const isDeptIdMatch = parentDeptId && empDeptId && parentDeptId === empDeptId;
          const isDeptNameMatch = parentDept && parentDept !== 'General' && empDept === parentDept;
          if (isDeptIdMatch || isDeptNameMatch) {
            claimedEmpIds.add(emp.id);
            results.push(emp);
          }
        }
      });

      return results;
    };

    // Helper to recursively nest subordinates
    const buildSubTree = (emp: Employee): any => {
      const cat = getCxoCategory(emp);
      const isCxo = cat !== null;
      const childEmps = emp.id ? findDirectChildren(emp.id, getDeptKey(emp), getDeptId(emp)) : [];
      return {
        emp,
        isCxo,
        cxoType: cat,
        children: childEmps.map(buildSubTree),
      };
    };

    // Find direct reports under CEO:
    // Any employee whose reporting_manager_id is null, empty, 0, or equals CEO id, OR root-level managers
    const rootDirectEmps = activeList.filter((emp) => {
      const mgrId = getMgrId(emp);
      if (!mgrId || mgrId === ceoId || mgrId === 999999) return true;
      // If their manager is not in the active list, treat them as direct report under CEO
      const managerExistsInList = activeList.some((other) => other.id === mgrId);
      return !managerExistsInList;
    });

    // Mark root nodes as claimed
    rootDirectEmps.forEach((emp) => {
      if (emp.id) claimedEmpIds.add(emp.id);
    });

    // Build subtrees for each direct report under CEO
    const rootChildren = rootDirectEmps.map(buildSubTree);

    // Any remaining unclaimed employees attach safely under CEO
    const remainingUnclaimed = activeList.filter((emp) => emp.id && !claimedEmpIds.has(emp.id));
    remainingUnclaimed.forEach((emp) => { if (emp.id) claimedEmpIds.add(emp.id); });
    const fallbackChildren = remainingUnclaimed.map(buildSubTree);

    return {
      emp: rootCeoEmp,
      isAdmin: true,
      isCeo: true,
      children: [...rootChildren, ...fallbackChildren],
    };
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
            .join(' ')
            .toLowerCase()
            .includes(term)
        )
        .map((e) => e.id!)
    );
  }, [searchTerm, localEmps, employees]);

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

  const handleManagerChange = async (newManagerId: string) => {
    if (!selectedEmp?.id) return;
    setIsUpdatingManager(true);
    const parsedId = newManagerId ? parseInt(newManagerId, 10) : null;
    const previousEmps = localEmps;

    // Optimistically update localEmps
    if (localEmps) {
      setLocalEmps(
        localEmps.map((emp) =>
          emp.id === selectedEmp.id ? { ...emp, reportingManagerId: parsedId } : emp
        )
      );
    }

    try {
      await apiClient.patch(`/employees/${selectedEmp.id}`, {
        reportingManagerId: parsedId,
      });
      const targetMgr = (employees as Employee[] || []).find((e) => e.id === parsedId);
      toast.success(
        targetMgr
          ? `Assigned ${selectedEmp.firstName} to report under ${targetMgr.firstName} ${targetMgr.lastName}`
          : `Assigned ${selectedEmp.firstName} as direct report to CEO`
      );
      setSelectedEmp(null);
      refetch();
    } catch (err: any) {
      // Revert on error
      setLocalEmps(previousEmps);
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to update reporting manager');
    } finally {
      setIsUpdatingManager(false);
    }
  };

  const handleExportPNG = async () => {
    if (!exportTreeRef.current) return;
    try {
      toast.info('Generating high-resolution PNG of entire org structure...');
      const prevScale = scale;
      const prevPan = pan;
      setScale(1);
      setPan({ x: 0, y: 0 });

      await new Promise((r) => setTimeout(r, 120));

      const targetEl = exportTreeRef.current;
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: targetEl.scrollWidth + 40,
        height: targetEl.scrollHeight + 40,
      });

      setScale(prevScale);
      setPan(prevPan);

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Organization_Structure_Full_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      toast.success('Full Org Structure PNG exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PNG image');
    }
  };

  const handleExportPDF = async () => {
    if (!exportTreeRef.current) return;
    try {
      toast.info('Preparing PDF document of entire org structure...');
      const prevScale = scale;
      const prevPan = pan;
      setScale(1);
      setPan({ x: 0, y: 0 });

      await new Promise((r) => setTimeout(r, 120));

      const targetEl = exportTreeRef.current;
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: targetEl.scrollWidth + 40,
        height: targetEl.scrollHeight + 40,
      });

      setScale(prevScale);
      setPan(prevPan);

      const imgData = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Full Organization Structure Hierarchy</title>
              <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { margin: 0; padding: 15px; font-family: system-ui, -apple-system, sans-serif; background: #ffffff; text-align: center; }
                .header { margin-bottom: 15px; }
                .header h2 { margin: 0; font-size: 20px; color: #0f172a; }
                .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
                .img-container { width: 100%; display: flex; justify-content: center; }
                img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>Full Organization Hierarchy Chart</h2>
                <p>Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
        toast.success('PDF document ready for saving/printing!');
      } else {
        toast.error('Pop-up blocked. Please allow pop-ups to export PDF.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF document');
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* ─── Top Header & Controls matching reference layout ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              Organization Hierarchy Chart
            </h1>
            <p className="text-xs text-muted-foreground">
              Interactive Org Tree: Admin ➔ Department Manager ➔ Team Lead ➔ Employee / Intern
            </p>
          </div>
        </div>

        {/* Action Controls & Zoom Bar aligned in single row */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-muted/40 border border-border/80 rounded-lg p-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleZoomOut}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-mono font-bold w-12 text-center text-foreground">
              {Math.round(scale * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleZoomIn}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleResetZoom}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Reset Zoom / Fit"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Admin Settings Tab Button */}
          {isAdminOrManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSettingsModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 px-3 border-border shadow-2xs"
              title="Organization Hierarchy Settings"
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              Settings
            </Button>
          )}

          {/* Export Chart Button visible to Admin OR if Employee Export setting is ON */}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 px-3 border-border shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  Export Chart
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleExportPNG} className="text-xs gap-2 cursor-pointer font-medium">
                  <Image className="w-3.5 h-3.5 text-blue-600" />
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="text-xs gap-2 cursor-pointer font-medium">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isAdminOrManager && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* ─── Interactive Pure Line Tree Canvas wrapped in @dnd-kit DndContext ─── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="relative flex-1 min-h-[580px] overflow-hidden bg-card border border-border/80 rounded-xl shadow-2xs select-none cursor-default"
        >
          <div className="absolute inset-0 bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

          {/* ─── Top-Left Search Toolbar Bar matching Reference Screenshot 2 ─── */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-lg shadow-lg text-white">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(searchTerm);
                }}
                className="h-7 w-40 sm:w-52 pl-7 pr-2 bg-slate-800/90 text-white placeholder-slate-400 text-xs rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSearchSubmit(searchTerm)}
              className="h-7 text-[11px] font-bold px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded"
            >
              Find
            </Button>
          </div>

          {/* ─── Edge Arrow Movement Navigation Controls matching Reference Image ─── */}
          {/* Top Arrow (Pan Canvas Down) */}
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, y: p.y + 140 }))}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-32 h-6 bg-slate-800/80 hover:bg-slate-900 text-white rounded-b-md flex items-center justify-center shadow-md transition-colors border-b border-x border-slate-700/60 cursor-pointer"
            title="Pan Up"
          >
            <ChevronUp className="w-5 h-5 text-white" />
          </button>

          {/* Bottom Arrow (Pan Canvas Up) */}
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, y: p.y - 140 }))}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 w-32 h-6 bg-slate-800/80 hover:bg-slate-900 text-white rounded-t-md flex items-center justify-center shadow-md transition-colors border-t border-x border-slate-700/60 cursor-pointer"
            title="Pan Down"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>

          {/* Left Arrow (Pan Canvas Right) */}
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, x: p.x + 180 }))}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-32 bg-slate-800/80 hover:bg-slate-900 text-white rounded-r-md flex items-center justify-center shadow-md transition-colors border-r border-y border-slate-700/60 cursor-pointer"
            title="Pan Left"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Right Arrow (Pan Canvas Left) */}
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, x: p.x - 180 }))}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-32 bg-slate-800/80 hover:bg-slate-900 text-white rounded-l-md flex items-center justify-center shadow-md transition-colors border-l border-y border-slate-700/60 cursor-pointer"
            title="Pan Right"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-2">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Building organization hierarchy...</p>
            </div>
          ) : !treeData ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <Users className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-bold text-foreground">No employees found</p>
                <p className="text-xs text-muted-foreground">Add staff to populate the hierarchy chart.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add First Employee
              </Button>
            </div>
          ) : (
            <div
              className="w-full h-full flex justify-center pt-8 pb-20 transition-transform duration-75 origin-top"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              }}
            >
              <div ref={exportTreeRef} className="w-fit min-w-full flex justify-center p-6 bg-card text-foreground rounded-xl">
                <TreeBranch
                  node={treeData}
                  highlight={highlightIds}
                  pulsingEmpId={pulsingEmpId}
                  collapsedMap={collapsedMap}
                  onToggleCollapse={toggleCollapse}
                  onSelectEmp={(e) => {
                    if (e.id === 999999) return;
                    setSelectedEmp(e);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Floating Silky-Smooth Drag Overlay Preview */}
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeDragEmp ? (
            <div className="flex flex-col items-center bg-card border-2 border-primary ring-4 ring-primary/30 rounded-xl p-2.5 w-[160px] min-h-[92px] shadow-2xl scale-105 bg-card/95 backdrop-blur-xs cursor-grabbing pointer-events-none z-50">
              <div className="relative mb-1">
                <Avatar className="h-8 w-8 rounded-full border border-primary/50 shadow-md">
                  <AvatarImage src={(activeDragEmp as any).avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[9.5px] font-extrabold">
                    {activeDragEmp.firstName?.[0]}{activeDragEmp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="w-full bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full text-center truncate shadow-xs">
                {activeDragEmp.firstName} {activeDragEmp.lastName}
              </div>
              <div className="text-[8.5px] font-bold text-primary uppercase mt-1 tracking-wider">
                Reassigning Manager...
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Org Structure Settings Modal for Admin ─── */}
      {isSettingsModalOpen && (
        <Dialog open onOpenChange={setIsSettingsModalOpen}>
          <DialogContent className="sm:max-w-md border border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Settings className="w-5 h-5 text-primary" />
                Organization Hierarchy Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure hierarchy chart visibility and export options for your organization.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/80 rounded-xl">
                <div className="space-y-0.5 max-w-[280px]">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    Allow Employee Chart Export
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Enable or disable PNG and PDF export options for employee-side logins.
                  </p>
                </div>
                <Switch
                  checked={isExportEnabledForEmployees}
                  onCheckedChange={(val) => {
                    setIsExportEnabledForEmployees(val);
                    localStorage.setItem('org_chart_export_employee_enabled', JSON.stringify(val));
                    toast.success(
                      val
                        ? 'Chart export is now visible for employees.'
                        : 'Chart export is now hidden for employees.'
                    );
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border/60">
              <Button
                size="sm"
                className="h-8 text-xs font-semibold px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Reassign Confirmation Step Dialog ─── */}
      {reassignConfirm && (
        <Dialog open onOpenChange={() => setReassignConfirm(null)}>
          <DialogContent className="sm:max-w-md border border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Users className="w-5 h-5 text-primary" />
                Confirm Hierarchy Reassignment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to change the reporting manager and department for this employee?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/60 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Move Employee:</span>
                  <span className="font-bold text-foreground">
                    {reassignConfirm.activeEmp.firstName} {reassignConfirm.activeEmp.lastName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Under Manager / Dept:</span>
                  <span className="font-bold text-primary">
                    {reassignConfirm.targetIsAdmin
                      ? 'Organization Admin / Executive Management'
                      : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}${
                          reassignConfirm.targetEmp.department ? ` / ${reassignConfirm.targetEmp.department}` : ''
                        }`}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Move {reassignConfirm.activeEmp.firstName} {reassignConfirm.activeEmp.lastName} under{' '}
                {reassignConfirm.targetIsAdmin
                  ? 'Organization Admin'
                  : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}`}
                {reassignConfirm.targetEmp.department ? ` / ${reassignConfirm.targetEmp.department}` : ''}?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => setReassignConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={async () => {
                  const activeEmpId = reassignConfirm.activeEmp.id;
                  const targetManagerId = reassignConfirm.targetIsAdmin ? null : reassignConfirm.targetEmp.id;
                  const targetDeptId = reassignConfirm.targetIsAdmin
                    ? null
                    : reassignConfirm.targetEmp.currentDepartmentId || (reassignConfirm.targetEmp as any).departmentId || null;

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
                              ? 'Executive Management'
                              : confirmState.targetEmp.department || emp.department,
                          };
                        }
                        return emp;
                      })
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
                          ? 'Organization Admin'
                          : `${confirmState.targetEmp.firstName} ${confirmState.targetEmp.lastName}`
                      } successfully!`
                    );
                    refetch();
                  } catch (err: any) {
                    // Roll back optimistic update on API error
                    setLocalEmps(previousLocalEmps);
                    const msg =
                      err?.response?.data?.error?.details?.message ||
                      err?.response?.data?.message ||
                      'Failed to reassign employee';
                    toast.error(msg);
                  }
                }}
              >
                Confirm Move
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Employee Detail Modal ─── */}
      {selectedEmp && (
        <Dialog open onOpenChange={() => setSelectedEmp(null)}>
          <DialogContent className="sm:max-w-md border border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className={`h-11 w-11 border-2 border-card shadow-xs bg-gradient-to-br ${avatarGrad(selectedEmp.id)}`}>
                  <AvatarImage src={(selectedEmp as any)?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-black text-white">
                    {selectedEmp.firstName?.[0]}
                    {selectedEmp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-base font-bold text-foreground">
                    {selectedEmp.firstName} {selectedEmp.lastName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const cfg = roleCfg((selectedEmp as any).accessRole, selectedEmp.designation || selectedEmp.jobTitle);
                      const Icon = cfg.Icon;
                      return (
                        <Badge variant="outline" className={`text-[10px] font-bold py-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                          <Icon className="w-2.5 h-2.5 mr-1" />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                    <span className="font-mono text-xs text-muted-foreground">{selectedEmp.employeeCode}</span>
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs">Reporting hierarchy and manager assignment</DialogDescription>
            </DialogHeader>

              <div className="grid grid-cols-2 gap-2.5 text-xs bg-muted/40 p-3.5 rounded-xl border border-border/60 shadow-2xs">
                {(() => {
                  const allEmpsList = (localEmps || (employees as Employee[]) || []);
                  const mgrId = selectedEmp.reportingManagerId ?? (selectedEmp as any).reporting_manager_id;
                  const currentMgr = mgrId
                    ? allEmpsList.find((e) => Number(e.id) === Number(mgrId))
                    : null;
                  const ceoEmp = allEmpsList.find((e: any) => {
                    const isCeo = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
                    const desig = (e.designation || e.jobTitle || '').toLowerCase();
                    return isCeo || desig.includes('ceo') || desig.includes('chief executive');
                  });
                  const isSelectedEmpCeo = selectedEmp.id === ceoEmp?.id || (selectedEmp as any).isCeo || (selectedEmp as any).is_ceo;
                  const displayMgrName = isSelectedEmpCeo
                    ? 'Board of Directors'
                    : currentMgr
                    ? `${currentMgr.firstName} ${currentMgr.lastName}`
                    : (selectedEmp as any).reportingManager || (selectedEmp as any).reporting_manager_name || (ceoEmp ? `${ceoEmp.firstName} ${ceoEmp.lastName} (CEO)` : 'Direct Report to CEO');

                  return [
                    ['Reporting Manager', displayMgrName],
                    ['Department', selectedEmp.department || '—'],
                    ['Designation', selectedEmp.designation || selectedEmp.jobTitle || '—'],
                    ['Email', selectedEmp.email],
                    ['Mobile', selectedEmp.mobile || selectedEmp.phone || '—'],
                    ['Joined', selectedEmp.dateOfJoining ? new Date(selectedEmp.dateOfJoining).toLocaleDateString() : '—'],
                    ['Employment', selectedEmp.employmentType?.replace('_', ' ') || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className={label === 'Reporting Manager' ? 'col-span-2 bg-primary/5 p-2 rounded-lg border border-primary/20' : ''}>
                      <span className={`text-[10px] font-bold uppercase ${label === 'Reporting Manager' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                      <span className={`font-bold block truncate capitalize text-xs ${label === 'Reporting Manager' ? 'text-foreground' : 'text-foreground'}`}>
                        {value}
                      </span>
                    </div>
                  ));
                })()}
              </div>

              {/* Dedicated Live Database Reporting Manager Banner */}
              {(() => {
                const allEmpsList = (localEmps || (employees as Employee[]) || []);
                const mgrId = selectedEmp.reportingManagerId ?? (selectedEmp as any).reporting_manager_id;
                const currentMgr = mgrId
                  ? allEmpsList.find((e) => Number(e.id) === Number(mgrId))
                  : null;
                const ceoEmp = allEmpsList.find((e: any) => {
                  const isCeo = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
                  const desig = (e.designation || e.jobTitle || '').toLowerCase();
                  return isCeo || desig.includes('ceo') || desig.includes('chief executive');
                });
                const isSelectedEmpCeo = selectedEmp.id === ceoEmp?.id || (selectedEmp as any).isCeo || (selectedEmp as any).is_ceo;
                const fallbackManagerName = (selectedEmp as any).reportingManager || (selectedEmp as any).reporting_manager_name;

                return (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-muted/40 border border-primary/25 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Direct Reporting Manager
                      </div>
                      {currentMgr?.employeeCode && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/80 border border-border/60 text-muted-foreground">
                          {currentMgr.employeeCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <Avatar className={`h-10 w-10 rounded-full border-2 border-primary/40 shadow-xs bg-gradient-to-br ${avatarGrad(currentMgr?.id || 1)}`}>
                        <AvatarImage src={(currentMgr as any)?.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-black text-white">
                          {currentMgr ? (
                            `${currentMgr.firstName?.[0] || ''}${currentMgr.lastName?.[0] || ''}`
                          ) : isSelectedEmpCeo ? (
                            <ShieldCheck className="w-4 h-4 text-white" />
                          ) : ceoEmp ? (
                            `${ceoEmp.firstName?.[0] || ''}${ceoEmp.lastName?.[0] || ''}`
                          ) : (
                            <Crown className="w-4 h-4 text-white" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-foreground text-sm truncate flex items-center gap-1.5">
                          {isSelectedEmpCeo ? (
                            <span>Board of Directors / Shareholders</span>
                          ) : currentMgr ? (
                            <span>{currentMgr.firstName} {currentMgr.lastName}</span>
                          ) : fallbackManagerName ? (
                            <span>{fallbackManagerName}</span>
                          ) : ceoEmp ? (
                            <span className="flex items-center gap-1.5 text-foreground">
                              {ceoEmp.firstName} {ceoEmp.lastName}
                              <Badge variant="outline" className="text-[9px] font-extrabold py-0 px-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                CEO
                              </Badge>
                            </span>
                          ) : (
                            <span className="text-primary font-bold flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-500 inline" /> Direct Report to CEO
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5 font-medium">
                          {isSelectedEmpCeo ? (
                            <span>Corporate Executive Governance</span>
                          ) : currentMgr ? (
                            <span>
                              {currentMgr.designation || currentMgr.jobTitle || 'Manager'}
                              {currentMgr.department ? ` · ${currentMgr.department}` : ''}
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

            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5"
                onClick={() => {
                  navigate(`/employees/${selectedEmp.id}`);
                  setSelectedEmp(null);
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Profile
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold" onClick={() => setSelectedEmp(null)}>
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
  );
}
