import React, { useState, useMemo } from 'react';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '../hooks/useBranches';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable } from '../components/DataTable';
import { BranchFormModal } from '../components/forms/BranchFormModal';

export function BranchesPage() {
  const { currentPage, pageSize, searchQuery, setSearchQuery, filters, setFilter, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const [searchField, setSearchField] = useState<'all' | 'name' | 'code'>('all');

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

  const filteredItems = useMemo(() => {
    const rawItems = branchesData?.items || [];
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase();
    return rawItems.filter((item: any) => {
      if (searchField === 'name') return item.name?.toLowerCase().includes(q);
      if (searchField === 'code') return item.code?.toLowerCase().includes(q);
      return item.name?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q);
    });
  }, [branchesData?.items, searchQuery, searchField]);

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
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Branches</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage organization branch offices and locations.</p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs self-start sm:self-auto"
        >
          Add Branch
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as 'all' | 'name' | 'code')}
          className="h-9 px-3 text-xs border border-input rounded-lg bg-background text-foreground font-medium"
        >
          <option value="all">All Fields</option>
          <option value="name">Branch Name</option>
          <option value="code">Branch Code</option>
        </select>

        <input
          type="text"
          placeholder="Search term..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 px-3 text-xs border border-input rounded-lg bg-background text-foreground w-60"
        />

        <select
          value={filters.status || 'all'}
          onChange={(e) => setFilter('status', e.target.value === 'all' ? '' : e.target.value)}
          className="h-9 px-3 text-xs border border-input rounded-lg bg-background text-foreground font-medium"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
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
