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
import { useDepartments } from '@/features/settings/hooks/useDepartments';
import { useDesignations } from '@/features/settings/hooks/useDesignations';
import { useLocations } from '@/features/settings/hooks/useLocations';
import { useEmployeeCustomizationStore } from '../store/employeeCustomizationStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export function EmployeeListPage() {
  const { config } = useEmployeeCustomizationStore();
  const { selectedCompanyId, selectedCompanyName } = useCompanyStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.defaultPageSize || 25);
  const [status, setStatus] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [designationId, setDesignationId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');

  const { data: departmentsData } = useDepartments(1, 100);
  const { designations } = useDesignations();
  const { data: locationsData } = useLocations(1, 100);

  const departmentsList = (departmentsData?.data || departmentsData?.items || []) as any[];
  const locationsList = (locationsData?.data || locationsData?.items || []) as any[];

  const { employees, total, isLoading, error, refetch } = useEmployees({
    page: config.enablePagination ? page : 1,
    pageSize: config.enablePagination ? pageSize : 1000,
    search: config.enableSearchBar ? searchTerm : '',
    status,
    employmentType,
  });

  // Client-side filtering for department, designation, and location if needed
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp: any) => {
      if (departmentId && String(emp.departmentId || emp.department_id || emp.currentDepartmentId || '') !== departmentId) {
        return false;
      }
      if (designationId && String(emp.designationId || emp.designation_id || '') !== designationId) {
        return false;
      }
      if (locationId && String(emp.locationId || emp.location_id || '') !== locationId) {
        return false;
      }
      return true;
    });
  }, [employees, departmentId, designationId, locationId]);

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

  const activeFiltersCount = [status, employmentType, departmentId, designationId, locationId].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatus('');
    setEmploymentType('');
    setDepartmentId('');
    setDesignationId('');
    setLocationId('');
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full gap-4 pb-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Employees Directory</h1>
            {selectedCompanyName && (
              <Badge variant="outline" className="font-bold text-[11px] px-2 bg-primary/5 text-primary border-primary/20">
                {selectedCompanyName}
              </Badge>
            )}
            {total > 0 && (
              <Badge variant="secondary" className="font-bold text-[11px] px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {total} Staff
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            View, search, filter, and manage your organization's employee records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {config.enableBulkUpload && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              onClick={() => setIsBulkModalOpen(true)}
            >
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              Bulk Upload
            </Button>
          )}

          {config.enableAddEmployee && (
            <Button
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      {(config.enableSearchBar || config.enableFilterOption) && (
        <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {config.enableSearchBar && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search employee by name, code, email, department..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 pr-8 h-9 text-xs bg-muted/20"
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
            )}

            {config.enableFilterOption && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeFiltersCount > 0 ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-9 px-3 gap-2 text-xs font-semibold cursor-pointer"
                  >
                    <FilterIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Filter Options</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="default" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs max-h-96 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs font-bold">Filter Employees</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Status Submenu */}
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

                  {/* Employment Type Submenu */}
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

                  {/* Department Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">Department</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52 text-xs max-h-60 overflow-y-auto">
                      <DropdownMenuRadioGroup value={departmentId} onValueChange={(val) => { setDepartmentId(val); setPage(1); }}>
                        <DropdownMenuRadioItem value="" className="text-xs">All Departments</DropdownMenuRadioItem>
                        {departmentsList.map((dept: any) => (
                          <DropdownMenuRadioItem key={dept.id} value={String(dept.id)} className="text-xs truncate">
                            {dept.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Designation Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">Designation</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52 text-xs max-h-60 overflow-y-auto">
                      <DropdownMenuRadioGroup value={designationId} onValueChange={(val) => { setDesignationId(val); setPage(1); }}>
                        <DropdownMenuRadioItem value="" className="text-xs">All Designations</DropdownMenuRadioItem>
                        {designations.map((desig: any) => (
                          <DropdownMenuRadioItem key={desig.id} value={String(desig.id)} className="text-xs truncate">
                            {desig.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Location Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">Location</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52 text-xs max-h-60 overflow-y-auto">
                      <DropdownMenuRadioGroup value={locationId} onValueChange={(val) => { setLocationId(val); setPage(1); }}>
                        <DropdownMenuRadioItem value="" className="text-xs">All Locations</DropdownMenuRadioItem>
                        {locationsList.map((loc: any) => (
                          <DropdownMenuRadioItem key={loc.id} value={String(loc.id)} className="text-xs truncate">
                            {loc.name || loc.cityName}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {activeFiltersCount > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 justify-center cursor-pointer font-medium text-xs"
                        onClick={clearAllFilters}
                      >
                        Clear All Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Active Filters Pills */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
              <span className="text-muted-foreground font-medium">Active Filters:</span>
              {status && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                  Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1" onClick={() => handleStatusChange('')} />
                </Badge>
              )}
              {employmentType && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                  Type: {employmentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1" onClick={() => handleEmploymentTypeChange('')} />
                </Badge>
              )}
              {departmentId && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                  Dept: {departmentsList.find((d: any) => String(d.id) === departmentId)?.name || departmentId}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1" onClick={() => setDepartmentId('')} />
                </Badge>
              )}
              {designationId && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                  Desig: {designations.find((d: any) => String(d.id) === designationId)?.name || designationId}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1" onClick={() => setDesignationId('')} />
                </Badge>
              )}
              {locationId && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs bg-muted/40">
                  Location: {locationsList.find((l: any) => String(l.id) === locationId)?.name || locationId}
                  <X className="w-3 h-3 cursor-pointer hover:text-red-600 ml-1" onClick={() => setLocationId('')} />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600 cursor-pointer"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="flex-1 bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xs">
        {error ? (
          <div className="p-4 text-xs font-semibold text-rose-600">Error: {error}</div>
        ) : (
          <EmployeeDataTable
            employees={filteredEmployees}
            isLoading={isLoading}
            onRefresh={refetch}
            tableColumns={config.tableColumns}
          />
        )}
      </div>

      {/* Pagination Controls */}
      {config.enablePagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground bg-card border border-border/80 rounded-xl p-3 sm:px-4 shadow-2xs">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of <strong className="text-foreground">{total}</strong> employees
            </span>
            <div className="flex items-center gap-2 border-l border-border/60 pl-4">
              <label htmlFor="pageSizeSelect" className="text-xs text-muted-foreground">Rows per page:</label>
              <select
                id="pageSizeSelect"
                className="h-7 rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
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
              className="h-7 text-xs px-2.5 cursor-pointer"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 text-xs px-2.5 cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= total}
              className="h-7 text-xs px-2.5 cursor-pointer"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.ceil(total / pageSize))}
              disabled={page * pageSize >= total || total === 0}
              className="h-7 text-xs px-2.5 cursor-pointer"
            >
              Last
            </Button>
          </div>
        </div>
      )}

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

export default EmployeeListPage;
