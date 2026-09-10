import { useState, useMemo } from 'react';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '../hooks/useDepartments';
import { DataTable, type Column } from '../components/DataTable';
import { DepartmentFormModal } from '../components/forms/DepartmentFormModal';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DepartmentsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const { data: departmentsData, isLoading } = useDepartments(
    1,
    500,
    '',
    ''
  );
  const { employees } = useEmployees({ pageSize: 500 });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const departmentRows = useMemo(() => {
    return (departmentsData?.items || []).map((department: any) => {
      const headId = department.departmentHeadId ?? department.department_head_id;
      const manager = employees.find((employee: any) => employee.id === headId);
      const departmentEmployees = employees.filter(
        (employee: any) =>
          (employee.currentDepartmentId ?? employee.current_department_id) === department.id
      );

      return {
        ...department,
        departmentManager: manager
          ? `${manager.firstName} ${manager.lastName}`
          : 'Not assigned',
        employeeCount: departmentEmployees.length,
        directReports: headId
          ? departmentEmployees.filter(
              (employee: any) =>
                (employee.reportingManagerId ?? employee.reporting_manager_id) === headId
            ).length
          : 0,
        departmentEmployees,
      };
    });
  }, [departmentsData, employees]);

  // Filtered rows for search & status
  const filteredRows = useMemo(() => {
    let result = departmentRows;

    if (statusFilter !== 'all') {
      result = result.filter(
        (d: any) => (d.status || 'active').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d: any) =>
          d.name?.toLowerCase().includes(q) ||
          d.code?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.departmentManager?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [departmentRows, searchQuery, statusFilter]);

  // Paginated slice for table view
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const managedDeptsCount = useMemo(() => {
    return departmentRows.filter((d: any) => d.departmentManager !== 'Not assigned').length;
  }, [departmentRows]);

  const activeDeptsCount = useMemo(() => {
    return departmentRows.filter((d: any) => (d.status || 'active').toLowerCase() === 'active').length;
  }, [departmentRows]);

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Department',
      width: '28%',
      render: (val, item) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground leading-snug truncate">{val}</p>
            {item.description ? (
              <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                {item.description}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/70">No description</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      width: '14%',
      render: (val) => (
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'departmentManager',
      label: 'Dept. Manager',
      width: '24%',
      render: (val) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{val}</span>
        </span>
      ),
    },
    {
      key: 'employeeCount',
      label: 'Headcount',
      width: '14%',
      render: (val) => (
        <Badge
          variant="secondary"
          className="font-bold text-xs bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5"
        >
          {val} Employees
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (val) => {
        const isActive = (val || 'active').toLowerCase() === 'active';
        return (
          <Badge
            variant="outline"
            className={`text-[10px] font-bold py-0.5 px-2 ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${
                isActive ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    { key: 'actions', label: 'Actions', width: '10%' },
  ];

  const handleOpenModal = (id: string | number | null = null) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data });
        toast.success('Department updated successfully!');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Department created successfully!');
      }
      handleCloseModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save department.');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Department deleted successfully!');
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to delete department.');
      }
    }
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto w-full">
      {/* ─── Compact Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              Departments
            </h1>
            <p className="text-xs text-muted-foreground font-medium line-clamp-1 sm:line-clamp-none">
              Manage organization structure, departmental leads, divisions, and staff headcounts.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => handleOpenModal(null)}
          className="h-8 sm:h-9 text-xs font-bold gap-1.5 px-3.5 self-stretch sm:self-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </Button>
      </div>

      {/* ─── Summary Stats Cards (Responsive Grid) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Departments
              </p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{departmentRows.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Employees
              </p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{employees.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Departments with Lead
              </p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{managedDeptsCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filter & Search Control Bar ─── */}
      <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search departments by name, code, manager, description..."
            className="pl-9 pr-8 h-8 text-xs bg-background rounded-lg border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Pills */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-semibold">
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-md capitalize transition-all cursor-pointer',
                  statusFilter === st
                    ? 'bg-background text-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50">
            <button
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={cn(
                'p-1.5 rounded-md transition-all cursor-pointer',
                viewMode === 'cards'
                  ? 'bg-background text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={cn(
                'p-1.5 rounded-md transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-background text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content Section ─── */}
      {viewMode === 'cards' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide">
              Department Overview
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium">
              Showing {filteredRows.length} departments
            </span>
          </div>

          {filteredRows.length === 0 ? (
            <Card className="border border-dashed border-border rounded-2xl bg-card p-12 text-center">
              <div className="p-3 rounded-full bg-muted text-muted-foreground inline-block mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No departments found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search filters to find what you are looking for.'
                  : 'Get started by creating your first organizational department.'}
              </p>
              <Button
                size="sm"
                onClick={() => handleOpenModal(null)}
                className="mt-4 h-8 text-xs font-bold gap-1.5 px-3.5 bg-primary text-primary-foreground rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add Department
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
              {filteredRows.map((department: any) => {
                const isActive = (department.status || 'active').toLowerCase() === 'active';

                return (
                  <Card
                    key={department.id}
                    className="border border-border/80 shadow-2xs rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Card Top Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-sm text-foreground leading-tight truncate">
                              {department.name}
                            </h3>
                            {department.code && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                {department.code}
                              </span>
                            )}
                          </div>
                          {department.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {department.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold py-0.5 px-2 ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenModal(department.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-muted"
                            title="Edit Department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(department.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Delete Department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Manager Row */}
                      <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-lg border border-border/50">
                        <span className="text-muted-foreground font-medium text-[11px] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" /> Dept. Manager:
                        </span>
                        <span className="font-bold text-foreground text-[11px] truncate max-w-[150px]">
                          {department.departmentManager}
                        </span>
                      </div>

                      {/* Footer Counts */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                        <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/20">
                          <span className="text-[11px] text-muted-foreground">Total Staff:</span>
                          <span className="font-bold text-foreground">{department.employeeCount}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/20">
                          <span className="text-[11px] text-muted-foreground">Direct Reports:</span>
                          <span className="font-bold text-foreground">{department.directReports}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── Compact Data Table View ─── */
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide">
              Department Registry Table
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium">Detailed List View</span>
          </div>

          <DataTable
            columns={columns}
            data={paginatedRows}
            isLoading={isLoading}
            onEdit={(item) => handleOpenModal(item.id)}
            onDelete={handleDelete}
            pagination={{
              page: currentPage,
              pageSize: pageSize,
              total: filteredRows.length,
            }}
          />
        </div>
      )}

      {isModalOpen && (
        <DepartmentFormModal
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
          editingId={editingId}
        />
      )}
    </div>
  );
}
