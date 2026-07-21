import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '../hooks/useDepartments';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable } from '../components/DataTable';
import { DepartmentFormModal } from '../components/forms/DepartmentFormModal';

export function DepartmentsPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const { data: departmentsData, isLoading } = useDepartments(currentPage, pageSize, searchQuery, filters.status || '');
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const columns = [
    { key: 'name', label: 'Name', width: '30%' },
    { key: 'code', label: 'Code', width: '20%' },
    { key: 'status', label: 'Status', width: '15%' },
    { key: 'actions', label: 'Actions', width: '35%' },
  ];

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

      <DataTable
        columns={columns}
        data={departmentsData?.items || []}
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

