import React, { useEffect, useState } from 'react';
import { Plus, Search, FilterIcon, Upload, Download, X, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
import { useAdminDashboard } from '@/features/dashboard/hooks/useAdminDashboard';
import { useAuthStore } from '@/features/auth/store/authStore';

// ─── Design tokens (light-blue / white / navy) ───────────────────────────────
const tokens = {
  pageBg: 'var(--elp-page-bg)', cardBg: 'var(--elp-card-bg)', border: 'var(--elp-border)', borderLight: 'var(--elp-border-light)',
  navy: 'var(--elp-foreground)', navyMid: 'var(--elp-foreground-muted)', bluePrimary: '#2563EB', blueHover: '#1D4ED8',
  blueLight: 'var(--elp-accent-bg)', blueMid: 'var(--elp-accent-border)', muted: 'var(--elp-muted)', mutedLight: 'var(--elp-muted-light)', mutedBg: 'var(--elp-muted-bg)',
  success: '#059669', successBg: 'var(--elp-success-bg)', danger: '#DC2626', dangerBg: 'var(--elp-danger-bg)',
  shadow: 'var(--elp-shadow)', shadowMd: 'var(--elp-shadow-md)',
};

// ─── Inline style helpers ─────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: tokens.cardBg,
  border: `1px solid ${tokens.border}`,
  borderRadius: 12,
  boxShadow: tokens.shadow,
};

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 9px',
  borderRadius: 20,
  border: `1px solid`,
  lineHeight: 1.5,
  whiteSpace: 'nowrap' as const,
};

