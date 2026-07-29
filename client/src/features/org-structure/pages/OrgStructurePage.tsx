import { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { useEmployees, useUpdateEmployee } from '@/features/employee/hooks/useEmployees';
import { EmployeeCreateModal } from '@/features/employee/components/EmployeeCreateModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
// Concise Minimalist Tree Node Component
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

      {/* Concise Minimalist Node Card */}
      <div
        onClick={onClick}
        className={`group relative flex flex-col items-center bg-card border shadow-xs hover:shadow-md rounded-xl p-2.5
          w-[155px] min-h-[92px] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer select-none
          ${
            highlight
              ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
              : isAdmin
              ? 'border-primary/60 bg-primary/5'
              : 'border-border/80 hover:border-primary/50'
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
  const exportTreeRef = useRef<HTMLDivElement>(null);

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
            </h1>
            <p className="text-xs text-muted-foreground">
              Interactive Org Tree: Admin ➔ Department Manager ➔ Team Lead ➔ Employee / Intern
            </p>
          </div>
        </div>

        {/* Action Controls & Zoom Bar aligned in single row */}
        <div className="flex items-center gap-2.5 shrink-0">
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
            <div ref={exportTreeRef} className="w-fit min-w-full flex justify-center p-6 bg-card text-foreground rounded-xl">
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
