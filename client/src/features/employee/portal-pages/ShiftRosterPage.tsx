import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import {
  Clock,
  MapPin,
  Building,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowUpDown,
  User,
  Coffee,
  CalendarDays,
  FileText,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Loader2,
  List,
  Grid
} from 'lucide-react';
import { toast } from 'sonner';

interface RosterDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  shift?: any;
}

export default function ShiftRosterPage() {
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [submittingSwap, setSubmittingSwap] = useState(false);

  // States
  const [todayShift, setTodayShift] = useState<any>(null);
  const [rosterInfo, setRosterInfo] = useState<any>(null);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6, 1)); // Default to July 2026 for development
  const [shiftsRangeMap, setShiftsRangeMap] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Swap Request Form States
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapDate, setSwapDate] = useState('');
  const [swapWithEmployeeId, setSwapWithEmployeeId] = useState('');
  const [swapReason, setSwapReason] = useState('');

  // Selected Date Details Popover/Overlay
  const [selectedDayDetails, setSelectedDayDetails] = useState<any>(null);

  // Helper local date string builder
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper 12h format
  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '--';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Fetch today's shift
  const fetchTodayShift = async () => {
    try {
      const res = await apiClient.get('/attendance/my-shifts/today');
      if (res.data?.success && res.data?.data) {
        setTodayShift(res.data.data);
      } else {
        setTodayShift(null);
      }
    } catch (err) {
      console.error('Failed to fetch today shift:', err);
    }
  };

  // Fetch roster pattern info
  const fetchRosterPattern = async () => {
    setLoadingRoster(true);
    try {
      const res = await apiClient.get('/attendance/my-roster-pattern');
      if (res.data?.success && res.data?.data) {
        setRosterInfo(res.data.data);
      } else {
        setRosterInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch roster pattern:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Fetch swap requests history
  const fetchSwapRequests = async () => {
    setLoadingSwaps(true);
    try {
      const res = await apiClient.get('/attendance/shift-swap-requests/mine');
      if (res.data?.success && res.data?.data) {
        setSwapRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch swap requests:', err);
    } finally {
      setLoadingSwaps(false);
    }
  };

  // Fetch employees list for swap selection (only those with active shift assignments)
  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/attendance/shifts/assignments?isCurrent=true&pageSize=500');
      if (res.data?.success && Array.isArray(res.data.data)) {
        // Extract unique employees from active assignments
        const uniqueMap = new Map();
        res.data.data.forEach((assignment: any) => {
          const empId = assignment.employee_id || assignment.employeeId;
          if (empId && !uniqueMap.has(empId)) {
            uniqueMap.set(empId, {
              id: empId,
              firstName: assignment.first_name || assignment.firstName || '',
              lastName: assignment.last_name || assignment.lastName || '',
              employeeCode: assignment.employee_code || assignment.employeeCode || ''
            });
          }
        });
        setEmployees(Array.from(uniqueMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch eligible employees list:', err);
    }
  };

  // Fetch shifts for the calendar month range
  const fetchShiftsForMonth = async (date: Date) => {
    setLoadingShifts(true);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Add pads for grid query
    const padStart = new Date(firstDay);
    padStart.setDate(firstDay.getDate() - 7);
    const padEnd = new Date(lastDay);
    padEnd.setDate(lastDay.getDate() + 7);

    const fromStr = formatDateLocal(padStart);
    const toStr = formatDateLocal(padEnd);

    try {
      const res = await apiClient.get(`/attendance/my-shifts?from=${fromStr}&to=${toStr}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const map: Record<string, any> = {};
        res.data.data.forEach((s: any) => {
          map[s.date] = s;
        });
        setShiftsRangeMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch shifts in range:', err);
      toast.error('Failed to load roster dates');
    } finally {
      setLoadingShifts(false);
    }
  };

  // Handle month changes
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Initialize page data
  useEffect(() => {
    fetchTodayShift();
    fetchRosterPattern();
    fetchSwapRequests();
    fetchEmployees();
  }, []);

  // Fetch shifts when viewed month changes
  useEffect(() => {
    fetchShiftsForMonth(currentMonth);
  }, [currentMonth]);

  // Submit Shift Swap Request
  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('👉 handleSwapSubmit triggered:', { swapDate, swapWithEmployeeId, swapReason });
    
    if (!swapDate || !swapWithEmployeeId) {
      const msg = `Validation failed: ${!swapDate ? 'Please choose a Date. ' : ''}${!swapWithEmployeeId ? 'Please choose a Teammate.' : ''}`;
      console.warn(msg);
      alert(msg);
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingSwap(true);
    try {
      const selectedDayShift = shiftsRangeMap[swapDate];
      const reqShiftId = selectedDayShift ? selectedDayShift.shiftId : null;

      const payload = {
        requestShiftDate: swapDate,
        requestedShiftId: reqShiftId,
        swapWithEmployeeId: parseInt(swapWithEmployeeId, 10),
        swapShiftDate: swapDate, // Assuming same day swap for simplicity
        reason: swapReason
      };

      console.log('Sending API Swap payload:', payload);

      const res = await apiClient.post('/attendance/shift-swap-requests', payload);
      console.log('API Response received:', res.data);

      if (res.data?.success) {
        alert('Shift swap request submitted successfully!');
        toast.success('Shift swap request submitted successfully!');
        setIsSwapModalOpen(false);
        setSwapDate('');
        setSwapWithEmployeeId('');
        setSwapReason('');
        fetchSwapRequests();
      } else {
        const errorMsg = res.data?.error?.message || 'Failed to submit shift swap';
        console.error(errorMsg);
        alert(`Error: ${errorMsg}`);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Something went wrong';
      console.error('Swap API Exception:', err);
      alert(`API Exception: ${errMsg}`);
      toast.error(errMsg);
    } finally {
      setSubmittingSwap(false);
    }
  };

  // Open swap dialog with default date
  const triggerSwapForDate = (dateStr: string) => {
    const dayShift = shiftsRangeMap[dateStr];
    if (dayShift?.isOffDay) {
      toast.warning('You do not have a shift assigned on off days.');
      return;
    }
    setSwapDate(dateStr);
    setIsSwapModalOpen(true);
  };

  // Calendar cells builder
  const getCalendarCells = (): RosterDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday = 0
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const cells: RosterDay[] = [];

    // Prepend previous month trailing days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const d = new Date(year, month - 1, day);
      const dateStr = formatDateLocal(d);
      cells.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        shift: shiftsRangeMap[dateStr]
      });
    }

    // Current month days
    for (let i = 1; i <= numDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatDateLocal(d);
      cells.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        shift: shiftsRangeMap[dateStr]
      });
    }

    // Append next month leading days
    const totalCells = 42; // Standard 6-row layout
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatDateLocal(d);
      cells.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        shift: shiftsRangeMap[dateStr]
      });
    }

    return cells;
  };

  const calendarCells = getCalendarCells();

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20 px-2 py-0.5 rounded-full font-bold">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Pending</Badge>;
    }
  };

  const formatRosterDays = (days?: string[]) => {
    if (!days || days.length === 0) return 'None';
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6 text-slate-800 dark:text-slate-100">
      
      {/* 1. Header Banner */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-pulse" /> My Shifts & Roster
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View your shifts schedule, understand your weekly roster rules, and coordinate swaps with teammates.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            id="btn-request-swap-header"
            onClick={() => setIsSwapModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md w-full md:w-auto transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Request Shift Swap
          </Button>
        </div>
      </div>

      {/* 2. Today's Shift Card (Top Banner) */}
      <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg bg-card transition-all hover:shadow-xl">
        <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-transparent border-b border-indigo-500/15 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Today's Roster Status
            </h3>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {todayShift && !todayShift.isOffDay && (
            <Badge className="text-xs font-bold font-mono px-3 py-1 rounded-lg bg-indigo-600 text-white dark:bg-indigo-500">
              {formatTime12h(todayShift.startTime)} - {formatTime12h(todayShift.endTime)}
            </Badge>
          )}
        </div>

        <CardContent className="p-6">
          {todayShift ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* Shift info */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3.5 rounded-2xl text-white shadow-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: todayShift.color || '#6366F1' }}
                  >
                    <Clock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {todayShift.shiftName}
                      </h4>
                      <Badge variant="outline" className="font-mono text-[10px] font-bold py-0 px-2 uppercase" style={{ color: todayShift.color, borderColor: todayShift.color }}>
                        {todayShift.shiftCode}
                      </Badge>
                      {todayShift.isNightShift && (
                        <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-bold rounded">Night Shift</Badge>
                      )}
                      {todayShift.isFlexible && (
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold rounded">Flexible</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {todayShift.description || 'No description provided for this shift.'}
                    </p>
                  </div>
                </div>

                {/* Grid metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Timings</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {todayShift.isFlexible ? 'Flexible Start' : `${formatTime12h(todayShift.startTime)} - ${formatTime12h(todayShift.endTime)}`}
                    </span>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Grace Period</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5 text-indigo-500" /> {todayShift.gracePeriodMinutes || 0} mins
                    </span>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Break Duration</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {todayShift.breakDurationMinutes || 0} mins
                    </span>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Roster Type</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 capitalize">
                      {todayShift.isOffDay ? 'Off Day' : 'Working Day'}
                    </span>
                  </div>
                </div>
              </div>

              {/* simulated checkin map */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 h-44 flex flex-col justify-end p-3 shadow-inner">
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                <div className="absolute left-1/4 top-1/2 w-1/2 h-1 bg-indigo-500/20 rounded transform rotate-12" />
                <div className="absolute left-1/3 top-1/4 w-1.5 h-20 bg-emerald-500/20 rounded" />
                
                <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-lg text-white">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-slate-100 dark:border-slate-700">
                    Navi Mumbai HQ Geofence
                  </span>
                </div>

                <div className="z-10 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold w-full">
                  <span className="font-extrabold">Office Location Map</span>
                  <span>Active Bounds</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400">
                <Clock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-950 dark:text-white">No Shift Scheduled Today</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  You are either marked as OFF today or no shift pattern has been assigned. Enjoy your day off!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Main Content: Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT/MID: Calendar & Shifts List (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between gap-4 space-y-0">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-black">Shift Schedule</CardTitle>
                <CardDescription className="text-xs">Browse calendar grid or list layout</CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggles */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/40 dark:border-slate-850">
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className={`h-7 px-2.5 rounded-md text-xs font-bold gap-1 ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    <Grid className="w-3.5 h-3.5" /> Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`h-7 px-2.5 rounded-md text-xs font-bold gap-1 ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    <List className="w-3.5 h-3.5" /> List
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 space-y-4">
              
              {/* Calendar Navigator */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-150/50 dark:border-slate-850">
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-700 bg-background"
                    onClick={prevMonth}
                    disabled={loadingShifts}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl text-xs font-black border-slate-200 dark:border-slate-700 bg-background"
                    onClick={() => setCurrentMonth(new Date(2026, 6, 1))} // Reset to seeded default
                  >
                    Current
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-700 bg-background"
                    onClick={nextMonth}
                    disabled={loadingShifts}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {loadingShifts ? (
                // Skeletons
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ) : viewMode === 'calendar' ? (
                <div className="space-y-4">
                  {/* Grid Header */}
                  <div className="grid grid-cols-7 gap-2 md:gap-3 text-center mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <span key={d} className="text-xs md:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Grid Cells */}
                  <div className="grid grid-cols-7 gap-2 md:gap-3">
                    {calendarCells.map((cell, idx) => {
                      const hasShift = cell.shift && !cell.shift.isOffDay;
                      const shiftColor = cell.shift?.color || '#94A3B8';
                      const isToday = formatDateLocal(new Date()) === cell.dateStr;

                      return (
                        <Popover key={`${cell.dateStr}-${idx}`}>
                          <PopoverTrigger asChild>
                            <button
                              id={`calendar-cell-${cell.dateStr}`}
                              className={`w-full min-h-[90px] sm:min-h-[110px] md:min-h-[120px] rounded-2xl border p-3 flex flex-col justify-between items-start transition-all relative group hover:scale-[1.03] hover:shadow-md ${
                                cell.isCurrentMonth
                                  ? 'bg-background border-slate-100 dark:border-slate-800'
                                  : 'bg-slate-50/40 dark:bg-slate-900/10 border-slate-100/50 dark:border-slate-900 text-slate-400'
                              } ${
                                isToday 
                                  ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-indigo-500/20' 
                                  : ''
                              }`}
                            >
                              {/* Day Number */}
                              <span className={`text-sm md:text-base font-black ${
                                isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-350'
                              }`}>
                                {cell.date.getDate()}
                              </span>

                              {/* Shift indicator or Dot */}
                              {cell.shift ? (
                                cell.shift.isOffDay ? (
                                  <span className="text-[10px] md:text-xs font-extrabold text-slate-400 dark:text-slate-600 tracking-wider">OFF</span>
                                ) : (
                                  <div className="w-full flex items-center justify-between gap-1 mt-auto">
                                    {/* Color Pill */}
                                    <span 
                                      className="h-2 w-2 rounded-full shrink-0 animate-pulse"
                                      style={{ backgroundColor: shiftColor }}
                                    />
                                    <span className="text-[9px] md:text-xs font-black truncate max-w-[65px] uppercase font-mono tracking-tight" style={{ color: shiftColor }}>
                                      {cell.shift.shiftCode}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-[10px] md:text-xs font-bold text-slate-350 dark:text-slate-700">No shift</span>
                              )}
                            </button>
                          </PopoverTrigger>

                          {/* Day Details Popover */}
                          <PopoverContent className="w-72 p-4 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 bg-card z-50">
                            {cell.shift ? (
                              <div className="space-y-4">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="space-y-0.5">
                                    <h4 className="text-sm font-black text-slate-950 dark:text-white">
                                      {cell.shift.isOffDay ? 'Off Day' : cell.shift.shiftName}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                      {cell.date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                                    </p>
                                  </div>
                                  {!cell.shift.isOffDay && (
                                    <Badge 
                                      className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase" 
                                      style={{ backgroundColor: `${shiftColor}15`, color: shiftColor, border: `1px solid ${shiftColor}30` }}
                                    >
                                      {cell.shift.shiftCode}
                                    </Badge>
                                  )}
                                </div>

                                {!cell.shift.isOffDay ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-3">
                                      <div>
                                        <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Timings</span>
                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                          {cell.shift.isFlexible ? 'Flexible' : `${formatTime12h(cell.shift.startTime)} - ${formatTime12h(cell.shift.endTime)}`}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Break Duration</span>
                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                          {cell.shift.breakDurationMinutes || 0} mins
                                        </span>
                                      </div>
                                      <div className="mt-1">
                                        <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Grace Period</span>
                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                          {cell.shift.gracePeriodMinutes || 0} mins
                                        </span>
                                      </div>
                                      <div className="mt-1">
                                        <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Status</span>
                                        <span className="font-extrabold text-emerald-600 dark:text-emerald-450">Active Shift</span>
                                      </div>
                                    </div>
                                    
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal border-t border-slate-100 dark:border-slate-800 pt-2.5">
                                      {cell.shift.description || 'No specific descriptions.'}
                                    </p>

                                    <Button
                                      id={`btn-swap-${cell.dateStr}`}
                                      size="sm"
                                      onClick={() => triggerSwapForDate(cell.dateStr)}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-8 rounded-xl shadow"
                                    >
                                      Request Shift Swap
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-center py-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Weekly roster off day. You have no work shift assigned for this date.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 text-center">No shifts data loaded for this date.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* LIST VIEW */
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                  {calendarCells.filter(c => c.isCurrentMonth).map((cell) => {
                    const isOff = !cell.shift || cell.shift.isOffDay;
                    const shiftColor = cell.shift?.color || '#94A3B8';

                    return (
                      <div 
                        key={cell.dateStr}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 hover:border-slate-200/80 dark:hover:border-slate-750 transition-all ${
                          isOff ? 'bg-slate-50/30 dark:bg-slate-900/10' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Date details */}
                          <div className="flex flex-col items-start min-w-[70px]">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase font-mono">
                              {cell.date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {cell.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {isOff ? (
                              <span className="text-xs font-black text-slate-400 dark:text-slate-650 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-350 dark:bg-slate-700" /> Off Day
                              </span>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: shiftColor }} />
                                  {cell.shift.shiftName}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                                  ({formatTime12h(cell.shift.startTime)} - {formatTime12h(cell.shift.endTime)})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {!isOff && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => triggerSwapForDate(cell.dateStr)}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 font-black text-xs rounded-xl h-8"
                          >
                            Swap
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Roster rules & Swap requests */}
        <div className="space-y-6">
          
          {/* 4. Roster Pattern Panel */}
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/85">
              <CardTitle className="text-base font-black">Roster Cycle Rules</CardTitle>
              <CardDescription className="text-xs font-semibold">Your current week rotation rules</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {loadingRoster ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : rosterInfo?.rosterPattern ? (
                <div className="space-y-4">
                  {/* Pattern cycle description */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assigned Week Pattern</span>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Working Days: {formatRosterDays(rosterInfo.rosterPattern.daysIncluded)}
                    </p>
                  </div>

                  {/* Rotation details */}
                  <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Pattern Cycle Week</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-350">Week {rosterInfo.currentWeek}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Status</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-450 uppercase">{rosterInfo.currentStatus}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-200/50 dark:border-slate-800/80 pt-2 mt-1">
                      <span className="text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider text-[8px]">Next rotation change</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                        {rosterInfo.nextChangeDate ? new Date(rosterInfo.nextChangeDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Continuous'}
                      </span>
                    </div>
                  </div>

                  {/* Excluded Saturdays rule */}
                  {rosterInfo.rosterPattern.excludedWorkingPattern?.sat && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Special Saturday Rule</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal font-semibold">
                        Saturdays (2nd and 4th) are working, requiring a clock-in at {formatTime12h(rosterInfo.rosterPattern.excludedWorkingPattern.sat.checkInTime || '09:00:00')}.
                      </p>
                    </div>
                  )}

                  {/* Behavior rules */}
                  <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Policies In-Effect</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rosterInfo.rosterPattern.behaviorToggles?.excludeBreakTime && (
                        <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-250/20 text-[9px] font-bold py-0.5 px-2">Break Excluded</Badge>
                      )}
                      {rosterInfo.rosterPattern.behaviorToggles?.noLateDeduction && (
                        <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-250/20 text-[9px] font-bold py-0.5 px-2">No Late Deduct</Badge>
                      )}
                      <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-250/20 text-[9px] font-bold py-0.5 px-2">Geofence Active</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No active pattern info available.</p>
              )}
            </CardContent>
          </Card>

          {/* 5. Swap History List */}
          <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/85">
              <CardTitle className="text-base font-black">Swap Requests</CardTitle>
              <CardDescription className="text-xs font-semibold">Your swap coordinates history</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {loadingSwaps ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : swapRequests.length > 0 ? (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {swapRequests.map((req) => {
                    const reqDate = new Date(req.requestShiftDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    const swapDateVal = new Date(req.swapShiftDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                    const swapColor = req.requestedShiftColor || '#6366F1';

                    return (
                      <div 
                        key={req.id} 
                        className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 hover:border-slate-200/60 dark:hover:border-slate-750 transition-all space-y-2.5 bg-slate-50/10 dark:bg-slate-900/10"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Request Date</span>
                            <span className="text-xs font-black text-slate-850 dark:text-slate-250">{reqDate}</span>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="space-y-1 text-[11px] border-t border-slate-100 dark:border-slate-850 pt-2">
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span className="font-bold flex items-center gap-1"><User className="w-3.5 h-3.5 text-indigo-500" /> Swap With:</span>
                            <span className="font-extrabold text-slate-850 dark:text-slate-350">{req.swapWithFirstName} {req.swapWithLastName}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span className="font-bold">My Shift:</span>
                            <span className="font-extrabold flex items-center gap-1.5" style={{ color: swapColor }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: swapColor }} />
                              {req.requestedShiftName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span className="font-bold">Colleague Shift:</span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-350">{req.swapShiftName} ({req.swapShiftCode})</span>
                          </div>
                          {req.reason && (
                            <p className="text-[10px] italic text-slate-400 dark:text-slate-500 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800">
                              "{req.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">No shift swap requests</p>
                  <p className="text-[10px] text-slate-500">Submit swap requests to colleague to modify roster dates.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 6. Request Shift Swap Dialog Modal */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-md p-6 rounded-3xl shadow-2xl border border-slate-150 dark:border-slate-850 bg-card">
          <DialogHeader className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" /> Swap Shift Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Coordinate and exchange scheduled shift timings with an active teammate in your department.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSwapSubmit} className="space-y-4 pt-3">
            {/* Swap Date Dropdown Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="swap-date" className="text-xs font-black uppercase text-slate-400 tracking-wider">Requested Shift Date</Label>
              <Select value={swapDate} onValueChange={setSwapDate}>
                <SelectTrigger id="swap-date" className="rounded-xl border-slate-200 dark:border-slate-700 bg-background h-10 text-xs font-semibold">
                  <SelectValue placeholder="Choose shift date..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(shiftsRangeMap).filter((wd: any) => !wd.isOffDay).length > 0 ? (
                    Object.values(shiftsRangeMap)
                      .filter((wd: any) => !wd.isOffDay)
                      .sort((a: any, b: any) => a.date.localeCompare(b.date))
                      .map((wd: any) => {
                        const formatted = new Date(wd.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                        return (
                          <SelectItem key={wd.date} value={wd.date}>
                            {formatted} — {wd.shiftName}
                          </SelectItem>
                        );
                      })
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">No working shifts scheduled.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Teammate Lookup Select */}
            <div className="space-y-1.5">
              <Label htmlFor="swap-colleague" className="text-xs font-black uppercase text-slate-400 tracking-wider">Choose Teammate</Label>
              <Select value={swapWithEmployeeId} onValueChange={setSwapWithEmployeeId}>
                <SelectTrigger id="swap-colleague" className="rounded-xl border-slate-200 dark:border-slate-700 bg-background h-10 text-xs font-semibold">
                  <SelectValue placeholder="Select colleague..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)} className="text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                        {emp.firstName} {emp.lastName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">No colleagues found.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="swap-reason" className="text-xs font-black uppercase text-slate-400 tracking-wider">Reason for swap</Label>
              <Textarea
                id="swap-reason"
                placeholder="Brief reason for requested roster change..."
                required
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold min-h-[80px] focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
              />
            </div>

            {/* Actions */}
            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 flex sm:flex-row justify-end">
              <DialogClose asChild>
                <Button 
                  id="btn-cancel-swap"
                  type="button" 
                  variant="outline" 
                  className="rounded-xl text-xs font-black border-slate-200 dark:border-slate-700 h-9"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                id="btn-submit-swap"
                type="submit"
                disabled={submittingSwap}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 rounded-xl shadow h-9 gap-1.5"
              >
                {submittingSwap ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
