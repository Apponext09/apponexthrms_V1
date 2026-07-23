import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Clock, CheckCircle2, UserCheck, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/config/api';

interface DailyLog {
  id?: number;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: 'present' | 'absent' | 'on_leave' | 'late' | 'early_checkout' | 'holiday' | 'off_day';
  workDurationMinutes?: number | null;
  durationFormatted?: string;
  rawStatus?: string;
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [attendanceLogsMap, setAttendanceLogsMap] = useState<Record<string, DailyLog>>({});
  const [myShiftInfo, setMyShiftInfo] = useState<string>('General Shift (09:00 AM - 06:00 PM)');
  
  // View toggle & calendar states
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Fetch shift, today's status & history on mount / month change
  useEffect(() => {
    fetchMyShift();
    fetchMonthlyAttendance();
  }, [calendarDate]);

  const fetchMyShift = async () => {
    try {
      const res = await apiClient.get('/attendance/my-shift');
      if (res.data?.data) {
        const s = res.data.data;
        const name = s.shift_name || s.shiftName || 'General Shift';
        const start = s.start_time || s.startTime || '09:00 AM';
        const end = s.end_time || s.endTime || '06:00 PM';
        setMyShiftInfo(`${name} (${start} - ${end})`);
      }
    } catch (err) {
      console.log('Using default shift info');
    }
  };

