import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarClock,
  Plus,
  UserCheck,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  Clock,
  Users,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Activity,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useShifts } from '../hooks/useShifts';
import { ShiftTemplateCard } from '../components/ShiftTemplateCard';
import { CreateShiftModal } from '../components/CreateShiftModal';
import { EditShiftModal } from '../components/EditShiftModal';
import { AssignShiftModal } from '../components/AssignShiftModal';
import { WeeklyRosterGrid } from '../components/WeeklyRosterGrid';
import type { ShiftTemplate } from '../types';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export function ShiftManagementPage({ pageType: propPageType }: { pageType?: 'general' | 'roster' }) {
  const location = useLocation();
  const pageType = propPageType ?? (location.pathname.toLowerCase().includes('roster') ? 'roster' : 'general');
  const { selectedCompanyId } = useCompanyStore();
  const {
    shifts,
    loading,
    getAllShifts,
    createShift,
    updateShift,
    deleteShift,
    assignShift,
    getAllAssignments,
    deleteAssignment,
    getAllSwapRequests,
    approveSwap,
    rejectSwap,
  } = useShifts();

  const [activeTab, setActiveTab] = useState('shifts');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);
  const [preselectedShift, setPreselectedShift] = useState<ShiftTemplate | null>(null);

  // Assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');

  // Swap requests state
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [processingSwapId, setProcessingSwapId] = useState<number | null>(null);

  // Load data
  const fetchShifts = useCallback(async () => {
    await getAllShifts();
  }, [getAllShifts]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const loadAssignmentsData = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const data = await getAllAssignments();
      setAssignments(data);
    } catch {
      showToast.error('Failed to load shift assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }, [getAllAssignments]);

  const loadSwapRequestsData = useCallback(async () => {
    setLoadingSwaps(true);
    try {
      const data = await getAllSwapRequests();
      setSwapRequests(data);
    } catch {
      showToast.error('Failed to load swap requests');
    } finally {
      setLoadingSwaps(false);
    }
  }, [getAllSwapRequests]);

  useEffect(() => {
    setActiveTab('shifts');
  }, [pageType]);

  useEffect(() => {
    if (activeTab === 'assignments' || activeTab === 'roster') loadAssignmentsData();
    if (activeTab === 'swaps') loadSwapRequestsData();
  }, [activeTab, loadAssignmentsData, loadSwapRequestsData, selectedCompanyId]);

  // Handlers
  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setShowEditModal(true);
  };

  const handleDeleteShift = async (shift: any) => {
    const name = shift.shiftName || shift.shift_name || 'this shift';
    if (await window.appConfirm(`Are you sure you want to delete shift "${name}"?`)) {
      try {
        await deleteShift(shift.id);
        showToast.success('Shift Deleted', `Shift "${name}" deleted successfully`);
        fetchShifts();
      } catch (err: any) {
        showToast.error('Delete Failed', err?.response?.data?.message || err?.message || 'Failed to delete shift');
      }
    }
  };

  const handleAssignClick = (shift: any) => {
    setPreselectedShift(shift);
    setShowAssignModal(true);
  };

  const handleAssigned = () => {
    fetchShifts();
    loadAssignmentsData();
  };

  const handleShiftCreated = () => {
    fetchShifts();
  };

  const handleShiftUpdated = () => {
    fetchShifts();
  };

  const handleApproveSwapRequest = async (swapId: number) => {
    setProcessingSwapId(swapId);
    try {
      await approveSwap(swapId);
      showToast.success('Request Approved', 'Shift swap request approved successfully');
      loadSwapRequestsData();
    } catch (err: any) {
      showToast.error('Approval Failed', err?.response?.data?.message || err?.message || 'Failed to approve swap');
    } finally {
      setProcessingSwapId(null);
    }
  };

  const handleRejectSwapRequest = async (swapId: number) => {
    setProcessingSwapId(swapId);
    try {
      await rejectSwap(swapId);
      showToast.success('Request Rejected', 'Shift swap request rejected');
      loadSwapRequestsData();
    } catch (err: any) {
      showToast.error('Rejection Failed', err?.response?.data?.message || err?.message || 'Failed to reject swap');
    } finally {
      setProcessingSwapId(null);
    }
  };

  // Helper to format time strings
  const formatTime = (t: string | null | undefined) => {
    if (!t) return '--';
    const parts = t.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]);
      const m = parts[1];
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m} ${suffix}`;
    }
    return t;
  };

  const isRosterPage = pageType === 'roster';

  const categoryShifts = (shifts as any[]).filter((s) => {
    const isRosterShift = s.shiftType === 'roster' || s.shift_type === 'roster' || (s as any).shiftCategory === 'Roster';
    return isRosterPage ? isRosterShift : !isRosterShift;
  });

  const filteredShifts = categoryShifts.filter((s) => {
    const name = s.shiftName || s.shift_name || '';
    const code = s.shiftCode || s.shift_code || '';
    const type = s.shiftType || s.shift_type || '';
    return (
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activeShifts = categoryShifts.filter((s) => (s.status || 'active') === 'active');
  const nightShifts = categoryShifts.filter((s) => (s.isNightShift ?? s.is_night_shift));
  const rosterShifts = (shifts as any[]).filter((s) => (s.shiftType || s.shift_type) === 'roster' || (s as any).shiftCategory === 'Roster');

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header Banner Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                {isRosterPage ? 'Roster Shift Management' : 'General Shift Management'}
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                {isRosterPage ? 'Rotational Roster' : 'Daily Shifts'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRosterPage
                ? 'Create, manage and schedule rotational roster shift templates across teams.'
                : 'Create shift templates, assign work schedules to employees and review swap requests.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchShifts(); loadAssignmentsData(); loadSwapRequestsData(); }}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAssignModal(true)}
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" /> Assign Shift
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> {isRosterPage ? 'New Roster Shift' : 'New General Shift'}
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Active Shifts</span>
            <div className="p-1.5 rounded bg-primary/10 text-primary">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-2">{activeShifts.length}</p>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-primary tracking-wider">Total Templates</span>
            <div className="p-1.5 rounded bg-primary/10 text-primary">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-2">{(shifts as any[]).length}</p>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Roster Shifts</span>
            <div className="p-1.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-2">{rosterShifts.length}</p>
        </Card>

        <Card className="border border-border/80 shadow-2xs rounded-xl bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">Night Shifts</span>
            <div className="p-1.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-2">{nightShifts.length}</p>
        </Card>
      </div>

      {/* Tabs & View Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-xl border border-blue-100 bg-blue-50/60 p-1 dark:border-border dark:bg-muted/30">
          <TabsTrigger value="shifts" className="h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <LayoutGrid className="w-3.5 h-3.5" /> Shift Templates
          </TabsTrigger>
          {!isRosterPage && (
            <TabsTrigger value="assignments" className="h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Users className="w-3.5 h-3.5" /> Assignments
            </TabsTrigger>
          )}
          {!isRosterPage && (
            <TabsTrigger value="swaps" className="h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <ArrowRightLeft className="w-3.5 h-3.5" /> Swap Requests
            </TabsTrigger>
          )}
          {isRosterPage && (
            <TabsTrigger value="roster" className="h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <CalendarDays className="w-3.5 h-3.5" /> Weekly Roster
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1 — Shift Templates */}
        <TabsContent value="shifts" className="space-y-4 m-0">
          <Card className="border border-border/80 shadow-2xs bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search shift name, code, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-xs bg-background border-border"
                />
              </div>
              <div className="flex items-center gap-1 border border-border/80 rounded-lg p-0.5 bg-muted/20">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-card shadow-2xs text-foreground font-bold' : 'text-muted-foreground hover:text-foreground')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-card shadow-2xs text-foreground font-bold' : 'text-muted-foreground hover:text-foreground')}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/80 bg-card h-52 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filteredShifts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-border/80 rounded-xl bg-card">
              <CalendarClock className="w-8 h-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-bold text-foreground">No shift templates found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {searchQuery ? 'Try a different search query.' : 'Create your first shift template to get started.'}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1 px-3 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Create First Shift
                </Button>
              )}
            </div>
          )}

          {!loading && filteredShifts.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShifts.map((shift) => (
                <ShiftTemplateCard
                  key={shift.id}
                  shift={shift}
                  onAssign={handleAssignClick}
                  onEdit={handleEditShift}
                  onDelete={handleDeleteShift}
                />
              ))}
            </div>
          )}

          {!loading && filteredShifts.length > 0 && viewMode === 'list' && (
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Shift</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                      <th className="px-4 py-3 hidden md:table-cell">Timings</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Duration</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredShifts.map((shift) => {
                      const name = shift.shiftName || shift.shift_name || 'Shift';
                      const code = shift.shiftCode || shift.shift_code || '';
                      const type = shift.shiftType || shift.shift_type || 'fixed';
                      const start = shift.startTime || shift.start_time;
                      const end = shift.endTime || shift.end_time;
                      const duration = shift.durationHours ?? shift.duration_hours ?? 8;
                      const isFlex = shift.isFlexible ?? shift.is_flexible;
                      const flexStart = shift.flexibleStartRangeStart || shift.flexible_start_range_start;
                      const flexEnd = shift.flexibleStartRangeEnd || shift.flexible_start_range_end;
                      const color = shift.color || '#2563eb';
                      const status = shift.status || 'active';

                      return (
                        <tr key={shift.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-7 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <div>
                                <p className="font-bold text-foreground text-xs">{name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge variant="outline" className="text-[9px] font-semibold capitalize">
                              {type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs font-mono font-bold text-foreground">
                              {type === 'roster'
                                ? 'Weekly Roster Plan'
                                : isFlex
                                  ? `Flex: ${formatTime(flexStart)} – ${formatTime(flexEnd)}`
                                  : start && end
                                    ? `${formatTime(start)} – ${formatTime(end)}`
                                    : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-xs font-bold text-foreground">{duration}h</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={cn(
                                'text-[9px] font-bold py-0.5 px-2 border',
                                status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              {status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-bold gap-1"
                                onClick={() => handleAssignClick(shift)}
                              >
                                <UserCheck className="w-3 h-3 text-primary" /> Assign
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditShift(shift)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDeleteShift(shift)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2 — Assignments */}
        <TabsContent value="assignments" className="space-y-4 m-0">
          <Card className="border border-border/80 shadow-2xs bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee or shift..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="pl-9 h-8 text-xs bg-background border-border"
                />
              </div>
              <Button
                size="sm"
                onClick={() => { setPreselectedShift(null); setShowAssignModal(true); }}
                className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" /> Assign New
              </Button>
            </div>
          </Card>

          {loadingAssignments ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-xs text-muted-foreground border border-border/80 rounded-xl bg-card">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="font-bold">Loading shift assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-border/80 rounded-xl bg-card">
              <Users className="w-8 h-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-bold text-foreground">No shift assignments found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click "Assign New" to map shifts to employees.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => { setPreselectedShift(null); setShowAssignModal(true); }}
                className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 mt-1"
              >
                <UserCheck className="w-3.5 h-3.5" /> Assign Shift
              </Button>
            </div>
          ) : (
            <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Shift</th>
                      <th className="px-4 py-3 hidden md:table-cell">Start Date</th>
                      <th className="px-4 py-3 hidden lg:table-cell">End Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {assignments
                      .filter(
                        (a) =>
                          !assignmentSearch ||
                          `${a.firstName || a.first_name || ''} ${a.lastName || a.last_name || ''}`.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
                          (a.shiftName || a.shift_name || '').toLowerCase().includes(assignmentSearch.toLowerCase()) ||
                          (a.employeeCode || a.employee_code || '').toLowerCase().includes(assignmentSearch.toLowerCase())
                      )
                      .map((assignment) => {
                        const firstName = assignment.firstName || assignment.first_name || '';
                        const lastName = assignment.lastName || assignment.last_name || '';
                        const empCode = assignment.employeeCode || assignment.employee_code || '';
                        const dept = assignment.departmentName || assignment.department_name || '';
                        const desig = assignment.designationName || assignment.designation_name || '';
                        const shiftName = assignment.shiftName || assignment.shift_name || 'Shift';
                        const shiftCode = assignment.shiftCode || assignment.shift_code || '';
                        const shiftColor = assignment.shiftColor || assignment.shift_color || '#2563eb';
                        const startDate = assignment.assignmentStartDate || assignment.assignment_start_date || '';
                        const endDate = assignment.assignmentEndDate || assignment.assignment_end_date || '';
                        const isCurrent = assignment.isCurrent ?? assignment.is_current ?? true;
                        const empName = `${firstName} ${lastName}`.trim() || 'Employee';

                        return (
                          <tr key={assignment.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8 border border-border shrink-0">
                                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                    {empName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-bold text-xs text-foreground">{empName}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{empCode} {dept || desig ? `• ${dept || desig}` : ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-6 rounded-full shrink-0" style={{ backgroundColor: shiftColor }} />
                                <div>
                                  <p className="text-xs font-bold text-foreground">{shiftName}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{shiftCode}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell font-mono">
                              <p className="text-xs text-foreground">{startDate ? String(startDate).slice(0, 10) : '—'}</p>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell font-mono">
                              <p className="text-xs text-muted-foreground">{endDate ? String(endDate).slice(0, 10) : '—'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className={cn(
                                  'text-[9px] font-bold py-0.5 px-2 border',
                                  isCurrent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-muted text-muted-foreground border-border'
                                )}
                              >
                                {isCurrent ? 'Active' : 'Past'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3 — Swap Requests */}
        <TabsContent value="swaps" className="space-y-4 m-0">
          {loadingSwaps ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-xs text-muted-foreground border border-border/80 rounded-xl bg-card">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="font-bold">Loading shift swap requests...</p>
            </div>
          ) : swapRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-border/80 rounded-xl bg-card">
              <ArrowRightLeft className="w-8 h-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-bold text-foreground">No pending shift swap requests</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shift swap requests submitted by employees will appear here for review.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {swapRequests.map((swap) => {
                const reqFirst = swap.requesterFirstName || swap.requester_first_name || '';
                const reqLast = swap.requesterLastName || swap.requester_last_name || '';
                const reqCode = swap.requesterCode || swap.requester_code || '';
                const reqShift = swap.requestedShiftName || swap.requested_shift_name || 'Shift';

                const swpFirst = swap.swapWithFirstName || swap.swap_with_first_name || '';
                const swpLast = swap.swapWithLastName || swap.swap_with_last_name || '';

                const requesterName = `${reqFirst} ${reqLast}`.trim() || 'Employee';
                const swapWithName = `${swpFirst} ${swpLast}`.trim() || 'Employee';
                const isProcessing = processingSwapId === swap.id;

                const reqDate = swap.requestShiftDate || swap.request_shift_date || '';

                return (
                  <Card key={swap.id} className="border border-border/80 shadow-2xs rounded-xl bg-card p-4">
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-9 h-9 shrink-0 border border-border">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {requesterName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-bold text-foreground">{requesterName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{reqCode}</p>
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>Wants to swap</span>
                              <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">{reqShift}</Badge>
                              <span>with</span>
                              <span className="font-bold text-foreground">{swapWithName}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <CalendarDays className="w-3.5 h-3.5 text-primary" />
                              <span className="font-mono">{reqDate ? String(reqDate).slice(0, 10) : ''}</span>
                              {swap.reason && (
                                <>
                                  <span>•</span>
                                  <span className="italic">"{swap.reason}"</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {swap.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={() => handleRejectSwapRequest(swap.id)}
                                className="h-8 text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                              >
                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleApproveSwapRequest(swap.id)}
                                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Approve
                              </Button>
                            </>
                          ) : (
                            <Badge
                              className={cn(
                                'text-[9px] font-bold py-0.5 px-2 border capitalize',
                                swap.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              )}
                            >
                              {swap.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB — Weekly Roster */}
        <TabsContent value="roster" className="space-y-4 m-0">
          <WeeklyRosterGrid
            rosterShifts={rosterShifts}
            assignments={assignments}
            onRefreshAssignments={loadAssignmentsData}
            assignShift={assignShift}
            deleteAssignment={deleteAssignment}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateShiftModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onShiftCreated={handleShiftCreated}
        createShift={createShift}
        existingShifts={shifts as ShiftTemplate[]}
        defaultShiftType={isRosterPage ? 'Roster' : 'Daily'}
      />

      <EditShiftModal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingShift(null); }}
        shift={editingShift}
        shifts={shifts as ShiftTemplate[]}
        onShiftUpdated={handleShiftUpdated}
        updateShift={updateShift}
      />

      <AssignShiftModal
        open={showAssignModal}
        onClose={() => { setShowAssignModal(false); setPreselectedShift(null); }}
        shifts={shifts as ShiftTemplate[]}
        preselectedShift={preselectedShift}
        onAssigned={handleAssigned}
        assignShift={assignShift}
      />
    </div>
  );
}
