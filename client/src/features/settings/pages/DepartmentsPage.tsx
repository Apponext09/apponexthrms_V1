import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useRbac } from '@/lib/rbac';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useAssignDepartmentManager } from '../hooks/useDepartments';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable } from '../components/DataTable';
import { DepartmentFormModal } from '../components/forms/DepartmentFormModal';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { Edit2, Trash2 } from 'lucide-react';

const managerTypeLabels: Record<string, string> = {
  department_manager: 'Dept. Manager',
  team_lead: 'Team Lead',
  hr_contact: 'HR Contact',
};

export function DepartmentsPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();
  const { hasAnyRole } = useRbac();

  const { data: departmentsData, isLoading } = useDepartments(currentPage, pageSize, searchQuery, filters.status || '');
  const { employees } = useEmployees({ pageSize: 500 });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  const assignMutation = useAssignDepartmentManager();
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, { employeeId: string; managerType: string }>>({});
  const [assigningDeptId, setAssigningDeptId] = useState<number | null>(null);
  const canManageDepartmentTeam = hasAnyRole(['organization_admin', 'hr_manager']);

  const columns = [
    { key: 'name', label: 'Department', width: '35%' },
    { key: 'code', label: 'Code', width: '15%' },
    { key: 'employeeCount', label: 'Employees', width: '15%' },
    { key: 'directReports', label: 'Reports to Manager', width: '15%' },
    { key: 'status', label: 'Status', width: '10%' },
    { key: 'actions', label: 'Actions', width: '10%' },
  ];

  const departmentRows = (departmentsData?.items || []).map((department: any) => {
    const headId = department.departmentHeadId ?? department.department_head_id;
    const manager = employees.find((employee: any) => employee.id === headId);
    const departmentEmployees = employees.filter((employee: any) =>
      (employee.currentDepartmentId ?? employee.current_department_id) === department.id
    );

    return {
      ...department,
      departmentManager: manager
        ? `${manager.firstName} ${manager.lastName}`
        : 'Not assigned',
      employeeCount: departmentEmployees.length,
      directReports: headId
        ? departmentEmployees.filter((employee: any) =>
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

  const departmentManagersByDepartment: Record<number, any[]> = {};
  departmentRows.forEach((department: any, index: number) => {
    departmentManagersByDepartment[department.id] = (managerQueries[index]?.data as any[]) || [];
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

  const handleAssignManager = async (departmentId: number) => {
    const draft = assignmentDrafts[departmentId];
    if (!draft?.employeeId || !draft?.managerType) return;

    try {
      await assignMutation.mutateAsync({
        departmentId,
        employeeId: Number(draft.employeeId),
        managerType: draft.managerType as 'department_manager' | 'team_lead' | 'hr_contact',
      });

      setAssignmentDrafts((current) => ({
        ...current,
        [departmentId]: { employeeId: '', managerType: 'department_manager' },
      }));
      setAssigningDeptId(null);
    } catch (error) {
      console.error('Error assigning department manager:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Departments</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Department
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-sm text-muted-foreground">Total Departments</p>
          <p className="text-2xl font-bold">{departmentsData?.meta?.total || 0}</p>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-sm text-muted-foreground">Employees Assigned</p>
          <p className="text-2xl font-bold">{employees.length}</p>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-sm text-muted-foreground">Departments with Manager</p>
          <p className="text-2xl font-bold">{departmentRows.filter((d: any) => d.departmentManager !== 'Not assigned').length}</p>
        </div>
      </div>

      {/* Department Cards */}
      <div className="mb-8">
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Department Overview</h2>
          <p className="text-sm text-muted-foreground">Managers, headcount, and reporting structure at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departmentRows.map((department: any) => {
            const managers = departmentManagersByDepartment[department.id] || [];
            const isAssigning = assigningDeptId === department.id;
            const draft = assignmentDrafts[department.id] || { employeeId: '', managerType: 'department_manager' };

            return (
              <div key={department.id} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">

                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base leading-tight">{department.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{department.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      department.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {department.status || 'active'}
                    </span>
                    <button
                      onClick={() => {
                        useSettingsStore.setState({ editingId: department.id });
                        openModal();
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(department.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Primary Manager Row */}
                <div className="flex items-center justify-between text-sm border-b pb-3">
                  <span className="text-muted-foreground text-xs">Dept. Manager</span>
                  <span className="font-medium text-xs text-right">{department.departmentManager}</span>
                </div>



                {/* Footer Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t mt-auto">
                  <div>
                    <p className="text-xl font-bold">{department.employeeCount}</p>
                    <p className="text-xs text-muted-foreground">Employees</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{department.directReports}</p>
                    <p className="text-xs text-muted-foreground">Direct Reports</p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
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

      {isModalOpen && <DepartmentFormModal onSubmit={handleSubmit} onClose={closeModal} editingId={editingId} />}
    </div>
  );
}
