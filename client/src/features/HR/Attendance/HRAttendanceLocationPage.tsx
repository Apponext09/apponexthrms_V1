import React, { useState, useEffect, useMemo } from 'react';
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
  UserCheck
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { showToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import apiClient from '@/lib/api';

export const HRAttendanceLocationPage: React.FC = () => {
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
  }, []);

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
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-rose-500/5 p-6 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
            <span>HR Portal</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span>Attendance Management</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span>Branch Access Mapping</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            Employee Attendance Locations
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Assign Admin-created branch offices, client sites, and field geofences to employees who work across multiple offices or travel to client locations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsCreateLocOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Location
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => loadData(true)}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          {selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold shadow-md gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk Assign ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* ── Quick KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-border/70 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Employees</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.total}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Real DB Records</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-card to-rose-500/5 border-rose-200/50 dark:border-rose-900/30 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Multi-Branch Access</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.multiBranch}</h3>
              <p className="text-[11px] text-rose-600/80 font-semibold mt-0.5">Assigned &gt; 1 Location</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-border/70 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Single Branch (Fixed)</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.singleBranch}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Head Office / Fixed Base</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-card to-emerald-500/5 border-emerald-200/50 dark:border-emerald-900/30 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Admin Locations</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{adminLocations.length}</h3>
              <p className="text-[11px] text-emerald-600/80 font-semibold mt-0.5">Admin Geofences in DB</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters & Action Bar ── */}
      <Card className="p-4 bg-card border border-border/80 shadow-xs rounded-2xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employee by name, ID, code, designation, or department..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-9 pr-8 text-xs h-9 bg-background border-border/80 focus-visible:ring-rose-500/20"
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
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            <div className="flex-1 sm:flex-none">
              <select
                value={filters.department}
                onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
                className="w-full sm:w-44 h-9 px-3 bg-background border border-border/80 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin Location Filter */}
            <div className="flex-1 sm:flex-none">
              <select
                value={filters.locationId}
                onChange={(e) => setFilters((prev) => ({ ...prev, locationId: e.target.value }))}
                className="w-full sm:w-48 h-9 px-3 bg-background border border-border/80 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
              >
                <option value="all">All Admin Locations</option>
                {adminLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Access Type Filter */}
            <div className="flex-1 sm:flex-none">
              <select
                value={filters.accessType}
                onChange={(e) => setFilters((prev) => ({ ...prev, accessType: e.target.value as any }))}
                className="w-full sm:w-44 h-9 px-3 bg-background border border-border/80 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
              >
                <option value="all">All Access Modes</option>
                <option value="multi">Multi-Branch Access</option>
                <option value="single">Single Office Only</option>
                <option value="remote">Remote / Field Enabled</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(filters.search || filters.department !== 'all' || filters.locationId !== 'all' || filters.accessType !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ search: '', department: 'all', locationId: 'all', accessType: 'all' })}
                className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 font-medium px-2.5"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Employee Locations Table ── */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-foreground">Employee Attendance Location Registry</h3>
            <Badge variant="outline" className="text-xs font-semibold">
              {filteredEmployees.length} Employees Shown
            </Badge>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {selectedIds.length} Selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBulkModalOpen(true)}
                className="h-8 text-xs border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-300"
              >
                <Layers className="w-3.5 h-3.5 mr-1" />
                Assign Branches
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
            <p className="text-xs font-semibold text-muted-foreground">Loading employee attendance location data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <Checkbox
                      checked={
                        filteredEmployees.length > 0 &&
                        selectedIds.length === filteredEmployees.length
                      }
                      onCheckedChange={(c) => handleSelectAll(!!c)}
                    />
                  </th>
                  <th className="p-3">Employee Details</th>
                  <th className="p-3">Primary / Default Location</th>
                  <th className="p-3">Permitted Attendance Branches / Sites</th>
                  <th className="p-3 text-center">Remote / Field Punch</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <MapPin className="w-8 h-8 text-muted-foreground/40" />
                        <p className="font-semibold text-foreground">No matching employees found</p>
                        <p className="text-[11px]">Try adjusting your search query or department filters.</p>
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
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-muted/30 transition ${
                          isSelected ? 'bg-rose-500/5 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => handleSelectOne(emp.id, !!c)}
                          />
                        </td>

                        {/* Employee Info */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-rose-200 dark:border-rose-800 shadow-2xs shrink-0">
                              <AvatarImage src={emp.avatarUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                              <AvatarFallback className="bg-gradient-to-br from-rose-600 to-pink-600 text-white font-bold text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-xs hover:text-rose-600 transition cursor-pointer">
                                  {emp.firstName} {emp.lastName}
                                </span>
                                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                                  {emp.employeeCode}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span className="font-semibold text-foreground/90">{emp.designation}</span>
                                <span>•</span>
                                <span className="text-rose-600 dark:text-rose-400 font-medium">{emp.department}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <UserCheck className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Reporting Mgr:</span>
                                <span className="font-semibold text-foreground">{emp.reportingManager || 'Department Head'}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Primary Location */}
                        <td className="p-3">
                          {primaryLoc ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <Building2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                              <span>{primaryLoc.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">Default Geofence</span>
                          )}
                        </td>

                        {/* Permitted Attendance Locations */}
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {assignedLocs.length === 0 ? (
                              <span className="text-muted-foreground text-[11px] italic">No geofences assigned</span>
                            ) : (
                              assignedLocs.map((loc) => {
                                const isPrim = loc.id === emp.primaryLocationId;
                                return (
                                  <Badge
                                    key={loc.id}
                                    className={`text-[10px] font-medium transition flex items-center gap-1 ${
                                      isPrim
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'bg-muted/80 hover:bg-muted text-foreground border border-border'
                                    }`}
                                  >
                                    <MapPin className="w-3 h-3" />
                                    {loc.name}
                                    {isPrim && <span className="text-[9px] opacity-80">(Primary)</span>}
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </td>

                        {/* Remote / Field Allowances */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {emp.allowRemotePunch ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                WFH
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">-</span>
                            )}

                            {emp.allowFieldPunch && (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] flex items-center gap-1">
                                <Navigation className="w-3 h-3" />
                                Field
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setIsAssignModalOpen(true);
                            }}
                            className="h-8 text-xs hover:border-rose-500 hover:text-rose-600 transition"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-rose-500" />
                            Manage Locations
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modals ── */}
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
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-600" />
              Create New Attendance Location
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new branch office or site location for employee attendance, GPS geofence & face punches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-foreground">Location / Office Name *</Label>
              <Input
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Pune Tech Park Office"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-foreground">Location Code (Optional)</Label>
              <Input
                value={newLocCode}
                onChange={(e) => setNewLocCode(e.target.value)}
                placeholder="e.g. PUNE-OFFICE-01"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-foreground">Address / Landmark</Label>
              <Input
                value={newLocAddress}
                onChange={(e) => setNewLocAddress(e.target.value)}
                placeholder="e.g. Baner Road, Pune, Maharashtra"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateLocOpen(false)}
                className="text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingLoc}
                onClick={handleCreateNewLocation}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-1.5"
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
