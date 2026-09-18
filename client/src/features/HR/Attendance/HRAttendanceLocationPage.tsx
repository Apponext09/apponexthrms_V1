import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Building2,
  Users,
  Search,
  Globe,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Navigation,
  X,
  Layers,
  Loader2,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { AdminLocation, EmployeeLocationAccess, LocationAssignmentFilter } from './types';
import { AssignLocationModal } from './components/AssignLocationModal';
import { BulkAssignLocationModal } from './components/BulkAssignLocationModal';
import { AddLocationModal } from '@/features/attendance/components/AddLocationModal';
import { MapCoordinateExtractorModal } from '@/features/attendance/components/MapCoordinateExtractorModal';
import { useLocationManagement, GeofenceLocation } from '@/features/attendance/hooks/useLocationManagement';
import { useCompanies } from '@/features/settings/hooks/useCompanies';
import {
  fetchEmployeeLocationData,
  saveEmployeeLocationAccess,
  bulkSaveEmployeeLocationAccess,
} from './api/employeeLocationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { showToast } from '@/components/ui/toast';
import apiClient from '@/lib/api';

import { useCompanyStore } from '@/features/settings/store/companyStore';

export const HRAttendanceLocationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHrPath = location.pathname.startsWith('/hr');
  const geofencesRoute = isHrPath ? '/hr/attendance' : '/attendance/locations';
  const { selectedCompanyId } = useCompanyStore();
  const { data: companies = [] } = useCompanies();
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeLocationAccess[]>([]);
  const [adminLocations, setAdminLocations] = useState<AdminLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<LocationAssignmentFilter>({
    search: '',
    department: 'all',
    locationId: 'all',
    accessType: 'all',
  });

  // Selected Checkboxes for Bulk Action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeLocationAccess | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const { geofences, deleteGeofence, fetchGeofences } = useLocationManagement();
  const [editingGeofence, setEditingGeofence] = useState<GeofenceLocation | null>(null);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'radius'>('name');

  const [activeTab, setActiveTab] = useState<'mapping' | 'geofences'>('mapping');

  // Load Real Data from Backend
  const loadData = async (showRefreshToast = false) => {
    try {
      setIsRefreshing(true);
      const res = await fetchEmployeeLocationData();
      setEmployees(res.employees || []);
      setAdminLocations(res.adminLocations || []);
      if (showRefreshToast) {
        showToast.success('Data Refreshed', 'Latest employees and geofence locations loaded.');
      }
    } catch (err: any) {
      console.error('Failed to load employee location data:', err);
      showToast.error('Load Failed', err.response?.data?.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCompanyId]);

  // Extract unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((emp) => {
      if (!emp) return false;
      const s = (filters.search || '').toLowerCase();
      const fn = emp.firstName || '';
      const ln = emp.lastName || '';
      const code = emp.employeeCode || '';
      const email = emp.email || '';
      const des = emp.designation || '';

      const matchesSearch =
        s === '' ||
        `${fn} ${ln}`.toLowerCase().includes(s) ||
        code.toLowerCase().includes(s) ||
        email.toLowerCase().includes(s) ||
        des.toLowerCase().includes(s);

      // Department filter
      const matchesDept = filters.department === 'all' || emp.department === filters.department;

      // Location Filter
      const assigned = emp.assignedLocationIds || [];
      const matchesLoc =
        filters.locationId === 'all' ||
        assigned.includes(filters.locationId) ||
        emp.primaryLocationId === filters.locationId;

      // Access Type Filter
      // Access Type Filter
      let matchesAccess = true;
      if (filters.accessType === 'multi') {
        matchesAccess = assigned.length > 1;
      } else if (filters.accessType === 'single') {
        matchesAccess = assigned.length <= 1;
      } else if (filters.accessType === 'remote') {
        matchesAccess = Boolean(emp.allowRemotePunch || emp.allowFieldPunch);
      }

      // Company Filter
      const matchesComp = companyFilter === 'all' || String((emp as any).companyId || (emp as any).company_id || '') === String(companyFilter);

      return matchesSearch && matchesDept && matchesLoc && matchesAccess && matchesComp;
    });
  }, [employees, filters, companyFilter]);

  // Stat Calculations
  const stats = useMemo(() => {
    const list = filteredEmployees || [];
    const total = list.length;
    const multiBranch = list.filter((e) => (e?.assignedLocationIds || []).length > 1).length;
    const singleBranch = list.filter((e) => (e?.assignedLocationIds || []).length <= 1).length;
    const remoteEnabled = list.filter((e) => Boolean(e?.allowRemotePunch || e?.allowFieldPunch)).length;
    const activeLocationsCount = (adminLocations || []).filter((loc) => {
      return (
        companyFilter === 'all' ||
        String(loc.companyId || (loc as any).company_id || '') === String(companyFilter)
      );
    }).length;
    return { total, multiBranch, singleBranch, remoteEnabled, activeLocationsCount };
  }, [filteredEmployees, adminLocations, companyFilter]);

  // Handlers for Row Selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Single Employee Location Save to Backend DB
  const handleSaveEmployeeLocation = async (updated: EmployeeLocationAccess) => {
    try {
      await saveEmployeeLocationAccess({
        employeeId: updated.employeeId,
        assignedLocationIds: updated.assignedLocationIds,
        primaryLocationId: updated.primaryLocationId,
        allowRemotePunch: updated.allowRemotePunch,
        allowFieldPunch: updated.allowFieldPunch,
        notes: updated.notes,
      });

      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast.success('Location Access Saved', `Permitted locations for ${updated.firstName} ${updated.lastName} updated in database.`);
    } catch (err: any) {
      console.error('Save failed:', err);
      showToast.error('Save Failed', err.response?.data?.message || 'Could not update employee locations in DB.');
    }
  };

  // Bulk Apply to Backend DB
  const handleApplyBulkLocations = async (locationIds: string[], overwriteMode: boolean) => {
    try {
      await bulkSaveEmployeeLocationAccess({
        employeeIds: selectedIds,
        assignedLocationIds: locationIds,
        overwriteMode,
      });

      showToast.success('Bulk Locations Applied', `Updated permitted attendance locations for ${selectedIds.length} employees in database.`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      console.error('Bulk save failed:', err);
      showToast.error('Bulk Update Failed', err.response?.data?.message || 'Failed to update locations in DB.');
    }
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                Location Management & Mapping
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                {isHrPath ? 'HR Portal' : 'Admin Portal'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage office geofence locations and assign branch access & punch permissions to employees across the organization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExtractorOpen(true)}
            className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            Import Maps Link / Search
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingGeofence(null);
              setIsAddLocationOpen(true);
            }}
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Location
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => loadData(true)}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={() => setIsBulkModalOpen(true)}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk Assign ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <Button
          variant={activeTab === 'mapping' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('mapping')}
          className={`h-8 text-xs font-bold gap-1.5 ${
            activeTab === 'mapping'
              ? 'bg-primary text-primary-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          1. Employee Access Mapping ({filteredEmployees.length})
        </Button>

        <Button
          variant={activeTab === 'geofences' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('geofences')}
          className={`h-8 text-xs font-bold gap-1.5 ${
            activeTab === 'geofences'
              ? 'bg-primary text-primary-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          2. Office & Geofence Locations ({stats.activeLocationsCount})
        </Button>
      </div>



      {/* Tab 1: Employee Access Mapping */}
      {activeTab === 'mapping' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Search Bar */}
          <Card className="border border-border/80 shadow-2xs bg-card p-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search employee name, code, designation, email..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-8 h-8 text-xs font-medium bg-background border-border/80"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </Card>

          {/* Employee Locations Table Card */}
          <Card className="border border-border/80 shadow-2xs bg-card overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-semibold">Loading employee location mappings...</p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center">
                        <Checkbox
                          checked={
                            filteredEmployees.length > 0 &&
                            selectedIds.length === filteredEmployees.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 min-w-[200px]">Employee</th>
                      <th className="px-4 py-3 min-w-[140px]">Primary Location</th>
                      <th className="px-4 py-3 min-w-[220px]">Permitted Attendance Locations</th>
                      <th className="px-4 py-3 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
                          <div className="flex flex-col items-center gap-2">
                            <MapPin className="w-8 h-8 text-muted-foreground/40" />
                            <p className="font-bold text-foreground">No matching employees found</p>
                            <p className="text-[10px]">Try adjusting your search query or department filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = selectedIds.includes(emp.id);
                        const primaryLoc = (adminLocations || []).find((l) => l.id === emp.primaryLocationId);
                        const assignedLocs = (adminLocations || []).filter((l) =>
                          (emp.assignedLocationIds || []).includes(l.id)
                        );
                        const fn = emp.firstName || emp.email || 'E';
                        const ln = emp.lastName || '';
                        const initials = `${fn[0] || 'E'}${ln[0] || ''}`.toUpperCase();

                        return (
                          <tr
                            key={emp.id}
                            className={`hover:bg-muted/20 transition-colors ${
                              isSelected ? 'bg-primary/5' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="px-4 py-3 text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(c) => handleSelectOne(emp.id, !!c)}
                              />
                            </td>

                            {/* Employee Info */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8 border border-border shrink-0">
                                  <AvatarImage src={emp.avatarUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground text-xs">
                                      {emp.firstName} {emp.lastName}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                      {emp.employeeCode}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    <span className="font-medium text-foreground">{emp.designation}</span>
                                    <span> • </span>
                                    <span className="text-primary font-medium">{emp.department}</span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Primary Location */}
                            <td className="px-4 py-3">
                              {primaryLoc ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{primaryLoc.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px] italic">Default Geofence</span>
                              )}
                            </td>

                            {/* Permitted Attendance Locations */}
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {assignedLocs.length === 0 ? (
                                  <span className="text-muted-foreground text-[10px] italic">No geofences assigned</span>
                                ) : (
                                  assignedLocs.map((loc) => {
                                    const isPrim = loc.id === emp.primaryLocationId;
                                    return (
                                      <Badge
                                        key={loc.id}
                                        className={`text-[9px] font-medium px-2 py-0.5 flex items-center gap-1 ${
                                          isPrim
                                            ? 'bg-primary text-primary-foreground font-bold'
                                            : 'bg-muted text-foreground border border-border/60'
                                        }`}
                                      >
                                        <MapPin className="w-2.5 h-2.5" />
                                        {loc.name}
                                        {isPrim && <span className="opacity-80">(Primary)</span>}
                                      </Badge>
                                    );
                                  })
                                )}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  setIsAssignModalOpen(true);
                                }}
                                className="h-7 text-[10px] font-bold gap-1"
                              >
                                <SlidersHorizontal className="w-3 h-3 text-primary" />
                                Manage
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Office & Geofence Locations Management */}
      {activeTab === 'geofences' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <Card className="border border-border/80 shadow-2xs bg-card p-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search location by name, code, IP, address..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-8 h-8 text-xs font-medium bg-background border-border/80"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {/* Company Select Filter for Tab 2 */}
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="h-8 text-xs font-semibold px-2.5 rounded-md border border-border/80 bg-background text-foreground focus:outline-none max-w-[160px] truncate"
                >
                  <option value="all">All Companies ({companies.length})</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                  Sort:
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-8 text-xs font-semibold px-2.5 rounded-md border border-border/80 bg-background text-foreground focus:outline-none"
                >
                  <option value="name">Location Name (A-Z)</option>
                  <option value="code">Location Code</option>
                  <option value="radius">Geofence Radius</option>
                </select>

                <Button
                  size="sm"
                  onClick={() => {
                    setEditingGeofence(null);
                    setIsAddLocationOpen(true);
                  }}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Geofence Location
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminLocations.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground text-xs bg-card border border-border/80 rounded-xl p-8">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-bold text-foreground">No Geofence Locations Configured</p>
                <p className="text-[10px] mt-1">Click "Add New Geofence Location" to create your office radius boundaries.</p>
              </div>
            ) : (
              adminLocations
                .filter((loc) => {
                  const q = locationSearch.toLowerCase();
                  const matchesSearch =
                    !q ||
                    (loc.name || '').toLowerCase().includes(q) ||
                    (loc.code || '').toLowerCase().includes(q) ||
                    (loc.ipAddress || '').toLowerCase().includes(q);

                  const matchesComp =
                    companyFilter === 'all' ||
                    String(loc.companyId || (loc as any).company_id || '') === String(companyFilter);

                  return matchesSearch && matchesComp;
                })
                .sort((a, b) => {
                  if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
                  if (sortBy === 'radius') return (b.radiusMeters || 0) - (a.radiusMeters || 0);
                  return (a.name || '').localeCompare(b.name || '');
                })
                .map((loc) => {
                  const gLoc = geofences.find((g) => g.id === Number(loc.id)) || {
                    id: Number(loc.id),
                    uuid: '',
                    locationId: Number(loc.id),
                    geofenceName: loc.name,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    radiusMeters: loc.radiusMeters,
                    ipAddress: loc.ipAddress,
                    isOfficeLocation: loc.type === 'head_office',
                    allowsRemoteWork: false,
                  };

                  return (
                    <Card key={loc.id} className="border border-border/80 bg-card shadow-2xs hover:shadow-sm transition-all p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">{loc.name}</h4>
                              <span className="text-[10px] font-mono text-muted-foreground">{loc.code || `LOC-${loc.id}`}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                            {loc.type === 'head_office' ? 'Head Office' : 'Branch Office'}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs pt-1 border-t border-border/60">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Geofence Radius:</span>
                            <span className="font-bold text-foreground">{loc.radiusMeters || 500} meters</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">IP Restriction:</span>
                            <span className="font-mono text-xs text-primary">{loc.ipAddress || 'Any IP Allowed'}</span>
                          </div>
                          {loc.latitude && loc.longitude && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">GPS Coordinates:</span>
                              <span className="font-mono text-[10px] text-muted-foreground">{loc.latitude}, {loc.longitude}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/60">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingGeofence(gLoc);
                              setIsAddLocationOpen(true);
                            }}
                            className="h-7 text-[10px] font-bold gap-1 text-primary hover:bg-primary/10"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (await window.appConfirm(`Are you sure you want to delete geofence location "${loc.name}"?`)) {
                                try {
                                  await deleteGeofence(Number(loc.id));
                                  loadData();
                                } catch (e) {
                                  // Handled in hook toast
                                }
                              }
                            }}
                            className="h-7 text-[10px] font-bold gap-1 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveTab('mapping');
                          }}
                          className="h-7 text-[10px] font-bold gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <UserCheck className="w-3 h-3 text-primary" />
                          Assign
                        </Button>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AssignLocationModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        adminLocations={adminLocations}
        onSave={handleSaveEmployeeLocation}
      />

      <BulkAssignLocationModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedEmployeeIds={selectedIds}
        totalSelectedCount={selectedIds.length}
        adminLocations={adminLocations}
        onApplyBulk={handleApplyBulkLocations}
      />

      {/* COMPLETE ADD/EDIT LOCATION MODAL WITH AUTO-GPS AND AUTO-IP */}
      <AddLocationModal
        open={isAddLocationOpen}
        onOpenChange={(open) => {
          setIsAddLocationOpen(open);
          if (!open) {
            setEditingGeofence(null);
            loadData();
            fetchGeofences();
          }
        }}
        editingLocation={editingGeofence}
      />

      {/* MAP COORDINATE EXTRACTOR MODAL */}
      <MapCoordinateExtractorModal
        open={isExtractorOpen}
        onOpenChange={setIsExtractorOpen}
        onSelectCoordinates={(coords) => {
          setEditingGeofence({
            id: 0,
            uuid: '',
            locationId: 0,
            geofenceName: coords.locationName || 'New Office Location',
            latitude: Number(coords.latitude),
            longitude: Number(coords.longitude),
            radiusMeters: 500,
            isOfficeLocation: true,
            allowsRemoteWork: false,
          });
          setIsAddLocationOpen(true);
        }}
      />
    </div>
  );
};

export default HRAttendanceLocationPage;
