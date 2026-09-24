import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, RefreshCw } from 'lucide-react';
import { useAttendanceHistory } from '../hooks/useAttendanceHistory';

export interface AttendanceLogEntry {
  id: number;
  date: string;
  dayName: string;
  checkIn: string;
  checkOut: string;
  location: string;
  method: string;
  status: 'present' | 'absent' | 'late' | 'work_from_home' | 'weekly_off';
  duration: string;
}

export const getLocalDateKey = (rawDate: any): string => {
  if (!rawDate) return '';
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }
  const dateObj = new Date(rawDate);
  if (isNaN(dateObj.getTime())) return String(rawDate).split('T')[0];
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface MonthlyAttendanceLogProps {
  onStatsCalculated?: (stats: { present: number; absent: number; late: number; percentage: string }) => void;
}

export const MonthlyAttendanceLog: React.FC<MonthlyAttendanceLogProps> = ({ onStatsCalculated }) => {
  const todayDate = new Date();
  const currentYearStr = todayDate.getFullYear().toString();
  const currentMonthStr = String(todayDate.getMonth() + 1).padStart(2, '0');
  const defaultMonthStr = `${currentYearStr}-${currentMonthStr}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { records, loading, getHistory } = useAttendanceHistory();

  const fetchMonthData = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const startDate = `${yearStr}-${monthStr}-01`;
    const endDate = `${yearStr}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    getHistory({ startDate, endDate, pageSize: 100 });
  };

  useEffect(() => {
    fetchMonthData();
    const handleUpdate = () => fetchMonthData();
    window.addEventListener('attendance-updated', handleUpdate);
    return () => window.removeEventListener('attendance-updated', handleUpdate);
  }, [selectedMonth]);

  // Dynamic Month Entries: Starts from Day 1 up to Current Date ONLY (No fake mock data)
  const monthEntries = useMemo<AttendanceLogEntry[]>(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const currentDay = now.getDate();

    // Determine max day to render (only up to current date for current month)
    let maxDayToShow = daysInMonth;
    if (year === currentYear && monthIndex === currentMonthIndex) {
      maxDayToShow = currentDay;
    } else if (year > currentYear || (year === currentYear && monthIndex > currentMonthIndex)) {
      maxDayToShow = 0; // Future months show 0 days until date arrives
    }

    // Map API records by check_in_date string YYYY-MM-DD in local timezone
    const recordMap = new Map<string, any>();
    if (records && records.length > 0) {
      records.forEach((rec) => {
        const rawDate = rec.check_in_date || rec.checkInDate || rec.check_in_time || rec.checkInTime;
        if (rawDate) {
          const dateKey = getLocalDateKey(rawDate);
          recordMap.set(dateKey, rec);
        }
      });
    }

    const formatTime = (timeVal: any) => {
      if (!timeVal) return '—';
      try {
        const dateStr = typeof timeVal === 'string' ? timeVal.replace(' ', 'T') : timeVal;
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return '—';
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      } catch {
        return '—';
      }
    };

    const entries: AttendanceLogEntry[] = [];

    // Loop from Day 1 to maxDayToShow (till current date)
    for (let d = 1; d <= maxDayToShow; d++) {
      const dateObj = new Date(year, monthIndex, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = weekDaysShort[dayOfWeek];
      const dateString = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;

      const apiRec = recordMap.get(dateString);

      if (apiRec) {
        let status: AttendanceLogEntry['status'] = (apiRec.status as any) || 'present';
        if (apiRec.is_late || apiRec.isLate) {
          status = 'late';
        }

        const checkIn = formatTime(apiRec.check_in_time ?? apiRec.checkInTime);
        const checkOut = formatTime(apiRec.check_out_time ?? apiRec.checkOutTime);

        const durationMins = apiRec.duration_minutes ?? apiRec.durationMinutes;
        let duration = '0h 00m';
        if (durationMins) {
          const hrs = Math.floor(durationMins / 60);
          const mins = durationMins % 60;
          duration = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        }

        const locId = apiRec.check_in_location_id ?? apiRec.checkInLocationId;
        const location = apiRec.checkInLocationName || apiRec.check_in_location_name || apiRec.checkOutLocationName || (locId ? `Location ${locId}` : 'Corporate HQ');
        const method = apiRec.check_in_method ?? apiRec.checkInMethod;
        let methodStr = 'Web Location';
        if (method === 'biometric_face') {
          methodStr = 'Biometric Face AI';
        } else if (method === 'qr_scanner') {
          methodStr = 'QR Code Scanner';
        } else if (method === 'kiosk') {
          methodStr = 'Kiosk Terminal';
        } else if (method === 'mobile') {
          methodStr = 'Mobile App Access';
        }

        entries.push({
          id: apiRec.id || d,
          date: dateString,
          dayName,
          checkIn,
          checkOut,
          location: status === 'weekly_off' || status === 'absent' ? '—' : location,
          method: status === 'weekly_off' || status === 'absent' ? '—' : methodStr,
          status,
          duration: status === 'weekly_off' || status === 'absent' ? '0h 00m' : duration,
        });
      } else {
        // Real past day with no database record (No fake mock data)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          entries.push({
            id: d,
            date: dateString,
            dayName,
            checkIn: '—',
            checkOut: '—',
            location: '—',
            method: '—',
            status: 'weekly_off',
            duration: '0h 00m',
          });
        } else {
          entries.push({
            id: d,
            date: dateString,
            dayName,
            checkIn: '—',
            checkOut: '—',
            location: '—',
            method: '—',
            status: 'absent',
            duration: '0h 00m',
          });
        }
      }
    }

    return entries;
  }, [records, selectedMonth]);

  // Update top level stats whenever monthEntries change
  useEffect(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    monthEntries.forEach((entry) => {
      if (entry.status === 'present' || entry.status === 'work_from_home') {
        presentCount++;
      } else if (entry.status === 'absent') {
        absentCount++;
      } else if (entry.status === 'late') {
        lateCount++;
        presentCount++; // Count late as present day
      }
    });

    const totalDays = monthEntries.filter((e) => e.status !== 'weekly_off').length || 1;
    const percentage = ((presentCount / totalDays) * 100).toFixed(1);

    if (onStatsCalculated) {
      onStatsCalculated({
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        percentage: `${percentage}%`,
      });
    }
  }, [monthEntries, onStatsCalculated]);

  // Filter entries by selected status
  const filteredEntries = useMemo(() => {
    if (selectedStatus === 'all') return monthEntries;
    return monthEntries.filter((entry) => entry.status === selectedStatus);
  }, [monthEntries, selectedStatus]);

  const renderStatusBadge = (status: AttendanceLogEntry['status']) => {
    switch (status) {
      case 'present':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            🟢 Present
          </span>
        );
      case 'absent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            🔴 Absent
          </span>
        );
      case 'late':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            🟤 Late
          </span>
        );
      case 'work_from_home':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            🔵 WFH
          </span>
        );
      case 'weekly_off':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ⚪ Weekend
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
      {/* Header & Month Selector Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Full Monthly Attendance Details</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live database records from Day 1 to current date ({monthEntries.length} Days)
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Month Filter Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="2026-07" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">July 2026</option>
              <option value="2026-06" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">June 2026</option>
              <option value="2026-05" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">May 2026</option>
              <option value="2026-04" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">April 2026</option>
              <option value="2026-03" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">March 2026</option>
            </select>
          </div>

          {/* Category Filter Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Statuses</option>
              <option value="present" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🟢 Present</option>
              <option value="absent" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🔴 Absent</option>
              <option value="late" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🟤 Late</option>
              <option value="work_from_home" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🔵 WFH</option>
              <option value="weekly_off" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">⚪ Weekend</option>
            </select>
          </div>
        </div>
      </div>

      {/* Full Month Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">Loading attendance records from server...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No attendance records found for current selection.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Day</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Check In</th>
                <th className="py-3 px-3">Check Out</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredEntries.map((entry) => (
                <tr key={entry.date} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {entry.date}
                  </td>
                  <td className="py-3 px-3 font-medium">
                    {entry.dayName}
                  </td>
                  <td className="py-3 px-3">
                    {renderStatusBadge(entry.status)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {entry.checkIn}
                  </td>
                  <td className="py-3 px-3 font-semibold text-rose-600 dark:text-rose-400 font-mono">
                    {entry.checkOut}
                  </td>
                  <td className="py-3 px-3 font-medium">
                    {entry.location}
                  </td>
                  <td className="py-3 px-3 font-medium">
                    {entry.method}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    {entry.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
