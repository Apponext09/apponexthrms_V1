import React, { useState, useEffect } from 'react';
import { AttendanceCalendar, AttendanceChart, AttendanceFilters } from '../components';
import { useAttendanceHistory } from '../hooks/useAttendanceHistory';

export const AttendanceDashboard: React.FC = () => {
  const { records, getHistory } = useAttendanceHistory();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  // Filter state
  const [startDate, setStartDate] = useState(`${year}-${String(month + 1).padStart(2, '0')}-01`);
  const [endDate, setEndDate] = useState(new Date(year, month + 1, 0).toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    getHistory({ startDate, endDate });
  }, [startDate, endDate, getHistory]);

  const handleResetFilters = () => {
    const curM = new Date().getMonth();
    const curY = new Date().getFullYear();
    setMonth(curM);
    setYear(curY);
    setStartDate(`${curY}-${String(curM + 1).padStart(2, '0')}-01`);
    setEndDate(new Date(curY, curM + 1, 0).toISOString().split('T')[0]);
    setSelectedStatus('all');
  };

  const handleMonthChange = (newM: number, newY: number) => {
    setMonth(newM);
    setYear(newY);
    setStartDate(`${newY}-${String(newM + 1).padStart(2, '0')}-01`);
    setEndDate(new Date(newY, newM + 1, 0).toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Attendance Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Monthly attendance grid, status filters, and selected data analytics
        </p>
      </div>

      {/* Top Layout: Filters Panel & Color-Coded Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Filter Sidebar */}
        <div className="lg:col-span-1">
          <AttendanceFilters
            startDate={startDate}
            endDate={endDate}
            selectedStatus={selectedStatus}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onStatusChange={setSelectedStatus}
            onReset={handleResetFilters}
          />
        </div>

        {/* Right Column: Attendance Calendar with Present(Green), Absent(Red), Late(Brown), WFH(Blue) */}
        <div className="lg:col-span-3">
          <AttendanceCalendar
            month={month}
            year={year}
            records={records}
            selectedStatus={selectedStatus}
            onMonthChange={handleMonthChange}
          />
        </div>
      </div>

      {/* Bottom Layout: Proper Visualization of Selected Data */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Selected Data Visualization
        </h2>

        <AttendanceChart
          selectedStatus={selectedStatus}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
};
