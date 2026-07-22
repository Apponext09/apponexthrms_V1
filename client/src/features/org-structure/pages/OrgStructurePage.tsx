import { useState, useMemo, useRef } from 'react';
import { useEmployees, useUpdateEmployee } from '@/features/employee/hooks/useEmployees';
import { EmployeeCreateModal } from '@/features/employee/components/EmployeeCreateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  UserPlus,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Building,
  Users,
  Shield,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '@/types';

interface TreeNode {
  employee: Employee | null; // null represents Root Company Admin Node
  isRoot?: boolean;
  children: TreeNode[];
}

export function OrgStructurePage() {
  const navigate = useNavigate();
  const { employees, isLoading, refetch } = useEmployees({ pageSize: 1000 });
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<Employee | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [managerEditId, setManagerEditId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook to update reporting manager
  const { updateEmployee, isLoading: isUpdatingManager } = useUpdateEmployee(selectedNode?.id || 0);

  // Build Tree Data from Employees list
  const treeData = useMemo(() => {
    if (!employees || employees.length === 0) return null;

    const nodeMap: Record<number, TreeNode> = {};

    // First create a node for each employee
    employees.forEach((emp: any) => {
      nodeMap[emp.id] = {
        employee: emp,
        children: [],
      };
    });

    const rootChildren: TreeNode[] = [];

    // Connect child nodes to their parent managers
    employees.forEach((emp: any) => {
      const managerId = emp.reportingManagerId || emp.reporting_manager_id;
      if (managerId && nodeMap[managerId] && managerId !== emp.id) {
        nodeMap[managerId].children.push(nodeMap[emp.id]);
      } else {
        // No parent manager -> reports directly to Root Company Admin
        rootChildren.push(nodeMap[emp.id]);
      }
    });

    // Root Company Node
    const rootNode: TreeNode = {
      employee: null,
      isRoot: true,
      children: rootChildren,
    };

    return rootNode;
  }, [employees]);

  // Toggle Collapse Node
  const toggleCollapse = (key: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Expand All / Collapse All
  const handleExpandAll = () => setCollapsedNodes({});
  const handleCollapseAll = () => {
    const next: Record<string, boolean> = { root: true };
    if (treeData) {
      const traverse = (node: TreeNode, key: string) => {
        if (node.children.length > 0) {
          next[key] = true;
          node.children.forEach((child, idx) => {
            const childKey = child.employee?.id ? String(child.employee.id) : `node-${idx}`;
            traverse(child, childKey);
          });
        }
      };
      traverse(treeData, 'root');
    }
    setCollapsedNodes(next);
  };

  // Change Reporting Manager Handler
  const handleManagerChange = async (newManagerId: string) => {
    if (!selectedNode || !selectedNode.id) return;
    try {
      await updateEmployee({
        reportingManagerId: newManagerId ? parseInt(newManagerId, 10) : null,
      } as any);
      setSelectedNode(null);
      refetch();
    } catch (err) {
      console.error('Failed to update reporting manager:', err);
    }
  };

  // Recursive Tree Node Component
  const renderTreeNode = (node: TreeNode, key: string) => {
    const isRoot = node.isRoot;
    const emp = node.employee;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedNodes[key];

    // Search matching logic
    const empName = emp ? [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ') : 'Trial Company';
    const isSearchMatch = searchTerm.trim() !== '' && empName.toLowerCase().includes(searchTerm.toLowerCase());

    const initials = emp ? `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() : 'TC';
    const designation = emp?.designation || (emp as any)?.currentDesignationName || (isRoot ? 'Admin' : 'EMPLOYEE');

    return (
      <div key={key} className="flex flex-col items-center flex-shrink-0">
        {/* Node Card */}
        <div className="relative group flex flex-col items-center">
          {isRoot ? (
            /* Root Company Node (Matching Reference Image Top Node) */
            <div
              className={`bg-white dark:bg-slate-900 border-2 ${
                isSearchMatch ? 'border-sky-500 ring-4 ring-sky-300' : 'border-sky-300 dark:border-sky-700'
              } rounded-xl shadow-lg p-3 min-w-[210px] max-w-[230px] flex flex-col items-center text-center relative z-10 transition-transform hover:scale-105`}
            >
              {/* Logo Badge Header */}
              <div className="flex items-center justify-center gap-1 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 px-2.5 py-0.5 rounded-md text-[11px] font-bold mb-2 border border-sky-200">
                <Building className="w-3.5 h-3.5" />
                <span>boshi</span>
              </div>

              {/* Main Name Capsule Pill */}
              <div className="bg-[#0096dc] text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-sm max-w-[190px] truncate">
                Trial Company
              </div>

              {/* Designation Subtitle */}
              <span className="text-[#0096dc] dark:text-sky-400 font-extrabold text-[11px] tracking-wider mt-1 uppercase">
                Admin
              </span>
            </div>
          ) : (
            /* Employee Node Card (Matching Reference Image Node Style) */
            <div
              onClick={() => {
                setSelectedNode(emp);
                setManagerEditId(String(emp?.reportingManagerId || ''));
              }}
              className={`bg-white dark:bg-slate-900 border ${
                isSearchMatch ? 'border-sky-500 ring-4 ring-sky-300' : 'border-sky-300 dark:border-sky-800'
              } rounded-xl shadow-md hover:shadow-xl p-3 pt-4 min-w-[195px] max-w-[215px] flex flex-col items-center text-center cursor-pointer relative z-10 transition-all duration-200 hover:-translate-y-1 group`}
            >
              {/* Top Center Round Avatar */}
              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-md overflow-hidden -mt-8 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-sm">
                <AvatarImage src={(emp as any)?.avatarUrl || undefined} alt={empName} />
                <AvatarFallback className="bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Employee Name Capsule Pill */}
              <div className="bg-[#0096dc] hover:bg-sky-600 text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-sm mt-2 max-w-[180px] truncate transition-colors">
                {empName}
              </div>

              {/* Designation Label */}
              <span className="text-[#0096dc] dark:text-sky-400 font-extrabold text-[10px] tracking-wider mt-1 uppercase max-w-[185px] truncate">
                {designation}
              </span>

              {/* Subordinate Count Pill */}
              {hasChildren && (
                <span className="mt-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  {node.children.length} direct report{node.children.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Expand / Collapse Button Toggle on Stem */}
          {hasChildren && (
            <div className="relative z-20 flex justify-center -mb-3.5 mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(key);
                }}
                className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-[#0096dc] text-[#0096dc] hover:bg-sky-50 dark:hover:bg-slate-700 flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                title={isCollapsed ? 'Expand branch' : 'Collapse branch'}
              >
                {isCollapsed ? <Plus className="w-3.5 h-3.5 stroke-[3]" /> : <Minus className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>
          )}
        </div>

        {/* Tree Connectors & Children */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center mt-3">
            {/* Vertical Stem Line from Parent */}
            <div className="w-0.5 h-6 bg-sky-300 dark:bg-sky-700" />

            {/* Children Container */}
            <div className="flex items-start relative pt-2">
              {/* Horizontal Line Connecting All Children */}
              {node.children.length > 1 && (
                <div
                  className="absolute top-0 border-t-2 border-sky-300 dark:border-sky-700"
                  style={{
                    left: `calc(100% / ${node.children.length * 2})`,
                    right: `calc(100% / ${node.children.length * 2})`,
                  }}
                />
              )}

              {/* Render Each Child Node */}
              {node.children.map((child, idx) => {
                const childKey = child.employee?.id ? String(child.employee.id) : `child-${key}-${idx}`;
                return (
                  <div key={childKey} className="flex flex-col items-center px-3 relative">
                    {/* Vertical Drop Line to Child Node */}
                    <div className="w-0.5 h-4 bg-sky-300 dark:bg-sky-700 -mt-2 mb-2" />
                    {renderTreeNode(child, childKey)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-4">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            Organization Structure
          </h1>
          <p className="text-sm text-muted-foreground">
            Visual reporting hierarchy of employees and management structure
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 rounded-none"
              onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.1))}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold px-2 min-w-[45px] text-center select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 rounded-none"
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.1))}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 rounded-none border-l"
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Expand / Collapse All */}
          <Button variant="outline" size="sm" onClick={handleExpandAll} className="h-9 text-xs gap-1">
            <ChevronDown className="w-3.5 h-3.5" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={handleCollapseAll} className="h-9 text-xs gap-1">
            <ChevronRight className="w-3.5 h-3.5" />
            Collapse All
          </Button>

          {/* Add Employee */}
          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Main Canvas View Area */}
      <Card className="flex-1 overflow-auto p-8 relative bg-slate-50/50 dark:bg-slate-950/50 border shadow-inner flex justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Loading organization hierarchy tree...
          </div>
        ) : !treeData ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mb-2" />
            <p className="font-semibold text-lg">No organization structure found</p>
            <p className="text-sm text-muted-foreground mb-4">Add employees to generate the reporting hierarchy tree.</p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" /> Add First Employee
            </Button>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="transition-transform duration-200 origin-top py-8 px-12 min-w-max"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {renderTreeNode(treeData, 'root')}
          </div>
        )}
      </Card>

      {/* Quick Employee Info & Manager Edit Dialog */}
      {selectedNode && (
        <Dialog open={Boolean(selectedNode)} onOpenChange={() => setSelectedNode(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={(selectedNode as any)?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-sky-500 text-white font-bold">
                    {selectedNode.firstName?.[0]}
                    {selectedNode.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-bold">
                    {selectedNode.firstName} {selectedNode.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{selectedNode.employeeCode}</div>
                </div>
              </DialogTitle>
              <DialogDescription>Employee Profile & Reporting Structure Details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block font-medium">Designation</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {selectedNode.designation || (selectedNode as any).currentDesignationName || 'Staff Member'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Email</span>
                  <span className="font-semibold truncate block">{selectedNode.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Mobile</span>
                  <span className="font-semibold">{selectedNode.mobile || selectedNode.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Joining Date</span>
                  <span className="font-semibold">
                    {selectedNode.dateOfJoining ? new Date(selectedNode.dateOfJoining).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>

              {/* Manager Reassignment Form */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-bold block text-foreground">Change Reporting Manager</label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={managerEditId}
                    onChange={(e) => setManagerEditId(e.target.value)}
                  >
                    <option value="">-- Direct to Root Admin --</option>
                    {employees
                      .filter((e: any) => e.id !== selectedNode.id)
                      .map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.employeeCode})
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => handleManagerChange(managerEditId)}
                    disabled={isUpdatingManager}
                  >
                    {isUpdatingManager ? 'Saving...' : 'Update'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  const id = selectedNode.id;
                  setSelectedNode(null);
                  navigate(`/employees/${id}`);
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Profile
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Employee Create Modal */}
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
