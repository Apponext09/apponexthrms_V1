import React, { useState } from 'react';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '../hooks/useLocations';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable } from '../components/DataTable';
import { LocationFormModal } from '../components/forms/LocationFormModal';

export function LocationsPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const { data: locationsData, isLoading } = useLocations(currentPage, pageSize, searchQuery, filters.type || '', filters.status || 'all');
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const deleteMutation = useDeleteLocation();

  const columns = [
    { key: 'name', label: 'Name', width: '25%' },
    { key: 'code', label: 'Code', width: '15%' },
    { key: 'type', label: 'Type', width: '15%' },
    { key: 'city', label: 'City', width: '20%' },
    { key: 'status', label: 'Status', width: '10%' },
    { key: 'actions', label: 'Actions', width: '15%' },
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
      console.error('Error saving location:', error);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting location:', error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Locations</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Location
        </button>
      </div>

      <DataTable
        columns={columns}
        data={locationsData?.items || []}
        isLoading={isLoading}
        onEdit={(item) => {
          useSettingsStore.setState({ editingId: item.id });
          openModal();
        }}
        onDelete={handleDelete}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: locationsData?.meta?.total || 0,
        }}
      />

      {isModalOpen && <LocationFormModal onSubmit={handleSubmit} onClose={closeModal} editingId={editingId} />}
    </div>
  );
}
