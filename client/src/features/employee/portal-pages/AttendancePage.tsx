import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Clock, CheckCircle2, UserCheck, AlertCircle, ChevronLeft, ChevronRight, MapPin, Navigation, Play, Square, Scan, ShieldCheck, Wifi, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showToast, toast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';

interface DailyLog {
  id?: number;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: 'present' | 'absent' | 'on_leave' | 'late' | 'early_checkout' | 'holiday' | 'off_day';
  workDurationMinutes?: number | null;
  breakTimeMinutes?: number | null;
  durationFormatted?: string;
  rawStatus?: string;
}

export default function AttendancePage() {
  const { attendanceMode, requireCheckout, liveTrackingEnabled, geofenceRadiusMeters } = useAttendanceModuleSettings();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [attendanceLogsMap, setAttendanceLogsMap] = useState<Record<string, DailyLog>>({});
  const [shiftsMap, setShiftsMap] = useState<Record<string, any>>({});
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
  // Employee Shift State
  const [myShift, setMyShift] = useState<any>(null);

  // Fetch Today's Check-In Status & Shift Info
  const fetchTodayStatus = async () => {
    try {
      const res = await apiClient.get('/attendance/status');
      if (res.data?.data) {
        const st = res.data.data;
        if (st.shiftInfo) {
          setMyShift(st.shiftInfo);
        }

        if (st.isCheckedOut) {
          setCheckInStatus('completed');
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          const outT = st.checkOutTime ? formatTime(new Date(st.checkOutTime)) : '--';
          setCheckInTime(inT);
          setCheckOutTime(outT);

          const dur = computeWorkDuration({ check_in_time: st.checkInTime, check_out_time: st.checkOutTime, checkInTime: inT, checkOutTime: outT }, false);
          setWorkDuration(dur);
        } else if (st.isCheckedIn) {
          const inT = st.checkInTime ? formatTime(new Date(st.checkInTime)) : '--';
          setCheckInTime(inT);

          if (!requireCheckout) {
            setCheckInStatus('completed');
            setCheckOutTime('N/A (Check-In Only)');
            setWorkDuration('Check-In Credit');
          } else {
            setCheckInStatus('checked_in');
            const dur = computeWorkDuration({ check_in_time: st.checkInTime, checkInTime: inT }, true);
            setWorkDuration(dur);
          }
        } else {
          setCheckInStatus('not_started');
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
    }
  };

  useEffect(() => {
    fetchLocation();
    fetchTodayStatus();
  }, [requireCheckout]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkInStatus === 'checked_in' && requireCheckout) {
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
  }, [checkInStatus, requireCheckout]);

  // Permitted Punch Locations State
  const [myLocations, setMyLocations] = useState<Array<{ id: string; locationId: number; name: string; isPrimary: boolean }>>([]);
  const [assignedLocation, setAssignedLocation] = useState<any>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  const fetchMyLocations = async () => {
    try {
      const res = await apiClient.get('/attendance/my-permitted-locations');
      const locs = res.data?.data?.locations || [];
      setMyLocations(locs);
      if (locs.length > 0) {
        const primary = locs.find((l: any) => l.isPrimary) || locs[0];
        setAssignedLocation(primary);
        setSelectedLocationId(String(primary.locationId || primary.id));
      } else {
        setAssignedLocation({ name: 'Primary Office - Corporate HQ', radiusMeters: 200 });
      }
    } catch (err) {
      console.error('Failed to fetch permitted locations:', err);
      setAssignedLocation({ name: 'Primary Office - Corporate HQ', radiusMeters: 200 });
    }
  };

  const handleCheckInToggle = async () => {
    if (checkInStatus === 'not_started') {
      try {
        const payload: any = { method: 'web' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }
        if (selectedLocationId) {
          payload.checkInLocation = Number(selectedLocationId);
        }

        const res = await apiClient.post('/attendance/check-in', payload);
        if (res.data?.success) {
          const inT = formatTime(new Date());
          setCheckInTime(inT);

          if (!requireCheckout) {
            setCheckInStatus('completed');
            setCheckOutTime('N/A (Check-In Only)');
            setWorkDuration('Check-In Credit');
            showToast.success('Punched In', 'Punched In successfully! Check-out is not required.');
          } else {
            setCheckInStatus('checked_in');
            setDurationSeconds(0);
            setWorkDuration('0h 0m');
            showToast.success('Punched In', 'Punched In successfully! GPS Location verified.');
          }
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-in failed';
        showToast.error('Punch In Error', errorMsg);
      }
    } else if (checkInStatus === 'checked_in') {
      try {
        const payload: any = { method: 'web' };
        if (userCoords) {
          payload.latitude = userCoords.latitude;
          payload.longitude = userCoords.longitude;
        }
        if (selectedLocationId) {
          payload.checkOutLocation = Number(selectedLocationId);
        }

        const res = await apiClient.post('/attendance/check-out', payload);
        if (res.data?.success) {
          const outT = formatTime(new Date());
          setCheckInStatus('completed');
          setCheckOutTime(outT);

          const dur = computeWorkDuration({ checkInTime, checkOutTime: outT }, false);
          setWorkDuration(dur);
          showToast.success('Punched Out', 'Punched Out successfully! Good job today.');
          fetchMonthlyAttendance();
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Punch-out failed';
        showToast.error('Punch Out Error', errorMsg);
      }
    }
  };

  // Fetch shift, today's status & history on mount / month change
  useEffect(() => {
    fetchMyShift();
    fetchMonthlyAttendance();
    fetchMyLocations();
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

  const computeBreakDuration = (itemOrLog: any): string => {
    if (!itemOrLog) return '0m';
    const rawBreakMins = itemOrLog.break_time_minutes ?? itemOrLog.breakTimeMinutes ?? itemOrLog.breakMinutes;
    // Only show a value if it was actually recorded; default to 0, not 60
    const breakMins = typeof rawBreakMins === 'number' && !isNaN(rawBreakMins) ? rawBreakMins : 0;
    if (breakMins === 0) return '0m';
    const hrs = Math.floor(breakMins / 60);
    const mins = breakMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const computeWorkDuration = (itemOrLog: any, isToday: boolean = false): string => {
    if (!itemOrLog) return '--';

    // Use actual recorded break minutes; default to 0 (not 60) if not available
    const rawBreakMins = itemOrLog.break_time_minutes ?? itemOrLog.breakTimeMinutes ?? itemOrLog.breakMinutes;
    const breakMins = typeof rawBreakMins === 'number' && !isNaN(rawBreakMins) ? rawBreakMins : 0;

    // 1. Direct minutes property check
    const minsNum = itemOrLog.work_duration_minutes ?? itemOrLog.workDurationMinutes;
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
          const grossMins = Math.floor((outMs - inMs) / 60000);
          const netMins = Math.max(0, grossMins - breakMins);
          const hrs = Math.floor(netMins / 60);
          const mins = netMins % 60;
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
          const grossMins = outMins - inMins;
          const netMins = Math.max(0, grossMins - breakMins);
          const hrs = Math.floor(netMins / 60);
          const mins = netMins % 60;
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
              breakTimeMinutes: item.breakTimeMinutes ?? item.break_time_minutes ?? null,
              durationFormatted,
              rawStatus: statusVal,
              // Pass through raw timestamps & location fields for computeWorkDuration fallback
              check_in_time: item.check_in_time ?? item.checkInTime ?? null,
              check_out_time: item.check_out_time ?? item.checkOutTime ?? null,
              checkInLocationName: item.checkInLocationName ?? item.check_in_location_name ?? null,
            } as any;

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
      if (isToday) return { label: 'Today', bg: 'bg-primary text-primary-foreground font-bold' };
      return null;
    }

    switch (status) {
      case 'present':
        return { label: 'Present', bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 border' };
      case 'late':
        return { label: 'Late', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 border' };
      case 'early_checkout':
        return { label: 'Early Out', bg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 border' };
      case 'on_leave':
        return { label: 'Leave', bg: 'bg-primary/10 text-primary border-primary/20 border' };
      case 'absent':
        return { label: 'Absent', bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 border' };
      case 'holiday':
        return { label: 'Holiday', bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 border' };
      case 'off_day':
        return { label: 'Off Day', bg: 'bg-muted text-muted-foreground border-border/80 border' };
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
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> My Attendance & Logs
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
              Personal Logs
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            View your monthly attendance history, shift schedules, and check-in records.
          </p>
        </div>
      </div>

      {/* Today's GPS Punch Console Banner */}
      <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Attendance Console</span>
                <Badge variant="outline" className={`text-[10px] font-bold ${
                  checkInStatus === 'checked_in'
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : checkInStatus === 'completed'
                    ? 'bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {checkInStatus === 'not_started' && 'Off Duty'}
                  {checkInStatus === 'checked_in' && '● On Duty'}
                  {checkInStatus === 'completed' && (requireCheckout ? 'Duty Finished' : 'Punched In (Check-In Only)')}
                </Badge>

                {/* Verification Mode Badge */}
                {attendanceMode === 'face' && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px] font-bold flex items-center gap-1">
                    <Scan className="w-3 h-3" /> Face Match Required
                  </Badge>
                )}
                {attendanceMode === 'gps' && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> GPS Geofence ({geofenceRadiusMeters}m)
                  </Badge>
                )}
                {attendanceMode === 'both' && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Dual: Face + GPS
                  </Badge>
                )}
                {attendanceMode === 'wifi_ip' && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Company Wi-Fi IP
                  </Badge>
                )}

                {/* Live GPS Tracking Indicator */}
                {liveTrackingEnabled && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold animate-pulse flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> Live GPS Tracking Active
                  </Badge>
                )}
              </div>
              <h3 className="text-base font-bold text-foreground mt-0.5">Attendance Desk</h3>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                <span>🗓️ {myShift?.shiftName || 'Standard Morning Shift'} ({myShift?.startTime || '09:00'} - {myShift?.endTime || '17:30'})</span>
                <span className="text-primary font-bold">• Grace: {myShift?.gracePeriodMinutes || 15}m (till {myShift?.graceDeadline || '09:15'})</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Location Dropdown Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-xs border border-border/80">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLocationId(val);
                  const sel = myLocations.find((l) => String(l.locationId || l.id) === val);
                  if (sel) setAssignedLocation(sel);
                }}
                disabled={checkInStatus !== 'not_started'}
                className="bg-transparent text-foreground font-bold text-xs focus:outline-none cursor-pointer max-w-[220px]"
              >
                {myLocations.length > 0 ? (
                  myLocations.map((loc) => (
                    <option key={loc.id} value={loc.locationId || loc.id} className="text-foreground bg-card font-medium">
                      📍 {loc.name} {loc.isPrimary ? '(Primary Office)' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1" className="text-foreground bg-card font-medium">📍 home (Primary Office)</option>
                    <option value="2" className="text-foreground bg-card font-medium">📍 Kosqu Corporate HQ</option>
                    <option value="3" className="text-foreground bg-card font-medium">📍 Regional Branch Office</option>
                    <option value="4" className="text-foreground bg-card font-medium">📍 Client Site / Remote Duty</option>
                  </>
                )}
              </select>
            </div>

            {/* GPS Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-xs border border-border/80">
              <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'success' ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
              <span className="text-[11px] font-bold text-foreground">
                {gpsStatus === 'success' ? 'GPS Active' : gpsStatus === 'locating' ? 'Locating...' : 'No GPS'}
              </span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 hover:bg-muted text-muted-foreground" onClick={fetchLocation} title="Refresh GPS">
                <Navigation className="w-3 h-3" />
              </Button>
            </div>

            {/* Punch Action Button */}
            {checkInStatus !== 'completed' ? (
              <Button
                onClick={handleCheckInToggle}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5"
              >
                {checkInStatus === 'not_started' ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Punch In Now
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Punch Out
                  </>
                )}
              </Button>
            ) : (
              <Badge variant="outline" className="h-9 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                Today's Punch Completed
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-3.5 bg-muted/20 grid grid-cols-3 gap-3 text-center">
          <div className="bg-card p-3 rounded-lg border border-border/70">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Check In Time</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-foreground block mt-0.5">{checkInTime}</span>
          </div>
          <div className="bg-card p-3 rounded-lg border border-border/70">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Check Out Time</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-foreground block mt-0.5">{checkOutTime}</span>
          </div>
          <div className="bg-card p-3 rounded-lg border border-border/70">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Work Duration</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-foreground block mt-0.5">{workDuration}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Days</span>
              <span className="text-xl font-black text-foreground mt-0.5 block">{totalWorkdays}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Present Days</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{presentDaysCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Late Punch-ins</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{lateCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Leave Deductions</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">{leaveCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Logs Table Card / Calendar View */}
      <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
          {/* Left Side: Calendar Icon Toggle & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
              className={`h-8 px-3 gap-1.5 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'calendar' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : 'border-border text-foreground hover:bg-muted'
              }`}
              title={viewMode === 'table' ? 'Switch to Calendar View' : 'Switch to Table View'}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{viewMode === 'table' ? 'Calendar View' : 'Table View'}</span>
            </Button>
            <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
              {viewMode === 'table' ? 'Recent Attendance History' : 'Attendance Calendar Grid'}
            </CardTitle>
          </div>

          {/* Right Side: Month Navigation Controls (if Calendar View is active) */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0 rounded-lg">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-muted rounded-lg text-foreground min-w-[110px] text-center">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0 rounded-lg">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarDate(new Date())}
                className="text-xs text-primary font-bold ml-1 h-7 px-2"
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
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-4 py-3 text-emerald-600 dark:text-emerald-400">Check In</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-4 py-3 text-rose-600 dark:text-rose-400">Check Out</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-4 py-3 text-sky-600 dark:text-sky-400">Punch Location</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-4 py-3 text-amber-600 dark:text-amber-400">Break Hours</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-4 py-3 text-primary">Net Work Hours</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-4 py-3 text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No attendance records found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const currentTodayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                    return logs.map((log, i) => (
                      <TableRow key={i} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                        <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{log.date}</TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {log.checkInTime || '--'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          {log.checkOutTime || '--'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-medium">
                          {(log as any).checkInLocationName || (log as any).check_in_location_name ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {(log as any).checkInLocationName || (log as any).check_in_location_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 text-[11px]">General Office</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/20">
                            {computeBreakDuration(log)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
                            <Clock className="w-3 h-3 text-primary" />
                            {computeWorkDuration(log, log.date === currentTodayStr)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs">
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            log.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : log.status === 'late'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                              : log.status === 'early_checkout'
                              ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
                              : log.status === 'on_leave'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                          }`}>
                            {log.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          ) : (
            /* Interactive Calendar View Grid */
            <div className="p-4 sm:p-5">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={i} className="py-1">{d}</div>
                ))}
              </div>

              {/* Monthly Calendar Cells */}
              <div className="grid grid-cols-7 gap-2">
                {getCalendarDays().map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return <div key={idx} className="min-h-[110px] rounded-xl bg-muted/20 border border-transparent" />;
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
                      className={`min-h-[110px] p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                        isToday
                          ? 'border-primary bg-primary/10 text-primary shadow-2xs font-bold'
                          : 'border-border/70 bg-card hover:border-primary/40'
                      }`}
                    >
                      {/* Day Number & Status Badge */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                          {cell.dayNumber}
                        </span>
                        {badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${badge.bg}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      {/* Shift Info */}
                      <div className="text-[10px] font-semibold text-muted-foreground truncate mb-1">
                        <span className="text-primary font-medium">Shift: </span>
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
                        <div className="flex items-center justify-between text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md mt-1 border border-primary/20">
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
