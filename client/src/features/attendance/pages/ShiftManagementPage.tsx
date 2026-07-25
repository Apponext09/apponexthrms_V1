import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  SlidersHorizontal,
  CalendarDays,
  TrendingUp,
  ChevronRight,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useShifts } from '../hooks/useShifts';
import { ShiftTemplateCard } from '../components/ShiftTemplateCard';
import { CreateShiftModal } from '../components/CreateShiftModal';
import { EditShiftModal } from '../components/EditShiftModal';
import { AssignShiftModal } from '../components/AssignShiftModal';
import type { ShiftTemplate } from '../types';

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${gradient}`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-extrabold leading-none mb-1">{value}</p>
        <p className="text-sm font-semibold text-white/80">{label}</p>
        {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shift Management Page
// ─────────────────────────────────────────────────────────────

export function ShiftManagementPage() {
  const {
    shifts,
    loading,
    getAllShifts,
    createShift,
    updateShift,
    deleteShift,
    assignShift,
    getAllAssignments,
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

  // ── Load data ──────────────────────────────────────────────

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
    } catch (err) {
      toast.error('Failed to load shift assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }, [getAllAssignments]);

  const loadSwapRequestsData = useCallback(async () => {
    setLoadingSwaps(true);
    try {
      const data = await getAllSwapRequests();
      setSwapRequests(data);
    } catch (err) {
      toast.error('Failed to load swap requests');
    } finally {
      setLoadingSwaps(false);
    }
  }, [getAllSwapRequests]);

  useEffect(() => {
    if (activeTab === 'assignments' || activeTab === 'roster') loadAssignmentsData();
    if (activeTab === 'swaps') loadSwapRequestsData();
  }, [activeTab, loadAssignmentsData, loadSwapRequestsData]);

  // ── Handlers ───────────────────────────────────────────────

  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setShowEditModal(true);
  };

  const handleDeleteShift = async (shift: any) => {
    const name = shift.shiftName || shift.shift_name || 'this shift';
    if (confirm(`Are you sure you want to delete shift "${name}"?`)) {
      try {
        await deleteShift(shift.id);
        toast.success(`Shift "${name}" deleted successfully`);
        fetchShifts();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to delete shift');
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

  const handleShiftCreated = (_shift: any) => {
    fetchShifts();
  };

  const handleShiftUpdated = (_shift: any) => {
    fetchShifts();
  };

  const handleApproveSwapRequest = async (swapId: number) => {
    setProcessingSwapId(swapId);
    try {
      await approveSwap(swapId);
      toast.success('Shift swap request approved');
      loadSwapRequestsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to approve swap');
    } finally {
      setProcessingSwapId(null);
    }
  };

  const handleRejectSwapRequest = async (swapId: number) => {
    setProcessingSwapId(swapId);
    try {
      await rejectSwap(swapId);
      toast.success('Shift swap request rejected');
      loadSwapRequestsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reject swap');
    } finally {
      setProcessingSwapId(null);
    }
  };

  // ── Helper to format time strings ──────────────────────────

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

  // ── Filtered shifts data (supports camelCase & snake_case) ──

  const filteredShifts = (shifts as any[]).filter((s) => {
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

  const activeShifts = (shifts as any[]).filter((s) => (s.status || 'active') === 'active');
  const nightShifts = (shifts as any[]).filter((s) => (s.isNightShift ?? s.is_night_shift));
  const rosterShifts = (shifts as any[]).filter((s) => (s.shiftType || s.shift_type) === 'roster');

  const DAYS = [
    { key: 'mon', name: 'Mon', date: '28' },
    { key: 'tue', name: 'Tue', date: '29' },
    { key: 'wed', name: 'Wed', date: '30' },
    { key: 'thu', name: 'Thu', date: '31' },
    { key: 'fri', name: 'Fri', date: '1' },
    { key: 'sat', name: 'Sat', date: '2' },
    { key: 'sun', name: 'Sun', date: '3' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* ── Page Header ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Shift Management</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11.5">
            Create shift templates, assign schedules to employees and manage shift swaps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchShifts(); loadAssignmentsData(); loadSwapRequestsData(); }}
            className="gap-1.5 rounded-xl text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAssignModal(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5 text-xs font-bold"
          >
            <UserCheck className="w-3.5 h-3.5" /> Assign Shift
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> New Shift
          </Button>
        </div>
      </div>

      {/* ── KPI Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Active Shifts"
          value={activeShifts.length}
          sub="Shift templates live"
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
        />
        <StatCard
          icon={Users}
          label="Total Templates"
          value={(shifts as any[]).length}
          sub="All defined shifts"
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
        />
        <StatCard
          icon={CalendarDays}
          label="Roster Shifts"
          value={rosterShifts.length}
          sub="Roster schedule shifts"
          gradient="bg-gradient-to-br from-amber-500 to-amber-700"
        />
        <StatCard
          icon={TrendingUp}
          label="Night Shifts"
          value={nightShifts.length}
          sub="Night schedules"
          gradient="bg-gradient-to-br from-slate-600 to-slate-800"
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto">
          <TabsTrigger value="shifts" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" /> Shift Templates
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <Users className="w-3.5 h-3.5" /> Assignments
          </TabsTrigger>
          <TabsTrigger value="swaps" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Swap Requests
          </TabsTrigger>
          <TabsTrigger value="roster" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Weekly Roster
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB 1 — Shift Templates                          */}
        {/* ══════════════════════════════════════════════════ */}
        <TabsContent value="shifts" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search shift name, code, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>
            <div className="flex items-center gap-1 border border-border rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border bg-card h-64 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filteredShifts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <CalendarClock className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No shift templates found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term.' : 'Create your first shift template to get started.'}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create First Shift
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
            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Shift</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Timings</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                    const color = shift.color || '#6366f1';
                    const status = shift.status || 'active';

                    return (
                      <tr key={shift.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <div>
                              <p className="font-bold text-foreground text-xs">{name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="outline" className="text-[9px] rounded-full capitalize border-muted-foreground/30">
                            {type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs font-mono text-foreground">
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
                          <p className="text-xs font-semibold">{duration}h</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              'text-[9px] rounded-full border-0',
                              status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs rounded-lg gap-1"
                              onClick={() => handleAssignClick(shift)}
                            >
                              <UserCheck className="w-3 h-3" /> Assign
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-muted-foreground/30"
                              onClick={() => handleEditShift(shift)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteShift(shift)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB 2 — Assignments                              */}
        {/* ══════════════════════════════════════════════════ */}
        <TabsContent value="assignments" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employee or shift..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={() => { setPreselectedShift(null); setShowAssignModal(true); }}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5 text-xs font-bold"
            >
              <UserCheck className="w-3.5 h-3.5" /> Assign New
            </Button>
          </div>

          {loadingAssignments ? (
            <div className="rounded-2xl border bg-card h-48 animate-pulse flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Users className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No shift assignments yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the "Assign New" button or click "Assign Shift" on any shift template.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => { setPreselectedShift(null); setShowAssignModal(true); }}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5"
              >
                <UserCheck className="w-4 h-4" /> Make First Assignment
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Shift</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Start Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">End Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                      const shiftColor = assignment.shiftColor || assignment.shift_color || '#6366f1';
                      const startDate = assignment.assignmentStartDate || assignment.assignment_start_date || '';
                      const endDate = assignment.assignmentEndDate || assignment.assignment_end_date || '';
                      const isCurrent = assignment.isCurrent ?? assignment.is_current ?? true;
                      const empName = `${firstName} ${lastName}`.trim() || 'Employee';

                      return (
                        <tr key={assignment.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarFallback className="text-xs font-bold bg-muted">
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
                              <div className="w-2.5 h-6 rounded-full" style={{ backgroundColor: shiftColor }} />
                              <div>
                                <p className="text-xs font-bold text-foreground">{shiftName}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{shiftCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-foreground">{startDate ? String(startDate).slice(0, 10) : '—'}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-xs text-muted-foreground">{endDate ? String(endDate).slice(0, 10) : '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={cn(
                                'text-[9px] rounded-full border-0',
                                isCurrent
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500'
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
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB 3 — Swap Requests                            */}
        {/* ══════════════════════════════════════════════════ */}
        <TabsContent value="swaps" className="mt-6 space-y-4">
          {loadingSwaps ? (
            <div className="rounded-2xl border bg-card h-48 animate-pulse flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading swap requests...
            </div>
          ) : swapRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <ArrowRightLeft className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No pending swap requests</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Shift swap requests submitted by employees will appear here for admin review.
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
                  <Card key={swap.id} className="rounded-2xl border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-9 h-9 flex-shrink-0">
                            <AvatarFallback className="text-xs font-bold bg-violet-100 text-violet-700">
                              {requesterName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-bold text-foreground">{requesterName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{reqCode}</p>
                            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>Wants to swap</span>
                              <Badge variant="outline" className="text-[9px] rounded-full">{reqShift}</Badge>
                              <span>with</span>
                              <span className="font-semibold text-foreground">{swapWithName}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <CalendarDays className="w-3 h-3" />
                              {reqDate ? String(reqDate).slice(0, 10) : ''}
                              {swap.reason && (
                                <>
                                  <span>•</span>
                                  <span className="italic">"{swap.reason}"</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {swap.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={() => handleRejectSwapRequest(swap.id)}
                                className="h-8 rounded-xl gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              >
                                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleApproveSwapRequest(swap.id)}
                                className="h-8 rounded-xl gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Approve
                              </Button>
                            </>
                          ) : (
                            <Badge
                              className={cn(
                                'text-[9px] rounded-full border-0 capitalize',
                                swap.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
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

        {/* ══════════════════════════════════════════════════ */}
        {/* TAB 4 — Weekly Roster (Dynamic Assignment View)  */}
        {/* ══════════════════════════════════════════════════ */}
        <TabsContent value="roster" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Weekly Roster Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Dynamic employee shift schedule based on active assignments</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={loadAssignmentsData} className="rounded-xl text-xs gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
          </div>

          {/* Roster Table — Built dynamically from real assignments */}
          {loadingAssignments ? (
            <div className="rounded-2xl border bg-card h-48 animate-pulse flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Building roster schedule...
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <CalendarDays className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No shift assignments to build roster</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign shifts to employees in the "Assignments" tab to view their weekly roster here.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => { setPreselectedShift(null); setShowAssignModal(true); }}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-1.5"
              >
                <UserCheck className="w-4 h-4" /> Assign First Shift
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground w-48">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground">Assigned Shift</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground hidden md:table-cell">Timings</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground">Start Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignments.map((assignment) => {
                    const firstName = assignment.firstName || assignment.first_name || '';
                    const lastName = assignment.lastName || assignment.last_name || '';
                    const empCode = assignment.employeeCode || assignment.employee_code || '';
                    const dept = assignment.departmentName || assignment.department_name || '';
                    const desig = assignment.designationName || assignment.designation_name || '';
                    const shiftName = assignment.shiftName || assignment.shift_name || 'Shift';
                    const shiftCode = assignment.shiftCode || assignment.shift_code || '';
                    const shiftColor = assignment.shiftColor || assignment.shift_color || '#6366f1';
                    const shiftType = assignment.shiftType || assignment.shift_type || 'fixed';
                    const startTime = assignment.startTime || assignment.start_time;
                    const endTime = assignment.endTime || assignment.end_time;
                    const startDate = assignment.assignmentStartDate || assignment.assignment_start_date || '';
                    const isCurrent = assignment.isCurrent ?? assignment.is_current ?? true;
                    const empName = `${firstName} ${lastName}`.trim() || 'Employee';

                    return (
                      <tr key={assignment.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarFallback className="text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                {empName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{empName}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{empCode} {dept || desig ? `• ${dept || desig}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: shiftColor }} />
                            <div>
                              <p className="text-xs font-bold text-foreground">{shiftName}</p>
                              <span className="text-[9px] font-mono text-muted-foreground">{shiftCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="outline" className="text-[9px] rounded-full capitalize">
                            {shiftType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs font-mono text-foreground">
                            {shiftType === 'roster'
                              ? 'Weekly Roster Plan'
                              : startTime && endTime
                                ? `${formatTime(startTime)} – ${formatTime(endTime)}`
                                : 'Flexible'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {startDate ? String(startDate).slice(0, 10) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              'text-[9px] rounded-full border-0',
                              isCurrent
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-500'
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
          )}
        </TabsContent>
      </Tabs>

      {/* ── Modals ──────────────────────────────────────── */}
      <CreateShiftModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onShiftCreated={handleShiftCreated}
        createShift={createShift}
        existingShifts={shifts as ShiftTemplate[]}
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
