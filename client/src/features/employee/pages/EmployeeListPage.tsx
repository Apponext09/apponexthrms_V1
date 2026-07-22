import React, { useEffect, useState } from 'react';
import { Plus, Search, FilterIcon, Upload, Download, X } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeDataTable } from '../components/EmployeeDataTable';
import { EmployeeCreateModal } from '../components/EmployeeCreateModal';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/config/api';

export function EmployeeListPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<string>('');

  const { employees, total, isLoading, error, refetch } = useEmployees({
    page,
    pageSize,
    search: searchTerm,
    status,
    employmentType,
  });

  useEffect(() => {
    refetch();
  }, [page, pageSize, searchTerm, status, employmentType]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleEmploymentTypeChange = (newType: string) => {
    setEmploymentType(newType);
    setPage(1);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/employees/upload/sample', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download template', err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your organization's employees</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4" />
            Download Sample
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            className="gap-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={status || employmentType ? 'secondary' : 'outline'} 
                size="sm" 
                className="px-3 gap-2"
              >
                <FilterIcon className="w-4 h-4" />
                <span>Filter</span>
                {(status || employmentType) && (
                  <Badge variant="success" className="ml-1 px-1.5 py-0">
                    {(status && employmentType) ? '2' : '1'}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter Employees</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuRadioGroup value={status} onValueChange={handleStatusChange}>
                    <DropdownMenuRadioItem value="">All Statuses</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive">Inactive</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="probation">Probation</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="candidate">Candidate</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="onboarding">Onboarding</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="notice">Notice</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="exit">Exit</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="alumni">Alumni</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Employment Type</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuRadioGroup value={employmentType} onValueChange={handleEmploymentTypeChange}>
                    <DropdownMenuRadioItem value="">All Types</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="full_time">Full Time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="part_time">Part Time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="contract">Contract</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="internship">Internship</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {(status || employmentType) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 justify-center cursor-pointer font-medium"
                    onClick={() => {
                      setStatus('');
                      setEmploymentType('');
                      setPage(1);
                    }}
                  >
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Filters Display */}
        {(status || employmentType) && (
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-muted-foreground">Active Filters:</span>
            {status && (
              <Badge variant="outline" className="gap-1 px-2 py-0.5">
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-600" 
                  onClick={() => handleStatusChange('')} 
                />
              </Badge>
            )}
            {employmentType && (
              <Badge variant="outline" className="gap-1 px-2 py-0.5">
                Type: {employmentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-600" 
                  onClick={() => handleEmploymentTypeChange('')} 
                />
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setStatus('');
                setEmploymentType('');
                setPage(1);
              }}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600"
            >
              Clear all
            </Button>
          </div>
        )}
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

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        onSuccess={() => {
          setIsBulkModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}



