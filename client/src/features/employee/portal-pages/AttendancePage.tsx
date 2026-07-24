import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Clock, CheckCircle2, UserCheck, AlertCircle, ChevronLeft, ChevronRight, MapPin, Navigation, Play, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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

  // GPS Geolocation & Punch State
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'checked_in' | 'completed'>('not_started');
  const [checkInTime, setCheckInTime] = useState<string>('--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--');
  const [workDuration, setWorkDuration] = useState<string>('--');
  const [durationSeconds, setDurationSeconds] = useState(0);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Geolocation is not supported by your browser');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsStatus('success');
        setGpsErrorMsg(null);
      },
      (err) => {
        setGpsStatus('error');
        setGpsErrorMsg(err.message || 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchTodayStatus = async () => {
    try {
      const res = await apiClient.get('/attendance/status');
      if (res.data?.data) {
        const st = res.data.data;
        if (st.isCheckedOut) {
          setCheckInStatus('completed');
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          const outT = st.checkOutTime ? formatTime(new Date(st.checkOutTime)) : '--';
          setCheckInTime(inT);
          setCheckOutTime(outT);

          const dur = computeWorkDuration({ check_in_time: st.checkInTime, check_out_time: st.checkOutTime, checkInTime: inT, checkOutTime: outT }, false);
          setWorkDuration(dur);
        } else if (st.isCheckedIn) {
          setCheckInStatus('checked_in');
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          setCheckInTime(inT);

          const dur = computeWorkDuration({ check_in_time: st.checkInTime, checkInTime: inT }, true);
          setWorkDuration(dur);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    }
  };

  useEffect(() => {
    fetchLocation();
    fetchTodayStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkInStatus === 'checked_in') {
      interval = setInterval(() => {
        setDurationSeconds(prev => {
          const next = prev + 1;
          const hrs = Math.floor(next / 3600).toString().padStart(2, '0');
          const mins = Math.floor((next % 3600) / 60).toString().padStart(2, '0');
          const secs = (next % 60).toString().padStart(2, '0');
          setWorkDuration(`${hrs}h ${mins}m ${secs}s`);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [checkInStatus]);

  const handleCheckInToggle = async () => {
    if (checkInStatus === 'not_started') {
      try {
        const payload: any = { method: 'web_portal' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }

        const res = await apiClient.post('/attendance/check-in', payload);
        if (res.data?.success) {
          setCheckInStatus('checked_in');
          setCheckInTime(formatTime(new Date()));
          setDurationSeconds(0);
          setWorkDuration('0h 0m');
          toast.success('Punched In successfully! GPS Location verified.');
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-in failed';
        toast.error(errorMsg);
      }
    } else if (checkInStatus === 'checked_in') {
      try {
        const payload: any = { method: 'web_portal' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }

        const res = await apiClient.post('/attendance/check-out', payload);
        if (res.data?.success) {
          const outT = formatTime(new Date());
          setCheckInStatus('completed');
          setCheckOutTime(outT);

          const dur = computeWorkDuration({ checkInTime, checkOutTime: outT }, false);
          setWorkDuration(dur);
          toast.success('Punched Out successfully! Good job today.');
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-out failed';
        toast.error(errorMsg);
      }
    }
  };

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

  const computeWorkDuration = (itemOrLog: any, isToday: boolean = false): string => {
    if (!itemOrLog) return '--';

    // 1. Direct minutes property check
    const minsNum = itemOrLog.work_duration_minutes ?? itemOrLog.duration_minutes ?? itemOrLog.workDurationMinutes;
    if (typeof minsNum === 'number' && minsNum > 0) {
      const hrs = Math.floor(minsNum / 60);
      const mins = minsNum % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }

    // 2. Raw ISO / MySQL timestamps check
    let inTimeStr = itemOrLog.check_in_time || itemOrLog.checkInTime;
    let outTimeStr = itemOrLog.check_out_time || itemOrLog.checkOutTime;

    if (inTimeStr && inTimeStr !== '--') {
      const inIso = typeof inTimeStr === 'string' ? inTimeStr.replace(' ', 'T') : inTimeStr;
      const inMs = new Date(inIso).getTime();

      if (!isNaN(inMs)) {
        let outMs = NaN;
        if (outTimeStr && outTimeStr !== '--') {
          const outIso = typeof outTimeStr === 'string' ? outTimeStr.replace(' ', 'T') : outTimeStr;
          outMs = new Date(outIso).getTime();
        } else if (isToday) {
          outMs = Date.now();
        }

        if (!isNaN(outMs) && outMs >= inMs) {
          const diffMins = Math.floor((outMs - inMs) / 60000);
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
      }
    }

    // 3. Fallback check for formatted 12-hr string times (e.g. '09:15 am', '06:30 pm')
    if (inTimeStr && outTimeStr && inTimeStr !== '--' && outTimeStr !== '--') {
      try {
        const parse12Hr = (timeStr: string) => {
          const match = timeStr.match(/(\d+):(\d+)(?::(\d+))?\s*(am|pm)?/i);
          if (!match) return null;
          let hrs = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          const pm = match[4]?.toLowerCase() === 'pm';
          const am = match[4]?.toLowerCase() === 'am';
          if (pm && hrs < 12) hrs += 12;
          if (am && hrs === 12) hrs = 0;
          return hrs * 60 + mins;
        };

        const inMins = parse12Hr(inTimeStr);
        const outMins = parse12Hr(outTimeStr);
        if (inMins !== null && outMins !== null && outMins >= inMins) {
          const diffMins = outMins - inMins;
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
      } catch (e) { }
    }

    return '--';
  };

  const formatTimeTo12Hr = (timeStr: any): string => {
    if (!timeStr || timeStr === '--') return '--';
    try {
      const isoStr = typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr;
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '--';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--';
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
        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

        list.forEach((item: any) => {
          let dStr = '';
          const checkInTimeVal = item.checkInTime || item.check_in_time;
          const checkOutTimeVal = item.checkOutTime || item.check_out_time;
          const checkInDateVal = item.checkInDate || item.check_in_date || item.date;

          const dateRef = checkInTimeVal || checkInDateVal;
          if (dateRef) {
            if (typeof dateRef === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateRef)) {
              dStr = dateRef;
            } else {
              const isoRef = typeof dateRef === 'string' ? dateRef.replace(' ', 'T') : dateRef;
              const d = new Date(isoRef);
              if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dStr = `${year}-${month}-${day}`;
              }
            }
          }

          if (dStr) {
            let st: DailyLog['status'] = 'present';
            const statusVal = item.status || item.rawStatus;
            const isLateVal = item.isLate ?? item.is_late;
            const isEarlyOutVal = item.isEarlyOut ?? item.is_early_out ?? item.is_early_departure;

            if (statusVal === 'on_leave') st = 'on_leave';
            else if (statusVal === 'absent') st = 'absent';
            else if (statusVal === 'holiday') st = 'holiday';
            else if (isLateVal) st = 'late';
            else if (isEarlyOutVal) st = 'early_checkout';

            const checkInFormatted = formatTimeTo12Hr(checkInTimeVal);
            const checkOutFormatted = formatTimeTo12Hr(checkOutTimeVal);

            const durationFormatted = computeWorkDuration(item, dStr === todayStr);

            const dailyObj: DailyLog = {
              id: item.id,
              date: dStr,
              checkInTime: checkInFormatted,
              checkOutTime: checkOutFormatted,
              status: st,
              workDurationMinutes: item.workDurationMinutes ?? item.work_duration_minutes ?? item.duration_minutes ?? null,
              durationFormatted,
              rawStatus: statusVal,
            };

            logsMap[dStr] = dailyObj;
            parsedList.push(dailyObj);
          }
        });

        // Sync today's active check-in/out state if not present in history API response
        if (checkInStatus !== 'not_started') {
          const computedDur = workDuration !== '--' 
            ? workDuration 
            : computeWorkDuration({ checkInTime, checkOutTime }, checkInStatus === 'checked_in');

          if (!logsMap[todayStr]) {
            const todayLog: DailyLog = {
              date: todayStr,
              checkInTime: checkInTime !== '--' ? checkInTime : '--',
              checkOutTime: checkOutTime !== '--' ? checkOutTime : '--',
              status: 'present',
              durationFormatted: computedDur,
            };
            logsMap[todayStr] = todayLog;
            parsedList.unshift(todayLog);
          } else {
            if (checkInTime !== '--') logsMap[todayStr].checkInTime = checkInTime;
            if (checkOutTime !== '--') logsMap[todayStr].checkOutTime = checkOutTime;
            logsMap[todayStr].durationFormatted = computedDur;

            const itemInList = parsedList.find(l => l.date === todayStr);
            if (itemInList) {
              if (checkInTime !== '--') itemInList.checkInTime = checkInTime;
              if (checkOutTime !== '--') itemInList.checkOutTime = checkOutTime;
              itemInList.durationFormatted = computedDur;
            }
          }
        }

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

      {/* Today's GPS Punch Console Banner */}
      <Card className="border rounded-3xl shadow-lg overflow-hidden bg-card border-border">
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/80 font-extrabold uppercase tracking-wider">Attendance Console</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 py-0.5 px-2.5 text-[10px] font-bold uppercase tracking-wider">
                  {checkInStatus === 'not_started' && 'Off Duty'}
                  {checkInStatus === 'checked_in' && 'On Duty'}
                  {checkInStatus === 'completed' && 'Duty Finished'}
                </Badge>
              </div>
              <h3 className="text-base font-bold mt-0.5">GPS Punch Desk</h3>
              <p className="text-xs text-white/70">{myShiftInfo}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* GPS Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs border border-white/15">
              <MapPin className={`w-4 h-4 ${gpsStatus === 'success' ? 'text-emerald-400 animate-pulse' : 'text-amber-300'}`} />
              <span className="text-[11px] font-semibold">
                {gpsStatus === 'success' ? 'GPS Active' : gpsStatus === 'locating' ? 'Locating...' : 'No GPS'}
              </span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-white/20 text-white" onClick={fetchLocation} title="Refresh GPS">
                <Navigation className="w-3 h-3" />
              </Button>
            </div>

            {/* Punch Action Button */}
            {checkInStatus !== 'completed' ? (
              <Button
                onClick={handleCheckInToggle}
                className="bg-white text-violet-700 hover:bg-white/90 font-extrabold text-xs px-5 py-5 rounded-2xl shadow-md gap-2"
              >
                {checkInStatus === 'not_started' ? (
                  <>
                    <Play className="w-4 h-4 fill-violet-700" />
                    Punch In Now
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 fill-violet-700" />
                    Punch Out
                  </>
                )}
              </Button>
            ) : (
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-xs font-bold text-emerald-200">
                Today's Punch Completed
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4 bg-muted/30 grid grid-cols-3 gap-3 text-center border-t">
          <div className="bg-background p-2.5 rounded-xl border">
            <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Check In Time</span>
            <span className="text-sm font-mono font-extrabold text-foreground block mt-0.5">{checkInTime}</span>
          </div>
          <div className="bg-background p-2.5 rounded-xl border">
            <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Check Out Time</span>
            <span className="text-sm font-mono font-extrabold text-foreground block mt-0.5">{checkOutTime}</span>
          </div>
          <div className="bg-background p-2.5 rounded-xl border">
            <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Work Duration</span>
            <span className="text-sm font-mono font-extrabold text-foreground block mt-0.5">{workDuration}</span>
          </div>
        </CardContent>
      </Card>

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
              className={`h-9 px-3 gap-2 rounded-xl font-bold transition-all ${viewMode === 'calendar' ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700' : ''
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
                <TableRow className="bg-muted/50">
                  <TableHead className="font-extrabold text-xs uppercase px-6 py-4">Date</TableHead>
                  <TableHead className="font-extrabold text-xs uppercase px-6 py-4 text-emerald-600 dark:text-emerald-400">Check In</TableHead>
                  <TableHead className="font-extrabold text-xs uppercase px-6 py-4 text-rose-600 dark:text-rose-400">Check Out</TableHead>
                  <TableHead className="font-extrabold text-xs uppercase px-6 py-4 text-violet-600 dark:text-violet-400">Total Work Hours</TableHead>
                  <TableHead className="font-extrabold text-xs uppercase px-6 py-4">Status</TableHead>
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
                  (() => {
                    const currentTodayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                    return logs.map((log, i) => (
                      <TableRow key={i} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="px-6 py-4 text-xs font-bold text-foreground">{log.date}</TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          {log.checkInTime || '--'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono font-extrabold text-rose-600 dark:text-rose-400">
                          {log.checkOutTime || '--'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-extrabold text-[11px] border border-violet-200 dark:border-violet-800">
                            <Clock className="w-3.5 h-3.5 text-violet-500" />
                            {computeWorkDuration(log, log.date === currentTodayStr)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${log.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20'
                              : log.status === 'late'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/20'
                                : log.status === 'early_checkout'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-500/20'
                                  : log.status === 'on_leave'
                                    ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-500/20'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-500/20'
                            }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
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
                    return <div key={idx} className="min-h-[115px] rounded-2xl bg-muted/20 border border-transparent" />;
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
                      className={`min-h-[115px] p-2.5 rounded-2xl border flex flex-col justify-between transition-all ${isToday
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

                      {/* Timing Info (In Time, Out Time & Work Duration) */}
                      <div className="text-[10px] font-mono space-y-0.5 mt-auto pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>In:</span>
                          <span>{log?.checkInTime || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
                          <span>Out:</span>
                          <span>{log?.checkOutTime || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between text-violet-600 dark:text-violet-300 font-extrabold bg-violet-100/70 dark:bg-violet-950/70 px-1.5 py-0.5 rounded-md mt-1 border border-violet-200/50 dark:border-violet-800/50">
                          <span>Work:</span>
                          <span>{computeWorkDuration(log, isToday)}</span>
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