export function EmployeeListPage() {
  const { config } = useEmployeeCustomizationStore();
  const { selectedCompanyId, selectedCompanyName } = useCompanyStore();
  const { data: dashboardData } = useAdminDashboard();
  const { user } = useAuthStore();

  const orgLocation = dashboardData?.companyInfo?.location || user?.organizationLocation;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.defaultPageSize || 25);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [designationId, setDesignationId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: departmentsData } = useDepartments(1, 100);
  const { designations } = useDesignations();
  const { data: locationsData } = useLocations(1, 100);

  const departmentsList = (departmentsData?.data || departmentsData?.items || []) as any[];
  const locationsList = (locationsData?.data || locationsData?.items || [])
    .filter((loc: any) => loc.status !== 'inactive' && loc.status !== 'Inactive' && loc.is_active !== 'No' && loc.isActive !== 'No') as any[];

  const { employees, total, isLoading, error, refetch } = useEmployees({
    page: config.enablePagination ? page : 1,
    pageSize: config.enablePagination ? pageSize : 1000,
    search: config.enableSearchBar ? searchTerm : '',
    status: statusFilter,
  });

  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp: any) => {
      const lifecycleStatus = String(emp.status || emp.lifecycleStatus || emp.lifecycle_status || '').toLowerCase();
      if (!statusFilter && ['exit', 'exited', 'offboarded', 'alumni'].includes(lifecycleStatus)) return false;
      if (statusFilter === 'offboarded' && !['exit', 'exited', 'offboarded', 'alumni'].includes(lifecycleStatus)) return false;
      if (departmentId && String(emp.departmentId || emp.department_id || emp.currentDepartmentId || emp.department?.id || '') !== departmentId) return false;
      if (designationId) {
        const empDesigId = String(emp.designationId || emp.designation_id || emp.currentDesignationId || emp.designation?.id || '');
        const targetDesigObj = designations.find((d: any) => String(d.id) === designationId);
        const targetDesigName = (targetDesigObj?.name || '').toLowerCase();
        const empDesigName = (emp.jobTitle || emp.designationName || emp.designation_name || emp.designation?.name || emp.designation || '').toLowerCase();
        if (empDesigId !== designationId && !(targetDesigName && empDesigName && (empDesigName === targetDesigName || empDesigName.includes(targetDesigName)))) return false;
      }
      if (locationId && String(emp.locationId || emp.location_id || emp.currentLocationId || emp.location?.id || '') !== locationId) return false;
      return true;
    });
  }, [employees, departmentId, designationId, locationId, statusFilter, designations]);

  useEffect(() => { refetch(); }, [page, pageSize, searchTerm]);

  const activeFiltersCount = [departmentId, designationId, locationId, statusFilter].filter(Boolean).length;
  const clearAllFilters = () => { setDepartmentId(''); setDesignationId(''); setLocationId(''); setStatusFilter(''); setPage(1); };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <>
      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .elp-root * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; box-sizing: border-box; }
        .elp-root { --elp-page-bg:#EEF4FB; --elp-card-bg:#fff; --elp-border:#C9DCF3; --elp-border-light:#DDEAF8; --elp-foreground:#1E3A5F; --elp-foreground-muted:#2D537A; --elp-muted:#5A7FA8; --elp-muted-light:#8AAECF; --elp-muted-bg:#F0F6FF; --elp-accent-bg:#DBEAFE; --elp-accent-border:#93C5FD; --elp-success-bg:#D1FAE5; --elp-danger-bg:#FEE2E2; --elp-shadow:0 1px 4px 0 rgba(30,58,95,.07); --elp-shadow-md:0 2px 12px 0 rgba(30,58,95,.10); }
        .dark .elp-root { --elp-page-bg:hsl(var(--background)); --elp-card-bg:hsl(var(--card)); --elp-border:hsl(var(--border)); --elp-border-light:hsl(var(--border)); --elp-foreground:hsl(var(--foreground)); --elp-foreground-muted:hsl(var(--muted-foreground)); --elp-muted:hsl(var(--muted-foreground)); --elp-muted-light:hsl(var(--muted-foreground)); --elp-muted-bg:hsl(var(--muted)); --elp-accent-bg:hsl(var(--muted)); --elp-accent-border:hsl(var(--border)); --elp-success-bg:rgba(5,150,105,.16); --elp-danger-bg:rgba(220,38,38,.16); --elp-shadow:0 1px 4px rgba(0,0,0,.18); --elp-shadow-md:0 2px 12px rgba(0,0,0,.28); }

        .elp-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          background: ${tokens.bluePrimary}; color: #fff;
          border: none; border-radius: 8px;
          padding: 0 14px; height: 34px; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: background 0.15s;
          box-shadow: 0 1px 3px rgba(37,99,235,0.25);
        }
        .elp-btn-primary:hover { background: ${tokens.blueHover}; }

        .elp-btn-outline {
          display: inline-flex; align-items: center; gap: 6px;
          background: ${tokens.cardBg}; color: ${tokens.navyMid};
          border: 1px solid ${tokens.border}; border-radius: 8px;
          padding: 0 14px; height: 34px; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .elp-btn-outline:hover { border-color: ${tokens.bluePrimary}; color: ${tokens.bluePrimary}; background: ${tokens.blueLight}; }

        .elp-btn-outline-active {
          display: inline-flex; align-items: center; gap: 6px;
          background: ${tokens.blueLight}; color: ${tokens.bluePrimary};
          border: 1px solid ${tokens.blueMid}; border-radius: 8px;
          padding: 0 14px; height: 34px; font-size: 12.5px; font-weight: 600;
          cursor: pointer;
        }

        .elp-input {
          width: 100%; height: 36px; font-size: 12.5px;
          border: 1px solid ${tokens.border}; border-radius: 8px;
          background: ${tokens.cardBg}; color: ${tokens.navy};
          padding: 0 32px 0 36px;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .elp-input:focus { border-color: ${tokens.bluePrimary}; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); background: ${tokens.cardBg}; }
        .elp-input::placeholder { color: ${tokens.mutedLight}; }

        .elp-filter-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 500; color: ${tokens.navyMid};
          background: ${tokens.blueLight}; border: 1px solid ${tokens.blueMid};
          border-radius: 20px; padding: 3px 10px 3px 10px;
        }
        .elp-filter-pill-x {
          display: inline-flex; cursor: pointer; color: ${tokens.mutedLight};
          margin-left: 2px; transition: color 0.12s;
        }
        .elp-filter-pill-x:hover { color: ${tokens.danger}; }

        .elp-page-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 7px;
          border: 1px solid ${tokens.border}; background: ${tokens.cardBg};
          font-size: 12px; font-weight: 600; color: ${tokens.navyMid};
          cursor: pointer; transition: all 0.13s;
        }
        .elp-page-btn:hover:not(:disabled) { border-color: ${tokens.bluePrimary}; color: ${tokens.bluePrimary}; background: ${tokens.blueLight}; }
        .elp-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .elp-select {
          height: 30px; border: 1px solid ${tokens.border}; border-radius: 7px;
          background: ${tokens.cardBg}; color: ${tokens.navy}; font-size: 12px; font-weight: 600;
          padding: 0 8px; cursor: pointer; outline: none;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .elp-select:focus { border-color: ${tokens.bluePrimary}; }
      `}</style>

      <div
        className="elp-root"
        style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24, minHeight: '100%', background: tokens.pageBg }}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {/* Eyebrow */}
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: tokens.bluePrimary, textTransform: 'uppercase', marginBottom: 4 }}>
              People Management
            </div>

            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: tokens.navy, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Employee Directory
              </h1>

              {selectedCompanyName && (
                <span style={{ ...pillBase, color: tokens.bluePrimary, background: tokens.blueLight, borderColor: tokens.blueMid }}>
                  {selectedCompanyName}
                </span>
              )}

              {orgLocation && (
                <span style={{ ...pillBase, color: tokens.muted, background: tokens.mutedBg, borderColor: tokens.borderLight }}>
                  <MapPin size={10} strokeWidth={2.2} style={{ color: tokens.bluePrimary }} />
                  {orgLocation}
                </span>
              )}

              {total > 0 && (
                <span style={{ ...pillBase, color: tokens.success, background: tokens.successBg, borderColor: '#6EE7B7' }}>
                  {total} Staff
                </span>
              )}
            </div>

            <p style={{ margin: '5px 0 0', fontSize: 12, color: tokens.muted, fontWeight: 400 }}>
              View, search, filter, and manage your organisation's employee records.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {config.enableBulkUpload && (
              <button className="elp-btn-outline" onClick={() => setIsBulkModalOpen(true)}>
                <Upload size={13} strokeWidth={2.2} />
                Bulk Upload
              </button>
            )}
            {config.enableAddEmployee && (
              <button className="elp-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={14} strokeWidth={2.5} />
                Add Employee
              </button>
            )}
          </div>
        </div>

        {/* ── Search & Filter bar ─────────────────────────────────────────── */}
        {(config.enableSearchBar || config.enableFilterOption) && (
          <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Search */}
              {config.enableSearchBar && (
                <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
                  <Search size={14} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: tokens.mutedLight, pointerEvents: 'none' }} />
                  <input
                    className="elp-input"
                    placeholder="Search by name, code, email, department…"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  />
                  {searchTerm && (
                    <X
                      size={13}
                      strokeWidth={2.5}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: tokens.mutedLight, cursor: 'pointer' }}
                      onClick={() => { setSearchTerm(''); setPage(1); }}
                    />
                  )}
                </div>
              )}

              {/* Filter dropdown (shadcn untouched) */}
              {config.enableFilterOption && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={activeFiltersCount > 0 ? 'elp-btn-outline-active' : 'elp-btn-outline'}>
                      <FilterIcon size={13} strokeWidth={2} />
                      Filters
                      {activeFiltersCount > 0 && (
                        <span style={{
                          background: tokens.bluePrimary, color: '#fff',
                          borderRadius: 10, fontSize: 10, fontWeight: 700,
                          padding: '1px 6px', marginLeft: 2
                        }}>
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs max-h-96 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs font-bold">Filter Employees</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs">Employment Status</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52 text-xs">
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                          <DropdownMenuRadioItem value="" className="text-xs">Active Workforce</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="offboarded" className="text-xs">Offboarded / Exited</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs">Department</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52 text-xs max-h-60 overflow-y-auto">
                        <DropdownMenuRadioGroup value={departmentId} onValueChange={(val) => { setDepartmentId(val); setPage(1); }}>
                          <DropdownMenuRadioItem value="" className="text-xs">All Departments</DropdownMenuRadioItem>
                          {departmentsList.map((dept: any) => (
                            <DropdownMenuRadioItem key={dept.id} value={String(dept.id)} className="text-xs truncate">{dept.name}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs">Designation</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52 text-xs max-h-60 overflow-y-auto">
                        <DropdownMenuRadioGroup value={designationId} onValueChange={(val) => { setDesignationId(val); setPage(1); }}>
                          <DropdownMenuRadioItem value="" className="text-xs">All Designations</DropdownMenuRadioItem>
                          {designations.map((desig: any) => (
                            <DropdownMenuRadioItem key={desig.id} value={String(desig.id)} className="text-xs truncate">{desig.name}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs">Location</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52 text-xs max-h-60 overflow-y-auto">
                        <DropdownMenuRadioGroup value={locationId} onValueChange={(val) => { setLocationId(val); setPage(1); }}>
                          <DropdownMenuRadioItem value="" className="text-xs">All Locations</DropdownMenuRadioItem>
                          {locationsList.map((loc: any) => (
                            <DropdownMenuRadioItem key={loc.id} value={String(loc.id)} className="text-xs truncate">{loc.name || loc.cityName}</DropdownMenuRadioItem>
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

            {/* Active filter pills */}
            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingTop: 2 }}>
                <span style={{ fontSize: 11.5, color: tokens.muted, fontWeight: 500 }}>Active filters:</span>
                {departmentId && (
                  <span className="elp-filter-pill">
                    Dept: {departmentsList.find((d: any) => String(d.id) === departmentId)?.name || departmentId}
                    <span className="elp-filter-pill-x" onClick={() => setDepartmentId('')}><X size={10} strokeWidth={2.5} /></span>
                  </span>
                )}
                {designationId && (
                  <span className="elp-filter-pill">
                    Role: {designations.find((d: any) => String(d.id) === designationId)?.name || designationId}
                    <span className="elp-filter-pill-x" onClick={() => setDesignationId('')}><X size={10} strokeWidth={2.5} /></span>
                  </span>
                )}
                {locationId && (
                  <span className="elp-filter-pill">
                    Location: {locationsList.find((l: any) => String(l.id) === locationId)?.name || locationId}
                    <span className="elp-filter-pill-x" onClick={() => setLocationId('')}><X size={10} strokeWidth={2.5} /></span>
                  </span>
                )}
                {statusFilter && (
                  <span className="elp-filter-pill">
                    Status: Offboarded / Exited
                    <span className="elp-filter-pill-x" onClick={() => setStatusFilter('')}><X size={10} strokeWidth={2.5} /></span>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  style={{ fontSize: 11.5, fontWeight: 600, color: tokens.danger, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Data Table ──────────────────────────────────────────────────── */}
        <div style={{ ...card, flex: 1, overflow: 'hidden' }}>
          {error ? (
            <div style={{ padding: 16, fontSize: 12.5, fontWeight: 600, color: tokens.danger, background: tokens.dangerBg, borderRadius: 12 }}>
              {typeof error === 'string' ? error : (error as any)?.message || 'Failed to load employees'}
            </div>
          ) : (
            <EmployeeDataTable
              employees={filteredEmployees}
              isLoading={isLoading}
              onRefresh={refetch}
              tableColumns={config.tableColumns}
            />
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {config.enablePagination && (
          <div style={{ ...card, padding: '10px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            {/* Left: count + rows per page */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: tokens.muted, fontWeight: 500 }}>
                Showing <strong style={{ color: tokens.navy }}>{rangeStart}–{rangeEnd}</strong> of <strong style={{ color: tokens.navy }}>{total}</strong> employees
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: `1px solid ${tokens.borderLight}`, paddingLeft: 16 }}>
                <label htmlFor="pageSizeSelect" style={{ fontSize: 12, color: tokens.muted, fontWeight: 500 }}>Rows</label>
                <select
                  id="pageSizeSelect"
                  className="elp-select"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: page nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12, color: tokens.muted, fontWeight: 500, marginRight: 8 }}>
                Page <strong style={{ color: tokens.navy }}>{totalPages === 0 ? 0 : page}</strong> of <strong style={{ color: tokens.navy }}>{totalPages}</strong>
              </span>
              <button className="elp-page-btn" onClick={() => setPage(1)} disabled={page === 1} title="First page">
                <ChevronsLeft size={13} strokeWidth={2.2} />
              </button>
              <button className="elp-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Previous page">
                <ChevronLeft size={13} strokeWidth={2.2} />
              </button>
              <button className="elp-page-btn" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} title="Next page">
                <ChevronRight size={13} strokeWidth={2.2} />
              </button>
              <button className="elp-page-btn" onClick={() => setPage(totalPages)} disabled={page * pageSize >= total || total === 0} title="Last page">
                <ChevronsRight size={13} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}

        {/* ── Modals (unchanged) ─────────────────────────────────────────── */}
        <EmployeeCreateModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={() => { setIsCreateModalOpen(false); refetch(); }}
        />
        <BulkUploadModal
          open={isBulkModalOpen}
          onOpenChange={setIsBulkModalOpen}
          onSuccess={() => { setIsBulkModalOpen(false); refetch(); }}
        />
      </div>
    </>
  );
}

export default EmployeeListPage;
