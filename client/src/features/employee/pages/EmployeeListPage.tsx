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
  const [pageSize, setPageSize] = useState(25);
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
    <div className="flex flex-col h-full gap-4 pb-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Employees Directory</h1>
            {total > 0 && (
              <Badge variant="secondary" className="font-bold text-[11px] px-2 bg-primary/10 text-primary border-primary/20">
                {total} Staff
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            View, search, filter, and manage your organization's employee records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Download Sample
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Bulk Upload
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              placeholder="Search employee by name, code, email, department..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {searchTerm && (
              <X
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
              />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={status || employmentType ? 'secondary' : 'outline'}
                size="sm"
                className="h-9 px-3 gap-2 text-xs font-semibold"
              >
                <FilterIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Filter Options</span>
                {(status || employmentType) && (
                  <Badge variant="default" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold">
                    {(status && employmentType) ? '2' : '1'}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-xs">Filter Employees</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48 text-xs">
                  <DropdownMenuRadioGroup value={status} onValueChange={handleStatusChange}>
                    <DropdownMenuRadioItem value="" className="text-xs">All Statuses</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active" className="text-xs">Active</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive" className="text-xs">Inactive</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="probation" className="text-xs">Probation</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="candidate" className="text-xs">Candidate</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="onboarding" className="text-xs">Onboarding</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="notice" className="text-xs">Notice</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="exit" className="text-xs">Exit</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="alumni" className="text-xs">Alumni</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">Employment Type</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48 text-xs">
                  <DropdownMenuRadioGroup value={employmentType} onValueChange={handleEmploymentTypeChange}>
                    <DropdownMenuRadioItem value="" className="text-xs">All Types</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="full_time" className="text-xs">Full Time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="part_time" className="text-xs">Part Time</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="contract" className="text-xs">Contract</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="internship" className="text-xs">Internship</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {(status || employmentType) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 justify-center cursor-pointer font-medium text-xs"
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
          <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
            <span className="text-muted-foreground font-medium">Active Filters:</span>
            {status && (
              <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1"
                  onClick={() => handleStatusChange('')}
                />
              </Badge>
            )}
            {employmentType && (
              <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                Type: {employmentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1"
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
      <div className="flex-1 bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xs">
        {error ? (
          <div className="p-4 text-xs font-semibold text-rose-600">Error: {error}</div>
        ) : (
          <EmployeeDataTable
            employees={employees}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground bg-card border border-border/80 rounded-xl p-3 sm:px-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <span className="font-medium">
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of <strong className="text-foreground">{total}</strong> employees
          </span>
          <div className="flex items-center gap-2 border-l border-border/60 pl-4">
            <label htmlFor="pageSizeSelect" className="text-xs text-muted-foreground">Rows per page:</label>
            <select
              id="pageSizeSelect"
              className="h-7 rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs mr-2 font-medium">
            Page <strong className="text-foreground">{Math.ceil(total / pageSize) === 0 ? 0 : page}</strong> of {Math.ceil(total / pageSize) || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="h-7 text-xs px-2.5"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-7 text-xs px-2.5"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page * pageSize >= total}
            className="h-7 text-xs px-2.5"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.ceil(total / pageSize))}
            disabled={page * pageSize >= total || total === 0}
            className="h-7 text-xs px-2.5"
          >
            Last
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