  const fetchMonthlyAttendance = async () => {
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const res = await apiClient.get('/attendance/history', {
        params: { startDate, endDate, pageSize: 100 },
      });

      if (res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];
        const logsMap: Record<string, DailyLog> = {};
        const parsedList: DailyLog[] = [];

        list.forEach((item: any) => {
          let dStr = item.check_in_date || item.date;
          if (dStr) {
            if (typeof dStr !== 'string') {
              dStr = new Date(dStr).toISOString().split('T')[0];
            } else if (dStr.includes('T')) {
              dStr = dStr.split('T')[0];
            }

            let st: DailyLog['status'] = 'present';
            if (item.status === 'on_leave') st = 'on_leave';
            else if (item.status === 'absent') st = 'absent';
            else if (item.status === 'holiday') st = 'holiday';
            else if (item.is_late) st = 'late';
            else if (item.is_early_out) st = 'early_checkout';

            const checkInFormatted = item.check_in_time 
              ? new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--';
            const checkOutFormatted = item.check_out_time 
              ? new Date(item.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--';

            let durationFormatted = '--';
            if (item.work_duration_minutes) {
              const hrs = Math.floor(item.work_duration_minutes / 60);
              const mins = item.work_duration_minutes % 60;
              durationFormatted = `${hrs}h ${mins}m`;
            }

            const dailyObj: DailyLog = {
              id: item.id,
              date: dStr,
              checkInTime: checkInFormatted,
              checkOutTime: checkOutFormatted,
              status: st,
              workDurationMinutes: item.work_duration_minutes || null,
              durationFormatted,
              rawStatus: item.status,
            };

            logsMap[dStr] = dailyObj;
            parsedList.push(dailyObj);
          }
        });

        // Sort descending by date
        parsedList.sort((a, b) => (a.date < b.date ? 1 : -1));
        setLogs(parsedList);
        setAttendanceLogsMap(logsMap);
      }
    } catch (err) {
      console.error('Failed to fetch attendance history:', err);
    }
  };

  // Calendar Controls
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  // Generate Calendar Grid
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean; isWeekend: boolean }> = [];

    // Filler from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false, isWeekend: false });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      const mStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${year}-${mStr}-${dayStr}`;
      const dayOfWeek = dObj.getDay();

      days.push({
        dayNumber: d,
        dateStr: fullDateStr,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return days;
  };

  const getStatusBadge = (status: DailyLog['status'] | null, isWeekend: boolean, isToday: boolean) => {
    if (!status) {
      if (isToday) return { label: 'Today', bg: 'bg-violet-600 text-white font-extrabold' };
      return null;
    }

    switch (status) {
      case 'present':
        return { label: 'Present', bg: 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' };
      case 'late':
        return { label: 'Late', bg: 'bg-amber-500/20 text-amber-600 border border-amber-500/30' };
      case 'early_checkout':
        return { label: 'Early Out', bg: 'bg-orange-500/20 text-orange-600 border border-orange-500/30' };
      case 'on_leave':
        return { label: 'Leave', bg: 'bg-violet-500/20 text-violet-600 border border-violet-500/30' };
      case 'absent':
        return { label: 'Absent', bg: 'bg-rose-500/20 text-rose-600 border border-rose-500/30' };
      case 'holiday':
        return { label: 'Holiday', bg: 'bg-blue-500/20 text-blue-600 border border-blue-500/30' };
      case 'off_day':
        return { label: 'Off Day', bg: 'bg-muted text-muted-foreground/60' };
      default:
        return null;
    }
  };

  // Compute Statistics
  const presentDaysCount = logs.filter(l => l.status === 'present' || l.status === 'late' || l.status === 'early_checkout').length;
  const lateCount = logs.filter(l => l.status === 'late').length;
  const leaveCount = logs.filter(l => l.status === 'on_leave').length;
  const totalWorkdays = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();

  return (
    <div className="space-y-6">
      {/* Top Header Title */}
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">My Attendance & Logs</h2>
        <p className="text-xs text-muted-foreground">View your monthly attendance history, shifts, and check-in records.</p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Days</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">{totalWorkdays}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Present Days</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">{presentDaysCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Late Punch-ins</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">{lateCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Leave Deductions</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">{leaveCount}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table Card / Calendar View */}
      <Card className="border rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          {/* Left Side: Calendar Icon Toggle & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
              className={`h-9 px-3 gap-2 rounded-xl font-bold transition-all ${
                viewMode === 'calendar' ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700' : ''
              }`}
              title={viewMode === 'table' ? 'Switch to Calendar View' : 'Switch to Table View'}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="text-xs">{viewMode === 'table' ? 'Calendar View' : 'Table View'}</span>
            </Button>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              {viewMode === 'table' ? 'Recent Attendance History' : 'Attendance Calendar Grid'}
            </CardTitle>
          </div>

          {/* Right Side: Month Navigation Controls (if Calendar View is active) */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 rounded-xl">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 bg-muted rounded-xl min-w-[120px] text-center">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 rounded-xl">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarDate(new Date())}
                className="text-xs text-violet-600 font-bold ml-1"
              >
                Today
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {viewMode === 'table' ? (
            /* Table View */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Check In</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Check Out</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Duration</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                      No attendance records found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{log.date}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-medium">{log.checkInTime}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-medium">{log.checkOutTime}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{log.durationFormatted}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : log.status === 'late'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            /* Interactive Calendar View Grid */
            <div className="p-6">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={i} className="py-1">{d}</div>
                ))}
              </div>

              {/* Monthly Calendar Cells */}
              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return <div key={idx} className="min-h-[105px] rounded-2xl bg-muted/20 border border-transparent" />;
                  }

                  const todayObj = new Date();
                  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                  const isToday = cell.dateStr === todayStr;
                  const isPast = cell.dateStr < todayStr;
                  const log = attendanceLogsMap[cell.dateStr] || null;

                  let computedStatus: DailyLog['status'] | null = null;
                  if (log) {
                    computedStatus = log.status;
                  } else if (cell.isWeekend) {
                    computedStatus = 'off_day';
                  } else if (isPast) {
                    computedStatus = 'absent';
                  } else {
                    computedStatus = null;
                  }

                  const badge = getStatusBadge(computedStatus, cell.isWeekend, isToday);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[105px] p-2.5 rounded-2xl border flex flex-col justify-between transition-all ${
                        isToday 
                          ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 shadow-md ring-1 ring-violet-500/50' 
                          : 'border-border bg-card hover:border-violet-300'
                      }`}
                    >
                      {/* Day Number & Status Badge */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${isToday ? 'text-violet-600 font-extrabold text-sm' : 'text-foreground'}`}>
                          {cell.dayNumber}
                        </span>
                        {badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${badge.bg}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      {/* Shift Info */}
                      <div className="text-[10px] font-semibold text-muted-foreground truncate mb-1">
                        <span className="text-violet-500 font-medium">Shift: </span>
                        {cell.isWeekend ? 'Off Day' : myShiftInfo}
                      </div>

                      {/* Timing Info (In Time & Out Time) */}
                      <div className="text-[10px] font-mono space-y-0.5 mt-auto pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>In:</span>
                          <span>{log?.checkInTime || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
                          <span>Out:</span>
                          <span>{log?.checkOutTime || '--'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
