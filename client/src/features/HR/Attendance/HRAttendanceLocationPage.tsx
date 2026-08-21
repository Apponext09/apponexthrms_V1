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
  Plus
} from 'lucide-react';
import { AdminLocation, EmployeeLocationAccess, LocationAssignmentFilter } from './types';
import { AssignLocationModal } from './components/AssignLocationModal';
import { BulkAssignLocationModal } from './components/BulkAssignLocationModal';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import apiClient from '@/lib/api';

import { useCompanyStore } from '@/features/settings/store/companyStore';

export const HRAttendanceLocationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHrPath = location.pathname.startsWith('/hr');
  const geofencesRoute = isHrPath ? '/hr/attendance' : '/attendance/locations';
  const { selectedCompanyId } = useCompanyStore();
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

  // Add Location Dialog State
  const [isCreateLocOpen, setIsCreateLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  const handleCreateNewLocation = async () => {
    if (!newLocName.trim()) {
      showToast.error('Validation Error', 'Please enter location name.');
      return;
    }
    try {
      setIsSavingLoc(true);
      const code = newLocCode.trim() || `LOC-${Math.floor(1000 + Math.random() * 9000)}`;
      await apiClient.post('/attendance/locations', {
        locationName: newLocName.trim(),
        locationCode: code,
        address: newLocAddress.trim(),
        latitude: 19.0760,
        longitude: 72.8777,
        isPrimary: false,
      });
      showToast.success('Location Created', `Location "${newLocName}" added successfully.`);
      setIsCreateLocOpen(false);
      setNewLocName('');
      setNewLocCode('');
      setNewLocAddress('');
      loadData();
    } catch (err: any) {
      showToast.error('Creation Failed', err.response?.data?.message || 'Failed to create location.');
    } finally {
      setIsSavingLoc(false);
    }
  };

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
      let matchesAccess = true;
      if (filters.accessType === 'multi') {
        matchesAccess = assigned.length > 1;
      } else if (filters.accessType === 'single') {
        matchesAccess = assigned.length <= 1;
      } else if (filters.accessType === 'remote') {
        matchesAccess = Boolean(emp.allowRemotePunch || emp.allowFieldPunch);
      }

      return matchesSearch && matchesDept && matchesLoc && matchesAccess;
    });
  }, [employees, filters]);

  // Stat Calculations
  const stats = useMemo(() => {
    const list = employees || [];
    const total = list.length;
    const multiBranch = list.filter((e) => (e?.assignedLocationIds || []).length > 1).length;
    const singleBranch = list.filter((e) => (e?.assignedLocationIds || []).length <= 1).length;
    const remoteEnabled = list.filter((e) => Boolean(e?.allowRemotePunch || e?.allowFieldPunch)).length;
    return { total, multiBranch, singleBranch, remoteEnabled };
  }, [employees]);

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
                Employee Attendance Locations
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                {isHrPath ? 'HR Portal' : 'Admin Portal'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign Admin-created branch offices, client sites, and field geofences to employees across the organization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setIsCreateLocOpen(true)}
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
        {!isHrPath && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/attendance/locations')}
            className="h-8 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            Geofence Boundaries
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-2xs"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Employee Location Mapping
        </Button>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 bg-card shadow-2xs p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Employees</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{stats.total}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">DB Employee Records</p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-primary tracking-wider">Multi-Branch Access</p>
            <h3 className="text-2xl font-black text-primary mt-1">{stats.multiBranch}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Assigned &gt; 1 Location</p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Single Branch (Fixed)</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{stats.singleBranch}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Fixed Base Location</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0 border border-border/60">
            <MapPin className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Admin Locations</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{adminLocations.length}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Geofences in System</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filters & Action Bar */}
      <Card className="border border-border/80 shadow-2xs bg-card p-3 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employee by name, ID, code, designation, or department..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-9 pr-8 text-xs h-8 bg-background border-border"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Container */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <select
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
              className="h-8 px-2.5 bg-background border border-border rounded-md text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Admin Location Filter */}
            <select
              value={filters.locationId}
              onChange={(e) => setFilters((prev) => ({ ...prev, locationId: e.target.value }))}
              className="h-8 px-2.5 bg-background border border-border rounded-md text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value="all">All Admin Locations</option>
              {adminLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            {/* Access Type Filter */}
            <select
              value={filters.accessType}
              onChange={(e) => setFilters((prev) => ({ ...prev, accessType: e.target.value as any }))}
              className="h-8 px-2.5 bg-background border border-border rounded-md text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value="all">All Access Modes</option>
              <option value="multi">Multi-Branch Access</option>
              <option value="single">Single Office Only</option>
              <option value="remote">Remote / Field Enabled</option>
            </select>

            {/* Reset Filters Button */}
            {(filters.search || filters.department !== 'all' || filters.locationId !== 'all' || filters.accessType !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ search: '', department: 'all', locationId: 'all', accessType: 'all' })}
                className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 gap-1 px-2"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Employee Locations Table */}
      <Card className="border border-border/80 shadow-2xs bg-card overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Employee Location Registry</h3>
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              {filteredEmployees.length} Employees
            </Badge>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">
                {selectedIds.length} Selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBulkModalOpen(true)}
                className="h-7 text-[10px] font-bold gap-1"
              >
                <Layers className="w-3.5 h-3.5" />
                Assign Branches
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="font-semibold">Loading employee attendance locations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/60">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <Checkbox
                      checked={
                        filteredEmployees.length > 0 &&
                        selectedIds.length === filteredEmployees.length
                      }
                      onCheckedChange={(c) => handleSelectAll(!!c)}
                    />
                  </th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Primary / Default Location</th>
                  <th className="px-4 py-3">Permitted Attendance Branches</th>
                  <th className="px-4 py-3 text-center">Remote / Field</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
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

                        {/* Remote / Field Allowances */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {emp.allowRemotePunch ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" />
                                WFH
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}

                            {emp.allowFieldPunch && (
                              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold flex items-center gap-1">
                                <Navigation className="w-2.5 h-2.5" />
                                Field
                              </Badge>
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

      {/* CREATE NEW LOCATION MODAL */}
      <Dialog open={isCreateLocOpen} onOpenChange={setIsCreateLocOpen}>
        <DialogContent className="sm:max-w-md border border-border/80 shadow-lg rounded-xl bg-card p-4">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              Create New Attendance Location
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Add a new branch office or site location for employee attendance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Location / Office Name *</Label>
              <Input
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Pune Tech Park Office"
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Location Code (Optional)</Label>
              <Input
                value={newLocCode}
                onChange={(e) => setNewLocCode(e.target.value)}
                placeholder="e.g. PUNE-OFFICE-01"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Address / Landmark</Label>
              <Input
                value={newLocAddress}
                onChange={(e) => setNewLocAddress(e.target.value)}
                placeholder="e.g. Baner Road, Pune, Maharashtra"
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateLocOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingLoc}
                onClick={handleCreateNewLocation}
                className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isSavingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Save Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRAttendanceLocationPage;
