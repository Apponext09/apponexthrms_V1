import React, { useState, useMemo } from 'react';
import { Calendar, Filter, MapPin, Clock } from 'lucide-react';

interface AttendanceLogEntry {
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

export const MonthlyAttendanceLog: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Generate full month days (1 to 30/31) for selected month YYYY-MM
  const monthEntries = useMemo<AttendanceLogEntry[]>(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const entries: AttendanceLogEntry[] = [];

    const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let d = daysInMonth; d >= 1; d--) {
      const dateObj = new Date(year, monthIndex, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = weekDaysShort[dayOfWeek];
      const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend
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
        // Weekday status pattern to demonstrate Present(Green), Absent(Red), Late(Brown), WFH(Blue)
        let status: AttendanceLogEntry['status'] = 'present';
        let checkIn = '09:00 AM';
        let checkOut = '06:00 PM';
        let duration = '8h 00m';
        let method = 'Web';
        let location = d % 2 === 0 ? 'Arham IT Solution, Ahilyanagar' : 'Kosqu Technolab, Navi Mumbai';

        if (d % 11 === 0) {
          status = 'absent';
          checkIn = '—';
          checkOut = '—';
          location = '—';
          method = '—';
          duration = '0h 00m';
        } else if (d % 7 === 0) {
          status = 'work_from_home';
          method = 'Web Portal';
        } else if (d % 5 === 0) {
          status = 'late';
          checkIn = '09:42 AM';
          duration = '8h 18m';
          method = 'Kiosk';
        } else {
          status = 'present';
          checkIn = '08:58 AM';
          duration = '8h 02m';
          method = d % 3 === 0 ? 'Biometric' : d % 4 === 0 ? 'QR Code' : 'Kiosk';
        }

        entries.push({
          id: d,
          date: dateString,
          dayName,
          checkIn,
          checkOut,
          location,
          method,
          status,
          duration,
        });
      }
    }

    return entries;
  }, [selectedMonth]);

  // Filter entries category-wise
  const filteredEntries = monthEntries.filter((entry) => {
    if (selectedStatus === 'all') return true;
    return entry.status === selectedStatus;
  });

  const getStatusBadge = (st: AttendanceLogEntry['status']) => {
    switch (st) {
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#78350f]/15 dark:bg-[#78350f]/40 text-[#78350f] dark:text-amber-200 border border-[#78350f]/30 dark:border-[#78350f]/60">
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
          <p className="text-xs text-slate-500 dark:text-slate-400">Complete day-by-day logs for the selected month ({monthEntries.length} Days)</p>
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <tr
                  key={entry.date}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    entry.status === 'weekly_off' ? 'bg-slate-50/40 dark:bg-slate-900/40 opacity-75' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{entry.date}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-600 dark:text-slate-400">{entry.dayName}</td>
                  <td className="py-3.5 px-3">{getStatusBadge(entry.status)}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">{entry.checkIn}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">{entry.checkOut}</td>
                  <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200">{entry.location}</td>
                  <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 capitalize">{entry.method}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{entry.duration}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                  No attendance records found matching selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
