import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '../hooks/useBranches';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable } from '../components/DataTable';
import { BranchFormModal } from '../components/forms/BranchFormModal';

export function BranchesPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const { data: branchesData, isLoading } = useBranches(currentPage, pageSize, searchQuery, filters.status || '');
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const columns = [
    { key: 'name', label: 'Name', width: '25%' },
    { key: 'code', label: 'Code', width: '15%' },
    { key: 'city', label: 'City', width: '20%' },
    { key: 'status', label: 'Status', width: '15%' },
    { key: 'actions', label: 'Actions', width: '25%' },
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
      console.error('Error saving branch:', error);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting branch:', error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Branches</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Branch
        </button>
      </div>

      <DataTable
        columns={columns}
        data={branchesData?.items || []}
        isLoading={isLoading}
        onEdit={(item) => {
          useSettingsStore.setState({ editingId: item.id });
          openModal();
        }}
        onDelete={handleDelete}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: branchesData?.meta?.total || 0,
        }}
      />

      {isModalOpen && <BranchFormModal onSubmit={handleSubmit} onClose={closeModal} editingId={editingId} />}
    </div>
  );
}
