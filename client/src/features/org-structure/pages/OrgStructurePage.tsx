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
import { useEmployees, useUpdateEmployee } from '@/features/employee/hooks/useEmployees';
import { useDepartments } from '@/features/settings/hooks/useDepartments';
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
  ShieldAlert,
  Layers,
  GraduationCap,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '@/types';
import { InvalidDropModal } from '../components/InvalidDropModal';
import { OrgHierarchyConfigModal } from '../components/OrgHierarchyConfigModal';
import { validateDragAndDrop, DEFAULT_HIERARCHY_RULES, normalizePositionKey } from '../utils/orgHierarchyEngine';
import type { HierarchyRule, ValidationResult } from '../types/orgHierarchy';

// ─────────────────────────────────────────────────────────────────────────────
// Role configuration & badge styling
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string; Icon: React.ElementType }
> = {
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
  intern: {
    label: 'Intern',
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    Icon: GraduationCap,
  },
  employee: {
    label: 'Employee',
    bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    text: 'text-slate-700 dark:text-slate-300',
    Icon: Briefcase,
  },
};

function roleCfg(role?: string, desig?: string) {
  const norm = normalizePositionKey(desig, role);
  if (norm === 'Intern' || role === 'intern') return ROLE_CONFIG.intern;
  if (role === 'hr_manager' || norm === 'HR Manager') return ROLE_CONFIG.hr_manager;
  if (role === 'department_head' || norm.includes('Head') || norm.includes('Manager')) return ROLE_CONFIG.department_head;
  if (role === 'team_lead' || norm === 'Team Leader') return ROLE_CONFIG.team_lead;
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
  return AVATAR_GRADIENTS[Math.abs(id || 0) % AVATAR_GRADIENTS.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree Node Component (Position / Employee, Department Node, or Empty State)
// ─────────────────────────────────────────────────────────────────────────────
interface ReferenceNodeProps {
  node: any;
  highlight: boolean;
  isPulsing?: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  activeDragEmp?: Employee | null;
  hierarchyRules?: HierarchyRule[];
  allEmployees?: Employee[];
}

function ReferenceNode({
  node,
  highlight,
  isPulsing = false,
  hasChildren,
  isCollapsed,
  onToggleExpand,
  onClick,
  activeDragEmp,
  hierarchyRules = DEFAULT_HIERARCHY_RULES,
  allEmployees = [],
}: ReferenceNodeProps) {
  const isDeptNode = Boolean(node.isDepartmentNode);
  const emp = node.emp || {};
  const isAdmin = Boolean(node.isAdmin);
  const nodeId = String(node.id || emp.id || `dept-${node.deptName}`);

  const name = isDeptNode
    ? node.deptName
    : [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Employee';

  const initials = isDeptNode
    ? node.deptName?.slice(0, 2).toUpperCase()
    : `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();

  const grad = avatarGrad(typeof node.id === 'number' ? node.id : emp.id);

  const posKey = isDeptNode
    ? 'Department'
    : normalizePositionKey(emp.designation || emp.jobTitle, emp.accessRole);

  const isCeoNode = isAdmin || posKey === 'CEO' || (emp.designation && emp.designation.toLowerCase().includes('chief executive'));

  const designation = isDeptNode
    ? 'DEPARTMENT'
    : isCeoNode
      ? 'CEO'
      : emp.designation || emp.jobTitle || posKey;

  const isDragDisabled = isDeptNode || isAdmin;

  // Draggable Hook
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: nodeId,
    disabled: isDragDisabled,
    data: { emp, node },
  });

  // Droppable Hook
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: nodeId,
    disabled: false,
    data: { emp, node },
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

  // Compute live validation status if currently dragging over this node
  const validation: ValidationResult | null = useMemo(() => {
    if (!isOver || !activeDragEmp || isDragging) return null;
    return validateDragAndDrop(activeDragEmp, node, hierarchyRules, allEmployees);
  }, [isOver, activeDragEmp, isDragging, node, hierarchyRules, allEmployees]);

  const isTargetValid = validation ? validation.isValid : false;
  const isTargetInvalid = validation ? !validation.isValid : false;

  return (
    <div className="relative flex flex-col items-center shrink-0">
      {/* Live Drop Target Indicator Badge when dragging over */}
      {isOver && !isDragging && (
        <div
          className={`absolute -top-4 z-50 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-white font-black text-[9px] shadow-xl animate-bounce ${isTargetValid ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
        >
          {isTargetValid ? (
            <>
              <UserCheck className="w-3 h-3 text-white" />
              <span>Valid Target — Drop to Assign</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-white" />
              <span>Invalid Target — Drop Blocked</span>
            </>
          )}
        </div>
      )}

      {/* Node Card Types */}
      {isDeptNode ? (
        // Department Heading (Requirement #3: Dark blue, bold, clearly visible, no card container box, no border, no shadow)
        <div
          id={`node-card-${nodeId}`}
          ref={setCombinedRef}
          onClick={onClick}
          title={`${node.deptName} Department`}
          className={`group relative flex flex-col items-center py-1 px-3 bg-transparent border-none shadow-none cursor-default select-none transition-all duration-200 ${isOver && isTargetInvalid
            ? 'ring-2 ring-rose-500 rounded-lg bg-rose-50/50 dark:bg-rose-950/30'
            : ''
            }`}
        >
          <div className="flex items-center gap-1.5 font-black text-sm text-[#1e3a8a] dark:text-blue-400 tracking-wide text-center uppercase">
            <Building2 className="w-4 h-4 shrink-0 text-[#1e3a8a] dark:text-blue-400" />
            <span className="truncate max-w-[220px]">{node.deptName}</span>
          </div>

          {/* Toggle Button for Children */}
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
      ) : (
        // Standard Employee / Position Node Card (Requirement #2 CEO label strictly 'CEO', Requirement #13 No serial/node numbers)
        <div
          id={`node-card-${emp.id}`}
          ref={setCombinedRef}
          {...listeners}
          {...attributes}
          style={style}
          onClick={onClick}
          title={isCeoNode ? 'CEO' : `${designation}`}
          className={`group relative flex flex-col items-center bg-card border shadow-xs rounded-xl p-2.5
            w-[165px] min-h-[98px] transition-all duration-200 cursor-grab active:cursor-grabbing select-none
            ${isPulsing
              ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-400/25 scale-110 shadow-xl animate-pulse z-40'
              : isDragging
                ? 'opacity-35 ring-2 ring-primary/40 border-dashed border-primary bg-primary/5'
                : isOver && isTargetValid
                  ? 'ring-4 ring-emerald-500/80 border-emerald-500 bg-emerald-500/10 scale-105 shadow-xl z-40'
                  : isOver && isTargetInvalid
                    ? 'ring-4 ring-rose-500/80 border-rose-500 bg-rose-500/10 scale-105 shadow-xl z-40 cursor-not-allowed'
                    : highlight
                      ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                      : isCeoNode
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border/80 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
            }`}
        >
          {/* Top Avatar (No Node/Level Numbers) */}
          <div className="relative mb-1">
            <Avatar className={`h-8 w-8 rounded-full border border-border/60 shadow-xs bg-gradient-to-br ${grad}`}>
              <AvatarImage src={(emp as any).avatarUrl || undefined} alt={name} />
              <AvatarFallback className={`bg-gradient-to-br ${grad} text-white text-[9.5px] font-extrabold`}>
                {initials || <User className="w-3.5 h-3.5 text-white" />}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Minimal Name Pill */}
          <div className="w-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary text-[10.5px] font-extrabold px-2 py-0.5 rounded-full text-center truncate shadow-2xs transition-colors">
            {name}
          </div>

          {/* Designation Subtitle (Requirement #2: CEO displayed strictly as CEO) */}
          <div className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider text-center truncate w-full mt-1">
            {isCeoNode ? 'CEO' : designation}
          </div>

          {/* Department / Manager Subtitle */}
          <div className="text-[8px] font-semibold text-muted-foreground/80 truncate w-full text-center mt-0.5">
            {emp.department ? `${emp.department}` : node.reportingManagerName ? `Mgr: ${node.reportingManagerName}` : ''}
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
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree Branch Recursive Component
// ─────────────────────────────────────────────────────────────────────────────
interface TreeBranchProps {
  node: any;
  highlight: Set<number>;
  pulsingEmpId?: number | null;
  collapsedMap: Record<string | number, boolean>;
  onToggleCollapse: (id: string | number) => void;
  onSelectEmp: (e: Employee) => void;
  activeDragEmp?: Employee | null;
  hierarchyRules?: HierarchyRule[];
  allEmployees?: Employee[];
}

function TreeBranch({
  node,
  highlight,
  pulsingEmpId,
  collapsedMap,
  onToggleCollapse,
  onSelectEmp,
  activeDragEmp,
  hierarchyRules,
  allEmployees,
}: TreeBranchProps) {
  const nodeId = node.id || node.emp?.id || `dept-${node.deptName}`;
  const isCollapsed = collapsedMap[nodeId] ?? false;
  const children = node.children || [];
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center shrink-0">
      {/* Node Card */}
      <ReferenceNode
        node={node}
        highlight={node.emp?.id ? highlight.has(node.emp.id) : false}
        isPulsing={pulsingEmpId === node.emp?.id}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleExpand={() => onToggleCollapse(nodeId)}
        onClick={() => {
          if (node.emp && !node.isDepartmentNode && !node.isEmptyStateNode) {
            onSelectEmp(node.emp);
          }
        }}
        activeDragEmp={activeDragEmp}
        hierarchyRules={hierarchyRules}
        allEmployees={allEmployees}
      />

      {/* Children Branches with Crisp Line Connectors */}
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
          <div className="flex gap-6 items-start justify-center pt-0">
            {children.map((childNode: any, idx: number) => {
              const childKey = childNode.id || childNode.emp?.id || `child-${idx}`;
              return (
                <div key={childKey} className="flex flex-col items-center shrink-0">
                  {children.length > 1 && <div className="w-px h-3.5 bg-border shrink-0" />}
                  <TreeBranch
                    node={childNode}
                    highlight={highlight}
                    pulsingEmpId={pulsingEmpId}
                    collapsedMap={collapsedMap}
                    onToggleCollapse={onToggleCollapse}
                    onSelectEmp={onSelectEmp}
                    activeDragEmp={activeDragEmp}
                    hierarchyRules={hierarchyRules}
                    allEmployees={allEmployees}
                  />
                </div>
              );
            })}
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
  const { data: deptData } = useDepartments(1, 500);
  const [searchTerm, setSearchTerm] = useState('');
  const [pulsingEmpId, setPulsingEmpId] = useState<number | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [managerEditId, setManagerEditId] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Hierarchy rules state
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>(DEFAULT_HIERARCHY_RULES);

  // Invalid Drop Popup Modal State
  const [invalidDropModal, setInvalidDropModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: '', message: '' });

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

  // Load custom hierarchy rules from backend
  useEffect(() => {
    apiClient
      .get('/employees/org-hierarchy/rules')
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setHierarchyRules(res.data.data);
        }
      })
      .catch((err) => {
        console.warn('Using default hierarchy rules:', err);
      });
  }, []);

  // Collapse State for nodes
  const [collapsedMap, setCollapsedMap] = useState<Record<string | number, boolean>>({});

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

  const { updateEmployee, isLoading: isUpdatingManager } = useUpdateEmployee(selectedEmp?.id || 0);

  // Active Dragged Employee for smooth DragOverlay preview & live validation
  const [activeDragEmp, setActiveDragEmp] = useState<Employee | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const toggleCollapse = (id: string | number) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const emp: Employee = event.active.data.current?.emp;
    if (emp) setActiveDragEmp(emp);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeEmp: Employee = activeDragEmp || event.active.data.current?.emp;
    setActiveDragEmp(null);

    const { active, over } = event;
    if (!over || !activeEmp || active.id === over.id) return;

    const overData = over.data.current;
    const targetNode = overData?.node || overData;
    const targetEmp: Employee = overData?.emp;
    const targetIsAdmin: boolean = Boolean(overData?.isAdmin || targetNode?.isAdmin);

    const activeList = localEmps || (employees as Employee[]) || [];

    // STRICT Drag-and-Drop Validation Check
    const validation = validateDragAndDrop(activeEmp, targetNode, hierarchyRules, activeList);

    if (!validation.isValid) {
      // Show Professional Validation Popup (Requirement #8 & #9)
      setInvalidDropModal({
        open: true,
        title: validation.errorTitle || 'Invalid Reporting Structure',
        message: validation.errorMessage || 'This move is not permitted under the organization structure rules.',
      });
      return;
    }

    if (!targetEmp && !targetIsAdmin) return;

    const activeEmpId = activeEmp.id;
    const targetManagerId = targetIsAdmin ? null : targetEmp.id;
    const targetDeptId = targetIsAdmin
      ? null
      : targetEmp.currentDepartmentId || (targetEmp as any).departmentId || (targetEmp as any).current_department_id || activeEmp.currentDepartmentId;

    if (!activeEmpId) return;

    const previousLocalEmps = localEmps;

    // Optimistically move node in local tree state for immediate live rendering
    if (localEmps) {
      setLocalEmps(
        localEmps.map((emp) => {
          if (emp.id === activeEmpId) {
            return {
              ...emp,
              reportingManagerId: targetManagerId,
              currentDepartmentId: targetDeptId || emp.currentDepartmentId,
              department: targetIsAdmin
                ? 'Executive Management'
                : targetEmp.department || emp.department,
            };
          }
          return emp;
        })
      );
    }

    // Save reporting relationship permanently to database
    apiClient
      .patch(`/employees/${activeEmpId}`, {
        reportingManagerId: targetManagerId,
        currentDepartmentId: targetDeptId || undefined,
      })
      .then(() => {
        const mgrName = targetIsAdmin
          ? 'Organization Admin / CEO'
          : `${targetEmp.firstName || ''} ${targetEmp.lastName || ''}`.trim();
        toast.success(`Reporting manager for ${activeEmp.firstName} changed to ${mgrName}!`);
        refetch();
      })
      .catch((err: any) => {
        // Roll back optimistic update on API error
        setLocalEmps(previousLocalEmps);
        const msg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to update reporting manager';
        toast.error(msg);
      });
  };

  // Search Submit
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

    const ancestors: (number | string)[] = [];
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

    ancestors.push(999999);

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

  // Build Full Configurable Tree Hierarchy strictly driven by saved parent-child reporting relationships
  const treeData = useMemo(() => {
    const rawList = localEmps || (employees as Employee[]) || [];
    const allDbDepts: any[] = deptData?.items || deptData?.data || [];

    const getPos = (e: Employee) => normalizePositionKey(e.designation || e.jobTitle, (e as any).accessRole);
    const getDeptKey = (e: Employee) => e.department || (e as any).departmentName || (e as any).department_name || 'General';
    const getDeptId = (e: Employee) => e.currentDepartmentId || (e as any).current_department_id || (e as any).departmentId || (e as any).department_id;

    // Detect if real CEO employee exists in rawList
    const ceoEmpFromDb = rawList.find((e: any) =>
      Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1 || getPos(e) === 'CEO')
    );

    const adminName = ceoEmpFromDb
      ? [ceoEmpFromDb.firstName, ceoEmpFromDb.lastName].filter(Boolean).join(' ')
      : user
        ? `${user.firstName} ${user.lastName}`.trim() || user.email
        : 'CEO';

    const adminEmail = ceoEmpFromDb?.email || user?.email || 'ceo@kosqu.com';

    // Root CEO Employee Node (Requirement #2: designation strictly CEO)
    const rootAdminEmp: Employee = ceoEmpFromDb
      ? { ...ceoEmpFromDb, designation: 'CEO' }
      : {
        id: 999999,
        firstName: adminName,
        lastName: '',
        email: adminEmail,
        employeeCode: 'CEO-01',
        designation: 'CEO',
        department: 'Executive Management',
      };

    const rootAdminId = ceoEmpFromDb?.id || 999999;

    const activeList = rawList.filter((e: any) => {
      if (ceoEmpFromDb && e.id === ceoEmpFromDb.id) return false;
      return true;
    });

    const getLevelOrder = (pos: string): number => {
      if (pos === 'CEO') return 1;
      if (pos === 'COO') return 2;
      if (['CTO', 'CFO'].includes(pos)) return 3;
      if (['IT Head', 'HR Manager', 'Finance Manager', 'Organization Manager', 'Department Manager'].includes(pos)) return 5;
      if (['Project Manager', 'HR Executive', 'Accountant'].includes(pos)) return 6;
      if (pos === 'Team Leader') return 7;
      if (pos === 'Employee') return 8;
      if (pos === 'Intern') return 9;
      return 8;
    };

    // 1. Build map of all employee nodes
    const nodeMap = new Map<number, any>();
    activeList.forEach((e) => {
      if (e.id) {
        nodeMap.set(e.id, {
          id: e.id,
          emp: e,
          hierarchyLevel: getLevelOrder(getPos(e)),
          children: [],
        });
      }
    });

    // 2. Attach children strictly to their saved parent employee by reportingManagerId / reporting_manager_id
    const rootAttachedIds = new Set<number>();
    activeList.forEach((e) => {
      if (!e.id) return;
      const node = nodeMap.get(e.id);
      const parentId = e.reportingManagerId || (e as any).reporting_manager_id;

      if (parentId && parentId !== rootAdminId && parentId !== 999999 && nodeMap.has(parentId) && parentId !== e.id) {
        const parentNode = nodeMap.get(parentId);
        parentNode.children.push(node);
      } else {
        rootAttachedIds.add(e.id);
      }
    });

    // Helper to sort children array recursively by hierarchy level
    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => (a.hierarchyLevel || 6) - (b.hierarchyLevel || 6));
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          sortChildren(n.children);
        }
      });
    };

    // Sort all internal employee node children
    nodeMap.forEach((node) => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });

    // Extract top-level employee nodes attached to root
    const topLevelNodes = Array.from(rootAttachedIds).map((id) => nodeMap.get(id)).filter(Boolean);

    // Identify CXO Executive Nodes (COO, CFO, CTO)
    const cooNode = topLevelNodes.find((n) => getPos(n.emp) === 'COO');
    const cfoNode = topLevelNodes.find((n) => getPos(n.emp) === 'CFO');
    const ctoNode = topLevelNodes.find((n) => getPos(n.emp) === 'CTO');

    // Root Executive Container object representation
    const ceoRootNode: any = {
      id: rootAdminId,
      emp: rootAdminEmp,
      isAdmin: true,
      hierarchyLevel: 1,
      children: [],
    };

    // Build Executive Hierarchy: CEO -> COO -> (CFO and CTO side-by-side)
    if (cooNode) {
      ceoRootNode.children.push(cooNode);
      if (cfoNode && !cooNode.children.some((c: any) => c.id === cfoNode.id)) {
        cooNode.children.push(cfoNode);
      }
      if (ctoNode && !cooNode.children.some((c: any) => c.id === ctoNode.id)) {
        cooNode.children.push(ctoNode);
      }
    } else {
      if (cfoNode) ceoRootNode.children.push(cfoNode);
      if (ctoNode) ceoRootNode.children.push(ctoNode);
    }

    // Helper to normalize department names for robust deduplication & matching
    const normalizeDeptKey = (name?: string) => {
      if (!name) return '';
      return name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    };

    // Gather all Departments to render (DB Departments + Employee Departments)
    const deptsToRender: { id?: number | string; name: string }[] = [];
    const seenDeptKeys = new Set<string>();

    allDbDepts.forEach((d: any) => {
      const name = d.name || d.department_name;
      const norm = normalizeDeptKey(name);
      if (name && norm && !seenDeptKeys.has(norm)) {
        seenDeptKeys.add(norm);
        deptsToRender.push({ id: d.id, name });
      }
    });

    activeList.forEach((e) => {
      const name = getDeptKey(e);
      const norm = normalizeDeptKey(name);
      if (name && norm && norm !== 'general' && !seenDeptKeys.has(norm)) {
        seenDeptKeys.add(norm);
        deptsToRender.push({ id: getDeptId(e), name });
      }
    });

    ['Information Technology', 'HR', 'Finance'].forEach((name) => {
      const norm = normalizeDeptKey(name);
      if (!seenDeptKeys.has(norm)) {
        seenDeptKeys.add(norm);
        deptsToRender.push({ name });
      }
    });

    const nonCxoTopNodes = topLevelNodes.filter(
      (n) => !['COO', 'CFO', 'CTO', 'CEO'].includes(getPos(n.emp))
    );
    const claimedTopNodeIds = new Set<number>();

    // Map each Department Node under its appropriate Parent Executive (CFO, CTO, COO, or CEO)
    deptsToRender.forEach((deptObj) => {
      const deptName = deptObj.name;
      const deptId = deptObj.id;
      const deptNorm = normalizeDeptKey(deptName);

      // Find top staff belonging to this department
      const deptChildren = nonCxoTopNodes.filter((n) => {
        if (claimedTopNodeIds.has(n.id)) return false;

        const empDeptId = getDeptId(n.emp);
        if (deptId && empDeptId && String(deptId) === String(empDeptId)) return true;

        const empDeptName = getDeptKey(n.emp);
        const empDeptNorm = normalizeDeptKey(empDeptName);
        if (empDeptNorm && deptNorm && empDeptNorm === deptNorm) return true;

        if ((deptNorm.includes('it') || deptNorm.includes('tech')) && (empDeptNorm.includes('it') || empDeptNorm.includes('tech') || getPos(n.emp) === 'IT Head')) return true;
        if ((deptNorm.includes('hr') || deptNorm.includes('human')) && (empDeptNorm.includes('hr') || empDeptNorm.includes('human') || getPos(n.emp) === 'HR Manager')) return true;
        if ((deptNorm.includes('fin') || deptNorm.includes('account')) && (empDeptNorm.includes('finance') || empDeptNorm.includes('account') || getPos(n.emp) === 'Finance Manager')) return true;

        return false;
      });

      deptChildren.forEach((c) => claimedTopNodeIds.add(c.id));
      sortChildren(deptChildren);

      // Determine Parent Executive Node for this Department
      let targetParentNode = ceoRootNode;

      // 1. Check if top staff in department reports to CFO, CTO, or COO
      if (deptChildren.length > 0) {
        const topEmp = deptChildren[0].emp;
        const mgrId = topEmp.reportingManagerId || (topEmp as any).reporting_manager_id;
        if (mgrId) {
          if (cfoNode && Number(mgrId) === Number(cfoNode.id)) targetParentNode = cfoNode;
          else if (ctoNode && Number(mgrId) === Number(ctoNode.id)) targetParentNode = ctoNode;
          else if (cooNode && Number(mgrId) === Number(cooNode.id)) targetParentNode = cooNode;
        }
      }

      // 2. Fallback Department-to-Executive Name Mapping
      if (targetParentNode === ceoRootNode) {
        if ((deptNorm.includes('fin') || deptNorm.includes('account')) && cfoNode) {
          targetParentNode = cfoNode;
        } else if ((deptNorm.includes('it') || deptNorm.includes('tech') || deptNorm.includes('software')) && ctoNode) {
          targetParentNode = ctoNode;
        } else if (cooNode) {
          targetParentNode = cooNode;
        }
      }

      const deptNode = {
        id: `dept-${deptId || deptName}`,
        isDepartmentNode: true,
        deptName,
        hierarchyLevel: targetParentNode.hierarchyLevel + 0.5,
        children: deptChildren,
      };

      targetParentNode.children.push(deptNode);
    });

    // Attach any remaining unassigned orphan top nodes under COO or CEO
    const orphanTopNodes = nonCxoTopNodes.filter((n) => !claimedTopNodeIds.has(n.id));
    if (orphanTopNodes.length > 0) {
      const targetParent = cooNode || ceoRootNode;
      orphanTopNodes.forEach((n) => targetParent.children.push(n));
    }

    sortChildren(ceoRootNode.children);
    if (cooNode) sortChildren(cooNode.children);
    if (cfoNode) sortChildren(cfoNode.children);
    if (ctoNode) sortChildren(ctoNode.children);

    return ceoRootNode;
  }, [localEmps, employees, deptData, user]);

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
    try {
      await updateEmployee({ reportingManagerId: newManagerId ? parseInt(newManagerId, 10) : null } as any);
      setSelectedEmp(null);
      refetch();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to update manager assignment';
      toast.error(msg);
    }
  };

  const handleSaveHierarchyRules = async (updatedRules: HierarchyRule[]) => {
    try {
      setHierarchyRules(updatedRules);
      await apiClient.put('/employees/org-hierarchy/rules', { rules: updatedRules });
      toast.success('Organization hierarchy rules saved to server!');
    } catch (err: any) {
      console.error(err);
      toast.error('Saved locally. Failed to sync with server.');
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
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              Organization Hierarchy Chart
              <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                <Sparkles className="w-3 h-3 mr-1" /> Dynamic Tree Hierarchy
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Tree Hierarchy: CEO ➔ COO/CTO/CFO ➔ Department Nodes ➔ IT Head ➔ PM ➔ Team Lead ➔ Employee ➔ Intern
            </p>
          </div>
        </div>

        {/* Action Controls & Zoom Bar */}
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

          {/* Admin Hierarchy Configuration Button */}
          {isAdminOrManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsConfigModalOpen(true)}
              className="h-8 text-xs font-bold gap-1.5 px-3 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 shadow-2xs"
              title="Configure Role/Designation Parent Rules"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              Hierarchy Config
            </Button>
          )}

          {/* Settings Modal Toggle */}
          {isAdminOrManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSettingsModalOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 px-3 border-border shadow-2xs"
              title="Organization Settings"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              Settings
            </Button>
          )}

          {/* Export Chart Button */}
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

      {/* ─── Interactive Tree Canvas wrapped in @dnd-kit DndContext ─── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="relative flex-1 min-h-[580px] overflow-hidden bg-card border border-border/80 rounded-xl shadow-2xs select-none cursor-default"
        >
          <div className="absolute inset-0 bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

          {/* ─── Top-Left Search Toolbar Bar ─── */}
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

          {/* ─── Canvas Pan Control Arrows ─── */}
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, y: p.y + 140 }))}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-32 h-6 bg-slate-800/80 hover:bg-slate-900 text-white rounded-b-md flex items-center justify-center shadow-md transition-colors border-b border-x border-slate-700/60 cursor-pointer"
            title="Pan Up"
          >
            <ChevronUp className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, y: p.y - 140 }))}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 w-32 h-6 bg-slate-800/80 hover:bg-slate-900 text-white rounded-t-md flex items-center justify-center shadow-md transition-colors border-t border-x border-slate-700/60 cursor-pointer"
            title="Pan Down"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            onClick={() => setPan((p) => ({ ...p, x: p.x + 180 }))}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-32 bg-slate-800/80 hover:bg-slate-900 text-white rounded-r-md flex items-center justify-center shadow-md transition-colors border-r border-y border-slate-700/60 cursor-pointer"
            title="Pan Left"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
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
                    setManagerEditId(String(e.reportingManagerId || ''));
                  }}
                  activeDragEmp={activeDragEmp}
                  hierarchyRules={hierarchyRules}
                  allEmployees={(localEmps || employees) as Employee[]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Floating Smooth Drag Overlay Preview */}
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeDragEmp ? (
            <div className="flex flex-col items-center bg-card border-2 border-primary ring-4 ring-primary/30 rounded-xl p-2.5 w-[165px] min-h-[98px] shadow-2xl scale-105 bg-card/95 backdrop-blur-xs cursor-grabbing pointer-events-none z-50">
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
                Reassigning Position...
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Professional Invalid Drop Warning Popup (Requirement #8) ─── */}
      <InvalidDropModal
        open={invalidDropModal.open}
        title={invalidDropModal.title}
        message={invalidDropModal.message}
        onClose={() => setInvalidDropModal({ open: false, title: '', message: '' })}
      />

      {/* ─── Admin Hierarchy Configuration Modal (Requirement #10 & #12) ─── */}
      <OrgHierarchyConfigModal
        open={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        rules={hierarchyRules}
        onSaveRules={handleSaveHierarchyRules}
      />

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

      {/* ─── Reassign Confirmation Dialog ─── */}
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
                      : `${reassignConfirm.targetEmp.firstName} ${reassignConfirm.targetEmp.lastName}${reassignConfirm.targetEmp.department ? ` / ${reassignConfirm.targetEmp.department}` : ''
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
                      `Moved ${confirmState.activeEmp.firstName} under ${confirmState.targetIsAdmin
                        ? 'Organization Admin'
                        : `${confirmState.targetEmp.firstName} ${confirmState.targetEmp.lastName}`
                      } successfully!`
                    );
                    refetch();
                  } catch (err: any) {
                    // Roll back optimistic update on API error
                    setLocalEmps(previousLocalEmps);
                    const msg =
                      err?.response?.data?.error?.message ||
                      err?.response?.data?.message ||
                      err?.message ||
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
                      const cfg = roleCfg((selectedEmp as any).accessRole, selectedEmp.designation);
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

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-lg border border-border/60">
                {[
                  ['Department', selectedEmp.department || '—'],
                  ['Designation', selectedEmp.designation || selectedEmp.jobTitle || '—'],
                  ['Role', (selectedEmp as any).accessRole || 'Employee'],
                  ['Email', selectedEmp.email],
                  ['Joined', selectedEmp.dateOfJoining ? new Date(selectedEmp.dateOfJoining).toLocaleDateString() : '—'],
                  ['Employment', selectedEmp.employmentType?.replace('_', ' ') || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
                    <span className="font-semibold text-foreground truncate block capitalize text-xs">{value}</span>
                  </div>
                ))}
              </div>

              {/* Reporting Manager Assignment */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="text-xs font-bold text-foreground block">Assign Reporting Manager</label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
                    value={managerEditId}
                    onChange={(e) => setManagerEditId(e.target.value)}
                  >
                    <option value="">— Reports to Organization Admin / CEO —</option>
                    {(employees as Employee[])
                      .filter((e: any) => e.id !== selectedEmp.id && !e.isCeo && !e.is_ceo && !e.isCeoProfileHidden && !e.is_ceo_profile_hidden && e.accessRole !== 'organization_admin')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.designation || e.jobTitle || 'Staff'})
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    className="h-9 text-xs font-semibold px-3 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                    onClick={() => handleManagerChange(managerEditId)}
                    disabled={isUpdatingManager}
                  >
                    {isUpdatingManager ? 'Saving...' : 'Update'}
                  </Button>
                </div>
              </div>
            </div>

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
