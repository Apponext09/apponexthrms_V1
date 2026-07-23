import { useState, useMemo, useRef, useEffect } from 'react';
import { useEmployees, useUpdateEmployee } from '@/features/employee/hooks/useEmployees';
import { EmployeeCreateModal } from '@/features/employee/components/EmployeeCreateModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  hr_manager: {
    label: 'HR Manager',
    bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    text: 'text-rose-700 dark:text-rose-300',
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

function roleCfg(role?: string) {
  if (role === 'hr_manager' || role === 'department_head') return ROLE_CONFIG[role];
  if (role === 'team_lead') return ROLE_CONFIG.team_lead;
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
// Tree Node Component Matching Reference Design
// ─────────────────────────────────────────────────────────────────────────────
interface ReferenceNodeProps {
  emp: Employee;
  highlight: boolean;
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

  return (
    <div className="relative flex flex-col items-center shrink-0">
      {/* Department Name Badge rendered directly ABOVE the manager card */}
      {deptName && (
        <div className="flex flex-col items-center mb-1 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-extrabold text-[10px] shadow-2xs">
            <Building2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>{deptName}</span>
          </div>
          <div className="w-0.5 h-2.5 bg-slate-300 dark:bg-slate-600" />
        </div>
      )}

      {/* Node Box Card matching reference image */}
      <div
        onClick={onClick}
        className={`group relative flex flex-col items-center bg-card border-2 shadow-md rounded-2xl p-3
          w-[165px] min-h-[105px] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer select-none
          ${
            highlight
              ? 'border-primary ring-2 ring-primary/40'
              : isAdmin
              ? 'border-sky-500 bg-sky-500/5'
              : 'border-sky-400/80 hover:border-sky-500'
          }`}
      >
        {/* Top Avatar Frame */}
        <div className="relative mb-1.5">
          <Avatar className={`h-9 w-9 rounded-lg border border-border shadow-xs bg-gradient-to-br ${grad}`}>
            <AvatarImage src={(emp as any).avatarUrl || undefined} alt={name} />
            <AvatarFallback className={`bg-gradient-to-br ${grad} text-white text-[10px] font-black`}>
              {initials || <User className="w-4 h-4 text-white" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Blue Name Pill matching reference */}
        <div className="w-full bg-[#0096dc] hover:bg-sky-600 text-white text-[10px] font-black px-2 py-1 rounded-full text-center truncate shadow-2xs transition-colors">
          {name}
        </div>

        {/* Uppercase Designation Subtitle */}
        <div className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider text-center truncate w-full mt-1">
          {designation}
        </div>

        {/* Expand / Collapse Circular Toggle Badge (+ / -) matching reference */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-card border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-foreground font-black shadow hover:scale-110 transition-transform"
            title={isCollapsed ? 'Expand Children' : 'Collapse Children'}
          >
            {isCollapsed ? <Plus className="w-3 h-3 text-primary" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree Branch Recursive Component
// ─────────────────────────────────────────────────────────────────────────────
interface TreeBranchProps {
  node: any;
  highlight: Set<number>;
  collapsedMap: Record<number, boolean>;
  onToggleCollapse: (id: number) => void;
  onSelectEmp: (e: Employee) => void;
  isLevel1Manager?: boolean;
}

function TreeBranch({
  node,
  highlight,
  collapsedMap,
  onToggleCollapse,
  onSelectEmp,
  isLevel1Manager = false,
}: TreeBranchProps) {
  const isCollapsed = collapsedMap[node.emp.id] || false;
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const deptName = isLevel1Manager ? (node.emp.department || 'Department') : undefined;

  return (
    <div className="flex flex-col items-center shrink-0">
      {/* Node Card */}
      <ReferenceNode
        emp={node.emp}
        highlight={highlight.has(node.emp.id)}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleExpand={() => onToggleCollapse(node.emp.id)}
        onClick={() => onSelectEmp(node.emp)}
        isAdmin={node.isAdmin}
        deptName={deptName}
      />

      {/* Children Branches with Smooth Line Connections */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center pt-3">
          {/* Vertical Stem down from parent toggle button */}
          <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 shrink-0" />

          {/* Horizontal Branch Line connecting children */}
          {children.length > 1 && (
            <div className="relative flex justify-center w-full">
              <div className="h-0.5 bg-slate-300 dark:bg-slate-600 w-full" />
            </div>
          )}

          {/* Children Array Render */}
          <div className="flex gap-6 items-start justify-center pt-0">
            {children.map((childNode: any) => (
              <div key={childNode.emp.id} className="flex flex-col items-center shrink-0">
                {children.length > 1 && <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-600 shrink-0" />}
                <TreeBranch
                  node={childNode}
                  highlight={highlight}
                  collapsedMap={collapsedMap}
                  onToggleCollapse={onToggleCollapse}
                  onSelectEmp={onSelectEmp}
                  isLevel1Manager={node.isAdmin}
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
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [managerEditId, setManagerEditId] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Collapse State for nodes
  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});

  // Canvas Zoom & Pan Controls
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { updateEmployee, isLoading: isUpdatingManager } = useUpdateEmployee(selectedEmp?.id || 0);

  const toggleCollapse = (id: number) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build Hierarchy Tree Structure:
  // Root (Admin) -> Managers (Dept/HR Managers) -> Team Leads -> Employees/Interns
  const treeData = useMemo(() => {
    if (!employees || employees.length === 0) return null;

    const allEmps = employees as Employee[];
    const adminName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Organization Admin';
    const adminEmail = user?.email || 'admin@kosqu.com';

    // Root Admin Node
    const rootAdminEmp: Employee = {
      id: 999999,
      firstName: adminName,
      lastName: '',
      email: adminEmail,
      employeeCode: 'ADMIN-01',
      designation: 'ORGANIZATION ADMIN',
      department: 'Executive Management',
    };

    // Separate employees by access role
    const managers = allEmps.filter((e) =>
      ['department_head', 'hr_manager', 'hr_admin'].includes((e as any).accessRole || '')
    );
    const teamLeads = allEmps.filter(
      (e) => ((e as any).accessRole || '') === 'team_lead'
    );
    const regularEmployees = allEmps.filter(
      (e) => !['department_head', 'hr_manager', 'hr_admin', 'team_lead'].includes((e as any).accessRole || '')
    );

    // Build manager branches
    const managerNodes = managers.map((m) => {
      // Find team leads reporting to or in department of this manager
      const managerLeads = teamLeads.filter(
        (tl) =>
          tl.reportingManagerId === m.id ||
          tl.department === m.department
      );

      const leadNodes = managerLeads.map((tl) => {
        // Find employees reporting to or in department of this team lead
        const leadEmps = regularEmployees.filter(
          (emp) =>
            emp.reportingManagerId === tl.id ||
            emp.department === tl.department
        );

        return {
          emp: tl,
          children: leadEmps.map((emp) => ({ emp, children: [] })),
        };
      });

      // Find employees directly under manager without team lead
      const unassignedEmps = regularEmployees.filter(
        (emp) =>
          emp.department === m.department &&
          !managerLeads.some((tl) => emp.reportingManagerId === tl.id)
      );

      const combinedChildren = [
        ...leadNodes,
        ...unassignedEmps.map((emp) => ({ emp, children: [] })),
      ];

      return {
        emp: m,
        children: combinedChildren,
      };
    });

    // Handle orphan employees or teams with no manager assigned
    const unmanagedLeads = teamLeads.filter(
      (tl) => !managers.some((m) => m.department === tl.department || tl.reportingManagerId === m.id)
    );
    const unmanagedEmps = regularEmployees.filter(
      (emp) =>
        !managers.some((m) => m.department === emp.department) &&
        !teamLeads.some((tl) => tl.department === emp.department)
    );

    const orphanNodes = [
      ...unmanagedLeads.map((tl) => ({
        emp: tl,
        children: regularEmployees
          .filter((emp) => emp.department === tl.department)
          .map((emp) => ({ emp, children: [] })),
      })),
      ...unmanagedEmps.map((emp) => ({ emp, children: [] })),
    ];

    return {
      emp: rootAdminEmp,
      isAdmin: true,
      children: [...managerNodes, ...orphanNodes],
    };
  }, [employees, user]);

  // Search Highlight
  const highlightIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<number>();
    const term = searchTerm.toLowerCase();
    return new Set<number>(
      (employees as Employee[])
        .filter((e) =>
          [e.firstName, e.lastName, e.email, e.designation, e.department]
            .join(' ')
            .toLowerCase()
            .includes(term)
        )
        .map((e) => e.id!)
    );
  }, [searchTerm, employees]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleManagerChange = async (newManagerId: string) => {
    if (!selectedEmp?.id) return;
    try {
      await updateEmployee({ reportingManagerId: newManagerId ? parseInt(newManagerId, 10) : null } as any);
      setSelectedEmp(null);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* ─── Top Header & Zoom Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
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

        {/* Action Controls & Zoom Bar */}
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search staff or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* ─── Interactive Pure Line Tree Canvas matching Reference Image ─── */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 min-h-[580px] overflow-hidden bg-card border border-border/80 rounded-xl shadow-2xs select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium bg-card/90 border border-border/80 px-2.5 py-1 rounded-full shadow-2xs backdrop-blur-xs">
          <Grab className="w-3 h-3 text-primary" />
          <span>Drag canvas to pan or Ctrl+Scroll to zoom</span>
        </div>

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
            <TreeBranch
              node={treeData}
              highlight={highlightIds}
              collapsedMap={collapsedMap}
              onToggleCollapse={toggleCollapse}
              onSelectEmp={(e) => {
                if (e.id === 999999) return;
                setSelectedEmp(e);
                setManagerEditId(String(e.reportingManagerId || ''));
              }}
            />
          </div>
        )}
      </div>

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
                      const cfg = roleCfg((selectedEmp as any).accessRole);
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
                  ['Email', selectedEmp.email],
                  ['Mobile', selectedEmp.mobile || selectedEmp.phone || '—'],
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
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={managerEditId}
                    onChange={(e) => setManagerEditId(e.target.value)}
                  >
                    <option value="">— Reports to Organization Admin —</option>
                    {(employees as Employee[])
                      .filter((e) => e.id !== selectedEmp.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.employeeCode})
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
