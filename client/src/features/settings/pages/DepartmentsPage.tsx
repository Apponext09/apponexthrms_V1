import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useRbac } from '@/lib/rbac';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useAssignDepartmentManager,
} from '../hooks/useDepartments';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable, type Column } from '../components/DataTable';
import { DepartmentFormModal } from '../components/forms/DepartmentFormModal';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

export function DepartmentsPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const { data: departmentsData, isLoading } = useDepartments(
    currentPage,
    pageSize,
    searchQuery,
    filters.status || ''
  );
  const { employees } = useEmployees({ pageSize: 500 });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Department',
      width: '28%',
      render: (val, item) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-foreground leading-snug">{val}</p>
            {item.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{item.description}</p>
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
          <span>{val}</span>
        </span>
      ),
    },
    {
      key: 'employeeCount',
      label: 'Headcount',
      width: '14%',
      render: (val) => (
        <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5">
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
            <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    { key: 'actions', label: 'Actions', width: '10%' },
  ];

  const departmentRows = (departmentsData?.items || []).map((department: any) => {
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

  const managerQueries = useQueries({
    queries: departmentRows.map((department: any) => ({
      queryKey: ['department-managers', department.id],
      queryFn: async () => {
        const response = await apiClient.get(`/settings/departments/${department.id}/managers`);
        return response.data?.data || [];
      },
      enabled: !!department.id,
    })),
  });

  const handleSubmit = async (data: any) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving department:', error);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting department:', error);
      }
    }
  };

  const managedDeptsCount = departmentRows.filter(
    (d: any) => d.departmentManager !== 'Not assigned'
  ).length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
      {/* ─── Compact Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              Departments
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage organization structure, department leads, and headcount.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={openModal}
          className="h-8 text-xs font-semibold gap-1.5 px-3 self-start sm:self-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Department
        </Button>
      </div>

      {/* ─── Summary Stats Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total Departments</p>
              <p className="text-xl font-black text-foreground mt-0.5">{departmentsData?.meta?.total || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Assigned Employees</p>
              <p className="text-xl font-black text-foreground mt-0.5">{employees.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Departments with Lead</p>
              <p className="text-xl font-black text-foreground mt-0.5">{managedDeptsCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Department Cards Overview ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-foreground">Department Overview</h2>
          <span className="text-[11px] text-muted-foreground font-medium">
            Showing {departmentRows.length} departments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {departmentRows.map((department: any) => {
            const isActive = (department.status || 'active').toLowerCase() === 'active';

            return (
              <Card
                key={department.id}
                className="border border-border/80 shadow-2xs rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-foreground leading-tight">{department.name}</h3>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                          {department.code}
                        </span>
                      </div>
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
                        onClick={() => {
                          useSettingsStore.setState({ editingId: department.id });
                          openModal();
                        }}
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
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Dept. Manager:
                    </span>
                    <span className="font-bold text-foreground text-[11px]">
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
      </div>

      {/* ─── Compact Data Table ─── */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-foreground">Department Registry Table</h2>
          <span className="text-[11px] text-muted-foreground font-medium">Detailed List View</span>
        </div>

        <DataTable
          columns={columns}
          data={departmentRows}
          isLoading={isLoading}
          onEdit={(item) => {
            useSettingsStore.setState({ editingId: item.id });
            openModal();
          }}
          onDelete={handleDelete}
          pagination={{
            page: currentPage,
            pageSize: pageSize,
            total: departmentsData?.meta?.total || 0,
          }}
        />
      </div>

      {isModalOpen && <DepartmentFormModal onSubmit={handleSubmit} onClose={closeModal} editingId={editingId} />}
    </div>
  );
}
