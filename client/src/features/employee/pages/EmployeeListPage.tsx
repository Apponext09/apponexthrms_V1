import React, { useEffect, useState } from 'react';
import { Plus, Search, FilterIcon } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeDataTable } from '../components/EmployeeDataTable';
import { EmployeeCreateModal } from '../components/EmployeeCreateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EmployeeListPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { employees, total, isLoading, error, refetch } = useEmployees({
    page,
    pageSize,
    search: searchTerm,
  });

  useEffect(() => {
    refetch();
  }, [page, pageSize, searchTerm]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your organization's employees</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" className="px-3">
          <FilterIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto border rounded-lg">
        {error ? (
          <div className="p-4 text-red-600">Error: {error}</div>
        ) : (
          <EmployeeDataTable
            employees={employees}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        )}
      </div>

      {/* Pagination Info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Showing {employees.length} of {total} employees</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page * pageSize >= total}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create Modal */}
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



